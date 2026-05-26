mod commands;

use std::process::Child;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    /// The currently running AHK child process (if any).
    pub child: Mutex<Option<Child>>,
    /// Cached AHK exe path from the last load_profiles / save_profiles call.
    pub ahk_exe_path: Mutex<String>,
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            child: Mutex::new(None),
            ahk_exe_path: Mutex::new(String::new()),
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
                // Kill the AHK child process cleanly when the main window closes
                if let Some(state) = window.app_handle().try_state::<AppState>() {
                    let mut child = state.child.lock().unwrap();
                    if let Some(ref mut c) = *child {
                        let _ = c.kill();
                        let _ = c.wait();
                    }
                    *child = None;
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
