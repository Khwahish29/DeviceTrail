// Full lifecycle demo: one laptop from registration to sale.
//
//   registration -> transit -> refurbishment (repairs) -> inspection -> sale
//
// Also shows the protections from the proposal being enforced:
// duplicate registration, unauthorized repair, invalid custody transfer,
// wrong-role inspection, and reuse of an inspection report.
//
// Run it on its own (deploys a fresh contract in memory):
//   npx hardhat run scripts/demo-lifecycle.js
//
// Or against the local node, so the QR page can show the result afterwards:
//   npm run node                                              # terminal 1
//   npm run deploy:local                                      # writes deployed.json
//   npx hardhat run scripts/demo-lifecycle.js --network localhost
//   (use PRODUCT_ID=... to run it again with a new device)
//
// Assumes the current custodian calls updateStatus and the status moves one step at a time.

const fs = require("fs");
const hre = require("hardhat");
const { ethers } = hre;

const Role = { None: 0, Manufacturer: 1, Distributor: 2, Refurbisher: 3, Inspector: 4, Retailer: 5 };
const Status = { Registered: 0, InTransit: 1, Refurbishing: 2, Inspected: 3, AvailableForSale: 4, Sold: 5 };
const STATUS = Object.keys(Status);

const PRODUCT_ID = process.env.PRODUCT_ID || "LAPTOP-SN-001";
const MODEL = "ThinkPad X1 Carbon Gen 11";

const gasLog = [];

async function ok(label, txPromise) {
  const receipt = await (await txPromise).wait();
  gasLog.push({ step: label, gas: Number(receipt.gasUsed) });
  console.log(`  OK        ${label}`);
}

async function rejected(label, txPromise) {
  try {
    await (await txPromise).wait();
  } catch (e) {
    const text = e.reason || e.shortMessage || e.message;
    const reason = (text.match(/reason string '([^']*)'/) || [])[1] || text;
    console.log(`  REJECTED  ${label}  ->  "${reason}"`);
    return;
  }
  throw new Error(`"${label}" should have been rejected but succeeded`);
}

// Same signer order as scripts/deploy.js; index 6 has no role.
async function getContract(signers) {
  if (hre.network.name === "hardhat") {
    const trail = await (await ethers.getContractFactory("DeviceTrail")).deploy();
    await trail.waitForDeployment();
    const [, manufacturer, distributor, refurbisher, inspector, retailer] = signers;
    const roles = [
      [manufacturer, Role.Manufacturer],
      [distributor, Role.Distributor],
      [refurbisher, Role.Refurbisher],
      [inspector, Role.Inspector],
      [retailer, Role.Retailer],
    ];
    for (const [signer, role] of roles) await (await trail.assignRole(signer.address, role)).wait();
    console.log(`Deployed a fresh DeviceTrail at ${await trail.getAddress()} and assigned roles`);
    return trail;
  }
  if (!fs.existsSync("deployed.json")) {
    throw new Error("deployed.json not found. Run `npm run deploy:local` first.");
  }
  const { contract } = JSON.parse(fs.readFileSync("deployed.json"));
  console.log(`Using DeviceTrail at ${contract} from deployed.json`);
  return ethers.getContractAt("DeviceTrail", contract);
}

