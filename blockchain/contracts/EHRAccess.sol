// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EHRAccess {

    struct AccessLog {
        address user;
        string fileHash;
        uint256 timestamp;
    }

    mapping(string => address) private fileOwner;
    mapping(string => mapping(address => bool)) private permissions;
    AccessLog[] private accessLogs;

    function registerFile(string memory fileHash) public {
        require(fileOwner[fileHash] == address(0), "Already registered");
        fileOwner[fileHash] = msg.sender;
    }

    function grantAccess(string memory fileHash, address doctor) public {
        require(fileOwner[fileHash] == msg.sender, "Not owner");
        permissions[fileHash][doctor] = true;
    }

    function revokeAccess(string memory fileHash, address doctor) public {
        require(fileOwner[fileHash] == msg.sender, "Not owner");
        permissions[fileHash][doctor] = false;
    }

    function logAccess(string memory fileHash) public {
        require(
            permissions[fileHash][msg.sender] || fileOwner[fileHash] == msg.sender,
            "Access denied"
        );

        accessLogs.push(
            AccessLog(msg.sender, fileHash, block.timestamp)
        );
    }

    function getLogsCount() public view returns (uint256) {
        return accessLogs.length;
    }
}
