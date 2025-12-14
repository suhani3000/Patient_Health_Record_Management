// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract EHRRegistry {

    struct Record {
        string fileHash;      // hash of encrypted medical file
        address uploadedBy;   // doctor / lab
        uint256 timestamp;
    }

    // patient => records
    mapping(address => Record[]) private records;

    event RecordAdded(
        address indexed patient,
        address indexed uploader,
        string fileHash,
        uint256 timestamp
    );

    function addRecord(
        address patient,
        string calldata fileHash
    ) external {
        records[patient].push(
            Record(fileHash, msg.sender, block.timestamp)
        );

        emit RecordAdded(
            patient,
            msg.sender,
            fileHash,
            block.timestamp
        );
    }

    function getRecordCount(address patient)
        external
        view
        returns (uint256)
    {
        return records[patient].length;
    }
}
