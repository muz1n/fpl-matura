# FPL Maturaprojekt - Web-Applikation

Next.js + TypeScript + Tailwind CSS Web-App für FPL-Vorhersagen und Backtests.

## Quick Start

```bash
cd web
npm install
npm run dev
# → http://localhost:3000
```

## Features

- 📊 Interaktive Vorhersagen für alle Saisons & Gameweeks
- 📈 Backtest-Visualisierungen mit Performance-Charts
- 🔄 Multi-Season-Vergleich (8 Saisons: 2016-2024)
- 🎯 Automatische Lineup-Optimierung
- 🌓 Dark Mode Support
- 📱 Responsive Design

## Technologie-Stack

- **Framework**: Next.js 14
- **Sprache**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Deployment**: Vercel (automatische CI/CD via GitHub)

## Verfügbare Scripts

- `npm run dev` - Entwicklungsserver starten
- `npm run build` - Production Build erstellen
- `npm start` - Production Server starten
- `npm run lint` - Linting ausführen
- `npm test` - Jest Tests ausführen

## Datenquellen

Die App liest Backtest-Resultate aus `out/backtests/`:
- JSON-Dateien mit Vorhersagen
- CSV-Dateien mit Evaluations-Ergebnissen
- PNG-Grafiken mit Performance-Charts

## Deployment

Automatisches Deployment via Vercel:
- Push zu `main` Branch → automatischer Build & Deploy
- Live-URL: Siehe Vercel Dashboard
