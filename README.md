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
Spielstand und merkt die Ablehnung; das laufende Spiel bleibt im Arbeitsspeicher erhalten.

## Umami Analytics

Die Umami-Cloud-Website-ID lautet `6aada232-f3f7-4e31-82b4-28f15b28d08c`.
Sie ist eine oeffentliche Kennung fuer den Tracker, kein geheimer API-Schluessel.
Der Betreiber hat EU-Region und Hobby-Tarif (sechs Monate Analytics-Aufbewahrung)
bestaetigt. Diese Angaben in der Datenschutzerklaerung bei Tarifwechsel aktualisieren.

Umami wird auf allen drei Seiten nur nach separater Analytics-Einwilligung geladen.
Die anonym gehaltene Auswahl wird unter `schnealla.analyticsPreference` gemerkt.
Bestehende Erlaubnisse fuer Spielspeicherung aktivieren Analytics nicht.
Das erweiterte Popup bietet getrennte Optionen und "Nur notwendige".
Auswahl und Widerruf sind im Seitenfuss sowie auf beiden Rechteseiten erreichbar.

Nur `schnealla.j-metzler.at` sendet Statistikdaten; localhost und Vorschauen laden
den externen Tracker nicht. Automatisches Tracking ist deaktiviert. Die Einbindung
sendet ausschliesslich einen bereinigten Seitenaufruf pro Seite und entfernt
Suchparameter, Sprungmarken sowie Pfade der Herkunftswebsite. Es werden keine
Spielinformationen, individuellen Nutzerkennungen oder benutzerdefinierten
Ereignisse gesendet. Ein Before-Send-Hook prueft die Einwilligung erneut, auch nach
Widerruf und bei Aenderungen in einem anderen Tab. Bereits abgesendete Anfragen
koennen nicht zurueckgeholt werden.

Statistiken sind im Betreiberkonto unter https://cloud.umami.is/ sichtbar.

Datenschutzkontakt: schnealla@alpenjodel.de. Die Weiterleitung muss vor der
Veroeffentlichung eingerichtet und auf Zustellung geprueft sein.

Tests fuer Speicherung und Widerruf:

```bash
node --test tests/*.test.js
```
