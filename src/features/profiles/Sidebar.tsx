import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icons";
import type { Profile } from "../../lib/types";

interface SidebarProps {
  profiles: Record<string, Profile>;
  activeId: string | null;
  runningId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onApply: (id: string) => void;
  onStop: () => void;
}

export function Sidebar({
  profiles,
  activeId,
  runningId,
  onSelect,
  onCreate,
  onDelete,
  onDuplicate,
  onApply,
  onStop,
}: SidebarProps) {
  const ids = Object.keys(profiles);

  return (
    <div className="sidebar">
      <div className="sidebar-head">
        <span className="sidebar-head-title">Profiles</span>
        <span className="sidebar-head-count">
          {ids.length.toString().padStart(2, "0")}
        </span>
      </div>

      <div className="sidebar-list">
        {ids.map((id) => {
          const p = profiles[id];
          const active = id === activeId;
          const running = id === runningId;

          return (
            <div
              key={id}
              className={
                "profile-item" +
                (active ? " active" : "") +
                (running ? " running" : "")
              }
              onClick={() => onSelect(id)}
            >
              <span className="pi-dot" />
              <span className="pi-name">{p.name}</span>

              {!running && (
                <span className="pi-count">{p.hotkeys.length}</span>
              )}

              {running ? (
                <button
                  className="pi-action-btn stop-btn"
                  title="Stop this script"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStop();
                  }}
                >
                  <Icon.Stop />
                </button>
              ) : (
                <span className="pi-actions">
                  <button
                    className="pi-action-btn apply-btn"
                    title="Apply this profile (Ctrl+Enter)"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(id);
                      onApply(id);
                    }}
                  >
                    <Icon.Play />
                  </button>
                  <button
                    className="pi-action-btn"
                    title="Duplicate"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate(id);
                    }}
                  >
                    <Icon.Copy />
                  </button>
                  <button
                    className="pi-action-btn"
                    title="Delete"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(id);
                    }}
                  >
                    <Icon.Trash />
                  </button>
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="sidebar-foot">
        <Button
          variant="ghost"
          style={{ width: "100%", justifyContent: "flex-start" }}
          leftIcon={<Icon.Plus />}
          onClick={onCreate}
        >
          New Profile
        </Button>
      </div>
    </div>
  );
}
