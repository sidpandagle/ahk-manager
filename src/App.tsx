import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useProfilesStore } from "./store/profiles";
import { useRuntimeStore } from "./store/runtime";
import { useSettingsStore, DEFAULT_SETTINGS } from "./store/settings";
import { useToast } from "./features/toast/ToastProvider";
import { Sidebar } from "./features/profiles/Sidebar";
import { HotkeyTable } from "./features/hotkeys/HotkeyTable";
import { HotkeyModal } from "./features/hotkeys/HotkeyModal";
import { ConfirmDialog } from "./features/hotkeys/ConfirmDialog";
import { PreviewPane } from "./features/preview/PreviewPane";
import { SettingsModal } from "./features/settings/SettingsModal";
import { EditableText } from "./components/ui/EditableText";
import { StatusPill } from "./components/ui/StatusPill";
import { Button } from "./components/ui/Button";
import { Keycap } from "./components/ui/Keycap";
import { Icon } from "./components/ui/Icons";
import { generateAhk, flattenLines } from "./features/preview/ahk-codegen";
import type { AhkVersion } from "./features/preview/ahk-codegen";
import { parseAhkFile } from "./lib/ahk-parser";
import {
  loadProfiles,
  saveProfiles,
  detectAhk,
  applyProfile,
  stopRunningScript,
  exportAhk,
  importAhk,
  windowMinimize,
  windowToggleMaximize,
  windowClose,
} from "./lib/tauri";
import { applyAccent, applyDensity, applyKbdStyle } from "./lib/accent";
import { registerShortcuts } from "./lib/keyboard";
import type { Hotkey, AppSettings, Profile } from "./lib/types";

interface ConfirmState {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}

