import { test } from "node:test";
import assert from "node:assert/strict";
import { tabsFor, panelTree, STAGES, WORKER_ORIGIN } from "../src/view.js";

const HOST_RE = /gameka\.etzhayyim\.com/;

test("tabsFor has pipeline/run/settings/about", () => {
  assert.deepEqual(tabsFor().map((t) => t.id), ["pipeline", "run", "settings", "about"]);
});
test("STAGES has 5 pipeline stages", () => {
  assert.equal(STAGES.length, 5);
  assert.equal(STAGES[0].id, "propose");
  assert.equal(STAGES[4].id, "tick");
});
test("WORKER_ORIGIN is the pinned host", () => {
  assert.equal(WORKER_ORIGIN, "https://gameka.etzhayyim.com");
});
test("pipelineTree shows token-missing 未確認 when no token", () => {
  const t = JSON.stringify(panelTree({ hasToken: false, stages: {} }, "pipeline"));
  assert.match(t, /未確認 \(token 未設定\)/);
  assert.match(t, HOST_RE);
});
test("pipelineTree shows plain 未確認 when token present", () => {
  const t = JSON.stringify(panelTree({ hasToken: true, stages: {} }, "pipeline"));
  assert.match(t, /状態: 未確認/);
  assert.doesNotMatch(t, /状態: 未確認 \(token/);
});
test("runTree has all 5 forms and the pinned host", () => {
  const t = JSON.stringify(panelTree({}, "run"));
  for (const id of ["form-propose", "form-generate", "form-playtest", "form-publish", "form-tick"]) assert.match(t, new RegExp(id));
  assert.match(t, HOST_RE);
});
test("settingsTree has no base-url field, only token", () => {
  const t = JSON.stringify(panelTree({}, "settings"));
  assert.doesNotMatch(t, /base-url/);
  assert.match(t, /"token"/);
  assert.match(t, /gameka\.etzhayyim\.com\/xrpc\/com\.etzhayyim\.gameka\.proposeGame/);
});
test("about names the package id", () => {
  const t = JSON.stringify(panelTree({ identity: { id: "network.itonami.gameka", title: "Gameka Studio", source: "app-itonami-gameka" }, version: "0.1.0" }, "about"));
  assert.match(t, /network\.itonami\.gameka/);
});
