// Address of the deployed DeviceTrail contract.
// This is the address from the first deploy on a freshly started local node. If you restarted the node
// or deployed more than once, use the address printed by `npm run deploy:local` (also in ../deployed.json).
export const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const HARDHAT_CHAIN_ID = 31337n;

// Reports are read straight from the local node. When the site is opened from another device (for example a phone
// that scanned a QR code on the same Wi-Fi), "127.0.0.1" would point at that device, so use the page's own host.
const host = window.location.hostname;
export const RPC_URL = host && host !== "localhost" && host !== "127.0.0.1" ? `http://${host}:8545` : "http://127.0.0.1:8545";

// Indexes match the Role and Status enums in IDeviceTrail.
export const ROLE_NAMES = ["None", "Manufacturer", "Distributor", "Refurbisher", "Inspector", "Retailer"];
export const STATUS_NAMES = ["Registered", "InTransit", "Refurbishing", "Inspected", "AvailableForSale", "Sold"];

// Human-readable ABI, copied from IDeviceTrail (contracts/DeviceTrail.sol), the role module,
// and the view functions of contracts/RepairInspection.sol.
export const ABI = [
  "function getRole(address stakeholder) view returns (uint8)",
  "function registerProduct(string productId, string model)",
  "function getProduct(string productId) view returns (tuple(string productId, string model, address currentCustodian, uint8 status, bool exists))",
  "function transferCustody(string productId, address newCustodian)",
  "function addRepairRecord(string productId, string repairDescription)",
  "function updateStatus(string productId, uint8 newStatus)",
  "function certifyInspection(string productId, bytes32 reportHash)",
  "function getRepairHistory(string productId) view returns (tuple(string description, address refurbisher, uint256 timestamp)[])",
  "function getInspections(string productId) view returns (tuple(bytes32 reportHash, address inspector, uint256 timestamp)[])",
  "function verifyInspectionReport(string productId, bytes32 reportHash) view returns (bool)",
  "event ProductRegistered(string productId, address manufacturer)",
  "event CustodyTransferred(string productId, address from, address to)",
  "event RepairRecorded(string productId, string repairDescription)",
  "event StatusUpdated(string productId, uint8 newStatus)",
  "event InspectionCertified(string productId, address inspector, bytes32 reportHash)",
];
