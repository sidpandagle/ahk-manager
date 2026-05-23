import copy
import json
import os
import re
import uuid
from pathlib import Path

PROFILES_FILE = Path(__file__).parents[2] / "profiles.json"

_DEFAULT_SETTINGS = {
    "ahk_exe_path": "",
    "launch_profile_on_start": None,
    "start_minimized": False,
}


def _find_ahk_exe() -> str:
    candidates = [
        r"C:\Program Files\AutoHotkey\AutoHotkey.exe",
        r"C:\Program Files\AutoHotkey\v2\AutoHotkey64.exe",
        r"C:\Program Files\AutoHotkey\v2\AutoHotkey32.exe",
        r"C:\Program Files (x86)\AutoHotkey\AutoHotkey.exe",
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return ""


def _parse_ahk_file(path) -> list:
    hotkeys = []
    try:
        text = Path(path).read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return hotkeys

    lines = text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line or line.startswith(";"):
            i += 1
            continue

        m = re.match(r"^(\S+?)::", line)
        if m:
            trigger = m.group(1)
            desc = ""
            if ";" in line:
                desc = line.split(";", 1)[1].strip()
                for prefix in ("Hotkey:", "hotkey:", "Hotkey :", "hotkey :"):
                    if desc.startswith(prefix):
                        desc = desc[len(prefix):].strip()

            body = []
            i += 1
            while i < len(lines):
                bl = lines[i].strip()
                if bl.lower() == "return":
                    i += 1
                    break
                if bl and not bl.startswith(";"):
                    body.append(bl)
                i += 1

            hk = _classify_hotkey(trigger, body, desc)
            if hk:
                hotkeys.append(hk)
        else:
            i += 1

    return hotkeys


def _classify_hotkey(trigger: str, body: list, description: str = "") -> dict | None:
    if not body:
        return None

    # Always on top
    if any(re.search(r"(?i)winset\s*,\s*alwaysontop", bl) for bl in body):
        return _hk(trigger, "always_on_top", "", False, description or "Toggle always on top")

    # Simple Run (single line)
    if len(body) == 1:
        m = re.match(r"(?i)run\s*,\s*(.+)", body[0])
        if m:
            return _hk(trigger, "run_command", m.group(1).strip(), False, description)

    # Analyse Send lines
    sends = []
    all_send = True
    for bl in body:
        m = re.match(r"(?i)send\s*,\s*(.+)", bl)
        if m:
            sends.append(m.group(1).strip())
        else:
            all_send = False
            break

    if all_send and sends:
        text_parts = []
        append_enter = False
        for s in sends:
            if s == "{Enter}":
                append_enter = True
            elif s == "{Tab}":
                text_parts.append("{Tab}")
            else:
                text_parts.append(s)

        real_texts = [p for p in text_parts if p != "{Tab}"]
        if len(real_texts) <= 1:
            return _hk(trigger, "send_text", "".join(text_parts), append_enter, description)

    # Fallback: raw AHK snippet
    return _hk(trigger, "custom_ahk", "\n".join(body), False, description)


def _hk(trigger, action_type, action_value, append_enter, description) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "trigger": trigger,
        "action_type": action_type,
        "action_value": action_value,
        "append_enter": append_enter,
        "description": description,
        "enabled": True,
    }


# ── Public API ─────────────────────────────────────────────────────────────────

def load() -> dict:
    if PROFILES_FILE.exists():
        try:
            data = json.loads(PROFILES_FILE.read_text(encoding="utf-8"))
            for k, v in _DEFAULT_SETTINGS.items():
                data.setdefault("settings", {}).setdefault(k, v)
            return data
        except Exception:
            pass

    data = {
        "active_profile": None,
        "profiles": {},
        "settings": _DEFAULT_SETTINGS.copy(),
    }
    data["settings"]["ahk_exe_path"] = _find_ahk_exe()

    ahk_path = PROFILES_FILE.parent / "Untitled.ahk"
    if ahk_path.exists():
        hotkeys = _parse_ahk_file(ahk_path)
        pid = "default"
        data["profiles"][pid] = {"name": "Default", "hotkeys": hotkeys}
        data["active_profile"] = pid

    save(data)
    return data


def save(data: dict) -> None:
    PROFILES_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def new_profile(data: dict, name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "profile"
    pid = base
    n = 1
    while pid in data["profiles"]:
        pid = f"{base}-{n}"
        n += 1
    data["profiles"][pid] = {"name": name, "hotkeys": []}
    save(data)
    return pid


def rename_profile(data: dict, pid: str, new_name: str) -> None:
    data["profiles"][pid]["name"] = new_name
    save(data)


def delete_profile(data: dict, pid: str) -> None:
    del data["profiles"][pid]
    if data.get("active_profile") == pid:
        data["active_profile"] = None
    save(data)


def duplicate_profile(data: dict, pid: str) -> str:
    src = data["profiles"][pid]
    new_pid = new_profile(data, src["name"] + " (copy)")
    data["profiles"][new_pid]["hotkeys"] = copy.deepcopy(src["hotkeys"])
    for hk in data["profiles"][new_pid]["hotkeys"]:
        hk["id"] = str(uuid.uuid4())
    save(data)
    return new_pid


def add_hotkey(data: dict, pid: str, hotkey: dict) -> None:
    data["profiles"][pid]["hotkeys"].append(hotkey)
    save(data)


def update_hotkey(data: dict, pid: str, hotkey_id: str, updated: dict) -> None:
    hks = data["profiles"][pid]["hotkeys"]
    for i, hk in enumerate(hks):
        if hk["id"] == hotkey_id:
            hks[i] = updated
            return
    save(data)


def delete_hotkey(data: dict, pid: str, hotkey_id: str) -> None:
    hks = data["profiles"][pid]["hotkeys"]
    data["profiles"][pid]["hotkeys"] = [h for h in hks if h["id"] != hotkey_id]
    save(data)


def move_hotkey(data: dict, pid: str, hotkey_id: str, direction: int) -> None:
    hks = data["profiles"][pid]["hotkeys"]
    idx = next((i for i, h in enumerate(hks) if h["id"] == hotkey_id), None)
    if idx is None:
        return
    new_idx = idx + direction
    if 0 <= new_idx < len(hks):
        hks[idx], hks[new_idx] = hks[new_idx], hks[idx]
    save(data)
