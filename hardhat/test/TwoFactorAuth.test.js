const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Authentication System', function () {
  let owner, alice;
  let userRegistry, otpManager, authenticator;

  before(async function () {
    [owner, alice] = await ethers.getSigners();

    // Deploy UserRegistry
    const UserRegistry = await ethers.getContractFactory('UserRegistry');
    userRegistry = await UserRegistry.deploy();

    // Deploy OTPManager
    const OTPManager = await ethers.getContractFactory('OTPManager');
    otpManager = await OTPManager.deploy(userRegistry.target);

    // Deploy Authenticator
    const Authenticator = await ethers.getContractFactory('Authenticator');
    authenticator = await Authenticator.deploy(
      userRegistry.target,
      otpManager.target
    );

    // Register and set OTP seed
    await userRegistry.connect(alice).registerUser('alice');
    const otpSeed = ethers.keccak256(ethers.toUtf8Bytes('alice_secret'));
    await otpManager.connect(alice).setOTPSeed(otpSeed);
  });

  const generateOTP = async (seed) => {
    const window = Math.floor(Date.now() / 1000 / 30); // Current time window
    return (
      BigInt(
        ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ['bytes32', 'uint256'],
            [seed, window]
          )
        )
      ) % 1_000_000n
    ); // Returns BigInt, matching Solidity's uint256
  };

  it('should register a user', async function () {
    const isRegistered = await userRegistry.isRegistered(alice.address);
    expect(isRegistered).to.equal(true);
  });

  it('should set OTP seed for user', async function () {
    const otpSeed = ethers.keccak256(ethers.toUtf8Bytes('alice_secret'));
    await otpManager.connect(alice).setOTPSeed(otpSeed);
  });

  it('should generate OTP for user', async function () {
    const currentOtp = await otpManager.getCurrentOTP(alice.address);
    expect(currentOtp).to.be.a('bigint');
  });

  it('should update state on valid OTP', async function () {
    const currentOtp = await otpManager.getCurrentOTP(alice.address);
    const otpSeed = ethers.keccak256(ethers.toUtf8Bytes('alice_secret'));
    const calculatedOtp = await generateOTP(otpSeed);
    expect(BigInt(currentOtp)).to.equal(calculatedOtp);

    await otpManager.connect(alice).verifyOTP(alice.address, currentOtp);
  });

  it('should authenticate user with valid OTP', async function () {
    const currentOtp = await otpManager.getCurrentOTP(alice.address);
    await expect(authenticator.connect(alice).authenticate(currentOtp)).to.emit(
      authenticator,
      'AuthenticationSuccess'
    );
  });

  it('should reject wrong OTP', async function () {
    await expect(
      authenticator.connect(alice).authenticate(123456)
    ).to.be.revertedWith('Authentication failed');
  });

  it('should reject expired OTP', async function () {
    const currentOtp = await otpManager.getCurrentOTP(alice.address);
    await ethers.provider.send('evm_increaseTime', [61]);
    await ethers.provider.send('evm_mine');
    await expect(
      authenticator.connect(alice).authenticate(currentOtp)
    ).to.be.revertedWith('Authentication failed');
  });

  it('should authenticate user with PKI', async function () {
    const currentOtp = await otpManager.getCurrentOTP(alice.address);
    const messageHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [currentOtp])
    );
    const signature = await alice.signMessage(ethers.getBytes(messageHash));
    await expect(
      authenticator.connect(alice).authenticateWithPKI(currentOtp, signature)
    ).to.emit(authenticator, 'AuthenticationSuccess');
  });
});
