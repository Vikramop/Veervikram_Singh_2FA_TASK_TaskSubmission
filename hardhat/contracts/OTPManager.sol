// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

interface IUserRegistry {
    function isRegistered(address user) external view returns (bool);
}

contract OTPManager is Ownable {
    using Address for address;

    IUserRegistry public userRegistry;
    uint256 public constant WINDOW_SIZE = 30; // OTP validity window (60 seconds)
    uint256 public constant MAX_OTP_ATTEMPTS = 5; // Max failed attempts before lockout
    uint256 public constant OTP_LOCK_TIME = 300; // Lockout duration (seconds)

    struct OTPData {
        bytes32 seed;
        uint256 lastUsedWindow;
        uint256 failedAttempts;
        uint256 lockUntil;
    }

    mapping(address => OTPData) private otpData;

    event OTPSeedUpdated(address indexed user);
    event OTPAttemptsExceeded(address indexed user);

    constructor(address _userRegistry) Ownable(msg.sender) {
        userRegistry = IUserRegistry(_userRegistry);
    }

    function hasCode(address account) internal view returns (bool) {
        return account.code.length > 0;
    }

    // Sets the OTP seed for a user (must be registered and not a contract)
    function setOTPSeed(bytes32 newSeed) external {
        require(userRegistry.isRegistered(msg.sender), "User not registered");
        require(!hasCode(msg.sender), "Contracts cannot register");
        otpData[msg.sender].seed = newSeed;
        emit OTPSeedUpdated(msg.sender);
    }

    // Returns the current OTP for a user (Etherscan-friendly)
    function getCurrentOTP(address user) external view returns (uint256) {
        require(userRegistry.isRegistered(user), "User not registered");
        require(otpData[user].lockUntil < block.timestamp, "OTP locked");
        return _generateOTP(otpData[user].seed, block.timestamp / WINDOW_SIZE);
    }

    // Verifies an OTP for a user, locks account after too many failed attempts
    // function verifyOTP(address user, uint256 otp) external returns (bool) {
    //     require(userRegistry.isRegistered(user), "User not registered");
    //     require(otpData[user].lockUntil < block.timestamp, "OTP locked");

    //     uint256 currentWindow = block.timestamp / WINDOW_SIZE;
    //     uint256 storedWindow = otpData[user].lastUsedWindow;

    //     // Allow OTP from current or previous window (for clock skew), but only if not already used in current window
    //     if (
    //         (otp == _generateOTP(otpData[user].seed, currentWindow) ||
    //             otp == _generateOTP(otpData[user].seed, currentWindow - 1)) &&
    //         otpData[user].lastUsedWindow < currentWindow
    //     ) {
    //         otpData[user].lastUsedWindow = currentWindow;
    //         otpData[user].failedAttempts = 0;
    //         return true;
    //     } else {
    //         otpData[user].failedAttempts++;
    //         if (otpData[user].failedAttempts >= MAX_OTP_ATTEMPTS) {
    //             otpData[user].lockUntil = block.timestamp + OTP_LOCK_TIME;
    //             emit OTPAttemptsExceeded(user);
    //         }
    //         return false;
    //     }
    // }

    function verifyOTP(address user, uint256 otp) external returns (bool) {
        require(userRegistry.isRegistered(user), "User not registered");
        require(otpData[user].lockUntil < block.timestamp, "OTP locked");

        uint256 currentWindow = block.timestamp / WINDOW_SIZE;
        uint256 storedWindow = otpData[user].lastUsedWindow;

        // Allow OTP from current or previous window (for clock skew)
        if (
            otp == _generateOTP(otpData[user].seed, currentWindow) ||
            (otp == _generateOTP(otpData[user].seed, currentWindow - 1) &&
                otpData[user].lastUsedWindow < currentWindow)
        ) {
            otpData[user].lastUsedWindow = currentWindow;
            otpData[user].failedAttempts = 0;
            return true;
        } else {
            otpData[user].failedAttempts++;
            if (otpData[user].failedAttempts >= MAX_OTP_ATTEMPTS) {
                otpData[user].lockUntil = block.timestamp + OTP_LOCK_TIME;
                emit OTPAttemptsExceeded(user);
            }
            return false;
        }
    }

    // Internal function to generate OTP from seed and window
    function _generateOTP(
        bytes32 seed,
        uint256 window
    ) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(seed, window))) % 1_000_000;
    }

    // Admin-only function to unlock a user (emergency use)
    function adminUnlockUser(address user) external onlyOwner {
        otpData[user].lockUntil = 0;
        otpData[user].failedAttempts = 0;
    }

    // Some getter functions
    function getLastUsedWindow(address user) external view returns (uint256) {
        return otpData[user].lastUsedWindow;
    }

    function getFailedAttempts(address user) external view returns (uint256) {
        return otpData[user].failedAttempts;
    }

    function getLockUntil(address user) external view returns (uint256) {
        return otpData[user].lockUntil;
    }
}
