const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('TwoFactorAuth contract', function () {
  let twoFactorAuth;
  let owner, addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    const TwoFactorAuth = await ethers.getContractFactory('TwoFactorAuth');
    twoFactorAuth = await TwoFactorAuth.deploy();
  });

  it('Should register a user with unique username', async function () {
    // Use encodeBytes32String for ethers v6
    const otpSeed = ethers.encodeBytes32String('myseed123');
    await expect(twoFactorAuth.connect(addr1).registerUser('alice', otpSeed))
      .to.emit(twoFactorAuth, 'UserRegistered')
      .withArgs(addr1.address, 'alice');

    // Duplicate username should fail
    await expect(
      twoFactorAuth.connect(owner).registerUser('alice', otpSeed)
    ).to.be.revertedWith('Username taken');

    // Duplicate address should fail
    await expect(
      twoFactorAuth.connect(addr1).registerUser('bob', otpSeed)
    ).to.be.revertedWith('User already registered');
  });

  it('Should generate correct OTP for user', async function () {
    const otpSeed = ethers.encodeBytes32String('testseed');
    await twoFactorAuth.connect(addr1).registerUser('bob', otpSeed);

    // Get OTP from contract
    const expectedOtp = await twoFactorAuth.connect(addr1).generateCurrentOtp();

    // Check OTP is 6 digits
    expect(expectedOtp).to.be.a('bigint');
    expect(expectedOtp).to.be.lessThan(1_000_000n);
  });

  it('Should authenticate with valid OTP and prevent replay', async function () {
    const otpSeed = ethers.encodeBytes32String('secureseed');
    await twoFactorAuth.connect(addr1).registerUser('charlie', otpSeed);

    // Get current OTP
    const otp = await twoFactorAuth.connect(addr1).generateCurrentOtp();

    // Authenticate with valid OTP
    await expect(twoFactorAuth.connect(addr1).authenticate(otp))
      .to.emit(twoFactorAuth, 'Authenticated')
      .withArgs(addr1.address);

    // Replay same OTP should fail
    await expect(
      twoFactorAuth.connect(addr1).authenticate(otp)
    ).to.be.revertedWith('OTP already used');

    // Invalid OTP should fail
    await expect(
      twoFactorAuth.connect(addr1).authenticate(123456)
    ).to.be.revertedWith('Invalid OTP');
  });

  it('Should revert authentication for unregistered user', async function () {
    await expect(
      twoFactorAuth.connect(addr1).authenticate(111111)
    ).to.be.revertedWith('User not registered');
  });
});
