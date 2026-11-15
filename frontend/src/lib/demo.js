import { Contract, JsonRpcProvider, sha256, toUtf8Bytes } from "ethers";
import { ABI, CONTRACT_ADDRESS, HARDHAT_CHAIN_ID, ROLE_NAMES, RPC_URL } from "../config.js";

// Demo only. The local test chain keeps its accounts unlocked, so the page can send a call as any of them
// without a wallet. Same account order as scripts/deploy.js: 0 admin, 1 to 5 the five roles, 6 has no role.
const demoProvider = new JsonRpcProvider(RPC_URL, Number(HARDHAT_CHAIN_ID), { staticNetwork: true, cacheTimeout: -1 });
demoProvider.pollingInterval = 400;

export const ACTORS = ["Administrator", "Manufacturer", "Distributor", "Refurbisher", "Inspector", "Retailer", "Outsider"];
const EXPECTED_ROLES = [null, "Manufacturer", "Distributor", "Refurbisher", "Inspector", "Retailer"];
export const MODEL = "ThinkPad X1 Carbon Gen 11";

// Checks that the demo can run: the chain is reachable, the accounts exist and the roles are assigned.
export async function loadDemoAccounts() {
  try {
    const signers = await demoProvider.listAccounts();
    if (signers.length < 7) return { ok: false, problem: "accounts" };
    const addresses = signers.map((s) => s.address);
    const records = new Contract(CONTRACT_ADDRESS, ABI, demoProvider);
    for (let i = 1; i <= 5; i++) {
      const role = ROLE_NAMES[Number(await records.getRole(addresses[i]))];
      if (role !== EXPECTED_ROLES[i]) return { ok: false, problem: "roles" };
    }
    return { ok: true, addresses };
  } catch (err) {
    return { ok: false, problem: "chain", detail: err.shortMessage || err.message };
  }
}

// Sends one call as one of the demo accounts and waits for it to be mined. Throws if the contract refuses.
export async function sendAs(index, fn, args) {
  const signer = await demoProvider.getSigner(index);
  const contract = new Contract(CONTRACT_ADDRESS, ABI, signer);
  const tx = await contract[fn](...args);
  const receipt = await tx.wait();
  return { hash: tx.hash, gas: Number(receipt.gasUsed) };
}

// The contract's own message, for example "Caller has the wrong role".
export function revertReason(err) {
  const parts = [err.reason, err.revert?.args?.[0], err.info?.error?.message, err.shortMessage, err.message].filter(Boolean);
  const fromText = parts.join(" | ").match(/reason string '([^']*)'/);
  return fromText ? fromText[1] : parts[0] || "The call failed";
}

// The inspection report used in the demo. Only its SHA-256 goes into the contract (docs/REPAIR_INSPECTION.md).
export const reportText = (id, edited = false) =>
  `DeviceTrail inspection report\nProduct: ${id}\nGrade: ${edited ? "A+" : "A"}\nBattery health: 98%\nAll ports and keys working`;
export const reportHash = (id) => sha256(toUtf8Bytes(reportText(id)));

export const newDeviceId = () => `DEMO-${Date.now().toString(36).toUpperCase().slice(-6)}`;

// ---------- the workflow ----------
// actor = index into the demo accounts. Status numbers: 1 In transit, 2 Refurbishing, 3 Inspected, 4 Available, 5 Sold.
export const STEPS = [
  {
    title: "Register the device", role: "Manufacturer", signature: "registerProduct(id, model)",
    why: "Only a Manufacturer can register. The ID must be new, and the manufacturer becomes the first holder.",
    actions: ({ id }) => [{ actor: 1, fn: "registerProduct", args: [id, MODEL], note: "Registered the device" }],
  },
  {
    title: "Mark it in transit", role: "Manufacturer", signature: "updateStatus(id, InTransit)",
    why: "Status moves one step at a time, and only an allowed role that holds the device can move it.",
    actions: ({ id }) => [{ actor: 1, fn: "updateStatus", args: [id, 1], note: "Status changed to In transit" }],
  },
  {
    title: "Hand it to the Distributor", role: "Manufacturer", signature: "transferCustody(id, distributor)",
    why: "Only the current holder can hand a device on, and only to an account that has a role.",
    actions: ({ id, accounts }) => [{ actor: 1, fn: "transferCustody", args: [id, accounts[2]], note: "Handed the device to the Distributor" }],
  },
  {
    title: "Hand it to the Refurbisher", role: "Distributor", signature: "transferCustody(id, refurbisher)",
    why: "Now the Distributor is the holder, so only the Distributor can pass it on. The Manufacturer no longer can.",
    actions: ({ id, accounts }) => [{ actor: 2, fn: "transferCustody", args: [id, accounts[3]], note: "Handed the device to the Refurbisher" }],
  },
  {
    title: "Start refurbishing", role: "Refurbisher", signature: "updateStatus(id, Refurbishing)",
    why: "Only the Refurbisher who holds the device can start refurbishing it.",
    actions: ({ id }) => [{ actor: 3, fn: "updateStatus", args: [id, 2], note: "Status changed to Refurbishing" }],
  },
  {
    title: "Record the repairs", role: "Refurbisher", signature: "addRepairRecord(id, description)",
    why: "Repairs are added by the Refurbisher holding the device, only while it is being refurbished. They cannot be deleted.",
    actions: ({ id }) => [
      "Replaced battery (57Wh, original part)",
      "Replaced keyboard (US layout)",
      "Secure-erased SSD and reinstalled OS",
    ].map((d) => ({ actor: 3, fn: "addRepairRecord", args: [id, d], note: `Repair recorded: ${d}` })),
  },
  {
    title: "Certify the inspection", role: "Inspector", signature: "certifyInspection(id, reportHash)",
    why: "An independent Inspector certifies the report. Only the report's SHA-256 fingerprint is stored, never the file.",
    actions: ({ id }) => [{ actor: 4, fn: "certifyInspection", args: [id, reportHash(id)], note: "Inspection certified" }],
  },
  {
    title: "Mark it inspected", role: "Refurbisher", signature: "updateStatus(id, Inspected)",
    why: "The contract refuses this until an inspector has certified a report.",
    actions: ({ id }) => [{ actor: 3, fn: "updateStatus", args: [id, 3], note: "Status changed to Inspected" }],
  },
  {
    title: "Hand it to the Retailer", role: "Refurbisher", signature: "transferCustody(id, retailer)",
    why: "The Refurbisher still holds the device, so only they can pass it on.",
    actions: ({ id, accounts }) => [{ actor: 3, fn: "transferCustody", args: [id, accounts[5]], note: "Handed the device to the Retailer" }],
  },
  {
    title: "Put it on sale", role: "Retailer", signature: "updateStatus(id, AvailableForSale)",
    why: "Only a Retailer can move a device to Available for sale.",
    actions: ({ id }) => [{ actor: 5, fn: "updateStatus", args: [id, 4], note: "Status changed to Available for sale" }],
  },
  {
    title: "Sell it", role: "Retailer", signature: "updateStatus(id, Sold)",
    why: "Sold is final. After this no one can move the device again.",
    actions: ({ id }) => [{ actor: 5, fn: "updateStatus", args: [id, 5], note: "Status changed to Sold" }],
  },
];

