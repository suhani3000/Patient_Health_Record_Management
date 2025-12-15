// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract EHRAccess {

    enum AccessType { NONE, VIEW, UPLOAD, BOTH }

    // patient => doctor => fileId => access
    mapping(address => mapping(address => mapping(uint256 => AccessType)))
        private permissions;

    event AccessGranted(
        address indexed patient,
        address indexed doctor,
        uint256 indexed fileId,
        AccessType access
    );

    event AccessRevoked(
        address indexed patient,
        address indexed doctor,
        uint256 indexed fileId
    );

    function grantAccess(
        address _doctor,
        uint256 _fileId,
        AccessType _access
    ) external {
        permissions[msg.sender][_doctor][_fileId] = _access;
        emit AccessGranted(msg.sender, _doctor, _fileId, _access);
    }

    function revokeAccess(address _doctor, uint256 _fileId) external {
        permissions[msg.sender][_doctor][_fileId] = AccessType.NONE;
        emit AccessRevoked(msg.sender, _doctor, _fileId);
    }

    function checkAccess(
        address _patient,
        address _doctor,
        uint256 _fileId
    ) external view returns (AccessType) {
        return permissions[_patient][_doctor][_fileId];
    }

//optional:
    function grantBatchAccess(
    address doctor,
    uint256[] calldata fileIds,
    AccessType access
) external {
    for (uint256 i = 0; i < fileIds.length; i++) {
        permissions[msg.sender][doctor][fileIds[i]] = access;
    }
}

}
