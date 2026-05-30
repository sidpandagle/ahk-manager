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

fn running_session_path() -> Result<PathBuf, String> {
    Ok(appdata_dir()?.join("running_session.json"))
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
    let mut value: serde_json::Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;

    // Cache settings fields used by the Rust side
    if let Some(s) = value.get("settings") {
        if let Some(p) = s.get("ahk_exe_path").and_then(|v| v.as_str()) {
            *state.ahk_exe_path.lock().unwrap() = p.to_string();
        }
        if let Some(v) = s.get("keep_active_on_close").and_then(|v| v.as_bool()) {
            *state.keep_active_on_close.lock().unwrap() = v;
        }
    }

    // Restore an orphaned session from a previous keep_active_on_close close
    if let Ok(session_path) = running_session_path() {
        if session_path.exists() {
            if let Ok(content) = std::fs::read_to_string(&session_path) {
                if let Ok(session) = serde_json::from_str::<serde_json::Value>(&content) {
                    let pid = session.get("pid").and_then(|v| v.as_u64()).map(|v| v as u32);
                    let profile_id = session.get("profile_id").and_then(|v| v.as_str()).map(|s| s.to_string());
                    if let (Some(pid), Some(profile_id)) = (pid, profile_id) {
                        #[cfg(windows)]
                        let alive = win::is_pid_alive(pid);
                        #[cfg(not(windows))]
                        let alive = false;
                        if alive {
                            if let serde_json::Value::Object(ref mut map) = value {
                                map.insert(
                                    "active_session".to_string(),
                                    serde_json::json!({ "pid": pid, "profile_id": profile_id }),
                                );
                            }
                        } else {
                            // Orphan already exited — clean up stale session file
                            let _ = std::fs::remove_file(&session_path);
                        }
                    }
                }
            }
        }
    }

    Ok(value)
}

