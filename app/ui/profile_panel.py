import tkinter as tk
import customtkinter as ctk


class ProfilePanel(ctk.CTkFrame):
    def __init__(self, master, app, width=220):
        super().__init__(master, width=width, corner_radius=8)
        self.app = app
        self.grid_propagate(False)
        self._buttons: dict[str, ctk.CTkButton] = {}
        self._build()

    # ── Layout ────────────────────────────────────────────────────────────────

    def _build(self):
        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(
            self, text="PROFILES",
            font=ctk.CTkFont(size=11, weight="bold"),
            text_color="gray55",
        ).grid(row=0, column=0, sticky="w", padx=14, pady=(14, 6))

        self._list_frame = ctk.CTkScrollableFrame(self, fg_color="transparent")
        self._list_frame.grid(row=1, column=0, sticky="nsew", padx=6, pady=0)
        self._list_frame.grid_columnconfigure(0, weight=1)

        ctk.CTkButton(
            self, text="+ New Profile", height=32,
            fg_color="transparent", hover_color="gray30",
            border_width=1, border_color="gray35",
            command=self._add_profile,
        ).grid(row=2, column=0, sticky="ew", padx=10, pady=10)

    # ── Public refresh ────────────────────────────────────────────────────────

    def refresh(self, data: dict, current_pid: str | None):
        for w in self._list_frame.winfo_children():
            w.destroy()
        self._buttons.clear()

        profiles = data.get("profiles", {})
        for pid, profile in profiles.items():
            is_active = pid == current_pid
            btn = ctk.CTkButton(
                self._list_frame,
                text=profile["name"],
                height=34,
                anchor="w",
                fg_color=("gray80", "gray25") if is_active else "transparent",
                hover_color=("gray75", "gray30"),
                text_color=("gray10", "gray95") if is_active else ("gray20", "gray75"),
                font=ctk.CTkFont(weight="bold" if is_active else "normal"),
                command=lambda p=pid: self.app.select_profile(p),
            )
            btn.pack(fill="x", pady=2)
            btn.bind("<Button-3>", lambda e, p=pid: self._show_context_menu(e, p))
            self._buttons[pid] = btn

    # ── Context menu ──────────────────────────────────────────────────────────

    def _show_context_menu(self, event, pid: str):
        menu = tk.Menu(self, tearoff=0, bg="#2b2b2b", fg="white",
                       activebackground="#3c3c3c", activeforeground="white",
                       relief="flat", bd=0)
        menu.add_command(label="Rename…",   command=lambda: self._rename(pid))
        menu.add_command(label="Duplicate", command=lambda: self._duplicate(pid))
        menu.add_separator()
        menu.add_command(label="Delete",    command=lambda: self._delete(pid),
                         foreground="#ef5350")
        try:
            menu.tk_popup(event.x_root, event.y_root)
        finally:
            menu.grab_release()

    # ── Profile actions ───────────────────────────────────────────────────────

    def _add_profile(self):
        d = ctk.CTkInputDialog(text="Profile name:", title="New Profile")
        name = d.get_input()
        if name and name.strip():
            from ..core import profile_store
            pid = profile_store.new_profile(self.app.data, name.strip())
            self.app.select_profile(pid)

    def _rename(self, pid: str):
        current = self.app.data["profiles"][pid]["name"]
        d = ctk.CTkInputDialog(text="New name:", title="Rename Profile")
        name = d.get_input()
        if name and name.strip() and name.strip() != current:
            from ..core import profile_store
            profile_store.rename_profile(self.app.data, pid, name.strip())
            self.app.refresh()

    def _duplicate(self, pid: str):
        from ..core import profile_store
        new_pid = profile_store.duplicate_profile(self.app.data, pid)
        self.app.select_profile(new_pid)

    def _delete(self, pid: str):
        profile_name = self.app.data["profiles"][pid]["name"]
        dlg = _ConfirmDialog(self, f'Delete "{profile_name}"?',
                             "This cannot be undone.")
        self.wait_window(dlg)
        if dlg.confirmed:
            from ..core import profile_store
            profile_store.delete_profile(self.app.data, pid)
            remaining = list(self.app.data["profiles"])
            self.app.select_profile(remaining[0] if remaining else None)


class _ConfirmDialog(ctk.CTkToplevel):
    def __init__(self, parent, title: str, message: str):
        super().__init__(parent)
        self.confirmed = False
        self.title(title)
        self.geometry("320x150")
        self.resizable(False, False)
        self.grab_set()
        self.lift()

        ctk.CTkLabel(self, text=title, font=ctk.CTkFont(size=14, weight="bold")).pack(pady=(20, 4))
        ctk.CTkLabel(self, text=message, text_color="gray60").pack()

        row = ctk.CTkFrame(self, fg_color="transparent")
        row.pack(pady=18)
        ctk.CTkButton(row, text="Delete", width=100, fg_color="#c62828",
                      hover_color="#b71c1c", command=self._confirm).pack(side="left", padx=8)
        ctk.CTkButton(row, text="Cancel", width=100, fg_color="gray30",
                      hover_color="gray40", command=self.destroy).pack(side="left", padx=8)

    def _confirm(self):
        self.confirmed = True
        self.destroy()
