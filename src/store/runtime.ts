import { create } from "zustand";
import type { AhkInfo } from "../lib/types";

interface RuntimeState {
  runningId: string | null;
  runningPid: number | null;
  lastApplied: number | null;
  ahkInfo: AhkInfo | null;
  ahkDetecting: boolean;
}

interface RuntimeActions {
  setRunning: (profileId: string, pid: number) => void;
  clearRunning: () => void;
  setAhkInfo: (info: AhkInfo | null) => void;
  setAhkDetecting: (v: boolean) => void;
}

export type RuntimeStore = RuntimeState & RuntimeActions;

export const useRuntimeStore = create<RuntimeStore>((set) => ({
  runningId: null,
  runningPid: null,
  lastApplied: null,
  ahkInfo: null,
  ahkDetecting: false,

  setRunning(profileId, pid) {
    set({ runningId: profileId, runningPid: pid, lastApplied: Date.now() });
  },

  clearRunning() {
    set({ runningId: null, runningPid: null });
  },

  setAhkInfo(info) {
    set({ ahkInfo: info });
  },

  setAhkDetecting(v) {
    set({ ahkDetecting: v });
  },
}));