// Works out the next step from what is on the chain, so a page refresh never loses your place.
export function nextStepIndex(s) {
  if (!s?.exists) return 0;
  if (s.status === 0) return 1;
  if (s.status === 1) return s.holderRole === "Manufacturer" ? 2 : s.holderRole === "Distributor" ? 3 : 4;
  if (s.status === 2) return s.inspections > 0 ? 7 : s.repairs > 0 ? 6 : 5;
  if (s.status === 3) return s.holderRole === "Refurbisher" ? 8 : 9;
  if (s.status === 4) return 10;
  return STEPS.length;
}

// ---------- actions the contract must refuse ----------
export const BLOCKED = [
  {
    title: "Register the same ID again", role: "Manufacturer", expect: "Product already registered",
    why: "Every device ID can be registered once.",
    available: (s) => s.exists, whenNot: "Register the device first.",
    action: ({ id }) => ({ actor: 1, fn: "registerProduct", args: [id, MODEL] }),
  },
  {
    title: "An outsider takes the device", role: "Outsider", expect: "Only the current custodian",
    why: "Only whoever holds the device can hand it on.",
    available: (s) => s.exists, whenNot: "Register the device first.",
    action: ({ id, accounts }) => ({ actor: 6, fn: "transferCustody", args: [id, accounts[6]] }),
  },
  {
    title: "A Distributor records a repair", role: "Distributor", expect: "Caller has the wrong role",
    why: "Only Refurbishers can record repairs.",
    available: (s) => s.exists, whenNot: "Register the device first.",
    action: ({ id }) => ({ actor: 2, fn: "addRepairRecord", args: [id, "Fake repair"] }),
  },
  {
    title: "Skip a stage", role: "Manufacturer", expect: "Invalid status transition",
    why: "Stages must be passed in order. No skipping.",
    available: (s) => s.exists && s.status <= 3, whenNot: "Needs a registered device that is not yet on sale.",
    action: ({ id, snap }) => ({ actor: 1, fn: "updateStatus", args: [id, snap.status + 2] }),
  },
  {
    title: "The Refurbisher certifies its own work", role: "Refurbisher", expect: "Caller has the wrong role",
    why: "Only an independent Inspector can certify an inspection.",
    available: (s) => s.exists, whenNot: "Register the device first.",
    action: ({ id }) => ({ actor: 3, fn: "certifyInspection", args: [id, reportHash(id)] }),
  },
  {
    title: "Mark it inspected with no inspection", role: "Refurbisher", expect: "No certified inspection",
    why: "A device cannot become Inspected until an inspector has certified it.",
    available: (s) => s.exists && s.status === 2 && s.inspections === 0, whenNot: "Available while refurbishing, before the inspection step.",
    action: ({ id }) => ({ actor: 3, fn: "updateStatus", args: [id, 3] }),
  },
  {
    title: "Reuse the same inspection report", role: "Inspector", expect: "Report already certified",
    why: "A report can be certified once, so it cannot be reused for another device.",
    available: (s) => s.exists && s.status === 2 && s.inspections > 0, whenNot: "Available after the inspection step, while still refurbishing.",
    action: ({ id }) => ({ actor: 4, fn: "certifyInspection", args: [id, reportHash(id)] }),
  },
];
