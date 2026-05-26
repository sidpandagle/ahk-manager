// ui.jsx — primitives + icons for AHK Manager
const { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } = React;

/* ── Icons (inline SVG, 1.5px stroke) ────────────────────────────── */
const ico = (d, opts = {}) => (
  <svg width={opts.size || 14} height={opts.size || 14} viewBox="0 0 16 16" fill="none"
       stroke="currentColor" strokeWidth={opts.sw || 1.5} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const Icon = {
  Play: () => ico(<polygon points="4 3 13 8 4 13" fill="currentColor" stroke="none" />),
  Stop: () => ico(<rect x="3.5" y="3.5" width="9" height="9" rx="1" fill="currentColor" stroke="none" />),
  Plus: () => ico(<><line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/></>),
  Trash: () => ico(<><path d="M3 4h10"/><path d="M5 4V2.5A1 1 0 0 1 6 2h4a1 1 0 0 1 1 1V4"/><path d="M4 4l1 9a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1l1-9"/></>),
  Edit: () => ico(<><path d="M11 2l3 3-8 8H3v-3l8-8z"/></>),
  Copy: () => ico(<><rect x="4" y="4" width="9" height="9" rx="1.5"/><path d="M11 4V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h1"/></>),
  Search: () => ico(<><circle cx="7" cy="7" r="4"/><line x1="10" y1="10" x2="13" y2="13"/></>),
  Close: () => ico(<><line x1="3.5" y1="3.5" x2="12.5" y2="12.5"/><line x1="12.5" y1="3.5" x2="3.5" y2="12.5"/></>),
  Check: () => ico(<polyline points="3 8.5 6.5 12 13 4.5"/>),
  Settings: () => ico(<><circle cx="8" cy="8" r="1.6"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/></>),
  Upload: () => ico(<><path d="M8 11V3M5 6l3-3 3 3"/><path d="M2.5 11v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2"/></>),
  Download: () => ico(<><path d="M8 3v8M5 8l3 3 3-3"/><path d="M2.5 13h11"/></>),
  Drag: () => ico(<><circle cx="6" cy="4" r="0.6" fill="currentColor"/><circle cx="10" cy="4" r="0.6" fill="currentColor"/><circle cx="6" cy="8" r="0.6" fill="currentColor"/><circle cx="10" cy="8" r="0.6" fill="currentColor"/><circle cx="6" cy="12" r="0.6" fill="currentColor"/><circle cx="10" cy="12" r="0.6" fill="currentColor"/></>),
  Min: () => ico(<line x1="3" y1="8" x2="13" y2="8"/>, {sw: 1.2}),
  Max: () => ico(<rect x="3.5" y="3.5" width="9" height="9"/>, {sw: 1.2}),
  X: () => ico(<><line x1="3.5" y1="3.5" x2="12.5" y2="12.5"/><line x1="12.5" y1="3.5" x2="3.5" y2="12.5"/></>, {sw: 1.2}),
  Warn: () => ico(<><path d="M8 2L1.5 13h13z"/><line x1="8" y1="6" x2="8" y2="9"/><circle cx="8" cy="11" r="0.6" fill="currentColor" stroke="none"/></>),
  Lightning: () => ico(<polygon points="9 1 3 9 7 9 6 15 13 7 9 7" fill="currentColor" stroke="none" />),
  Folder: () => ico(<path d="M2 5a1 1 0 0 1 1-1h3l1 1.5h6a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5z"/>),
  Cmd: () => ico(<><path d="M5 3a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v0a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2v0a2 2 0 0 0 2-2v0a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2v0a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2v0z"/></>),
};

/* ── Button ──────────────────────────────────────────────────────── */
function Button({ children, variant, size, iconOnly, leftIcon, rightIcon, ...rest }) {
  const cls = ["btn", variant, size, iconOnly && "icon-only"].filter(Boolean).join(" ");
  return (
    <button className={cls} {...rest}>
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}

/* ── Toggle ──────────────────────────────────────────────────────── */
function Toggle({ on, onChange, ...rest }) {
  return (
    <button
      className={"tgl " + (on ? "on" : "")}
      onClick={(e) => { e.stopPropagation(); onChange && onChange(!on); }}
      aria-pressed={on}
      {...rest}
    />
  );
}

/* ── Keycap ──────────────────────────────────────────────────────── */
// Parses an AHK-style trigger like "^+4" or "^SPACE" into display tokens.
function parseTrigger(trigger) {
  if (!trigger) return [];
  const tokens = [];
  let i = 0;
  while (i < trigger.length) {
    const c = trigger[i];
    if (c === "^") { tokens.push({ k: "Ctrl", mod: true }); i++; }
    else if (c === "+") { tokens.push({ k: "Shift", mod: true }); i++; }
    else if (c === "!") { tokens.push({ k: "Alt", mod: true }); i++; }
    else if (c === "#") { tokens.push({ k: "Win", mod: true }); i++; }
    else {
      const rest = trigger.slice(i).toUpperCase();
      // named keys
      const named = ["SPACE","ENTER","TAB","ESC","ESCAPE","BACKSPACE","DELETE","UP","DOWN","LEFT","RIGHT","HOME","END","PGUP","PGDN"];
      const match = named.find((n) => rest.startsWith(n));
      if (match) {
        const display = match === "SPACE" ? "Space" : match.charAt(0) + match.slice(1).toLowerCase();
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

function Keycap({ trigger }) {
  const tokens = parseTrigger(trigger);
  if (tokens.length === 0) return <span className="muted mono" style={{ fontSize: 11 }}>—</span>;
  return (
    <span className="kbd-combo">
      {tokens.map((t, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="plus">+</span>}
          <span className={"kbd " + (t.mod ? "mod" : "")}>{t.k}</span>
        </React.Fragment>
      ))}
    </span>
  );
}

/* ── Action tag ──────────────────────────────────────────────────── */
const ACTION_META = {
  send_text: { label: "Send Text", cls: "send" },
  run: { label: "Run", cls: "run" },
  always_on_top: { label: "Always Top", cls: "top" },
  custom: { label: "Custom AHK", cls: "custom" },
};

function ActionTag({ type }) {
  const m = ACTION_META[type] || ACTION_META.send_text;
  return <span className={"tag " + m.cls}>{m.label}</span>;
}

/* ── Status pill ─────────────────────────────────────────────────── */
function StatusPill({ running }) {
  return (
    <span className={"status-pill " + (running ? "running" : "")}>
      <span className="dot" />
      {running ? "Running" : "Stopped"}
    </span>
  );
}

/* ── Modal shell ─────────────────────────────────────────────────── */
function Modal({ children, onClose, width, className }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={"modal " + (className || "")} style={width ? { width } : undefined}>
        {children}
      </div>
    </div>
  );
}

/* ── Trigger recorder ────────────────────────────────────────────── */
function TriggerRecorder({ value, onChange }) {
  const [listening, setListening] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!listening) return;
    const onKey = (e) => {
      e.preventDefault();
      const mods = [];
      if (e.ctrlKey) mods.push("^");
      if (e.shiftKey) mods.push("+");
      if (e.altKey) mods.push("!");
      if (e.metaKey) mods.push("#");
      const k = e.key;
      // Ignore pure modifier presses
      if (["Control","Shift","Alt","Meta"].includes(k)) return;
      let main = "";
      if (k === " ") main = "SPACE";
      else if (k.length === 1) main = k.toUpperCase();
      else if (k.startsWith("Arrow")) main = k.replace("Arrow", "").toUpperCase();
      else main = k.toUpperCase();
      onChange(mods.join("") + main);
      setListening(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [listening, onChange]);

  return (
    <div
      ref={ref}
      className={"recorder " + (listening ? "listening" : "")}
      tabIndex={0}
      onClick={() => setListening(true)}
      onBlur={() => setListening(false)}
    >
      {listening ? (
        <span className="listening-text">● PRESS KEYS…</span>
      ) : value ? (
        <Keycap trigger={value} />
      ) : (
        <span className="placeholder">Click to record a key combo</span>
      )}
      <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
        {value && !listening && (
          <button
            className="btn ghost sm icon-only"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            title="Clear"
          ><Icon.Close /></button>
        )}
        {!listening && (
          <span className="muted mono" style={{ fontSize: 10, paddingRight: 4 }}>↵ to record</span>
        )}
      </div>
    </div>
  );
}

/* ── Editable inline title ───────────────────────────────────────── */
function EditableText({ value, onChange, className }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  if (editing) {
    return (
      <input
        autoFocus
        className={"input " + (className || "")}
        style={{ width: "auto", minWidth: 200, height: 28, fontSize: 18, fontWeight: 600, padding: "0 6px" }}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => { onChange(v.trim() || value); setEditing(false); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { onChange(v.trim() || value); setEditing(false); }
          else if (e.key === "Escape") { setV(value); setEditing(false); }
        }}
      />
    );
  }
  return (
    <span
      className={"editable " + (className || "")}
      style={{ padding: "0 6px", borderRadius: 6 }}
      onDoubleClick={() => setEditing(true)}
    >
      {value}
    </span>
  );
}

/* ── Toast manager ───────────────────────────────────────────────── */
const ToastCtx = createContext(null);
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const push = useCallback((t) => {
    const id = ++idRef.current;
    setToasts((cur) => [...cur, { id, ...t }]);
    setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== id)), t.duration || 3600);
  }, []);
  const dismiss = useCallback((id) => setToasts((cur) => cur.filter((x) => x.id !== id)), []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={"toast " + (t.kind || "info")}>
            <div className="toast-body">
              <div className="toast-title">{t.title}</div>
              {t.desc && <div className="toast-desc">{t.desc}</div>}
            </div>
            <button className="toast-close" onClick={() => dismiss(t.id)}><Icon.Close /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
const useToast = () => useContext(ToastCtx);

// Export to window so other Babel scripts can use them
Object.assign(window, {
  Icon, Button, Toggle, Keycap, parseTrigger, ActionTag, ACTION_META,
  StatusPill, Modal, TriggerRecorder, EditableText, ToastProvider, useToast,
});
