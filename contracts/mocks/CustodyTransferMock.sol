// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../CustodyTransfer.sol";

// Test-only: lets the custody module be tested before the other modules exist.
// registerProduct and getProduct come from the real registration module; only the
// functions that neither module implements are stubbed here.
contract CustodyTransferMock is CustodyTransfer {
    function addRepairRecord(string calldata, string calldata) external pure {}
    function updateStatus(string calldata, Status) external pure {}
    function certifyInspection(string calldata, bytes32) external pure {}
}
