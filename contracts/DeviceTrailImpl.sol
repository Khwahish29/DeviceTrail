// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AccessControl.sol";
import "./ProductRegistration.sol";
import "./CustodyTransfer.sol";
import "./LifecycleStatus.sol";
import "./RepairInspection.sol";

// Final contract: combines every module into the one contract that gets deployed.
contract DeviceTrail is
    AccessControl,
    ProductRegistration,
    CustodyTransfer,
    RepairInspection,
    LifecycleStatus
{}
