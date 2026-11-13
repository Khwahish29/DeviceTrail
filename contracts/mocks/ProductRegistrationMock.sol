// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../ProductRegistration.sol";

// Test-only: lets the registration module be tested before the other modules exist.
contract ProductRegistrationMock is ProductRegistration {
    function transferCustody(string calldata, address) external pure {}
    function addRepairRecord(string calldata, string calldata) external pure {}
    function updateStatus(string calldata, Status) external pure {}
    function certifyInspection(string calldata, bytes32) external pure {}
}
