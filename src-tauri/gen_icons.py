#!/usr/bin/env python3
"""
Generate placeholder app icons for AHK Manager.
Color: #7c5cff (the accent purple from the design tokens).
Run: python gen_icons.py
"""
import os, struct, zlib

ACCENT = (0x7C, 0x5C, 0xFF)   # --accent from tokens.css
BG     = (0x08, 0x08, 0x0B)   # --bg-0

# ── PNG builder ──────────────────────────────────────────────────────────────

def _chunk(t: bytes, d: bytes) -> bytes:
    crc = zlib.crc32(t + d) & 0xFFFFFFFF
    return struct.pack(">I", len(d)) + t + d + struct.pack(">I", crc)

def make_png(size: int, fg=ACCENT, bg=BG) -> bytes:
    """Solid-color PNG with a centered square of fg on bg background."""
    rows = []
    margin = size // 6
    for y in range(size):
        row = bytearray()
        for x in range(size):
            if margin <= x < size - margin and margin <= y < size - margin:
                row += bytes(fg)
            else:
                row += bytes(bg)
        rows.append(b"\x00" + bytes(row))   # filter byte 0 per row
    raw = b"".join(rows)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + _chunk(b"IHDR", ihdr)
        + _chunk(b"IDAT", zlib.compress(raw))
        + _chunk(b"IEND", b"")
    )

# ── ICO builder ──────────────────────────────────────────────────────────────

def make_ico(sizes=(16, 24, 32, 48, 64, 128, 256)) -> bytes:
    """Build an ICO that embeds a PNG for each size."""
    images = [(s, make_png(s)) for s in sizes]
    num = len(images)
    header = struct.pack("<HHH", 0, 1, num)
    dir_size = 16 * num
    offset = 6 + dir_size
    directory = b""
    data = b""
    for s, png in images:
        w = s if s < 256 else 0
        directory += struct.pack("<BBBBHHII", w, w, 0, 0, 1, 32, len(png), offset)
        offset += len(png)
        data += png
    return header + directory + data

# ── ICNS stub ────────────────────────────────────────────────────────────────

def make_icns_stub() -> bytes:
    """Minimal valid ICNS file so macOS cross-compile doesn't choke."""
    # Just wrap a 128x128 PNG in the icp5 tag (macOS 10.5+)
    png = make_png(128)
    tag = b"icp5"
    chunk = tag + struct.pack(">I", len(png) + 8) + png
    total = len(chunk) + 8
    return b"icns" + struct.pack(">I", total) + chunk

# ── Entry point ──────────────────────────────────────────────────────────────

def main():
    out = os.path.join(os.path.dirname(__file__), "icons")
    os.makedirs(out, exist_ok=True)

    files = {
        "32x32.png":     make_png(32),
        "128x128.png":   make_png(128),
        "128x128@2x.png": make_png(256),
        "icon.ico":      make_ico(),
        "icon.icns":     make_icns_stub(),
    }
    for name, data in files.items():
        path = os.path.join(out, name)
        with open(path, "wb") as f:
            f.write(data)
        print(f"  OK  {path}  ({len(data):,} bytes)")

    print("\nDone. Replace with real artwork before release.")

if __name__ == "__main__":
    main()
