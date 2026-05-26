import { useState, useEffect } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Toggle } from "../../components/ui/Toggle";
import { Icon } from "../../components/ui/Icons";
import { useSettingsStore } from "../../store/settings";
import { useRuntimeStore } from "../../store/runtime";
import { detectAhk, browseForAhkExe } from "../../lib/tauri";
import { applyAccent, applyDensity, applyKbdStyle, ACCENT_OPTIONS } from "../../lib/accent";
import type { AppSettings } from "../../lib/types";
import type { Profile } from "../../lib/types";

interface SettingsModalProps {
  profiles: Record<string, Profile>;
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
}

export function SettingsModal({ profiles, onClose, onSave }: SettingsModalProps) {
  const storeSettings = useSettingsStore((s) => s.settings);
  const ahkInfo = useRuntimeStore((s) => s.ahkInfo);

  // Local draft — committed only on Save
  const [draft, setDraft] = useState<AppSettings>(() => ({
    ...storeSettings,
    theme: { ...storeSettings.theme },
  }));
  const [detecting, setDetecting] = useState(false);
  const [detectedVersion, setDetectedVersion] = useState<string | null>(
    ahkInfo?.version ?? null
  );
  const [detectError, setDetectError] = useState<string | null>(null);

  // Re-detect when path changes
  useEffect(() => {
    if (!draft.ahk_exe_path) return;
    const timer = setTimeout(async () => {
      setDetecting(true);
      setDetectError(null);
      try {
        const info = await detectAhk(draft.ahk_exe_path || undefined);
        setDetectedVersion(info.version);
      } catch {
        setDetectedVersion(null);
        setDetectError("Not found or invalid");
      } finally {
        setDetecting(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [draft.ahk_exe_path]);

  const updateDraft = (partial: Partial<AppSettings>) =>
    setDraft((d) => ({ ...d, ...partial }));

  const updateTheme = (partial: Partial<AppSettings["theme"]>) =>
    setDraft((d) => ({ ...d, theme: { ...d.theme, ...partial } }));

  const handleBrowse = async () => {
    try {
      const path = await browseForAhkExe();
      updateDraft({ ahk_exe_path: path });
    } catch {
      // cancelled
    }
  };

  const handleSave = () => {
    // Apply theme changes immediately
    applyAccent(draft.theme.accent);
    applyDensity(draft.theme.density);
    applyKbdStyle(draft.theme.kbd_style);
    onSave(draft);
    onClose();
  };

  return (
    <Modal onClose={onClose} width={520}>
      <div className="modal-head">
        <div className="modal-title">
          <span className="kicker">Settings</span>
        </div>
        <button className="btn ghost sm icon-only" onClick={onClose} type="button">
          <Icon.Close />
        </button>
      </div>

      <div className="modal-body">
        {/* ── AutoHotkey ────────────────────────────────────── */}
        <div className="settings-section-label">AutoHotkey</div>

        <div className="input-group">
          <label>AutoHotkey.exe path</label>
          <div className="flex gap-2">
            <input
              className="input mono"
              value={draft.ahk_exe_path}
              onChange={(e) => updateDraft({ ahk_exe_path: e.target.value })}
              placeholder="C:\Program Files\AutoHotkey\AutoHotkey.exe"
            />
            <Button size="sm" onClick={handleBrowse}>
              Browse
            </Button>
          </div>
          {detecting && (
            <span className="hint">Detecting…</span>
          )}
          {!detecting && detectedVersion && (
            <span className="hint" style={{ color: "var(--success)" }}>
              ✓ Detected · {detectedVersion}
            </span>
          )}
          {!detecting && detectError && (
            <span className="hint" style={{ color: "var(--danger)" }}>
              ✗ {detectError}
            </span>
          )}
        </div>

        <div className="input-group">
          <label>Launch profile on app start</label>
          <select
            className="select"
            value={draft.launch_profile_id ?? ""}
            onChange={(e) =>
              updateDraft({ launch_profile_id: e.target.value || null })
            }
          >
            <option value="">— None —</option>
            {Object.values(profiles).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex" style={{ justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              Start minimized to tray
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-2)", marginTop: 2 }}>
              App opens hidden; right-click tray icon to switch profiles.
            </div>
          </div>
          <Toggle
            on={draft.start_minimized}
            onChange={(v) => updateDraft({ start_minimized: v })}
          />
        </div>

        {/* ── Appearance ────────────────────────────────────── */}
        <div className="settings-section-label" style={{ marginTop: 8 }}>
          Appearance
        </div>

        {/* Accent color */}
        <div className="input-group">
          <label>Accent color</label>
          <div className="accent-swatches">
            {ACCENT_OPTIONS.map((hex) => (
              <button
                key={hex}
                type="button"
                className={"accent-swatch" + (draft.theme.accent === hex ? " active" : "")}
                style={{ background: hex }}
                onClick={() => updateTheme({ accent: hex })}
                title={hex}
              />
            ))}
          </div>
        </div>

        {/* Density */}
        <div className="input-group">
          <label>Density</label>
          <div className="seg">
            {(["tight", "comfortable", "spacious"] as const).map((d) => (
              <button
                key={d}
                type="button"
                className={"seg-btn" + (draft.theme.density === d ? " on" : "")}
                onClick={() => updateTheme({ density: d })}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Keycap style */}
        <div className="input-group">
          <label>Keycap style</label>
          <div className="seg">
            {(["raised", "chip", "inline"] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={"seg-btn" + (draft.theme.kbd_style === s ? " on" : "")}
                onClick={() => updateTheme({ kbd_style: s })}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Show preview */}
        <div className="flex" style={{ justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              Show .ahk preview pane
            </div>
          </div>
          <Toggle
            on={draft.theme.show_preview}
            onChange={(v) => updateTheme({ show_preview: v })}
          />
        </div>

        {/* ── Storage info ──────────────────────────────────── */}
        <div
          style={{
            padding: "10px 12px",
            background: "var(--bg-1)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            fontSize: 11.5,
            color: "var(--text-2)",
            fontFamily: "var(--font-mono)",
          }}
        >
          <div style={{ color: "var(--text-3)", marginBottom: 4 }}>
            ; Storage
          </div>
          <div>%APPDATA%\AHKManager\profiles.json</div>
        </div>
      </div>

      <div className="modal-foot" style={{ justifyContent: "flex-end" }}>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save settings
        </Button>
      </div>
    </Modal>
  );
}
