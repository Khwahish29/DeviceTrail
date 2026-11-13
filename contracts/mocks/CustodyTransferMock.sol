// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../CustodyTransfer.sol";

// Test-only: lets the custody module be tested before the product registration module exists.
// Stores products in a simple mapping and lets tests create one directly with addProduct.
contract CustodyTransferMock is CustodyTransfer {
    mapping(string => Product) private products;

    function addProduct(string calldata productId, address custodian) external {
        products[productId] = Product(productId, "Test Model", custodian, Status.Registered, true);
    }

    function getProduct(string calldata productId) external view returns (Product memory) {
        require(products[productId].exists, "Product not found");
        return products[productId];
    }

    // Owned by other modules; stubbed so this contract can be deployed.
    function registerProduct(string calldata, string calldata) external pure {}
    function addRepairRecord(string calldata, string calldata) external pure {}
    function updateStatus(string calldata, Status) external pure {}
    function certifyInspection(string calldata, bytes32) external pure {}

    function _productExists(string memory productId) internal view override returns (bool) {
        return products[productId].exists;
    }

    function _custodianOf(string memory productId) internal view override returns (address) {
        return products[productId].currentCustodian;
    }

    function _setCustodian(string memory productId, address newCustodian) internal override {
        products[productId].currentCustodian = newCustodian;
    }
}
