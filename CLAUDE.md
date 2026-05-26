# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

AHK Manager is a Windows desktop app (Tauri 2 + React 18) for managing AutoHotkey hotkey profiles. Users create profiles, define hotkeys (trigger + action), and apply them as a running AHK process. The Rust backend spawns/kills the AHK interpreter and handles file I/O; the React frontend owns all UI and state.

## Commands

```powershell
# Full Tauri app (Rust + frontend, hot-reload)
npm run tauri dev

# Frontend only (no Rust, no native features)
npm run dev

# Production build
npm run tauri build

# TypeScript check + Vite bundle only
npm run build

# Unit tests (Vitest, run once)
npm run test

# Unit tests in watch mode
npm run test:watch

# E2E tests (Playwright)
npm run test:e2e
```

## Architecture

### Tauri IPC boundary
**All** `invoke()` calls are centralized in `src/lib/tauri.ts`. Never call `invoke()` directly elsewhere — add a typed wrapper there first. The Rust side of each command lives in `src-tauri/src/commands.rs`. The app state (`AppState`) in `src-tauri/src/lib.rs` holds a `Mutex<Option<Child>>` for the running AHK process and a cached AHK exe path.

### Frontend state (Zustand)
Three stores, all in `src/store/`:
- **`profiles.ts`** — the `Record<string, Profile>` map and `activeId`. Source of truth for all hotkey data.
- **`runtime.ts`** — ephemeral process state: `runningId`, `runningPid`, `lastApplied`, `ahkInfo`.
- **`settings.ts`** — `AppSettings` (AHK exe path, theme, density, etc.). Defaults in `DEFAULT_SETTINGS`.

App-level orchestration lives entirely in `src/App.tsx` — it wires all three stores together, drives boot/persist, and passes handlers to child components.

### Data flow
1. **Boot**: `App.tsx` calls `loadProfiles()` (Tauri) → hydrates `useProfilesStore` and `useSettingsStore`.
2. **Edits**: mutations go to the profiles store; a debounced `useEffect` (400 ms) calls `saveProfiles()` (Tauri) to persist `%APPDATA%\AHKManager\profiles.json`.
3. **Apply**: `generateAhk()` + `flattenLines()` (in `src/features/preview/ahk-codegen.ts`) produce a `.ahk` string → passed to `applyProfile()` (Tauri) → written to `%TEMP%\ahk_manager_active.ahk` and launched with the AHK exe.

### AHK code generation
`src/features/preview/ahk-codegen.ts` supports AHK v1 and v2 syntax. `generateAhk(profile, version)` returns structured `AhkLine[]` objects (used for the syntax-colored preview); `flattenLines()` converts them to a plain string for the Rust `apply_profile` command. The version is derived from `ahkInfo.version_major` at runtime.

### Feature structure
`src/features/` is organized by domain:
- `hotkeys/` — `HotkeyTable`, `HotkeyModal` (add/edit), `ConfirmDialog`
- `profiles/` — `Sidebar`
- `preview/` — `PreviewPane` (live .ahk source viewer) + codegen
- `settings/` — `SettingsModal`
- `toast/` — `ToastProvider` (context + auto-dismiss toasts)

### UI primitives
`src/components/ui/` — reusable atoms: `Button`, `Toggle`, `Keycap`, `Modal`, `Icons`, `EditableText`, `StatusPill`, `TriggerRecorder`. The `TriggerRecorder` suspends the running AHK process (via `start_recording_capture` / `stop_recording_capture` — uses `NtSuspendProcess` from `ntdll`) so hotkeys don't fire while the user records a new trigger.

### Styling
Dark-only. Design tokens are in `src/styles/tokens.css` (CSS custom properties for surfaces `--bg-0`–`--bg-5`, text, accent, semantic colors, radii, spacing). The accent color and density are applied at runtime by `src/lib/accent.ts` via `document.documentElement.style.setProperty`. Density variants use `data-density` attribute on `<html>`; kbd style uses `data-kbd`.

### Custom titlebar
The window has `decorations: false` in `tauri.conf.json`. The titlebar is a React div with `data-tauri-drag-region`. Window controls (minimize/maximize/close) call the Tauri window API through `src/lib/tauri.ts`.

## Key types

All domain types are in `src/lib/types.ts` and must mirror the Rust schema exactly:
- `Hotkey` — `{ id, trigger, action_type, action_value, append_enter, description, enabled }`
- `ActionType` — `"send_text" | "run" | "always_on_top" | "custom"`
- `Profile` — `{ id, name, hotkeys: Hotkey[] }`
- `AppSettings` — includes `ahk_exe_path`, theme object, `launch_profile_id`

## Adding a new Tauri command

1. Implement the function in `src-tauri/src/commands.rs` with `#[tauri::command]`.
2. Register it in the `invoke_handler!` macro in `src-tauri/src/lib.rs`.
3. Add a typed async wrapper in `src/lib/tauri.ts`.
