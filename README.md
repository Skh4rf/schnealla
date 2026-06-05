# Schnealla

Kompakter Punktezaehler fuer Schnealla-Runden, gebaut mit Vue und Vite.

Live: https://skh4rf.github.io/schnealla/

## Features

- 3 bis 5 Spieler
- frei waehlbare Startpunkte
- Rundentabelle mit aktuellem Punktestand
- Mischelzaehler
- Aussetzen-Regeln
- letzte Runde rueckgaengig machen
- Punktestand per Klick bearbeiten
- Rundengewinn- und Gewinner-Animation
- Punkteverlauf am Spielende in der Gewinnerkarte
- lokales Speichern im Browser

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

Das Projekt ist fuer GitHub Pages unter `/schnealla/` konfiguriert:

```js
base: '/schnealla/'
```

Deployments laufen ueber GitHub Actions aus `.github/workflows/deploy.yml`.
