import os
import subprocess
import tempfile
from pathlib import Path

_proc = None
_temp_file: str | None = None


def is_running() -> bool:
    return _proc is not None and _proc.poll() is None


def start(ahk_content: str, ahk_exe: str) -> tuple[bool, str]:
    global _proc, _temp_file
    stop()

    if not ahk_exe:
        return False, "AutoHotkey.exe path is not configured.\nOpen Settings to set it."
    if not os.path.exists(ahk_exe):
        return False, f"AutoHotkey.exe not found:\n{ahk_exe}\n\nOpen Settings to update the path."

    _temp_file = os.path.join(tempfile.gettempdir(), "ahk_manager_active.ahk")
    try:
        Path(_temp_file).write_text(ahk_content, encoding="utf-8")
        _proc = subprocess.Popen(
            [ahk_exe, _temp_file],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return True, ""
    except Exception as ex:
        _proc = None
        return False, str(ex)


def stop() -> None:
    global _proc
    if _proc is not None:
        try:
            _proc.terminate()
            _proc.wait(timeout=3)
        except Exception:
            try:
                _proc.kill()
            except Exception:
                pass
        _proc = None
