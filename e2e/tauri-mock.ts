/**
 * Tauri 2 IPC mock — injected via page.addInitScript() in every E2E test.
 *
 * The @tauri-apps/api packages call `window.__TAURI_INTERNALS__.invoke()`
 * for all IPC. Mocking that single entry-point lets us drive the full React
 * application in a plain browser / Playwright session without a running
 * Tauri process.
 */

// Default mock state (can be overridden per-test via page.evaluate)
const defaultProfiles = {
  profiles: {} as Record<string, unknown>,
  settings: {
    ahk_exe_path: "",
    launch_profile_id: null,
    start_minimized: false,
    theme: {
      accent: "#7c5cff",
      density: "comfortable",
      kbd_style: "raised",
      show_preview: true,
    },
  },
};

export function tauriMockScript(): string {
  // This string is evaluated in the browser context — no closure variables
  return `
(function() {
  var _savedProfiles = ${JSON.stringify(defaultProfiles)};
  var _isRunning = false;
  var _runningPid = 0;

  var _invoke = async function(cmd, args) {
    switch (cmd) {
      case "load_profiles":
        return _savedProfiles;

      case "save_profiles":
        _savedProfiles = args.profiles;
        return;

      case "detect_ahk":
        return { path: "C:\\\\Program Files\\\\AutoHotkey\\\\AutoHotkey.exe", version: "2.0.18", version_major: 2 };

      case "apply_profile":
        _isRunning = true;
        _runningPid = Math.floor(Math.random() * 90000) + 10000;
        return _runningPid;

      case "stop_running_script":
        _isRunning = false;
        _runningPid = 0;
        return;

      case "is_script_running":
        return _isRunning;

      case "export_ahk":
        return "C:\\\\Users\\\\User\\\\Downloads\\\\" + (args.filename || "export.ahk");

      case "import_ahk":
        throw new Error("Cancelled");

      case "browse_for_ahk_exe":
        throw new Error("Cancelled");

      case "start_recording_capture":
      case "stop_recording_capture":
        return;

      // Window controls — handled by Window class which calls invoke internally
      case "plugin:window|minimize":
      case "plugin:window|toggle_maximize":
      case "plugin:window|close":
        return;

      default:
        console.warn("[tauri-mock] Unhandled command:", cmd, args);
        return null;
    }
  };

  // Tauri 2 internal API shape
  window.__TAURI_INTERNALS__ = {
    invoke: _invoke,
    metadata: {
      currentWindow: { label: "main" },
      windows: [{ label: "main", url: window.location.href }],
    },
    plugins: {},
    convertFileSrc: function(src) { return src; },
    transformCallback: function(cb, once) {
      var id = Math.floor(Math.random() * 1e9);
      window["_" + id] = once ? function(v) { delete window["_" + id]; cb(v); } : cb;
      return id;
    },
    __invoke: _invoke,
    ipc: function(msg) {
      return _invoke(msg.cmd, msg.callback, msg.error, msg.payload || {});
    },
  };

  // Also expose helpers so tests can manipulate state
  window.__TAURI_MOCK__ = {
    getProfiles: function() { return _savedProfiles; },
    setRunning: function(v) { _isRunning = v; },
    isRunning: function() { return _isRunning; },
  };
})();
`;
}
