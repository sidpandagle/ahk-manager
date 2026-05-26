import React from "react";
import { parseTrigger } from "../../lib/ahk-trigger";

interface KeycapProps {
  trigger: string;
}

export function Keycap({ trigger }: KeycapProps) {
  const tokens = parseTrigger(trigger);
  if (tokens.length === 0) {
    return (
      <span className="muted mono" style={{ fontSize: 11 }}>
        —
      </span>
    );
  }
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
