const { ethers, run } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);

  const TwoFactorAuth = await ethers.getContractFactory('TwoFactorAuth');
  const contract = await TwoFactorAuth.deploy();

  await contract.waitForDeployment();

  console.log('TwoFactorAuth deployed to:', contract.target);

  // Wait for 5 confirmations on deployment transaction
  const deploymentTx = await contract.deploymentTransaction();
  await deploymentTx.wait(5);

  try {
    console.log('Verifying contract...');
    await run('verify:verify', {
      address: contract.target,
      constructorArguments: [],
    });
    console.log('Contract verified successfully.');
  } catch (error) {
    if (error.message.toLowerCase().includes('already verified')) {
      console.log('Contract already verified.');
    } else {
      console.error('Verification failed:', error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
