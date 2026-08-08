# Bilder für die Website vorbereiten

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

```bash
# Abhängigkeiten (einmalig)
pip install pillow numpy scipy

# Ein oder mehrere Bilder umfärben
python3 scripts/greige-bg.py rohbilder/*.jpg -o aufbereitet/
```

Für Kopfbilder zusätzlich auf das Format des Bandes bringen:

```bash
python3 scripts/greige-bg.py rohbilder/*.jpg -o aufbereitet/ --aspect 21:9
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
