/**
 * Hardhat Config — Al-Awael Certificate Registry
 *
 * Used only for compiling + deploying `CertificateRegistry.sol`. The runtime
 * backend talks to the deployed contract via ethers v6 directly (see
 * backend/services/blockchain/adapters/ethereumAdapter.js) — Hardhat is NOT
 * required at runtime.
 *
 * Activation:
 *   cd contracts && npm install
 *   cp .env.example .env  → fill DEPLOY_RPC_URL + DEPLOYER_PRIVATE_KEY
 *   npx hardhat compile
 *   npx hardhat run scripts/deploy.js --network polygon
 *
 * The configured networks intentionally cover only the same set the
 * EthereumAdapter recognizes (ethereum / polygon / sepolia / amoy) — keep
 * them in sync if you add a new chain there.
 */

require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

const RPC = process.env.DEPLOY_RPC_URL || '';
const KEY = process.env.DEPLOYER_PRIVATE_KEY || '';
const accounts = KEY ? [KEY] : [];

module.exports = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // Cancun is supported by all our target chains as of 2025; opt-out
      // by setting evmVersion: 'paris' if you target an older fork.
      evmVersion: 'cancun',
    },
  },

  networks: {
    hardhat: {},
    ethereum: { url: RPC, accounts, chainId: 1 },
    polygon: { url: RPC, accounts, chainId: 137 },
    sepolia: { url: RPC, accounts, chainId: 11155111 },
    amoy: { url: RPC, accounts, chainId: 80002 },
  },

  paths: {
    sources: './',
    artifacts: './artifacts',
    cache: './cache',
    tests: './test',
  },
};
