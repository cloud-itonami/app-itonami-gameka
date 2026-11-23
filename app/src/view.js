// Pure view model for Gameka Studio. No DOM access here; app.js turns
// nodes into elements. A node is { tag, attrs, children } or { text }.
export const TAB_PIPELINE = "pipeline";
export const TAB_RUN = "run";
export const TAB_SETTINGS = "settings";
export const TAB_ABOUT = "about";

/** Pinned Worker host. Single source of truth: app.js rpc() and all view
 * labels use this; there is no user-editable base URL (Store catalog
 * `operations` declares exactly this host). */
export const WORKER_ORIGIN = "https://gameka.etzhayyim.com";

export function tabsFor() {
  return [
    { id: TAB_PIPELINE, label: "パイプライン" },
    { id: TAB_RUN, label: "実行" },
    { id: TAB_SETTINGS, label: "設定" },
    { id: TAB_ABOUT, label: "この app について" },
  ];
}
export function node(tag, attrs = {}, children = []) { return { tag, attrs, children }; }
export function text(t) { return { text: String(t ?? "") }; }

/** The 5 pipeline stages: [id, label, action, method, input hint]. */
export const STAGES = [
  { id: "propose", label: "企画 (proposeGame)", action: "proposeGame", method: "POST", hint: "brief を送る" },
  { id: "generate", label: "生成 (generateGame)", action: "generateGame", method: "POST", hint: "specId から sources_ready を作る" },
  { id: "playtest", label: "QA (playtestGame)", action: "playtestGame", method: "POST", hint: "specId から QA を作る" },
  { id: "publish", label: "公開 (publishGame)", action: "publishGame", method: "POST", hint: "specId + artifactId から title を作る" },
  { id: "tick", label: "自動 tick (tickStudio)", action: "tickStudio", method: "POST", hint: "タイマ層の参照実装" },
];

export function panelTree(data, tabId) {
  if (tabId === TAB_RUN) return runTree(data);
  if (tabId === TAB_SETTINGS) return settingsTree(data);
  if (tabId === TAB_ABOUT) return aboutTree(data);
  return pipelineTree(data);
}

function pipelineTree(data) {
  const base = WORKER_ORIGIN;
  const hasToken = data.hasToken === true;
  const stages = STAGES.map((s) => {
    const st = data.stages?.[s.id] || {};
    const dot = st.state === "ok" ? "status-dot ok" : st.state === "err" ? "status-dot err" : st.state === "busy" ? "status-dot busy" : "status-dot";
    const stateText = st.state === "ok" ? "確認済み" : st.state === "err" ? `エラー: ${st.error || ""}` : st.state === "busy" ? "確認中" : hasToken ? "未確認" : "未確認 (token 未設定)";
    return node("div", { class: "stage" }, [
      node("h3", {}, [node("span", { class: dot }, []), text(s.label)]),
      node("p", { class: "meta" }, [text(`${s.method} /xrpc/com.etzhayyim.gameka.${s.action} — ${s.hint}`)]),
      node("p", { class: "meta" }, [text(`base: ${base} / 状態: ${stateText}${st.at ? ` / 更新: ${st.at}` : ""}${st.http ? ` / HTTP ${st.http}` : ""}`)]),
      ...(st.detail ? [node("pre", { class: "result" }, [text(st.detail)])] : []),
    ]);
  });
  return node("div", {}, [
    node("h2", {}, [text("パイプラインの状態")]),
    node("p", { class: "muted" }, [text("工程の状態を WebView から Worker へ fetch して確認します。Bearer token が無い場合は「未確認 (token 未設定)」と表示し、成功を表示しません。到達できない場合はエラーと表示します。")]),
    node("p", {}, [node("button", { id: "refresh-status" }, [text("状態を確認")])]),
    ...stages,
  ]);
}

