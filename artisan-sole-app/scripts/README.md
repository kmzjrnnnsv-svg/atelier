# Bilder für die Website vorbereiten

> **In den meisten Fällen brauchst du dieses Skript nicht.**
> Im CMS steht bei jedem Seiten-Header der Schalter „Freigestellt auf Weiß".
> Er legt die Aufnahme im Browser multiplikativ auf den greigen Grund — das
> ist dieselbe Rechnung wie hier, nur ohne Vorverarbeitung. Lade das weiße
> Original hoch, setz den Haken, fertig.
>
> Das Skript lohnt sich in zwei Fällen: bei **hellen Schuhen** (Creme, helles
> Kalbsleder), weil der Schalter das Produkt mit abdunkelt und das Skript es
> per Maske ausspart — und wenn du ein Bild auf ein **Zielformat ergänzen**
> willst, statt es zuschneiden zu lassen (`--aspect`).

## Warum

Unsere Herstellerbilder stehen auf reinem Weiß. Nebeneinander auf einer Seite
wirkt das hart und ungleichmäßig, sobald ein Bild dazwischen liegt, das auf
einem warmen Grund fotografiert wurde. `greige-bg.py` zieht alle Aufnahmen auf
denselben Ton — inklusive der Schlagschatten, die sonst als kalte graue Flecken
stehen bleiben.

Der Zielton ist `#EDEAE3`. Denselben Wert benutzt `PageHero` als Hintergrund der
Kopfbild-Fläche: Bild und Fläche gehen dadurch nahtlos ineinander über, statt
dass das Foto als Rechteck auf der Seite klebt.

## Benutzung

### Einmalig: virtuelle Umgebung anlegen

Ubuntu 24.04 (und jedes andere System nach PEP 668) lehnt ein systemweites
`pip install` mit `error: externally-managed-environment` ab. Die Pakete
kommen deshalb in eine eigene Umgebung — das ist auch sonst die bessere
Wahl, weil sie nichts am System verändert:

```bash
python3 -m venv ~/.venvs/greige
~/.venvs/greige/bin/pip install pillow numpy scipy
```

Scheitert der erste Befehl mit „ensurepip is not available":

```bash
sudo apt install python3-venv
```

### Bilder umfärben

Immer das Python **aus der Umgebung** aufrufen, nicht das systemweite:

```bash
~/.venvs/greige/bin/python scripts/greige-bg.py rohbilder/*.jpg -o aufbereitet/
```

Für Kopfbilder zusätzlich auf das Format des Bandes bringen:

```bash
~/.venvs/greige/bin/python scripts/greige-bg.py rohbilder/*.jpg -o aufbereitet/ --aspect 21:9
```

`--aspect` **ergänzt** Fläche, es schneidet nicht. Ein quadratisches Produktfoto
würde im 21:9-Band sonst oben und unten angeschnitten; so bleibt der Schuh
vollständig und steht auf einem durchgehenden Grund. Das ist der Unterschied
zwischen „Bild im Banner" und „Produkt auf einer Fläche".

Weitere Schalter:

| Schalter | Wirkung |
| --- | --- |
| `--color EDEAE3` | anderer Zielton (Hex) |
| `--max-width 2000` | Begrenzung der Kantenlänge, `0` schaltet ab |
| `--quality 88` | JPEG-Qualität |
| `--inspect` | legt die erkannte Hintergrundmaske als `*-mask.png` daneben |

Wenn ein Bild nicht sauber wird, hilft `--inspect`: Weiß in der Maske ist das,
was als Hintergrund eingefärbt wird. Fehlt dort ein Teil des Schuhs (also er
ist weiß statt schwarz), war er dem Grund zu ähnlich — dann bei sehr hellen
Schuhen die Schwelle im Skript (`light_min`) anheben.

## Danach

Die fertigen Dateien über **CMS → Website-Bilder → Seiten-Header** hochladen und
dem gewünschten Kopf zuweisen. Dort steht je Header auch der Bildausschnitt
(`Mitte`, `Oben`, …) — er bestimmt, welcher Teil stehen bleibt, wenn das Format
der Seite doch zuschneiden muss.

Ein Deployment ist dafür nicht nötig; die Header liegen in den Settings, nicht
mehr im Code.
