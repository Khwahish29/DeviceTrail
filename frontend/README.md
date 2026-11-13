# DeviceTrail frontend

React + Vite + ethers v6. Connect a wallet, register devices (Manufacturer only) and look devices up (no wallet needed).

## Run

From the repo root:

1. Start the local chain (keep it running): `npm run node`
2. In a second terminal, deploy: `npm run deploy:local`
3. Copy the printed contract address (also in `deployed.json`) into `CONTRACT_ADDRESS` in `frontend/src/config.js`.
4. In MetaMask, add the network: RPC URL `http://127.0.0.1:8545`, chain id `31337`.
5. Import the Manufacturer test account (account #1 in the `npm run node` output) using its private key.
6. Start the app:

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## Notes

- If you restart `npm run node`, redeploy and update the address. MetaMask may also need Settings > Advanced > "Clear activity tab data" to reset its nonce.
- The Look Up form talks straight to `http://127.0.0.1:8545`, so it works without MetaMask.
