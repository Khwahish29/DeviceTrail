// Serves the read-only verify page on http://localhost:8080 (no extra packages needed).
//
//   npm run verify-page
//   HOST=0.0.0.0 npm run verify-page     (so a phone on the same Wi-Fi can open it)
//
// Also serves /deployed.json from the project root so the page knows the contract address.

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "127.0.0.1";
const QR_DIR = __dirname;
const DEPLOYED = path.join(__dirname, "..", "deployed.json");

const TYPES = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".json": "application/json" };

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");

  if (pathname === "/" ) return res.writeHead(302, { Location: "/verify.html" }).end();

  if (pathname === "/deployed.json") {
    if (!fs.existsSync(DEPLOYED)) return send(res, 404, "deployed.json not found: run npm run deploy:local first");
    return send(res, 200, fs.readFileSync(DEPLOYED), TYPES[".json"]);
  }

  // Only files inside qr/, and no server code.
  const file = path.normalize(path.join(QR_DIR, decodeURIComponent(pathname)));
  if (!file.startsWith(QR_DIR + path.sep) || !TYPES[path.extname(file)]) return send(res, 404, "Not found");
  fs.readFile(file, (err, data) => (err ? send(res, 404, "Not found") : send(res, 200, data, TYPES[path.extname(file)])));
});

server.listen(PORT, HOST, () => console.log(`Verify page: http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}/verify.html`));
