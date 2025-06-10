require('@nomicfoundation/hardhat-toolbox');
require('@nomicfoundation/hardhat-verify'); // make sure to require the verify plugin
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: 'hardhat', // or 'hardhat' / localhost / sepolia
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || '', // Sepolia RPC URL from .env
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [], // Deployer private key from .env
      chainId: 11155111, // Sepolia chain ID
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY,
    },
  },
  solidity: {
    version: '0.8.28',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};
