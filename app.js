const STORE_KEY = "haiti_sportsbook_state_v2";
const DEFAULT_BALANCE = 750;
const CACHE_TTL_MS = 1000 * 60 * 10;
const STALE_MATCH_FALLBACK_MS = 1000 * 60 * 60 * 24;

const CONFIG = {
  backendApiBase: localStorage.getItem("backendApiBase") || "",
  backendToken: localStorage.getItem("backendToken") || "",
  userPin: localStorage.getItem("userPin") || "0000",
  oddsApiKey: localStorage.getItem("oddsApiKey") || "",
  oddsApiBase: "https://api.the-odds-api.com/v4",
  balanceApiBase: localStorage.getItem("balanceApiBase") || "",
  userId: localStorage.getItem("userId") || "demo-user-001",
};

const i18n = {
  ht: {
    appTitle: "Pari Espo Ayiti",
    appSubtitle: "Platfom paryaj espotif ki mache menm ak entenet feb",
    languageLabel: "Lang",
    balance: "Balans",
    network: "Rezo",
    matches: "Match yo",
    refresh: "Rafrechi",
    betSlip: "Bodwo Pari",
    selectedMatch: "Match chwazi",
    selectedOutcome: "Rezilta",
    odds: "Kot",
    stake: "Miz (HTGN)",
    placeBet: "Plase Pari",
    openBets: "Pari Ouve",
    settledBets: "Pari Fini",
    syncNow: "Senkronize",
    netOnline: "An liy",
    netOffline: "Pa gen rezo",
    queuedBets: "Pari an atant senkronizasyon",
    noQueuedBets: "Pa gen okenn aksyon an ke",
    matchesFromCache: "Done soti nan memwa lokal",
    matchCardTime: "Komanse",
    matchCardLeague: "Tounwa",
    statusQueued: "an ke",
    statusConfirmed: "konfime",
    statusPending: "an kou",
    statusSettledWin: "gagne",
    statusSettledLoss: "pedi",
    statusSettledVoid: "anile",
    betQueuedMsg: "Pari a estoke lokalman epi li pral voye le rezo retounen.",
    betPlacedMsg: "Pari a voye. N ap tann konfimasyon.",
    betInvalidMsg: "Chwazi yon match, yon rezilta, epi antre yon miz valab.",
    lowBalance: "Balans pa sifi pou miz sa.",
    openEmpty: "Pa gen pari ouve.",
    settledEmpty: "Pa gen pari fini.",
    winAmount: "Peman",
    lossAmount: "Pedi",
    lastUpdate: "Dernye mizajou",
    matchMetaFresh: "Odds mete ajou",
    matchMetaStale: "Odds lokal (rezo limite)",
    settingsTitle: "Konfigirasyon API",
    backendApiLabel: "URL Backend API",
    userPinLabel: "PIN",
    oddsApiKeyLabel: "Kle API Odds",
    balanceApiLabel: "URL API Balans",
    userIdLabel: "ID Itilizate",
    saveSettings: "Sove Konfigirasyon",
    authFailed: "Koneksyon backend echwe; verifye URL/PIN.",
    syncedServer: "Senkronize ak backend an.",
  },
  fr: {
    appTitle: "Pari Sport Haiti",
    appSubtitle: "Plateforme de pari sportif qui fonctionne meme avec un reseau faible",
    languageLabel: "Langue",
    balance: "Solde",
    network: "Reseau",
    matches: "Matchs",
    refresh: "Actualiser",
    betSlip: "Ticket de Pari",
    selectedMatch: "Match selectionne",
    selectedOutcome: "Resultat",
    odds: "Cote",
    stake: "Mise (HTGN)",
    placeBet: "Placer le Pari",
    openBets: "Paris Ouverts",
    settledBets: "Paris Regles",
    syncNow: "Synchroniser",
    netOnline: "En ligne",
    netOffline: "Hors ligne",
    queuedBets: "Paris en attente de synchronisation",
    noQueuedBets: "Aucune action en file",
    matchesFromCache: "Donnees depuis le cache local",
    matchCardTime: "Debut",
    matchCardLeague: "Competition",
    statusQueued: "en file",
    statusConfirmed: "confirme",
    statusPending: "en attente",
    statusSettledWin: "gagne",
    statusSettledLoss: "perdu",
    statusSettledVoid: "annule",
    betQueuedMsg: "Le pari est stocke localement et sera envoye quand le reseau revient.",
    betPlacedMsg: "Pari envoye. En attente de confirmation.",
    betInvalidMsg: "Choisissez un match, un resultat et une mise valide.",
    lowBalance: "Solde insuffisant.",
    openEmpty: "Aucun pari ouvert.",
    settledEmpty: "Aucun pari regle.",
    winAmount: "Gain",
    lossAmount: "Perte",
    lastUpdate: "Derniere mise a jour",
    matchMetaFresh: "Cotes actualisees",
    matchMetaStale: "Cotes locales (reseau limite)",
    settingsTitle: "Configuration API",
    backendApiLabel: "URL API Backend",
    userPinLabel: "PIN",
    oddsApiKeyLabel: "Cle API Odds",
    balanceApiLabel: "URL API Solde",
    userIdLabel: "ID Utilisateur",
    saveSettings: "Enregistrer",
    authFailed: "Echec connexion backend; verifiez URL/PIN.",
    syncedServer: "Synchronise avec le backend.",
  },
};

