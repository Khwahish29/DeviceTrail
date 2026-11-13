// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DeviceTrail.sol";

// Roles module: who is allowed to do what. The final contract inherits this.
abstract contract AccessControl is IDeviceTrail {
    address public admin;
    mapping(address => Role) private roles;

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyRole(Role required) {
        require(roles[msg.sender] == required, "Caller has the wrong role");
        _;
    }

    function assignRole(address stakeholder, Role role) external onlyAdmin {
        require(stakeholder != address(0), "Zero address");
        roles[stakeholder] = role;
        emit RoleAssigned(stakeholder, role);
    }

    function getRole(address stakeholder) public view returns (Role) {
        return roles[stakeholder];
    }
}
