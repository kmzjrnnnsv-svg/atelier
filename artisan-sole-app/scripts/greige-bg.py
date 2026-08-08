#!/usr/bin/env python3
"""
greige-bg.py — Produktfreisteller auf einheitlichen Greige-Grund bringen.

Unsere Herstellerbilder kommen auf reinem Weiß, die Referenzaufnahme
(Suede-Chelsea) steht dagegen auf einem warmen Greige. Damit alle Bilder
nebeneinander ruhig wirken, wird der weiße Grund hier auf denselben Ton
gezogen — inklusive der Schlagschatten, die sonst als kalte graue Flecken
stehen bleiben.

Verfahren
---------
1.  Kandidatenmaske: helle, unbunte Pixel (Hintergrund + Schatten).
2.  Nur die Zusammenhangskomponenten behalten, die den Bildrand berühren.
    So bleiben helle Glanzlichter *auf* dem Schuh unangetastet.
3.  Weichzeichnen der Maske, damit die Kante des Schuhs (antialiast, also
    Mischpixel aus Leder und Weiß) sauber überblendet wird.
4.  Multiplikativ einfärben, normiert auf das gemessene Weiß des Bildes:
    neu = alt * (greige / weisswert). Reines Weiß wird exakt zum Zielton,
    ein Schatten bei 86 % Helligkeit bleibt ein Schatten bei 86 % — die
    Tiefe der Aufnahme geht also nicht verloren.

Aufruf
------
    python3 scripts/greige-bg.py IN.jpg [IN2.jpg ...] -o public/editorial/
    python3 scripts/greige-bg.py IN.jpg -o out/ --aspect 4:5   # auf Format
    python3 scripts/greige-bg.py IN.jpg -o out/ --inspect      # Maske prüfen
"""
import argparse
import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

# Zielton, abgenommen aus der Referenzaufnahme (warmes Greige).
GREIGE = (237, 234, 227)


def background_mask(rgb, light_min=178, chroma_max=26):
    """Weiche Maske (0..1): 1 = sicher Hintergrund, 0 = sicher Produkt.

    `light_min` / `chroma_max` grenzen erst grob ein, danach entscheidet die
    Randanbindung. Ein heller Glanz auf dem Leder ist zwar hell und fast
    unbunt, hängt aber nicht am Bildrand und bleibt deshalb außen vor.
    """
    lo = rgb.min(axis=2).astype(np.int16)
    hi = rgb.max(axis=2).astype(np.int16)
    candidate = (hi >= light_min) & ((hi - lo) <= chroma_max)

    labels, count = ndimage.label(candidate)
    if count == 0:
        return np.zeros(rgb.shape[:2], dtype=np.float32), candidate

    # Alle Labels einsammeln, die eine Bildkante berühren.
    edges = np.concatenate([labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]])
    keep = np.unique(edges)
    keep = keep[keep != 0]
    if keep.size == 0:
        return np.zeros(rgb.shape[:2], dtype=np.float32), candidate

    mask = np.isin(labels, keep)

    # Löcher schließen: ein Schatten kann den Grund lokal unter die Schwelle
    # drücken und dort kleine Inseln hinterlassen, die sonst weiß blieben.
    # border_value=1 ist wichtig — sonst frisst der Erosionsschritt einen
    # Rahmen von zwei Pixeln weg und das Bild behielte einen weißen Rand.
    mask = ndimage.binary_closing(
        mask, structure=np.ones((3, 3)), iterations=2, border_value=1
    )

    soft = ndimage.gaussian_filter(mask.astype(np.float32), sigma=1.1)
    return np.clip(soft, 0.0, 1.0), mask


def white_level(rgb, hard_mask):
    """Gemessenes Papierweiß des Hintergrunds (95. Perzentil je Kanal).

    Nicht jede Aufnahme liegt exakt auf 255; ohne Normierung käme der
    Zielton je nach Bild unterschiedlich dunkel heraus.
    """
    if hard_mask.sum() < 64:
        return np.array([255.0, 255.0, 255.0], dtype=np.float32)
    px = rgb[hard_mask]
    lvl = np.percentile(px, 95, axis=0).astype(np.float32)
    return np.maximum(lvl, 1.0)


def recolor(img, greige=GREIGE):
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    soft, hard = background_mask(np.asarray(img.convert("RGB")))
    lvl = white_level(rgb, hard)

    gain = np.array(greige, dtype=np.float32) / lvl          # pro Kanal
    tinted = np.clip(rgb * gain, 0, 255)

    a = soft[..., None]
    out = rgb * (1.0 - a) + tinted * a
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)), soft


def pad_to_aspect(img, aspect, greige=GREIGE):
    """Auf Zielformat bringen — durch Ergänzen, nie durch Beschneiden.

    Der Grund ist jetzt einfarbig, deshalb ist angesetzte Fläche unsichtbar.
    Der Schuh behält seine Größe und wird nicht angeschnitten.
    """
    w, h = img.size
    tw, th = aspect
    target = tw / th
    if abs((w / h) - target) < 1e-3:
        return img
    if (w / h) > target:
        new_w, new_h = w, round(w / target)
    else:
        new_w, new_h = round(h * target), h
    canvas = Image.new("RGB", (new_w, new_h), greige)
    canvas.paste(img, ((new_w - w) // 2, (new_h - h) // 2))
    return canvas


def parse_aspect(s):
    a, b = s.split(":")
    return int(a), int(b)


def parse_hex(s):
    s = s.lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("inputs", nargs="+", type=pathlib.Path)
    p.add_argument("-o", "--out", required=True, type=pathlib.Path, help="Zielordner")
    p.add_argument("--color", default="EDEAE3", help="Zielton als Hex (Standard: EDEAE3)")
    p.add_argument("--aspect", type=parse_aspect, default=None, help="z. B. 4:5 — ergänzt, schneidet nicht")
    p.add_argument("--quality", type=int, default=88)
    p.add_argument("--max-width", type=int, default=2000, help="0 schaltet das Herunterrechnen ab")
    p.add_argument("--inspect", action="store_true", help="zusätzlich die Maske als *-mask.png ablegen")
    args = p.parse_args()

    greige = parse_hex(args.color)
    args.out.mkdir(parents=True, exist_ok=True)

    for src in args.inputs:
        if not src.exists():
            print(f"  ! übersprungen, nicht gefunden: {src}", file=sys.stderr)
            continue
        img = Image.open(src)
        out, soft = recolor(img, greige)
        if args.aspect:
            out = pad_to_aspect(out, args.aspect, greige)
        if args.max_width and out.width > args.max_width:
            h = round(out.height * args.max_width / out.width)
            out = out.resize((args.max_width, h), Image.LANCZOS)

        dst = args.out / (src.stem + ".jpg")
        out.save(dst, "JPEG", quality=args.quality, subsampling=1, optimize=True)
        share = float(soft.mean())
        print(f"  {src.name} -> {dst}  ({out.width}x{out.height}, Grundfläche {share:.0%})")

        if args.inspect:
            Image.fromarray((soft * 255).astype(np.uint8)).save(args.out / (src.stem + "-mask.png"))


if __name__ == "__main__":
    main()
