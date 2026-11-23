// Gameka Studio shell. The page talks to the pinned Worker host
// (WORKER_ORIGIN in view.js) via fetch(); without a Bearer token the
// pipeline panel only shows "未確認 (token 未設定)".
import data from "./data.js";
import { STAGES, WORKER_ORIGIN, panelTree, tabsFor, toElement } from "./view.js";

const STORAGE_KEY = "gameka.studio.v1";
const identity = data.identity || { id: "network.itonami.gameka", title: "Gameka Studio", source: "app-itonami-gameka" };
document.getElementById("title").textContent = identity.title;
document.getElementById("classification").textContent = identity.id;

let storage = null;
try { storage = globalThis.localStorage; } catch { storage = null; }
function readSettings() {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    // Migration: a legacy value may carry baseUrl; it is ignored (the host
    // is pinned), the token is kept.
    return { token: obj.token || "" };
  } catch { return { token: "" }; }
}
function writeSettings(s) {
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

const nav = document.getElementById("tabs");
const panel = document.getElementById("panel");
let settings = readSettings();
let stages = {};

function state() { return { identity, version: data.version || "0.1.0", hasToken: Boolean(settings.token), stages }; }

const tabs = tabsFor();
let current = tabs[0].id;
try { current = storage?.getItem(STORAGE_KEY + ".tab") || current; if (!tabs.some((t) => t.id === current)) current = tabs[0].id; } catch {}

const buttons = new Map();
for (const tab of tabs) {
  const b = document.createElement("button");
  b.setAttribute("role", "tab"); b.id = `tab-${tab.id}`; b.textContent = tab.label; b.setAttribute("aria-selected", "false"); b.tabIndex = -1;
  b.addEventListener("click", () => select(tab.id));
  nav.appendChild(b); buttons.set(tab.id, b);
}
function select(id) {
  current = id;
  try { storage?.setItem(STORAGE_KEY + ".tab", id); } catch {}
  for (const t of tabs) { const active = t.id === id; buttons.get(t.id).setAttribute("aria-selected", String(active)); buttons.get(t.id).tabIndex = active ? 0 : -1; }
  panel.setAttribute("aria-labelledby", `tab-${id}`);
  panel.replaceChildren(toElement(document, panelTree(state(), id)));
  wire();
}

async function rpc(action, method, input, signal) {
  const url = `${WORKER_ORIGIN}/xrpc/com.etzhayyim.gameka.${action}`;
  const headers = { "content-type": "application/json" };
  if (settings.token) headers["authorization"] = `Bearer ${settings.token}`;
  const res = await fetch(url, { method, headers, body: method === "POST" ? JSON.stringify(input || {}) : undefined, signal });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = { raw: text }; }
  if (!res.ok && body && typeof body === "object" && body.error === undefined) body = { ...body, httpStatus: res.status };
  return { status: res.status, body };
}

async function refreshStatus() {
  if (!settings.token) {
    stages = {};
    select("pipeline");
    return;
  }
  for (const s of STAGES) { stages[s.id] = { state: "busy", at: new Date().toISOString() }; }
  select("pipeline");
  for (const s of STAGES) {
    try {
      const r = await rpc(s.action, "GET", {}, undefined);
      stages[s.id] = { state: "ok", http: r.status, at: new Date().toISOString(), detail: JSON.stringify(r.body).slice(0, 2000) };
    } catch (e) {
      stages[s.id] = { state: "err", error: String(e?.message || e).slice(0, 200), at: new Date().toISOString() };
    }
    if (current === "pipeline") select("pipeline");
  }
}

function showResult(el, label, status, body) {
  if (!el) return;
  el.textContent = `${label}\nHTTP ${status}\n${JSON.stringify(body, null, 2)}`;
}

function wire() {
  const refresh = document.getElementById("refresh-status");
  if (refresh) refresh.addEventListener("click", () => refreshStatus());
  const settingsForm = document.getElementById("form-settings");
  if (settingsForm) {
    const tokenInput = document.getElementById("token");
    if (tokenInput) tokenInput.value = settings.token;
    settingsForm.addEventListener("submit", (e) => {
      e.preventDefault();
      settings = { token: (tokenInput.value || "").trim() };
      writeSettings(settings);
      select("settings");
    });
  }
  const clear = document.getElementById("clear-settings");
  if (clear) clear.addEventListener("click", () => { settings = { token: "" }; writeSettings(settings); stages = {}; select("settings"); });
  const bind = (id, fn) => {
    const f = document.getElementById(id);
    if (f) f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = f.querySelector("button");
      if (btn) btn.disabled = true;
      const out = document.getElementById("run-result");
      try { await fn(out); } catch (err) { if (out) out.textContent = `エラー: ${err?.message || err}`; }
      if (btn) btn.disabled = false;
    });
  };
  bind("form-propose", async (out) => { const v = document.getElementById("brief").value.trim(); const r = await rpc("proposeGame", "POST", { brief: v }); showResult(out, "proposeGame", r.status, r.body); });
  bind("form-generate", async (out) => { const r = await rpc("generateGame", "POST", { specId: document.getElementById("gen-spec").value.trim() }); showResult(out, "generateGame", r.status, r.body); });
  bind("form-playtest", async (out) => { const r = await rpc("playtestGame", "POST", { specId: document.getElementById("qa-spec").value.trim() }); showResult(out, "playtestGame", r.status, r.body); });
  bind("form-publish", async (out) => { const r = await rpc("publishGame", "POST", { specId: document.getElementById("pub-spec").value.trim(), artifactId: document.getElementById("pub-art").value.trim() }); showResult(out, "publishGame", r.status, r.body); });
  bind("form-tick", async (out) => { const r = await rpc("tickStudio", "POST", {}); showResult(out, "tickStudio", r.status, r.body); });
}

select(current);
