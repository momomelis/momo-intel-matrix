/**
 * MomoCandieNFT — Post-Deploy Management Tasks
 *
 * Usage (all tasks require --network <name> and CONTRACT_ADDRESS env var):
 *
 *   npx hardhat toggle-presale  --network sepolia
 *   npx hardhat toggle-sale     --network sepolia
 *   npx hardhat whitelist-add   --network sepolia --addresses "0xAAA,0xBBB"
 *   npx hardhat whitelist-remove --network sepolia --addresses "0xAAA"
 *   npx hardhat reveal          --network sepolia --base-uri "ipfs://Qm.../"
 *   npx hardhat set-treasury    --network sepolia --treasury "0xSAFE"
 *   npx hardhat dao-handoff     --network sepolia --dao "0xSAFE"
 *   npx hardhat status          --network sepolia
 */

const { task, types } = require("hardhat/config");

// ── Helper: load contract instance ──────────────────────────────────────────
async function getContract(hre) {
  const address = process.env.CONTRACT_ADDRESS;
  if (!address) {
    throw new Error("CONTRACT_ADDRESS env var is not set");
  }
  const [signer] = await hre.ethers.getSigners();
  const contract = await hre.ethers.getContractAt(
    "MomoCandieNFT",
    address,
    signer
  );
  console.log(`Contract : ${address}`);
  console.log(`Signer   : ${signer.address}`);
  return contract;
}

// ── status ───────────────────────────────────────────────────────────────────
task("status", "Print the current state of the deployed MomoCandieNFT").setAction(
  async (_, hre) => {
    const c = await getContract(hre);

    const [
      name,
      symbol,
      owner,
      treasury,
      totalSupply,
      maxSupply,
      mintPrice,
      maxPerWallet,
      saleActive,
      presaleActive,
      revealed,
      daoHandoffComplete,
    ] = await Promise.all([
      c.name(),
      c.symbol(),
      c.owner(),
      c.treasury(),
      c.totalSupply(),
      c.MAX_SUPPLY(),
      c.MINT_PRICE(),
      c.MAX_PER_WALLET(),
      c.saleActive(),
      c.presaleActive(),
      c.revealed(),
      c.daoHandoffComplete(),
    ]);

    console.log("\n" + "═".repeat(55));
    console.log(` ${name} (${symbol})`);
    console.log("═".repeat(55));
    console.log(`  owner             : ${owner}`);
    console.log(`  treasury          : ${treasury}`);
    console.log(`  supply            : ${totalSupply} / ${maxSupply}`);
    console.log(`  mint price        : ${hre.ethers.formatEther(mintPrice)} ETH`);
    console.log(`  max per wallet    : ${maxPerWallet}`);
    console.log(`  saleActive        : ${saleActive}`);
    console.log(`  presaleActive     : ${presaleActive}`);
    console.log(`  revealed          : ${revealed}`);
    console.log(`  daoHandoffComplete: ${daoHandoffComplete}`);
    console.log("═".repeat(55) + "\n");
  }
);

// ── toggle-presale ────────────────────────────────────────────────────────────
task("toggle-presale", "Toggle the presale phase on/off").setAction(
  async (_, hre) => {
    const c = await getContract(hre);
    const before = await c.presaleActive();
    const tx = await c.togglePresale();
    await tx.wait();
    const after = await c.presaleActive();
    console.log(`presaleActive: ${before} → ${after}  (tx: ${tx.hash})`);
  }
);

// ── toggle-sale ───────────────────────────────────────────────────────────────
task("toggle-sale", "Toggle the public sale phase on/off").setAction(
  async (_, hre) => {
    const c = await getContract(hre);
    const before = await c.saleActive();
    const tx = await c.toggleSale();
    await tx.wait();
    const after = await c.saleActive();
    console.log(`saleActive: ${before} → ${after}  (tx: ${tx.hash})`);
  }
);

// ── whitelist-add ─────────────────────────────────────────────────────────────
task("whitelist-add", "Add one or more addresses to the presale whitelist")
  .addParam("addresses", "Comma-separated list of addresses to whitelist", undefined, types.string)
  .setAction(async ({ addresses }, hre) => {
    const c = await getContract(hre);
    const list = addresses.split(",").map((a) => a.trim()).filter(Boolean);
    if (list.length === 0) throw new Error("No addresses provided");
    console.log(`Adding ${list.length} address(es) to whitelist...`);
    const tx = await c.addToWhitelist(list);
    await tx.wait();
    console.log(`Done.  (tx: ${tx.hash})`);
    for (const addr of list) {
      const ok = await c.whitelist(addr);
      console.log(`  ${addr} → ${ok}`);
    }
  });

// ── whitelist-remove ──────────────────────────────────────────────────────────
task("whitelist-remove", "Remove one or more addresses from the presale whitelist")
  .addParam("addresses", "Comma-separated list of addresses to remove", undefined, types.string)
  .setAction(async ({ addresses }, hre) => {
    const c = await getContract(hre);
    const list = addresses.split(",").map((a) => a.trim()).filter(Boolean);
    if (list.length === 0) throw new Error("No addresses provided");
    console.log(`Removing ${list.length} address(es) from whitelist...`);
    const tx = await c.removeFromWhitelist(list);
    await tx.wait();
    console.log(`Done.  (tx: ${tx.hash})`);
  });

// ── reveal ────────────────────────────────────────────────────────────────────
task("reveal", "Set the revealed base URI and flip the reveal flag")
  .addParam("baseUri", "IPFS base URI for revealed metadata (must end with /)", undefined, types.string)
  .setAction(async ({ baseUri }, hre) => {
    const c = await getContract(hre);
    if (await c.revealed()) {
      console.warn("WARNING: contract is already revealed. Proceeding will update the base URI.");
    }
    const tx = await c.reveal(baseUri);
    await tx.wait();
    console.log(`Revealed!  base URI set to: ${baseUri}`);
    console.log(`tx: ${tx.hash}`);
  });

// ── set-treasury ──────────────────────────────────────────────────────────────
task("set-treasury", "Update the treasury address")
  .addParam("treasury", "New treasury address", undefined, types.string)
  .setAction(async ({ treasury }, hre) => {
    const c = await getContract(hre);
    const before = await c.treasury();
    const tx = await c.setTreasury(treasury);
    await tx.wait();
    const after = await c.treasury();
    console.log(`treasury: ${before} → ${after}  (tx: ${tx.hash})`);
  });

// ── dao-handoff ───────────────────────────────────────────────────────────────
task("dao-handoff", "Transfer ownership and treasury to the DAO multisig (irreversible)")
  .addParam("dao", "Address of the DAO multisig (Gnosis Safe or equivalent)", undefined, types.string)
  .setAction(async ({ dao }, hre) => {
    const c = await getContract(hre);

    if (await c.daoHandoffComplete()) {
      throw new Error("DAO handoff is already complete — cannot call again.");
    }

    console.log("\n!!! IRREVERSIBLE OPERATION !!!");
    console.log(`Transferring ownership and treasury to: ${dao}`);
    console.log("Proceeding in 5 seconds — kill this process to abort...\n");
    await new Promise((r) => setTimeout(r, 5000));

    const tx = await c.handoffToDAO(dao);
    await tx.wait();

    const newOwner = await c.owner();
    const newTreasury = await c.treasury();
    const handoffDone = await c.daoHandoffComplete();

    console.log(`Done.  (tx: ${tx.hash})`);
    console.log(`  new owner    : ${newOwner}`);
    console.log(`  new treasury : ${newTreasury}`);
    console.log(`  handoffComplete: ${handoffDone}`);
  });
