// AHK script parser — converts a raw .ahk string into Hotkey[]
// Handles both AHK v1 (Send, / Run, / return) and v2 (Send() / Run() / {}) syntax.

import type { Hotkey, ActionType } from "./types";

function nanoid(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** Detect AHK version from file content heuristics. */
function detectVersion(src: string): 1 | 2 {
  if (/^#Requires\s+AutoHotkey\s+v2/mi.test(src)) return 2;
  if (/^;\s*AutoHotkey v2 syntax/mi.test(src)) return 2;
  // v2 uses Send("...") with parens; v1 uses Send, ...
  if (/^\s*Send\s*\(/m.test(src)) return 2;
  return 1;
}

/** Unescape AHK v1 escape sequences back to plain text. */
function unescapeV1(s: string): string {
  return s.replace(/`n/g, "\n").replace(/`t/g, "\t").replace(/`r/g, "\r");
}

/** Unescape AHK v2 escape sequences back to plain text. */
function unescapeV2(s: string): string {
  return s
    .replace(/`n/g, "\n")
    .replace(/`t/g, "\t")
    .replace(/`r/g, "\r")
    .replace(/`"/g, '"')
    .replace(/\\\\/g, "\\");
}

/**
 * Parse a raw .ahk file string into an array of Hotkey objects.
 * Hotkeys that can't be classified into send_text / run / always_on_top
 * are preserved as "custom" action_type with the raw body lines.
 */
export function parseAhkFile(src: string): Hotkey[] {
  const lines = src.split(/\r?\n/);
  const version = detectVersion(src);
  const hotkeys: Hotkey[] = [];

  // Matches:  <trigger>::   or   <trigger>::  ; comment
  // The trigger must not start with ; or whitespace.
  // We exclude pure key-remaps like  a::b  (single-token after ::) — we keep
  // them as "custom" so they round-trip correctly.
  const HOTKEY_RE = /^([^;:\s][^:]*)::(?:\s*;\s*(.*))?$/;

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    const m = trimmed.match(HOTKEY_RE);
    if (!m) {
      i++;
      continue;
    }

    const trigger = m[1].trim();
    const description = (m[2] ?? "").trim();
    i++;

    const bodyLines: string[] = [];

    if (version === 2) {
      // v2 body: { ... }
      // Opening { can be on same line or the next line
      if (i < lines.length && lines[i].trim() === "{") i++;
      while (i < lines.length && lines[i].trim() !== "}") {
        bodyLines.push(lines[i].trim());
        i++;
      }
      if (i < lines.length) i++; // consume closing }
    } else {
      // v1 body: lines until "return" (case-insensitive) or next hotkey def
      while (i < lines.length) {
        const bl = lines[i].trim();
        if (/^return$/i.test(bl)) {
          i++;
          break;
        }
        if (HOTKEY_RE.test(bl)) break; // next hotkey — don't consume
        bodyLines.push(bl);
        i++;
      }
    }

    hotkeys.push(buildHotkey(trigger, description, bodyLines, version));
  }

  return hotkeys;
}

// ── Body classifier ──────────────────────────────────────────────────────────

function buildHotkey(
  trigger: string,
  description: string,
  bodyLines: string[],
  version: 1 | 2
): Hotkey {
  // Strip blank lines and pure comment lines for classification
  const meaningful = bodyLines.filter((l) => l && !l.startsWith(";"));

  let action_type: ActionType = "custom";
  let action_value = "";
  let append_enter = false;

  if (version === 1) {
    ({ action_type, action_value, append_enter } = classifyV1(meaningful, bodyLines));
  } else {
    ({ action_type, action_value, append_enter } = classifyV2(meaningful, bodyLines));
  }

  return {
    id: "h" + nanoid(),
    trigger,
    action_type,
    action_value,
    append_enter,
    description,
    enabled: true,
  };
}

function classifyV1(
  meaningful: string[],
  raw: string[]
): { action_type: ActionType; action_value: string; append_enter: boolean } {
  if (meaningful.length === 0) {
    return { action_type: "custom", action_value: "", append_enter: false };
  }

  // always_on_top
  if (/^Winset,\s*Alwaysontop/i.test(meaningful[0]) && meaningful.length === 1) {
    return { action_type: "always_on_top", action_value: "", append_enter: false };
  }

  // run — single line: Run, <value>
  if (/^Run,/i.test(meaningful[0]) && meaningful.length === 1) {
    const value = meaningful[0].replace(/^Run,\s*/i, "").trim();
    return { action_type: "run", action_value: value, append_enter: false };
  }

  // send_text — any number of Send lines, no other command types.
  // Multiple sends are merged into a single value so that
  //   Send, email\nSend, {Tab}\nSend, pass\nSend, {Enter}
  // becomes  action_value="email{Tab}pass", append_enter=true
  // which codegen can correctly render for both v1 and v2.
  const sendLines = meaningful.filter((l) => /^Send,/i.test(l));
  const otherLines = meaningful.filter((l) => !/^Send,/i.test(l));

  if (sendLines.length > 0 && otherLines.length === 0) {
    // Treat a trailing {Enter} as append_enter rather than part of the value.
    const lastIsEnter = /^Send,\s*\{Enter\}/i.test(sendLines[sendLines.length - 1]);
    const contentLines = lastIsEnter ? sendLines.slice(0, -1) : sendLines;

    if (contentLines.length >= 1) {
      // Concatenate all content sends — preserves AHK key names like {Tab}, {Space}.
      const combined = contentLines
        .map((l) => unescapeV1(l.replace(/^Send,\s*/i, "").trim()))
        .join("");
      return { action_type: "send_text", action_value: combined, append_enter: lastIsEnter };
    }

    // Edge-case: only an {Enter} line present.
    if (contentLines.length === 0 && lastIsEnter) {
      return { action_type: "send_text", action_value: "", append_enter: true };
    }
  }

  // fallback: custom
  return { action_type: "custom", action_value: raw.join("\n"), append_enter: false };
}

function classifyV2(
  meaningful: string[],
  raw: string[]
): { action_type: ActionType; action_value: string; append_enter: boolean } {
  if (meaningful.length === 0) {
    return { action_type: "custom", action_value: "", append_enter: false };
  }

  // always_on_top
  if (/^WinSetAlwaysOnTop/i.test(meaningful[0]) && meaningful.length === 1) {
    return { action_type: "always_on_top", action_value: "", append_enter: false };
  }

  // run — single line: Run("<value>")
  if (/^Run\s*\(/i.test(meaningful[0]) && meaningful.length === 1) {
    const m = meaningful[0].match(/^Run\s*\(\s*"(.*)"\s*\)\s*$/i);
    const value = m ? unescapeV2(m[1]) : meaningful[0];
    return { action_type: "run", action_value: value, append_enter: false };
  }

  // send_text — one or two Send() lines
  const sendLines = meaningful.filter((l) => /^Send\s*\(/i.test(l));
  const otherLines = meaningful.filter((l) => !/^Send\s*\(/i.test(l));

  if (sendLines.length > 0 && otherLines.length === 0) {
    const enterLine = sendLines.find((l) => /^Send\s*\(\s*"\{Enter\}"\s*\)/i.test(l));
    const textLines = sendLines.filter((l) => !/^Send\s*\(\s*"\{Enter\}"\s*\)/i.test(l));

    if (textLines.length === 1) {
      const m = textLines[0].match(/^Send\s*\(\s*"(.*)"\s*\)\s*$/i);
      const value = m ? unescapeV2(m[1]) : textLines[0];
      return { action_type: "send_text", action_value: value, append_enter: !!enterLine };
    }
  }

  // fallback: custom
  return { action_type: "custom", action_value: raw.join("\n"), append_enter: false };
}
