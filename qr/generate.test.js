// Run with: npm run test:qr

const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { verifyUrl, generateQr, DEFAULT_BASE } = require("./generate");

test("builds the verify page URL with the productId", () => {
  assert.strictEqual(verifyUrl("LAPTOP-SN-001"), `${DEFAULT_BASE}?productId=LAPTOP-SN-001`);
});

test("uses a custom base URL, e.g. a LAN address for phones", () => {
  assert.strictEqual(
    verifyUrl("PHONE-1", "http://192.168.1.20:8080/verify.html"),
    "http://192.168.1.20:8080/verify.html?productId=PHONE-1",
  );
});

test("rejects empty, too long, or unsafe product IDs", () => {
  for (const bad of ["", "../etc/passwd", "a b", "x".repeat(65), "id?x=1"]) {
    assert.throws(() => verifyUrl(bad), /Invalid productId/, bad);
  }
});

test("writes a PNG named after the product", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qr-"));
  try {
    const { file, url } = await generateQr("LAPTOP-SN-001", { outDir: dir });
    assert.strictEqual(file, path.join(dir, "LAPTOP-SN-001.png"));
    assert.strictEqual(url, `${DEFAULT_BASE}?productId=LAPTOP-SN-001`);
    const header = fs.readFileSync(file).subarray(0, 8);
    assert.deepStrictEqual([...header], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
