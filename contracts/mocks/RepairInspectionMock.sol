// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../RepairInspection.sol";

// Test-only: lets the repair and inspection module be tested before the custody and
// lifecycle modules exist. registerProduct and getProduct come from ProductRegistration.
contract RepairInspectionMock is RepairInspection {
    // Stand-ins for transferCustody and updateStatus: write straight to shared storage.
    function setCustodian(string calldata productId, address custodian) external {
        _load(productId).currentCustodian = custodian;
    }

    function setStatus(string calldata productId, Status status) external {
        _load(productId).status = status;
    }

    // Owned by other modules; stubbed so this contract can be deployed.
    function transferCustody(string calldata, address) external pure {}
    function updateStatus(string calldata, Status) external pure {}
}
