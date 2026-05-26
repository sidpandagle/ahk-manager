import React from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icons";

interface ConfirmDialogProps {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  danger?: boolean;
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
  danger = false,
}: ConfirmDialogProps) {
  return (
    <Modal onClose={onClose} className="confirm">
      <div className="modal-body">
        <div
          className="confirm-icon"
          style={
            !danger
              ? {
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                }
              : undefined
          }
        >
          <Icon.Warn />
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>{body}</div>
      </div>
      <div className="modal-foot" style={{ justifyContent: "flex-end" }}>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          style={
            danger
              ? {
                  background: "var(--danger)",
                  borderColor: "var(--danger)",
                  boxShadow: "none",
                }
              : undefined
          }
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
