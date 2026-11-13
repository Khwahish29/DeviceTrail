// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AccessControl.sol";

// Registration module: manufacturers create devices. Also owns the shared product storage
// that the custody, lifecycle and repair/inspection modules read and update.
abstract contract ProductRegistration is AccessControl {
    // Keyed by hash because Solidity cannot use a string as a cheap, fixed-size key.
    mapping(bytes32 => Product) internal products;

    function _key(string memory productId) internal pure returns (bytes32) {
        return keccak256(bytes(productId));
    }

    // Single place that checks a product exists, so other modules get the same error.
    function _load(string memory productId) internal view returns (Product storage) {
        Product storage p = products[_key(productId)];
        require(p.exists, "Product not found");
        return p;
    }

    function registerProduct(string calldata productId, string calldata model)
        external
        onlyRole(Role.Manufacturer)
    {
        require(bytes(productId).length > 0, "Empty product ID");
        bytes32 key = _key(productId);
        require(!products[key].exists, "Product already registered");

        // The manufacturer is the first custodian, so custody always has a starting point.
        products[key] = Product({
            productId: productId,
            model: model,
            currentCustodian: msg.sender,
            status: Status.Registered,
            exists: true
        });

        emit ProductRegistered(productId, msg.sender);
    }

    function getProduct(string calldata productId) public view returns (Product memory) {
        return _load(productId);
    }
}
