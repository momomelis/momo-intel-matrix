const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// ─── Constants ────────────────────────────────────────────────────
const BASE_URI        = "ipfs://QmTestBaseURI/";
const UNREVEALED_URI  = "ipfs://QmTestUnrevealed/unrevealed.json";
const CONTRACT_URI    = "ipfs://QmTestContractMeta/contract.json";
const MINT_PRICE      = ethers.parseEther("0.05");
const MAX_SUPPLY      = 5_250n;
const MAX_PER_WALLET  = 10n;

// ─── Fixture ──────────────────────────────────────────────────────
async function deployFixture() {
  const [owner, treasury, alice, bob, carol] = await ethers.getSigners();

  const MomoCandieNFT = await ethers.getContractFactory("MomoCandieNFT");
  const nft = await MomoCandieNFT.deploy(
    BASE_URI,
    UNREVEALED_URI,
    CONTRACT_URI,
    treasury.address
  );
  await nft.waitForDeployment();

  return { nft, owner, treasury, alice, bob, carol };
}

// ─── Test Suite ───────────────────────────────────────────────────
describe("MomoCandieNFT", function () {

  // ── Deployment ──────────────────────────────────────────────────
  describe("Deployment", function () {
    it("sets name and symbol", async function () {
      const { nft } = await loadFixture(deployFixture);
      expect(await nft.name()).to.equal("Momo Candie");
      expect(await nft.symbol()).to.equal("MOMO");
    });

    it("sets immutable constants", async function () {
      const { nft } = await loadFixture(deployFixture);
      expect(await nft.MAX_SUPPLY()).to.equal(MAX_SUPPLY);
      expect(await nft.MINT_PRICE()).to.equal(MINT_PRICE);
      expect(await nft.MAX_PER_WALLET()).to.equal(MAX_PER_WALLET);
    });

    it("starts with sales inactive and unrevealed", async function () {
      const { nft } = await loadFixture(deployFixture);
      expect(await nft.saleActive()).to.be.false;
      expect(await nft.presaleActive()).to.be.false;
      expect(await nft.revealed()).to.be.false;
    });

    it("sets treasury and owner correctly", async function () {
      const { nft, owner, treasury } = await loadFixture(deployFixture);
      expect(await nft.treasury()).to.equal(treasury.address);
      expect(await nft.owner()).to.equal(owner.address);
    });

    it("stores URIs", async function () {
      const { nft } = await loadFixture(deployFixture);
      expect(await nft.unrevealedURI()).to.equal(UNREVEALED_URI);
      expect(await nft.contractURI()).to.equal(CONTRACT_URI);
    });
  });

  // ── Phase Controls ──────────────────────────────────────────────
  describe("Phase Controls", function () {
    it("owner can toggle sale", async function () {
      const { nft } = await loadFixture(deployFixture);
      await nft.toggleSale();
      expect(await nft.saleActive()).to.be.true;
      await nft.toggleSale();
      expect(await nft.saleActive()).to.be.false;
    });

    it("owner can toggle presale", async function () {
      const { nft } = await loadFixture(deployFixture);
      await nft.togglePresale();
      expect(await nft.presaleActive()).to.be.true;
    });

    it("non-owner cannot toggle sale", async function () {
      const { nft, alice } = await loadFixture(deployFixture);
      await expect(nft.connect(alice).toggleSale())
        .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });

    it("non-owner cannot toggle presale", async function () {
      const { nft, alice } = await loadFixture(deployFixture);
      await expect(nft.connect(alice).togglePresale())
        .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });
  });

  // ── Whitelist ───────────────────────────────────────────────────
  describe("Whitelist", function () {
    it("owner can add addresses to whitelist", async function () {
      const { nft, alice, bob } = await loadFixture(deployFixture);
      await nft.addToWhitelist([alice.address, bob.address]);
      expect(await nft.whitelist(alice.address)).to.be.true;
      expect(await nft.whitelist(bob.address)).to.be.true;
    });

    it("owner can remove addresses from whitelist", async function () {
      const { nft, alice } = await loadFixture(deployFixture);
      await nft.addToWhitelist([alice.address]);
      await nft.removeFromWhitelist([alice.address]);
      expect(await nft.whitelist(alice.address)).to.be.false;
    });

    it("non-owner cannot modify whitelist", async function () {
      const { nft, alice, bob } = await loadFixture(deployFixture);
      await expect(nft.connect(alice).addToWhitelist([bob.address]))
        .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });
  });

  // ── Public Mint ─────────────────────────────────────────────────
  describe("Public Mint", function () {
    async function saleFixture() {
      const base = await loadFixture(deployFixture);
      await base.nft.toggleSale();
      return base;
    }

    it("mints tokens and increments supply", async function () {
      const { nft, alice } = await saleFixture();
      await nft.connect(alice).mint(3, { value: MINT_PRICE * 3n });
      expect(await nft.totalSupply()).to.equal(3n);
      expect(await nft.balanceOf(alice.address)).to.equal(3n);
    });

    it("emits TokenMinted events", async function () {
      const { nft, alice } = await saleFixture();
      await expect(nft.connect(alice).mint(2, { value: MINT_PRICE * 2n }))
        .to.emit(nft, "TokenMinted")
        .withArgs(alice.address, 1n)
        .and.to.emit(nft, "TokenMinted")
        .withArgs(alice.address, 2n);
    });

    it("forwards ETH to treasury", async function () {
      const { nft, alice, treasury } = await saleFixture();
      const before = await ethers.provider.getBalance(treasury.address);
      await nft.connect(alice).mint(2, { value: MINT_PRICE * 2n });
      const after = await ethers.provider.getBalance(treasury.address);
      expect(after - before).to.equal(MINT_PRICE * 2n);
    });

    it("rejects mint when sale is inactive", async function () {
      const { nft, alice } = await loadFixture(deployFixture);
      await expect(nft.connect(alice).mint(1, { value: MINT_PRICE }))
        .to.be.revertedWith("The stage is not open yet");
    });

    it("rejects zero quantity", async function () {
      const { nft, alice } = await saleFixture();
      await expect(nft.connect(alice).mint(0, { value: 0n }))
        .to.be.revertedWith("Mint at least one token");
    });

    it("rejects insufficient ETH", async function () {
      const { nft, alice } = await saleFixture();
      await expect(nft.connect(alice).mint(2, { value: MINT_PRICE }))
        .to.be.revertedWith("Insufficient ETH");
    });

    it("enforces wallet limit", async function () {
      const { nft, alice } = await saleFixture();
      await nft.connect(alice).mint(10, { value: MINT_PRICE * 10n });
      await expect(nft.connect(alice).mint(1, { value: MINT_PRICE }))
        .to.be.revertedWith("Wallet limit reached");
    });

    it("tracks mintedPerWallet correctly", async function () {
      const { nft, alice } = await saleFixture();
      await nft.connect(alice).mint(4, { value: MINT_PRICE * 4n });
      expect(await nft.mintedPerWallet(alice.address)).to.equal(4n);
    });
  });

  // ── Presale Mint ────────────────────────────────────────────────
  describe("Presale Mint", function () {
    async function presaleFixture() {
      const base = await loadFixture(deployFixture);
      await base.nft.togglePresale();
      await base.nft.addToWhitelist([base.alice.address]);
      return base;
    }

    it("allows whitelisted address to presale mint", async function () {
      const { nft, alice } = await presaleFixture();
      await nft.connect(alice).presaleMint(2, { value: MINT_PRICE * 2n });
      expect(await nft.totalSupply()).to.equal(2n);
    });

    it("rejects non-whitelisted address", async function () {
      const { nft, bob } = await presaleFixture();
      await expect(nft.connect(bob).presaleMint(1, { value: MINT_PRICE }))
        .to.be.revertedWith("Not on the whitelist");
    });

    it("rejects when presale is inactive", async function () {
      const { nft, alice } = await loadFixture(deployFixture);
      await nft.addToWhitelist([alice.address]);
      await expect(nft.connect(alice).presaleMint(1, { value: MINT_PRICE }))
        .to.be.revertedWith("Presale is not active");
    });

    it("enforces wallet limit during presale", async function () {
      const { nft, alice } = await presaleFixture();
      await nft.connect(alice).presaleMint(10, { value: MINT_PRICE * 10n });
      await expect(nft.connect(alice).presaleMint(1, { value: MINT_PRICE }))
        .to.be.revertedWith("Wallet limit reached");
    });
  });

  // ── Reserve Mint ────────────────────────────────────────────────
  describe("Reserve Mint", function () {
    it("owner can reserve mint with no payment", async function () {
      const { nft, owner, bob } = await loadFixture(deployFixture);
      await nft.reserveMint(bob.address, 5);
      expect(await nft.totalSupply()).to.equal(5n);
      expect(await nft.balanceOf(bob.address)).to.equal(5n);
    });

    it("non-owner cannot reserve mint", async function () {
      const { nft, alice, bob } = await loadFixture(deployFixture);
      await expect(nft.connect(alice).reserveMint(bob.address, 1))
        .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });

    it("reserve mint respects MAX_SUPPLY", async function () {
      const { nft, bob } = await loadFixture(deployFixture);
      await expect(nft.reserveMint(bob.address, 5_251))
        .to.be.revertedWith("Supply exhausted");
    });
  });

  // ── Metadata / Reveal ───────────────────────────────────────────
  describe("Metadata & Reveal", function () {
    it("returns unrevealedURI before reveal", async function () {
      const { nft, bob } = await loadFixture(deployFixture);
      await nft.reserveMint(bob.address, 1);
      expect(await nft.tokenURI(1)).to.equal(UNREVEALED_URI);
    });

    it("returns correct tokenURI after reveal", async function () {
      const { nft, bob } = await loadFixture(deployFixture);
      await nft.reserveMint(bob.address, 3);
      await nft.reveal(BASE_URI);
      expect(await nft.tokenURI(1)).to.equal(`${BASE_URI}1.json`);
      expect(await nft.tokenURI(3)).to.equal(`${BASE_URI}3.json`);
    });

    it("emit Revealed event", async function () {
      const { nft } = await loadFixture(deployFixture);
      await expect(nft.reveal(BASE_URI))
        .to.emit(nft, "Revealed")
        .withArgs(BASE_URI);
    });

    it("reverts tokenURI for non-existent token", async function () {
      const { nft } = await loadFixture(deployFixture);
      await expect(nft.tokenURI(999))
        .to.be.revertedWith("Token does not exist");
    });

    it("only owner can call reveal", async function () {
      const { nft, alice } = await loadFixture(deployFixture);
      await expect(nft.connect(alice).reveal(BASE_URI))
        .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });
  });

  // ── Treasury ────────────────────────────────────────────────────
  describe("Treasury", function () {
    it("owner can update treasury", async function () {
      const { nft, carol } = await loadFixture(deployFixture);
      await expect(nft.setTreasury(carol.address))
        .to.emit(nft, "TreasuryUpdated")
        .withArgs(carol.address);
      expect(await nft.treasury()).to.equal(carol.address);
    });

    it("rejects zero address as treasury", async function () {
      const { nft } = await loadFixture(deployFixture);
      await expect(nft.setTreasury(ethers.ZeroAddress))
        .to.be.revertedWith("Invalid treasury address");
    });
  });

  // ── DAO Handoff ─────────────────────────────────────────────────
  describe("DAO Handoff", function () {
    it("transfers ownership and treasury to DAO multisig", async function () {
      const { nft, carol } = await loadFixture(deployFixture);
      await expect(nft.handoffToDAO(carol.address))
        .to.emit(nft, "DAOHandoffComplete")
        .withArgs(carol.address);

      expect(await nft.owner()).to.equal(carol.address);
      expect(await nft.treasury()).to.equal(carol.address);
      expect(await nft.daoHandoffComplete()).to.be.true;
    });

    it("cannot handoff twice", async function () {
      const { nft, carol, bob } = await loadFixture(deployFixture);
      await nft.handoffToDAO(carol.address);
      await expect(nft.connect(carol).handoffToDAO(bob.address))
        .to.be.revertedWith("Handoff already complete");
    });

    it("rejects zero address for DAO", async function () {
      const { nft } = await loadFixture(deployFixture);
      await expect(nft.handoffToDAO(ethers.ZeroAddress))
        .to.be.revertedWith("Invalid DAO address");
    });
  });

  // ── Interface Support ───────────────────────────────────────────
  describe("Interface Support", function () {
    it("supports ERC-721", async function () {
      const { nft } = await loadFixture(deployFixture);
      // ERC721 interfaceId
      expect(await nft.supportsInterface("0x80ac58cd")).to.be.true;
    });

    it("supports ERC-721Enumerable", async function () {
      const { nft } = await loadFixture(deployFixture);
      // ERC721Enumerable interfaceId
      expect(await nft.supportsInterface("0x780e9d63")).to.be.true;
    });
  });

  // ── Token ID sequencing ─────────────────────────────────────────
  describe("Token ID sequencing", function () {
    it("issues tokens starting from 1", async function () {
      const { nft, alice } = await loadFixture(deployFixture);
      await nft.toggleSale();
      await nft.connect(alice).mint(1, { value: MINT_PRICE });
      expect(await nft.ownerOf(1)).to.equal(alice.address);
    });

    it("issues sequential IDs across multiple mints", async function () {
      const { nft, alice, bob } = await loadFixture(deployFixture);
      await nft.toggleSale();
      await nft.connect(alice).mint(3, { value: MINT_PRICE * 3n });
      await nft.connect(bob).mint(2, { value: MINT_PRICE * 2n });
      expect(await nft.ownerOf(4)).to.equal(bob.address);
      expect(await nft.ownerOf(5)).to.equal(bob.address);
    });
  });
});
