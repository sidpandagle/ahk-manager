import tkinter.filedialog as fd
import tkinter.messagebox as mb
import customtkinter as ctk

from ..core import profile_store, ahk_generator, ahk_runner
from .profile_panel import ProfilePanel
from .hotkey_table import HotkeyTable


class MainWindow(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("AHK Manager")
        self.geometry("960x620")
        self.minsize(720, 440)

        self.data = profile_store.load()
        self.current_pid: str | None = (
            self.data.get("active_profile")
            or next(iter(self.data.get("profiles", {})), None)
        )

        self._build()
        self.refresh()
        self.protocol("WM_DELETE_WINDOW", self._on_close)

        # Periodically sync the running state (AHK can crash externally)
        self._poll_runner()

    # ── Layout ────────────────────────────────────────────────────────────────

    def _build(self):
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.profile_panel = ProfilePanel(self, app=self, width=220)
        self.profile_panel.grid(row=0, column=0, sticky="nsw", padx=(10, 6), pady=10)

        self.hotkey_table = HotkeyTable(self, app=self)
        self.hotkey_table.grid(row=0, column=1, sticky="nsew", padx=(0, 10), pady=10)

        self._build_toolbar()

    def _build_toolbar(self):
        tb = ctk.CTkFrame(self, height=52, corner_radius=0, fg_color=("gray85", "gray18"))
        tb.grid(row=1, column=0, columnspan=2, sticky="ew")
        tb.grid_propagate(False)

        self._apply_btn = ctk.CTkButton(
            tb, text="▶  Apply", width=110,
            command=self.apply,
        )
        self._apply_btn.pack(side="left", padx=(12, 4), pady=10)

        self._stop_btn = ctk.CTkButton(
            tb, text="■  Stop", width=100,
            fg_color="gray35", hover_color="gray45",
            command=self.stop,
        )
        self._stop_btn.pack(side="left", padx=4, pady=10)

        ctk.CTkButton(
            tb, text="↑  Export .ahk", width=130,
            fg_color="gray35", hover_color="gray45",
            command=self.export_ahk,
        ).pack(side="left", padx=(14, 4), pady=10)

        ctk.CTkButton(
            tb, text="↓  Import .ahk", width=130,
            fg_color="gray35", hover_color="gray45",
            command=self.import_ahk,
        ).pack(side="left", padx=4, pady=10)

        ctk.CTkButton(
            tb, text="⚙  Settings", width=110,
            fg_color="transparent", hover_color="gray35",
            command=self.open_settings,
        ).pack(side="right", padx=12, pady=10)

    # ── Public API (called by child widgets) ─────────────────────────────────

    def select_profile(self, pid: str | None):
        self.current_pid = pid
        self.refresh()

    def on_data_changed(self, prompt_restart: bool = False):
        if prompt_restart and self.current_pid == self.data.get("active_profile") and ahk_runner.is_running():
            if mb.askyesno("Restart?", "The profile is currently running.\nRestart to apply changes?", parent=self):
                self.apply()
                return
        self.refresh()

    def refresh(self):
        running = ahk_runner.is_running()
        self.profile_panel.refresh(self.data, self.current_pid)
        self.hotkey_table.refresh(self.current_pid, self.data, running)
        self._update_toolbar(running)

    def _update_toolbar(self, running: bool):
        if running and self.current_pid == self.data.get("active_profile"):
            self._apply_btn.configure(fg_color="#1565c0", hover_color="#0d47a1")
            self._stop_btn.configure(state="normal")
        else:
            self._apply_btn.configure(fg_color=("#1f6aa5", "#1f6aa5"), hover_color=("#144870", "#144870"))
            self._stop_btn.configure(state="normal")

    # ── Toolbar actions ───────────────────────────────────────────────────────

    def apply(self):
        pid = self.current_pid
        if not pid:
            mb.showwarning("No profile", "Select a profile first.", parent=self)
            return

        profile = self.data["profiles"][pid]
        exe = self.data["settings"].get("ahk_exe_path", "")
        content = ahk_generator.generate(profile, exe_path=exe)

        ok, err = ahk_runner.start(content, exe)
        if not ok:
            if mb.askyesno("AutoHotkey not found",
                           f"{err}\n\nOpen Settings to set the path?", parent=self):
                self.open_settings()
            return

        self.data["active_profile"] = pid
        profile_store.save(self.data)
        self.refresh()

    def stop(self):
        ahk_runner.stop()
        self.refresh()

    def export_ahk(self):
        pid = self.current_pid
        if not pid:
            mb.showwarning("No profile", "Select a profile first.", parent=self)
            return

        profile = self.data["profiles"][pid]
        exe = self.data["settings"].get("ahk_exe_path", "")
        path = fd.asksaveasfilename(
            title="Export profile as .ahk",
            defaultextension=".ahk",
            initialfile=f"{profile['name']}.ahk",
            filetypes=[("AutoHotkey script", "*.ahk"), ("All files", "*.*")],
        )
        if path:
            content = ahk_generator.generate(profile, exe_path=exe)
            try:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)
                mb.showinfo("Exported", f"Saved to:\n{path}", parent=self)
            except Exception as ex:
                mb.showerror("Export failed", str(ex), parent=self)

    def import_ahk(self):
        path = fd.askopenfilename(
            title="Import .ahk file",
            filetypes=[("AutoHotkey script", "*.ahk"), ("All files", "*.*")],
        )
        if not path:
            return

        import os
        from ..core.profile_store import _parse_ahk_file

        hotkeys = _parse_ahk_file(path)
        if not hotkeys:
            mb.showwarning("Nothing imported",
                           "No recognisable hotkeys found in the file.", parent=self)
            return

        base_name = os.path.splitext(os.path.basename(path))[0]
        d = ctk.CTkInputDialog(text="Profile name for import:", title="Import .ahk")
        name = d.get_input()
        if not name or not name.strip():
            name = base_name

        pid = profile_store.new_profile(self.data, name.strip())
        self.data["profiles"][pid]["hotkeys"] = hotkeys
        profile_store.save(self.data)
        self.select_profile(pid)
        mb.showinfo("Imported", f"Created profile "{name}" with {len(hotkeys)} hotkey(s).", parent=self)

    def open_settings(self):
        from .settings_dialog import SettingsDialog
        SettingsDialog(self, self.data, on_save=self.refresh)

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    def _poll_runner(self):
        # Refresh status if runner state changed (e.g. AHK crashed)
        running = ahk_runner.is_running()
        active = self.data.get("active_profile")
        # Check if the stop_btn state is inconsistent with actual running state
        # (lightweight check — no full refresh needed normally)
        self._update_toolbar(running)
        self.after(2000, self._poll_runner)

    def _on_close(self):
        ahk_runner.stop()
        self.destroy()
