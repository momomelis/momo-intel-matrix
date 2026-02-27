# momo-intel-matrix

### Hi there, I'm Momo 🍓⚡

Founder & CEO of **[Momo Candie](https://momo-candie.com)** —
a cyberpunk-feminist femtech brand at the intersection of
period care, Web3, and sonic ritual.

---

**Currently building:**
- 🍓 Smart period underwear with embedded sensor tech (Strawberry Protocol)
- 🔗 NFT collection × DAO governance for menstrual sovereignty
- 🎛️ Sonic rituals mapped to menstrual cycle phases
- ⚖️ Cross-chain infrastructure on Ethereum + Solana

**My stack:**
`React` `Solidity` `Web3.js` `Snapshot.org` `Ableton` `Figma`

**I work at the intersection of:**
Femtech · DeFi · Music Production · Mythological Storytelling

---

📫 Reach me: [your email or link]
🌐 [momo-candie.com](https://momo-candie.com)

---

## MomoCandieNFT — The Original Pressing

ERC-721 smart contract for the Momo Candie NFT collection.
**5,250 tokens. 873 traits. One frequency.**
Menstrual sovereignty through decentralized infrastructure.

### Features

- **Public mint** — 0.05 ETH per token, up to 10 per wallet
- **Presale (whitelist)** — council members mint before the public drop
- **Owner reserve mint** — promo copies for team, DAO treasury, partnerships
- **Pre-reveal / post-reveal metadata** — IPFS-backed, owner-controlled reveal
- **Instant ETH forwarding** — mint proceeds flow directly to treasury on every mint
- **DAO handoff** — transfers ownership and treasury to multisig in one transaction
- **Phase controls** — `toggleSale` / `togglePresale`

### Quick Start

```bash
npm install
npm test                  # run all 41 unit tests
npm run compile           # compile contracts
npm run deploy:sepolia    # deploy to Sepolia testnet
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```
DEPLOYER_PRIVATE_KEY=0x...
TREASURY_ADDRESS=0x...
BASE_URI=ipfs://...
UNREVEALED_URI=ipfs://...
CONTRACT_METADATA_URI=ipfs://...
```

### Contract

| Parameter       | Value             |
|-----------------|-------------------|
| Max supply      | 5,250             |
| Mint price      | 0.05 ETH          |
| Max per wallet  | 10                |
| Token standard  | ERC-721 + ERC-721Enumerable |
| Solidity        | ^0.8.20           |