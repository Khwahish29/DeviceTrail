// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AccessControl.sol";

// Custody module: moves a product from its current holder to the next stakeholder.
// The final contract inherits this.
//
// Products are stored by the product registration module, so this module reads and
// updates them only through the three hooks at the bottom. The contract that owns the
// product mapping implements them. The names match the hooks in the repair and
// inspection module, so one implementation serves both.
abstract contract CustodyTransfer is AccessControl {
    function transferCustody(string calldata productId, address newCustodian) external {
        require(_productExists(productId), "Product not found");

        address current = _custodianOf(productId);
        require(msg.sender == current, "Only the current custodian");
        // A stakeholder whose role was removed keeps no power over devices they still hold.
        require(getRole(msg.sender) != Role.None, "Caller has no role");

        require(newCustodian != address(0), "Zero address");
        require(newCustodian != current, "Already the custodian");
        require(getRole(newCustodian) != Role.None, "Recipient has no role");

        _setCustodian(productId, newCustodian);
        emit CustodyTransferred(productId, current, newCustodian);
    }

    // ---------- hooks implemented by the module that stores products ----------

    function _productExists(string memory productId) internal view virtual returns (bool);

    function _custodianOf(string memory productId) internal view virtual returns (address);

    function _setCustodian(string memory productId, address newCustodian) internal virtual;
}
