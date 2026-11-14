// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RepairInspection.sol";

// Lifecycle module: moves a device through its life, one step at a time.
//
//   Registered -> InTransit -> Refurbishing -> Inspected -> AvailableForSale -> Sold
//
// No skipping, no going back, and Sold is the end. It reads and updates the shared product
// storage of ProductRegistration. It extends RepairInspection only so it can call
// isInspected: a device cannot become Inspected until an inspector has certified it.
abstract contract LifecycleStatus is RepairInspection {
    // The one status that may follow `s`. The bool is false for Sold, which has no next step.
    function _nextStatus(Status s) internal pure returns (Status, bool) {
        if (s == Status.Registered) return (Status.InTransit, true);
        if (s == Status.InTransit) return (Status.Refurbishing, true);
        if (s == Status.Refurbishing) return (Status.Inspected, true);
        if (s == Status.Inspected) return (Status.AvailableForSale, true);
        if (s == Status.AvailableForSale) return (Status.Sold, true);
        return (s, false);
    }

    // Who may move a device INTO status `to`.
    function _isAllowedRole(Status to, Role r) internal pure returns (bool) {
        if (to == Status.InTransit) return r == Role.Manufacturer || r == Role.Distributor;
        if (to == Status.Refurbishing || to == Status.Inspected) return r == Role.Refurbisher;
        if (to == Status.AvailableForSale || to == Status.Sold) return r == Role.Retailer;
        return false; // nobody moves a device back into Registered
    }

    // Checks run in a fixed order so every failure has one predictable reason.
    // The admin has no special power here: same rule as transferCustody.
    function updateStatus(string calldata productId, Status newStatus) external {
        Product storage p = _load(productId);

        Role role = getRole(msg.sender);
        require(role != Role.None, "Caller has no role");

        (Status next, bool hasNext) = _nextStatus(p.status);
        require(hasNext && newStatus == next, "Invalid status transition");

        require(_isAllowedRole(newStatus, role), "Caller has the wrong role");
        require(msg.sender == p.currentCustodian, "Only the current custodian");

        if (newStatus == Status.Inspected) {
            require(isInspected(productId), "No certified inspection");
        }

        p.status = newStatus;
        emit StatusUpdated(productId, newStatus);
    }
}
