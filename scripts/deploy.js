// Deploys the DeviceTrail contract and assigns one IDeviceTrail.Role to each local test account.

const fs = require("fs");
const { ethers } = require("hardhat");

const Role = { Manufacturer: 1, Distributor: 2, Refurbisher: 3, Inspector: 4, Retailer: 5 };

async function main() {
  const [admin, manufacturer, distributor, refurbisher, inspector, retailer] = await ethers.getSigners();

  const trail = await (await ethers.getContractFactory("DeviceTrail")).deploy();
  await trail.waitForDeployment();

  const stakeholders = { manufacturer, distributor, refurbisher, inspector, retailer };
  for (const [name, signer] of Object.entries(stakeholders)) {
    const role = Role[name.charAt(0).toUpperCase() + name.slice(1)];
    await (await trail.assignRole(signer.address, role)).wait();
  }

  const accounts = { admin: admin.address };
  for (const [name, signer] of Object.entries(stakeholders)) accounts[name] = signer.address;
  const out = { contract: await trail.getAddress(), accounts };
  fs.writeFileSync("deployed.json", JSON.stringify(out, null, 2));

  console.log("DeviceTrail deployed to", out.contract);
  console.log(out.accounts);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
