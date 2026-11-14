# Custody transfer and QR verification

## The custody module (`contracts/CustodyTransfer.sol`)

`abstract contract CustodyTransfer is ProductRegistration`, inherited by the final `DeviceTrail` contract. It builds on the registration module (which builds on `AccessControl`), so it can use `getRole` and the shared product storage.

`transferCustody(productId, newCustodian)` moves a product to the next stakeholder and emits `CustodyTransferred(productId, from, to)`. It reverts with:

| Revert reason | When |
|---|---|
| `Product not found` | No product with that ID |
| `Only the current custodian` | Caller does not hold the product (this includes the admin) |
| `Caller has no role` | Caller holds the product but their role was removed |
| `Zero address` | `newCustodian` is `address(0)` |
| `Already the custodian` | Transfer to yourself |
| `Recipient has no role` | `newCustodian` has `Role.None` |

Any role can receive a product. This module does not check the lifecycle status.

### How it reads and updates products

Products live in the registration module's shared storage (`docs/PRODUCT_REGISTRATION.md`). The module loads the product with `_load(productId)`, which reverts with `Product not found` for an unknown ID, and writes the new holder straight to `currentCustodian` in storage.

### Tests

`test/CustodyTransfer.test.js` (12 tests) runs the module through `contracts/mocks/CustodyTransferMock.sol`, a test-only contract that stubs only the functions no module implements yet. Each test registers its device through the Manufacturer with `registerProduct` first.

## QR codes (`qr/generate.js`)

```bash
npm run qr -- LAPTOP-SN-001
```

Writes `qr/samples/LAPTOP-SN-001.png`, which encodes `http://localhost:8080/verify.html?productId=LAPTOP-SN-001`. Product IDs may use letters, digits, `.`, `_` and `-` (1-64 characters).

To scan with a phone on the same Wi-Fi, encode your computer's LAN address instead:

```bash
npm run qr -- LAPTOP-SN-001 --base http://192.168.1.20:8080/verify.html
```

Tests: `npm run test:qr`.

## Read-only consumer page (`qr/verify.html`)

Shows a device's model, status, current holder (with role), and full history built from the contract's events. It needs no wallet and loads ethers.js from a CDN.

```bash
npm run node             # terminal 1: local blockchain
npm run deploy:local     # writes deployed.json
npm run verify-page      # terminal 2: serves http://localhost:8080/verify.html
```

The page reads the contract address from `/deployed.json` and talks to the node at `http://<page host>:8545`. Both can be overridden in the URL: `?contract=0x...&rpc=http://...`.

For a phone, serve the page with `HOST=0.0.0.0 npm run verify-page` and start the node with `npx hardhat node --hostname 0.0.0.0`.
