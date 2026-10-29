# Schnealla

Kompakter Punktezaehler fuer Schnealla-Runden, gebaut mit Vue und Vite.

Live: https://schnealla.j-metzler.at/

## Features

- 3 bis 5 Spieler
- frei waehlbare Startpunkte
- Rundentabelle mit aktuellem Punktestand
- Mischelzaehler
- Spielerreihenfolge und erster Mischer bis zur ersten uebernommenen Runde aenderbar
- Aussetzen-Regeln
- letzte Runde rueckgaengig machen
- Punktestand per Klick bearbeiten
- Rundengewinn- und Gewinner-Animation
- Punkteverlauf am Spielende in der Gewinnerkarte
- freiwilliges lokales Speichern im Browser (standardmaessig aus), Laden und Loeschen gespeicherter Daten
- Impressum und Datenschutzerklaerung

## Lokal starten

```bash
npm install
npm.cmd run dev
```

PowerShell kann `npm.ps1` blockieren. Dann einfach `npm.cmd` verwenden.

## Build

```bash
npm.cmd run build
```

Optional lokal den Production-Build testen:

```bash
npm.cmd run preview
```

## Deployment

Das Projekt laeuft ueber GitHub Pages mit Custom Domain und ist fuer den Root-Pfad konfiguriert:

```js
base: '/'
```

Deployments laufen ueber GitHub Actions aus `.github/workflows/deploy.yml`.

## Datenschutz

Beim ersten Besuch fragt ein Dialog nach der freiwilligen lokalen Speicherung.
Zustimmung und Ablehnung werden ohne eindeutige Kennung in
`schnealla.storagePreference` gemerkt. Nur bei Zustimmung werden Spielinformationen
gelesen und automatisch gespeichert und wiederhergestellt. Die Auswahl bleibt im
Seitenfuss aenderbar. Abwaehlen oder "Gespeicherte Daten loeschen" entfernt den
Spielstand und merkt die Ablehnung; das laufende Spiel bleibt im Arbeitsspeicher erhalten. Es werden keine
Analyse- oder Werbedienste eingebunden.

Datenschutzkontakt: schnealla@alpenjodel.de. Die Weiterleitung muss vor der
Veroeffentlichung eingerichtet und auf Zustellung geprueft sein.

Tests fuer Speicherung und Widerruf:

```bash
node --test tests/game-storage.test.js
```
