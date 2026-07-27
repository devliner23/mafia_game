use std::fs;
use std::path::PathBuf;
use tauri::Manager;

/// Saves live in the OS app-data dir, so they survive updates and land in the
/// right place on each platform without any per-OS branching here.
fn save_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("no app data dir: {e}"))?
        .join("saves");
    fs::create_dir_all(&dir).map_err(|e| format!("could not create save dir: {e}"))?;
    Ok(dir)
}

/// Slots come from the webview, so they are untrusted. Reject anything that
/// could escape the save directory.
fn slot_path(app: &tauri::AppHandle, slot: &str) -> Result<PathBuf, String> {
    if slot.is_empty()
        || slot.len() > 64
        || !slot.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err("invalid slot name".into());
    }
    Ok(save_dir(app)?.join(format!("{slot}.json")))
}

#[tauri::command]
fn save_game(app: tauri::AppHandle, slot: String, data: String) -> Result<(), String> {
    let path = slot_path(&app, &slot)?;
    // Write to a temp file then rename, so a crash mid-write cannot corrupt
    // an existing save.
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, data).map_err(|e| format!("write failed: {e}"))?;
    fs::rename(&tmp, &path).map_err(|e| format!("commit failed: {e}"))?;
    Ok(())
}

#[tauri::command]
fn load_game(app: tauri::AppHandle, slot: String) -> Result<Option<String>, String> {
    let path = slot_path(&app, &slot)?;
    if !path.exists() {
        return Ok(None);
    }
    fs::read_to_string(&path)
        .map(Some)
        .map_err(|e| format!("read failed: {e}"))
}

#[tauri::command]
fn list_saves(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let dir = save_dir(&app)?;
    let mut slots = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| format!("list failed: {e}"))? {
        let entry = entry.map_err(|e| format!("list failed: {e}"))?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                slots.push(stem.to_string());
            }
        }
    }
    slots.sort();
    Ok(slots)
}

#[tauri::command]
fn delete_save(app: tauri::AppHandle, slot: String) -> Result<(), String> {
    let path = slot_path(&app, &slot)?;
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("delete failed: {e}"))?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            save_game,
            load_game,
            list_saves,
            delete_save
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
