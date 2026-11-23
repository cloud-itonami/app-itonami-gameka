import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { build, CSP } from "../scripts/build.mjs";

test("build pins identity and CSP", async () => {
  const { identity, release } = await build();
  assert.equal(identity.id, "network.itonami.gameka");
  assert.ok(release.files["index.html"]);
  const index = await readFile("dist/index.html", "utf8");
  assert.match(index, new RegExp(CSP.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
