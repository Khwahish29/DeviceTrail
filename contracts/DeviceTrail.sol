
 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DeviceTrail
 * @notice Blockchain-based electronics refurbishment
 *         and supply chain provenance system.
 *
 * @dev CSE 540 - Team 5
 *      Draft smart contract interface.
 *
 * This interface defines the planned functionality
 * for tracking electronic devices throughout their
 * registration, refurbishment, inspection, and resale.
 *
 * Implementation and deployment will be completed
 * in the next development phase.
 */

interface IDeviceTrail {

    // -----------------------------------------
    // 1. STAKEHOLDER ROLES
    // -----------------------------------------

    /**
     * @dev Defines the roles of participants.
     * Role-based access control will restrict
     * sensitive operations to authorized users.
     */
    enum Role {
        None,
        Manufacturer,
        Distributor,
        Refurbisher,
        Inspector,
        Retailer
    }

    // -----------------------------------------
    // 2. PRODUCT LIFECYCLE STATUS
    // -----------------------------------------

    /**
     * @dev Represents the current lifecycle
     * stage of an electronic device.
     */
    enum Status {
        Registered,
        InTransit,
        Refurbishing,
        Inspected,
        AvailableForSale,
        Sold
    }

    // -----------------------------------------
    // 3. PRODUCT DATA STRUCTURE
    // -----------------------------------------

    /**
     * @dev Stores essential information
     * about a registered electronic device.
     *
     * Detailed repair and inspection documents
     * will be stored off-chain.
     */
    struct Product {
        string productId;
        string model;
        address currentCustodian;
        Status status;
        bool exists;
    }

    // -----------------------------------------
    // 4. BLOCKCHAIN EVENTS
    // -----------------------------------------

    /**
     * @dev Events provide a traceable history
     * of device lifecycle transactions.
     */

    event ProductRegistered(
        string productId,
        address manufacturer
    );

    event CustodyTransferred(
        string productId,
        address from,
        address to
    );

    event RepairRecorded(
        string productId,
        string repairDescription
    );

    event StatusUpdated(
        string productId,
        Status newStatus
    );

    event InspectionCertified(
        string productId,
        address inspector,
        bytes32 reportHash
    );

    event RoleAssigned(
        address stakeholder,
        Role role
    );

    // -----------------------------------------
    // 5. ACCESS CONTROL
    // -----------------------------------------

    /**
     * @notice Assign a role to a stakeholder.
     * @dev Only an authorized administrator
     * should be able to assign roles.
     */
    function assignRole(
        address stakeholder,
        Role role
    ) external;

    /**
     * @notice Retrieve a stakeholder's role.
     * @dev Used to validate permissions before
     * allowing restricted transactions.
     */
    function getRole(
        address stakeholder
    ) external view returns (Role);

    // -----------------------------------------
    // 6. PRODUCT REGISTRATION
    // -----------------------------------------

    /**
     * @notice Register a new electronic device.
     *
     * @dev Only authorized manufacturers can
     * register devices.
     *
     * Duplicate product IDs must be rejected.
     * The manufacturer becomes the initial
     * custodian of the registered device.
     */
    function registerProduct(
        string calldata productId,
        string calldata model
    ) external;

    // -----------------------------------------
    // 7. CUSTODY TRANSFER
    // -----------------------------------------

    /**
     * @notice Transfer custody of a device.
     *
     * @dev Only the current custodian can
     * initiate a transfer.
     *
     * Transfers to unauthorized stakeholders
     * or invalid addresses must be rejected.
     */
    function transferCustody(
        string calldata productId,
        address newCustodian
    ) external;

    // -----------------------------------------
    // 8. REPAIR RECORDS
    // -----------------------------------------

    /**
     * @notice Record a device repair.
     *
     * @dev Only authorized refurbishers
     * holding custody of the device can
     * submit repair records.
     *
     * Repair history must remain traceable
     * through blockchain events.
     */
    function addRepairRecord(
        string calldata productId,
        string calldata repairDescription
    ) external;

    // -----------------------------------------
    // 9. STATUS UPDATES
    // -----------------------------------------

    /**
     * @notice Update a device's lifecycle status.
     *
     * @dev Only authorized stakeholders should
     * update device status.
     *
     * Invalid lifecycle transitions
     * must be rejected.
     */
    function updateStatus(
        string calldata productId,
        Status newStatus
    ) external;

    // -----------------------------------------
    // 10. INSPECTION CERTIFICATION
    // -----------------------------------------

    /**
     * @notice Record device inspection results.
     *
     * @dev Only authorized inspectors can
     * certify inspections.
     *
     * Inspection reports remain off-chain,
     * while their cryptographic hashes are
     * recorded on the blockchain.
     */
    function certifyInspection(
        string calldata productId,
        bytes32 reportHash
    ) external;

    // -----------------------------------------
    // 11. PRODUCT VERIFICATION
    // -----------------------------------------

    /**
     * @notice Retrieve a device's information.
     *
     * @dev Public read-only function.
     * Consumers can use the product ID from
     * a QR code to verify device information.
     *
     * Historical events will be used to
     * reconstruct the device's provenance.
     */
    function getProduct(
        string calldata productId
    ) external view returns (Product memory);
}
