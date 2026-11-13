# musik-tools

Kleine Werkzeuge rund ums Musikmachen – reines HTML/CSS/JavaScript, kein Build, offline-fähig.

Veröffentlicht über GitHub Pages: https://andreasnickel.github.io/musik-tools/

## Skalen & Akkorde – Griffbrett (`pentatonik/`)

Skalen (u. a. Pentatonik mit Positionen/Boxen) und Akkorde auf dem Gitarrengriffbrett,
Akkorderkennung aus Griff oder Name. Einstellungen werden im Browser gespeichert (localStorage).

- App: https://andreasnickel.github.io/musik-tools/pentatonik/

### iPad einrichten

1. Den App-Link in **Safari** öffnen.
2. Teilen-Symbol → „Zum Home-Bildschirm“.
3. Die App einmal vom Home-Bildschirm starten (mit Internet) – danach läuft sie offline.

Neue Versionen lädt die App bei Internetverbindung im Hintergrund und übernimmt sie beim
**nächsten** Start. Die Home-Bildschirm-App hat einen eigenen Speicher, getrennt von Safari.

### Aufbau

| Datei | Zweck |
|---|---|
| `index.html` | die App (alles in einer Datei) |
| `manifest.webmanifest` | Name, Icon, Vollbild-Start für den Home-Bildschirm |
| `sw.js` | Service Worker: Offline-Betrieb, Updates beim nächsten Start (Aufbau wie Setlist-Tool) |
| `icons/` | App-Icons (192, 512, maskable 512, apple-touch 180) |

Neue Dateien der App müssen in `sw.js` (Liste `DATEIEN`) eingetragen werden.
Cache-Namen in `sw.js` müssen je App eindeutig sein, weil sich alle Apps unter
`andreasnickel.github.io` einen Speicher teilen.

## Lokal starten

```
python -m http.server 8000
```

Dann `http://localhost:8000/pentatonik/` öffnen. Auf `localhost` gilt „Netz zuerst“,
Änderungen sind also sofort sichtbar.

Getestet: Chromium-Browser (Windows). iPad-Safari: noch zu bestätigen.
