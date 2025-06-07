# Two-Factor Authentication (2FA) on Ethereum Blockchain

## Project Overview

This project implements a **Two-Factor Authentication (2FA) system** using Ethereum smart contracts and a React frontend. Users can:

- Register with a username and an OTP seed stored securely on-chain.
- Generate one-time passwords (OTPs) based on their stored seed.
- Authenticate themselves by submitting OTPs verified by the smart contract.

The solution uses Solidity smart contracts deployed on the Ethereum Sepolia testnet and a React frontend interacting via ethers.js.

---

## Setup Instructions

### Backend (Smart Contract)

```
cd hardhat
```

#### 1. Dependencies

- Node.js (v16+ recommended)
- Hardhat Ethereum development environment
- Solidity compiler (compatible version, e.g., 0.8.x)

#### 2. Install Hardhat and dependencies

`npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers dotenv `

#### 3. Compile the contract

`npx hardhat compile`

#### 4. Configure network

Create a `.env` file:

```
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
PRIVATE_KEY=your_wallet_private_key
ETHERSCAN_API_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

#### 5. Deploy the contract

```
npx hardhat run scripts/deploy.js --network sepolia
```

#### 6. Testing

```
npx hardhat test

```

---

### Frontend

```
cd frontend
```

#### 1. Dependencies

- Node.js (v16+)
- React (Next.js or Create React App)
- ethers.js v6

#### 2. Install dependencies

```
npm install
```

#### 3. Configure environment variables

Create `.env.local`:

```
NEXT_PUBLIC_CONTRACT_ADDRESS=your_deployed_contract_address
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
```

#### 4. Run the frontend

```
npm run dev
```

#### 5. Usage

- Connect your Ethereum wallet (e.g., MetaMask).
- Register a user with a username and OTP seed.
- Generate OTP (this triggers a blockchain transaction).
- Authenticate using the generated OTP.

---

## Blockchain Platform Configuration

- **Network:** Ethereum Sepolia Testnet
- **RPC Provider:** Infura, Alchemy, or other RPC endpoints configured via `.env`
- **Wallet:** MetaMask or compatible wallet supporting Sepolia
- **Gas:** Requires Sepolia testnet ETH (obtain from faucet)

---

## Notes

- OTP seeds must be formatted and should start with **0x** and must be equal to **8** char(you can change the number of char in code).
- OTP generation involves a write transaction to ensure security and state consistency.
- Authentication transactions will revert if the OTP or user state is invalid; frontend handles errors gracefully.

---

This README guides you through setting up, deploying, and using the blockchain-based 2FA system with clear instructions for both backend and frontend.