const els = {
  langSelect: document.getElementById("langSelect"),
  balanceValue: document.getElementById("balanceValue"),
  balanceSyncState: document.getElementById("balanceSyncState"),
  networkState: document.getElementById("networkState"),
  queueState: document.getElementById("queueState"),
  matchList: document.getElementById("matchList"),
  refreshMatchesBtn: document.getElementById("refreshMatchesBtn"),
  matchMeta: document.getElementById("matchMeta"),
  selectedMatch: document.getElementById("selectedMatch"),
  selectedOutcome: document.getElementById("selectedOutcome"),
  selectedOdds: document.getElementById("selectedOdds"),
  stakeInput: document.getElementById("stakeInput"),
  betForm: document.getElementById("betForm"),
  betFormStatus: document.getElementById("betFormStatus"),
  openBetsList: document.getElementById("openBetsList"),
  settledBetsList: document.getElementById("settledBetsList"),
  syncNowBtn: document.getElementById("syncNowBtn"),
  settingsForm: document.getElementById("settingsForm"),
  backendApiInput: document.getElementById("backendApiInput"),
  userPinInput: document.getElementById("userPinInput"),
  oddsApiKeyInput: document.getElementById("oddsApiKeyInput"),
  balanceApiInput: document.getElementById("balanceApiInput"),
  userIdInput: document.getElementById("userIdInput"),
};

const state = {
  lang: "ht",
  balance: DEFAULT_BALANCE,
  balanceLastSync: null,
  matches: [],
  matchesUpdatedAt: null,
  matchesSource: "cache",
  bets: [],
  queue: [],
  activeSelection: null,
};

function t(key) {
  return i18n[state.lang]?.[key] || i18n.ht[key] || key;
}

function usingBackend() {
  return Boolean(CONFIG.backendApiBase);
}

function baseUrl(value) {
  return value.replace(/\/$/, "");
}

function formatMoney(value) {
  return `HTGN ${Number(value || 0).toFixed(2)}`;
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString(state.lang === "fr" ? "fr-FR" : "ht-HT", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function restoreState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    Object.assign(state, JSON.parse(raw));
  } catch {
    // ignore
  }
}

function setStatusMessage(message, isError = false) {
  els.betFormStatus.textContent = message;
  els.betFormStatus.style.color = isError ? "#9d2a2a" : "";
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.getAttribute("data-i18n"));
  });
  els.networkState.textContent = navigator.onLine ? t("netOnline") : t("netOffline");
  els.queueState.textContent = state.queue.length
    ? `${state.queue.length} ${t("queuedBets")}`
    : t("noQueuedBets");
  renderBalance();
  renderMatches();
  renderBets();
}

function setupLanguageSelect() {
  els.langSelect.innerHTML = "";
  [
    { code: "ht", label: "Kreyol Ayisyen" },
    { code: "fr", label: "Francais" },
  ].forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.code;
    opt.textContent = item.label;
    opt.selected = item.code === state.lang;
    els.langSelect.appendChild(opt);
  });
  els.langSelect.addEventListener("change", (event) => {
    state.lang = event.target.value;
    saveState();
    applyTranslations();
  });
}

function hydrateSettings() {
  els.backendApiInput.value = CONFIG.backendApiBase;
  els.userPinInput.value = CONFIG.userPin;
  els.oddsApiKeyInput.value = CONFIG.oddsApiKey;
  els.balanceApiInput.value = CONFIG.balanceApiBase;
  els.userIdInput.value = CONFIG.userId;
}

