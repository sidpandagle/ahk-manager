import { describe, it, expect } from "vitest";
import { generateAhk, flattenLines } from "../features/preview/ahk-codegen";
import type { Profile, Hotkey } from "../lib/types";

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeHotkey(partial: Partial<Hotkey>): Hotkey {
  return {
    id: "test-id",
    trigger: "^a",
    action_type: "send_text",
    action_value: "hello",
    append_enter: false,
    description: "",
    enabled: true,
    ...partial,
  };
}

function makeProfile(hotkeys: Hotkey[], name = "Test"): Profile {
  return { id: "p1", name, hotkeys };
}

// ── generateAhk: AHK v1 ─────────────────────────────────────────────────────

describe("generateAhk v1", () => {
  it("produces header comments and blank line", () => {
    // v1: two comment lines then a blank (no v2-syntax comment)
    const lines = generateAhk(makeProfile([]), 1);
    expect(lines[0]).toMatchObject({ k: "comment" });
    expect(lines[1]).toMatchObject({ k: "comment" });
    expect(lines[2]).toEqual({ k: "blank" });  // blank is at index 2 for v1
  });

  it("outputs no-hotkeys comment when all disabled", () => {
    const profile = makeProfile([makeHotkey({ enabled: false })]);
    const lines = generateAhk(profile, 1);
    const flat = flattenLines(lines);
    expect(flat).toContain("No enabled hotkeys");
    expect(flat).not.toContain("::");
  });

  it("send_text — basic text", () => {
    const hk = makeHotkey({ trigger: "^a", action_type: "send_text", action_value: "Hello" });
    const flat = flattenLines(generateAhk(makeProfile([hk]), 1));
    expect(flat).toContain("^a::");
    expect(flat).toContain("Send, Hello");
    expect(flat).toContain("return");
    expect(flat).not.toContain("{Enter}");
  });

  it("send_text — append_enter adds Send,{Enter}", () => {
    const hk = makeHotkey({ action_type: "send_text", action_value: "Hi", append_enter: true });
    const flat = flattenLines(generateAhk(makeProfile([hk]), 1));
    expect(flat).toContain("Send, {Enter}");
  });

  it("send_text — newlines escaped as `n", () => {
    const hk = makeHotkey({ action_type: "send_text", action_value: "line1\nline2" });
    const flat = flattenLines(generateAhk(makeProfile([hk]), 1));
    expect(flat).toContain("Send, line1`nline2");
  });

  it("send_text — tabs escaped as `t", () => {
    const hk = makeHotkey({ action_type: "send_text", action_value: "a\tb" });
    const flat = flattenLines(generateAhk(makeProfile([hk]), 1));
    expect(flat).toContain("Send, a`tb");
  });

  it("run — wraps command with Run,", () => {
    const hk = makeHotkey({ action_type: "run", action_value: "notepad.exe" });
    const flat = flattenLines(generateAhk(makeProfile([hk]), 1));
    expect(flat).toContain("Run, notepad.exe");
    expect(flat).toContain("return");
  });

  it("always_on_top — uses Winset syntax", () => {
    const hk = makeHotkey({ action_type: "always_on_top", action_value: "" });
    const flat = flattenLines(generateAhk(makeProfile([hk]), 1));
    expect(flat).toContain("Winset, Alwaysontop, , A");
    expect(flat).toContain("return");
  });

  it("custom — emits raw snippet lines", () => {
    const hk = makeHotkey({
      action_type: "custom",
      action_value: "MsgBox, Hello\nReturn",
    });
    const flat = flattenLines(generateAhk(makeProfile([hk]), 1));
    expect(flat).toContain("MsgBox, Hello");
    expect(flat).toContain("Return");
  });

  it("description appears as inline comment on hotkey line", () => {
    const hk = makeHotkey({ description: "my note" });
    const flat = flattenLines(generateAhk(makeProfile([hk]), 1));
    expect(flat).toMatch(/\^\w+::.*; my note/);
  });

  it("disabled hotkeys are omitted", () => {
    const enabled = makeHotkey({ trigger: "^b", action_value: "active" });
    const disabled = makeHotkey({ trigger: "^c", enabled: false, action_value: "inactive" });
    const flat = flattenLines(generateAhk(makeProfile([enabled, disabled]), 1));
    expect(flat).toContain("^b::");
    expect(flat).not.toContain("^c::");
  });

  it("multiple hotkeys have blank lines between them", () => {
    const hk1 = makeHotkey({ id: "h1", trigger: "^1" });
    const hk2 = makeHotkey({ id: "h2", trigger: "^2" });
    const lines = generateAhk(makeProfile([hk1, hk2]), 1);
    const blanks = lines.filter((l) => l.k === "blank");
    // At least the header blank + separator blank
    expect(blanks.length).toBeGreaterThanOrEqual(2);
  });
});

