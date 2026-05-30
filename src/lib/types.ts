// Core domain types — mirror the Rust schema exactly

export type ActionType = "send_text" | "run" | "always_on_top" | "custom";

export interface Hotkey {
  id: string;
  trigger: string;          // AHK syntax: "^+4", "^SPACE", "F1", etc.
  action_type: ActionType;
  action_value: string;     // text body, command, or raw AHK
  append_enter: boolean;
  description: string;
  enabled: boolean;
}

export interface Profile {
  id: string;
  name: string;
  hotkeys: Hotkey[];
}

export interface AppSettings {
  ahk_exe_path: string;
  launch_profile_id: string | null;
  start_minimized: boolean;
  keep_active_on_close: boolean;
  theme: {
    accent: string;
    density: "tight" | "comfortable" | "spacious";
    kbd_style: "raised" | "chip" | "inline";
    show_preview: boolean;
  };
}

export interface ProfilesFile {
  profiles: Record<string, Profile>;
  settings: AppSettings;
  active_session?: { pid: number; profile_id: string };
}

export interface AhkInfo {
  path: string;
  version: string;
  version_major: number;
}

export type ToastKind = "success" | "warn" | "error" | "info";

export interface ToastPayload {
  title: string;
  desc?: string;
  kind?: ToastKind;
  duration?: number;
}

// Accent color preset — used for computing derived CSS variables
export interface AccentPreset {
  hi: string;
  lo: string;
  ring: string;
  soft: string;
}
