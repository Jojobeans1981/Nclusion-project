const http = require("http");

const PORT = process.env.BALANCE_PORT || 8787;
const balances = new Map();

function writeJson(res, code, payload) {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

function getUserId(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 2 && parts[0] === "balance") return parts[1];
  return null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    writeJson(res, 200, { ok: true });
    return;
  }

  const userId = getUserId(url.pathname);
  if (!userId) {
    writeJson(res, 404, { error: "Not found" });
    return;
  }

  if (!balances.has(userId)) balances.set(userId, 750);

  if (req.method === "GET") {
    writeJson(res, 200, { userId, balance: balances.get(userId) });
    return;
  }

  if (req.method === "PATCH") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10_000) req.destroy();
    });
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body || "{}");
        if (typeof parsed.balance !== "number" || parsed.balance < 0) {
          writeJson(res, 400, { error: "Invalid balance" });
          return;
        }
        balances.set(userId, Number(parsed.balance.toFixed(2)));
        writeJson(res, 200, { userId, balance: balances.get(userId) });
      } catch {
        writeJson(res, 400, { error: "Invalid JSON" });
      }
    });
    return;
  }

  writeJson(res, 405, { error: "Method not allowed" });
});

server.listen(PORT, () => {
  console.log(`Mock balance API running on http://localhost:${PORT}`);
});
