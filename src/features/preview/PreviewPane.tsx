import React, { useMemo } from "react";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icons";
import { generateAhk } from "./ahk-codegen";
import type { AhkLine } from "./ahk-codegen";
import type { Profile } from "../../lib/types";
import type { AhkVersion } from "./ahk-codegen";

interface PreviewPaneProps {
  profile: Profile;
  running: boolean;
  ahkVersion?: AhkVersion;
  onCopy: () => void;
  onClose: () => void;
}

export function PreviewPane({
  profile,
  running,
  ahkVersion = 1,
  onCopy,
  onClose,
}: PreviewPaneProps) {
  const lines = useMemo(
    () => generateAhk(profile, ahkVersion),
    [profile, ahkVersion]
  );

  const handleCopy = () => {
    const text = lines
      .map((l) => {
        if (l.k === "blank") return "";
        if (l.k === "hotkey") return l.comment ? `${l.text}  ; ${l.comment}` : l.text;
        return l.text;
      })
      .join("\n");
    navigator.clipboard.writeText(text).catch(() => null);
    onCopy();
  };

  return (
    <div className="preview">
      <div className="preview-head">
        <div className={"preview-head-title " + (running ? "live" : "")}>
          <span className="dot" />
          <span>%TEMP%\ahk_manager_active.ahk</span>
          {running && <span style={{ color: "var(--success)" }}>· live</span>}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Icon.Copy />}
            onClick={handleCopy}
          >
            Copy
          </Button>
          <button
            className="btn ghost sm icon-only"
            onClick={onClose}
            title="Hide preview"
            type="button"
          >
            <Icon.Close />
          </button>
        </div>
      </div>
      <div className="preview-body">
        {lines.map((l, i) => (
          <PreviewLine key={i} line={l} />
        ))}
      </div>
    </div>
  );
}

function PreviewLine({ line }: { line: AhkLine }) {
  if (line.k === "blank") {
    return (
      <div className="line">
        <span />
      </div>
    );
  }
  if (line.k === "comment") {
    return (
      <div className="line">
        <span className="ln-comment">{line.text}</span>
      </div>
    );
  }
  if (line.k === "hotkey") {
    return (
      <div className="line">
        <span>
          <span className="ln-hotkey">{line.text}</span>
          {line.comment && (
            <span className="ln-comment">{"  ; " + line.comment}</span>
          )}
        </span>
      </div>
    );
  }
  if (line.k === "return") {
    return (
      <div className="line">
        <span className="ln-return">{line.text}</span>
      </div>
    );
  }
  // cmd
  return (
    <div className="line">
      <span className="ln-cmd">{highlightCmd(line.text)}</span>
    </div>
  );
}

function highlightCmd(text: string): React.ReactNode {
  const m = text.match(/^(\s*)(\w+)(,?\s*)(.*)$/);
  if (!m) return text;
  return (
    <>
      <span>{m[1]}</span>
      <span className="ln-kw">{m[2]}</span>
      <span>{m[3]}</span>
      <span>{m[4]}</span>
    </>
  );
}
