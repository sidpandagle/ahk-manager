import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Icon } from "../../components/ui/Icons";
import type { ToastKind, ToastPayload } from "../../lib/types";

interface ToastItem extends ToastPayload {
  id: number;
  kind: ToastKind;
}

interface ToastContextValue {
  push: (payload: ToastPayload) => void;
}

const ToastCtx = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback((t: ToastPayload) => {
    const id = ++idRef.current;
    const item: ToastItem = { id, kind: "info", ...t };
    setToasts((cur) => [...cur, item]);
    setTimeout(
      () => setToasts((cur) => cur.filter((x) => x.id !== id)),
      t.duration ?? 3600
    );
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((cur) => cur.filter((x) => x.id !== id));
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={"toast " + t.kind}>
            <div className="toast-body">
              <div className="toast-title">{t.title}</div>
              {t.desc && <div className="toast-desc">{t.desc}</div>}
            </div>
            <button
              className="toast-close"
              onClick={() => dismiss(t.id)}
              type="button"
            >
              <Icon.Close />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
