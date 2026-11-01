
# DeviceTrail
### Blockchain-Based Electronics Refurbishment and Provenance System

**Course:** CSE 540 – Engineering Blockchain Applications  
**Semester:** Fall B 2026  
**Team:** 5  
**Project Status:** Draft Smart Contract Design

## 1. Project Overview

DeviceTrail is a blockchain-based supply chain provenance
system designed to improve transparency, traceability, and
trust in the refurbished electronics industry.

The system tracks electronic devices, particularly laptops,
through registration, custody transfers, refurbishment,
quality inspections, and resale.

Using Ethereum smart contracts, DeviceTrail aims to maintain
tamper-resistant records of device history. Consumers will
be able to verify a device's recorded history through a
QR-code-based interface.

## 2. Problem Statement

Consumers purchasing refurbished electronics often lack
reliable information about previous repairs, replaced
components, and inspection results.

Traditional centralized systems may contain incomplete or
modified records, making product verification difficult.

DeviceTrail addresses this issue by proposing a shared
blockchain-based provenance system where authorized
stakeholders record important lifecycle transactions.

## 3. Key Features

The proposed system will support:

- **Product Registration:** Register electronic devices
  using unique product identifiers.
- **Custody Tracking:** Record device transfers between
  authorized stakeholders.
- **Repair History:** Document repairs and component
  replacements performed by refurbishers.
- **Inspection Certification:** Record inspection results
  using cryptographic hashes of off-chain reports.
- **Status Updates:** Track device lifecycle stages.
- **Role-Based Access Control:** Restrict sensitive
  operations to authorized stakeholders.
- **Consumer Verification:** Allow consumers to view
  device histories through QR codes.

## 4. Technology Stack

| Component | Technology |
|-----------|------------|
| Blockchain | Ethereum |
| Smart Contracts | Solidity ^0.8.20 |
| Development Framework | Hardhat (planned) |
| Frontend | React.js (planned) |
| Blockchain Integration | Ethers.js (planned) |
| Off-Chain Storage | IPFS (planned) |
| Version Control | GitHub |

## 5. Project Structure

```text
devicetrail/
├── contracts/
│   └── DeviceTrail.sol
└── README.md
```

The `contracts/DeviceTrail.sol` file currently defines
the draft Solidity interface for the system.

Additional folders for testing, deployment, and frontend
development will be introduced in later phases.

## 6. Smart Contract Design

The draft smart contract defines the following components:

### Data Structures

- `Role`: Defines manufacturer, distributor,
  refurbisher, inspector, and retailer permissions.
- `Status`: Represents device lifecycle stages.
- `Product`: Stores product ID, model, current custodian,
  lifecycle status, and registration state.

### Main Functions

| Function | Description |
|----------|-------------|
| `assignRole()` | Assign stakeholder permissions |
| `getRole()` | Retrieve stakeholder roles |
| `registerProduct()` | Register a new electronic device |
| `transferCustody()` | Transfer custody between stakeholders |
| `addRepairRecord()` | Record repairs and replacements |
| `updateStatus()` | Update device lifecycle status |
| `certifyInspection()` | Record inspection report hashes |
| `getProduct()` | Retrieve registered device details |

### Blockchain Events

The contract interface defines the following events:

- `ProductRegistered`
- `CustodyTransferred`
- `RepairRecorded`
- `StatusUpdated`
- `InspectionCertified`
- `RoleAssigned`

These events will support transparency and enable
reconstruction of device histories.

## 7. Dependencies and Setup Instructions

### Prerequisites

The planned development environment requires:

- Node.js and npm
- Git
- Hardhat
- Solidity compiler
- Ethers.js

### Clone the Repository

```bash
git clone https://github.com/khwahish29/devicetrail.git
cd devicetrail
```

### Planned Development Setup

After the Hardhat project is initialized and its
dependencies are added, the following commands
will be used:

```bash
npm install
npx hardhat compile
```

**Note:** The repository currently contains a Solidity
interface draft. Hardhat configuration, dependencies,
and executable smart contract implementations will
be added in subsequent development phases.

## 8. Planned Usage and Deployment

The intended workflow is:

1. An administrator assigns roles to stakeholders.
2. A manufacturer registers an electronic device.
3. An authorized custodian transfers the device.
4. A refurbisher records repairs or replacements.
5. An inspector records an inspection report hash.
6. A retailer receives the refurbished device.
7. A consumer scans a QR code to verify its history.

The smart contracts will initially be deployed to
a local Hardhat blockchain for development and testing.

Frontend integration and deployment scripts will
be implemented in later project stages.

**Current limitation:** `DeviceTrail.sol` defines
the `IDeviceTrail` interface only. It does not yet
implement transaction logic or support deployment
as a functional provenance application.

## 9. Security and Validation

The planned implementation will include:

- Prevention of duplicate device registrations.
- Role-based authorization for restricted operations.
- Validation of custody before device transfers.
- Rejection of unauthorized repair records.
- Validation of lifecycle status transitions.
- On-chain hashes for verifying off-chain reports.

These safeguards are documented in the current
interface and will be implemented and tested later.

## 10. Team Members

**CSE 540 – Team 5**

Khwahish Patel, Prakruti Dangi, Kaushha Trivedi, Meet Patel, Harsh Modi

## 11. Current Progress and Future Work

### Current Phase
- Project architecture and scope defined.
- Solidity contract interface drafted.
- Product structures, lifecycle statuses, and events defined.
- Planned access control and validation documented.

### Next Steps
- Implement Solidity smart contract functionality.
- Configure the Hardhat development environment.
- Develop and execute smart contract tests.
- Build the React frontend.
- Integrate QR-code-based product verification.
- Connect off-chain inspection report storage.
- Demonstrate the complete device lifecycle.

## 12. License

This project is developed for educational purposes
as part of CSE 540 – Engineering Blockchain Applications.
