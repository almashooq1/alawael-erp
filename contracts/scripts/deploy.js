/**
 * Deploy CertificateRegistry to the configured network.
 *
 * Usage:
 *   cd contracts
 *   npx hardhat run scripts/deploy.js --network polygon
 *
 * After a successful deploy:
 *   1. Copy the printed contract address into the backend env as
 *      BLOCKCHAIN_CONTRACT_ADDRESS (also set BLOCKCHAIN_NETWORK + RPC URL +
 *      BLOCKCHAIN_ETH_PRIVATE_KEY there).
 *   2. The backend's EthereumAdapter will then call `anchor(bytes32)` on this
 *      contract for every batch instead of doing a self-transfer.
 *   3. Verify the contract on the chain explorer for transparency:
 *      npx hardhat verify --network polygon <address> <initialOwner>
 */

const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error('No signer available — set DEPLOYER_PRIVATE_KEY in .env');
  }

  const initialOwner =
    process.env.INITIAL_OWNER && process.env.INITIAL_OWNER.trim() !== ''
      ? process.env.INITIAL_OWNER.trim()
      : await deployer.getAddress();

  console.log('Network        :', hre.network.name);
  console.log('Deployer       :', await deployer.getAddress());
  console.log('Initial owner  :', initialOwner);

  const balance = await hre.ethers.provider.getBalance(deployer.getAddress());
  console.log('Deployer bal.  :', hre.ethers.formatEther(balance));

  const factory = await hre.ethers.getContractFactory('CertificateRegistry');
  const contract = await factory.deploy(initialOwner);
  console.log('Deploying tx   :', contract.deploymentTransaction()?.hash);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('────────────────────────────────────────');
  console.log('Deployed at    :', address);
  console.log('────────────────────────────────────────');
  console.log('Set in backend env:');
  console.log(`  BLOCKCHAIN_NETWORK=${hre.network.name}`);
  console.log(`  BLOCKCHAIN_CONTRACT_ADDRESS=${address}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
