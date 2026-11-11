// Tiny HTTP API (no dependencies):  npm run backend

const http = require("http");
const { saveReport, loadReport } = require("./storage");

const PORT = process.env.PORT || 3001;

http
  .createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.writeHead(204).end();

    if (req.method === "POST" && req.url === "/reports") {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const body = Buffer.concat(chunks);
        if (body.length === 0) return res.writeHead(400).end("Empty body");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ reportHash: saveReport(body) }));
      });
      return;
    }

    const match = req.method === "GET" && req.url.match(/^\/reports\/(0x[0-9a-f]{64})$/);
    if (match) {
      const data = loadReport(match[1]);
      if (!data) return res.writeHead(404).end("Not found or hash mismatch");
      return res.writeHead(200).end(data);
    }

    res.writeHead(404).end("Not found");
  })
  .listen(PORT, () => console.log(`DeviceTrail backend on http://localhost:${PORT}`));
