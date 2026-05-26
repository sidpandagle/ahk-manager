// Accent color system — maps preset hex values to derived CSS variables

import type { AccentPreset } from "./types";

export const ACCENT_PRESETS: Record<string, AccentPreset> = {
  "#7c5cff": {
    hi: "#9277ff",
    lo: "#5e3fe6",
    ring: "rgba(124,92,255,0.32)",
    soft: "rgba(124,92,255,0.14)",
  },
  "#2ee68a": {
    hi: "#5af0a4",
    lo: "#1ec070",
    ring: "rgba(46,230,138,0.32)",
    soft: "rgba(46,230,138,0.14)",
  },
  "#ff6b35": {
    hi: "#ff8a5e",
    lo: "#e85820",
    ring: "rgba(255,107,53,0.32)",
    soft: "rgba(255,107,53,0.14)",
  },
  "#ededf0": {
    hi: "#ffffff",
    lo: "#c4c4cc",
    ring: "rgba(237,237,240,0.32)",
    soft: "rgba(237,237,240,0.10)",
  },
};

export const ACCENT_OPTIONS = Object.keys(ACCENT_PRESETS) as string[];

export function applyAccent(hex: string): void {
  const p = ACCENT_PRESETS[hex] ?? ACCENT_PRESETS["#7c5cff"];
  const root = document.documentElement;
  root.style.setProperty("--accent", hex);
  root.style.setProperty("--accent-hi", p.hi);
  root.style.setProperty("--accent-lo", p.lo);
  root.style.setProperty("--accent-ring", p.ring);
  root.style.setProperty("--accent-soft", p.soft);
}

export function applyDensity(density: "tight" | "comfortable" | "spacious"): void {
  const root = document.documentElement;
  root.dataset.density =
    density === "tight" ? "tight" : density === "spacious" ? "comfy" : "";
}

export function applyKbdStyle(style: "raised" | "chip" | "inline"): void {
  document.documentElement.dataset.kbd = style;
}
