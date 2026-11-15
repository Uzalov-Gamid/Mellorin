mod config;
mod subprocess;
mod vault;

use config::Config;
use std::sync::Arc;
use subprocess::{ChatEvent, SubprocessManager};
use tauri::{AppHandle, Emitter, State};

pub struct AppState {
    pub subprocess: Arc<SubprocessManager>,
}

#[tauri::command]
fn config_get(app: AppHandle) -> Result<Config, String> {
    Config::load(&app).map_err(|err| err.to_string())
}

#[tauri::command]
async fn subprocess_start(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let config = Config::load(&app).map_err(|err| err.to_string())?;
    let app_out = app.clone();
    state
        .subprocess
        .start(
            &config,
            move |event| match event {
                ChatEvent::Delta(text) => {
                    let _ = app_out.emit("chat-delta", serde_json::json!({ "text": text }));
                }
                ChatEvent::Done => {
                    let _ = app_out.emit("chat-done", serde_json::json!({}));
                }
                ChatEvent::Error(message) => {
                    let _ = app_out.emit("chat-error", serde_json::json!({ "message": message }));
                }
            },
            move || {
                let _ = app.emit("subprocess-exit", ());
            },
        )
        .await
        .map_err(|err| err.to_string())
}

#[tauri::command]
fn vault_subjects(app: AppHandle) -> Result<Vec<vault::VaultSubject>, String> {
    let config = Config::load(&app).map_err(|err| err.to_string())?;
    vault::subjects(std::path::Path::new(&config.vault_path)).map_err(|err| err.to_string())
}

#[tauri::command]
async fn vocab_add(app: AppHandle, word: String, sentence: String) -> Result<(), String> {
    let config = Config::load(&app).map_err(|err| err.to_string())?;
    static WRITE_LOCK: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());
    let _guard = WRITE_LOCK.lock().await;
    vault::vocab_add(std::path::Path::new(&config.vault_path), &word, &sentence)
        .map_err(|err| err.to_string())
}

#[tauri::command]
async fn translate(app: AppHandle, word: String, sentence: String) -> Result<String, String> {
    let config = Config::load(&app).map_err(|err| err.to_string())?;
    subprocess::translate(&config, &word, &sentence)
        .await
        .map_err(|err| err.to_string())
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
            config_get,
            vault_subjects,
            vocab_add,
            translate,
            subprocess_start,
            subprocess_send,
            subprocess_stop,
            subprocess_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running mellorin");
}
