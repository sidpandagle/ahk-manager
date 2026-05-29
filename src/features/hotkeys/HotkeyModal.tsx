import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Toggle } from "../../components/ui/Toggle";
import { Keycap } from "../../components/ui/Keycap";
import { TriggerRecorder } from "../../components/ui/TriggerRecorder";
import { Icon } from "../../components/ui/Icons";
import type { Hotkey } from "../../lib/types";

function nanoid(): string {
  return "h" + Math.random().toString(36).slice(2, 8);
}

const EMPTY_HOTKEY: Hotkey = {
  id: "",
  trigger: "",
  action_type: "send_text",
  action_value: "",
  append_enter: false,
  description: "",
  enabled: true,
};

interface HotkeyModalProps {
  initial: Partial<Hotkey>;
  onSave: (hk: Hotkey) => void;
  onClose: () => void;
}

export function HotkeyModal({ initial, onSave, onClose }: HotkeyModalProps) {
  const isEdit = Boolean(initial.id);
  const [hk, setHk] = useState<Hotkey>({
    ...EMPTY_HOTKEY,
    id: initial.id ?? nanoid(),
    trigger: initial.trigger ?? "",
    action_type: initial.action_type ?? "send_text",
    action_value: initial.action_value ?? "",
    append_enter: initial.append_enter ?? false,
    description: initial.description ?? "",
    enabled: initial.enabled !== false,
  });

  const update = <K extends keyof Hotkey>(k: K, v: Hotkey[K]) =>
    setHk((p) => ({ ...p, [k]: v }));

  const canSave =
    hk.trigger.trim() !== "" &&
    (hk.action_type === "always_on_top" || hk.action_value.trim() !== "");

  return (
    <Modal onClose={onClose}>
      <div className="modal-head">
        <div className="modal-title">
          <span className="kicker">{isEdit ? "Edit" : "New"} Hotkey</span>
          <span style={{ color: "var(--text-2)" }}>
            {hk.trigger ? <Keycap trigger={hk.trigger} /> : "Untitled binding"}
          </span>
        </div>
        <button className="btn ghost sm icon-only" onClick={onClose} type="button">
          <Icon.Close />
        </button>
      </div>

      <div className="modal-body">
        {/* Trigger */}
        <div className="input-group">
          <label>Trigger</label>
          <TriggerRecorder
            value={hk.trigger}
            onChange={(v) => update("trigger", v)}
          />
          <span className="hint">
            Modifiers:{" "}
            <span style={{ color: "var(--text-1)" }}>^</span> Ctrl ·{" "}
            <span style={{ color: "var(--text-1)" }}>+</span> Shift ·{" "}
            <span style={{ color: "var(--text-1)" }}>!</span> Alt ·{" "}
            <span style={{ color: "var(--text-1)" }}>#</span> Win
          </span>
        </div>

        {hk.action_type === "send_text" && (
          <>
            <div className="input-group">
              <label>Text to send</label>
              <textarea
                className="textarea"
                placeholder="Hello, world!"
                value={hk.action_value}
                onChange={(e) => update("action_value", e.target.value)}
              />
              <span className="hint">Use \n for newline, \t for tab.</span>
            </div>
            <div className="flex gap-2" style={{ marginTop: -4 }}>
              <Toggle
                on={hk.append_enter}
                onChange={(v) => update("append_enter", v)}
              />
              <span style={{ fontSize: 12.5 }}>
                Press <Keycap trigger="Enter" /> after sending
              </span>
            </div>
          </>
        )}

        {hk.action_type === "run" && (
          <div className="input-group">
            <label>Command</label>
            <input
              className="input mono"
              placeholder="notepad.exe   or   C:\Tools\thing.bat"
              value={hk.action_value}
              onChange={(e) => update("action_value", e.target.value)}
            />
            <span className="hint">
              Path to an executable, batch file, or URL.
            </span>
          </div>
        )}

        {hk.action_type === "always_on_top" && (
          <div
            style={{
              padding: 12,
              background: "var(--bg-1)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 12.5,
              color: "var(--text-1)",
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <Icon.Lightning />
            <div>
              Pressing this trigger will toggle "Always on Top" for the
              currently focused window. No additional configuration needed.
            </div>
          </div>
        )}

        {hk.action_type === "custom" && (
          <div className="input-group">
            <label>AHK code</label>
            <textarea
              className="textarea"
              placeholder={"Run, https://example.com\nreturn"}
              value={hk.action_value}
              onChange={(e) => update("action_value", e.target.value)}
              style={{ minHeight: 120 }}
            />
            <span className="hint">
              Will be inserted into the generated{" "}
              <span style={{ color: "var(--text-1)" }}>.ahk</span> file as-is.
            </span>
          </div>
        )}

      </div>

      <div className="modal-foot">
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!canSave}
            onClick={() => onSave(hk)}
          >
            {isEdit ? "Save changes" : "Add hotkey"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