function renderBalance() {
  els.balanceValue.textContent = formatMoney(state.balance);
  const syncText = state.balanceLastSync ? `${t("lastUpdate")}: ${formatTime(state.balanceLastSync)}` : `${t("lastUpdate")}: --`;
  els.balanceSyncState.textContent = syncText;
}

function renderMatches() {
  els.matchList.innerHTML = "";
  if (!state.matches.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = t("matchesFromCache");
    els.matchList.appendChild(empty);
    return;
  }

  state.matches.forEach((match) => {
    const card = document.getElementById("matchCardTemplate").content.firstElementChild.cloneNode(true);
    const teams = `${match.home_team} vs ${match.away_team}`;
    card.querySelector(".teams").textContent = teams;
    card.querySelector(".meta").textContent = `${t("matchCardLeague")}: ${match.sport_title} | ${t("matchCardTime")}: ${formatTime(match.commence_time)}`;

    const outcomes = match.bookmakers?.[0]?.markets?.find((m) => m.key === "h2h")?.outcomes || [];
    const row = card.querySelector(".odds-row");
    [match.home_team, "Draw", match.away_team].forEach((name) => {
      const entry = outcomes.find((x) => x.name === name);
      const btn = document.createElement("button");
      btn.className = "btn odd";
      btn.type = "button";
      btn.textContent = entry ? `${name} ${entry.price}` : `${name} --`;
      btn.disabled = !entry;
      btn.addEventListener("click", () => {
        state.activeSelection = {
          matchId: match.id,
          teams,
          outcomeName: name,
          odds: Number(entry.price),
          commenceTime: match.commence_time,
          homeTeam: match.home_team,
          awayTeam: match.away_team,
        };
        saveState();
        hydrateBetSlip();
      });
      row.appendChild(btn);
    });

    els.matchList.appendChild(card);
  });

  const freshness = state.matchesSource === "live" ? t("matchMetaFresh") : t("matchMetaStale");
  const timePart = state.matchesUpdatedAt ? ` - ${formatTime(state.matchesUpdatedAt)}` : "";
  els.matchMeta.textContent = `${freshness}${timePart}`;
}

function hydrateBetSlip() {
  if (!state.activeSelection) {
    els.selectedMatch.value = "";
    els.selectedOutcome.value = "";
    els.selectedOdds.value = "";
    return;
  }
  els.selectedMatch.value = state.activeSelection.teams;
  els.selectedOutcome.value = state.activeSelection.outcomeName;
  els.selectedOdds.value = String(state.activeSelection.odds);
}

function renderBets() {
  const open = state.bets.filter((b) => ["queued", "pending", "confirmed"].includes(b.status));
  const settled = state.bets.filter((b) => b.status === "settled");

  els.openBetsList.innerHTML = "";
  if (!open.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = t("openEmpty");
    els.openBetsList.appendChild(p);
  }
  open
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .forEach((bet) => {
      const card = document.getElementById("betCardTemplate").content.firstElementChild.cloneNode(true);
      const status = t(`status${bet.status.charAt(0).toUpperCase()}${bet.status.slice(1)}`);
      card.querySelector(".row-1").innerHTML = `${bet.teams} <span class="status-chip">${status}</span>`;
      card.querySelector(".row-2").textContent = `${bet.outcomeName} | ${t("odds")} ${bet.odds} | ${t("stake")} ${formatMoney(bet.stake)}`;
      els.openBetsList.appendChild(card);
    });

  els.settledBetsList.innerHTML = "";
  if (!settled.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = t("settledEmpty");
    els.settledBetsList.appendChild(p);
  }
  settled
    .sort((a, b) => (b.settledAt || "").localeCompare(a.settledAt || ""))
    .forEach((bet) => {
      const card = document.getElementById("betCardTemplate").content.firstElementChild.cloneNode(true);
      const resultKey = bet.result === "win" ? "statusSettledWin" : bet.result === "loss" ? "statusSettledLoss" : "statusSettledVoid";
      const chipClass = bet.result === "win" ? "win" : "loss";
      card.querySelector(".row-1").innerHTML = `${bet.teams} <span class="status-chip ${chipClass}">${t(resultKey)}</span>`;
      const pnlLabel = bet.result === "win" ? t("winAmount") : t("lossAmount");
      const pnl = bet.result === "win" ? bet.payout : bet.stake;
      card.querySelector(".row-2").textContent = `${bet.outcomeName} | ${pnlLabel}: ${formatMoney(pnl)} | ${formatTime(bet.settledAt)}`;
      els.settledBetsList.appendChild(card);
    });
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
      bookmakers: [{ markets: [{ key: "h2h", outcomes: [{ name: "Haiti", price: 3.4 }, { name: "Draw", price: 3.05 }, { name: "Mexico", price: 1.95 }] }] }],
    },
  ];
}

