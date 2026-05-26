import { create } from "zustand";
import type { Profile, Hotkey, ProfilesFile } from "../lib/types";

interface ProfilesState {
  profiles: Record<string, Profile>;
  activeId: string | null;
  loaded: boolean;
}

interface ProfilesActions {
  /** Hydrate from Tauri on boot */
  hydrate: (data: ProfilesFile) => void;
  setActiveId: (id: string | null) => void;

  createProfile: () => string; // returns new id
  deleteProfile: (id: string) => void;
  duplicateProfile: (id: string) => string; // returns new id
  renameProfile: (id: string, name: string) => void;

  upsertHotkey: (profileId: string, hotkey: Hotkey) => void;
  deleteHotkey: (profileId: string, hotkeyId: string) => void;
  toggleHotkey: (profileId: string, hotkeyId: string) => void;
  duplicateHotkey: (profileId: string, hotkeyId: string) => void;
}

export type ProfilesStore = ProfilesState & ProfilesActions;

function nanoid(): string {
  return Math.random().toString(36).slice(2, 8);
}

export const useProfilesStore = create<ProfilesStore>((set, get) => ({
  profiles: {},
  activeId: null,
  loaded: false,

  hydrate(data) {
    const ids = Object.keys(data.profiles);
    set({
      profiles: data.profiles,
      activeId: ids[0] ?? null,
      loaded: true,
    });
  },

  setActiveId(id) {
    set({ activeId: id });
  },

  createProfile() {
    const id = "profile-" + nanoid();
    const count = Object.keys(get().profiles).length + 1;
    const profile: Profile = {
      id,
      name: `New Profile ${count}`,
      hotkeys: [],
    };
    set((s) => ({ profiles: { ...s.profiles, [id]: profile } }));
    return id;
  },

  deleteProfile(id) {
    set((s) => {
      const next = { ...s.profiles };
      delete next[id];
      const ids = Object.keys(next);
      return {
        profiles: next,
        activeId: s.activeId === id ? (ids[0] ?? null) : s.activeId,
      };
    });
  },

  duplicateProfile(id) {
    const src = get().profiles[id];
    if (!src) return id;
    const newId = id + "-copy-" + nanoid();
    const copy: Profile = {
      ...src,
      id: newId,
      name: src.name + " (copy)",
      hotkeys: src.hotkeys.map((h) => ({
        ...h,
        id: "h" + nanoid(),
      })),
    };
    set((s) => ({ profiles: { ...s.profiles, [newId]: copy } }));
    return newId;
  },

  renameProfile(id, name) {
    set((s) => ({
      profiles: {
        ...s.profiles,
        [id]: { ...s.profiles[id], name },
      },
    }));
  },

  upsertHotkey(profileId, hotkey) {
    set((s) => {
      const profile = s.profiles[profileId];
      if (!profile) return s;
      const exists = profile.hotkeys.some((h) => h.id === hotkey.id);
      return {
        profiles: {
          ...s.profiles,
          [profileId]: {
            ...profile,
            hotkeys: exists
              ? profile.hotkeys.map((h) => (h.id === hotkey.id ? hotkey : h))
              : [...profile.hotkeys, hotkey],
          },
        },
      };
    });
  },

  deleteHotkey(profileId, hotkeyId) {
    set((s) => {
      const profile = s.profiles[profileId];
      if (!profile) return s;
      return {
        profiles: {
          ...s.profiles,
          [profileId]: {
            ...profile,
            hotkeys: profile.hotkeys.filter((h) => h.id !== hotkeyId),
          },
        },
      };
    });
  },

  toggleHotkey(profileId, hotkeyId) {
    set((s) => {
      const profile = s.profiles[profileId];
      if (!profile) return s;
      return {
        profiles: {
          ...s.profiles,
          [profileId]: {
            ...profile,
            hotkeys: profile.hotkeys.map((h) =>
              h.id === hotkeyId ? { ...h, enabled: !h.enabled } : h
            ),
          },
        },
      };
    });
  },

  duplicateHotkey(profileId, hotkeyId) {
    set((s) => {
      const profile = s.profiles[profileId];
      if (!profile) return s;
      const src = profile.hotkeys.find((h) => h.id === hotkeyId);
      if (!src) return s;
      const copy: Hotkey = {
        ...src,
        id: "h" + nanoid(),
        description: (src.description || "Hotkey") + " (copy)",
      };
      const idx = profile.hotkeys.findIndex((h) => h.id === hotkeyId);
      const next = [...profile.hotkeys];
      next.splice(idx + 1, 0, copy);
      return {
        profiles: {
          ...s.profiles,
          [profileId]: { ...profile, hotkeys: next },
        },
      };
    });
  },
}));
