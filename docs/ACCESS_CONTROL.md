# Access control and the final contract

## Roles

The roles are the `Role` enum in `IDeviceTrail`: None, Manufacturer, Distributor, Refurbisher, Inspector, Retailer. An address that was never assigned a role is `None` and cannot use any restricted function.

## The roles module (`contracts/AccessControl.sol`)

| Item | Behaviour |
|---|---|
| `admin` | Set to the deployer in the constructor. |
| `assignRole(address, Role)` | Admin only. Rejects the zero address. Emits `RoleAssigned`. Assigning `None` removes a role. |
| `getRole(address)` | Public read of one address's role. |
| `onlyAdmin` | Modifier: reverts with "Only admin". |
| `onlyRole(Role)` | Modifier: reverts with "Caller has the wrong role" unless the caller has exactly that role. |

## How the other modules use it

The other modules can use the `onlyRole` modifier from the roles module to restrict their functions to one role.

For the real product registration module and its shared storage, see `docs/PRODUCT_REGISTRATION.md`.

## The final contract (`contracts/DeviceTrailImpl.sol`)

`DeviceTrail` is the one contract that gets deployed. It only combines the modules, so it needs these files to exist, each declared as `abstract contract <Name> is AccessControl`:

- `contracts/ProductRegistration.sol`
- `contracts/CustodyTransfer.sol`
- `contracts/LifecycleStatus.sol`
- `contracts/RepairInspection.sol`

Between them the modules must implement every function of `IDeviceTrail` that the roles module does not already implement. Nothing needs changing in the final contract when a module's body changes.

## Tests

`test/AccessControl.test.js` tests the roles module through `contracts/mocks/AccessControlMock.sol`, a test-only contract with empty stubs for the other functions.