async function fetchJson(url, options = {}, includeAuth = false) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (includeAuth && CONFIG.backendToken) {
    headers.Authorization = `Bearer ${CONFIG.backendToken}`;
  }
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function loginBackend() {
  if (!usingBackend() || !navigator.onLine) return;
  const url = `${baseUrl(CONFIG.backendApiBase)}/auth/login`;
  const data = await fetchJson(url, {
    method: "POST",
    body: JSON.stringify({ userId: CONFIG.userId, pin: CONFIG.userPin || "0000" }),
  });
  CONFIG.backendToken = data.token;
  localStorage.setItem("backendToken", CONFIG.backendToken);
  state.balance = Number(data.balance || state.balance);
  state.balanceLastSync = new Date().toISOString();
  saveState();
}

async function loadMatches(force = false) {
  const hasCache = state.matches.length && state.matchesUpdatedAt;
  const isFresh = hasCache && Date.now() - Date.parse(state.matchesUpdatedAt) < CACHE_TTL_MS;
  if (!force && isFresh) {
    state.matchesSource = "cache";
    renderMatches();
    return;
  }
  if (!navigator.onLine) {
    state.matchesSource = "cache";
    renderMatches();
    return;
  }

  try {
    let matches;
    if (usingBackend()) {
      if (!CONFIG.backendToken) await loginBackend();
      const data = await fetchJson(`${baseUrl(CONFIG.backendApiBase)}/v1/matches${force ? "?force=1" : ""}`, {}, true);
      matches = data.matches || [];
    } else if (CONFIG.oddsApiKey) {
      const data = await fetchJson(`${CONFIG.oddsApiBase}/sports/soccer_fifa_world_cup/odds/?regions=eu&markets=h2h&oddsFormat=decimal`, {
        headers: { "x-api-key": CONFIG.oddsApiKey },
      });
      matches = data;
    } else {
      matches = sampleMatches();
    }

    state.matches = matches.slice(0, 30).filter((m) => m.bookmakers?.[0]?.markets?.[0]?.outcomes?.length);
    state.matchesUpdatedAt = new Date().toISOString();
    state.matchesSource = "live";
    saveState();
    renderMatches();
  } catch {
    if (!state.matches.length || Date.now() - Date.parse(state.matchesUpdatedAt || 0) > STALE_MATCH_FALLBACK_MS) {
      state.matches = sampleMatches();
      state.matchesUpdatedAt = new Date().toISOString();
      saveState();
    }
    state.matchesSource = "cache";
    renderMatches();
  }
}

async function syncBalance() {
  if (!navigator.onLine) return;
  try {
    if (usingBackend()) {
      if (!CONFIG.backendToken) await loginBackend();
      const me = await fetchJson(`${baseUrl(CONFIG.backendApiBase)}/v1/me`, {}, true);
      state.balance = Number(me.balance);
      state.balanceLastSync = new Date().toISOString();
      saveState();
      return;
    }

    if (CONFIG.balanceApiBase) {
      const data = await fetchJson(`${baseUrl(CONFIG.balanceApiBase)}/balance/${CONFIG.userId}`);
      state.balance = Number(data.balance);
      state.balanceLastSync = new Date().toISOString();
      saveState();
    }
  } catch {
    // no-op
  }
}

async function syncBetsFromBackend() {
  if (!usingBackend() || !navigator.onLine) return;
  try {
    if (!CONFIG.backendToken) await loginBackend();
    const data = await fetchJson(`${baseUrl(CONFIG.backendApiBase)}/v1/bets`, {}, true);
    const byId = new Map(state.bets.map((b) => [b.id, b]));
    (data.bets || []).forEach((remoteBet) => {
      byId.set(remoteBet.id, { ...remoteBet });
    });
    state.bets = Array.from(byId.values());
    saveState();
  } catch {
    // no-op
  }
}

