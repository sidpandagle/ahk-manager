mod commands;

use std::process::Child;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    /// The currently running AHK child process (if any).
    pub child: Mutex<Option<Child>>,
    /// Cached AHK exe path from the last load_profiles / save_profiles call.
    pub ahk_exe_path: Mutex<String>,
    /// Mirrors the keep_active_on_close setting — updated by save/load_profiles.
    pub keep_active_on_close: Mutex<bool>,
    /// Profile ID of the currently running script — needed for the session file on close.
    pub running_profile_id: Mutex<Option<String>>,
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            child: Mutex::new(None),
            ahk_exe_path: Mutex::new(String::new()),
            keep_active_on_close: Mutex::new(true),
            running_profile_id: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            commands::load_profiles,
            commands::save_profiles,
            commands::detect_ahk,
            commands::apply_profile,
            commands::stop_running_script,
            commands::is_script_running,
            commands::export_ahk,
            commands::import_ahk,
            commands::browse_for_ahk_exe,
            commands::start_recording_capture,
            commands::stop_recording_capture,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if let Some(state) = window.app_handle().try_state::<AppState>() {
                    let keep = *state.keep_active_on_close.lock().unwrap();
                    let mut child = state.child.lock().unwrap();
                    if let Some(ref mut c) = *child {
                        if keep {
                            let pid = c.id();
                            let profile_id = state
                                .running_profile_id
                                .lock()
                                .unwrap()
                                .clone()
                                .unwrap_or_default();
                            if let Ok(base) = std::env::var("APPDATA") {
                                let dir = std::path::PathBuf::from(base).join("AHKManager");
                                let _ = std::fs::create_dir_all(&dir);
                                let safe_id = profile_id.replace('"', "\\\"");
                                let json = format!(r#"{{"pid":{},"profile_id":"{}"}}"#, pid, safe_id);
                                let _ = std::fs::write(dir.join("running_session.json"), json);
                            }
                            // Drop the handle without killing — process outlives the app
                        } else {
                            let _ = c.kill();
                            let _ = c.wait();
                        }
                    }
                    *child = None;
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
