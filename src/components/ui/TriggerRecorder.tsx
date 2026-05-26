import { useState, useEffect, useRef } from "react";
import { Keycap } from "./Keycap";
import { Icon } from "./Icons";
import { keyEventToTrigger } from "../../lib/ahk-trigger";
import { startRecordingCapture, stopRecordingCapture } from "../../lib/tauri";

interface TriggerRecorderProps {
  value: string;
  onChange: (v: string) => void;
}

export function TriggerRecorder({ value, onChange }: TriggerRecorderProps) {
  const [listening, setListening] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Pause AHK process while recording to avoid firing hotkeys
  useEffect(() => {
    if (listening) {
      startRecordingCapture().catch(() => {/* AHK may not be running */});
    } else {
      stopRecordingCapture().catch(() => {/* AHK may not be running */});
    }
  }, [listening]);

  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const trigger = keyEventToTrigger(e);
      if (trigger) {
        onChange(trigger);
        setListening(false);
      }
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
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          gap: 6,
          alignItems: "center",
        }}
      >
        {value && !listening && (
          <button
            className="btn ghost sm icon-only"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            title="Clear"
            type="button"
          >
            <Icon.Close />
          </button>
        )}
        {!listening && (
          <span
            className="muted mono"
            style={{ fontSize: 10, paddingRight: 4 }}
          >
            ↵ to record
          </span>
        )}
      </div>
    </div>
  );
}
