mod subprocess;

use std::sync::Arc;
use subprocess::SubprocessManager;
use tauri::{AppHandle, Emitter, State};

pub struct AppState {
    pub subprocess: Arc<SubprocessManager>,
}

#[tauri::command]
async fn subprocess_start(
    app: AppHandle,
    state: State<'_, AppState>,
    claude_path: String,
) -> Result<(), String> {
    let app_out = app.clone();
    let app_exit = app.clone();
    state
        .subprocess
        .start(
            &claude_path,
            move |line| {
                let _ = app_out.emit("subprocess-output", line);
            },
            move || {
                let _ = app_exit.emit("subprocess-exit", ());
            },
        )
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn subprocess_send(state: State<'_, AppState>, message: String) -> Result<(), String> {
    state
        .subprocess
        .send(&message)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn subprocess_stop(state: State<'_, AppState>) -> Result<(), String> {
    state.subprocess.stop().await.map_err(|e| e.to_string())
}

#[tauri::command]
fn subprocess_status(state: State<'_, AppState>) -> bool {
    state.subprocess.is_running()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            subprocess: Arc::new(SubprocessManager::new()),
        })
        .invoke_handler(tauri::generate_handler![
            subprocess_start,
            subprocess_send,
            subprocess_stop,
            subprocess_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running mellorin");
}
