const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.BACKEND_PORT || 4001);
const ODDS_API_KEY = process.env.ODDS_API_KEY || "";
const ODDS_API_BASE = process.env.ODDS_API_BASE || "https://api.the-odds-api.com/v4";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-session-secret-change-me";
const BET_SECRET = process.env.BET_SECRET || "dev-bet-secret-change-me";
const SETTLEMENT_ADMIN_KEY = process.env.SETTLEMENT_ADMIN_KEY || "dev-admin-key";

const STORE_FILE = path.join(__dirname, "data", "store.json");
const MATCH_CACHE_TTL_MS = 1000 * 60 * 4;
const SETTLEMENT_GRACE_MS = 1000 * 60 * 120;

function nowIso() {
  return new Date().toISOString();
}

function ensureStoreFile() {
  if (fs.existsSync(STORE_FILE)) return;
  const initial = {
    users: {
      "demo-user-001": {
        pin: "0000",
        balance: 750,
      },
    },
    bets: [],
    matchCache: {
      updatedAt: null,
      matches: [],
    },
    consumedIdempotency: {},
  };
  fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), "utf8");
}

function readStore() {
  ensureStoreFile();
  const raw = fs.readFileSync(STORE_FILE, "utf8");
  return JSON.parse(raw);
}

function writeStore(store) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

function signValue(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function makeSessionToken(payloadObj) {
  const payload = Buffer.from(JSON.stringify(payloadObj), "utf8").toString("base64url");
  const sig = signValue(payload, SESSION_SECRET);
  return `${payload}.${sig}`;
}

function parseSessionToken(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = signValue(payload, SESSION_SECRET);
  if (sig !== expected) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!decoded.userId || !decoded.exp) return null;
    if (Date.now() > decoded.exp) return null;
    return decoded;
  } catch {
    return null;
  }
}

function signBetRecord(bet) {
  const digestInput = [
    bet.id,
    bet.userId,
    bet.matchId,
    bet.outcomeName,
    String(bet.odds),
    String(bet.stake),
    bet.createdAt,
  ].join("|");
  return signValue(digestInput, BET_SECRET);
}

function getAuthUser(req, store) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const session = parseSessionToken(token);
  if (!session) return null;
  const user = store.users[session.userId];
  if (!user) return null;
  return { userId: session.userId, user };
}

