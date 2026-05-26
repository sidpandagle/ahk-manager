import { describe, it, expect } from "vitest";
import { parseTrigger } from "../lib/ahk-trigger";

describe("parseTrigger", () => {
  // ── Edge cases ────────────────────────────────────────────────────────
  it("empty string → empty array", () => {
    expect(parseTrigger("")).toEqual([]);
  });

  // ── Single plain key ──────────────────────────────────────────────────
  it("single lowercase letter is uppercased", () => {
    expect(parseTrigger("a")).toEqual([{ k: "A", mod: false }]);
  });

  it("single uppercase letter", () => {
    expect(parseTrigger("Z")).toEqual([{ k: "Z", mod: false }]);
  });

  it("digit key", () => {
    expect(parseTrigger("4")).toEqual([{ k: "4", mod: false }]);
  });

  // ── Modifier keys ─────────────────────────────────────────────────────
  it("^ maps to Ctrl", () => {
    expect(parseTrigger("^a")).toEqual([
      { k: "Ctrl", mod: true },
      { k: "A", mod: false },
    ]);
  });

  it("+ maps to Shift", () => {
    expect(parseTrigger("+b")).toEqual([
      { k: "Shift", mod: true },
      { k: "B", mod: false },
    ]);
  });

  it("! maps to Alt", () => {
    expect(parseTrigger("!c")).toEqual([
      { k: "Alt", mod: true },
      { k: "C", mod: false },
    ]);
  });

  it("# maps to Win", () => {
    expect(parseTrigger("#d")).toEqual([
      { k: "Win", mod: true },
      { k: "D", mod: false },
    ]);
  });

  // ── Multi-modifier combos ─────────────────────────────────────────────
  it("Ctrl+Shift+key", () => {
    expect(parseTrigger("^+4")).toEqual([
      { k: "Ctrl", mod: true },
      { k: "Shift", mod: true },
      { k: "4", mod: false },
    ]);
  });

  it("Ctrl+Alt+key (all four mods)", () => {
    const tokens = parseTrigger("^!+#x");
    expect(tokens.filter((t) => t.mod)).toHaveLength(4);
    expect(tokens[tokens.length - 1]).toEqual({ k: "X", mod: false });
  });

  // ── Named keys ────────────────────────────────────────────────────────
  it("ENTER → Enter", () => {
    expect(parseTrigger("ENTER")).toEqual([{ k: "Enter", mod: false }]);
  });

  it("SPACE → Space", () => {
    expect(parseTrigger("SPACE")).toEqual([{ k: "Space", mod: false }]);
  });

  it("ESC → Esc", () => {
    expect(parseTrigger("ESC")).toEqual([{ k: "Esc", mod: false }]);
  });

  it("ESCAPE → Esc", () => {
    expect(parseTrigger("ESCAPE")).toEqual([{ k: "Esc", mod: false }]);
  });

  it("BACKSPACE → Bksp", () => {
    expect(parseTrigger("BACKSPACE")).toEqual([{ k: "Bksp", mod: false }]);
  });

  it("DELETE → Del", () => {
    expect(parseTrigger("DELETE")).toEqual([{ k: "Del", mod: false }]);
  });

  it("PGUP → PgUp", () => {
    expect(parseTrigger("PGUP")).toEqual([{ k: "PgUp", mod: false }]);
  });

  it("PGDN → PgDn", () => {
    expect(parseTrigger("PGDN")).toEqual([{ k: "PgDn", mod: false }]);
  });

  it("TAB → Tab", () => {
    expect(parseTrigger("TAB")).toEqual([{ k: "Tab", mod: false }]);
  });

  it("UP → Up", () => {
    expect(parseTrigger("UP")).toEqual([{ k: "Up", mod: false }]);
  });

  it("DOWN → Down", () => {
    expect(parseTrigger("DOWN")).toEqual([{ k: "Down", mod: false }]);
  });

  // ── Function keys ─────────────────────────────────────────────────────
  it("F1 → F1", () => {
    expect(parseTrigger("F1")).toEqual([{ k: "F1", mod: false }]);
  });

  it("F12 → F12", () => {
    expect(parseTrigger("F12")).toEqual([{ k: "F12", mod: false }]);
  });

  it("Ctrl+F5", () => {
    expect(parseTrigger("^F5")).toEqual([
      { k: "Ctrl", mod: true },
      { k: "F5", mod: false },
    ]);
  });

  // ── Numpad ────────────────────────────────────────────────────────────
  it("NUMPAD0 → Numpad0", () => {
    expect(parseTrigger("NUMPAD0")).toEqual([{ k: "Numpad0", mod: false }]);
  });

  // ── Case insensitivity for named keys ─────────────────────────────────
  it("lowercase named key treated as single char token (not matched)", () => {
    // "enter" (lowercase) doesn't match ENTER — treated as opaque string
    const result = parseTrigger("enter");
    expect(result).toHaveLength(1);
    // The exact rendering doesn't matter as long as it doesn't break
    expect(result[0].mod).toBe(false);
  });

  // ── Modifier + named key ──────────────────────────────────────────────
  it("^ENTER → Ctrl + Enter", () => {
    expect(parseTrigger("^ENTER")).toEqual([
      { k: "Ctrl", mod: true },
      { k: "Enter", mod: false },
    ]);
  });

  it("+SPACE → Shift + Space", () => {
    expect(parseTrigger("+SPACE")).toEqual([
      { k: "Shift", mod: true },
      { k: "Space", mod: false },
    ]);
  });

  // ── Mod-only token count ──────────────────────────────────────────────
  it("all returned tokens have the right shape", () => {
    const tokens = parseTrigger("^+a");
    for (const t of tokens) {
      expect(t).toHaveProperty("k");
      expect(t).toHaveProperty("mod");
      expect(typeof t.k).toBe("string");
      expect(typeof t.mod).toBe("boolean");
    }
  });
});
