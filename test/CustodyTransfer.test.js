const { expect } = require("chai");
const { ethers } = require("hardhat");

const Role = { None: 0, Manufacturer: 1, Distributor: 2, Refurbisher: 3, Inspector: 4, Retailer: 5 };
const ID = "LAPTOP-SN-001";

describe("CustodyTransfer", function () {
  let mock, admin, manufacturer, distributor, refurbisher, retailer, outsider;

  beforeEach(async function () {
    [admin, manufacturer, distributor, refurbisher, retailer, outsider] = await ethers.getSigners();
    mock = await (await ethers.getContractFactory("CustodyTransferMock")).deploy();
    await mock.assignRole(manufacturer.address, Role.Manufacturer);
    await mock.assignRole(distributor.address, Role.Distributor);
    await mock.assignRole(refurbisher.address, Role.Refurbisher);
    await mock.assignRole(retailer.address, Role.Retailer);
    // Registered through the real registration module, so the manufacturer is the first custodian.
    await mock.connect(manufacturer).registerProduct(ID, "ThinkPad X1");
  });

  const custodian = async () => (await mock.getProduct(ID)).currentCustodian;

  describe("valid transfers", function () {
    it("moves custody and emits CustodyTransferred", async function () {
      await expect(mock.connect(manufacturer).transferCustody(ID, distributor.address))
        .to.emit(mock, "CustodyTransferred")
        .withArgs(ID, manufacturer.address, distributor.address);
      expect(await custodian()).to.equal(distributor.address);
    });

    it("lets the new custodian pass it on along the supply chain", async function () {
      await mock.connect(manufacturer).transferCustody(ID, distributor.address);
      await mock.connect(distributor).transferCustody(ID, refurbisher.address);
      await mock.connect(refurbisher).transferCustody(ID, retailer.address);
      expect(await custodian()).to.equal(retailer.address);

      const events = await mock.queryFilter(mock.filters.CustodyTransferred());
      expect(events.map((e) => [e.args.from, e.args.to])).to.deep.equal([
        [manufacturer.address, distributor.address],
        [distributor.address, refurbisher.address],
        [refurbisher.address, retailer.address],
      ]);
    });

    it("allows sending to any stakeholder role, including back to an earlier holder", async function () {
      await mock.connect(manufacturer).transferCustody(ID, refurbisher.address);
      await mock.connect(refurbisher).transferCustody(ID, manufacturer.address);
      expect(await custodian()).to.equal(manufacturer.address);
    });

    it("only changes the product that was transferred", async function () {
      await mock.connect(manufacturer).registerProduct("PHONE-SN-002", "Pixel 8");
      await mock.connect(manufacturer).transferCustody(ID, distributor.address);
      expect((await mock.getProduct("PHONE-SN-002")).currentCustodian).to.equal(manufacturer.address);
    });
  });

  describe("rejected transfers", function () {
    it("rejects an unknown product", async function () {
      await expect(mock.connect(manufacturer).transferCustody("NOPE", distributor.address))
        .to.be.revertedWith("Product not found");
    });

    it("rejects anyone but the current custodian, including the admin", async function () {
      for (const signer of [admin, distributor, refurbisher, outsider]) {
        await expect(mock.connect(signer).transferCustody(ID, retailer.address))
          .to.be.revertedWith("Only the current custodian");
      }
    });

    it("stops the previous custodian once custody has moved", async function () {
      await mock.connect(manufacturer).transferCustody(ID, distributor.address);
      await expect(mock.connect(manufacturer).transferCustody(ID, retailer.address))
        .to.be.revertedWith("Only the current custodian");
    });

    it("rejects a custodian whose role has been removed", async function () {
      await mock.assignRole(manufacturer.address, Role.None);
      await expect(mock.connect(manufacturer).transferCustody(ID, distributor.address))
        .to.be.revertedWith("Caller has no role");
    });

    it("rejects the zero address", async function () {
      await expect(mock.connect(manufacturer).transferCustody(ID, ethers.ZeroAddress))
        .to.be.revertedWith("Zero address");
    });

    it("rejects a transfer to yourself", async function () {
      await expect(mock.connect(manufacturer).transferCustody(ID, manufacturer.address))
        .to.be.revertedWith("Already the custodian");
    });

    it("rejects a recipient with no role", async function () {
      await expect(mock.connect(manufacturer).transferCustody(ID, outsider.address))
        .to.be.revertedWith("Recipient has no role");
    });

    it("leaves custody unchanged after a rejected transfer", async function () {
      await expect(mock.connect(manufacturer).transferCustody(ID, outsider.address)).to.be.reverted;
      expect(await custodian()).to.equal(manufacturer.address);
    });
  });
});
