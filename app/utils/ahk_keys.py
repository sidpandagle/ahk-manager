_MOD_MAP = {"^": "Ctrl", "!": "Alt", "+": "Shift", "#": "Win"}
_REV_MOD = {v: k for k, v in _MOD_MAP.items()}

_KEY_DISPLAY = {
    "SPACE": "Space",
    "TAB": "Tab",
    "ENTER": "Enter",
    "ESCAPE": "Esc",
    "ESC": "Esc",
    "BS": "Backspace",
    "BACKSPACE": "Backspace",
    "DELETE": "Delete",
    "DEL": "Del",
    "INSERT": "Insert",
    "INS": "Ins",
    "UP": "Up",
    "DOWN": "Down",
    "LEFT": "Left",
    "RIGHT": "Right",
    "HOME": "Home",
    "END": "End",
    "PGUP": "PgUp",
    "PGDN": "PgDn",
    **{f"F{n}": f"F{n}" for n in range(1, 25)},
    **{f"NUMPAD{n}": f"Num{n}" for n in range(10)},
    "NUMPADDOT": "Num.",
    "NUMPADENTER": "NumEnter",
}
_REV_KEY = {v: k for k, v in _KEY_DISPLAY.items()}


def ahk_to_display(trigger: str) -> str:
    parts = []
    i = 0
    while i < len(trigger) and trigger[i] in _MOD_MAP:
        parts.append(_MOD_MAP[trigger[i]])
        i += 1
    key = trigger[i:]
    parts.append(_KEY_DISPLAY.get(key.upper(), key.upper() if len(key) > 1 else key))
    return "+".join(parts)


def display_to_ahk(display: str) -> str:
    parts = display.split("+")
    mods = ""
    key = ""
    for p in parts:
        if p in _REV_MOD:
            mods += _REV_MOD[p]
        else:
            raw = _REV_KEY.get(p, p)
            key = raw.lower() if len(raw) == 1 else raw
    return mods + key
