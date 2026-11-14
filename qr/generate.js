// Makes a QR code that opens the read-only verify page for one product.
//
//   npm run qr -- LAPTOP-SN-001
//   npm run qr -- LAPTOP-SN-001 --base http://192.168.1.20:8080/verify.html   (scan from a phone)
//
// Writes qr/samples/<productId>.png and prints the URL it encodes.

const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");

const DEFAULT_BASE = "http://localhost:8080/verify.html";
const DEFAULT_OUT_DIR = path.join(__dirname, "samples");

// Product IDs become file names, so keep them to safe characters.
const VALID_ID = /^[A-Za-z0-9._-]{1,64}$/;

function verifyUrl(productId, base = DEFAULT_BASE) {
  if (!VALID_ID.test(productId)) {
    throw new Error(`Invalid productId "${productId}": use 1-64 letters, digits, ".", "_" or "-"`);
  }
  const url = new URL(base);
  url.searchParams.set("productId", productId);
  return url.toString();
}

async function generateQr(productId, { base = DEFAULT_BASE, outDir = DEFAULT_OUT_DIR } = {}) {
  const url = verifyUrl(productId, base);
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${productId}.png`);
  await QRCode.toFile(file, url, { width: 400, margin: 2, errorCorrectionLevel: "M" });
  return { url, file };
}

function parseArgs(argv) {
  const args = { base: DEFAULT_BASE };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--base") args.base = argv[++i];
    else if (!args.productId) args.productId = argv[i];
  }
  return args;
}

module.exports = { verifyUrl, generateQr, DEFAULT_BASE };

if (require.main === module) {
  const { productId, base } = parseArgs(process.argv.slice(2));
  if (!productId) {
    console.error("Usage: npm run qr -- <productId> [--base <verify page URL>]");
    process.exit(1);
  }
  generateQr(productId, { base })
    .then(({ url, file }) => console.log(`QR for ${url}\nsaved to ${path.relative(process.cwd(), file)}`))
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