function sampleMatches() {
  const now = Date.now();
  return [
    {
      id: "mock-1",
      sport_title: "FIFA World Cup 2026",
      commence_time: new Date(now + 1000 * 60 * 60 * 2).toISOString(),
      home_team: "Haiti",
      away_team: "Mexico",
      bookmakers: [
        {
          key: "server-mock",
          markets: [
            {
              key: "h2h",
              outcomes: [
                { name: "Haiti", price: 3.4 },
                { name: "Draw", price: 3.05 },
                { name: "Mexico", price: 1.95 },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "mock-2",
      sport_title: "FIFA World Cup 2026",
      commence_time: new Date(now + 1000 * 60 * 60 * 4).toISOString(),
      home_team: "France",
      away_team: "Brazil",
      bookmakers: [
        {
          key: "server-mock",
          markets: [
            {
              key: "h2h",
              outcomes: [
                { name: "France", price: 2.25 },
                { name: "Draw", price: 3.12 },
                { name: "Brazil", price: 2.6 },
              ],
            },
          ],
        },
      ],
    },
  ];
}

function httpGetJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.request(url, { method: "GET", headers }, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode > 299) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(body || "{}"));
        } catch {
          reject(new Error("Invalid JSON"));
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function normalizeMatch(raw) {
  return {
    id: raw.id,
    sport_title: raw.sport_title || "World Cup",
    commence_time: raw.commence_time,
    home_team: raw.home_team,
    away_team: raw.away_team,
    bookmakers: (raw.bookmakers || []).slice(0, 1).map((b) => ({
      key: b.key || "default",
      markets: (b.markets || []).filter((m) => m.key === "h2h").map((m) => ({
        key: m.key,
        outcomes: (m.outcomes || []).map((o) => ({ name: o.name, price: Number(o.price) })),
      })),
    })),
  };
}

async function refreshMatchesIfNeeded(store, force = false) {
  const updatedAtMs = Date.parse(store.matchCache.updatedAt || 0);
  const fresh = Date.now() - updatedAtMs < MATCH_CACHE_TTL_MS;
  if (!force && fresh && store.matchCache.matches.length) return store.matchCache.matches;

  let matches = [];
  if (!ODDS_API_KEY) {
    matches = sampleMatches();
  } else {
    try {
      const url = `${ODDS_API_BASE}/sports/soccer_fifa_world_cup/odds/?regions=eu&markets=h2h&oddsFormat=decimal`;
      const remote = await httpGetJson(url, { "x-api-key": ODDS_API_KEY });
      matches = remote.map(normalizeMatch).filter((m) => m.bookmakers?.[0]?.markets?.[0]?.outcomes?.length >= 2);
    } catch {
      if (store.matchCache.matches.length) {
        matches = store.matchCache.matches;
      } else {
        matches = sampleMatches();
      }
    }
  }

  store.matchCache = {
    updatedAt: nowIso(),
    matches,
  };
  writeStore(store);
  return matches;
}

function getOutcome(match, outcomeName) {
  const outcomes = match.bookmakers?.[0]?.markets?.find((m) => m.key === "h2h")?.outcomes || [];
  return outcomes.find((o) => o.name === outcomeName) || null;
}

function fallbackResultForBet(bet) {
  const seed = `${bet.id}|${bet.matchId}|${bet.createdAt}`;
  const digest = signValue(seed, BET_SECRET);
  const n = parseInt(digest.slice(0, 8), 16) % 3;
  if (n === 0) return bet.homeTeam;
  if (n === 1) return "Draw";
  return bet.awayTeam;
}

async function loadScoreWinnerMap() {
  const map = new Map();
  if (!ODDS_API_KEY) return map;
  try {
    const url = `${ODDS_API_BASE}/sports/soccer_fifa_world_cup/scores/?daysFrom=2`;
    const rows = await httpGetJson(url, { "x-api-key": ODDS_API_KEY });
    rows.forEach((row) => {
      if (!row.completed) return;
      const home = Number(row.scores?.find((s) => s.name === row.home_team)?.score || 0);
      const away = Number(row.scores?.find((s) => s.name === row.away_team)?.score || 0);
      const winner = home === away ? "Draw" : home > away ? row.home_team : row.away_team;
      map.set(row.id, winner);
    });
  } catch {
    return map;
  }
  return map;
}

async function settleBets(store) {
  const winners = await loadScoreWinnerMap();
  let changed = false;

  store.bets.forEach((bet) => {
    if (bet.status !== "pending") return;
    const kickoff = Date.parse(bet.commenceTime || bet.createdAt);
    if (!winners.has(bet.matchId) && Date.now() < kickoff + SETTLEMENT_GRACE_MS) return;

    const winner = winners.get(bet.matchId) || fallbackResultForBet(bet);
    const win = winner === bet.outcomeName;

    bet.status = "settled";
    bet.result = win ? "win" : "loss";
    bet.settledAt = nowIso();
    bet.payout = win ? Number((bet.stake * bet.odds).toFixed(2)) : 0;

    if (win) {
      const user = store.users[bet.userId];
      user.balance = Number((user.balance + bet.payout).toFixed(2));
    }

    changed = true;
  });

  if (changed) writeStore(store);
  return changed;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 50_000) req.destroy();
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function writeJson(res, code, payload) {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,x-idempotency-key,x-admin-key",
  });
  res.end(JSON.stringify(payload));
}

function safeBetForClient(bet) {
  return {
    id: bet.id,
    matchId: bet.matchId,
    teams: bet.teams,
    outcomeName: bet.outcomeName,
    odds: bet.odds,
    stake: bet.stake,
    potentialReturn: Number((bet.stake * bet.odds).toFixed(2)),
    status: bet.status,
    result: bet.result,
    payout: bet.payout,
    createdAt: bet.createdAt,
    settledAt: bet.settledAt,
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    writeJson(res, 200, { ok: true });
    return;
  }

  try {
    const store = readStore();

    if (req.method === "GET" && url.pathname === "/health") {
      writeJson(res, 200, { ok: true, now: nowIso() });
      return;
    }

    if (req.method === "POST" && url.pathname === "/auth/login") {
      const body = await parseBody(req);
      const userId = String(body.userId || "").trim();
      const pin = String(body.pin || "").trim();
      const user = store.users[userId];
      if (!user || user.pin !== pin) {
        writeJson(res, 401, { error: "Invalid credentials" });
        return;
      }

      const token = makeSessionToken({
        userId,
        exp: Date.now() + 1000 * 60 * 60 * 24,
      });
      writeJson(res, 200, { token, userId, balance: user.balance });
      return;
    }

    const auth = getAuthUser(req, store);
    if (!auth) {
      writeJson(res, 401, { error: "Unauthorized" });
      return;
    }

    await settleBets(store);

    if (req.method === "GET" && url.pathname === "/v1/me") {
      writeJson(res, 200, {
        userId: auth.userId,
        balance: auth.user.balance,
        serverTime: nowIso(),
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/v1/matches") {
      const matches = await refreshMatchesIfNeeded(store, url.searchParams.get("force") === "1");
      writeJson(res, 200, {
        updatedAt: store.matchCache.updatedAt,
        matches,
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/v1/bets") {
      const bets = store.bets
        .filter((b) => b.userId === auth.userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(safeBetForClient);
      writeJson(res, 200, { bets });
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/bets") {
      const body = await parseBody(req);
      const stake = Number(body.stake);
      const matchId = String(body.matchId || "").trim();
      const outcomeName = String(body.outcomeName || "").trim();
      const idem = String(req.headers["x-idempotency-key"] || body.idempotencyKey || "").trim();

      if (!idem) {
        writeJson(res, 400, { error: "Missing idempotency key" });
        return;
      }

      if (store.consumedIdempotency[idem]) {
        const prior = store.bets.find((b) => b.id === store.consumedIdempotency[idem]);
        if (prior) {
          writeJson(res, 200, {
            idempotent: true,
            bet: safeBetForClient(prior),
            balance: store.users[auth.userId].balance,
          });
          return;
        }
      }

      if (!Number.isFinite(stake) || stake <= 0) {
        writeJson(res, 400, { error: "Invalid stake" });
        return;
      }

      const matches = await refreshMatchesIfNeeded(store, false);
      const match = matches.find((m) => m.id === matchId);
      if (!match) {
        writeJson(res, 409, { error: "Match unavailable" });
        return;
      }

      const outcome = getOutcome(match, outcomeName);
      if (!outcome) {
        writeJson(res, 409, { error: "Outcome unavailable" });
        return;
      }

      if (auth.user.balance < stake) {
        writeJson(res, 409, { error: "Insufficient balance" });
        return;
      }

      const bet = {
        id: crypto.randomUUID(),
        userId: auth.userId,
        matchId,
        teams: `${match.home_team} vs ${match.away_team}`,
        outcomeName,
        odds: Number(outcome.price),
        stake: Number(stake.toFixed(2)),
        status: "pending",
        result: null,
        payout: 0,
        createdAt: nowIso(),
        settledAt: null,
        commenceTime: match.commence_time,
        homeTeam: match.home_team,
        awayTeam: match.away_team,
      };
      bet.integrity = signBetRecord(bet);

      auth.user.balance = Number((auth.user.balance - bet.stake).toFixed(2));
      store.bets.push(bet);
      store.consumedIdempotency[idem] = bet.id;
      writeStore(store);

      writeJson(res, 201, {
        bet: safeBetForClient(bet),
        balance: auth.user.balance,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/settlements/run") {
      const admin = String(req.headers["x-admin-key"] || "");
      if (admin !== SETTLEMENT_ADMIN_KEY) {
        writeJson(res, 403, { error: "Forbidden" });
        return;
      }
      const changed = await settleBets(store);
      writeJson(res, 200, { ok: true, changed });
      return;
    }

    writeJson(res, 404, { error: "Not found" });
  } catch (error) {
    writeJson(res, 500, { error: "Server error", detail: String(error.message || error) });
  }
});

server.listen(PORT, () => {
  console.log(`Sportsbook backend running on http://localhost:${PORT}`);
});
