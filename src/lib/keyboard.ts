// Global keyboard shortcut hook
// Returns a cleanup function; call in useEffect

export type ShortcutHandler = (e: KeyboardEvent) => void;

export interface Shortcut {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  key: string; // e.key value
  handler: ShortcutHandler;
  /** If true, only fires when no modal is open (checks for .modal-backdrop) */
  noModal?: boolean;
}

export function registerShortcuts(shortcuts: Shortcut[]): () => void {
  const onKey = (e: KeyboardEvent) => {
    for (const s of shortcuts) {
      const ctrlMatch = (s.ctrl ?? false) === (e.ctrlKey || e.metaKey);
      const shiftMatch = (s.shift ?? false) === e.shiftKey;
      const altMatch = (s.alt ?? false) === e.altKey;
      const keyMatch = e.key.toLowerCase() === s.key.toLowerCase();

      if (!ctrlMatch || !shiftMatch || !altMatch || !keyMatch) continue;

      if (s.noModal && document.querySelector(".modal-backdrop")) continue;

      e.preventDefault();
      s.handler(e);
      break;
    }
  };

  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}
