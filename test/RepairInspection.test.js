const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const Role = { None: 0, Manufacturer: 1, Distributor: 2, Refurbisher: 3, Inspector: 4, Retailer: 5 };
const Status = { Registered: 0, InTransit: 1, Refurbishing: 2, Inspected: 3, AvailableForSale: 4, Sold: 5 };
const ID = "LAPTOP-SN-001";

// sha256 of the report bytes, as bytes32.
const reportHash = (text) => ethers.sha256(ethers.toUtf8Bytes(text));

describe("RepairInspection", function () {
  let mock, admin, manufacturer, distributor, refurbisher, inspector, retailer, outsider, refurbisher2;

  beforeEach(async function () {
    [admin, manufacturer, distributor, refurbisher, inspector, retailer, outsider, refurbisher2] =
      await ethers.getSigners();
    mock = await (await ethers.getContractFactory("RepairInspectionMock")).deploy();
    await mock.assignRole(manufacturer.address, Role.Manufacturer);
    await mock.assignRole(distributor.address, Role.Distributor);
    await mock.assignRole(refurbisher.address, Role.Refurbisher);
    await mock.assignRole(refurbisher2.address, Role.Refurbisher);
    await mock.assignRole(inspector.address, Role.Inspector);
    await mock.assignRole(retailer.address, Role.Retailer);

    // Device registered, then with the refurbisher and being refurbished.
    await mock.connect(manufacturer).registerProduct(ID, "ThinkPad X1");
    await mock.setCustodian(ID, refurbisher.address);
    await mock.setStatus(ID, Status.Refurbishing);
  });

  const notRefurbishing = [Status.Registered, Status.InTransit, Status.Inspected, Status.AvailableForSale, Status.Sold];

  describe("addRepairRecord", function () {
    it("stores the repair and emits RepairRecorded", async function () {
      await expect(mock.connect(refurbisher).addRepairRecord(ID, "Replaced battery"))
        .to.emit(mock, "RepairRecorded")
        .withArgs(ID, "Replaced battery");

      const [r] = await mock.getRepairHistory(ID);
      expect(r.description).to.equal("Replaced battery");
      expect(r.refurbisher).to.equal(refurbisher.address);
      expect(r.timestamp).to.equal(await time.latest());
    });

    it("keeps several repairs in order", async function () {
      for (const d of ["Replaced battery", "Replaced keyboard", "Upgraded SSD"]) {
        await mock.connect(refurbisher).addRepairRecord(ID, d);
      }
      const history = await mock.getRepairHistory(ID);
      expect(history.map((r) => r.description)).to.deep.equal(["Replaced battery", "Replaced keyboard", "Upgraded SSD"]);
    });

    it("does not change the product's status or custodian", async function () {
      await mock.connect(refurbisher).addRepairRecord(ID, "Replaced battery");
      const p = await mock.getProduct(ID);
      expect(p.status).to.equal(Status.Refurbishing);
      expect(p.currentCustodian).to.equal(refurbisher.address);
    });

    it("rejects every role other than Refurbisher, even the custodian", async function () {
      for (const signer of [admin, manufacturer, distributor, inspector, retailer, outsider]) {
        await mock.setCustodian(ID, signer.address);
        await expect(mock.connect(signer).addRepairRecord(ID, "Fake repair")).to.be.revertedWith(
          "Caller has the wrong role"
        );
      }
    });

    it("rejects a refurbisher who does not hold the device", async function () {
      await expect(mock.connect(refurbisher2).addRepairRecord(ID, "Fake repair")).to.be.revertedWith(
        "Only the current custodian"
      );
    });

    it("rejects a refurbisher whose role was removed", async function () {
      await mock.assignRole(refurbisher.address, Role.None);
      await expect(mock.connect(refurbisher).addRepairRecord(ID, "Fix")).to.be.revertedWith(
        "Caller has the wrong role"
      );
    });

    it("rejects repairs unless the product is being refurbished", async function () {
      for (const s of notRefurbishing) {
        await mock.setStatus(ID, s);
        await expect(mock.connect(refurbisher).addRepairRecord(ID, "Fix")).to.be.revertedWith(
          "Product is not being refurbished"
        );
      }
    });

    it("rejects an empty description", async function () {
      await expect(mock.connect(refurbisher).addRepairRecord(ID, "")).to.be.revertedWith("Empty repair description");
    });

    it("rejects an unknown product", async function () {
      await expect(mock.connect(refurbisher).addRepairRecord("NOPE", "Fix")).to.be.revertedWith("Product not found");
    });

    it("keeps histories separate per product", async function () {
      await mock.connect(manufacturer).registerProduct("LAPTOP-SN-002", "Dell XPS");
      await mock.setCustodian("LAPTOP-SN-002", refurbisher.address);
      await mock.setStatus("LAPTOP-SN-002", Status.Refurbishing);

      await mock.connect(refurbisher).addRepairRecord(ID, "Replaced battery");
      await mock.connect(refurbisher).addRepairRecord("LAPTOP-SN-002", "Replaced screen");

      expect((await mock.getRepairHistory(ID)).map((r) => r.description)).to.deep.equal(["Replaced battery"]);
      expect((await mock.getRepairHistory("LAPTOP-SN-002")).map((r) => r.description)).to.deep.equal([
        "Replaced screen",
      ]);
    });
  });

  describe("certifyInspection", function () {
    it("stores the inspection and emits InspectionCertified", async function () {
      const hash = reportHash("report v1");
      await expect(mock.connect(inspector).certifyInspection(ID, hash))
        .to.emit(mock, "InspectionCertified")
        .withArgs(ID, inspector.address, hash);

      const [i] = await mock.getInspections(ID);
      expect(i.reportHash).to.equal(hash);
      expect(i.inspector).to.equal(inspector.address);
      expect(i.timestamp).to.equal(await time.latest());
      expect(await mock.isInspected(ID)).to.equal(true);
    });

    it("does not change the status (that is updateStatus's job)", async function () {
      await expect(mock.connect(inspector).certifyInspection(ID, reportHash("r"))).to.not.emit(mock, "StatusUpdated");
      expect((await mock.getProduct(ID)).status).to.equal(Status.Refurbishing);
    });

    it("does not require the inspector to hold the device", async function () {
      expect((await mock.getProduct(ID)).currentCustodian).to.equal(refurbisher.address);
      await expect(mock.connect(inspector).certifyInspection(ID, reportHash("r"))).to.not.be.reverted;
    });

    it("rejects every role other than Inspector", async function () {
      for (const signer of [admin, manufacturer, distributor, refurbisher, retailer, outsider]) {
        await expect(mock.connect(signer).certifyInspection(ID, reportHash("r"))).to.be.revertedWith(
          "Caller has the wrong role"
        );
      }
    });

    it("rejects inspection unless the product is being refurbished", async function () {
      for (const s of notRefurbishing) {
        await mock.setStatus(ID, s);
        await expect(mock.connect(inspector).certifyInspection(ID, reportHash("r"))).to.be.revertedWith(
          "Product is not being refurbished"
        );
      }
    });

    it("rejects a zero hash", async function () {
      await expect(mock.connect(inspector).certifyInspection(ID, ethers.ZeroHash)).to.be.revertedWith(
        "Empty report hash"
      );
    });

    it("rejects the same report twice, on the same or another product", async function () {
      await mock.connect(manufacturer).registerProduct("LAPTOP-SN-002", "Dell XPS");
      await mock.setStatus("LAPTOP-SN-002", Status.Refurbishing);
      const hash = reportHash("one report");

      await mock.connect(inspector).certifyInspection(ID, hash);
      await expect(mock.connect(inspector).certifyInspection(ID, hash)).to.be.revertedWith("Report already certified");
      await expect(mock.connect(inspector).certifyInspection("LAPTOP-SN-002", hash)).to.be.revertedWith(
        "Report already certified"
      );
    });

    it("rejects an unknown product", async function () {
      await expect(mock.connect(inspector).certifyInspection("NOPE", reportHash("r"))).to.be.revertedWith(
        "Product not found"
      );
    });

    it("keeps a re-inspection after more repairs", async function () {
      await mock.connect(inspector).certifyInspection(ID, reportHash("first"));
      await mock.connect(refurbisher).addRepairRecord(ID, "Fixed hinge found in inspection");
      await mock.connect(inspector).certifyInspection(ID, reportHash("second"));

      const list = await mock.getInspections(ID);
      expect(list.map((i) => i.reportHash)).to.deep.equal([reportHash("first"), reportHash("second")]);
    });
  });

  describe("read-only views", function () {
    it("verifyInspectionReport is true only for a hash certified for that product", async function () {
      await mock.connect(manufacturer).registerProduct("LAPTOP-SN-002", "Dell XPS");
      const hash = reportHash("genuine report");
      await mock.connect(inspector).certifyInspection(ID, hash);

      expect(await mock.verifyInspectionReport(ID, hash)).to.equal(true);
      expect(await mock.verifyInspectionReport(ID, reportHash("tampered report"))).to.equal(false);
      expect(await mock.verifyInspectionReport("LAPTOP-SN-002", hash)).to.equal(false);
    });

    it("return empty results for a product with no repairs or inspections", async function () {
      expect(await mock.getRepairHistory(ID)).to.deep.equal([]);
      expect(await mock.getInspections(ID)).to.deep.equal([]);
      expect(await mock.isInspected(ID)).to.equal(false);
      expect(await mock.verifyInspectionReport(ID, reportHash("r"))).to.equal(false);
    });

    it("revert for an unknown product", async function () {
      await expect(mock.getRepairHistory("NOPE")).to.be.revertedWith("Product not found");
      await expect(mock.getInspections("NOPE")).to.be.revertedWith("Product not found");
      await expect(mock.isInspected("NOPE")).to.be.revertedWith("Product not found");
      await expect(mock.verifyInspectionReport("NOPE", reportHash("r"))).to.be.revertedWith("Product not found");
    });
  });
});
