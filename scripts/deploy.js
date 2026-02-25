/**
 * MomoCandieNFT — Deployment Script
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network <network>
 *
 * Required env vars:
 *   DEPLOYER_PRIVATE_KEY  — deployer wallet private key (0x-prefixed)
 *   TREASURY_ADDRESS      — ETH destination for mint proceeds
 *   BASE_URI              — IPFS base URI for revealed metadata (e.g. ipfs://Qm.../
 *   UNREVEALED_URI        — Single IPFS URI shown before reveal
 *   CONTRACT_METADATA_URI — IPFS URI for OpenSea contract-level metadata
 */

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("═".repeat(60));
  console.log(" MOMO CANDIE — Deploying The Original Pressing");
  console.log("═".repeat(60));
  console.log(`Deployer : ${deployer.address}`);
  console.log(
    `Balance  : ${ethers.formatEther(
      await ethers.provider.getBalance(deployer.address)
    )} ETH`
  );
  console.log("─".repeat(60));

  // ── Constructor arguments ────────────────────────────────────────
  // These can be overridden via env vars before a real deployment.
  // Placeholders are provided for local / testnet runs.
  const baseURI =
    process.env.BASE_URI ||
    "ipfs://bafybeiplaceholderbaseurireplacewithrealepinned/";

  const unrevealedURI =
    process.env.UNREVEALED_URI ||
    "ipfs://bafybeiplaceholderunrevealedurireplaceme/unrevealed.json";

  const contractMetadataURI =
    process.env.CONTRACT_METADATA_URI ||
    "ipfs://bafybeiplaceholdercontractmetadatareplaceme/contract.json";

  // Treasury defaults to deployer on local/testnet; MUST be set for mainnet.
  const treasury =
    process.env.TREASURY_ADDRESS || deployer.address;

  console.log(`Base URI             : ${baseURI}`);
  console.log(`Unrevealed URI       : ${unrevealedURI}`);
  console.log(`Contract Metadata URI: ${contractMetadataURI}`);
  console.log(`Treasury             : ${treasury}`);
  console.log("─".repeat(60));

  // ── Deploy ───────────────────────────────────────────────────────
  console.log("\nDeploying MomoCandieNFT...");

  const MomoCandieNFT = await ethers.getContractFactory("MomoCandieNFT");
  const contract = await MomoCandieNFT.deploy(
    baseURI,
    unrevealedURI,
    contractMetadataURI,
    treasury
  );

  await contract.waitForDeployment();

  const address = await contract.getAddress();

  console.log("\n✓ MomoCandieNFT deployed!");
  console.log(`  Contract address : ${address}`);
  console.log(`  Transaction hash : ${contract.deploymentTransaction().hash}`);
  console.log("─".repeat(60));

  // ── Verify constructor state ─────────────────────────────────────
  const maxSupply    = await contract.MAX_SUPPLY();
  const mintPrice    = await contract.MINT_PRICE();
  const maxPerWallet = await contract.MAX_PER_WALLET();
  const saleActive   = await contract.saleActive();
  const presaleActive = await contract.presaleActive();
  const revealed     = await contract.revealed();

  console.log("\nPost-deploy state check:");
  console.log(`  MAX_SUPPLY      : ${maxSupply}`);
  console.log(`  MINT_PRICE      : ${ethers.formatEther(mintPrice)} ETH`);
  console.log(`  MAX_PER_WALLET  : ${maxPerWallet}`);
  console.log(`  saleActive      : ${saleActive}`);
  console.log(`  presaleActive   : ${presaleActive}`);
  console.log(`  revealed        : ${revealed}`);
  console.log("═".repeat(60));

  // ── Next-step hints ──────────────────────────────────────────────
  console.log("\nNext steps:");
  console.log(`  1. Verify on explorer:`);
  console.log(
    `     npx hardhat verify --network <network> ${address} \\\n` +
    `       "${baseURI}" "${unrevealedURI}" "${contractMetadataURI}" "${treasury}"`
  );
  console.log(`  2. Toggle presale:  contract.togglePresale()`);
  console.log(`  3. Add whitelist:   contract.addToWhitelist([...addresses])`);
  console.log(`  4. Toggle public sale: contract.toggleSale()`);
  console.log(`  5. Reveal:          contract.reveal("<final-base-uri>")`);
  console.log(`  6. DAO handoff:     contract.handoffToDAO("<multisig-address>")`);
  console.log("═".repeat(60));

  // Return for programmatic use / tests
  return { contract, address, deployer };
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
