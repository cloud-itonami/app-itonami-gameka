import { test } from "node:test";
import assert from "node:assert/strict";
import * as view from "../src/view.js";
import { tabsFor, panelTree, STAGES } from "../src/view.js";
import { CSP } from "../scripts/build.mjs";

test("tabsFor has pipeline/run/settings/about", () => {
  assert.deepEqual(tabsFor().map((t) => t.id), ["pipeline", "run", "settings", "about"]);
});
test("STAGES has 5 pipeline stages", () => {
  assert.equal(STAGES.length, 5);
  assert.equal(STAGES[0].id, "propose");
  assert.equal(STAGES[4].id, "tick");
});
test("pipelineTree shows 未確認 when no base URL", () => {
  const t = JSON.stringify(panelTree({ baseUrl: "", stages: {} }, "pipeline"));
  assert.match(t, /未確認|未設定/);
});
test("runTree has all 5 forms", () => {
  const t = JSON.stringify(panelTree({ baseUrl: "https://x" }, "run"));
  for (const id of ["form-propose", "form-generate", "form-playtest", "form-publish", "form-tick"]) assert.match(t, new RegExp(id));
});
test("no pinned host: base URL comes from state, not a constant", () => {
  // #4 pinned WORKER_ORIGIN=https://gameka.etzhayyim.com, which never
  // resolved (NXDOMAIN, measured 2026-11-24). The app must honor the
  // user-configured base URL instead of hard-coding one unreachable host.
  assert.equal(view.WORKER_ORIGIN, undefined);
  const run = JSON.stringify(panelTree({ baseUrl: "https://example.test" }, "run"));
  assert.match(run, /example\.test/);
  const pipe = JSON.stringify(panelTree({ baseUrl: "https://example.test", stages: {} }, "pipeline"));
  assert.match(pipe, /example\.test/);
});
test("settingsTree exposes the user-editable base URL field", () => {
  const t = JSON.stringify(panelTree({ baseUrl: "https://example.test" }, "settings"));
  assert.match(t, /"base-url"/);
  assert.match(t, /example\.test/);
});
test("CSP connect-src is the user-configured form, not one pinned host", () => {
  // Wide form: any https: host plus local/private ranges, so a user-set
  // base URL is reachable. The pinned form narrowed this to a single host.
  assert.match(CSP, /connect-src ipc: http:\/\/ipc\.localhost https: /);
  assert.match(CSP, /https: http:\/\/localhost:\*/);
  assert.doesNotMatch(CSP, /connect-src[^;]*https:\/\/[a-z0-9.-]+\.etzhayyim\.com;/);
});
test("about names the package id", () => {
  const t = JSON.stringify(panelTree({ identity: { id: "network.itonami.gameka", title: "Gameka Studio", source: "app-itonami-gameka" }, version: "0.1.0" }, "about"));
  assert.match(t, /network\.itonami\.gameka/);
});
