// End-to-end lifecycle demo against the deployed contract.

const fs = require("fs");
const { ethers } = require("hardhat");

const STATUS = ["Registered", "InTransit", "Refurbishing", "Inspected", "AvailableForSale", "Sold"];
const BACKEND = process.env.BACKEND_URL || "http://localhost:3001";
const PRODUCT_ID = "LAPTOP-SN-001";

async function step(label, fn) {
  try {
    const result = await fn();
    console.log(`  OK      ${label}`);
    return result;
  } catch (e) {
    const reason = e.reason || e.shortMessage || e.message;
    console.log(`  FAILED  ${label}  ->  ${reason}`);
    return null;
  }
}

async function show(trail) {
  const p = await trail.getProduct(PRODUCT_ID);
  console.log(`          state: status=${STATUS[Number(p.status)]}, custodian=${p.currentCustodian}`);
}

async function main() {
  const { contract } = JSON.parse(fs.readFileSync("deployed.json"));
  const [, manufacturer, , refurbisher, inspector, retailer] = await ethers.getSigners();
  const trail = await ethers.getContractAt("DeviceTrail", contract);
  const as = (signer) => trail.connect(signer);

  console.log(`Lifecycle demo for ${PRODUCT_ID}\n`);

  await step("manufacturer registers the product", async () =>
    (await as(manufacturer).registerProduct(PRODUCT_ID, "ThinkPad X1")).wait());
  await show(trail).catch(() => {});
  await step("duplicate registration is rejected", async () => {
    try {
      await as(manufacturer).registerProduct(PRODUCT_ID, "ThinkPad X1");
    } catch (e) {
      return;
    }
    throw new Error("duplicate was accepted");
  });

  await step("manufacturer sets status InTransit", async () =>
    (await as(manufacturer).updateStatus(PRODUCT_ID, 1)).wait());
  await step("manufacturer transfers custody to refurbisher", async () =>
    (await as(manufacturer).transferCustody(PRODUCT_ID, refurbisher.address)).wait());
  await step("refurbisher sets status Refurbishing", async () =>
    (await as(refurbisher).updateStatus(PRODUCT_ID, 2)).wait());
  await step("refurbisher records a repair", async () =>
    (await as(refurbisher).addRepairRecord(PRODUCT_ID, "Replaced battery and SSD")).wait());

  const reportHash = await step("upload inspection report to the backend", async () => {
    const res = await fetch(`${BACKEND}/reports`, { method: "POST", body: "Inspection passed: battery 98%, SSD healthy" });
    if (!res.ok) throw new Error(`backend returned ${res.status} (is 'npm run backend' running?)`);
    return (await res.json()).reportHash;
  });
  if (reportHash) {
    console.log(`          reportHash: ${reportHash}`);
    await step("inspector certifies the inspection with that hash", async () =>
      (await as(inspector).certifyInspection(PRODUCT_ID, reportHash)).wait());
  }
  await step("refurbisher sets status Inspected", async () =>
    (await as(refurbisher).updateStatus(PRODUCT_ID, 3)).wait());

  await step("refurbisher transfers custody to retailer", async () =>
    (await as(refurbisher).transferCustody(PRODUCT_ID, retailer.address)).wait());
  await step("retailer sets status AvailableForSale", async () =>
    (await as(retailer).updateStatus(PRODUCT_ID, 4)).wait());
  await show(trail).catch(() => {});

  console.log("\nHistory from events:");
  for (const name of ["ProductRegistered", "CustodyTransferred", "RepairRecorded", "StatusUpdated", "InspectionCertified"]) {
    const events = await trail.queryFilter(trail.filters[name]());
    console.log(`  ${name}: ${events.length}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
