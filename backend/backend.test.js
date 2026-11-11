// Tests for the off-chain report storage and API.   npm run test:backend

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { hashReport, saveReport, loadReport } = require("./storage");

const REPORT = Buffer.from("Inspection passed: battery 98%");

test("hashReport returns a 0x-prefixed 32-byte hex string", () => {
  assert.match(hashReport(REPORT), /^0x[0-9a-f]{64}$/);
});

test("the same bytes always give the same hash", () => {
  assert.strictEqual(hashReport(REPORT), hashReport(Buffer.from(REPORT)));
});

test("saveReport then loadReport returns the original bytes", () => {
  const hash = saveReport(REPORT);
  assert.deepStrictEqual(loadReport(hash), REPORT);
});

test("loadReport rejects malformed and unknown hashes", () => {
  assert.strictEqual(loadReport("not-a-hash"), null);
  assert.strictEqual(loadReport("0x" + "0".repeat(64)), null);
});

test("loadReport detects a tampered file", () => {
  const hash = saveReport(Buffer.from("original report"));
  fs.writeFileSync(path.join(__dirname, "storage", hash + ".bin"), "changed");
  assert.strictEqual(loadReport(hash), null);
});

test("HTTP API: POST /reports then GET /reports/:hash", async () => {
  const port = 3900 + Math.floor(Math.random() * 90);
  const server = spawn("node", [path.join(__dirname, "server.js")], { env: { ...process.env, PORT: port } });
  await new Promise((resolve) => server.stdout.once("data", resolve));
  try {
    const post = await fetch(`http://localhost:${port}/reports`, { method: "POST", body: REPORT });
    const { reportHash } = await post.json();
    assert.strictEqual(reportHash, hashReport(REPORT));

    const get = await fetch(`http://localhost:${port}/reports/${reportHash}`);
    assert.strictEqual(get.status, 200);
    assert.strictEqual(Buffer.from(await get.arrayBuffer()).toString(), REPORT.toString());

    const empty = await fetch(`http://localhost:${port}/reports`, { method: "POST", body: "" });
    assert.strictEqual(empty.status, 400);
  } finally {
    server.kill();
  }
});
