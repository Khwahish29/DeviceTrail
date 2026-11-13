// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {RepairInspection} from "../modules/RepairInspection.sol";

/**
 * @title RepairInspectionHarness
 * @notice Test-only contract. Lets the RepairInspection module be tested
 *         on its own, before the other modules exist.
 *
 * @dev Implements the module's hooks with simple storage and exposes
 *      setters so tests can put a product into any state directly.
 *      Not for deployment.
 */
contract RepairInspectionHarness is RepairInspection {

    mapping(address => Role) private _roles;
    mapping(string => Product) private _products;

    // ---------- test setters ----------

    function setRole(address account, Role role) external {
        _roles[account] = role;
    }

    function setProduct(
        string calldata productId,
        address custodian,
        Status status
    ) external {
        _products[productId] = Product({
            productId: productId,
            model: "Test Model",
            currentCustodian: custodian,
            status: status,
            exists: true
        });
    }

    // ---------- unused IDeviceTrail functions ----------
    // Owned by other modules; stubbed so this contract is deployable.

    function assignRole(address, Role) external pure override {
        revert("harness: not implemented");
    }

    function getRole(address account) external view override returns (Role) {
        return _roles[account];
    }

    function registerProduct(string calldata, string calldata) external pure override {
        revert("harness: not implemented");
    }

    function transferCustody(string calldata, address) external pure override {
        revert("harness: not implemented");
    }

    function updateStatus(string calldata, Status) external pure override {
        revert("harness: not implemented");
    }

    function getProduct(string calldata productId) external view override returns (Product memory) {
        return _products[productId];
    }

    // ---------- hooks ----------

    function _roleOf(address account) internal view override returns (Role) {
        return _roles[account];
    }

    function _productExists(string memory productId) internal view override returns (bool) {
        return _products[productId].exists;
    }

    function _custodianOf(string memory productId) internal view override returns (address) {
        return _products[productId].currentCustodian;
    }

    function _statusOf(string memory productId) internal view override returns (Status) {
        return _products[productId].status;
    }
}
