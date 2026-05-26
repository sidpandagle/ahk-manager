import { useState, useEffect } from "react";

interface EditableTextProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}

export function EditableText({ value, onChange, className }: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);

  useEffect(() => setV(value), [value]);

  if (editing) {
    return (
      <input
        autoFocus
        className={"input " + (className ?? "")}
        style={{
          width: "auto",
          minWidth: 200,
          height: 28,
          fontSize: 18,
          fontWeight: 600,
          padding: "0 6px",
        }}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          onChange(v.trim() || value);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onChange(v.trim() || value);
            setEditing(false);
          } else if (e.key === "Escape") {
            setV(value);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <span
      className={"editable " + (className ?? "")}
      style={{ padding: "0 6px", borderRadius: 6 }}
      onDoubleClick={() => setEditing(true)}
      title="Double-click to rename"
    >
      {value}
    </span>
  );
}
