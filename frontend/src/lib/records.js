import { Contract, JsonRpcProvider } from "ethers";
import { ABI, CONTRACT_ADDRESS, HARDHAT_CHAIN_ID, ROLE_NAMES, RPC_URL } from "../config.js";

// Read-only provider, so reports work without any sign-in. The fixed network avoids slow network probing.
const provider = new JsonRpcProvider(RPC_URL, Number(HARDHAT_CHAIN_ID), { staticNetwork: true });

// Reads one device. Throws if the device does not exist or the service cannot be reached.
export async function readDevice(id) {
  const records = new Contract(CONTRACT_ADDRESS, ABI, provider);
  const p = await records.getProduct(id);
  // The holder's role tells a buyer what kind of company has the device. Optional, so a failure here is not fatal.
  let holderRole = null;
  try {
    holderRole = ROLE_NAMES[Number(await records.getRole(p.currentCustodian))];
  } catch {
    /* leave null */
  }
  return { id, model: p.model, holder: p.currentCustodian, holderRole, status: Number(p.status), checkedAt: new Date() };
}

// The contract reverts with this exact text for an unknown ID.
export const isNotFound = (err) => (err.reason || err.revert?.args?.[0]) === "Product not found";
