import { test } from "node:test";
import assert from "node:assert/strict";
import { tabsFor, panelTree, STAGES } from "../src/view.js";

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
test("about names the package id", () => {
  const t = JSON.stringify(panelTree({ identity: { id: "network.itonami.gameka", title: "Gameka Studio", source: "app-itonami-gameka" }, version: "0.1.0" }, "about"));
  assert.match(t, /network\.itonami\.gameka/);
});
