import customtkinter as ctk
from ..utils.ahk_keys import ahk_to_display

_ACTION_LABELS = {
    "send_text":    "Send Text",
    "run_command":  "Run Command",
    "always_on_top":"Always on Top",
    "custom_ahk":   "Custom AHK",
}

_COL_TRIGGER = 160
_COL_ACTION  = 130
_BTN_W       = 32


class HotkeyTable(ctk.CTkFrame):
    def __init__(self, master, app):
        super().__init__(master, corner_radius=8)
        self.app = app
        self._rows: list[_HotkeyRow] = []
        self._build()

    # ── Layout ────────────────────────────────────────────────────────────────

    def _build(self):
        self.grid_rowconfigure(2, weight=1)
        self.grid_columnconfigure(0, weight=1)

        # Profile header
        self._header = ctk.CTkFrame(self, fg_color="transparent", height=40)
        self._header.grid(row=0, column=0, sticky="ew", padx=12, pady=(10, 0))
        self._header.grid_propagate(False)
        self._header.grid_columnconfigure(0, weight=1)

        self._profile_label = ctk.CTkLabel(
            self._header, text="No profile selected",
            font=ctk.CTkFont(size=15, weight="bold"), anchor="w",
        )
        self._profile_label.grid(row=0, column=0, sticky="w")

        self._status_label = ctk.CTkLabel(
            self._header, text="● Stopped",
            text_color="gray55", font=ctk.CTkFont(size=13),
        )
        self._status_label.grid(row=0, column=1, sticky="e")

        # Column headers
        col_header = ctk.CTkFrame(self, fg_color=("gray85", "gray20"), corner_radius=4, height=28)
        col_header.grid(row=1, column=0, sticky="ew", padx=12, pady=(6, 0))
        col_header.grid_propagate(False)
        col_header.grid_columnconfigure(3, weight=1)

        for text, col, width in (
            ("", 0, 30),
            ("Trigger", 1, _COL_TRIGGER),
            ("Action", 2, _COL_ACTION),
            ("Description", 3, 80),
        ):
            ctk.CTkLabel(
                col_header, text=text, anchor="w",
                font=ctk.CTkFont(size=11, weight="bold"),
                text_color=("gray40", "gray65"),
            ).grid(row=0, column=col, sticky="w", padx=(8 if col == 0 else 4, 0), pady=4)

        # Scrollable row area
        self._scroll = ctk.CTkScrollableFrame(self, fg_color="transparent")
        self._scroll.grid(row=2, column=0, sticky="nsew", padx=12, pady=4)
        self._scroll.grid_columnconfigure(0, weight=1)

        # Empty-state label
        self._empty_label = ctk.CTkLabel(
            self._scroll,
            text="No hotkeys yet. Click + Add Hotkey to get started.",
            text_color="gray55",
        )

        # Footer
        footer = ctk.CTkFrame(self, fg_color="transparent", height=44)
        footer.grid(row=3, column=0, sticky="ew", padx=12, pady=(0, 10))
        footer.grid_propagate(False)

        ctk.CTkButton(
            footer, text="+ Add Hotkey", width=130, height=32,
            command=self._add_hotkey,
        ).pack(side="left", pady=6)

    # ── Public refresh ────────────────────────────────────────────────────────

    def refresh(self, pid: str | None, data: dict, running: bool):
        profile = data["profiles"].get(pid) if pid else None
        name = profile["name"] if profile else "No profile selected"
        self._profile_label.configure(text=f"Profile:  {name}" if profile else name)
        self._set_status(running and pid == data.get("active_profile"))

        # Remove existing rows
        for row in self._rows:
            row.destroy()
        self._rows.clear()
        self._empty_label.pack_forget()

        if not profile:
            return

        hotkeys = profile.get("hotkeys", [])
        if not hotkeys:
            self._empty_label.pack(pady=30)
            return

        for hk in hotkeys:
            row = _HotkeyRow(self._scroll, hk, self)
            row.pack(fill="x", pady=2)
            self._rows.append(row)

    def _set_status(self, running: bool):
        if running:
            self._status_label.configure(text="● Running", text_color="#00c853")
        else:
            self._status_label.configure(text="● Stopped", text_color="gray55")

    # ── Hotkey CRUD ───────────────────────────────────────────────────────────

    def _add_hotkey(self):
        from .hotkey_dialog import HotkeyDialog

        pid = self.app.current_pid
        if not pid:
            return

        def on_save(hk):
            from ..core import profile_store
            profile_store.add_hotkey(self.app.data, pid, hk)
            self.app.on_data_changed()

        HotkeyDialog(self, on_save=on_save)

    def edit_hotkey(self, hk: dict):
        from .hotkey_dialog import HotkeyDialog

        pid = self.app.current_pid
        if not pid:
            return

        def on_save(updated):
            from ..core import profile_store
            profile_store.update_hotkey(self.app.data, pid, hk["id"], updated)
            self.app.on_data_changed(prompt_restart=True)

        HotkeyDialog(self, hotkey=dict(hk), on_save=on_save)

    def delete_hotkey(self, hk: dict):
        pid = self.app.current_pid
        if not pid:
            return
        from ..core import profile_store
        profile_store.delete_hotkey(self.app.data, pid, hk["id"])
        self.app.on_data_changed()

    def toggle_hotkey(self, hk: dict, enabled: bool):
        pid = self.app.current_pid
        if not pid:
            return
        hk["enabled"] = enabled
        from ..core import profile_store
        profile_store.update_hotkey(self.app.data, pid, hk["id"], hk)
        self.app.on_data_changed(prompt_restart=True)

    def move_hotkey(self, hk: dict, direction: int):
        pid = self.app.current_pid
        if not pid:
            return
        from ..core import profile_store
        profile_store.move_hotkey(self.app.data, pid, hk["id"], direction)
        self.app.on_data_changed()


