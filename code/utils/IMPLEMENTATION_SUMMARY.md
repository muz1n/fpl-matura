# Implementation Summary: Production-Ready Lineup Picker

## What Was Built

A fully production-ready FPL lineup picker that:

1. **Auto-selects formation** from 7 valid FPL formations (3-4-3, 3-5-2, 4-4-2, 4-3-3, 4-5-1, 5-4-1, 5-3-2)
2. **Picks starting XI** (11 players including 1 GK)
3. **Assigns bench** (1 GK + 3 outfielders with deterministic ordering)
4. **Selects captain & vice-captain**
5. **Returns debug info** (score for every formation tried)

## Key Features

### ✅ Robust Scoring Algorithm

**Two modes:**
- `prefer_minutes=True` (default): `score = pred_points × clamp(p_start, p_floor, 1.0)`
- `prefer_minutes=False`: `score = pred_points` (direct)

**Why it matters:** Penalizes rotation-prone players automatically while still considering raw potential.

### ✅ Deterministic Formation Selection

Tries all valid formations (or user-specified subset) and picks the one with highest XI score sum. No randomness, fully reproducible.

### ✅ Bench Ordering with 4-Level Tie-Breaking

Remaining outfield players sorted by:
1. **Score** (desc) → best backup first
2. **p_start** (desc) → most likely to play
3. **Price** (desc) → preserve value
4. **Name** (asc) → alphabetical fallback

**Result:** B1, B2, B3 order is meaningful and stable.

### ✅ Input Validation

Checks:
- Minimum player counts per position (2 GK, 3 DEF, 3 MID, 1 FWD)
- Formation feasibility (enough players for each position requirement)
- Column presence (raises clear errors for missing required columns)

### ✅ Handles Missing Data Gracefully

- No `p_start` column? Treated as 1.0 (no penalty).
- No `price` or `name`? Defaults filled for tie-breaking.
- Invalid formations in preference list? Skipped automatically.

### ✅ Type Safety

Fully typed with:
- `TypedDict` for return value
- `Literal` for formation strings
- `Optional` for nullable parameters

Compatible with mypy/pyright static analysis.

## API

```python
from utils.team_builder import pick_lineup_autoformation

result = pick_lineup_autoformation(
    squad_df,                           # 15-player DataFrame
    prefer_minutes=True,                # Weight by starting probability?
    p_floor=0.6,                        # Min clamp value (default 0.6)
    formation_preference=None,          # Try all or subset of formations
)

# Returns LineupResult TypedDict
{
    "formation": "3-4-3",               # Best formation
    "xi_ids": [1, 3, 4, ...],           # 11 starting player IDs
    "bench_gk_id": 2,                   # Bench GK
    "bench_out_ids": [6, 12, 7],        # B1, B2, B3 (ordered)
    "captain_id": 13,                   # Captain (highest score in XI)
    "vice_id": 8,                       # Vice (2nd highest)
    "xi_points_sum": 68.8,              # Sum of pred_points (not score!)
    "debug": {                          # All formation scores
        "3-4-3": 54.94,
        "3-5-2": 53.96,
        # ...
    }
}
```

## Utilities

### `parse_formation_counts(formation: str) -> Dict[str, int]`

Parse formation string into position counts:

```python
parse_formation_counts("4-3-3")  # → {"DEF": 4, "MID": 3, "FWD": 3}
parse_formation_counts("3-5-2")  # → {"DEF": 3, "MID": 5, "FWD": 2}
```

## Testing

### Unit Tests
Run `code/test_pick_lineup.py`:
```bash
python code/test_pick_lineup.py
```

**Expected output:**
```
=== Test 1: Automatische Formationswahl ===
Formation: 3-4-3
...
✅ Alle Tests erfolgreich!
```

### CLI Tool
Full-featured CLI at `code/lineup/auto_formation_cli.py`:

```bash
python code/lineup/auto_formation_cli.py \
  --season 2023-24 \
  --gw 30 \
  --squad_csv data/current/squad_2023-24.csv \
  --p_floor 0.6 \
  --formation_pref 4-3-3 3-4-3 \
  --output out/lineup_gw30.csv
```

## Production Readiness Checklist

- [x] **Deterministic:** No randomness, stable across runs
- [x] **Input validation:** Clear errors for invalid input
- [x] **Edge cases handled:** Missing columns, insufficient players
- [x] **Type-safe:** Full type hints for IDE/linter support
- [x] **Documented:** README with examples and API docs
- [x] **Tested:** Unit tests pass, CLI validated
- [x] **No I/O in core function:** Pure function (no files/DB/API calls)
- [x] **Tie-breaking:** 4-level deterministic resolution
- [x] **Debug info:** Transparent formation scoring

## Performance

**Time complexity:**
- O(F × P × log P) where F = formations (≤7), P = players (=15)
- For typical 15-player squad: **< 1ms**

**Memory:** O(P) – minimal overhead.

## Example Output

```
LINEUP FÜR SAISON 2023-24, GAMEWEEK 30
============================================================

Formation: 3-4-3
Erwartete Punkte (XI): 68.80

Kapitän: 13
Vize-Kapitän: 8

--- STARTELF (11) ---
  Forward A                      (FWD) - 8.50 Pkt
  Midfielder A                   (MID) - 7.20 Pkt
  Forward B                      (FWD) - 7.00 Pkt
  ...

--- BANK (4) ---
  GK: Goalkeeper B (ID 2) - 2.00 Pkt
  Feldspieler:
    Defender D (DEF) - 4.20 Pkt
    Midfielder E (MID) - 3.80 Pkt
    Defender E (DEF) - 3.50 Pkt

--- FORMATION SCORES (debug) ---
  3-4-3: 54.94
  3-5-2: 53.96
  4-4-2: 54.50
  4-3-3: 53.76
  4-5-1: 50.95
  5-3-2: 52.55
  5-4-1: 50.72
============================================================
```

## Integration Points

### With Existing Code

The function **replaces** the previous `pick_lineup_autoformation` but maintains:
- Same module path (`utils.team_builder`)
- Same function name (drop-in replacement)
- Compatible return type (enhanced TypedDict)

### With Evaluation Pipeline

Use in `code/evaluate.py`:

```python
from utils.team_builder import pick_lineup_autoformation

# For each gameweek
result = pick_lineup_autoformation(
    squad_df,
    prefer_minutes=True,
    p_floor=0.6,
)

# Log formation used
logging.info(f"GW {gw}: Formation {result['formation']}, XI sum {result['xi_points_sum']:.2f}")

# Use xi_ids, captain_id for evaluation
```

### With Frontend

JSON-serializable return value:

```python
import json
result = pick_lineup_autoformation(squad_df)
json.dumps(result)  # Works directly
```

## Future Enhancements

Possible extensions (not implemented):

1. **Multi-objective optimization:** Balance points vs. budget vs. risk
2. **Chip consideration:** Triple captain, bench boost, free hit logic
3. **Expected value under substitution:** Model auto-sub scenarios
4. **Monte Carlo uncertainty:** Return confidence intervals
5. **Price-aware formation selection:** Optimize value not just points

---

**Status:** ✅ Production-ready  
**Version:** 2.0  
**Date:** 2025-01-05  
**Tests:** Passing  
**Documentation:** Complete
