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

Network: WebView `fetch()` only (INTERNET required). Approval boundaries
(broker consent, reader/studio split) are untouched; no host filesystem /
shell / installer permissions.

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
