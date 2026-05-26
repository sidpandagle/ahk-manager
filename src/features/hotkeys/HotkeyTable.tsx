import { useMemo } from "react";
import { Button } from "../../components/ui/Button";
import { Toggle } from "../../components/ui/Toggle";
import { Keycap } from "../../components/ui/Keycap";
import { ActionTag } from "../../components/ui/ActionTag";
import { Icon } from "../../components/ui/Icons";
import type { Profile, Hotkey } from "../../lib/types";

interface HotkeyTableProps {
  profile: Profile;
  query: string;
  onEdit: (h: Hotkey) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
}

export function HotkeyTable({
  profile,
  query,
  onEdit,
  onDelete,
  onToggle,
  onAdd,
  onDuplicate,
}: HotkeyTableProps) {
  const filtered = useMemo(() => {
    if (!query) return profile.hotkeys;
    const q = query.toLowerCase();
    return profile.hotkeys.filter(
      (h) =>
        h.trigger.toLowerCase().includes(q) ||
        h.description.toLowerCase().includes(q) ||
        (h.action_value || "").toLowerCase().includes(q)
    );
  }, [profile.hotkeys, query]);

  if (profile.hotkeys.length === 0) {
    return (
      <div className="empty">
        <div className="empty-mark">
          <Icon.Lightning />
        </div>
        <div className="empty-title">No hotkeys yet</div>
        <div className="empty-desc">
          Add a hotkey to bind a trigger (like{" "}
          <span className="mono">Ctrl+Shift+4</span>) to an action — send text,
          run a command, or write raw AHK.
        </div>
        <Button variant="primary" leftIcon={<Icon.Plus />} onClick={onAdd}>
          Add hotkey
        </Button>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="empty">
        <div className="empty-mark">
          <Icon.Search />
        </div>
        <div className="empty-title">No matches</div>
        <div className="empty-desc">
          No hotkeys match "{query}". Try a different search term.
        </div>
      </div>
    );
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th className="col-toggle" />
          <th className="col-trigger">Trigger</th>
          <th className="col-action">Action</th>
          <th>Description</th>
          <th className="col-actions" />
        </tr>
      </thead>
      <tbody>
        {filtered.map((h) => (
          <tr
            key={h.id}
            className={h.enabled ? "" : "disabled"}
            onDoubleClick={() => onEdit(h)}
          >
            <td className="col-toggle">
              <Toggle on={h.enabled} onChange={() => onToggle(h.id)} />
            </td>
            <td className="col-trigger">
              <span className="drag-handle">
                <Icon.Drag />
              </span>
              <Keycap trigger={h.trigger} />
            </td>
            <td className="col-action">
              <ActionTag type={h.action_type} />
            </td>
            <td>
              <span className={"desc " + (h.description ? "" : "empty")}>
                {h.description || "No description"}
              </span>
              {h.action_type === "send_text" && h.action_value && (
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--text-3)",
                    marginTop: 2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: 360,
                  }}
                >
                  → {h.action_value.replace(/\n/g, "↵").slice(0, 64)}
                </div>
              )}
            </td>
            <td className="col-actions">
              <div className="row-actions">
                <button
                  className="btn ghost sm icon-only"
                  title="Duplicate"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(h.id);
                  }}
                >
                  <Icon.Copy />
                </button>
                <button
                  className="btn ghost sm icon-only"
                  title="Edit"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(h);
                  }}
                >
                  <Icon.Edit />
                </button>
                <button
                  className="btn ghost sm icon-only danger"
                  title="Delete"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(h.id);
                  }}
                >
                  <Icon.Trash />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
