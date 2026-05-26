import React, { useEffect } from "react";

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  width?: number | string;
  className?: string;
}

export function Modal({ children, onClose, width, className }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={"modal " + (className ?? "")}
        style={width ? { width } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
