// Gameka Studio shell: all state lives in the WebView (localStorage) and the
// host exposes one read-only command. Network calls to the Worker / murakumo /
// broker happen from the WebView via fetch() to a user-configured base URL;
// there is no filesystem, shell or installer permission. The app id comes from
// tauri.conf.json at build time (see build.rs).
#[tauri::command]
fn awai_host_info() -> serde_json::Value {
    serde_json::json!({"schema": "awai.shell.host.v1", "app": env!("ITONAMI_APP_ID")})
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .runtime(tauri_runtime_wry::Wry::default())
        .invoke_handler(tauri::generate_handler![awai_host_info])
        .run(tauri::generate_context!())
        .expect("gameka studio app failed to start");
}
