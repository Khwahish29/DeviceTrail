/**
 * DeviceTrail full lifecycle demo.
 *
 * Deploys the combined DeviceTrail contract to the local Hardhat network
 * and walks one laptop through:
 *   registration -> transit -> refurbishment -> inspection -> sale
 *
 * It also shows the three protections from the proposal:
 *   - duplicate registration is rejected
 *   - unauthorized repair is rejected
 *   - invalid custody transfer is rejected
 *
 * Gas used by each transaction is printed for the gas report.
 *
 * Run (deploys its own fresh contract, no node needed):
 *   npx hardhat run scripts/demo-lifecycle.js
 *
 * Optional: start the report backend first (`npm run backend`) and the
 * inspection report is stored there. Without it, the report is hashed
 * locally with the same sha256 the backend uses, so the hash is identical.
 *
 * Assumptions about the other modules (adjust here if they differ):
 *   - The deployer is the admin and can call assignRole.
 *   - The current custodian calls updateStatus.
 *   - Status moves one step at a time: Registered -> InTransit ->
 *     Refurbishing -> Inspected -> AvailableForSale -> Sold.
 *   - certifyInspection does not change the status; the refurbisher then
 *     sets Inspected with updateStatus.
 */
const hre = require("hardhat");
const { ethers } = hre;

const Role = { None: 0, Manufacturer: 1, Distributor: 2, Refurbisher: 3, Inspector: 4, Retailer: 5 };
const Status = { Registered: 0, InTransit: 1, Refurbishing: 2, Inspected: 3, AvailableForSale: 4, Sold: 5 };
const StatusName = Object.keys(Status);

const BACKEND = process.env.BACKEND_URL || "http://localhost:3001";
const PRODUCT_ID = "LAPTOP-SN-2026-0001";
const MODEL = "ThinkPad X1 Carbon Gen 11";

const gasLog = [];

async function send(label, txPromise) {
  const tx = await txPromise;
  const receipt = await tx.wait();
  gasLog.push({ step: label, gasUsed: Number(receipt.gasUsed) });
  console.log(`  ✓ ${label}  (gas: ${receipt.gasUsed})`);
  return receipt;
}

async function expectRevert(label, txPromise, contract) {
  try {
    const tx = await txPromise;
    await tx.wait();
  } catch (err) {
    let reason = err.shortMessage || err.message;
    const data = err.data || err.error?.data;
    if (data && contract) {
      try {
        const parsed = contract.interface.parseError(data);
        if (parsed) reason = parsed.name === "Error" ? parsed.args[0] : parsed.name;
      } catch (_) {
        /* not a custom error from this contract */
      }
    }
    console.log(`  ✗ ${label}  -> rejected (${reason})`);
    return;
  }
  throw new Error(`Expected "${label}" to be rejected, but it succeeded`);
}

// Stores the report on the backend if it is running; otherwise hashes it locally.
// Both give sha256(report) as a bytes32 (see backend/storage.js).
async function storeReport(report) {
  const localHash = ethers.sha256(ethers.toUtf8Bytes(report));
  try {
    const res = await fetch(`${BACKEND}/reports`, { method: "POST", body: report });
    if (res.ok) {
      const { reportHash } = await res.json();
      console.log(`  Report stored on backend ${BACKEND}`);
      return reportHash;
    }
  } catch (_) {
    /* backend not running */
  }
  console.log("  Backend not running; hashed the report locally (same sha256)");
  return localHash;
}

function short(addr) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

