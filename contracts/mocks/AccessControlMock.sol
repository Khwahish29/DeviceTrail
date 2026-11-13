// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../AccessControl.sol";

// Test-only: lets the roles module be tested before the other modules exist.
contract AccessControlMock is AccessControl {
    function manufacturerOnly() external view onlyRole(Role.Manufacturer) returns (bool) {
        return true;
    }

    function registerProduct(string calldata, string calldata) external pure {}
    function transferCustody(string calldata, address) external pure {}
    function addRepairRecord(string calldata, string calldata) external pure {}
    function updateStatus(string calldata, Status) external pure {}
    function certifyInspection(string calldata, bytes32) external pure {}

    function getProduct(string calldata) external pure returns (Product memory p) {
        return p;
    }
}
