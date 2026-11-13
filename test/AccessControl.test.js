const { expect } = require("chai");
const { ethers } = require("hardhat");

const Role = { None: 0, Manufacturer: 1, Distributor: 2, Refurbisher: 3, Inspector: 4, Retailer: 5 };

describe("AccessControl", function () {
  let mock, admin, alice, bob;

  beforeEach(async function () {
    [admin, alice, bob] = await ethers.getSigners();
    mock = await (await ethers.getContractFactory("AccessControlMock")).deploy();
  });

  it("makes the deployer the admin", async function () {
    expect(await mock.admin()).to.equal(admin.address);
  });

  it("returns Role.None for an address with no role", async function () {
    expect(await mock.getRole(alice.address)).to.equal(Role.None);
  });

  it("lets the admin assign a role and emits RoleAssigned", async function () {
    await expect(mock.assignRole(alice.address, Role.Manufacturer))
      .to.emit(mock, "RoleAssigned")
      .withArgs(alice.address, Role.Manufacturer);
    expect(await mock.getRole(alice.address)).to.equal(Role.Manufacturer);
  });

  it("lets the admin change or remove a role", async function () {
    await mock.assignRole(alice.address, Role.Inspector);
    await mock.assignRole(alice.address, Role.None);
    expect(await mock.getRole(alice.address)).to.equal(Role.None);
  });

  it("rejects role assignment from a non-admin", async function () {
    await expect(mock.connect(alice).assignRole(bob.address, Role.Retailer)).to.be.revertedWith("Only admin");
  });

  it("rejects the zero address", async function () {
    await expect(mock.assignRole(ethers.ZeroAddress, Role.Retailer)).to.be.revertedWith("Zero address");
  });

  it("onlyRole accepts the right role and rejects every other one", async function () {
    await mock.assignRole(alice.address, Role.Manufacturer);
    expect(await mock.connect(alice).manufacturerOnly()).to.equal(true);
    await expect(mock.connect(bob).manufacturerOnly()).to.be.revertedWith("Caller has the wrong role");
  });
});
