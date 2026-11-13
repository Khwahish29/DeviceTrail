const { expect } = require("chai");
const { ethers } = require("hardhat");

const Role = { None: 0, Manufacturer: 1, Distributor: 2, Refurbisher: 3, Inspector: 4, Retailer: 5 };
const Status = { Registered: 0 };

describe("ProductRegistration", function () {
  let mock, admin, maker, retailer, nobody;

  beforeEach(async function () {
    [admin, maker, retailer, nobody] = await ethers.getSigners();
    mock = await (await ethers.getContractFactory("ProductRegistrationMock")).deploy();
    await mock.assignRole(maker.address, Role.Manufacturer);
    await mock.assignRole(retailer.address, Role.Retailer);
  });

  it("lets a Manufacturer register and emits ProductRegistered", async function () {
    await expect(mock.connect(maker).registerProduct("P1", "Phone X"))
      .to.emit(mock, "ProductRegistered")
      .withArgs("P1", maker.address);
  });

  it("stores model, custodian, status and exists", async function () {
    await mock.connect(maker).registerProduct("P1", "Phone X");
    const p = await mock.getProduct("P1");
    expect(p.productId).to.equal("P1");
    expect(p.model).to.equal("Phone X");
    expect(p.currentCustodian).to.equal(maker.address);
    expect(p.status).to.equal(Status.Registered);
    expect(p.exists).to.equal(true);
  });

  it("rejects a Retailer, an account with no role, and the admin", async function () {
    for (const signer of [retailer, nobody, admin]) {
      await expect(mock.connect(signer).registerProduct("P1", "Phone X")).to.be.revertedWith(
        "Caller has the wrong role"
      );
    }
  });

  it("rejects a duplicate product ID", async function () {
    await mock.connect(maker).registerProduct("P1", "Phone X");
    await expect(mock.connect(maker).registerProduct("P1", "Other")).to.be.revertedWith(
      "Product already registered"
    );
  });

  it("rejects an empty product ID", async function () {
    await expect(mock.connect(maker).registerProduct("", "Phone X")).to.be.revertedWith("Empty product ID");
  });

  it("reverts getProduct for an unknown ID", async function () {
    await expect(mock.getProduct("nope")).to.be.revertedWith("Product not found");
  });

  it("lets two different products coexist", async function () {
    await mock.connect(maker).registerProduct("P1", "Phone X");
    await mock.connect(maker).registerProduct("P2", "Laptop Y");
    expect((await mock.getProduct("P1")).model).to.equal("Phone X");
    expect((await mock.getProduct("P2")).model).to.equal("Laptop Y");
  });
});
