import { create } from "zustand";
import type { AppSettings } from "../lib/types";

export const DEFAULT_SETTINGS: AppSettings = {
  ahk_exe_path: "C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe",
  launch_profile_id: null,
  start_minimized: false,
  keep_active_on_close: true,
  theme: {
    accent: "#7c5cff",
    density: "comfortable",
    kbd_style: "raised",
    show_preview: true,
  },
};

interface SettingsState {
  settings: AppSettings;
}

interface SettingsActions {
  loadSettings: (s: AppSettings) => void;
  updateSettings: (partial: Partial<Omit<AppSettings, "theme">>) => void;
  updateTheme: (partial: Partial<AppSettings["theme"]>) => void;
}

export type SettingsStore = SettingsState & SettingsActions;

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: DEFAULT_SETTINGS,

  loadSettings(s) {
    set({
      settings: {
        ...DEFAULT_SETTINGS,
        ...s,
        ahk_exe_path: s.ahk_exe_path || DEFAULT_SETTINGS.ahk_exe_path,
        theme: { ...DEFAULT_SETTINGS.theme, ...s.theme },
      },
    });
  },

  updateSettings(partial) {
    set((state) => ({
      settings: { ...state.settings, ...partial },
    }));
  },

  updateTheme(partial) {
    set((state) => ({
      settings: {
        ...state.settings,
        theme: { ...state.settings.theme, ...partial },
      },
    }));
  },
}));
