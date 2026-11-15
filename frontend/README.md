# DeviceTrail frontend

React + Vite + ethers v6. Three pages:

- **Home** (`#/`): check a device by ID, with a sample report that shows what a real one contains.
- **Device report** (`#/device/<id>`): status, journey, who holds it, repairs, inspections, a check for an inspection report file, and the full history. Works without a wallet. Print or save as PDF from the page.
- **For manufacturers** (`#/partners`): sign in with a wallet and register devices (Manufacturer role only).
- **Live demo** (`#/demo`): walks one laptop through the whole workflow for a presentation. See "Live demo" below.

## Run

From the repo root:

1. Start the local chain (keep it running): `npm run node`
2. In a second terminal, deploy: `npm run deploy:local`
3. `CONTRACT_ADDRESS` in `frontend/src/config.js` already holds the address from the first deploy on a freshly started node. If you restarted the node or deployed more than once, copy the address that `npm run deploy:local` printed (also in `deployed.json`) into `config.js`.
4. Optional, to see a full history right away: `npx hardhat run scripts/demo-lifecycle.js --network localhost` registers `LAPTOP-SN-001` and takes it from registration to sale.
5. Start the app:

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints. The default is http://localhost:5173, but Vite picks another port if that one is busy, so check what it prints.

To register devices (the partner page), set up MetaMask:

1. Add the network: RPC URL `http://127.0.0.1:8545`, chain id `31337`.
2. Import the Manufacturer test account (account #1 in the `npm run node` output) using its private key.

## Live demo

Open `#/demo` (the "Live demo" link in the top bar). It walks one laptop from the factory to a buyer in 11 steps. Each step shows which company does it and which contract function it calls, and "Run as ..." sends it as that company's account. The buyer's report on the right updates after every step.

- **No wallet needed.** The local test chain's accounts can sign for themselves, so the page sends each call as the right account (Manufacturer, Distributor, Refurbisher, Inspector, Retailer). This only works on the local `npm run node` chain after `npm run deploy:local`; the page says so if the setup is missing.
- **Try to break the rules** has buttons that attempt forbidden actions (same ID twice, an outsider taking the device, a wrong-role repair, skipping a stage, certifying without an inspection, reusing a report). The contract refuses each one and the log shows its message.
- **Report files.** After the inspection step, download the genuine report and an edited copy, then use them in the report's "Check a report" box to show a match and a mismatch.
- **Run all remaining steps** plays the rest automatically, as a backup if time is short.
- **New device** starts again with a fresh ID. The page works out the next step from the chain, so typing an existing ID resumes where it left off.

## QR codes

**On the site.** Every device report has a "Share this report" section with a QR code, the link it opens, a Copy button and a "Download QR code" button (the file is named `<device id>.png`, like Meet's samples). The QR code also prints with the report, so a printout can serve as a label. The link looks like `http://localhost:5173/?productId=LAPTOP-SN-001`, the same format Meet's generator writes, and the site sends it to `#/device/LAPTOP-SN-001`. Only IDs made of letters, digits, `.`, `_` and `-` (up to 64 characters) can have a QR code.

**From the command line.** From the repo root, Meet's generator makes the same kind of QR code:

```bash
npm run qr -- LAPTOP-SN-001 --base http://localhost:5173/
```

The base URL must match the address and port Vite is really using. If Vite printed another port (for example 5174), use `--base http://localhost:5174/`. Links with `?id=` work too.

Meet's standalone page still works as well: `npm run verify-page`, then open http://localhost:8080/verify.html.

**Scanning with a phone.** A QR code that says `localhost` only works on the computer that made it. Open the site using your computer's address on the Wi-Fi (for example `http://192.168.1.20:5173/`), start Vite with `npm run dev -- --host`, and start the node with `npx hardhat node --hostname 0.0.0.0`. The site reads from the node on the same host as the page it was opened from. QR codes made from that address then open on the phone.

## Notes

- If you restart `npm run node`, redeploy. MetaMask may also need Settings > Advanced > "Clear activity tab data" to reset its nonce.
- Reports are read straight from the local node, so they work without MetaMask.
- The "Check a report" step reads the chosen file in your browser and never uploads it. It compares the file's SHA-256 with the recorded inspections (see `docs/REPAIR_INSPECTION.md`).
- Developer details (network, contract address, last error, last transaction) are in the collapsed "Technical details" panel in the footer.
