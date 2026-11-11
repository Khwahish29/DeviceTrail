// Prints a product's current state and its full history rebuilt from contract events.

const fs = require("fs");
const { ethers } = require("hardhat");

const STATUS = ["Registered", "InTransit", "Refurbishing", "Inspected", "AvailableForSale", "Sold"];
const EVENTS = ["ProductRegistered", "CustodyTransferred", "RepairRecorded", "StatusUpdated", "InspectionCertified"];

async function main() {
  const productId = process.env.PRODUCT_ID || "LAPTOP-SN-001";
  const { contract } = JSON.parse(fs.readFileSync("deployed.json"));
  const trail = await ethers.getContractAt("DeviceTrail", contract);

  const p = await trail.getProduct(productId);
  console.log(`Product ${p.productId} (${p.model})`);
  console.log(`  status:    ${STATUS[Number(p.status)]}`);
  console.log(`  custodian: ${p.currentCustodian}\n`);

  const rows = [];
  for (const name of EVENTS) {
    for (const e of await trail.queryFilter(trail.filters[name]())) {
      if (e.args.productId === productId) rows.push({ name, e });
    }
  }
  rows.sort((a, b) => a.e.blockNumber - b.e.blockNumber || a.e.index - b.e.index);

  console.log("History:");
  for (const { name, e } of rows) {
    const details = e.args.toObject ? JSON.stringify(e.args.toObject(), (_, v) => (typeof v === "bigint" ? v.toString() : v)) : "";
    console.log(`  block ${e.blockNumber}  ${name}  ${details}`);
  }
}

main().catch((e) => {
  console.error(e.reason || e.message);
  process.exit(1);
});
