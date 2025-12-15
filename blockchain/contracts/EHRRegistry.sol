// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract EHRRegistry {

    struct FileMeta {
        uint256 fileId;
        string category; // lab / prescription / imaging
        uint256 timestamp;
    }

    // patient => fileId counter
    mapping(address => uint256) private fileCounter;

    // patient => list of files
    mapping(address => FileMeta[]) private patientFiles;

    event FileRegistered(
        address indexed patient,
        uint256 indexed fileId,
        string category
    );

    function registerFile(string memory _category) external {
        uint256 newFileId = ++fileCounter[msg.sender];

        patientFiles[msg.sender].push(
            FileMeta(newFileId, _category, block.timestamp)
        );

        emit FileRegistered(msg.sender, newFileId, _category);
    }

    function getFiles(address _patient)
        external
        view
        returns (FileMeta[] memory)
    {
        return patientFiles[_patient];
    }
}