async function main() {
  const signers = await ethers.getSigners();
  const [admin, manufacturer, distributor, refurbisher, inspector, retailer, outsider] = signers;
  const trail = await getContract(signers);
  const as = (signer) => trail.connect(signer);

  const names = new Map(
    Object.entries({ admin, manufacturer, distributor, refurbisher, inspector, retailer, outsider }).map(
      ([name, s]) => [s.address, name[0].toUpperCase() + name.slice(1)]
    )
  );
  const who = (addr) => names.get(addr) || addr;

  const existing = await trail.getProduct(PRODUCT_ID).catch(() => null);
  if (existing) {
    throw new Error(`${PRODUCT_ID} is already registered on this contract. Run again with PRODUCT_ID=<new id>.`);
  }

  console.log(`\nLifecycle of ${PRODUCT_ID} (${MODEL})`);

  console.log("\n1. Registration");
  await ok("Manufacturer registers the laptop", as(manufacturer).registerProduct(PRODUCT_ID, MODEL));
  await rejected("Manufacturer registers the same ID again", as(manufacturer).registerProduct(PRODUCT_ID, MODEL));

  console.log("\n2. Shipping to the refurbisher");
  await ok("Manufacturer sets status InTransit", as(manufacturer).updateStatus(PRODUCT_ID, Status.InTransit));
  await ok("Manufacturer hands it to the Distributor", as(manufacturer).transferCustody(PRODUCT_ID, distributor.address));
  await rejected("Outsider tries to take the laptop", as(outsider).transferCustody(PRODUCT_ID, outsider.address));
  await ok("Distributor hands it to the Refurbisher", as(distributor).transferCustody(PRODUCT_ID, refurbisher.address));

  console.log("\n3. Refurbishment");
  await ok("Refurbisher sets status Refurbishing", as(refurbisher).updateStatus(PRODUCT_ID, Status.Refurbishing));
  await rejected("Distributor records a fake repair", as(distributor).addRepairRecord(PRODUCT_ID, "Fake repair"));
  await ok("Refurbisher: replaced battery", as(refurbisher).addRepairRecord(PRODUCT_ID, "Replaced battery (57Wh, original part)"));
  await ok("Refurbisher: replaced keyboard", as(refurbisher).addRepairRecord(PRODUCT_ID, "Replaced keyboard (US layout)"));
  await ok("Refurbisher: wiped and reinstalled", as(refurbisher).addRepairRecord(PRODUCT_ID, "Secure-erased SSD and reinstalled OS"));

  console.log("\n4. Inspection");
  // The report stays off-chain; only its sha256 goes on-chain.
  const report = `DeviceTrail inspection report
Product: ${PRODUCT_ID}
Grade: A
Battery health: 98%
All ports and keys working`;
  const reportHash = ethers.sha256(ethers.toUtf8Bytes(report));
  console.log(`  Report hash (sha256): ${reportHash}`);
  await rejected("Refurbisher certifies its own work", as(refurbisher).certifyInspection(PRODUCT_ID, reportHash));
  await ok("Inspector certifies the report", as(inspector).certifyInspection(PRODUCT_ID, reportHash));
  await rejected("Inspector reuses the same report", as(inspector).certifyInspection(PRODUCT_ID, reportHash));
  await ok("Refurbisher sets status Inspected", as(refurbisher).updateStatus(PRODUCT_ID, Status.Inspected));

  console.log("\n5. Sale");
  await ok("Refurbisher hands it to the Retailer", as(refurbisher).transferCustody(PRODUCT_ID, retailer.address));
  await ok("Retailer sets status AvailableForSale", as(retailer).updateStatus(PRODUCT_ID, Status.AvailableForSale));
  await ok("Retailer sets status Sold", as(retailer).updateStatus(PRODUCT_ID, Status.Sold));

  console.log("\n6. What a consumer sees");
  const p = await trail.getProduct(PRODUCT_ID);
  console.log(`  ${p.productId}  ${p.model}`);
  console.log(`  Status: ${STATUS[Number(p.status)]}   Held by: ${who(p.currentCustodian)}`);
  console.log("  Repairs:");
  for (const r of await trail.getRepairHistory(PRODUCT_ID)) {
    console.log(`    - ${r.description} (by ${who(r.refurbisher)})`);
  }
  console.log("  Inspections:");
  for (const i of await trail.getInspections(PRODUCT_ID)) {
    console.log(`    - report ${i.reportHash} (by ${who(i.inspector)})`);
  }
  const tampered = ethers.sha256(ethers.toUtf8Bytes(report.replace("Grade: A", "Grade: A+")));
  console.log(`  Genuine report matches the chain:  ${await trail.verifyInspectionReport(PRODUCT_ID, reportHash)}`);
  console.log(`  Edited report matches the chain:   ${await trail.verifyInspectionReport(PRODUCT_ID, tampered)}`);

  console.log("\n7. History rebuilt from events");
  const rows = [];
  for (const name of ["ProductRegistered", "CustodyTransferred", "StatusUpdated", "RepairRecorded", "InspectionCertified"]) {
    for (const e of await trail.queryFilter(trail.filters[name]())) {
      if (e.args.productId === PRODUCT_ID) rows.push({ name, e });
    }
  }
  rows.sort((a, b) => a.e.blockNumber - b.e.blockNumber || a.e.index - b.e.index);
  for (const { name, e } of rows) {
    const a = e.args;
    const detail = {
      ProductRegistered: () => `by ${who(a.manufacturer)}`,
      CustodyTransferred: () => `${who(a.from)} -> ${who(a.to)}`,
      StatusUpdated: () => STATUS[Number(a.newStatus)],
      RepairRecorded: () => a.repairDescription,
      InspectionCertified: () => `by ${who(a.inspector)}`,
    }[name]();
    console.log(`  block ${String(e.blockNumber).padStart(3)}  ${name.padEnd(20)} ${detail}`);
  }

  console.log("\n8. Gas used");
  console.table(gasLog);

  if (hre.network.name !== "hardhat") {
    console.log(`\nOpen the QR page for this device: http://localhost:8080/verify.html?productId=${PRODUCT_ID}`);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exitCode = 1;
});
