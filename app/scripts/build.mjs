// Static build for Gameka Studio: dist/ is the whole app (HTML/CSS/JS).
// Identity is read from app/package.json `itonami` block; the build refuses
// to run when package.json and src-tauri/tauri.conf.json disagree.
import { mkdir, copyFile, readFile, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";

export const TAURI = "3.0.0-alpha.6";
export const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src ipc: http://ipc.localhost https: http://localhost:* http://10.* http://192.168.* http://172.16.* http://172.17.* http://172.18.* http://172.19.* http://172.20.* http://172.21.* http://172.22.* http://172.23.* http://172.24.* http://172.25.* http://172.26.* http://172.27.* http://172.28.* http://172.29.* http://172.30.* http://172.31.*; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'";

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

export async function build(appRoot = fileURLToPath(new URL("../", import.meta.url))) {
  const out = resolve(appRoot, "dist");
  const meta = JSON.parse(await readFile(resolve(appRoot, "package.json"), "utf8"));
  if (!meta.itonami?.id || !meta.itonami?.title || !meta.itonami?.source) throw new Error("package.json needs itonami {id,title,source}");
  const conf = JSON.parse(await readFile(resolve(appRoot, "src-tauri/tauri.conf.json"), "utf8"));
  const expect = (what, got, want) => { if (got !== want) throw new Error(`${what} is ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); };
  expect("tauri.conf.json identifier", conf.identifier, meta.itonami.id);
  expect("tauri.conf.json productName", conf.productName, meta.itonami.title);
  expect("tauri.conf.json window title", conf.app?.windows?.[0]?.title, meta.itonami.title);
  expect("tauri.conf.json version", conf.version, meta.version);
  expect("tauri.conf.json csp", conf.app?.security?.csp, CSP);

  const identity = { id: meta.itonami.id, title: meta.itonami.title, source: meta.itonami.source };
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  const index = (await readFile(resolve(appRoot, "src/index.html"), "utf8"))
    .replaceAll("{{CSP}}", CSP)
    .replaceAll("{{TITLE}}", identity.title.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])));
  if (index.includes("{{")) throw new Error("index.html has an unfilled placeholder");
  await writeFile(join(out, "index.html"), index);
  for (const name of ["style.css", "app.js", "view.js"]) await copyFile(resolve(appRoot, "src", name), join(out, name));
  const data = { identity, version: meta.version };
  await writeFile(join(out, "data.js"), `export default ${JSON.stringify(data, null, 1)};\n`);
  const names = ["index.html", "style.css", "app.js", "view.js", "data.js"];
  const files = {};
  for (const name of names) files[name] = sha(await readFile(join(out, name)));
  const release = { schema: "awai.app.artifact.v1", id: identity.id, source: identity.source, version: meta.version, tauri: TAURI, files };
  await writeFile(join(out, "release.json"), JSON.stringify(release, null, 2) + "\n");
  return { identity, release };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { identity, release } = await build();
  console.log(`${identity.title} (${identity.id}) static build: ${Object.keys(release.files).length} files`);
}
