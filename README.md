# momo-intel-matrix

ERC-721 smart contract for the **Momo Candie — The Original Pressing** NFT collection.
5,250 tokens. 873 traits. One frequency.

## Overview

`MomoCandieNFT` is an ERC-721 + ERC-721Enumerable contract built on OpenZeppelin v5. It supports:

- **Public mint** (sale phase)
- **Presale mint** (whitelist phase)
- **Owner reserve mint** (team/DAO allocations)
- **Reveal mechanic** — metadata hidden behind a single unrevealed URI until the owner reveals
- **DAO handoff** — ownership and treasury transfer to a multisig in one transaction
- Immediate ETH forwarding to a configurable treasury address

## Contract constants

| Constant         | Value         |
|------------------|---------------|
| `MAX_SUPPLY`     | 5,250 tokens  |
| `MINT_PRICE`     | 0.05 ETH      |
| `MAX_PER_WALLET` | 10 tokens     |

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9

## Setup

```bash
npm install
```

Copy the environment template and fill in the values before deploying to a live network:

```bash
cp .env.example .env
```

Required environment variables:

| Variable               | Description                                      |
|------------------------|--------------------------------------------------|
| `DEPLOYER_PRIVATE_KEY` | 0x-prefixed private key of the deployer wallet   |
| `TREASURY_ADDRESS`     | ETH destination for mint proceeds                |
| `BASE_URI`             | IPFS base URI for revealed metadata (e.g. `ipfs://Qm.../`) |
| `UNREVEALED_URI`       | Single IPFS URI shown before reveal              |
| `CONTRACT_METADATA_URI`| IPFS URI for OpenSea contract-level metadata     |
| `MAINNET_RPC_URL`      | RPC endpoint for Ethereum mainnet                |
| `SEPOLIA_RPC_URL`      | RPC endpoint for Sepolia testnet                 |
| `BASE_RPC_URL`         | RPC endpoint for Base (defaults to public node)  |
| `BASE_SEPOLIA_RPC_URL` | RPC endpoint for Base Sepolia (defaults to public node) |
| `ETHERSCAN_API_KEY`    | For Etherscan contract verification              |
| `BASESCAN_API_KEY`     | For Basescan contract verification               |
| `COINMARKETCAP_API_KEY`| Optional — for USD gas cost reporting            |

## Usage

### Compile

```bash
npm run compile
```

### Test

```bash
npm test
```

### Test with gas report

```bash
npm run test:gas
```

### Coverage

```bash
npm run coverage
```

### Deploy

```bash
# Local Hardhat node (start node first with `npm run node`)
npm run deploy:local

# Sepolia testnet
npm run deploy:sepolia

# Base Sepolia testnet
npm run deploy:baseSepolia

# Ethereum mainnet
npm run deploy:mainnet

# Base mainnet
npm run deploy:base
```

### Verify on explorer

After deployment, the script prints the exact `hardhat verify` command to run.

## Post-deploy checklist

1. Verify contract on block explorer
2. `togglePresale()` — open presale window
3. `addToWhitelist([...addresses])` — add presale addresses
4. `toggleSale()` — open public sale
5. `reveal("<final-base-uri>")` — reveal metadata
6. `handoffToDAO("<multisig-address>")` — transfer ownership and treasury to DAO

## Contract functions

### Minting

| Function | Access | Description |
|---|---|---|
| `mint(quantity)` | Public (sale active) | Public mint, 0.05 ETH per token |
| `presaleMint(quantity)` | Whitelisted (presale active) | Presale mint at same price |
| `reserveMint(to, quantity)` | Owner | Free mint for team / treasury |

### Owner controls

| Function | Description |
|---|---|
| `toggleSale()` | Enable/disable public sale |
| `togglePresale()` | Enable/disable presale |
| `addToWhitelist(addresses[])` | Add addresses to presale whitelist |
| `removeFromWhitelist(addresses[])` | Remove addresses from whitelist |
| `reveal(baseURI)` | Set final base URI and mark as revealed |
| `setTreasury(address)` | Update treasury address |
| `setContractURI(uri)` | Update contract-level metadata URI |
| `handoffToDAO(daoMultisig)` | Transfer ownership + treasury to DAO multisig (one-way) |

### View

| Function | Returns |
|---|---|
| `tokenURI(tokenId)` | Metadata URI (unrevealed URI if not yet revealed) |
| `contractURI()` | Contract-level metadata URI |
| `totalSupply()` | Number of tokens minted |
| `mintedPerWallet(address)` | Tokens minted by a given wallet |

## License

MIT
