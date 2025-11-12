# fpl-matura — web (Next.js + TypeScript + Tailwind)

Einfaches Web-Frontend für FPL-Prognosen und Lineup-Verwaltung.

## Quick Start

Aus dem Repository-Root:

```cmd
cd web
npm install
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000)

## Verfügbare Skripte

- `dev`: Dev-Server starten (next dev)
- `build`: Production-Build (next build)
- `start`: Production-Server (next start)
- `lint`: Next.js Linter
- `test`: Jest-Tests

## Seiten

### `/` (Startseite)
- **Prognosen ansehen:** Link zu `/predictions`
- **Neue Prognose laden:** GW eingeben → lädt `/api/gw/{gw}/predictions`
- **Mannschaft merken:** LocalStorage-Squad anzeigen/speichern

### `/predictions` (Prognosen & Aufstellung)
- **Toolbar:**
  - GW-Eingabe + "Neu laden"-Button
  - Toggle "LocalStorage-Mannschaft anwenden" (Placeholder, noch keine Logik)
  - "Mannschaft speichern"-Button → speichert XI/Bench/Captain in localStorage
- Anzeige: Lineup-Summary, Startelf-Tabelle, Bank, Top 15 Prognosen

## API-Endpunkte

### `GET /api/gw/[gw]/predictions`
Liefert Prognose-Daten für eine Gameweek aus `../out/predictions_gw{gw}.json`.

**Rückgabe:** `PredictionsPayload` (validiert mit Zod)

**Fehler:** 400 bei ungültiger GW, 500 bei Lesefehlern

### `GET /api/gw/[gw]/lineup`
Liefert Lineup-Daten für eine Gameweek aus `../out/lineup_gw{gw}.json`.

**Rückgabe:** `LineupPayload` (validiert mit Zod)

**Fehler:** 400 bei ungültiger GW, 500 bei Lesefehlern

## LocalStorage

**Key:** `lastSquad`

**Schema:** 
```ts
{
  gw: number,
  formation: FormationStr,
  xi_ids: number[11],
  bench_gk_id: number,
  bench_out_ids: number[3],
  captain_id: number,
  vice_id: number
}
```

Validierung erfolgt mit Zod (`lib/squad-storage.ts`).

## TypeScript-Typen

Definiert in `types/fpl.ts` und `src/types/fpl.schema.ts` (Zod-Schemas).

## Demo-Daten

Statische JSONs liegen in `../out/`:
- `predictions_gw38.json`
- `lineup_gw38.json`

## Hinweise

- **Keine echten FPL-Logins erforderlich** – alles lokal/offline
- LocalStorage-Toggle ist derzeit Platzhalter (keine Squad-Override-Logik)
- Fehlermeldungen erscheinen bei ungültigen Daten oder fehlenden Dateien

