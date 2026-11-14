const { expect } = require("chai");
const { ethers } = require("hardhat");

const Role = { None: 0, Manufacturer: 1, Distributor: 2, Refurbisher: 3, Inspector: 4, Retailer: 5 };
const Status = { Registered: 0, InTransit: 1, Refurbishing: 2, Inspected: 3, AvailableForSale: 4, Sold: 5 };
const StatusNames = Object.keys(Status);
const ID = "LAPTOP-SN-001";

// sha256 of the report bytes, as bytes32.
const reportHash = (text) => ethers.sha256(ethers.toUtf8Bytes(text));

describe("LifecycleStatus", function () {
  let mock, admin, manufacturer, distributor, refurbisher, refurbisher2, inspector, retailer, outsider;

  beforeEach(async function () {
    [admin, manufacturer, distributor, refurbisher, refurbisher2, inspector, retailer, outsider] =
      await ethers.getSigners();
    mock = await (await ethers.getContractFactory("LifecycleStatusMock")).deploy();
    await mock.assignRole(manufacturer.address, Role.Manufacturer);
    await mock.assignRole(distributor.address, Role.Distributor);
    await mock.assignRole(refurbisher.address, Role.Refurbisher);
    await mock.assignRole(refurbisher2.address, Role.Refurbisher);
    await mock.assignRole(inspector.address, Role.Inspector);
    await mock.assignRole(retailer.address, Role.Retailer);

    // Registered by the manufacturer, who is the first custodian.
    await mock.connect(manufacturer).registerProduct(ID, "ThinkPad X1");
  });

  // Put the product in `status`, held by `custodian`, without walking the chain.
  async function put(status, custodian) {
    await mock.setStatus(ID, status);
    await mock.setCustodian(ID, custodian.address);
  }

  // A real certified inspection (the product must be Refurbishing when it is certified).
  async function certify(text = "report-1") {
    await mock.connect(inspector).certifyInspection(ID, reportHash(text));
  }

  const statusOf = async () => (await mock.getProduct(ID)).status;

  // The signer who is allowed to move a device INTO each status.
  const actorFor = () => ({
    [Status.Registered]: manufacturer, // nobody may do this; any role holder shows the transition error
    [Status.InTransit]: manufacturer,
    [Status.Refurbishing]: refurbisher,
    [Status.Inspected]: refurbisher,
    [Status.AvailableForSale]: retailer,
    [Status.Sold]: retailer,
  });

  describe("valid transitions", function () {
    it("Manufacturer moves Registered -> InTransit", async function () {
      await expect(mock.connect(manufacturer).updateStatus(ID, Status.InTransit))
        .to.emit(mock, "StatusUpdated")
        .withArgs(ID, Status.InTransit);
      expect(await statusOf()).to.equal(Status.InTransit);
    });

    it("Distributor can also move Registered -> InTransit when it holds the device", async function () {
      await put(Status.Registered, distributor);
      await expect(mock.connect(distributor).updateStatus(ID, Status.InTransit))
        .to.emit(mock, "StatusUpdated")
        .withArgs(ID, Status.InTransit);
      expect(await statusOf()).to.equal(Status.InTransit);
    });

    it("Refurbisher moves InTransit -> Refurbishing", async function () {
      await put(Status.InTransit, refurbisher);
      await expect(mock.connect(refurbisher).updateStatus(ID, Status.Refurbishing))
        .to.emit(mock, "StatusUpdated")
        .withArgs(ID, Status.Refurbishing);
      expect(await statusOf()).to.equal(Status.Refurbishing);
    });

    it("Refurbisher moves Refurbishing -> Inspected after a certified inspection", async function () {
      await put(Status.Refurbishing, refurbisher);
      await mock.connect(refurbisher).addRepairRecord(ID, "Replaced battery");
      await certify();
      await expect(mock.connect(refurbisher).updateStatus(ID, Status.Inspected))
        .to.emit(mock, "StatusUpdated")
        .withArgs(ID, Status.Inspected);
      expect(await statusOf()).to.equal(Status.Inspected);
    });

    it("Retailer moves Inspected -> AvailableForSale", async function () {
      await put(Status.Inspected, retailer);
      await expect(mock.connect(retailer).updateStatus(ID, Status.AvailableForSale))
        .to.emit(mock, "StatusUpdated")
        .withArgs(ID, Status.AvailableForSale);
      expect(await statusOf()).to.equal(Status.AvailableForSale);
    });

    it("Retailer moves AvailableForSale -> Sold", async function () {
      await put(Status.AvailableForSale, retailer);
      await expect(mock.connect(retailer).updateStatus(ID, Status.Sold))
        .to.emit(mock, "StatusUpdated")
        .withArgs(ID, Status.Sold);
      expect(await statusOf()).to.equal(Status.Sold);
    });

    it("walks the whole chain from Registered to Sold", async function () {
      await mock.connect(manufacturer).updateStatus(ID, Status.InTransit);
      await mock.setCustodian(ID, refurbisher.address);
      await mock.connect(refurbisher).updateStatus(ID, Status.Refurbishing);
      await mock.connect(refurbisher).addRepairRecord(ID, "Replaced battery");
      await certify();
      await mock.connect(refurbisher).updateStatus(ID, Status.Inspected);
      await mock.setCustodian(ID, retailer.address);
      await mock.connect(retailer).updateStatus(ID, Status.AvailableForSale);
      await mock.connect(retailer).updateStatus(ID, Status.Sold);

      expect(await statusOf()).to.equal(Status.Sold);
      const events = await mock.queryFilter(mock.filters.StatusUpdated());
      expect(events.map((e) => Number(e.args.newStatus))).to.deep.equal([1, 2, 3, 4, 5]);
    });

    it("changes only the status, not the model, custodian or ID", async function () {
      await mock.connect(manufacturer).updateStatus(ID, Status.InTransit);
      const p = await mock.getProduct(ID);
      expect(p.productId).to.equal(ID);
      expect(p.model).to.equal("ThinkPad X1");
      expect(p.currentCustodian).to.equal(manufacturer.address);
      expect(p.exists).to.equal(true);
    });
  });

  describe("invalid transitions", function () {
    // All 36 (from, to) pairs. Only the 5 one-step-forward pairs may succeed.
    for (const from of StatusNames) {
      for (const to of StatusNames) {
        const valid = Status[to] === Status[from] + 1;
        it(`${from} -> ${to} ${valid ? "succeeds" : "reverts"}`, async function () {
          const actor = actorFor()[Status[to]];
          await put(Status[from], actor);
          if (valid && Status[to] === Status.Inspected) await certify();

          const call = mock.connect(actor).updateStatus(ID, Status[to]);
          if (valid) {
            await expect(call).to.emit(mock, "StatusUpdated").withArgs(ID, Status[to]);
            expect(await statusOf()).to.equal(Status[to]);
          } else {
            await expect(call).to.be.revertedWith("Invalid status transition");
            expect(await statusOf()).to.equal(Status[from]);
          }
        });
      }
    }

    it("rejects skipping a step (Registered -> Sold, Registered -> Refurbishing)", async function () {
      await expect(mock.connect(retailer).updateStatus(ID, Status.Sold)).to.be.revertedWith(
        "Invalid status transition"
      );
      await expect(mock.connect(refurbisher).updateStatus(ID, Status.Refurbishing)).to.be.revertedWith(
        "Invalid status transition"
      );
    });

    it("rejects going backwards (Inspected -> Refurbishing)", async function () {
      await put(Status.Inspected, refurbisher);
      await expect(mock.connect(refurbisher).updateStatus(ID, Status.Refurbishing)).to.be.revertedWith(
        "Invalid status transition"
      );
    });

    it("rejects staying in the same state", async function () {
      await expect(mock.connect(manufacturer).updateStatus(ID, Status.Registered)).to.be.revertedWith(
        "Invalid status transition"
      );
    });

    it("treats Sold as terminal", async function () {
      await put(Status.Sold, retailer);
      await expect(mock.connect(retailer).updateStatus(ID, Status.Registered)).to.be.revertedWith(
        "Invalid status transition"
      );
      await expect(mock.connect(retailer).updateStatus(ID, Status.Sold)).to.be.revertedWith(
        "Invalid status transition"
      );
    });

    it("rejects Refurbishing -> Inspected with no certified inspection", async function () {
      await put(Status.Refurbishing, refurbisher);
      await expect(mock.connect(refurbisher).updateStatus(ID, Status.Inspected)).to.be.revertedWith(
        "No certified inspection"
      );
      expect(await statusOf()).to.equal(Status.Refurbishing);
    });

    it("a failed call changes nothing and emits no StatusUpdated", async function () {
      await expect(mock.connect(retailer).updateStatus(ID, Status.Sold)).to.be.reverted;
      expect(await statusOf()).to.equal(Status.Registered);
      expect(await mock.queryFilter(mock.filters.StatusUpdated())).to.have.length(0);
    });

    it("reverts on a status value outside the enum (raw call)", async function () {
      const data = mock.interface.encodeFunctionData("updateStatus", [ID, Status.Sold]);
      // The enum is the second 32-byte argument slot, right after the 4-byte selector and the string offset.
      const at = 2 + 8 + 64;
      const bad = data.slice(0, at) + (6).toString(16).padStart(64, "0") + data.slice(at + 64);
      await expect(manufacturer.sendTransaction({ to: await mock.getAddress(), data: bad })).to.be.reverted;
      expect(await statusOf()).to.equal(Status.Registered);
    });
  });

  describe("unauthorized callers", function () {
    it("rejects a caller with no role", async function () {
      await put(Status.Registered, outsider);
      await expect(mock.connect(outsider).updateStatus(ID, Status.InTransit)).to.be.revertedWith(
        "Caller has no role"
      );
    });

    it("rejects the admin: it has no role and no override", async function () {
      await expect(mock.connect(admin).updateStatus(ID, Status.InTransit)).to.be.revertedWith(
        "Caller has no role"
      );
    });

    it("rejects the admin even when it holds a role but is not the custodian", async function () {
      await mock.assignRole(admin.address, Role.Manufacturer);
      await expect(mock.connect(admin).updateStatus(ID, Status.InTransit)).to.be.revertedWith(
        "Only the current custodian"
      );
    });

    it("rejects the wrong role: Retailer on Registered -> InTransit", async function () {
      await put(Status.Registered, retailer);
      await expect(mock.connect(retailer).updateStatus(ID, Status.InTransit)).to.be.revertedWith(
        "Caller has the wrong role"
      );
    });

    it("rejects the wrong role: Inspector on InTransit -> Refurbishing", async function () {
      await put(Status.InTransit, inspector);
      await expect(mock.connect(inspector).updateStatus(ID, Status.Refurbishing)).to.be.revertedWith(
        "Caller has the wrong role"
      );
    });

    it("rejects the wrong role: Manufacturer on Inspected -> AvailableForSale", async function () {
      await put(Status.Inspected, manufacturer);
      await expect(mock.connect(manufacturer).updateStatus(ID, Status.AvailableForSale)).to.be.revertedWith(
        "Caller has the wrong role"
      );
    });

    it("rejects the right role when the caller is not the custodian", async function () {
      await put(Status.InTransit, refurbisher);
      await expect(mock.connect(refurbisher2).updateStatus(ID, Status.Refurbishing)).to.be.revertedWith(
        "Only the current custodian"
      );
      expect(await statusOf()).to.equal(Status.InTransit);
    });

    it("rejects a former custodian after custody moved on", async function () {
      await mock.setCustodian(ID, distributor.address);
      await expect(mock.connect(manufacturer).updateStatus(ID, Status.InTransit)).to.be.revertedWith(
        "Only the current custodian"
      );
    });

    it("rejects a custodian whose role was removed", async function () {
      await put(Status.InTransit, refurbisher);
      await mock.assignRole(refurbisher.address, Role.None);
      await expect(mock.connect(refurbisher).updateStatus(ID, Status.Refurbishing)).to.be.revertedWith(
        "Caller has no role"
      );
    });
  });

  describe("product existence", function () {
    it("reverts for an unknown product ID", async function () {
      await expect(mock.connect(manufacturer).updateStatus("NOPE", Status.InTransit)).to.be.revertedWith(
        "Product not found"
      );
    });

    it("reverts for an empty product ID", async function () {
      await expect(mock.connect(manufacturer).updateStatus("", Status.InTransit)).to.be.revertedWith(
        "Product not found"
      );
    });

    it("only moves the product it was asked about", async function () {
      await mock.connect(manufacturer).registerProduct("PHONE-001", "Pixel");
      await mock.connect(manufacturer).updateStatus(ID, Status.InTransit);
      expect((await mock.getProduct("PHONE-001")).status).to.equal(Status.Registered);
    });
  });

  describe("check order", function () {
    it("reports an unknown product before a missing role", async function () {
      await expect(mock.connect(outsider).updateStatus("NOPE", Status.Sold)).to.be.revertedWith(
        "Product not found"
      );
    });

    it("reports a missing role before an invalid transition", async function () {
      await expect(mock.connect(outsider).updateStatus(ID, Status.Sold)).to.be.revertedWith("Caller has no role");
    });

    it("reports an invalid transition before the wrong role", async function () {
      // Retailer is the wrong role for Refurbishing, and Registered -> Refurbishing is a skip.
      await expect(mock.connect(retailer).updateStatus(ID, Status.Refurbishing)).to.be.revertedWith(
        "Invalid status transition"
      );
    });

    it("reports the wrong role before the custodian check", async function () {
      // Retailer does not hold the device either, but the role error comes first.
      await expect(mock.connect(retailer).updateStatus(ID, Status.InTransit)).to.be.revertedWith(
        "Caller has the wrong role"
      );
    });

    it("reports the custodian check before the inspection check", async function () {
      await put(Status.Refurbishing, refurbisher);
      await expect(mock.connect(refurbisher2).updateStatus(ID, Status.Inspected)).to.be.revertedWith(
        "Only the current custodian"
      );
    });
  });
});
