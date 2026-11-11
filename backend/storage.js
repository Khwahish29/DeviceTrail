// Off-chain report storage. Reports live as files; only the hash goes on-chain

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DIR = path.join(__dirname, "storage");

function hashReport(buffer) {
  return "0x" + crypto.createHash("sha256").update(buffer).digest("hex");
}

function saveReport(buffer) {
  fs.mkdirSync(DIR, { recursive: true });
  const hash = hashReport(buffer);
  fs.writeFileSync(path.join(DIR, hash + ".bin"), buffer);
  return hash;
}

function loadReport(hash) {
  if (!/^0x[0-9a-f]{64}$/.test(hash)) return null;
  const file = path.join(DIR, hash + ".bin");
  if (!fs.existsSync(file)) return null;
  const data = fs.readFileSync(file);
  return hashReport(data) === hash ? data : null;
}

module.exports = { hashReport, saveReport, loadReport };