/// Persist profiles.json to %APPDATA%\AHKManager\.
#[tauri::command]
pub fn save_profiles(
    profiles: serde_json::Value,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Cache settings fields used by the Rust side
    if let Some(s) = profiles.get("settings") {
        if let Some(p) = s.get("ahk_exe_path").and_then(|v| v.as_str()) {
            *state.ahk_exe_path.lock().unwrap() = p.to_string();
        }
        if let Some(v) = s.get("keep_active_on_close").and_then(|v| v.as_bool()) {
            *state.keep_active_on_close.lock().unwrap() = v;
        }
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

    // 2–6. Common install locations (v2 entries first so they win over the
    // generic AutoHotkey.exe fallback, which could be either version)
    probe_paths.push(PathBuf::from(
        r"C:\Program Files\AutoHotkey\v2\AutoHotkey64.exe",
    ));
    // AHK v2 default install (no versioned subfolder) puts AutoHotkey64.exe
    // alongside AutoHotkey.exe; probe the 64-bit binary before the generic one.
    probe_paths.push(PathBuf::from(
        r"C:\Program Files\AutoHotkey\AutoHotkey64.exe",
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
        // Infer version from path rather than running the exe — AHK shows a blocking
        // "Script file not found" dialog for unrecognised flags, which hangs detection.
        let path_lower = path.to_string_lossy().to_lowercase();
        let (version, version_major) =
            if path_lower.contains("v2") || path_lower.contains("autohotkey64") {
                ("2.0".to_string(), 2u32)
            } else {
                ("1.1".to_string(), 1u32)
            };
        return Ok(AhkInfo {
            path: path.display().to_string(),
            version,
            version_major,
        });
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
pub fn apply_profile(ahk_source: String, profile_id: String, state: State<'_, AppState>) -> Result<u32, String> {
    let ahk_exe = state.ahk_exe_path.lock().unwrap().clone();
    if ahk_exe.is_empty() {
        return Err(
            "AutoHotkey path not configured. Go to Settings → AutoHotkey.exe path.".to_string(),
        );
    }

    let temp_path = std::env::temp_dir().join("ahk_manager_active.ahk");
    std::fs::write(&temp_path, ahk_source.as_bytes()).map_err(|e| e.to_string())?;

    // Stop previous child gracefully, then force-kill if needed
    {
        let mut child = state.child.lock().unwrap();
        if let Some(ref mut c) = *child {
            // Send WM_CLOSE to all windows of the old process so AHK can de-register
            // its keyboard hooks cleanly before the new instance starts.
            #[cfg(windows)]
            win::close_process_windows(c.id());

            // Wait up to 300 ms for a graceful exit.
            let deadline =
                std::time::Instant::now() + std::time::Duration::from_millis(300);
            loop {
                if matches!(c.try_wait(), Ok(Some(_))) {
                    break;
                }
                if std::time::Instant::now() >= deadline {
                    break;
                }
                std::thread::sleep(std::time::Duration::from_millis(30));
            }

            // Fall back to force-kill if still running.
            let _ = c.kill();
            let _ = c.wait();
        }
        *child = None;
    }

    // Kill any orphaned AHK process left by a previous session with keep_active_on_close
    if let Ok(session_path) = running_session_path() {
        if session_path.exists() {
            if let Ok(content) = std::fs::read_to_string(&session_path) {
                if let Ok(session) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(pid) = session.get("pid").and_then(|v| v.as_u64()).map(|v| v as u32) {
                        #[cfg(windows)]
                        win::kill_process_by_pid(pid);
                    }
                }
            }
            let _ = std::fs::remove_file(&session_path);
        }
    }

    // Brief pause so Windows fully releases the keyboard hooks before the new
    // AHK instance installs its own.
    std::thread::sleep(std::time::Duration::from_millis(100));

    // Spawn AHK outside the parent job object so it survives when keep_active_on_close
    // is enabled. CREATE_BREAKAWAY_FROM_JOB (0x01000000) breaks the process out of any
    // job the parent belongs to (e.g. Node's job when running under `npm run tauri dev`).
    // Fall back to a plain spawn if the job doesn't allow breakaway.
    #[cfg(windows)]
    let new_child: Child = {
        use std::os::windows::process::CommandExt;
        const CREATE_BREAKAWAY_FROM_JOB: u32 = 0x01000000;
        Command::new(&ahk_exe)
            .arg(&temp_path)
            .creation_flags(CREATE_BREAKAWAY_FROM_JOB)
            .spawn()
            .or_else(|_| Command::new(&ahk_exe).arg(&temp_path).spawn())
            .map_err(|e| format!("Failed to launch AutoHotkey: {e}"))?
    };
    #[cfg(not(windows))]
    let new_child: Child = Command::new(&ahk_exe)
        .arg(&temp_path)
        .spawn()
        .map_err(|e| format!("Failed to launch AutoHotkey: {e}"))?;

    let pid = new_child.id();
    *state.child.lock().unwrap() = Some(new_child);
    *state.running_profile_id.lock().unwrap() = Some(profile_id);
    Ok(pid)
}

/// Kill the currently running AHK script.
#[tauri::command]
pub fn stop_running_script(state: State<'_, AppState>) -> Result<(), String> {
    let mut child = state.child.lock().unwrap();
    if let Some(ref mut c) = *child {
        #[cfg(windows)]
        win::close_process_windows(c.id());
        let _ = c.kill();
        let _ = c.wait();
    }
    *child = None;
    *state.running_profile_id.lock().unwrap() = None;

    // Also kill any session-restored process (keep_active_on_close from a previous
    // session) — state.child is None for those, but the PID is in the session file.
    if let Ok(session_path) = running_session_path() {
        if session_path.exists() {
            if let Ok(content) = std::fs::read_to_string(&session_path) {
                if let Ok(session) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(pid) = session.get("pid").and_then(|v| v.as_u64()).map(|v| v as u32) {
                        #[cfg(windows)]
                        win::kill_process_by_pid(pid);
                    }
                }
            }
            let _ = std::fs::remove_file(&session_path);
        }
    }

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

    /// Returns true if a process with the given PID is still alive.
    pub fn is_pid_alive(pid: u32) -> bool {
        unsafe {
            // PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
            let handle = OpenProcess(0x1000, 0, pid);
            if handle == 0 { return false; }
            CloseHandle(handle);
            true
        }
    }

    /// Kill a process by PID — used to clean up orphaned AHK processes from
    /// a previous session that had keep_active_on_close enabled.
    pub fn kill_process_by_pid(pid: u32) {
        use windows_sys::Win32::System::Threading::TerminateProcess;
        close_process_windows(pid);
        unsafe {
            // PROCESS_TERMINATE = 0x0001
            let handle = OpenProcess(0x0001, 0, pid);
            if handle != 0 {
                TerminateProcess(handle, 1);
                CloseHandle(handle);
            }
        }
    }

    /// Send WM_CLOSE to every top-level window owned by `pid` so AHK can exit
    /// gracefully and de-register its keyboard hooks before being force-killed.
    pub fn close_process_windows(pid: u32) {
        use windows_sys::Win32::UI::WindowsAndMessaging::{
            EnumWindows, GetWindowThreadProcessId, PostMessageW, WM_CLOSE,
        };

        unsafe extern "system" fn enum_cb(hwnd: isize, lparam: isize) -> i32 {
            let target_pid = *(lparam as *const u32);
            let mut wnd_pid: u32 = 0;
            GetWindowThreadProcessId(hwnd, &mut wnd_pid);
            if wnd_pid == target_pid {
                PostMessageW(hwnd, WM_CLOSE, 0, 0);
            }
            1 // continue enumeration
        }

        unsafe {
            EnumWindows(Some(enum_cb), &pid as *const u32 as isize);
        }
    }

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
