# Local deployment

How to compile the contracts, start a local chain and deploy DeviceTrail with roles assigned.

## Steps

```bash
npm install
npm run compile
npm run node            # terminal 1: local chain with funded test accounts
npm run deploy:local    # terminal 2: deploy and assign roles
```

`npm test` runs the Hardhat tests on the in-memory network, so the local chain does not need to be running for tests.

## What the deploy script does

1. Deploys the `DeviceTrail` contract. The account that deploys it becomes the admin.
2. Assigns one role to each of the next five local accounts, in this order:

| Account | Role |
|---|---|
| 0 | admin (no role) |
| 1 | Manufacturer |
| 2 | Distributor |
| 3 | Refurbisher |
| 4 | Inspector |
| 5 | Retailer |

3. Writes `deployed.json` with the contract address and the address of every account above, so other scripts and the frontend can load them.

`deployed.json` is created on every deploy and is ignored by git.

## Common problems

| Problem | Fix |
|---|---|
| `HH700: Artifact for contract "DeviceTrail" not found` | The module contracts imported by `contracts/DeviceTrailImpl.sol` are missing or do not compile yet. |
| `ECONNREFUSED 127.0.0.1:8545` | `npm run node` is not running. |
| Roles fail with "Only admin" | The deploy was run from an account other than the first one. |
