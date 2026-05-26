# AHK Manager

A desktop application for creating, organizing, and running [AutoHotkey](https://www.autohotkey.com) scripts — without writing a single line of AHK by hand.

Built with **Tauri v2**, **React 18**, and **TypeScript**. Runs natively on Windows.

---

## Features

- **Profile-based organization** — group hotkeys into named profiles and switch between them instantly
- **Visual hotkey editor** — record triggers and configure actions through a clean UI
- **Action types** — `Send Text`, `Run Command`, `Always on Top`, and `Custom AHK`
- **Live .ahk preview** — see the generated script source update in real time
- **One-click apply / stop** — spawns and kills the AHK process directly from the app
- **Export & Import** — save a profile as a `.ahk` file or open an existing one
- **Auto-detects AutoHotkey** — finds AHK v1 or v2 from standard install paths
- **Theming** — accent color, density (tight / comfortable / spacious), and keycap style
- **Launch profile** — optionally auto-apply a profile on startup
- **Persistent storage** — data saved to `%APPDATA%\AHKManager\profiles.json`

---

## Prerequisites

| Requirement | Minimum version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org) | 18+ | LTS recommended |
| [Rust + Cargo](https://rustup.rs) | 1.77+ | Install via `rustup` |
| [AutoHotkey](https://www.autohotkey.com) | v1.1 or v2 | Windows only |
| [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) | any | Usually pre-installed on Windows 10/11 |

> **Windows only.** AutoHotkey is a Windows-specific tool; the Tauri backend uses Windows APIs for process management.

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/fudge-fantastic/ahk-manager.git
cd ahk-manager
```

### 2. Install JavaScript dependencies

```bash
npm install
```

### 3. Run in development mode

```bash
npm run tauri dev
```

This starts the Vite dev server on `http://localhost:1420` and launches the Tauri window. Hot-reload is active for the React frontend; Rust changes trigger a full recompile.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run tauri dev` | Start the full app in development mode (Tauri + Vite HMR) |
| `npm run tauri build` | Build a production installer (NSIS / MSI) in `src-tauri/target/release/` |
| `npm run dev` | Start the Vite frontend only (no Tauri window — for UI-only work) |
| `npm run build` | Compile TypeScript and bundle the frontend with Vite |
| `npm run preview` | Preview the production frontend build |
| `npm run test` | Run unit tests once with Vitest |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:e2e` | Run end-to-end tests with Playwright |

---

## Building for Production

```bash
npm run tauri build
```

Artifacts are placed in `src-tauri/target/release/bundle/`:
- `nsis/` — NSIS installer (`.exe`)
- `msi/` — WiX MSI installer (`.msi`)

---

## Project Structure

```
ahk-manager/
├── src/                        # React + TypeScript frontend
│   ├── App.tsx                 # Root component & application logic
│   ├── main.tsx                # React entry point
│   ├── components/ui/          # Reusable UI primitives (Button, Modal, Keycap…)
│   ├── features/
│   │   ├── hotkeys/            # Hotkey table, modal, confirm dialog
│   │   ├── preview/            # Live .ahk preview pane & code generator
│   │   ├── profiles/           # Sidebar profile list
│   │   ├── settings/           # Settings modal
│   │   └── toast/              # Toast notification system
│   ├── store/                  # Zustand state (profiles, runtime, settings)
│   ├── lib/
│   │   ├── types.ts            # Shared TypeScript types
│   │   ├── tauri.ts            # Tauri command wrappers
│   │   ├── accent.ts           # CSS variable theming utilities
│   │   └── keyboard.ts         # Global keyboard shortcut registration
│   └── styles/                 # CSS design tokens & global styles
├── src-tauri/                  # Rust / Tauri backend
│   ├── src/
│   │   ├── main.rs             # Tauri app entry point
│   │   ├── lib.rs              # AppState (child process, AHK path)
│   │   └── commands.rs         # Tauri commands (load/save, apply, export…)
│   ├── tauri.conf.json         # App config (window size, bundle, identifiers)
│   ├── Cargo.toml              # Rust dependencies
│   └── icons/                  # App icons
├── design/                     # Static design mockups / prototypes
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + N` | New hotkey |
| `Ctrl + Enter` | Apply / Stop the active profile |
| `Ctrl + F` | Focus the search bar |

---

## How It Works

1. **Profiles** are collections of hotkeys stored in `%APPDATA%\AHKManager\profiles.json`.
2. When you click **Apply**, the app generates a `.ahk` script from the active profile and writes it to a temp file (`%TEMP%\ahk_manager_active.ahk`).
3. Tauri spawns the AutoHotkey process with that script, tracking the PID.
4. **Stop** kills the child process. Switching profiles or editing hotkeys prompts a re-apply.
5. During trigger recording, the running AHK process is suspended via `NtSuspendProcess` so its own hotkeys don't interfere.

---

## Data Storage

All data is saved automatically to:

```
%APPDATA%\AHKManager\profiles.json
```

No registry entries are created. Uninstalling the app leaves this file in place — delete it manually if you want a clean slate.

---

## Troubleshooting

**"AutoHotkey not found"**
→ Install AutoHotkey from [autohotkey.com](https://www.autohotkey.com) or set the path manually in **Settings → AutoHotkey.exe path**.

**Hotkeys not firing after editing**
→ The running script is not updated live. Click **Re-apply** (or press `Ctrl+Enter`) to restart it with the latest changes.

**WebView2 missing**
→ Download the [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) from Microsoft.

**Rust compile errors after pulling**
→ Run `rustup update` to ensure your toolchain is current.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Tauri v2](https://tauri.app) |
| Frontend | [React 18](https://react.dev) + [TypeScript](https://www.typescriptlang.org) |
| Bundler | [Vite 5](https://vitejs.dev) |
| State management | [Zustand](https://zustand-demo.pmnd.rs) |
| Schema validation | [Zod](https://zod.dev) |
| Backend | [Rust](https://www.rust-lang.org) |
| Testing | [Vitest](https://vitest.dev) + [Playwright](https://playwright.dev) |

---

## License

MIT
