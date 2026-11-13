// Paste the address printed by `npm run deploy:local` (also saved as "contract" in ../deployed.json).
export const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";

export const HARDHAT_CHAIN_ID = 31337n;
export const RPC_URL = "http://127.0.0.1:8545";

// Indexes match the Role and Status enums in IDeviceTrail.
export const ROLE_NAMES = ["None", "Manufacturer", "Distributor", "Refurbisher", "Inspector", "Retailer"];
export const STATUS_NAMES = ["Registered", "InTransit", "Refurbishing", "Inspected", "AvailableForSale", "Sold"];

// Human-readable ABI, copied from the IDeviceTrail interface.
export const ABI = [
  "function getRole(address stakeholder) view returns (uint8)",
  "function registerProduct(string productId, string model)",
  "function getProduct(string productId) view returns (tuple(string productId, string model, address currentCustodian, uint8 status, bool exists))",
  "event ProductRegistered(string productId, address manufacturer)",
];