class _HotkeyRow(ctk.CTkFrame):
    def __init__(self, master, hk: dict, table: HotkeyTable):
        super().__init__(master, corner_radius=4, height=36, fg_color=("gray92", "gray16"))
        self.hk = hk
        self.table = table
        self.pack_propagate(False)
        self._build()
        self.bind("<Double-Button-1>", lambda _e: self.table.edit_hotkey(self.hk))

    def _build(self):
        self.grid_columnconfigure(3, weight=1)

        # Enabled checkbox
        self._enabled_var = ctk.BooleanVar(value=self.hk.get("enabled", True))
        cb = ctk.CTkCheckBox(
            self, text="", variable=self._enabled_var,
            width=24, checkbox_width=16, checkbox_height=16,
            command=lambda: self.table.toggle_hotkey(self.hk, self._enabled_var.get()),
        )
        cb.grid(row=0, column=0, padx=(8, 2), pady=4, sticky="w")
        cb.bind("<Double-Button-1>", lambda e: "break")

        # Trigger
        ctk.CTkLabel(
            self, text=ahk_to_display(self.hk.get("trigger", "")),
            width=_COL_TRIGGER, anchor="w",
            font=ctk.CTkFont(family="Consolas", size=12),
        ).grid(row=0, column=1, padx=4, sticky="w")

        # Action type
        ctk.CTkLabel(
            self, text=_ACTION_LABELS.get(self.hk.get("action_type", ""), ""),
            width=_COL_ACTION, anchor="w",
            font=ctk.CTkFont(size=12),
        ).grid(row=0, column=2, padx=4, sticky="w")

        # Description (truncated if long)
        desc = self.hk.get("description", "") or ""
        ctk.CTkLabel(
            self, text=desc, anchor="w",
            font=ctk.CTkFont(size=12), text_color="gray60",
        ).grid(row=0, column=3, padx=4, sticky="ew")

        # Action buttons
        btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        btn_frame.grid(row=0, column=4, padx=(4, 6), pady=3, sticky="e")

        ctk.CTkButton(
            btn_frame, text="↑", width=_BTN_W, height=24,
            fg_color="transparent", hover_color="gray30",
            command=lambda: self.table.move_hotkey(self.hk, -1),
        ).pack(side="left", padx=1)

        ctk.CTkButton(
            btn_frame, text="↓", width=_BTN_W, height=24,
            fg_color="transparent", hover_color="gray30",
            command=lambda: self.table.move_hotkey(self.hk, 1),
        ).pack(side="left", padx=1)

        ctk.CTkButton(
            btn_frame, text="✎", width=_BTN_W, height=24,
            fg_color="transparent", hover_color="gray30",
            command=lambda: self.table.edit_hotkey(self.hk),
        ).pack(side="left", padx=1)

        ctk.CTkButton(
            btn_frame, text="✕", width=_BTN_W, height=24,
            fg_color="transparent", hover_color="#c62828",
            command=lambda: self.table.delete_hotkey(self.hk),
        ).pack(side="left", padx=1)
