# 🔐 MediVault — Confidential Health Records on Blockchain

> **FHE-encrypted patient health records using FHEVM · Sepolia Testnet · React + Hardhat**

MediVault is a decentralised health records dApp where patients store fully encrypted medical data on-chain. Using **Fully Homomorphic Encryption (FHE)**, data remains encrypted even while being processed — no node operator, no doctor, and no third party can ever read your health data without explicit cryptographic permission.

---

## 🏗️ Project Structure

```
medivault/
├── contracts/
│   └── ConfidentialHealthRecords.sol   ← FHE smart contract
├── deploy/
│   └── deploy.ts                       ← Hardhat deploy script
├── test/
│   └── ConfidentialHealthRecords.test.ts
├── hardhat.config.ts
├── package.json
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Landing.tsx             ← Animated landing page
    │   │   └── Dashboard.tsx           ← Patient dashboard
    │   ├── components/
    │   │   ├── AddRecordModal.tsx       ← Encrypt & submit health data
    │   │   └── GrantAccessModal.tsx     ← Grant doctor access on-chain
    │   ├── hooks/
    │   │   └── useMediVault.ts          ← Contract interaction + FHE
    │   ├── contract.ts                  ← ABI + address config
    │   ├── wagmiConfig.ts               ← Wagmi + RainbowKit setup
    │   └── App.tsx
    ├── index.html
    └── package.json
```

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 FHE Encryption | Health data encrypted client-side using `euint32` — never exposed on-chain |
| 🩺 Doctor Access Control | Grant/revoke access on-chain with a single transaction |
| ⛓ Immutable Records | Every health event stored permanently on Sepolia |
| 🌿 Holistic Wellness | Vitals, blood panels, glucose, vaccinations, X-rays |
| 📊 Patient Dashboard | Real-time overview of all encrypted records |
| 🔍 Audit Trail | Every access event emitted as a blockchain event |

---

## 🚀 Quick Start

### Prerequisites
- Node.js **v20 or v22 LTS** (Hardhat does NOT support odd-numbered versions)
- MetaMask wallet
- Infura API key ([infura.io](https://infura.io))
- Sepolia test ETH ([Alchemy faucet](https://www.alchemy.com/faucets/ethereum-sepolia))

---

### Step 1 — Clone & install (smart contracts)

```bash
# Fork https://github.com/zama-ai/fhevm-hardhat-template first, then:
git clone <your-forked-repo>
cd medivault

# Copy the contract files from this project into the forked template
npm install
```

### Step 2 — Set Hardhat config variables

```bash
npx hardhat vars set MNEMONIC
# Enter your MetaMask 12-word seed phrase

npx hardhat vars set INFURA_API_KEY
# Enter your Infura project key

npx hardhat vars set ETHERSCAN_API_KEY
# Optional — for contract verification
```

### Step 3 — Run tests locally (mock FHE mode — no testnet needed)

```bash
npx hardhat test
```

### Step 4 — Deploy to Sepolia

```bash
npx hardhat run deploy/deploy.ts --network sepolia
```

Copy the deployed contract address from the output.

### Step 5 — Verify on Etherscan (optional)

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

---

### Step 6 — Frontend setup

```bash
cd frontend
npm install

# Create .env from example
cp .env.example .env
```

Edit `.env`:
```
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
VITE_CHAIN_ID=11155111
VITE_ALCHEMY_API_KEY=your_alchemy_api_key
```

```bash
npm run dev
# → http://localhost:5173
```

---

## 🔬 How FHE Works in MediVault

```
Patient Browser                  Sepolia Blockchain           Doctor Browser
     │                                   │                          │
     │  1. Enter health data             │                          │
     │  2. Encrypt with FHE public key   │                          │
     │  ─────── encrypted euint32 ──────►│                          │
     │                                   │ store ciphertext on-chain│
     │  3. Grant doctor access ─────────►│                          │
     │                                   │◄─── doctor requests ─────│
     │                                   │  KMS decrypts for doctor │
     │                                   │──── plaintext value ─────►│
```

**Key point**: The blockchain only ever sees `euint32` ciphertext handles. Even Sepolia validators cannot read the health data.

---

## 📜 Smart Contract — Key Functions

```solidity
// Add an encrypted health record (patient only)
function addRecord(
    externalEuint32 encHeartRate,
    externalEuint32 encOxygen,
    externalEuint32 encGlucose,
    externalEuint32 encTemp,
    bytes calldata heartProof,
    // ... other proofs
    string calldata recordType
) external

// Grant a doctor access to all records
function grantAccess(address doctor) external

// Revoke doctor access instantly
function revokeAccess(address doctor) external

// Read encrypted record handles (authorised only)
function getRecord(address patient, uint256 index) external view
    returns (euint32 heartRate, euint32 oxygenLevel, ...)
```

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Solidity 0.8.24 + `@fhevm/solidity` |
| FHE Library | `FHE.sol` — `euint32`, `ebool`, `externalEuint32` |
| Dev Environment | Hardhat + `@fhevm/hardhat-plugin` |
| Network | Sepolia Testnet (Chain ID: 11155111) |
| Frontend | React 18 + TypeScript + Vite |
| Wallet | RainbowKit + Wagmi v2 |
| FHE Client | `@fhevm/sdk` |
| Styling | CSS Modules + Framer Motion |
| Fonts | Playfair Display + Plus Jakarta Sans |

---

## 🧪 Testing Modes

| Mode | Command | Description |
|---|---|---|
| Mock FHE (fast) | `npx hardhat test` | In-memory, no testnet |
| Local node | `npx hardhat node` then `npx hardhat test --network localhost` | Persistent local |
| Sepolia | Set env vars, deploy, run tests with `--network sepolia` | Real encrypted values |

---

## 📁 Key Files Reference

| File | Purpose |
|---|---|
| `contracts/ConfidentialHealthRecords.sol` | Main FHE smart contract |
| `frontend/src/hooks/useMediVault.ts` | All contract reads/writes + FHE encryption |
| `frontend/src/pages/Landing.tsx` | Animated landing page with live plants |
| `frontend/src/pages/Dashboard.tsx` | Patient dashboard |
| `frontend/src/contract.ts` | ABI — update address after deployment |

---

## 📹 Video Demo Script (3 minutes)

1. **0:00–0:30** — Introduce the problem: healthcare data breaches, centralised records
2. **0:30–1:00** — Explain FHE: "data is computed without being decrypted"
3. **1:00–1:45** — Live demo: connect wallet, add an encrypted health record, show Etherscan tx
4. **1:45–2:20** — Grant doctor access, show access toggle, revoke it
5. **2:20–2:50** — Show the smart contract on Etherscan — euint32 ciphertext, not plaintext
6. **2:50–3:00** — Wrap up: self-sovereign health data, real-world impact

---

## 🌍 Real-World Impact

Healthcare data breaches affect millions. In Africa, fragmented paper records mean patients lose medical history when changing hospitals. MediVault gives patients a permanent, encrypted, portable health record they truly own — with selective, revocable access for healthcare providers.

---

## 📄 License

MIT — built for the FHEVM Monthly Campaign.
