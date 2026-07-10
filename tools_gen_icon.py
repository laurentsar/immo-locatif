#!/usr/bin/env python3
"""Icônes (PWA + launcher Android) sans dépendance. Maison stylisée sur fond sombre."""
import struct, zlib, math, os, sys

BG = (13, 18, 30)         # #0d121e
H1 = (56, 189, 248)       # bleu
H2 = (34, 197, 94)        # vert (dégradé bas)

# Contour maison normalisé (0..1), y vers le bas : toit + murs.
HOUSE = [(0.50, 0.12), (0.86, 0.44), (0.78, 0.44), (0.78, 0.86),
         (0.22, 0.86), (0.22, 0.44), (0.14, 0.44)]
# Porte (rectangle) découpée dans la maison.
DOORP = [(0.43, 0.86), (0.43, 0.60), (0.57, 0.60), (0.57, 0.86)]

def in_poly(px, py, poly):
    inside = False; n = len(poly); j = n - 1
    for i in range(n):
        xi, yi = poly[i]; xj, yj = poly[j]
        if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside

def make(size):
    s = size; rad = s * 0.22
    house = [(x * s, y * s) for (x, y) in HOUSE]
    door = [(x * s, y * s) for (x, y) in DOORP]
    px = bytearray()
    for y in range(s):
        px.append(0)
        for x in range(s):
            cx = min(max(x, rad), s - rad); cy = min(max(y, rad), s - rad)
            if math.hypot(x - cx, y - cy) > rad:
                px += bytes((0, 0, 0, 0)); continue
            fx, fy = x + 0.5, y + 0.5
            if in_poly(fx, fy, house) and not in_poly(fx, fy, door):
                f = y / s
                col = tuple(int(H1[i] + (H2[i] - H1[i]) * f) for i in range(3))
                px += bytes((col[0], col[1], col[2], 255))
            else:
                px += bytes((BG[0], BG[1], BG[2], 255))
    return png(s, s, bytes(px))

def png(w, h, raw):
    def chunk(typ, data):
        c = typ + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))

def write(path, size):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f: f.write(make(size))
    print("écrit", path, size)

if __name__ == "__main__":
    base = os.path.dirname(os.path.abspath(__file__))
    write(os.path.join(base, "www/img/icon-192.png"), 192)
    write(os.path.join(base, "www/img/icon-512.png"), 512)
    if "--android" in sys.argv:
        for d, sz in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
            for name in ("ic_launcher", "ic_launcher_round", "ic_launcher_foreground"):
                write(os.path.join(base, f"android/app/src/main/res/mipmap-{d}/{name}.png"), sz)