function createLocalBet(selection, stake) {
  return {
    id: `local-${uid()}`,
    matchId: selection.matchId,
    teams: selection.teams,
    outcomeName: selection.outcomeName,
    odds: Number(selection.odds),
    stake: Number(stake),
    potentialReturn: Number((stake * selection.odds).toFixed(2)),
    status: "queued",
    result: null,
    payout: 0,
    createdAt: new Date().toISOString(),
    settledAt: null,
    commenceTime: selection.commenceTime,
    homeTeam: selection.homeTeam,
    awayTeam: selection.awayTeam,
  };
}

async function submitBet(bet) {
  state.bets.push(bet);
  state.balance = Number((state.balance - bet.stake).toFixed(2));
  const queueItem = { id: uid(), type: "PLACE_BET", betId: bet.id, createdAt: new Date().toISOString(), attempts: 0 };
  state.queue.push(queueItem);
  saveState();
  applyTranslations();

  if (navigator.onLine) {
    setStatusMessage(t("betPlacedMsg"));
    await syncQueue();
  } else {
    setStatusMessage(t("betQueuedMsg"));
  }
}

function mapRemoteBetToLocal(remote) {
  return {
    id: remote.id,
    matchId: remote.matchId,
    teams: remote.teams,
    outcomeName: remote.outcomeName,
    odds: Number(remote.odds),
    stake: Number(remote.stake),
    potentialReturn: Number(remote.potentialReturn || remote.stake * remote.odds),
    status: remote.status,
    result: remote.result,
    payout: Number(remote.payout || 0),
    createdAt: remote.createdAt,
    settledAt: remote.settledAt,
  };
}

async function processQueueItem(item) {
  if (item.type !== "PLACE_BET") return true;
  const bet = state.bets.find((b) => b.id === item.betId);
  if (!bet) return true;

  if (usingBackend()) {
    if (!CONFIG.backendToken) await loginBackend();
    const data = await fetchJson(`${baseUrl(CONFIG.backendApiBase)}/v1/bets`, {
      method: "POST",
      headers: { "x-idempotency-key": item.id },
      body: JSON.stringify({ matchId: bet.matchId, outcomeName: bet.outcomeName, stake: bet.stake }),
    }, true);

    const mapped = mapRemoteBetToLocal(data.bet);
    Object.assign(bet, mapped);
    state.balance = Number(data.balance);
    return true;
  }

  await new Promise((resolve) => setTimeout(resolve, 250));
  bet.status = "pending";
  if (CONFIG.balanceApiBase) {
    await fetchJson(`${baseUrl(CONFIG.balanceApiBase)}/balance/${CONFIG.userId}`, {
      method: "PATCH",
      body: JSON.stringify({ balance: state.balance }),
    });
  }
  return true;
}

async function syncQueue() {
  if (!navigator.onLine || !state.queue.length) {
    applyTranslations();
    return;
  }

  for (let i = 0; i < state.queue.length; i += 1) {
    const item = state.queue[i];
    try {
      item.attempts += 1;
      await processQueueItem(item);
      state.queue.splice(i, 1);
      i -= 1;
    } catch (error) {
      if (usingBackend() && [400, 409].includes(error.status)) {
        const bet = state.bets.find((b) => b.id === item.betId);
        if (bet && bet.status === "queued") {
          bet.status = "settled";
          bet.result = "void";
          bet.payout = bet.stake;
          bet.settledAt = new Date().toISOString();
          state.balance = Number((state.balance + bet.stake).toFixed(2));
        }
        state.queue.splice(i, 1);
        i -= 1;
        continue;
      }
      break;
    }
  }

  saveState();
  applyTranslations();
}

