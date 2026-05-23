import os
import tkinter.filedialog as fd
import customtkinter as ctk


class SettingsDialog(ctk.CTkToplevel):
    def __init__(self, parent, data: dict, on_save):
        super().__init__(parent)
        self.data = data
        self.on_save = on_save
        self.title("Settings")
        self.geometry("480x200")
        self.resizable(False, False)
        self.grab_set()
        self.lift()
        self.after(100, self.focus_force)
        self._build()

    def _build(self):
        pad = {"padx": 20, "pady": (10, 0)}

        ctk.CTkLabel(self, text="AutoHotkey executable path", anchor="w").pack(fill="x", **pad)

        row = ctk.CTkFrame(self, fg_color="transparent")
        row.pack(fill="x", padx=20, pady=(4, 0))

        self._exe_var = ctk.StringVar(value=self.data["settings"].get("ahk_exe_path", ""))
        entry = ctk.CTkEntry(row, textvariable=self._exe_var, placeholder_text="C:\\…\\AutoHotkey.exe")
        entry.pack(side="left", fill="x", expand=True)
        ctk.CTkButton(row, text="Browse…", width=80, command=self._browse).pack(side="left", padx=(6, 0))

        status_text = ""
        exe = self.data["settings"].get("ahk_exe_path", "")
        if exe and os.path.exists(exe):
            status_text = "✓ Found"
            color = "#00c853"
        elif exe:
            status_text = "✗ Not found at this path"
            color = "#ef5350"
        else:
            status_text = "Not configured — AutoHotkey.exe not detected automatically"
            color = "gray60"

        ctk.CTkLabel(self, text=status_text, text_color=color, anchor="w").pack(
            fill="x", padx=20, pady=(4, 0)
        )

        btn_row = ctk.CTkFrame(self, fg_color="transparent")
        btn_row.pack(fill="x", padx=20, pady=18)
        ctk.CTkButton(btn_row, text="Save", width=100, command=self._save).pack(side="right", padx=(6, 0))
        ctk.CTkButton(btn_row, text="Cancel", width=100, fg_color="gray30",
                      hover_color="gray40", command=self.destroy).pack(side="right")

    def _browse(self):
        path = fd.askopenfilename(
            title="Select AutoHotkey.exe",
            filetypes=[("Executable", "*.exe"), ("All files", "*.*")],
        )
        if path:
            self._exe_var.set(path)

    def _save(self):
        self.data["settings"]["ahk_exe_path"] = self._exe_var.get().strip()
        from ..core import profile_store
        profile_store.save(self.data)
        if self.on_save:
            self.on_save()
        self.destroy()
