const { ethers } = require('ethers');
require('dotenv').config();

async function generateSignature(otp, privateKey) {
  // Hash the OTP as your contract expects (keccak256(abi.encodePacked(otp)))
  const messageHash = ethers.solidityPackedKeccak256(['uint256'], [otp]);

  // Create a wallet from the private key
  const wallet = new ethers.Wallet(privateKey);

  // Sign the hash (adds EIP-191 prefix and signs)
  const signature = await wallet.signMessage(ethers.getBytes(messageHash));

  return signature;
}

// Example usage
async function main() {
  const otp = 749190;
  const privateKey = process.env.PRIVATE_KEY;

  const signature = await generateSignature(otp, privateKey);
  console.log('OTP:', otp);
  console.log('Signature:', signature);
}

main().catch(console.error);
