// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TwoFactorAuth {
    struct User {
        string username;
        address publicKey;
        bytes32 otpSeed; // stored as bytes32 hash of seed
        uint256 lastUsedWindow; // to prevent replay attacks
        bool exists;
    }

    mapping(address => User) private users;
    mapping(string => bool) private usernameTaken;

    event UserRegistered(address indexed user, string username);
    event Authenticated(address indexed user);

    // Register a user with unique username, public key (msg.sender), and otpSeed
    function registerUser(string calldata username, bytes32 otpSeed) external {
        require(!users[msg.sender].exists, "User already registered");
        require(!usernameTaken[username], "Username taken");
        require(bytes(username).length > 0, "Username required");

        users[msg.sender] = User({
            username: username,
            publicKey: msg.sender,
            otpSeed: otpSeed,
            lastUsedWindow: 0,
            exists: true
        });
        usernameTaken[username] = true;

        emit UserRegistered(msg.sender, username);
    }

    // Internal function to compute OTP based on seed and time window
    // OTP = uint256(keccak256(abi.encodePacked(seed, timeWindow))) % 1_000_000 (6-digit OTP)
    function _generateOtp(
        bytes32 seed,
        uint256 timeWindow
    ) internal pure returns (uint256) {
        return
            uint256(keccak256(abi.encodePacked(seed, timeWindow))) % 1_000_000;
    }

    // Public function to generate current OTP for caller, for testing/demo
    function generateCurrentOtp() external view returns (uint256) {
        require(users[msg.sender].exists, "User not registered");
        uint256 timeWindow = block.timestamp / 30; // 30-second window
        return _generateOtp(users[msg.sender].otpSeed, timeWindow);
    }

    // Authenticate user by verifying OTP for current or previous time window to allow slight clock skew
    function authenticate(uint256 otp) external returns (bool) {
        require(users[msg.sender].exists, "User not registered");

        uint256 currentWindow = block.timestamp / 30;
        uint256 prevWindow = currentWindow - 1;

        uint256 expectedOtpCurrent = _generateOtp(
            users[msg.sender].otpSeed,
            currentWindow
        );
        uint256 expectedOtpPrev = _generateOtp(
            users[msg.sender].otpSeed,
            prevWindow
        );

        // Check OTP matches current or previous window
        bool validOtp = (otp == expectedOtpCurrent) || (otp == expectedOtpPrev);
        require(validOtp, "Invalid OTP");

        // Prevent replay attacks by ensuring OTP window not reused
        require(
            users[msg.sender].lastUsedWindow < currentWindow,
            "OTP already used"
        );

        users[msg.sender].lastUsedWindow = currentWindow;

        emit Authenticated(msg.sender);
        return true;
    }

    // Getter for user info (username and publicKey)
    function getUser(
        address userAddress
    ) external view returns (string memory, address) {
        require(users[userAddress].exists, "User not registered");
        User memory u = users[userAddress];
        return (u.username, u.publicKey);
    }
}
