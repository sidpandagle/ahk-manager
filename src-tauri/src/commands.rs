use std::path::PathBuf;
use std::process::{Child, Command};
use tauri::State;

use crate::AppState;

// ── Helpers ──────────────────────────────────────────────────────────────────

fn appdata_dir() -> Result<PathBuf, String> {
    let base = std::env::var("APPDATA").map_err(|e| e.to_string())?;
    let dir = PathBuf::from(base).join("AHKManager");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn profiles_path() -> Result<PathBuf, String> {
    Ok(appdata_dir()?.join("profiles.json"))
}

// ── Profile persistence ───────────────────────────────────────────────────────

/// Read profiles.json from %APPDATA%\AHKManager\.
/// Returns null if the file doesn't exist yet (first launch).
#[tauri::command]
pub fn load_profiles(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let path = profiles_path()?;
    if !path.exists() {
        return Ok(serde_json::Value::Null);
    }
    let raw = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let value: serde_json::Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;

    // Cache AHK exe path so apply_profile can use it
    if let Some(p) = value
        .get("settings")
        .and_then(|s| s.get("ahk_exe_path"))
        .and_then(|v| v.as_str())
    {
        *state.ahk_exe_path.lock().unwrap() = p.to_string();
    }

    Ok(value)
}

/// Persist profiles.json to %APPDATA%\AHKManager\.
#[tauri::command]
pub fn save_profiles(
    profiles: serde_json::Value,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Cache AHK exe path so apply_profile can use it without re-reading disk
    if let Some(p) = profiles
        .get("settings")
        .and_then(|s| s.get("ahk_exe_path"))
        .and_then(|v| v.as_str())
    {
        *state.ahk_exe_path.lock().unwrap() = p.to_string();
    }

    let path = profiles_path()?;
    let json = serde_json::to_string_pretty(&profiles).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

// ── AHK detection ─────────────────────────────────────────────────────────────

#[derive(serde::Serialize)]
pub struct AhkInfo {
    pub path: String,
    pub version: String,
    pub version_major: u32,
}

/// Probe common AHK install paths (and optional custom_path first).
/// Runs the found executable with the /version argument to confirm it works.
#[tauri::command]
pub fn detect_ahk(custom_path: Option<String>) -> Result<AhkInfo, String> {
    let mut probe_paths: Vec<PathBuf> = Vec::new();

    // 1. Custom path (from Settings draft — passed explicitly)
    if let Some(ref p) = custom_path {
        if !p.is_empty() {
            probe_paths.push(PathBuf::from(p));
        }
    }

    // 2–5. Common install locations
    probe_paths.push(PathBuf::from(
        r"C:\Program Files\AutoHotkey\v2\AutoHotkey64.exe",
    ));
    probe_paths.push(PathBuf::from(
        r"C:\Program Files\AutoHotkey\AutoHotkey.exe",
    ));
    probe_paths.push(PathBuf::from(
        r"C:\Program Files (x86)\AutoHotkey\AutoHotkey.exe",
    ));
    probe_paths.push(PathBuf::from(
        r"C:\Program Files\AutoHotkey\v1\AutoHotkey.exe",
    ));

    for path in &probe_paths {
        if !path.exists() {
            continue;
        }
        // AHK v2 uses --version (double dash); AHK v1 uses /version (single slash).
        // Passing /version to v2 shows a "Script file not found" dialog, so pick the
        // right flag based on whether the path looks like a v2 install.
        let path_str = path.to_string_lossy().to_lowercase();
        let version_flag = if path_str.contains("v2") || path_str.contains("autohotkey64") {
            "--version"
        } else {
            "/version"
        };
        if let Ok(output) = Command::new(path).arg(version_flag).output() {
            let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();
            // AHK v2 writes version to stdout; v1 may write nothing or write to stderr
            let version = if !raw.is_empty() {
                raw
            } else {
                // Fallback: read from file version info (heuristic from path)
                if path.to_string_lossy().contains("v2") {
                    "2.0".to_string()
                } else {
                    "1.1".to_string()
                }
            };
            let version_major: u32 = version
                .split('.')
                .next()
                .and_then(|v| v.parse().ok())
                .unwrap_or(1);
            return Ok(AhkInfo {
                path: path.display().to_string(),
                version,
                version_major,
            });
        }
    }

    Err(
        "AutoHotkey not found. Install from https://www.autohotkey.com or set the path in Settings."
            .to_string(),
    )
}

// ── Script process management ─────────────────────────────────────────────────

/// Write AHK source to a temp file, kill any running script, spawn new one.
/// Returns the new process PID.
#[tauri::command]
pub fn apply_profile(ahk_source: String, state: State<'_, AppState>) -> Result<u32, String> {
    let ahk_exe = state.ahk_exe_path.lock().unwrap().clone();
    if ahk_exe.is_empty() {
        return Err(
            "AutoHotkey path not configured. Go to Settings → AutoHotkey.exe path.".to_string(),
        );
    }

    let temp_path = std::env::temp_dir().join("ahk_manager_active.ahk");
    std::fs::write(&temp_path, ahk_source.as_bytes()).map_err(|e| e.to_string())?;

    // Kill previous child if running
    {
        let mut child = state.child.lock().unwrap();
        if let Some(ref mut c) = *child {
            let _ = c.kill();
            let _ = c.wait();
        }
        *child = None;
    }

    let new_child: Child = Command::new(&ahk_exe)
        .arg(&temp_path)
        .spawn()
        .map_err(|e| format!("Failed to launch AutoHotkey: {e}"))?;

    let pid = new_child.id();
    *state.child.lock().unwrap() = Some(new_child);
    Ok(pid)
}

/// Kill the currently running AHK script.
#[tauri::command]
pub fn stop_running_script(state: State<'_, AppState>) -> Result<(), String> {
    let mut child = state.child.lock().unwrap();
    if let Some(ref mut c) = *child {
        c.kill().map_err(|e| e.to_string())?;
        let _ = c.wait();
    }
    *child = None;
    Ok(())
}

/// Returns true if the child process is still running.
#[tauri::command]
pub fn is_script_running(state: State<'_, AppState>) -> bool {
    let mut child = state.child.lock().unwrap();
    match *child {
        None => false,
        Some(ref mut c) => match c.try_wait() {
            Ok(Some(_)) => {
                // Process exited — clean up
                *child = None;
                false
            }
            Ok(None) => true, // Still running
            Err(_) => false,
        },
    }
}

// ── File I/O commands ─────────────────────────────────────────────────────────

/// Show a Save dialog then write the .ahk source. Returns the chosen path.
#[tauri::command]
pub async fn export_ahk(
    filename: String,
    source: String,
    app: tauri::AppHandle,
) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;

    let path = app
        .dialog()
        .file()
        .set_file_name(&filename)
        .add_filter("AutoHotkey Script", &["ahk"])
        .blocking_save_file()
        .ok_or_else(|| "Cancelled".to_string())?;

    let path_str = path_to_string(&path)?;
    std::fs::write(&path_str, source.as_bytes()).map_err(|e| e.to_string())?;
    Ok(path_str)
}

/// Return type for import_ahk so the frontend gets both path and content.
#[derive(serde::Serialize)]
pub struct ImportResult {
    pub path: String,
    pub content: String,
}

/// Show an Open dialog and return both the chosen file path and raw .ahk contents.
#[tauri::command]
pub async fn import_ahk(app: tauri::AppHandle) -> Result<ImportResult, String> {
    use tauri_plugin_dialog::DialogExt;

    let path = app
        .dialog()
        .file()
        .add_filter("AutoHotkey Script", &["ahk"])
        .blocking_pick_file()
        .ok_or_else(|| "Cancelled".to_string())?;

    let path_str = path_to_string(&path)?;
    let content = std::fs::read_to_string(&path_str).map_err(|e| e.to_string())?;
    Ok(ImportResult { path: path_str, content })
}

/// Show an Open dialog filtered to .exe. Returns the chosen path string.
#[tauri::command]
pub async fn browse_for_ahk_exe(app: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;

    let path = app
        .dialog()
        .file()
        .add_filter("Executable", &["exe"])
        .blocking_pick_file()
        .ok_or_else(|| "Cancelled".to_string())?;

    path_to_string(&path)
}

fn path_to_string(fp: &tauri_plugin_dialog::FilePath) -> Result<String, String> {
    match fp {
        tauri_plugin_dialog::FilePath::Path(p) => Ok(p.display().to_string()),
        tauri_plugin_dialog::FilePath::Url(u) => {
            u.to_file_path()
                .map(|p| p.display().to_string())
                .map_err(|_| "Failed to convert URL to path".to_string())
        }
    }
}

// ── Recording capture (global-hotkey suppression) ─────────────────────────────

/// Suspend the running AHK child process so its hotkeys don't fire during
/// trigger recording. Uses the undocumented NtSuspendProcess from ntdll.
#[tauri::command]
pub fn start_recording_capture(state: State<'_, AppState>) -> Result<(), String> {
    #[cfg(windows)]
    {
        let child = state.child.lock().unwrap();
        if let Some(ref c) = *child {
            let pid = c.id();
            drop(child); // release lock before FFI call
            win::suspend_process(pid)?;
        }
    }
    #[cfg(not(windows))]
    let _ = state;
    Ok(())
}

/// Resume the suspended AHK child process.
#[tauri::command]
pub fn stop_recording_capture(state: State<'_, AppState>) -> Result<(), String> {
    #[cfg(windows)]
    {
        let child = state.child.lock().unwrap();
        if let Some(ref c) = *child {
            let pid = c.id();
            drop(child);
            win::resume_process(pid)?;
        }
    }
    #[cfg(not(windows))]
    let _ = state;
    Ok(())
}

// ── Windows-specific NtSuspendProcess / NtResumeProcess ───────────────────────

#[cfg(windows)]
mod win {
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::System::Threading::OpenProcess;

    // PROCESS_SUSPEND_RESUME = 0x0800
    const PROCESS_SUSPEND_RESUME: u32 = 0x0800;

    #[link(name = "ntdll")]
    extern "system" {
        fn NtSuspendProcess(process_handle: isize) -> i32;
        fn NtResumeProcess(process_handle: isize) -> i32;
    }

    pub fn suspend_process(pid: u32) -> Result<(), String> {
        unsafe {
            let handle = OpenProcess(PROCESS_SUSPEND_RESUME, 0, pid);
            if handle == 0 {
                return Err(format!("OpenProcess failed for PID {pid}"));
            }
            NtSuspendProcess(handle);
            CloseHandle(handle);
        }
        Ok(())
    }

    pub fn resume_process(pid: u32) -> Result<(), String> {
        unsafe {
            let handle = OpenProcess(PROCESS_SUSPEND_RESUME, 0, pid);
            if handle == 0 {
                return Err(format!("OpenProcess failed for PID {pid}"));
            }
            NtResumeProcess(handle);
            CloseHandle(handle);
        }
        Ok(())
    }
}