function fallbackResultForBet(bet) {
  const seed = `${bet.matchId}:${bet.outcomeName}:${bet.createdAt}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const mod = Math.abs(hash) % 3;
  if (mod === 0) return bet.homeTeam;
  if (mod === 1) return "Draw";
  return bet.awayTeam;
}

async function settleEligibleBetsLocal() {
  if (usingBackend()) return;
  let changed = false;
  state.bets.forEach((bet) => {
    if (bet.status !== "pending") return;
    const kickoff = Date.parse(bet.commenceTime || bet.createdAt);
    if (Date.now() < kickoff + 1000 * 60 * 120) return;
    const winner = fallbackResultForBet(bet);
    const win = winner === bet.outcomeName;
    bet.status = "settled";
    bet.result = win ? "win" : "loss";
    bet.settledAt = new Date().toISOString();
    if (win) {
      bet.payout = Number((bet.stake * bet.odds).toFixed(2));
      state.balance = Number((state.balance + bet.payout).toFixed(2));
    } else {
      bet.payout = 0;
    }
    changed = true;
  });
  if (changed) {
    state.balanceLastSync = new Date().toISOString();
    saveState();
    applyTranslations();
  }
}

function wireEvents() {
  els.betForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const stake = Number(els.stakeInput.value);
    if (!state.activeSelection || !Number.isFinite(stake) || stake <= 0) {
      setStatusMessage(t("betInvalidMsg"), true);
      return;
    }
    if (stake > state.balance) {
      setStatusMessage(t("lowBalance"), true);
      return;
    }

    const bet = createLocalBet(state.activeSelection, stake);
    els.stakeInput.value = "";
    await submitBet(bet);
  });

  els.refreshMatchesBtn.addEventListener("click", async () => {
    await loadMatches(true);
  });

  els.syncNowBtn.addEventListener("click", async () => {
    await syncQueue();
    await syncBalance();
    await syncBetsFromBackend();
    await settleEligibleBetsLocal();
    applyTranslations();
    if (usingBackend()) setStatusMessage(t("syncedServer"));
  });

  window.addEventListener("online", async () => {
    await loadMatches(false);
    await syncQueue();
    await syncBalance();
    await syncBetsFromBackend();
    await settleEligibleBetsLocal();
    applyTranslations();
  });

  window.addEventListener("offline", () => {
    applyTranslations();
  });

  els.settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    CONFIG.backendApiBase = els.backendApiInput.value.trim();
    CONFIG.userPin = els.userPinInput.value.trim() || "0000";
    CONFIG.oddsApiKey = els.oddsApiKeyInput.value.trim();
    CONFIG.balanceApiBase = els.balanceApiInput.value.trim();
    CONFIG.userId = els.userIdInput.value.trim() || "demo-user-001";

    localStorage.setItem("backendApiBase", CONFIG.backendApiBase);
    localStorage.setItem("userPin", CONFIG.userPin);
    localStorage.setItem("oddsApiKey", CONFIG.oddsApiKey);
    localStorage.setItem("balanceApiBase", CONFIG.balanceApiBase);
    localStorage.setItem("userId", CONFIG.userId);

    if (!CONFIG.backendApiBase) {
      CONFIG.backendToken = "";
      localStorage.removeItem("backendToken");
    }

    try {
      if (usingBackend() && navigator.onLine) {
        await loginBackend();
      }
      await loadMatches(true);
      await syncBalance();
      await syncBetsFromBackend();
      setStatusMessage(usingBackend() ? t("syncedServer") : t("betPlacedMsg"));
    } catch {
      setStatusMessage(t("authFailed"), true);
    }

    saveState();
    applyTranslations();
  });
}

function initializeStateDefaults() {
  if (!["ht", "fr"].includes(state.lang)) state.lang = "ht";
  if (typeof state.balance !== "number") state.balance = DEFAULT_BALANCE;
  if (!Array.isArray(state.matches)) state.matches = [];
  if (!Array.isArray(state.bets)) state.bets = [];
  if (!Array.isArray(state.queue)) state.queue = [];
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch {
    // optional
  }
}

async function init() {
  restoreState();
  initializeStateDefaults();
  setupLanguageSelect();
  hydrateSettings();
  hydrateBetSlip();
  wireEvents();
  applyTranslations();

  if (!state.matches.length) {
    state.matches = sampleMatches();
    state.matchesUpdatedAt = new Date().toISOString();
  }

  if (usingBackend() && navigator.onLine) {
    try {
      await loginBackend();
    } catch {
      setStatusMessage(t("authFailed"), true);
    }
  }

  await registerServiceWorker();
  await loadMatches(false);
  await syncBalance();
  await syncBetsFromBackend();
  await syncQueue();
  await settleEligibleBetsLocal();
  applyTranslations();

  setInterval(async () => {
    await settleEligibleBetsLocal();
    if (usingBackend() && navigator.onLine) {
      await syncBetsFromBackend();
      await syncBalance();
      applyTranslations();
    }
  }, 1000 * 45);

  setInterval(() => loadMatches(false), 1000 * 60 * 4);
}

init();
