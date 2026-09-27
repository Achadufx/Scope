try {
  require("dotenv").config();
} catch (_) {
  // dotenv is optional; env vars may be supplied by the shell instead.
}
require("@nomicfoundation/hardhat-toolbox-viem");

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
const deployerAccounts = DEPLOYER_KEY ? [DEPLOYER_KEY] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      mining: {
        auto: true,
        interval: 0,
      },
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    // Sepolia Testnet config
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || process.env.RPC_URL || "https://rpc.ankr.com/eth_sepolia",
      accounts: deployerAccounts,
      chainId: 11155111,
    },
    // Base Sepolia config (primary deploy target)
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || process.env.RPC_URL || "https://sepolia.base.org",
      accounts: deployerAccounts,
      chainId: 84532,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./tests/contracts",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 180000,
  },
};
