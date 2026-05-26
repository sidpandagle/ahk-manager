// app.jsx — root app: state, layout, tweaks integration

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#7c5cff",
  "density": "comfortable",
  "kbdStyle": "raised",
  "showPreview": true
}/*EDITMODE-END*/;

const ACCENT_PRESETS = {
  "#7c5cff": { hi: "#9277ff", lo: "#5e3fe6", ring: "rgba(124,92,255,0.32)", soft: "rgba(124,92,255,0.14)" },
  "#2ee68a": { hi: "#5af0a4", lo: "#1ec070", ring: "rgba(46,230,138,0.32)", soft: "rgba(46,230,138,0.14)" },
  "#ff6b35": { hi: "#ff8a5e", lo: "#e85820", ring: "rgba(255,107,53,0.32)", soft: "rgba(255,107,53,0.14)" },
  "#ededf0": { hi: "#ffffff", lo: "#c4c4cc", ring: "rgba(237,237,240,0.32)", soft: "rgba(237,237,240,0.10)" },
};

function applyAccent(hex) {
  const p = ACCENT_PRESETS[hex] || ACCENT_PRESETS["#7c5cff"];
  const root = document.documentElement;
  root.style.setProperty("--accent", hex);
  root.style.setProperty("--accent-hi", p.hi);
  root.style.setProperty("--accent-lo", p.lo);
  root.style.setProperty("--accent-ring", p.ring);
  root.style.setProperty("--accent-soft", p.soft);
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const toast = useToast();

  useEffect(() => applyAccent(t.accent), [t.accent]);
  useEffect(() => {
    document.documentElement.dataset.density =
      t.density === "tight" ? "tight" : t.density === "spacious" ? "comfy" : "";
    document.documentElement.dataset.kbd = t.kbdStyle;
  }, [t.density, t.kbdStyle]);

  /* ── State ─────────────────────────────────────────────────── */
  const [profiles, setProfiles] = useState(SEED_PROFILES);
  const [activeId, setActiveId] = useState("work-macros");
  const [runningId, setRunningId] = useState("work-macros");
  const [query, setQuery] = useState("");
  const [editingHk, setEditingHk] = useState(null); // {} for new, hotkey object for edit
  const [confirm, setConfirm] = useState(null);
  const [showPreview, setShowPreview] = useState(t.showPreview);
  const [showSettings, setShowSettings] = useState(false);
  const [lastApplied, setLastApplied] = useState(Date.now() - 2 * 60 * 1000);

  useEffect(() => setShowPreview(t.showPreview), [t.showPreview]);

  const active = profiles[activeId];
  const running = runningId === activeId;

  /* ── Mutations ─────────────────────────────────────────────── */
  const updateProfile = (id, mut) => {
    setProfiles((p) => ({ ...p, [id]: { ...p[id], ...mut(p[id]) } }));
  };

  const onSaveHotkey = (hk) => {
    updateProfile(activeId, (p) => {
      const exists = p.hotkeys.some((h) => h.id === hk.id);
      return {
        hotkeys: exists
          ? p.hotkeys.map((h) => (h.id === hk.id ? hk : h))
          : [...p.hotkeys, hk],
      };
    });
    setEditingHk(null);
    toast.push({
      kind: "success",
      title: editingHk?.trigger ? "Hotkey updated" : "Hotkey added",
      desc: <>Trigger <span className="mono">{hk.trigger}</span> is now {hk.enabled ? "active" : "saved (disabled)"}.</>,
    });
    if (running) {
      toast.push({ kind: "info", title: "Restart needed", desc: "Apply changes to update the running script." });
    }
  };

  const onDeleteHotkey = (hid) => {
    const h = active.hotkeys.find((x) => x.id === hid);
    setConfirm({
      title: "Delete this hotkey?",
      body: <>The binding <Keycap trigger={h.trigger} /> will be removed from <b>{active.name}</b>. This can't be undone.</>,
      confirmLabel: "Delete",
      danger: true,
      onConfirm: () => {
        updateProfile(activeId, (p) => ({ hotkeys: p.hotkeys.filter((h) => h.id !== hid) }));
        setConfirm(null);
        toast.push({ kind: "warn", title: "Hotkey deleted", desc: `${h.trigger} removed from ${active.name}.` });
      },
    });
  };

  const onToggleHotkey = (hid) => {
    updateProfile(activeId, (p) => ({
      hotkeys: p.hotkeys.map((h) => h.id === hid ? { ...h, enabled: !h.enabled } : h),
    }));
  };

  const onDuplicateHotkey = (hid) => {
    updateProfile(activeId, (p) => {
      const h = p.hotkeys.find((x) => x.id === hid);
      const copy = { ...h, id: "h" + Math.random().toString(36).slice(2, 8),
                     description: (h.description || "Hotkey") + " (copy)" };
      const idx = p.hotkeys.findIndex((x) => x.id === hid);
      const next = [...p.hotkeys];
      next.splice(idx + 1, 0, copy);
      return { hotkeys: next };
    });
  };

  const onCreateProfile = () => {
    const id = "profile-" + Math.random().toString(36).slice(2, 6);
    const name = `New Profile ${Object.keys(profiles).length + 1}`;
    setProfiles((p) => ({ ...p, [id]: { id, name, hotkeys: [] } }));
    setActiveId(id);
    toast.push({ kind: "success", title: "Profile created", desc: `Switched to ${name}.` });
  };

  const onDeleteProfile = (id) => {
    const p = profiles[id];
    setConfirm({
      title: `Delete "${p.name}"?`,
      body: <>This will remove <b>{p.hotkeys.length}</b> hotkey{p.hotkeys.length === 1 ? "" : "s"} permanently.</>,
      confirmLabel: "Delete profile",
      danger: true,
      onConfirm: () => {
        setProfiles((cur) => {
          const next = { ...cur };
          delete next[id];
          return next;
        });
        if (activeId === id) {
          const remaining = Object.keys(profiles).filter((k) => k !== id);
          setActiveId(remaining[0] || null);
        }
        if (runningId === id) setRunningId(null);
        setConfirm(null);
        toast.push({ kind: "warn", title: "Profile deleted", desc: `${p.name} was removed.` });
      },
    });
  };

  const onDuplicateProfile = (id) => {
    const p = profiles[id];
    const newId = id + "-copy-" + Math.random().toString(36).slice(2, 4);
    const newP = { ...p, id: newId, name: p.name + " (copy)",
                   hotkeys: p.hotkeys.map((h) => ({ ...h, id: "h" + Math.random().toString(36).slice(2, 8) })) };
    setProfiles((cur) => ({ ...cur, [newId]: newP }));
    setActiveId(newId);
    toast.push({ kind: "info", title: "Profile duplicated", desc: `Created ${newP.name}.` });
  };

  const onRenameProfile = (name) => {
    updateProfile(activeId, () => ({ name }));
  };

  /* ── Apply / Stop ──────────────────────────────────────────── */
  const onApply = (id) => {
    const targetId = id || activeId;
    const target = profiles[targetId];
    if (!target) return;
    setRunningId(targetId);
    setLastApplied(Date.now());
    const n = target.hotkeys.filter((h) => h.enabled).length;
    toast.push({
      kind: "success",
      title: "Script applied",
      desc: <>Running <b>{target.name}</b> with {n} hotkey{n === 1 ? "" : "s"}.</>,
    });
  };
  const onStop = () => {
    setRunningId(null);
    toast.push({ kind: "info", title: "Stopped", desc: `AHK process terminated.` });
  };

  const onExport = () => {
    toast.push({ kind: "success", title: "Exported", desc: `Saved ${active.name.toLowerCase().replace(/\s+/g, "-")}.ahk to Downloads.` });
  };
  const onImport = () => {
    toast.push({ kind: "info", title: "Pick an .ahk file", desc: "Choose a file to parse into a new profile." });
  };

  /* ── Live preview when running profile is edited ───────────── */
  const profileEditedAfterApply = useMemo(() => false, []); // omitted for clarity

  /* ── Time-ago display ──────────────────────────────────────── */
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((x) => x + 1), 15000);
    return () => clearInterval(i);
  }, []);
  const ago = useMemo(() => {
    const s = Math.floor((Date.now() - lastApplied) / 1000);
    if (s < 60) return s + "s ago";
    const m = Math.floor(s / 60);
    if (m < 60) return m + "m ago";
    return Math.floor(m / 60) + "h ago";
  }, [lastApplied, tick]);

  /* ── Keyboard shortcuts ────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n" && !editingHk) {
        e.preventDefault();
        setEditingHk({});
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        running ? onStop() : onApply();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const enabledCount = active ? active.hotkeys.filter((h) => h.enabled).length : 0;

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="app">
      {/* Title bar */}
      <div className="titlebar">
        <div className="titlebar-logo">
          <div className="titlebar-logo-mark">A</div>
          <span>AHK Manager</span>
        </div>
        <span className="titlebar-meta">v0.1.0 · profiles.json</span>
        <div className="titlebar-trail">
          <button className="win-ctrl" title="Settings" onClick={() => setShowSettings(true)}>
            <Icon.Settings />
          </button>
          <span style={{ width: 8 }} />
          <button className="win-ctrl"><Icon.Min /></button>
          <button className="win-ctrl"><Icon.Max /></button>
          <button className="win-ctrl close"><Icon.X /></button>
        </div>
      </div>

      {/* Main */}
      <div className="main">
        <Sidebar
          profiles={profiles}
          activeId={activeId}
          runningId={runningId}
          onSelect={setActiveId}
          onCreate={onCreateProfile}
          onDelete={onDeleteProfile}
          onDuplicate={onDuplicateProfile}
          onApply={onApply}
          onStop={onStop}
        />

        {active ? (
          <div className="content">
            <div className="content-head">
              <div>
                <div className="profile-title">
                  <EditableText value={active.name} onChange={onRenameProfile} />
                </div>
                <div className="profile-sub">
                  <span>{active.hotkeys.length} hotkey{active.hotkeys.length === 1 ? "" : "s"}</span>
                  <span className="sep">·</span>
                  <span>{enabledCount} enabled</span>
                  {running && <>
                    <span className="sep">·</span>
                    <span style={{ color: "var(--success)" }}>applied {ago}</span>
                  </>}
                </div>
              </div>
              <div className="flex gap-2">
                <StatusPill running={running} />
                <button
                  className={"btn ghost sm icon-only " + (showPreview ? "" : "")}
                  title={showPreview ? "Hide .ahk preview" : "Show .ahk preview"}
                  onClick={() => setShowPreview((v) => !v)}
                  style={showPreview ? { color: "var(--accent)" } : undefined}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 4l-3 4 3 4M11 4l3 4-3 4"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className={"body " + (showPreview ? "with-preview" : "")}>
              <div className="table-wrap">
                <div className="toolbar">
                  <div className="search" style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 10, top: 8, color: "var(--text-3)" }}>
                      <Icon.Search />
                    </span>
                    <input
                      className="input"
                      placeholder="Search triggers, descriptions, actions…"
                      style={{ paddingLeft: 32, height: 30 }}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                  <span className="spacer" />
                  <Button variant="primary" size="sm" leftIcon={<Icon.Plus />}
                          onClick={() => setEditingHk({})}>Add Hotkey</Button>
                </div>

                <HotkeyTable
                  profile={active}
                  query={query}
                  onEdit={(h) => setEditingHk(h)}
                  onDelete={onDeleteHotkey}
                  onToggle={onToggleHotkey}
                  onDuplicate={onDuplicateHotkey}
                  onAdd={() => setEditingHk({})}
                />
              </div>

              {showPreview && (
                <PreviewPane
                  profile={active}
                  running={running}
                  onCopy={() => toast.push({ kind: "success", title: "Copied", desc: ".ahk source copied to clipboard." })}
                  onClose={() => setShowPreview(false)}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="content">
            <div className="empty" style={{ paddingTop: 120 }}>
              <div className="empty-mark"><Icon.Folder /></div>
              <div className="empty-title">No profile selected</div>
              <div className="empty-desc">Create a profile to start binding hotkeys.</div>
              <Button variant="primary" leftIcon={<Icon.Plus />} onClick={onCreateProfile}>
                Create profile
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="actionbar">
        {running ? (
          <Button variant="" leftIcon={<Icon.Stop />} onClick={onStop}>Stop</Button>
        ) : (
          <Button variant="success" leftIcon={<Icon.Play />} onClick={onApply} disabled={!active || enabledCount === 0}>
            Apply
          </Button>
        )}
        <div className="divider" />
        <Button variant="ghost" size="sm" leftIcon={<Icon.Upload />} onClick={onExport}>Export .ahk</Button>
        <Button variant="ghost" size="sm" leftIcon={<Icon.Download />} onClick={onImport}>Import .ahk</Button>
        <span className="spacer" />
        <span className="stat">
          <span style={{ width: 6, height: 6, borderRadius: 3, background: running ? "var(--success)" : "var(--text-3)" }} />
          {running ? <><b>{enabledCount}</b> hotkeys active</> : "Idle"}
        </span>
        <div className="divider" />
        <span className="stat" title="Keyboard shortcut">
          <span className="kbd mod">⌃</span><span className="kbd">N</span>
          <span style={{ color: "var(--text-3)", marginLeft: 4 }}>new</span>
        </span>
        <span className="stat" style={{ marginLeft: 6 }} title="Apply / Stop">
          <span className="kbd mod">⌃</span><span className="kbd">↵</span>
          <span style={{ color: "var(--text-3)", marginLeft: 4 }}>{running ? "stop" : "apply"}</span>
        </span>
      </div>

      {/* Hotkey modal */}
      {editingHk && (
        <HotkeyModal
          initial={editingHk}
          onSave={onSaveHotkey}
          onClose={() => setEditingHk(null)}
        />
      )}

      {/* Confirm */}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onConfirm={confirm.onConfirm}
          onClose={() => setConfirm(null)}
        />
      )}

      {/* Settings modal */}
      {showSettings && <SettingsModal profiles={profiles} onClose={() => setShowSettings(false)} />}

      {/* Tweaks */}
      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakColor
          label="Accent"
          value={t.accent}
          options={["#7c5cff", "#2ee68a", "#ff6b35", "#ededf0"]}
          onChange={(v) => setTweak("accent", v)}
        />
        <TweakRadio
          label="Keycaps"
          value={t.kbdStyle}
          options={[
            { value: "raised", label: "Raised" },
            { value: "chip", label: "Chip" },
            { value: "inline", label: "Inline" },
          ]}
          onChange={(v) => setTweak("kbdStyle", v)}
        />
        <TweakSection label="Layout" />
        <TweakRadio
          label="Density"
          value={t.density}
          options={[
            { value: "tight", label: "Tight" },
            { value: "comfortable", label: "Comfy" },
            { value: "spacious", label: "Spacious" },
          ]}
          onChange={(v) => setTweak("density", v)}
        />
        <TweakToggle
          label="Show .ahk preview"
          value={t.showPreview}
          onChange={(v) => setTweak("showPreview", v)}
        />
      </TweaksPanel>
    </div>
  );
}

