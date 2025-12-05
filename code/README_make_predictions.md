# make_predictions.py

Offline-Generator für FPL Predictions im Frontend-kompatiblen JSON-Format.

## Verwendung

```bash
python code/make_predictions.py --season 2023-24 --gw 38 --method rf
```

## Parameter

- `--season`: Saison-Identifier (z.B. `2023-24`, `2024-25`)
- `--gw`: Gameweek-Nummer (Integer)
- `--method`: Vorhersage-Methode
  - `rf` (default): Random Forest Baseline
  - `ma3`: Moving Average (3 GW)
  - `pos`: Position-basierte Durchschnitte
- `--output-dir`: Output-Verzeichnis (default: `out/`)

## Output

Generiert eine Datei `out/predictions_{season}_gwXX_{method}.json` im Format:

```json
{
  "season": "2023-24",
  "gw": 38,
  "generated_at": "2025-11-13T09:53:45.655107Z",
  "model_version": "rf_baseline_rf",
  "players": [
    {
      "player_id": 666,
      "name": "Gyökeres",
      "team": "ARS",
      "pos": "FWD",
      "predicted_points": 3.27,
      "minutes_exp": 0,
      "opponent": "TBD",
      "is_home": true,
      "opp_strength": 3.0,
      "price": 9.0
    }
  ]
}
```

## Datenquellen

Das Script verwendet:
1. **Trainingsdaten**: `data/merged_gw_2022-23.csv` (oder `data/merged_gw_{season}.csv`)
2. **Aktuelle Spieler**: `data/cleaned_players_2025-26_team.csv` (oder `data/cleaned_players_{season}_team.csv`)

## Features

Das Random Forest Modell nutzt folgende Features:
- `price`: Spielerpreis
- `selected`: Auswahlrate (%)
- `influence_ma3`: Influence (Moving Average 3 GW)
- `creativity_ma3`: Creativity (MA3)
- `threat_ma3`: Threat (MA3)
- `ict_index_ma3`: ICT Index (MA3)
- `minutes_ma3`: Minuten gespielt (MA3)
- `points_per90_ma3`: Punkte pro 90 Minuten (MA3)

## Workflow

1. **Daten laden**: Historische GW-Daten für Training
2. **Features berechnen**: Rolling-Averages ohne Data Leakage
3. **Model trainieren**: Random Forest mit zeitlichem Split
4. **Validierung**: MAE auf Test-Set (letzte 8 GWs)
5. **Predictions generieren**: Für alle aktuellen Spieler
6. **JSON schreiben**: Frontend-kompatibles Format

## Beispiele

### GW 38 für Saison 2023-24
```bash
python code/make_predictions.py --season 2023-24 --gw 38 --method rf
```

### Mehrere GWs generieren
```bash
for gw in 34 35 36 37 38; do
  python code/make_predictions.py --season 2023-24 --gw $gw --method rf
done
```

## Integration mit Frontend

Die generierten JSON-Dateien können von den API-Routen geladen werden:

- **API**: `GET /api/gw/{gw}/predictions?methode=rf`
- **Frontend**: Automatisches Laden beim GW-Wechsel

Bei fehlendem GW gibt die API eine Liste verfügbarer GWs zurück:

```json
{
  "error": "GW not available",
  "available": [38]
}
```

## Validierung

Das generierte JSON wird gegen das Zod-Schema `PredictionsPayloadSchema` validiert:

```typescript
{
  season: string,
  gw: number,
  generated_at: string,
  model_version: string,
  players: Array<{
    player_id: number,
    name: string,
    team: string,
    pos: "GK" | "DEF" | "MID" | "FWD",
    predicted_points: number,
    minutes_exp: number,
    opponent: string,
    is_home: boolean,
    opp_strength: number,
    price: number
  }>
}
```

## Akzeptanzkriterium

✅ **Erfüllt**: Frontend lädt GW 38 ohne Fehler
- Predictions werden korrekt generiert
- JSON entspricht dem Schema
- API-Route liefert Daten oder klare Fehlermeldung
