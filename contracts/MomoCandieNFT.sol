// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ═══════════════════════════════════════════════════════════════════
// MOMO CANDIE — THE ORIGINAL PRESSING
// ERC-721 NFT Collection
// 5,250 tokens. 873 traits. One frequency.
// Menstrual sovereignty through decentralized infrastructure.
// ═══════════════════════════════════════════════════════════════════

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract MomoCandieNFT is ERC721, ERC721Enumerable, Ownable, ReentrancyGuard {
    using Strings for uint256;

    // ── The Sacred Numbers ─────────────────────────────────────────
    uint256 public constant MAX_SUPPLY      = 5_250;
    uint256 public constant MAX_PER_WALLET  = 10;    // no single hand holds too much
    uint256 public constant MINT_PRICE      = 0.05 ether;

    // ── The Archive ────────────────────────────────────────────────
    string  private _baseTokenURI;
    string  private _contractURI;
    bool    public  revealed     = false;
    string  public  unrevealedURI;

    // ── The Phases ─────────────────────────────────────────────────
    // Like a track moving from breakdown → build → drop
    bool    public  saleActive   = false;
    bool    public  presaleActive = false;

    // ── The Council Whitelist (presale) ────────────────────────────
    mapping(address => bool)    public whitelist;
    mapping(address => uint256) public mintedPerWallet;

    // ── The Treasury ───────────────────────────────────────────────
    // Where the ETH flows before the DAO multisig takes the key
    address public treasury;

    // ── The DAO Handoff Flag ───────────────────────────────────────
    // Once flipped, the original engineer steps back.
    // The council inherits the booth.
    bool    public daoHandoffComplete = false;


    // ── Events — The Signal Log ────────────────────────────────────
    event TokenMinted(address indexed to, uint256 tokenId);
    event Revealed(string baseURI);
    event DAOHandoffComplete(address indexed daoMultisig);
    event TreasuryUpdated(address indexed newTreasury);


    // ══════════════════════════════════════════════════════════════
    // CONSTRUCTOR — The First Frequency
    // The moment the contract breathes for the first time.
    // ══════════════════════════════════════════════════════════════

    constructor(
        string memory baseURI,
        string memory _unrevealedURI,
        string memory contractMetadataURI,
        address _treasury
    )
        ERC721("Momo Candie", "MOMO")
        Ownable(msg.sender)
    {
        _baseTokenURI = baseURI;
        unrevealedURI = _unrevealedURI;
        _contractURI  = contractMetadataURI;
        treasury      = _treasury;
    }


    // ══════════════════════════════════════════════════════════════
    // MINTING RITUALS
    // The pressing plant. Where tokens are born.
    // ══════════════════════════════════════════════════════════════

    // ── Public Mint ────────────────────────────────────────────────
    function mint(uint256 quantity) external payable nonReentrant {
        require(saleActive,                          "The stage is not open yet");
        require(quantity > 0,                        "Mint at least one token");
        require(totalSupply() + quantity <= MAX_SUPPLY, "Supply exhausted");
        require(mintedPerWallet[msg.sender] + quantity <= MAX_PER_WALLET,
                                                     "Wallet limit reached");
        require(msg.value >= MINT_PRICE * quantity,  "Insufficient ETH");

        _mintBatch(msg.sender, quantity);
    }

    // ── Presale Mint (whitelist) ────────────────────────────────────
    function presaleMint(uint256 quantity) external payable nonReentrant {
        require(presaleActive,                       "Presale is not active");
        require(whitelist[msg.sender],               "Not on the whitelist");
        require(quantity > 0,                        "Mint at least one token");
        require(totalSupply() + quantity <= MAX_SUPPLY, "Supply exhausted");
        require(mintedPerWallet[msg.sender] + quantity <= MAX_PER_WALLET,
                                                     "Wallet limit reached");
        require(msg.value >= MINT_PRICE * quantity,  "Insufficient ETH");

        _mintBatch(msg.sender, quantity);
    }

    // ── Owner Reserve Mint (for team, DAO treasury, partnerships) ──
    // Like pressing promo copies before the public drop.
    function reserveMint(address to, uint256 quantity) external onlyOwner {
        require(totalSupply() + quantity <= MAX_SUPPLY, "Supply exhausted");
        _mintBatch(to, quantity);
    }

    // ── Internal Batch Engine ──────────────────────────────────────
    function _mintBatch(address to, uint256 quantity) internal {
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = totalSupply() + 1;
            mintedPerWallet[to]++;
            _safeMint(to, tokenId);
            emit TokenMinted(to, tokenId);
        }

        // Forward ETH to treasury immediately — no pooling in the contract
        if (msg.value > 0) {
            (bool success, ) = treasury.call{value: msg.value}("");
            require(success, "Treasury transfer failed");
        }
    }


    // ══════════════════════════════════════════════════════════════
    // THE REVEAL
    // The drop. The moment darkness becomes light.
    // Metadata hidden until this is called.
    // ══════════════════════════════════════════════════════════════

    function reveal(string memory baseURI) external onlyOwner {
        revealed      = true;
        _baseTokenURI = baseURI;
        emit Revealed(baseURI);
    }


    // ══════════════════════════════════════════════════════════════
    // METADATA — The DNA Layer
    // Every token's frequency signature.
    // ══════════════════════════════════════════════════════════════

    function tokenURI(uint256 tokenId)
        public view override returns (string memory)
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        if (!revealed) return unrevealedURI;

        return string(abi.encodePacked(_baseTokenURI, tokenId.toString(), ".json"));
    }

    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }


    // ══════════════════════════════════════════════════════════════
    // DAO HANDOFF — The Sacred Transfer
    // The moment the engineer steps back.
    // The council inherits the booth.
    // ══════════════════════════════════════════════════════════════

    function handoffToDAO(address daoMultisig) external onlyOwner {
        require(daoMultisig != address(0), "Invalid DAO address");
        require(!daoHandoffComplete,       "Handoff already complete");

        daoHandoffComplete = true;
        treasury           = daoMultisig;

        transferOwnership(daoMultisig);

        emit DAOHandoffComplete(daoMultisig);
    }


    // ══════════════════════════════════════════════════════════════
    // PHASE CONTROLS — The Mixing Board
    // ══════════════════════════════════════════════════════════════

    function togglePresale() external onlyOwner {
        presaleActive = !presaleActive;
    }

    function toggleSale() external onlyOwner {
        saleActive = !saleActive;
    }

    function addToWhitelist(address[] calldata addresses) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            whitelist[addresses[i]] = true;
        }
    }

    function removeFromWhitelist(address[] calldata addresses) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            whitelist[addresses[i]] = false;
        }
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury address");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function setContractURI(string memory uri) external onlyOwner {
        _contractURI = uri;
    }


    // ══════════════════════════════════════════════════════════════
    // REQUIRED OVERRIDES — The Interface Layer
    // ERC-721 + ERC-721Enumerable conflict resolution.
    // Like routing two signals through the same bus without phase cancellation.
    // ══════════════════════════════════════════════════════════════

    function _update(address to, uint256 tokenId, address auth)
        internal override(ERC721, ERC721Enumerable) returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721Enumerable) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