// ── generateAhk: AHK v2 ─────────────────────────────────────────────────────

describe("generateAhk v2", () => {
  it("includes v2 comment in header", () => {
    const lines = generateAhk(makeProfile([]), 2);
    const flat = flattenLines(lines);
    expect(flat).toContain("AutoHotkey v2 syntax");
  });

  it("send_text — uses Send() with quoted string", () => {
    const hk = makeHotkey({ action_type: "send_text", action_value: "World" });
    const flat = flattenLines(generateAhk(makeProfile([hk]), 2));
    expect(flat).toContain('Send("World")');
    expect(flat).not.toContain("return");
    expect(flat).toContain("{");
    expect(flat).toContain("}");
  });

  it("send_text — append_enter uses Send(\"{Enter}\")", () => {
    const hk = makeHotkey({ action_type: "send_text", action_value: "Hi", append_enter: true });
    const flat = flattenLines(generateAhk(makeProfile([hk]), 2));
    expect(flat).toContain('Send("{Enter}")');
  });

  it("send_text — quotes inside value are backtick-escaped", () => {
    const hk = makeHotkey({ action_type: "send_text", action_value: 'say "hi"' });
    const flat = flattenLines(generateAhk(makeProfile([hk]), 2));
    expect(flat).toContain('`"hi`"');
  });

  it("run — uses Run() with quoted path", () => {
    const hk = makeHotkey({ action_type: "run", action_value: "calc.exe" });
    const flat = flattenLines(generateAhk(makeProfile([hk]), 2));
    expect(flat).toContain('Run("calc.exe")');
  });

  it("always_on_top — uses WinSetAlwaysOnTop", () => {
    const hk = makeHotkey({ action_type: "always_on_top", action_value: "" });
    const flat = flattenLines(generateAhk(makeProfile([hk]), 2));
    expect(flat).toContain('WinSetAlwaysOnTop(-1, "A")');
  });

  it("custom — emits lines inside braces", () => {
    const hk = makeHotkey({ action_type: "custom", action_value: "ToolTip, v2 style" });
    const lines = generateAhk(makeProfile([hk]), 2);
    const flat = flattenLines(lines);
    expect(flat).toContain("ToolTip, v2 style");
    // Wrapped in braces
    const cmdLines = lines.filter((l) => l.k === "cmd").map((l) => l.text.trim());
    expect(cmdLines[0]).toBe("{");
    expect(cmdLines[cmdLines.length - 1]).toBe("}");
  });
});

// ── flattenLines ─────────────────────────────────────────────────────────────

describe("flattenLines", () => {
  it("blank lines become empty strings", () => {
    const lines = generateAhk(makeProfile([]), 1);
    const flat = flattenLines(lines);
    const joined = flat.split("\n");
    expect(joined.some((l) => l === "")).toBe(true);
  });

  it("joins everything with newlines", () => {
    const hk = makeHotkey({});
    const flat = flattenLines(generateAhk(makeProfile([hk]), 1));
    expect(flat.split("\n").length).toBeGreaterThan(3);
  });
});
