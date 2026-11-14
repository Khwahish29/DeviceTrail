// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../LifecycleStatus.sol";

// Test-only: lets the lifecycle module be tested before the custody module is merged.
// registerProduct, getProduct, addRepairRecord and certifyInspection come from the real modules.
contract LifecycleStatusMock is LifecycleStatus {
    // Stand-in for transferCustody: write straight to shared storage.
    function setCustodian(string calldata productId, address custodian) external {
        _load(productId).currentCustodian = custodian;
    }

    // Put a product in any state without walking the chain.
    function setStatus(string calldata productId, Status status) external {
        _load(productId).status = status;
    }

    // Owned by the custody module; stubbed so this contract can be deployed.
    function transferCustody(string calldata, address) external pure {}
}
