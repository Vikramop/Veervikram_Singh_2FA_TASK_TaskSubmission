// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract UserRegistry is Ownable {
    using Address for address;

    struct User {
        string username;
        bool exists;
    }

    mapping(address => User) private users;
    mapping(string => bool) private usernameTaken;
    mapping(address => bytes) public userPublicKeys; // Stores cryptographic public keys for PKI

    event UserRegistered(address indexed user, string username);
    event PublicKeyUpdated(address indexed user);

    constructor() Ownable(msg.sender) {}

    function hasCode(address account) internal view returns (bool) {
        return account.code.length > 0;
    }

    // Ensures unique username and prevents contract addresses from registering
    function registerUser(string calldata username) external {
        require(!users[msg.sender].exists, "User already registered");
        require(!usernameTaken[username], "Username taken");
        require(bytes(username).length >= 3, "Username too short");
        require(!hasCode(msg.sender), "Contracts cannot register");

        users[msg.sender] = User(username, true);
        usernameTaken[username] = true;

        emit UserRegistered(msg.sender, username);
    }

    // Allows user to set/update their cryptographic public key
    function setPublicKey(bytes calldata publicKey) external {
        require(users[msg.sender].exists, "User not registered");
        userPublicKeys[msg.sender] = publicKey;
        emit PublicKeyUpdated(msg.sender);
    }

    // Checks if a user is registered
    function isRegistered(address user) external view returns (bool) {
        return users[user].exists;
    }

    // Returns username for a given address (Etherscan-friendly)
    function getUsername(address user) external view returns (string memory) {
        require(users[user].exists, "User not registered");
        return users[user].username;
    }

    // Admin-only function to remove a user (emergency use)
    function adminRemoveUser(address user) external onlyOwner {
        string memory username = users[user].username;
        require(bytes(username).length > 0, "User not found");
        delete usernameTaken[username];
        delete users[user];
    }
}
