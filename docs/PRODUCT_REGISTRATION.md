# Product registration

## The registration module (`contracts/ProductRegistration.sol`)

| Item | Behaviour |
|---|---|
| `registerProduct(productId, model)` | Manufacturer only ("Caller has the wrong role" otherwise). Rejects an empty ID ("Empty product ID") and a duplicate ID ("Product already registered"). The caller becomes `currentCustodian`, `status` is `Registered`, `exists` is true. Emits `ProductRegistered(productId, manufacturer)`. |
| `getProduct(productId)` | Public read. Returns the `Product` struct. Reverts with "Product not found" for an unknown ID. |

## Shared storage

All products live in one `internal` mapping, so the other modules can read and update them:

```solidity
mapping(bytes32 => Product) internal products;   // key = keccak256(bytes(productId))
```

| Helper | What it does |
|---|---|
| `_key(string memory)` | Returns `keccak256(bytes(productId))`, the mapping key. |
| `_load(string memory)` | Returns `Product storage` for the ID. Reverts with "Product not found" if it does not exist. |

## How the other modules use it

Inherit from `ProductRegistration` instead of `AccessControl` (it already inherits `AccessControl`, so `onlyRole` still works):

```solidity
abstract contract CustodyTransfer is ProductRegistration {
    function transferCustody(string calldata productId, address newCustodian) external {
        Product storage p = _load(productId);        // reverts if missing
        require(msg.sender == p.currentCustodian, "Not the custodian");
        p.currentCustodian = newCustodian;           // writes straight to storage
    }
}
```

`DeviceTrailImpl.sol` needs no change: Solidity merges the shared base automatically.

Rules for the other modules:

- Do not declare your own `products`, `_key` or `_load`, and do not implement `registerProduct` or `getProduct`.
- In a test mock, do not stub `registerProduct` or `getProduct` (they come from this module). Stub only the interface functions that neither your module nor this one implements.
- In tests, have the Manufacturer register a product first, otherwise every call reverts with "Product not found".

## Tests

`test/ProductRegistration.test.js` tests the module through `contracts/mocks/ProductRegistrationMock.sol`, a test-only contract with empty stubs for the functions that other modules implement.
