const { ethers, run } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);

  // 1. Deploy UserRegistry
  const UserRegistry = await ethers.getContractFactory('UserRegistry');
  const userRegistry = await UserRegistry.deploy();
  await userRegistry.waitForDeployment();
  console.log('UserRegistry deployed to:', userRegistry.target);

  // 2. Deploy OTPManager
  const OTPManager = await ethers.getContractFactory('OTPManager');
  const otpManager = await OTPManager.deploy(userRegistry.target);
  await otpManager.waitForDeployment();
  console.log('OTPManager deployed to:', otpManager.target);

  // 3. Deploy Authenticator
  const Authenticator = await ethers.getContractFactory('Authenticator');
  const authenticator = await Authenticator.deploy(
    userRegistry.target,
    otpManager.target
  );
  await authenticator.waitForDeployment();
  console.log('Authenticator deployed to:', authenticator.target);

  // Optional: Register a user and set OTP seed (using deployer)
  try {
    // Register user
    const registerTx = await userRegistry
      .connect(deployer)
      .registerUser('deployer');
    await registerTx.wait();
    console.log('User registration transaction hash:', registerTx.hash);

    // Check if user is registered
    const isRegistered = await userRegistry.isRegistered(deployer.address);
    if (!isRegistered) {
      throw new Error('User registration failed: deployer is not registered');
    }
    console.log('User is registered:', deployer.address);

    // Set OTP seed
    const otpSeed = ethers.keccak256(ethers.toUtf8Bytes('deployer_secret'));
    const setSeedTx = await otpManager.connect(deployer).setOTPSeed(otpSeed);
    await setSeedTx.wait();
    console.log('OTP seed set transaction hash:', setSeedTx.hash);
    console.log('User registered and OTP seed set for deployer');
  } catch (err) {
    console.error('Error during user registration or OTP seed setting:', err);
    process.exit(1);
  }

  // Optional: Verify contracts on Etherscan
  try {
    await run('verify:verify', {
      address: userRegistry.target,
      constructorArguments: [],
    });
    await run('verify:verify', {
      address: otpManager.target,
      constructorArguments: [userRegistry.target],
    });
    await run('verify:verify', {
      address: authenticator.target,
      constructorArguments: [userRegistry.target, otpManager.target],
    });
    console.log('UserRegistry verified at:', userRegistry.target);
    console.log('OTPManager verified at:', otpManager.target);
    console.log('Authenticator verified at:', authenticator.target);
  } catch (err) {
    console.warn('Verification failed or skipped:', err);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
