# Gameka Studio app

Tauri v3 (3.0.0-alpha.6) WebView surface for the gameka pipeline. The repo's
`kotoba/` (13 functions) + `xrpc-adapter/` (Worker) have no UI; this `app/`
is the pipeline-status surface at 390x844 width.

## Screens

- パイプライン: 5 stages (propose / generate / playtest / publish / tick),
  each probed live via `GET /xrpc/com.etzhayyim.gameka.<action>` against the
  configured base URL. Unset/unreachable shows 未確認/エラー, never a fake
  success.
- 実行: forms to POST proposeGame / generateGame / playtestGame /
  publishGame / tickStudio; raw JSON response shown.
- 設定: base URL + Bearer token persisted in localStorage; 13-function
  reference table.
- この app について: id / version / network statement.

## Online (not offline/local)

This app is an **online** app. It requires `android.permission.INTERNET`
(verified by `aapt2 dump permissions`: `uses-permission:
name='android.permission.INTERNET'`, in addition to the Tauri
`DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`). The permission is needed
because `src/app.js` calls `fetch()` from the WebView against a
user-configured Worker / murakumo / broker base URL; without network the
stage probes and execution forms do not function. It is **not** an
offline/local app. Approval boundaries (broker consent,
reader/studio split) are untouched; no host filesystem / shell / installer
permissions.

## ホストの到達確認（DNS / 実行時）

接続先ホストをコードに固定するのは、そのホストが DNS で解決し
XRPC を返すことを実測してからにする（#4 は未解決のホストに固定
してしまったため revert された）。ホストの存在確認はテストでは
主張できないので、実行時に次の手順で測る:

```sh
# 1. DNS が引けるか（出力が無ければ NXDOMAIN 相当・未配備）
dig +short gameka.etzhayyim.com A

# 2. HTTP が返るか（200 / JSON が返るホスト名が実ホスト）
curl -sS -D- -o /dev/null https://gameka.etzhayyim.com/
curl -sS -D- -X POST -H 'content-type: application/json' -d '{}' \
  https://<base>/xrpc/com.etzhayyim.gameka.proposeGame

# 3. Worker が Cloudflare 側に実在するか
cd ../xrpc-adapter && npx wrangler deployments list
```

2026-11-24 実測: `gameka.etzhayyim.com` は DNS で解決せず
（`dig` 出力なし、`curl: (6) Could not resolve host`）、
`gameka-xrpc-adapter` は account `4da88288…` に未配備
（`This Worker does not exist on your account [code: 10007]`）。
`etzhayyim.com` 自体は解決するが `atproto.etzhayyim.com` 等は
530（origin/worker 無し）を返すため、到達可能な gameka XRPC の
実ホストは存在しない。したがってこの app はユーザー設定の
base URL のままとし、実ホストが配備された時点で pin の
再検討はその実測値に基づいて行う。

## Build

```sh
export PATH="$HOME/.cargo/bin:$PATH"
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export ANDROID_HOME=$HOME/Library/Android/sdk
export NDK_HOME=$HOME/Library/Android/sdk/ndk/27.0.12077973
cd app
npm ci && npm run build && node_modules/.bin/tauri android build --debug --apk --target aarch64 --ci
```

APK: `app/src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk`
