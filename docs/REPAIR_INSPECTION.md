# Repair and inspection

## The repair and inspection module (`contracts/RepairInspection.sol`)

`abstract contract RepairInspection is ProductRegistration`, inherited by the final `DeviceTrail` contract. Products are read from the shared storage in `ProductRegistration` with `_load`; this module never changes a product's status or custodian.

### `addRepairRecord(productId, repairDescription)`

The Refurbisher holding the device records a repair. Stores the description, the refurbisher's address and the block timestamp, and emits `RepairRecorded(productId, repairDescription)`.

| Revert reason | When |
|---|---|
| `Caller has the wrong role` | Caller is not a Refurbisher (this includes a custodian with another role, and a refurbisher whose role was removed) |
| `Product not found` | No product with that ID |
| `Only the current custodian` | Caller is a Refurbisher but does not hold the device |
| `Product is not being refurbished` | Status is not `Refurbishing` |
| `Empty repair description` | Description is `""` |

### `certifyInspection(productId, reportHash)`

An Inspector certifies an off-chain inspection report by its hash. Stores the hash, the inspector's address and the block timestamp, and emits `InspectionCertified(productId, inspector, reportHash)`.

The inspector does **not** need custody: they act as an independent third party. Certifying does **not** change the status; the custodian then moves the product to `Inspected` with `updateStatus`.

| Revert reason | When |
|---|---|
| `Caller has the wrong role` | Caller is not an Inspector |
| `Product not found` | No product with that ID |
| `Product is not being refurbished` | Status is not `Refurbishing` |
| `Empty report hash` | `reportHash` is `bytes32(0)` |
| `Report already certified` | This hash was already certified, for this or any other product |

Several inspections per product are allowed (for example, a re-inspection after more repairs), as long as each uses a new report.

### Report hashes

The report itself stays off-chain; only its hash goes on-chain. Use the **sha256** of the report file's bytes as a `bytes32`:

```js
const reportHash = ethers.sha256(reportBytes);   // e.g. ethers.toUtf8Bytes(text) or a file Buffer
```

## Read-only functions (for the QR / consumer page)

All are `view`, need no wallet, and revert with `Product not found` for an unknown ID.

| Function | Returns |
|---|---|
| `getRepairHistory(productId)` | `RepairRecord[]`, oldest first: `{ description, refurbisher, timestamp }` |
| `getInspections(productId)` | `InspectionRecord[]`, oldest first: `{ reportHash, inspector, timestamp }` |
| `isInspected(productId)` | `true` once at least one inspection is certified |
| `verifyInspectionReport(productId, reportHash)` | `true` only if that exact hash was certified for that product |

ABI lines for an ethers.js page:

```js
"function getRepairHistory(string productId) view returns (tuple(string description, address refurbisher, uint256 timestamp)[])",
"function getInspections(string productId) view returns (tuple(bytes32 reportHash, address inspector, uint256 timestamp)[])",
"function isInspected(string productId) view returns (bool)",
"function verifyInspectionReport(string productId, bytes32 reportHash) view returns (bool)",
```

`verifyInspectionReport` lets a consumer check a report they were given: hash the file with sha256 and pass the hash. An edited report gives a different hash and returns `false`.

The events (`RepairRecorded`, `InspectionCertified`) carry the same information, so a page that already rebuilds history from events keeps working unchanged.

## For the lifecycle module: `isInspected`

`isInspected(productId)` is `public`, so `updateStatus` can call it to stop a product reaching `Inspected` without a certified inspection:

```solidity
if (newStatus == Status.Inspected) {
    require(isInspected(productId), "No certified inspection");
}
```

This is optional and up to the lifecycle module. If it is added, any test that moves a product to `Inspected` must call `certifyInspection` first.

## Lifecycle demo (`scripts/demo-lifecycle.js`)

Walks one laptop through registration, transit, refurbishment (three repairs), inspection and sale. Along the way it shows five actions being rejected:

| Rejected action | Reason |
|---|---|
| Registering the same ID twice | `Product already registered` |
| An outsider taking the laptop | `Only the current custodian` |
| A Distributor recording a repair | `Caller has the wrong role` |
| The Refurbisher certifying its own work | `Caller has the wrong role` |
| Certifying the same report twice | `Report already certified` |

It then prints what a consumer sees (status, holder, repairs, inspections, and a check that an edited report fails), the full history rebuilt from events, and the gas used by each step.

Run it on its own (deploys a fresh contract in memory):

```bash
npx hardhat run scripts/demo-lifecycle.js
```

Or against the local node, so the QR page shows the result afterwards:

```bash
npm run node                                                   # terminal 1
npm run deploy:local                                           # writes deployed.json
npx hardhat run scripts/demo-lifecycle.js --network localhost
npm run verify-page                                            # then open the link the demo prints
```

Each product ID can be registered once per deployment, so to run it again on the same node pass a new ID: `PRODUCT_ID=LAPTOP-SN-002 npx hardhat run scripts/demo-lifecycle.js --network localhost`.

The demo assumes the current custodian calls `updateStatus` and that the status moves one step at a time.

### Gas (from the demo, local Hardhat network)

| Step | Gas |
|---|---|
| `addRepairRecord`, first repair on a product | ~166,000 |
| `addRepairRecord`, later repairs | ~104,000–149,000 (grows with description length) |
| `certifyInspection` | ~142,000 |

## Tests

`test/RepairInspection.test.js` (22 tests, 100% line and branch coverage of the module) runs the module through `contracts/mocks/RepairInspectionMock.sol`. The mock gets `registerProduct` and `getProduct` from `ProductRegistration`, adds `setCustodian` and `setStatus` to put a product in any state, and stubs `transferCustody` and `updateStatus`.

```bash
npx hardhat test test/RepairInspection.test.js
```
