import type { ActionType } from "../../lib/types";

interface ActionMeta {
  label: string;
  cls: string;
}

export const ACTION_META: Record<ActionType, ActionMeta> = {
  send_text: { label: "Send Text", cls: "send" },
  run: { label: "Run", cls: "run" },
  always_on_top: { label: "Always Top", cls: "top" },
  custom: { label: "Custom AHK", cls: "custom" },
};

interface ActionTagProps {
  type: ActionType;
}

export function ActionTag({ type }: ActionTagProps) {
  const m = ACTION_META[type] ?? ACTION_META.send_text;
  return <span className={"tag " + m.cls}>{m.label}</span>;
}
