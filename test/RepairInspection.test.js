const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
  time,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// Unit tests for the repair and inspection module (contracts/modules/RepairInspection.sol).
// Runs against RepairInspectionHarness, so it does not depend on the other modules.

// Must match the enum order in IDeviceTrail.
const Role = {
  None: 0,
  Manufacturer: 1,
  Distributor: 2,
  Refurbisher: 3,
  Inspector: 4,
  Retailer: 5,
};
const Status = {
  Registered: 0,
  InTransit: 1,
  Refurbishing: 2,
  Inspected: 3,
  AvailableForSale: 4,
  Sold: 5,
};

const PRODUCT = "LAPTOP-001";
// Same hashing as backend/storage.js: sha256 of the report bytes, as bytes32.
const reportHash = (text) => ethers.sha256(ethers.toUtf8Bytes(text));

describe("RepairInspection module", function () {
  async function deployFixture() {
    // Same signer order as scripts/deploy.js and test/fixtures.js; index 7 is a second refurbisher.
    const [admin, manufacturer, distributor, refurbisher, inspector, retailer, outsider, otherRefurbisher] =
      await ethers.getSigners();

    const Harness = await ethers.getContractFactory("RepairInspectionHarness");
    const trail = await Harness.deploy();

    await trail.setRole(manufacturer.address, Role.Manufacturer);
    await trail.setRole(distributor.address, Role.Distributor);
    await trail.setRole(refurbisher.address, Role.Refurbisher);
    await trail.setRole(otherRefurbisher.address, Role.Refurbisher);
    await trail.setRole(inspector.address, Role.Inspector);
    await trail.setRole(retailer.address, Role.Retailer);

    // Device is with the refurbisher and being refurbished.
    await trail.setProduct(PRODUCT, refurbisher.address, Status.Refurbishing);

    return { trail, admin, manufacturer, distributor, refurbisher, otherRefurbisher, inspector, retailer, outsider };
  }

  describe("addRepairRecord", function () {
    it("stores the repair and emits RepairRecorded", async function () {
      const { trail, refurbisher } = await loadFixture(deployFixture);

      await expect(trail.connect(refurbisher).addRepairRecord(PRODUCT, "Replaced battery"))
        .to.emit(trail, "RepairRecorded")
        .withArgs(PRODUCT, "Replaced battery");

      const history = await trail.getRepairHistory(PRODUCT);
      expect(history.length).to.equal(1);
      expect(history[0].description).to.equal("Replaced battery");
      expect(history[0].refurbisher).to.equal(refurbisher.address);
      expect(history[0].timestamp).to.equal(await time.latest());
    });

    it("keeps multiple repairs in order", async function () {
      const { trail, refurbisher } = await loadFixture(deployFixture);

      await trail.connect(refurbisher).addRepairRecord(PRODUCT, "Replaced battery");
      await trail.connect(refurbisher).addRepairRecord(PRODUCT, "Replaced keyboard");
      await trail.connect(refurbisher).addRepairRecord(PRODUCT, "Upgraded SSD to 1TB");

      expect(await trail.getRepairCount(PRODUCT)).to.equal(3);
      const history = await trail.getRepairHistory(PRODUCT);
      expect(history.map((r) => r.description)).to.deep.equal([
        "Replaced battery",
        "Replaced keyboard",
        "Upgraded SSD to 1TB",
      ]);
    });

    it("does not change the product status", async function () {
      const { trail, refurbisher } = await loadFixture(deployFixture);
      await trail.connect(refurbisher).addRepairRecord(PRODUCT, "Replaced battery");
      expect((await trail.getProduct(PRODUCT)).status).to.equal(Status.Refurbishing);
    });

    it("rejects an unknown product", async function () {
      const { trail, refurbisher } = await loadFixture(deployFixture);
      await expect(trail.connect(refurbisher).addRepairRecord("NOPE-999", "Fix"))
        .to.be.revertedWithCustomError(trail, "ProductNotFound")
        .withArgs("NOPE-999");
    });

    it("rejects a caller without the Refurbisher role", async function () {
      const { trail, admin, manufacturer, distributor, inspector, retailer, outsider } =
        await loadFixture(deployFixture);

      for (const signer of [admin, manufacturer, distributor, inspector, retailer, outsider]) {
        await expect(trail.connect(signer).addRepairRecord(PRODUCT, "Fake repair"))
          .to.be.revertedWithCustomError(trail, "NotRefurbisher")
          .withArgs(signer.address);
      }
    });

    it("rejects a refurbisher who does not hold custody", async function () {
      const { trail, refurbisher, otherRefurbisher } = await loadFixture(deployFixture);
      await expect(trail.connect(otherRefurbisher).addRepairRecord(PRODUCT, "Fix"))
        .to.be.revertedWithCustomError(trail, "NotCustodian")
        .withArgs(otherRefurbisher.address, refurbisher.address);
    });

    it("rejects repairs when the product is not in Refurbishing", async function () {
      const { trail, refurbisher } = await loadFixture(deployFixture);

      for (const status of [
        Status.Registered,
        Status.InTransit,
        Status.Inspected,
        Status.AvailableForSale,
        Status.Sold,
      ]) {
        await trail.setProduct(PRODUCT, refurbisher.address, status);
        await expect(trail.connect(refurbisher).addRepairRecord(PRODUCT, "Fix"))
          .to.be.revertedWithCustomError(trail, "InvalidStatusForRepair")
          .withArgs(status);
      }
    });

    it("rejects an empty description", async function () {
      const { trail, refurbisher } = await loadFixture(deployFixture);
      await expect(
        trail.connect(refurbisher).addRepairRecord(PRODUCT, "")
      ).to.be.revertedWithCustomError(trail, "EmptyRepairDescription");
    });

    it("keeps histories separate per product", async function () {
      const { trail, refurbisher } = await loadFixture(deployFixture);
      await trail.setProduct("LAPTOP-002", refurbisher.address, Status.Refurbishing);

      await trail.connect(refurbisher).addRepairRecord(PRODUCT, "Replaced battery");
      await trail.connect(refurbisher).addRepairRecord("LAPTOP-002", "Replaced screen");

      expect(await trail.getRepairCount(PRODUCT)).to.equal(1);
      expect(await trail.getRepairCount("LAPTOP-002")).to.equal(1);
      expect((await trail.getRepairHistory("LAPTOP-002"))[0].description).to.equal(
        "Replaced screen"
      );
    });
  });

  describe("certifyInspection", function () {
    it("records the inspection and emits InspectionCertified", async function () {
      const { trail, inspector } = await loadFixture(deployFixture);
      const hash = reportHash("inspection report v1");

      await expect(trail.connect(inspector).certifyInspection(PRODUCT, hash))
        .to.emit(trail, "InspectionCertified")
        .withArgs(PRODUCT, inspector.address, hash);

      expect(await trail.isInspected(PRODUCT)).to.equal(true);

      const inspections = await trail.getInspections(PRODUCT);
      expect(inspections.length).to.equal(1);
      expect(inspections[0].reportHash).to.equal(hash);
      expect(inspections[0].inspector).to.equal(inspector.address);
      expect(inspections[0].timestamp).to.equal(await time.latest());
    });

    it("does not change the product status (that is updateStatus's job)", async function () {
      const { trail, inspector } = await loadFixture(deployFixture);
      await expect(trail.connect(inspector).certifyInspection(PRODUCT, reportHash("r"))).to.not.emit(
        trail,
        "StatusUpdated"
      );
      expect((await trail.getProduct(PRODUCT)).status).to.equal(Status.Refurbishing);
    });

    it("does not require the inspector to hold custody", async function () {
      const { trail, refurbisher, inspector } = await loadFixture(deployFixture);
      expect((await trail.getProduct(PRODUCT)).currentCustodian).to.equal(refurbisher.address);
      await expect(trail.connect(inspector).certifyInspection(PRODUCT, reportHash("r"))).to.not
        .be.reverted;
    });

    it("rejects an unknown product", async function () {
      const { trail, inspector } = await loadFixture(deployFixture);
      await expect(trail.connect(inspector).certifyInspection("NOPE-999", reportHash("r")))
        .to.be.revertedWithCustomError(trail, "ProductNotFound")
        .withArgs("NOPE-999");
    });

    it("rejects a caller without the Inspector role", async function () {
      const { trail, admin, manufacturer, distributor, refurbisher, retailer, outsider } =
        await loadFixture(deployFixture);

      for (const signer of [admin, manufacturer, distributor, refurbisher, retailer, outsider]) {
        await expect(trail.connect(signer).certifyInspection(PRODUCT, reportHash("r")))
          .to.be.revertedWithCustomError(trail, "NotInspector")
          .withArgs(signer.address);
      }
    });

    it("rejects inspection when the product is not in Refurbishing", async function () {
      const { trail, refurbisher, inspector } = await loadFixture(deployFixture);

      for (const status of [
        Status.Registered,
        Status.InTransit,
        Status.Inspected,
        Status.AvailableForSale,
        Status.Sold,
      ]) {
        await trail.setProduct(PRODUCT, refurbisher.address, status);
        await expect(trail.connect(inspector).certifyInspection(PRODUCT, reportHash("r")))
          .to.be.revertedWithCustomError(trail, "InvalidStatusForInspection")
          .withArgs(status);
      }
    });

    it("rejects a zero report hash", async function () {
      const { trail, inspector } = await loadFixture(deployFixture);
      await expect(
        trail.connect(inspector).certifyInspection(PRODUCT, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(trail, "EmptyReportHash");
    });

    it("rejects reusing a report hash on another product", async function () {
      const { trail, refurbisher, inspector } = await loadFixture(deployFixture);
      await trail.setProduct("LAPTOP-002", refurbisher.address, Status.Refurbishing);
      const hash = reportHash("one report");

      await trail.connect(inspector).certifyInspection(PRODUCT, hash);
      await expect(trail.connect(inspector).certifyInspection("LAPTOP-002", hash))
        .to.be.revertedWithCustomError(trail, "ReportHashAlreadyUsed")
        .withArgs(hash);
    });

    it("allows a re-inspection after more repairs, keeping both", async function () {
      const { trail, refurbisher, inspector } = await loadFixture(deployFixture);

      await trail.connect(inspector).certifyInspection(PRODUCT, reportHash("first"));
      await trail.connect(refurbisher).addRepairRecord(PRODUCT, "Fixed hinge found in inspection");
      await trail.connect(inspector).certifyInspection(PRODUCT, reportHash("second"));

      const inspections = await trail.getInspections(PRODUCT);
      expect(inspections.length).to.equal(2);
      expect(inspections[1].reportHash).to.equal(reportHash("second"));
    });
  });

  describe("verifyInspectionReport", function () {
    it("returns true only for a hash certified for that product", async function () {
      const { trail, refurbisher, inspector } = await loadFixture(deployFixture);
      await trail.setProduct("LAPTOP-002", refurbisher.address, Status.Refurbishing);
      const hash = reportHash("genuine report");

      await trail.connect(inspector).certifyInspection(PRODUCT, hash);

      expect(await trail.verifyInspectionReport(PRODUCT, hash)).to.equal(true);
      expect(await trail.verifyInspectionReport(PRODUCT, reportHash("tampered report"))).to.equal(
        false
      );
      expect(await trail.verifyInspectionReport("LAPTOP-002", hash)).to.equal(false);
    });

    it("returns empty results for a product with no history", async function () {
      const { trail } = await loadFixture(deployFixture);
      expect(await trail.isInspected(PRODUCT)).to.equal(false);
      expect(await trail.getRepairCount(PRODUCT)).to.equal(0);
      expect((await trail.getRepairHistory(PRODUCT)).length).to.equal(0);
      expect((await trail.getInspections(PRODUCT)).length).to.equal(0);
    });
  });
});
