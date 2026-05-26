// Typed wrappers around Tauri invoke calls
// All network boundary I/O goes through this file.

import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { ProfilesFile, AhkInfo } from "./types";

// ── Profile persistence ──────────────────────────────────────────────
export async function loadProfiles(): Promise<ProfilesFile> {
  return invoke<ProfilesFile>("load_profiles");
}

export async function saveProfiles(profiles: ProfilesFile): Promise<void> {
  return invoke<void>("save_profiles", { profiles });
}

// ── AHK process control ─────────────────────────────────────────────
/** Probe for the AHK executable. Pass customPath to try a specific location first. */
export async function detectAhk(customPath?: string): Promise<AhkInfo> {
  return invoke<AhkInfo>("detect_ahk", { customPath: customPath ?? null });
}

/** Write temp .ahk file and spawn the interpreter. Returns PID. */
export async function applyProfile(ahkSource: string): Promise<number> {
  return invoke<number>("apply_profile", { ahkSource });
}

export async function stopRunningScript(): Promise<void> {
  return invoke<void>("stop_running_script");
}

export async function isScriptRunning(): Promise<boolean> {
  return invoke<boolean>("is_script_running");
}

// ── File ops ────────────────────────────────────────────────────────
/** Open save dialog → write .ahk file. Returns the chosen path string. */
export async function exportAhk(filename: string, source: string): Promise<string> {
  return invoke<string>("export_ahk", { filename, source });
}

export interface ImportResult {
  path: string;
  content: string;
}

/** Open file dialog → return the chosen path and raw .ahk file contents. */
export async function importAhk(): Promise<ImportResult> {
  return invoke<ImportResult>("import_ahk");
}

/** File picker for AutoHotkey.exe. Returns chosen path. */
export async function browseForAhkExe(): Promise<string> {
  return invoke<string>("browse_for_ahk_exe");
}

// ── Global hotkey suppression ────────────────────────────────────────
export async function startRecordingCapture(): Promise<void> {
  return invoke<void>("start_recording_capture");
}

export async function stopRecordingCapture(): Promise<void> {
  return invoke<void>("stop_recording_capture");
}

// ── Window controls ─────────────────────────────────────────────────
const win = getCurrentWindow();

export function windowMinimize(): Promise<void> {
  return win.minimize();
}

export function windowToggleMaximize(): Promise<void> {
  return win.toggleMaximize();
}

export function windowClose(): Promise<void> {
  return win.close();
}
