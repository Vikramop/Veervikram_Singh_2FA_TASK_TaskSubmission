// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

interface IUserRegistry {
    function isRegistered(address user) external view returns (bool);
}

interface IOTPManager {
    function verifyOTP(address user, uint256 otp) external returns (bool);
}

contract Authenticator is Ownable {
    using Address for address;

    IUserRegistry public userRegistry;
    IOTPManager public otpManager;

    event AuthenticationSuccess(address indexed user);
    event AuthenticationFailure(address indexed user);

    constructor(
        address _userRegistry,
        address _otpManager
    ) Ownable(msg.sender) {
        userRegistry = IUserRegistry(_userRegistry);
        otpManager = IOTPManager(_otpManager);
    }

    function hasCode(address account) internal view returns (bool) {
        return account.code.length > 0;
    }

    // Standard OTP-based authentication (uses msg.sender)
    function authenticate(uint256 otp) external {
        require(userRegistry.isRegistered(msg.sender), "User not registered");
        require(!hasCode(msg.sender), "Contracts cannot register");

        if (otpManager.verifyOTP(msg.sender, otp)) {
            emit AuthenticationSuccess(msg.sender);
        } else {
            emit AuthenticationFailure(msg.sender);
            revert("Authentication failed");
        }
    }

    // PKI-based authentication: user signs OTP with private key, submits signature
    function authenticateWithPKI(
        uint256 otp,
        bytes calldata signature
    ) external {
        require(userRegistry.isRegistered(msg.sender), "User not registered");
        require(!hasCode(msg.sender), "Contracts cannot authenticate");

        // Verify signature (PKI)
        bytes32 messageHash = keccak256(abi.encodePacked(otp));
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = splitSignature(signature);
        address recovered = ecrecover(ethSignedMessageHash, v, r, s);
        require(recovered == msg.sender, "Invalid signature");

        // Verify OTP
        require(otpManager.verifyOTP(msg.sender, otp), "Invalid OTP");

        emit AuthenticationSuccess(msg.sender);
    }

    // Helper to split signature into v, r, s components
    function splitSignature(
        bytes memory sig
    ) internal pure returns (uint8 v, bytes32 r, bytes32 s) {
        require(sig.length == 65, "Invalid signature length");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        if (v < 27) v += 27;
    }
}
