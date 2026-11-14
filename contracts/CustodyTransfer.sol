// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ProductRegistration.sol";

// Custody module: moves a product from its current holder to the next stakeholder.
// The final contract inherits this.
//
// Products live in the registration module's shared storage, so this module reads and
// updates them through _load() (see docs/PRODUCT_REGISTRATION.md).
abstract contract CustodyTransfer is ProductRegistration {
    function transferCustody(string calldata productId, address newCustodian) external {
        Product storage p = _load(productId); // reverts with "Product not found"

        address current = p.currentCustodian;
        require(msg.sender == current, "Only the current custodian");
        // A stakeholder whose role was removed keeps no power over devices they still hold.
        require(getRole(msg.sender) != Role.None, "Caller has no role");

        require(newCustodian != address(0), "Zero address");
        require(newCustodian != current, "Already the custodian");
        require(getRole(newCustodian) != Role.None, "Recipient has no role");

        p.currentCustodian = newCustodian;
        emit CustodyTransferred(productId, current, newCustodian);
    }
}
