mod changes;
mod config;
mod formats;
mod learning;
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
fn change_history(app: AppHandle) -> Result<Vec<changes::Record>, String> {
    let config = Config::load(&app).map_err(|e| e.to_string())?;
    changes::list(std::path::Path::new(&config.vault_path)).map_err(|e| e.to_string())
}
#[tauri::command]
fn change_preview(app: AppHandle, proposal: changes::Proposal) -> Result<changes::Preview, String> {
    let config = Config::load(&app).map_err(|e| e.to_string())?;
    changes::preview(std::path::Path::new(&config.vault_path), proposal).map_err(|e| e.to_string())
}
#[tauri::command]
fn change_apply(app: AppHandle, proposal: changes::Proposal) -> Result<changes::Record, String> {
    let config = Config::load(&app).map_err(|e| e.to_string())?;
    changes::apply(std::path::Path::new(&config.vault_path), proposal).map_err(|e| e.to_string())
}
#[tauri::command]
fn change_rollback(app: AppHandle, id: String) -> Result<changes::Record, String> {
    let config = Config::load(&app).map_err(|e| e.to_string())?;
    changes::rollback(std::path::Path::new(&config.vault_path), &id).map_err(|e| e.to_string())
}
#[tauri::command]
fn change_recover(app: AppHandle) -> Result<(), String> {
    let config = Config::load(&app).map_err(|e| e.to_string())?;
    changes::recover(std::path::Path::new(&config.vault_path)).map_err(|e| e.to_string())
}

#[tauri::command]
fn format_seed(app: AppHandle) -> Result<(), String> {
    let config = Config::load(&app).map_err(|e| e.to_string())?;
    formats::seed(std::path::Path::new(&config.vault_path)).map_err(|e| e.to_string())
}
#[tauri::command]
fn format_request_block(
    app: AppHandle,
    date: String,
    block: String,
    format: String,
) -> Result<(), String> {
    let config = Config::load(&app).map_err(|e| e.to_string())?;
    formats::request(
        std::path::Path::new(&config.vault_path),
        &date,
        &block,
        &format,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn vault_read_text(app: AppHandle, rel_path: String) -> Result<String, String> {
    let config = Config::load(&app).map_err(|e| e.to_string())?;
    vault::read_text(std::path::Path::new(&config.vault_path), &rel_path).map_err(|e| e.to_string())
}
#[tauri::command]
fn vault_list(app: AppHandle, rel_dir: String) -> Result<Vec<vault::VaultEntry>, String> {
    let config = Config::load(&app).map_err(|e| e.to_string())?;
    vault::list(std::path::Path::new(&config.vault_path), &rel_dir).map_err(|e| e.to_string())
}
#[tauri::command]
fn learning_snapshot(app: AppHandle) -> Result<learning::Snapshot, String> {
    let config = Config::load(&app).map_err(|e| e.to_string())?;
    Ok(learning::snapshot(std::path::Path::new(&config.vault_path)))
}
#[tauri::command]
fn learning_init(app: AppHandle, prompt: String) -> Result<(), String> {
    let config = Config::load(&app).map_err(|e| e.to_string())?;
    learning::init_protocol(std::path::Path::new(&config.vault_path), &prompt)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn today_set_done(
    app: AppHandle,
    id: String,
    done: bool,
    expected_date: String,
) -> Result<(), String> {
    static LOCK: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());
    let _guard = LOCK.lock().await;
    let config = Config::load(&app).map_err(|e| e.to_string())?;
    learning::set_task_done(
        std::path::Path::new(&config.vault_path),
        &id,
        done,
        &expected_date,
    )
    .map_err(|e| e.to_string())
}

static VOCAB_WRITE_LOCK: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

#[tauri::command]
async fn vocab_set_status(app: AppHandle, word: String, status: String) -> Result<(), String> {
    let config = Config::load(&app).map_err(|err| err.to_string())?;
    let _guard = VOCAB_WRITE_LOCK.lock().await;
    vault::vocab_set_status(std::path::Path::new(&config.vault_path), &word, &status)
        .map_err(|err| err.to_string())
}

#[tauri::command]
async fn explain_sentence(
    app: AppHandle,
    sentence: String,
) -> Result<subprocess::Explanation, String> {
    let config = Config::load(&app).map_err(|err| err.to_string())?;
    subprocess::explain_sentence(&config, &sentence)
        .await
        .map_err(|err| err.to_string())
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
    let _guard = VOCAB_WRITE_LOCK.lock().await;
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
            change_history,
            change_preview,
            change_apply,
            change_rollback,
            change_recover,
            config_get,
            format_seed,
            format_request_block,
            vault_subjects,
            vault_read_text,
            vault_list,
            learning_snapshot,
            learning_init,
            today_set_done,
            vocab_add,
            vocab_set_status,
            explain_sentence,
            translate,
            subprocess_start,
            subprocess_send,
            subprocess_stop,
            subprocess_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running mellorin");
}
