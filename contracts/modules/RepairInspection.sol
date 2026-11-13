// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IDeviceTrail} from "../DeviceTrail.sol";

/**
 * @title RepairInspection
 * @notice Repair and inspection module for DeviceTrail.
 *
 * @dev CSE 540 - Team 5
 *
 * Implements:
 *   - addRepairRecord(productId, repairDescription)
 *   - certifyInspection(productId, reportHash)
 *
 * This contract is abstract. Roles, products and lifecycle status are
 * owned by the other modules (access control, product registration,
 * lifecycle status). This module reads and updates that shared state
 * only through the internal hooks declared at the bottom of this file.
 * The final DeviceTrail contract must implement those hooks.
 *
 * Rules enforced here:
 *   Repairs
 *     - The product must exist.
 *     - The caller must have the Refurbisher role.
 *     - The caller must be the product's current custodian.
 *     - The product must be in the Refurbishing status.
 *     - The repair description must not be empty.
 *   Inspections
 *     - The product must exist.
 *     - The caller must have the Inspector role.
 *     - The product must be in the Refurbishing status, i.e. repairs
 *       are done and the device is waiting for inspection.
 *     - The report hash must not be zero.
 *     - A report hash can be certified only once across all products,
 *       so one off-chain report cannot be reused for another device.
 *
 * The inspector does not need custody of the device. The inspector acts
 * as an independent third party that certifies an off-chain report.
 *
 * This module never changes the lifecycle status. Moving the product to
 * Inspected is done through updateStatus (lifecycle module), which can
 * call isInspected(productId) to require a certified inspection first.
 *
 * Report hashes are the sha256 of the report file as a bytes32, the same
 * value the backend (backend/storage.js) returns when a report is stored.
 */
abstract contract RepairInspection is IDeviceTrail {

    // -----------------------------------------
    // DATA STRUCTURES
    // -----------------------------------------

    struct RepairRecord {
        string description;
        address refurbisher;
        uint256 timestamp;
    }

    struct InspectionRecord {
        bytes32 reportHash;
        address inspector;
        uint256 timestamp;
    }

    // -----------------------------------------
    // STORAGE
    // -----------------------------------------

    /// @dev productId => repair history, oldest first.
    mapping(string => RepairRecord[]) private _repairs;

    /// @dev productId => inspection history, oldest first.
    mapping(string => InspectionRecord[]) private _inspections;

    /// @dev reportHash => already certified for some product.
    mapping(bytes32 => bool) private _usedReportHashes;

    // -----------------------------------------
    // ERRORS
    // -----------------------------------------

    error ProductNotFound(string productId);
    error NotRefurbisher(address caller);
    error NotInspector(address caller);
    error NotCustodian(address caller, address custodian);
    error InvalidStatusForRepair(Status current);
    error InvalidStatusForInspection(Status current);
    error EmptyRepairDescription();
    error EmptyReportHash();
    error ReportHashAlreadyUsed(bytes32 reportHash);

    // -----------------------------------------
    // REPAIR RECORDS
    // -----------------------------------------

    /// @inheritdoc IDeviceTrail
    function addRepairRecord(
        string calldata productId,
        string calldata repairDescription
    ) external virtual override {
        _requireProduct(productId);

        if (_roleOf(msg.sender) != Role.Refurbisher) {
            revert NotRefurbisher(msg.sender);
        }

        address custodian = _custodianOf(productId);
        if (custodian != msg.sender) {
            revert NotCustodian(msg.sender, custodian);
        }

        Status current = _statusOf(productId);
        if (current != Status.Refurbishing) {
            revert InvalidStatusForRepair(current);
        }

        if (bytes(repairDescription).length == 0) {
            revert EmptyRepairDescription();
        }

        _repairs[productId].push(
            RepairRecord({
                description: repairDescription,
                refurbisher: msg.sender,
                timestamp: block.timestamp
            })
        );

        emit RepairRecorded(productId, repairDescription);
    }

    // -----------------------------------------
    // INSPECTION CERTIFICATION
    // -----------------------------------------

    /// @inheritdoc IDeviceTrail
    function certifyInspection(
        string calldata productId,
        bytes32 reportHash
    ) external virtual override {
        _requireProduct(productId);

        if (_roleOf(msg.sender) != Role.Inspector) {
            revert NotInspector(msg.sender);
        }

        Status current = _statusOf(productId);
        if (current != Status.Refurbishing) {
            revert InvalidStatusForInspection(current);
        }

        if (reportHash == bytes32(0)) {
            revert EmptyReportHash();
        }

        if (_usedReportHashes[reportHash]) {
            revert ReportHashAlreadyUsed(reportHash);
        }

        _usedReportHashes[reportHash] = true;
        _inspections[productId].push(
            InspectionRecord({
                reportHash: reportHash,
                inspector: msg.sender,
                timestamp: block.timestamp
            })
        );

        emit InspectionCertified(productId, msg.sender, reportHash);
    }

    // -----------------------------------------
    // READ-ONLY VIEWS (for the consumer page)
    // -----------------------------------------

    /// @notice Full repair history of a product, oldest first.
    function getRepairHistory(
        string calldata productId
    ) external view returns (RepairRecord[] memory) {
        return _repairs[productId];
    }

    /// @notice Number of repairs recorded for a product.
    function getRepairCount(
        string calldata productId
    ) external view returns (uint256) {
        return _repairs[productId].length;
    }

    /// @notice Full inspection history of a product, oldest first.
    function getInspections(
        string calldata productId
    ) external view returns (InspectionRecord[] memory) {
        return _inspections[productId];
    }

    /// @notice True if at least one inspection has been certified.
    function isInspected(
        string calldata productId
    ) public view returns (bool) {
        return _inspections[productId].length > 0;
    }

    /**
     * @notice Check an off-chain report against the chain.
     * @dev The consumer hashes the report file (sha256, as the backend
     *      does) and passes the hash here. Returns true only if that exact hash was
     *      certified for this product.
     */
    function verifyInspectionReport(
        string calldata productId,
        bytes32 reportHash
    ) external view returns (bool) {
        InspectionRecord[] storage records = _inspections[productId];
        for (uint256 i = 0; i < records.length; i++) {
            if (records[i].reportHash == reportHash) {
                return true;
            }
        }
        return false;
    }

    // -----------------------------------------
    // INTERNAL HELPERS
    // -----------------------------------------

    function _requireProduct(string calldata productId) private view {
        if (!_productExists(productId)) {
            revert ProductNotFound(productId);
        }
    }

    // -----------------------------------------
    // HOOKS (implemented by the final DeviceTrail contract)
    // -----------------------------------------

    /// @dev Role of a stakeholder (access control module).
    function _roleOf(address account) internal view virtual returns (Role);

    /// @dev Whether a product is registered (registration module).
    function _productExists(string memory productId) internal view virtual returns (bool);

    /// @dev Current custodian of a product (registration / custody modules).
    function _custodianOf(string memory productId) internal view virtual returns (address);

    /// @dev Current lifecycle status of a product (lifecycle module).
    function _statusOf(string memory productId) internal view virtual returns (Status);
}
