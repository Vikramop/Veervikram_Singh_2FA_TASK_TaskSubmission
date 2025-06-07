import { ethers } from 'ethers';
import contractAbi from '../ABI/TwoFactorAuth.json';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
const CONTRACT_ABI = contractAbi;

let provider = null;
let signer = null;
let contract = null;

// Initialize provider, signer, and contract
export async function initContract() {
  console.log('11');
  console.log('Contract address:', CONTRACT_ADDRESS);
  console.log('ABI:', CONTRACT_ABI);

  if (!window.ethereum) throw new Error('MetaMask not detected');

  provider = new ethers.BrowserProvider(window.ethereum);

  await provider.send('eth_requestAccounts', []);

  signer = await provider.getSigner();

  contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI.abi, signer);

  return { provider, signer, contract };
}

// Get connected wallet address
export async function getWalletAddress() {
  if (!signer) throw new Error('Signer not initialized');
  return await signer.getAddress();
}

// Register user on blockchain
export async function registerUser(username, otpSeed) {
  if (!contract) throw new Error('Contract not initialized');
  const seedBytes32 = ethers.encodeBytes32String(otpSeed);
  const tx = await contract.registerUser(username, seedBytes32);
  console.log('Transaction hash:', tx.hash);
  await tx.wait();
}

// Get user info from blockchain
export async function getUser(address) {
  if (!contract) throw new Error('Contract not initialized');
  try {
    return await contract.getUser(address);
  } catch (error) {
    // Check if revert reason is "User not registered"
    if (error.message.includes('User not registered')) {
      throw new Error('User not registered');
    }
    // Re-throw other errors
    throw error;
  }
}

// Generate current OTP from blockchain
export async function generateCurrentOtp() {
  if (!contract) throw new Error('Contract not initialized');
  const otpBigInt = await contract.generateCurrentOtp();
  return otpBigInt.toString().padStart(6, '0');
}

// Authenticate user with OTP
export async function authenticate(otp) {
  if (!contract) throw new Error('Contract not initialized');
  const tx = await contract.authenticate(Number(otp));
  console.log('tx', tx);

  await tx.wait();
}