async function main() {
  // Same signer order as scripts/deploy.js; outsider has no role.
  const [admin, manufacturer, distributor, refurbisher, inspector, retailer, outsider] =
    await ethers.getSigners();

  const names = new Map([
    [admin.address, "Admin"],
    [manufacturer.address, "Manufacturer"],
    [distributor.address, "Distributor"],
    [refurbisher.address, "Refurbisher"],
    [inspector.address, "Inspector"],
    [retailer.address, "Retailer"],
    [outsider.address, "Outsider"],
  ]);
  const who = (addr) => `${names.get(addr) || "?"} (${short(addr)})`;

  console.log("\n=== 1. Deploy ===");
  const DeviceTrail = await ethers.getContractFactory("DeviceTrail");
  const trail = await DeviceTrail.deploy();
  await trail.waitForDeployment();
  const deployReceipt = await trail.deploymentTransaction().wait();
  gasLog.push({ step: "Deploy DeviceTrail", gasUsed: Number(deployReceipt.gasUsed) });
  console.log(`  DeviceTrail deployed at ${await trail.getAddress()} (gas: ${deployReceipt.gasUsed})`);

  console.log("\n=== 2. Assign roles ===");
  await send("Manufacturer role", trail.connect(admin).assignRole(manufacturer.address, Role.Manufacturer));
  await send("Distributor role", trail.connect(admin).assignRole(distributor.address, Role.Distributor));
  await send("Refurbisher role", trail.connect(admin).assignRole(refurbisher.address, Role.Refurbisher));
  await send("Inspector role", trail.connect(admin).assignRole(inspector.address, Role.Inspector));
  await send("Retailer role", trail.connect(admin).assignRole(retailer.address, Role.Retailer));

  console.log("\n=== 3. Register device ===");
  await send(
    `Register ${PRODUCT_ID}`,
    trail.connect(manufacturer).registerProduct(PRODUCT_ID, MODEL)
  );
  await expectRevert(
    "Duplicate registration of the same ID",
    trail.connect(manufacturer).registerProduct(PRODUCT_ID, MODEL),
    trail
  );

  console.log("\n=== 4. Ship to distributor, then refurbisher ===");
  await send("Status -> InTransit", trail.connect(manufacturer).updateStatus(PRODUCT_ID, Status.InTransit));
  await send("Custody Manufacturer -> Distributor", trail.connect(manufacturer).transferCustody(PRODUCT_ID, distributor.address));
  await expectRevert(
    "Outsider (not custodian) tries to take custody",
    trail.connect(outsider).transferCustody(PRODUCT_ID, outsider.address),
    trail
  );
  await send("Custody Distributor -> Refurbisher", trail.connect(distributor).transferCustody(PRODUCT_ID, refurbisher.address));

  console.log("\n=== 5. Refurbish ===");
  await send("Status -> Refurbishing", trail.connect(refurbisher).updateStatus(PRODUCT_ID, Status.Refurbishing));
  await expectRevert(
    "Distributor (not a refurbisher) adds a repair",
    trail.connect(distributor).addRepairRecord(PRODUCT_ID, "Fake repair"),
    trail
  );
  await send("Repair: replaced battery", trail.connect(refurbisher).addRepairRecord(PRODUCT_ID, "Replaced battery (original part, 57Wh)"));
  await send("Repair: replaced keyboard", trail.connect(refurbisher).addRepairRecord(PRODUCT_ID, "Replaced keyboard (US layout)"));
  await send("Repair: SSD wipe + reimage", trail.connect(refurbisher).addRepairRecord(PRODUCT_ID, "Secure-erased SSD and reinstalled OS"));

  console.log("\n=== 6. Inspect ===");
  // The full report stays off-chain; only its sha256 goes on-chain.
  const report = JSON.stringify({
    productId: PRODUCT_ID,
    grade: "A",
    battery: "98%",
    notes: "All ports and keys functional",
    inspectedOn: "2026-11-13",
  });
  const reportHash = await storeReport(report);
  console.log(`  Report hash: ${reportHash}`);
  await expectRevert(
    "Refurbisher (not an inspector) certifies inspection",
    trail.connect(refurbisher).certifyInspection(PRODUCT_ID, reportHash),
    trail
  );
  await send("Certify inspection", trail.connect(inspector).certifyInspection(PRODUCT_ID, reportHash));
  await expectRevert(
    "Same report reused for a second certification",
    trail.connect(inspector).certifyInspection(PRODUCT_ID, reportHash),
    trail
  );
  await send("Status -> Inspected", trail.connect(refurbisher).updateStatus(PRODUCT_ID, Status.Inspected));

  console.log("\n=== 7. Sell ===");
  await send("Custody Refurbisher -> Retailer", trail.connect(refurbisher).transferCustody(PRODUCT_ID, retailer.address));
  await send("Status -> AvailableForSale", trail.connect(retailer).updateStatus(PRODUCT_ID, Status.AvailableForSale));
  await send("Status -> Sold", trail.connect(retailer).updateStatus(PRODUCT_ID, Status.Sold));

  console.log("\n=== 8. Consumer view (what the QR page shows) ===");
  const product = await trail.getProduct(PRODUCT_ID);
  console.log(`  Product ID : ${product.productId}`);
  console.log(`  Model      : ${product.model}`);
  console.log(`  Custodian  : ${who(product.currentCustodian)}`);
  console.log(`  Status     : ${StatusName[Number(product.status)]}`);

  console.log("  Repairs:");
  for (const r of await trail.getRepairHistory(PRODUCT_ID)) {
    const when = new Date(Number(r.timestamp) * 1000).toISOString();
    console.log(`    - ${r.description}  by ${who(r.refurbisher)} at ${when}`);
  }

  console.log("  Inspections:");
  for (const i of await trail.getInspections(PRODUCT_ID)) {
    const when = new Date(Number(i.timestamp) * 1000).toISOString();
    console.log(`    - report ${i.reportHash}  by ${who(i.inspector)} at ${when}`);
  }

  const tampered = ethers.sha256(ethers.toUtf8Bytes(report.replace('"A"', '"A+"')));
  console.log(`  Genuine report verifies : ${await trail.verifyInspectionReport(PRODUCT_ID, reportHash)}`);
  console.log(`  Tampered report verifies: ${await trail.verifyInspectionReport(PRODUCT_ID, tampered)}`);

  console.log("\n=== 9. Full event history ===");
  const events = [
    "ProductRegistered",
    "CustodyTransferred",
    "StatusUpdated",
    "RepairRecorded",
    "InspectionCertified",
  ];
  const logs = [];
  for (const name of events) {
    for (const e of await trail.queryFilter(trail.filters[name]())) {
      if (e.args[0] !== PRODUCT_ID) continue;
      logs.push({ block: e.blockNumber, index: e.index, name, args: e.args });
    }
  }
  logs.sort((a, b) => a.block - b.block || a.index - b.index);
  for (const l of logs) {
    let detail;
    switch (l.name) {
      case "ProductRegistered":
        detail = `by ${who(l.args[1])}`;
        break;
      case "CustodyTransferred":
        detail = `${who(l.args[1])} -> ${who(l.args[2])}`;
        break;
      case "StatusUpdated":
        detail = StatusName[Number(l.args[1])];
        break;
      case "RepairRecorded":
        detail = l.args[1];
        break;
      case "InspectionCertified":
        detail = `by ${who(l.args[1])}, hash ${l.args[2].slice(0, 10)}…`;
        break;
    }
    console.log(`  [block ${l.block}] ${l.name}: ${detail}`);
  }

  console.log("\n=== Gas summary ===");
  console.table(gasLog);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
