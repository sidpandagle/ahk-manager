// parseTrigger — convert AHK trigger string to display tokens
// Port of parseTrigger from ui.jsx

export interface TriggerToken {
  k: string;
  mod: boolean;
}

export function parseTrigger(trigger: string): TriggerToken[] {
  if (!trigger) return [];
  const tokens: TriggerToken[] = [];
  let i = 0;
  // Sorted longest-first so "ESCAPE" is tried before "ESC", "F12" before "F1", etc.
  const NAMED = [
    "BACKSPACE", "NUMPADADD", "NUMPADDIV", "NUMPADDOT", "NUMPADENTER",
    "NUMPADMULT", "NUMPADSUB", "NUMPAD0", "NUMPAD1", "NUMPAD2", "NUMPAD3",
    "NUMPAD4", "NUMPAD5", "NUMPAD6", "NUMPAD7", "NUMPAD8", "NUMPAD9",
    "ESCAPE", "DELETE", "INSERT",
    "SPACE", "ENTER", "PGUP", "PGDN", "HOME",
    "RIGHT", "DOWN", "LEFT",
    "F10", "F11", "F12",
    "TAB", "ESC", "END", "UP",
    "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9",
  ];

  while (i < trigger.length) {
    const c = trigger[i];
    if (c === "^") { tokens.push({ k: "Ctrl", mod: true }); i++; }
    else if (c === "+") { tokens.push({ k: "Shift", mod: true }); i++; }
    else if (c === "!") { tokens.push({ k: "Alt", mod: true }); i++; }
    else if (c === "#") { tokens.push({ k: "Win", mod: true }); i++; }
    else {
      const rest = trigger.slice(i).toUpperCase();
      const match = NAMED.find((n) => rest.startsWith(n));
      if (match) {
        const display =
          match === "SPACE" ? "Space" :
          match === "ENTER" ? "Enter" :
          match === "ESC" || match === "ESCAPE" ? "Esc" :
          match === "BACKSPACE" ? "Bksp" :
          match === "DELETE" ? "Del" :
          match === "PGUP" ? "PgUp" :
          match === "PGDN" ? "PgDn" :
          match.charAt(0) + match.slice(1).toLowerCase();
        tokens.push({ k: display, mod: false });
        i += match.length;
      } else {
        tokens.push({ k: trigger.slice(i).toUpperCase(), mod: false });
        i = trigger.length;
      }
    }
  }
  return tokens;
}

/** Extract the base (unshifted) key from e.code for single-character physical keys */
function codeToBaseKey(code: string): string | null {
  const digit = /^Digit(\d)$/.exec(code);
  if (digit) return digit[1];
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) return letter[1];
  const symbols: Record<string, string> = {
    Minus: "-", Equal: "=", BracketLeft: "[", BracketRight: "]",
    Backslash: "\\", Semicolon: ";", Quote: "'", Backquote: "`",
    Comma: ",", Period: ".", Slash: "/",
  };
  return symbols[code] ?? null;
}

/** Convert a keydown event into an AHK trigger string */
export function keyEventToTrigger(e: KeyboardEvent): string | null {
  const mods: string[] = [];
  if (e.ctrlKey) mods.push("^");
  if (e.shiftKey) mods.push("+");
  if (e.altKey) mods.push("!");
  if (e.metaKey) mods.push("#");

  const k = e.key;
  if (["Control", "Shift", "Alt", "Meta"].includes(k)) return null;

  let main: string;
  if (k === " ") main = "SPACE";
  else if (k === "Enter") main = "ENTER";
  else if (k === "Escape") main = "ESC";
  else if (k === "Backspace") main = "BACKSPACE";
  else if (k === "Delete") main = "DELETE";
  else if (k === "Tab") main = "TAB";
  else if (k === "ArrowUp") main = "UP";
  else if (k === "ArrowDown") main = "DOWN";
  else if (k === "ArrowLeft") main = "LEFT";
  else if (k === "ArrowRight") main = "RIGHT";
  else if (k === "Home") main = "HOME";
  else if (k === "End") main = "END";
  else if (k === "PageUp") main = "PGUP";
  else if (k === "PageDown") main = "PGDN";
  else if (k === "Insert") main = "INSERT";
  else if (k.startsWith("F") && /^F\d+$/.test(k)) main = k;
  else if (k.length === 1) {
    // Use the physical key code to avoid shifted characters (e.g. Shift+3 gives
    // e.key="#" which is also AHK's Win modifier). Fall back to e.key if unknown.
    main = codeToBaseKey(e.code) ?? k.toUpperCase();
  }
  else main = k.toUpperCase();

  return mods.join("") + main;
}
