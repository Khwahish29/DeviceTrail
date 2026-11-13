// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ProductRegistration.sol";

// Repair and inspection module: refurbishers record repairs, inspectors certify off-chain
// inspection reports by their hash. The final contract inherits this.
//
// Products live in the shared storage of ProductRegistration; this module reads them with
// _load and never changes them. Moving a product to Inspected is done by updateStatus
// (lifecycle module), which can call isInspected(productId) to require a certified
// inspection first.
abstract contract RepairInspection is ProductRegistration {
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

    // Keyed by _key(productId), the same key ProductRegistration uses. Oldest record first.
    mapping(bytes32 => RepairRecord[]) private repairs;
    mapping(bytes32 => InspectionRecord[]) private inspections;

    // A report hash can be certified once across all products, so one report cannot be
    // reused for another device.
    mapping(bytes32 => bool) private usedReportHashes;

    // Only the Refurbisher holding the device can record a repair, and only while it is
    // being refurbished.
    function addRepairRecord(string calldata productId, string calldata repairDescription)
        external
        onlyRole(Role.Refurbisher)
    {
        Product storage p = _load(productId);
        require(msg.sender == p.currentCustodian, "Only the current custodian");
        require(p.status == Status.Refurbishing, "Product is not being refurbished");
        require(bytes(repairDescription).length > 0, "Empty repair description");

        repairs[_key(productId)].push(RepairRecord(repairDescription, msg.sender, block.timestamp));
        emit RepairRecorded(productId, repairDescription);
    }

    // Any Inspector can certify; they do not need custody (independent third party).
    // The report itself stays off-chain; only its hash is stored.
    function certifyInspection(string calldata productId, bytes32 reportHash)
        external
        onlyRole(Role.Inspector)
    {
        Product storage p = _load(productId);
        require(p.status == Status.Refurbishing, "Product is not being refurbished");
        require(reportHash != bytes32(0), "Empty report hash");
        require(!usedReportHashes[reportHash], "Report already certified");

        usedReportHashes[reportHash] = true;
        inspections[_key(productId)].push(InspectionRecord(reportHash, msg.sender, block.timestamp));
        emit InspectionCertified(productId, msg.sender, reportHash);
    }

    // ---------- read-only views ----------

    function getRepairHistory(string calldata productId) external view returns (RepairRecord[] memory) {
        _load(productId);
        return repairs[_key(productId)];
    }

    function getInspections(string calldata productId) external view returns (InspectionRecord[] memory) {
        _load(productId);
        return inspections[_key(productId)];
    }

    // True once at least one inspection has been certified for the product.
    function isInspected(string memory productId) public view returns (bool) {
        _load(productId);
        return inspections[_key(productId)].length > 0;
    }

    // True only if this exact report hash was certified for this product.
    // A consumer hashes the report file they were given and checks it here.
    function verifyInspectionReport(string calldata productId, bytes32 reportHash)
        external
        view
        returns (bool)
    {
        _load(productId);
        InspectionRecord[] storage list = inspections[_key(productId)];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i].reportHash == reportHash) return true;
        }
        return false;
    }
}
