import uuid
import customtkinter as ctk

_ACTION_TYPES = [
    ("send_text",    "Send Text"),
    ("run_command",  "Run Command"),
    ("always_on_top","Always on Top"),
    ("custom_ahk",   "Custom AHK"),
]
_LABEL_TO_KEY = {label: key for key, label in _ACTION_TYPES}
_KEY_TO_LABEL = {key: label for key, label in _ACTION_TYPES}
_ACTION_LABELS = [label for _, label in _ACTION_TYPES]


class HotkeyDialog(ctk.CTkToplevel):
    def __init__(self, parent, hotkey: dict | None = None, on_save=None):
        super().__init__(parent)
        self.on_save = on_save
        self._hk = hotkey or {
            "id": str(uuid.uuid4()),
            "trigger": "",
            "action_type": "send_text",
            "action_value": "",
            "append_enter": False,
            "description": "",
            "enabled": True,
        }
        self.title("Edit Hotkey" if hotkey else "Add Hotkey")
        self.geometry("500x440")
        self.resizable(False, False)
        self.grab_set()
        self.lift()
        self.after(100, self.focus_force)

        self._build()
        self._populate()
        self._refresh_value_area()

    # ── Layout ────────────────────────────────────────────────────────────────

    def _build(self):
        PAD = {"padx": 20, "pady": (6, 0)}

        # Trigger row
        ctk.CTkLabel(self, text="Trigger  (AHK notation, e.g. ^+4)", anchor="w").pack(fill="x", **PAD)
        trow = ctk.CTkFrame(self, fg_color="transparent")
        trow.pack(fill="x", padx=20, pady=(2, 0))
        self._trigger_var = ctk.StringVar()
        self._trigger_entry = ctk.CTkEntry(trow, textvariable=self._trigger_var, placeholder_text="^+4")
        self._trigger_entry.pack(side="left", fill="x", expand=True)
        ctk.CTkButton(trow, text="Record", width=75, command=self._record).pack(side="left", padx=(6, 0))

        # Action type
        ctk.CTkLabel(self, text="Action Type", anchor="w").pack(fill="x", **PAD)
        self._type_var = ctk.StringVar(value="Send Text")
        ctk.CTkOptionMenu(
            self, values=_ACTION_LABELS,
            variable=self._type_var,
            command=lambda _: self._refresh_value_area(),
        ).pack(fill="x", padx=20, pady=(2, 0))

        # Variable area (rebuilt on type change)
        self._var_frame = ctk.CTkFrame(self, fg_color="transparent")
        self._var_frame.pack(fill="x", padx=20, pady=(8, 0))

        # Separator
        ctk.CTkFrame(self, height=1, fg_color="gray30").pack(fill="x", padx=20, pady=10)

        # Description
        ctk.CTkLabel(self, text="Description  (optional)", anchor="w").pack(fill="x", **PAD)
        self._desc_var = ctk.StringVar()
        ctk.CTkEntry(self, textvariable=self._desc_var, placeholder_text="Short note").pack(fill="x", padx=20, pady=(2, 0))

        # Enabled
        self._enabled_var = ctk.BooleanVar(value=True)
        ctk.CTkCheckBox(self, text="Enabled", variable=self._enabled_var).pack(anchor="w", padx=20, pady=8)

        # Buttons
        btn_row = ctk.CTkFrame(self, fg_color="transparent")
        btn_row.pack(fill="x", padx=20, pady=(4, 14))
        ctk.CTkButton(btn_row, text="Save", width=110, command=self._save).pack(side="right", padx=(6, 0))
        ctk.CTkButton(
            btn_row, text="Cancel", width=110,
            fg_color="gray30", hover_color="gray40",
            command=self.destroy,
        ).pack(side="right")

    def _populate(self):
        hk = self._hk
        self._trigger_var.set(hk.get("trigger", ""))
        self._type_var.set(_KEY_TO_LABEL.get(hk.get("action_type", "send_text"), "Send Text"))
        self._desc_var.set(hk.get("description", ""))
        self._enabled_var.set(hk.get("enabled", True))

    def _refresh_value_area(self):
        for w in self._var_frame.winfo_children():
            w.destroy()

        action_type = _LABEL_TO_KEY.get(self._type_var.get(), "send_text")
        value = self._hk.get("action_value", "")
        append_enter = self._hk.get("append_enter", False)

        if action_type == "send_text":
            ctk.CTkLabel(self._var_frame, text="Text to send", anchor="w").pack(fill="x")
            self._value_entry = ctk.CTkEntry(self._var_frame, placeholder_text="Text here…")
            self._value_entry.pack(fill="x", pady=(2, 4))
            self._value_entry.insert(0, value)
            self._append_var = ctk.BooleanVar(value=append_enter)
            ctk.CTkCheckBox(self._var_frame, text="Append {Enter} after text", variable=self._append_var).pack(anchor="w")

        elif action_type == "run_command":
            ctk.CTkLabel(self._var_frame, text="Command / program path", anchor="w").pack(fill="x")
            self._value_entry = ctk.CTkEntry(self._var_frame, placeholder_text='notepad.exe  or  C:\\path\\app.exe')
            self._value_entry.pack(fill="x", pady=(2, 0))
            self._value_entry.insert(0, value)

        elif action_type == "always_on_top":
            ctk.CTkLabel(
                self._var_frame,
                text="Toggles always-on-top for the active window.\nNo further configuration needed.",
                text_color="gray60",
                justify="left",
            ).pack(anchor="w")

        elif action_type == "custom_ahk":
            ctk.CTkLabel(self._var_frame, text="AHK body  (no trigger line or return)", anchor="w").pack(fill="x")
            self._value_text = ctk.CTkTextbox(self._var_frame, height=90, font=ctk.CTkFont(family="Consolas", size=12))
            self._value_text.pack(fill="x", pady=(2, 0))
            self._value_text.insert("1.0", value)

    # ── Actions ───────────────────────────────────────────────────────────────

    def _record(self):
        from ..utils.key_recorder import KeyRecorder

        def on_recorded(trigger):
            self._trigger_var.set(trigger)

        KeyRecorder(self, on_recorded)

    def _save(self):
        trigger = self._trigger_var.get().strip()
        if not trigger:
            self._trigger_entry.configure(border_color="red")
            self._trigger_entry.focus_set()
            return
        self._trigger_entry.configure(border_color=("gray65", "gray35"))

        action_type = _LABEL_TO_KEY.get(self._type_var.get(), "send_text")

        if action_type == "custom_ahk":
            value = self._value_text.get("1.0", "end-1c") if hasattr(self, "_value_text") else ""
            append_enter = False
        elif action_type == "always_on_top":
            value = ""
            append_enter = False
        else:
            value = self._value_entry.get() if hasattr(self, "_value_entry") else ""
            append_enter = self._append_var.get() if hasattr(self, "_append_var") else False

        result = {
            **self._hk,
            "trigger": trigger,
            "action_type": action_type,
            "action_value": value,
            "append_enter": append_enter,
            "description": self._desc_var.get().strip(),
            "enabled": self._enabled_var.get(),
        }

        if self.on_save:
            self.on_save(result)
        self.destroy()