export function App() {
  const toast = useToast();

  // ── Stores ─────────────────────────────────────────────────────────
  const profiles = useProfilesStore((s) => s.profiles);
  const activeId = useProfilesStore((s) => s.activeId);
  const loaded = useProfilesStore((s) => s.loaded);
  const {
    hydrate,
    setActiveId,
    createProfile,
    deleteProfile,
    duplicateProfile,
    renameProfile,
    upsertHotkey,
    deleteHotkey,
    duplicateHotkey,
  } = useProfilesStore();

  const { runningId, runningPid, lastApplied, ahkInfo } = useRuntimeStore();
  const { setRunning, clearRunning, setAhkInfo } = useRuntimeStore();

  const { settings } = useSettingsStore();
  const { loadSettings } = useSettingsStore();

  // ── UI state ────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [editingHk, setEditingHk] = useState<Partial<Hotkey> | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [showPreview, setShowPreview] = useState(DEFAULT_SETTINGS.theme.show_preview);
  const [showSettings, setShowSettings] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Derived values ──────────────────────────────────────────────────
  const active = activeId ? (profiles[activeId] ?? null) : null;
  const running = runningId === activeId;
  const enabledCount = active ? active.hotkeys.filter((h) => h.enabled).length : 0;
  const ahkVersion: AhkVersion = (ahkInfo?.version_major ?? 1) >= 2 ? 2 : 1;

  // ── Apply / Stop ─────────────────────────────────────────────────────
  const handleApply = useCallback(
    async (
      id: string,
      profileMap: Record<string, Profile> = profiles,
      /** Explicit version override for boot-time auto-launch (before ahkInfo is in state). */
      versionOverride?: AhkVersion,
    ) => {
      const target = profileMap[id];
      if (!target) return;
      const n = target.hotkeys.filter((h) => h.enabled).length;
      const version = versionOverride ?? ahkVersion;
      try {
        const src = flattenLines(generateAhk(target, version));
        const pid = await applyProfile(src, id);
        setRunning(id, pid);
        toast.push({
          kind: "success",
          title: "Script applied",
          desc: `Running ${target.name} with ${n} hotkey${n === 1 ? "" : "s"}.`,
        });
      } catch (e) {
        toast.push({ kind: "error", title: "Failed to apply", desc: String(e) });
      }
    },
    [ahkVersion, profiles, setRunning, toast]
  );

  const handleStop = useCallback(async () => {
    try {
      await stopRunningScript();
      clearRunning();
      toast.push({ kind: "info", title: "Stopped", desc: "AHK process terminated." });
    } catch (e) {
      toast.push({ kind: "error", title: "Stop failed", desc: String(e) });
    }
  }, [clearRunning, toast]);

  // ── Boot ────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [dataResult, infoResult] = await Promise.allSettled([
        loadProfiles(),
        detectAhk(),
      ]);

      if (!mounted) return;

      // `load_profiles` returns null on first launch (no profiles.json yet).
      // Treat null as a missing file so we fall through to the empty-state path.
      const rawData = dataResult.status === "fulfilled" ? dataResult.value : null;

      if (rawData) {
        hydrate(rawData);
        loadSettings(rawData.settings);
        const t = rawData.settings.theme;
        applyAccent(t.accent);
        applyDensity(t.density);
        applyKbdStyle(t.kbd_style);
        setShowPreview(t.show_preview);

        // Restore a session kept alive from the previous run (keep_active_on_close).
        // If that process is still live, skip auto-launch — AHK is already running.
        if (rawData.active_session && rawData.profiles[rawData.active_session.profile_id]) {
          setActiveId(rawData.active_session.profile_id);
          setRunning(rawData.active_session.profile_id, rawData.active_session.pid);
        } else {
          // Auto-apply the launch profile only if AHK exe path is configured.
          const launchId = rawData.settings.launch_profile_id;
          const ahkExe = rawData.settings.ahk_exe_path;
          if (launchId && rawData.profiles[launchId] && ahkExe) {
            const bootVersion: AhkVersion =
              infoResult.status === "fulfilled" &&
              (infoResult.value?.version_major ?? 1) >= 2
                ? 2
                : 1;
            await handleApply(launchId, rawData.profiles, bootVersion);
          }
        }
      } else {
        // First launch or corrupt file — start with empty state
        hydrate({
          profiles: {},
          settings: DEFAULT_SETTINGS,
        });
      }

      if (infoResult.status === "fulfilled") {
        setAhkInfo(infoResult.value);
      }
    })();
    return () => { mounted = false; };
  // Run once on mount only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Theme sync ──────────────────────────────────────────────────────
  useEffect(() => {
    applyAccent(settings.theme.accent);
    applyDensity(settings.theme.density);
    applyKbdStyle(settings.theme.kbd_style);
  }, [settings.theme.accent, settings.theme.density, settings.theme.kbd_style]);

  // ── Debounced persist ────────────────────────────────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveProfiles({ profiles, settings }).catch(console.error);
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [profiles, settings, loaded]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────
  useEffect(() => {
    return registerShortcuts([
      {
        ctrl: true,
        key: "n",
        noModal: true,
        handler: () => setEditingHk({}),
      },
      {
        ctrl: true,
        key: "Enter",
        noModal: true,
        handler: () => {
          if (running) handleStop();
          else if (activeId) handleApply(activeId);
        },
      },
      {
        ctrl: true,
        key: "f",
        noModal: true,
        handler: () => searchRef.current?.focus(),
      },
    ]);
  }, [running, activeId, handleApply, handleStop]);

  // ── Re-apply badge detection ──────────────────────────────────────────
  const [appliedSnapshot, setAppliedSnapshot] = useState<string>("");
  const currentSnapshot = active ? JSON.stringify(active.hotkeys) : "";
  const reapplyNeeded =
    running && activeId === runningId && appliedSnapshot !== "" && currentSnapshot !== appliedSnapshot;

  // ── Time-ago ticker ───────────────────────────────────────────────────
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 15_000);
    return () => clearInterval(id);
  }, []);
  const ago = useMemo(() => {
    if (!lastApplied) return "";
    const s = Math.floor((Date.now() - lastApplied) / 1000);
    if (s < 60) return s + "s ago";
    const m = Math.floor(s / 60);
    if (m < 60) return m + "m ago";
    return Math.floor(m / 60) + "h ago";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastApplied, tick]);

  // ── Hotkey actions ───────────────────────────────────────────────────
  const handleSaveHotkey = (hk: Hotkey) => {
    if (!activeId) return;
    const isEdit = active?.hotkeys.some((h) => h.id === hk.id) ?? false;
    upsertHotkey(activeId, hk);
    setEditingHk(null);
    toast.push({
      kind: "success",
      title: isEdit ? "Hotkey updated" : "Hotkey added",
      desc: `Trigger ${hk.trigger} is now ${hk.enabled ? "active" : "saved (disabled)"}.`,
    });
    if (running) {
      toast.push({
        kind: "info",
        title: "Restart needed",
        desc: "Apply changes to update the running script.",
      });
    }
  };

  const handleDeleteHotkey = (hid: string) => {
    if (!active || !activeId) return;
    const h = active.hotkeys.find((x) => x.id === hid);
    if (!h) return;
    setConfirm({
      title: "Delete this hotkey?",
      body: (
        <>
          The binding <Keycap trigger={h.trigger} /> will be removed from{" "}
          <b>{active.name}</b>. This can't be undone.
        </>
      ),
      confirmLabel: "Delete",
      danger: true,
      onConfirm: () => {
        deleteHotkey(activeId, hid);
        setConfirm(null);
        toast.push({
          kind: "warn",
          title: "Hotkey deleted",
          desc: `${h.trigger} removed from ${active.name}.`,
        });
      },
    });
  };

  const handleDeleteProfile = (id: string) => {
    const p = profiles[id];
    if (!p) return;
    setConfirm({
      title: `Delete "${p.name}"?`,
      body: (
        <>
          This will remove <b>{p.hotkeys.length}</b>{" "}
          hotkey{p.hotkeys.length === 1 ? "" : "s"} permanently.
        </>
      ),
      confirmLabel: "Delete profile",
      danger: true,
      onConfirm: async () => {
        if (runningId === id) await handleStop();
        deleteProfile(id);
        setConfirm(null);
        toast.push({ kind: "warn", title: "Profile deleted", desc: `${p.name} was removed.` });
      },
    });
  };

  const handleCreateProfile = () => {
    const id = createProfile();
    setActiveId(id);
    toast.push({ kind: "success", title: "Profile created" });
  };

  const handleDuplicateProfile = (id: string) => {
    const newId = duplicateProfile(id);
    setActiveId(newId);
    toast.push({ kind: "info", title: "Profile duplicated" });
  };

  // ── Export / Import ──────────────────────────────────────────────────
  const handleExport = async () => {
    if (!active) return;
    try {
      const src = flattenLines(generateAhk(active, ahkVersion));
      const filename = active.name.toLowerCase().replace(/\s+/g, "-") + ".ahk";
      await exportAhk(filename, src);
      toast.push({ kind: "success", title: "Exported", desc: `Saved ${filename}.` });
    } catch { /* cancelled */ }
  };

  const handleImport = async () => {
    try {
      const { path, content } = await importAhk();

      const hotkeys = parseAhkFile(content);
      if (hotkeys.length === 0) {
        toast.push({
          kind: "warn",
          title: "Nothing to import",
          desc: "No recognizable hotkeys found in the selected file.",
        });
        return;
      }

      // Derive a profile name from the filename (strip path + extension)
      const filename =
        path.split(/[/\\]/).pop()?.replace(/\.ahk$/i, "") ?? "Imported";

      const id = createProfile();
      renameProfile(id, filename);
      hotkeys.forEach((h) => upsertHotkey(id, h));
      setActiveId(id);

      toast.push({
        kind: "success",
        title: "Imported",
        desc: `${hotkeys.length} hotkey${hotkeys.length !== 1 ? "s" : ""} imported as "${filename}".`,
      });
    } catch { /* cancelled or file-read error */ }
  };

  // ── Settings ────────────────────────────────────────────────────────
  const handleSaveSettings = (newSettings: AppSettings) => {
    loadSettings(newSettings);
    setShowPreview(newSettings.theme.show_preview);
  };

  const handleSelectProfile = useCallback(
    (id: string) => {
      setActiveId(id);
    },
    [setActiveId]
  );

  // ── Wrap handleApply to capture snapshot ───────────────────────────
  const handleApplyAndSnapshot = async (id: string) => {
    setActiveId(id);
    await handleApply(id);
    const target = profiles[id];
    if (target) setAppliedSnapshot(JSON.stringify(target.hotkeys));
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* Title bar — data-tauri-drag-region makes this area drag the window */}
      <div className="titlebar" data-tauri-drag-region>
        <div className="titlebar-logo">
          <div className="titlebar-logo-mark">A</div>
          <span>AHK Manager</span>
        </div>
        <span className="titlebar-meta">v0.1.0 · profiles.json</span>
        <div className="titlebar-trail">
          <button
            className="win-ctrl"
            title="Settings"
            type="button"
            onClick={() => setShowSettings(true)}
          >
            <Icon.Settings />
          </button>
          <span style={{ width: 8 }} />
          <button className="win-ctrl" type="button" onClick={windowMinimize}>
            <Icon.Min />
          </button>
          <button className="win-ctrl" type="button" onClick={windowToggleMaximize}>
            <Icon.Max />
          </button>
          <button className="win-ctrl close" type="button" onClick={windowClose}>
            <Icon.X />
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="main">
        <Sidebar
          profiles={profiles}
          activeId={activeId}
          runningId={runningId}
          onSelect={handleSelectProfile}
          onCreate={handleCreateProfile}
          onDelete={handleDeleteProfile}
          onDuplicate={handleDuplicateProfile}
          onApply={handleApplyAndSnapshot}
          onStop={handleStop}
        />

        {active ? (
          <div className="content">
            <div className="content-head">
              <div>
                <div className="profile-title">
                  <EditableText
                    value={active.name}
                    onChange={(name) => activeId && renameProfile(activeId, name)}
                  />
                </div>
                <div className="profile-sub">
                  <span>
                    {active.hotkeys.length} hotkey{active.hotkeys.length === 1 ? "" : "s"}
                  </span>
                  <span className="sep">·</span>
                  <span>{enabledCount} enabled</span>
                  {running && lastApplied && (
                    <>
                      <span className="sep">·</span>
                      <span style={{ color: "var(--success)" }}>
                        applied {ago}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <StatusPill running={running} />
                <button
                  className="btn ghost sm icon-only"
                  title={showPreview ? "Hide .ahk preview" : "Show .ahk preview"}
                  type="button"
                  onClick={() => setShowPreview((v) => !v)}
                  style={showPreview ? { color: "var(--accent)" } : undefined}
                >
                  <Icon.Code />
                </button>
              </div>
            </div>

            <div className={"body " + (showPreview ? "with-preview" : "")}>
              <div className="table-wrap">
                {reapplyNeeded && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "6px 12px",
                      marginBottom: 10,
                      background: "var(--warning-soft)",
                      border: "1px solid var(--warning)",
                      borderRadius: "var(--r-2)",
                      fontSize: 12,
                      color: "var(--warning)",
                    }}
                  >
                    <Icon.Warn />
                    <span>Restart needed to apply changes</span>
                    <Button
                      size="sm"
                      style={{ marginLeft: "auto" }}
                      onClick={() => activeId && handleApplyAndSnapshot(activeId)}
                    >
                      Re-apply
                    </Button>
                  </div>
                )}

                <div className="toolbar">
                  <div className="search" style={{ position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        left: 10,
                        top: 8,
                        color: "var(--text-3)",
                      }}
                    >
                      <Icon.Search />
                    </span>
                    <input
                      ref={searchRef}
                      className="input"
                      placeholder="Search triggers, descriptions, actions…"
                      style={{ paddingLeft: 32, height: 30 }}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                  <span className="spacer" />
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Icon.Plus />}
                    onClick={() => setEditingHk({})}
                  >
                    Add Hotkey
                  </Button>
                </div>

                <HotkeyTable
                  profile={active}
                  query={query}
                  onEdit={setEditingHk}
                  onDelete={handleDeleteHotkey}
                  onDuplicate={(id) => activeId && duplicateHotkey(activeId, id)}
                  onAdd={() => setEditingHk({})}
                />
              </div>

              {showPreview && (
                <PreviewPane
                  profile={active}
                  running={running}
                  ahkVersion={ahkVersion}
                  onCopy={() =>
                    toast.push({
                      kind: "success",
                      title: "Copied",
                      desc: ".ahk source copied to clipboard.",
                    })
                  }
                  onClose={() => setShowPreview(false)}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="content">
            <div className="empty" style={{ paddingTop: 120 }}>
              <div className="empty-mark">
                <Icon.Folder />
              </div>
              <div className="empty-title">No profile selected</div>
              <div className="empty-desc">
                Create a profile to start binding hotkeys.
              </div>
              <Button
                variant="primary"
                leftIcon={<Icon.Plus />}
                onClick={handleCreateProfile}
              >
                Create profile
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="actionbar">
        {running ? (
          <Button leftIcon={<Icon.Stop />} onClick={handleStop}>
            Stop
          </Button>
        ) : (
          <Button
            variant="success"
            leftIcon={<Icon.Play />}
            onClick={() => activeId && handleApplyAndSnapshot(activeId)}
            disabled={!active || enabledCount === 0}
          >
            Apply
          </Button>
        )}
        <div className="divider" />
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Icon.Upload />}
          onClick={handleExport}
          disabled={!active}
        >
          Export .ahk
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Icon.Download />}
          onClick={handleImport}
        >
          Import .ahk
        </Button>
        <span className="spacer" />
        <span className="stat">
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: 3,
              background: running ? "var(--success)" : "var(--text-3)",
            }}
          />
          {running ? (
            <>
              <b>{enabledCount}</b> hotkeys active
              {runningPid && (
                <span style={{ color: "var(--text-3)", marginLeft: 4 }}>
                  · PID {runningPid}
                </span>
              )}
            </>
          ) : (
            "Idle"
          )}
        </span>
        <div className="divider" />
        <span className="stat" title="New hotkey (Ctrl+N)">
          <span className="kbd mod">Ctrl</span>
          <span className="kbd">N</span>
          <span style={{ color: "var(--text-3)", marginLeft: 4 }}>new</span>
        </span>
        <span className="stat" style={{ marginLeft: 6 }} title="Apply/Stop (Ctrl+Enter)">
          <span className="kbd mod">Ctrl</span>
          <span className="kbd">↵</span>
          <span style={{ color: "var(--text-3)", marginLeft: 4 }}>
            {running ? "stop" : "apply"}
          </span>
        </span>
      </div>

      {/* Modals */}
      {editingHk !== null && (
        <HotkeyModal
          initial={editingHk}
          onSave={handleSaveHotkey}
          onClose={() => setEditingHk(null)}
        />
      )}

      {confirm !== null && (
        <ConfirmDialog
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onConfirm={confirm.onConfirm}
          onClose={() => setConfirm(null)}
        />
      )}

      {showSettings && (
        <SettingsModal
          profiles={profiles}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  );
}