function runTree(data) {
  return node("div", {}, [
    node("h2", {}, [text("パイプラインを実行")]),
    node("p", { class: "muted" }, [text(`送信先: ${WORKER_ORIGIN}。応答はそのまま JSON で表示します。失敗はエラーとして表示します。`)]),
    node("form", { class: "card", id: "form-propose" }, [
      node("h3", {}, [text("1. 企画 proposeGame")]),
      node("label", { for: "brief" }, [text("brief (2000 字まで)")]),
      node("textarea", { id: "brief", name: "brief", rows: "3" }, []),
      node("button", { type: "submit" }, [text("proposeGame を実行")]),
    ]),
    node("form", { class: "card", id: "form-generate" }, [
      node("h3", {}, [text("2. 生成 generateGame")]),
      node("label", { for: "gen-spec" }, [text("specId")]),
      node("input", { id: "gen-spec", name: "gen-spec", type: "text" }, []),
      node("button", { type: "submit" }, [text("generateGame を実行")]),
    ]),
    node("form", { class: "card", id: "form-playtest" }, [
      node("h3", {}, [text("3. QA playtestGame")]),
      node("label", { for: "qa-spec" }, [text("specId")]),
      node("input", { id: "qa-spec", name: "qa-spec", type: "text" }, []),
      node("button", { type: "submit" }, [text("playtestGame を実行")]),
    ]),
    node("form", { class: "card", id: "form-publish" }, [
      node("h3", {}, [text("4. 公開 publishGame")]),
      node("label", { for: "pub-spec" }, [text("specId")]),
      node("input", { id: "pub-spec", name: "pub-spec", type: "text" }, []),
      node("label", { for: "pub-art" }, [text("artifactId")]),
      node("input", { id: "pub-art", name: "pub-art", type: "text" }, []),
      node("button", { type: "submit" }, [text("publishGame を実行")]),
    ]),
    node("form", { class: "card", id: "form-tick" }, [
      node("h3", {}, [text("5. 自動 tick tickStudio")]),
      node("p", { class: "muted" }, [text("入力なし。参照実装は時刻帯のみで判定します。")]),
      node("button", { type: "submit" }, [text("tickStudio を実行")]),
    ]),
    node("pre", { class: "result", id: "run-result" }, [text("まだ結果はありません。")]),
  ]);
}

function settingsTree(data) {
  return node("div", {}, [
    node("h2", {}, [text("設定")]),
    node("p", { class: "muted" }, [text(`接続先は固定です (${WORKER_ORIGIN})。Bearer token は端末内 localStorage に保存されます。`)]),
    node("form", { class: "card", id: "form-settings" }, [
      node("label", { for: "token" }, [text("Bearer token")]),
      node("input", { id: "token", name: "token", type: "password", autocomplete: "off" }, []),
      node("button", { type: "submit" }, [text("保存")]),
    ]),
    node("p", { class: "meta" }, [text(`現在の接続先: ${WORKER_ORIGIN} / token: ${data.hasToken ? "設定済み" : "未設定"}`)]),
    node("button", { id: "clear-settings" }, [text("設定を消去")]),
    node("h3", {}, [text("13 関数リファレンス")]),
    node("div", { class: "table-scroll" }, [
      node("table", {}, [
        node("thead", {}, [node("tr", {}, [node("th", {}, [text("関数")]), node("th", {}, [text("method")]), node("th", {}, [text("接続先")])])]),
        node("tbody", {}, [
          ...["proposeGame","generateGame","playtestGame","publishGame","tickStudio","getGameSpec","listGameSpecs","getBuildArtifact","listBuildArtifacts","getGameQa","listGameQas","getGameTitle","listGameTitles"].map((fn) => {
            const isList = fn.startsWith("list") || fn.startsWith("get");
            return node("tr", {}, [node("td", {}, [text(fn)]), node("td", {}, [text(isList ? "GET" : "POST")]), node("td", {}, [text(`${WORKER_ORIGIN}/xrpc/com.etzhayyim.gameka.${fn}`)])]);
          }),
        ]),
      ]),
    ]),
  ]);
}

function aboutTree(data) {
  const identity = data.identity || {};
  return node("div", {}, [
    node("h2", {}, [text("この app について")]),
    node("dl", {}, [
      node("dt", {}, [text("id")]), node("dd", {}, [text(identity.id || "network.itonami.gameka")]),
      node("dt", {}, [text("version")]), node("dd", {}, [text(data.version || "0.1.0")]),
      node("dt", {}, [text("title")]), node("dd", {}, [text(identity.title || "Gameka Studio")]),
      node("dt", {}, [text("source")]), node("dd", {}, [text(identity.source || "app-itonami-gameka")]),
    ]),
    node("p", { class: "muted" }, [text("kotoba/ 13関数 + xrpc-adapter/ の参照実装に対する WebView 面。Worker / murakumo / broker への通信は fetch のみで、ホスト側に network 権限は持たせません。承認境界 (broker 承認、reader/studio 分担) は崩しません。")]),
    node("p", { class: "muted" }, [text(`Bearer token が無い場合は「未確認 (token 未設定)」のままです。接続先は固定 host ${WORKER_ORIGIN} です。`)]),
  ]);
}

export function toElement(doc, n) {
  if (n.text !== undefined) return doc.createTextNode(n.text);
  const el = doc.createElement(n.tag);
  for (const [k, v] of Object.entries(n.attrs || {})) { if (k === "class") el.className = v; else el.setAttribute(k, v); }
  for (const c of n.children || []) el.appendChild(toElement(doc, c));
  return el;
}
