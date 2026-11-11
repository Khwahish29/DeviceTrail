// Checks that scripts/deploy.js deploys the contract and gives every stakeholder the right role.

const { expect } = require("chai");
const fs = require("fs");
const hre = require("hardhat");

const Role = { None: 0, Manufacturer: 1, Distributor: 2, Refurbisher: 3, Inspector: 4, Retailer: 5 };
const EXPECTED = {
  manufacturer: Role.Manufacturer,
  distributor: Role.Distributor,
  refurbisher: Role.Refurbisher,
  inspector: Role.Inspector,
  retailer: Role.Retailer,
  admin: Role.None,
};

describe("deploy script", function () {
  let deployed, trail;

  before(async () => {
    await require("../scripts/deploy.js").deploy();
    deployed = JSON.parse(fs.readFileSync("deployed.json"));
    trail = await hre.ethers.getContractAt("DeviceTrail", deployed.contract);
  });

  after(() => fs.rmSync("deployed.json", { force: true }));

  it("writes the contract address and six accounts to deployed.json", () => {
    expect(deployed.contract).to.match(/^0x[0-9a-fA-F]{40}$/);
    expect(Object.keys(deployed.accounts)).to.have.members(Object.keys(EXPECTED));
  });

  it("uses a different account for every stakeholder", () => {
    const addresses = Object.values(deployed.accounts);
    expect(new Set(addresses).size).to.equal(addresses.length);
  });

  for (const [name, role] of Object.entries(EXPECTED)) {
    it(`gives ${name} the expected role`, async () => {
      expect(await trail.getRole(deployed.accounts[name])).to.equal(role);
    });
  }
});
