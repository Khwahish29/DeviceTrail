import { Contract, JsonRpcProvider, sha256 } from "ethers";
import { ABI, CONTRACT_ADDRESS, HARDHAT_CHAIN_ID, ROLE_NAMES, RPC_URL } from "../config.js";
import { STAGES } from "../labels.js";
import { UNLISTED, article, shortHash } from "../components/ui.jsx";

// Read-only provider, so reports work without any sign-in. The fixed network avoids slow network probing.
// cacheTimeout -1 turns off ethers' 250 ms read cache, which could otherwise return a history that is one step old
// right after a change.
export const provider = new JsonRpcProvider(RPC_URL, Number(HARDHAT_CHAIN_ID), { staticNetwork: true, cacheTimeout: -1 });
const records = () => new Contract(CONTRACT_ADDRESS, ABI, provider);

// A role can change between reports, so each load keeps its own small cache instead of a global one.
function companyLookup() {
  const c = records();
  const seen = new Map();
  return (address) => {
    if (!seen.has(address)) {
      seen.set(address, c.getRole(address).then((n) => ROLE_NAMES[Number(n)]).catch(() => null));
    }
    return seen.get(address).then((role) => (!role || role === "None" ? UNLISTED : role));
  };
}
const dateOf = (seconds) => new Date(Number(seconds) * 1000);

// Reads one device. Throws if the device does not exist or the service cannot be reached.
export async function readDevice(id) {
  const c = records();
  const p = await c.getProduct(id);
  // The holder's type of company tells a buyer who has the device. Optional, so a failure here is not fatal.
  let holderRole = null;
  try {
    holderRole = ROLE_NAMES[Number(await c.getRole(p.currentCustodian))];
  } catch {
    /* leave null */
  }
  return { id, model: p.model, holder: p.currentCustodian, holderRole, status: Number(p.status), checkedAt: new Date() };
}

// The contract reverts with this exact text for an unknown ID.
export const isNotFound = (err) => (err.reason || err.revert?.args?.[0]) === "Product not found";

// Repairs, oldest first: { description, company, when }
export async function readRepairs(id) {
  const company = companyLookup();
  const list = await records().getRepairHistory(id);
  return Promise.all(list.map(async (r) => ({ description: r.description, company: await company(r.refurbisher), when: dateOf(r.timestamp) })));
}

// Certified inspections, oldest first: { reportId, company, when }
export async function readInspections(id) {
  const company = companyLookup();
  const list = await records().getInspections(id);
  return Promise.all(list.map(async (r) => ({ reportId: r.reportHash, company: await company(r.inspector), when: dateOf(r.timestamp) })));
}

// SHA-256 of the file's bytes as 0x + 64 hex characters, the same convention as docs/REPAIR_INSPECTION.md.
// ethers' sha256 is plain JavaScript, so it also works when the page is opened over a LAN address.
export const fingerprintOf = (bytes) => sha256(bytes);

// True only if this exact file fingerprint was certified for this device.
export const reportMatches = (id, fingerprint) => records().verifyInspectionReport(id, fingerprint);

const EVENTS = ["ProductRegistered", "CustodyTransferred", "StatusUpdated", "RepairRecorded", "InspectionCertified"];

// The device's full story, built from the contract's events and written in plain words: { key, title, detail, when }
export async function readHistory(id) {
  const c = records();
  const company = companyLookup();

  // The product ID is not an indexed event field, so fetch each event type and filter here.
  const events = (await Promise.all(EVENTS.map((name) => c.queryFilter(c.filters[name]()))))
    .flat()
    .filter((e) => e.args.productId === id)
    .sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index);

  const blockTimes = new Map();
  const timeOf = (n) => {
    if (!blockTimes.has(n)) blockTimes.set(n, provider.getBlock(n).then((b) => (b ? dateOf(b.timestamp) : null)).catch(() => null));
    return blockTimes.get(n);
  };

  async function describe(e) {
    const a = e.args;
    switch (e.eventName) {
      case "ProductRegistered":
        return { title: "Registered", detail: `by ${article(await company(a.manufacturer))}` };
      case "CustodyTransferred":
        return { title: "Changed hands", detail: `From ${article(await company(a.from))} to ${article(await company(a.to))}` };
      case "StatusUpdated":
        return { title: `Status changed to ${STAGES[Number(a.newStatus)] ?? "a new stage"}`, detail: "" };
      case "RepairRecorded":
        return { title: "Repair recorded", detail: a.repairDescription };
      case "InspectionCertified":
        return { title: "Inspection certified", detail: `by ${article(await company(a.inspector))} · report ID ${shortHash(a.reportHash)}` };
      default:
        return { title: e.eventName, detail: "" };
    }
  }

  return Promise.all(
    events.map(async (e) => ({ key: `${e.blockNumber}-${e.index}`, ...(await describe(e)), when: await timeOf(e.blockNumber) }))
  );
}

// A quick summary of where a device is, used by the demo page to work out the next step.
export async function readSnapshot(id) {
  const c = records();
  let p;
  try {
    p = await c.getProduct(id);
  } catch (err) {
    if (isNotFound(err)) return { exists: false };
    throw err;
  }
  const [role, repairs, inspections] = await Promise.all([
    c.getRole(p.currentCustodian).then((n) => ROLE_NAMES[Number(n)]),
    c.getRepairHistory(id),
    c.getInspections(id),
  ]);
  return { exists: true, status: Number(p.status), holderRole: role, repairs: repairs.length, inspections: inspections.length };
}
