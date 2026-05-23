import customtkinter as ctk
from .ahk_keys import ahk_to_display

_MOD_SYMS = {
    "Control_L": "^", "Control_R": "^",
    "Alt_L": "!", "Alt_R": "!",
    "Shift_L": "+", "Shift_R": "+",
    "Super_L": "#", "Super_R": "#",
}

_VK_TO_AHK = {
    "space": "Space", "tab": "Tab", "return": "Enter",
    "escape": "Escape", "backspace": "BS",
    "delete": "Delete", "insert": "Insert",
    "up": "Up", "down": "Down", "left": "Left", "right": "Right",
    "home": "Home", "end": "End", "prior": "PgUp", "next": "PgDn",
    **{f"f{n}": f"F{n}" for n in range(1, 25)},
}


class KeyRecorder(ctk.CTkToplevel):
    def __init__(self, parent, on_recorded):
        super().__init__(parent)
        self.on_recorded = on_recorded
        self.title("Record Hotkey")
        self.geometry("340x180")
        self.resizable(False, False)
        self.grab_set()
        self.lift()
        self.after(100, self.focus_force)

        self._held_mods: set[str] = set()
        self._result: str | None = None

        ctk.CTkLabel(
            self, text="Press the key combination…",
            font=ctk.CTkFont(size=14),
        ).pack(pady=(28, 8))

        self._display = ctk.CTkLabel(
            self, text="—",
            font=ctk.CTkFont(size=20, weight="bold"),
        )
        self._display.pack(pady=4)

        btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        btn_frame.pack(pady=18)
        ctk.CTkButton(btn_frame, text="Use This", width=110, command=self._confirm).pack(side="left", padx=6)
        ctk.CTkButton(
            btn_frame, text="Cancel", width=110,
            fg_color="gray30", hover_color="gray40",
            command=self.destroy,
        ).pack(side="left", padx=6)

        self.bind("<KeyPress>", self._on_press)
        self.bind("<KeyRelease>", self._on_release)

    def _on_press(self, e):
        if e.keysym in _MOD_SYMS:
            self._held_mods.add(_MOD_SYMS[e.keysym])
            return
        ahk_key = _VK_TO_AHK.get(e.keysym.lower(), e.keysym)
        if len(ahk_key) == 1:
            ahk_key = ahk_key.lower()
        mods = "".join(m for m in ("^", "!", "+", "#") if m in self._held_mods)
        self._result = mods + ahk_key
        self._display.configure(text=ahk_to_display(self._result))

    def _on_release(self, e):
        sym = _MOD_SYMS.get(e.keysym)
        if sym:
            self._held_mods.discard(sym)

    def _confirm(self):
        if self._result and self.on_recorded:
            self.on_recorded(self._result)
        self.destroy()