/* ── Settings Modal ──────────────────────────────────────────────── */
function SettingsModal({ profiles, onClose }) {
  const [path, setPath] = useState("C:\\Program Files\\AutoHotkey\\AutoHotkey.exe");
  const [launch, setLaunch] = useState("work-macros");
  const [minimized, setMinimized] = useState(false);
  return (
    <Modal onClose={onClose} width={520}>
      <div className="modal-head">
        <div className="modal-title">
          <span className="kicker">Settings</span>
        </div>
        <button className="btn ghost sm icon-only" onClick={onClose}><Icon.Close /></button>
      </div>
      <div className="modal-body">
        <div className="input-group">
          <label>AutoHotkey.exe path</label>
          <div className="flex gap-2">
            <input className="input mono" value={path} onChange={(e) => setPath(e.target.value)} />
            <Button variant="" size="sm">Browse</Button>
          </div>
          <span className="hint" style={{ color: "var(--success)" }}>
            ✓ Detected · v1.1.37.02
          </span>
        </div>
        <div className="input-group">
          <label>Launch profile on app start</label>
          <select className="select" value={launch} onChange={(e) => setLaunch(e.target.value)}>
            <option value="">— None —</option>
            {Object.values(profiles).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex" style={{ justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Start minimized to tray</div>
            <div style={{ fontSize: 11.5, color: "var(--text-2)", marginTop: 2 }}>
              App opens hidden; right-click tray icon to switch profiles.
            </div>
          </div>
          <Toggle on={minimized} onChange={setMinimized} />
        </div>
        <div style={{ padding: "10px 12px", background: "var(--bg-1)", border: "1px solid var(--border)",
                      borderRadius: 6, fontSize: 11.5, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
          <div style={{ color: "var(--text-3)", marginBottom: 4 }}>; Storage</div>
          <div>~\AppData\Local\AHKManager\profiles.json</div>
        </div>
      </div>
      <div className="modal-foot" style={{ justifyContent: "flex-end" }}>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={onClose}>Save settings</Button>
      </div>
    </Modal>
  );
}

function Root() {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
