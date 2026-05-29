import { useMemo } from "react";
import { Button } from "../../components/ui/Button";
import { Keycap } from "../../components/ui/Keycap";
import { Icon } from "../../components/ui/Icons";
import type { Profile, Hotkey } from "../../lib/types";

function getCommandPreview(h: Hotkey): string {
  if (h.action_type === "always_on_top") return "Always on top";
  const v = h.action_value || "";
  // Strip AHK Send syntax so we show just the payload
  return v.replace(/^Send,\s*/i, "").replace(/^Send\s*\(/i, "");
}

interface HotkeyTableProps {
  profile: Profile;
  query: string;
  onEdit: (h: Hotkey) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
}

export function HotkeyTable({
  profile,
  query,
  onEdit,
  onDelete,
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
          <th className="col-trigger">Trigger</th>
          <th className="col-command">Command</th>
          <th className="col-actions" />
        </tr>
      </thead>
      <tbody>
        {filtered.map((h) => (
          <tr
            key={h.id}
            onDoubleClick={() => onEdit(h)}
          >
            <td className="col-trigger">
              <span className="drag-handle">
                <Icon.Drag />
              </span>
              <Keycap trigger={h.trigger} />
            </td>
            <td className="col-command">
              <span className="command-preview">{getCommandPreview(h)}</span>
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
