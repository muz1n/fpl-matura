# Quick Start: Using pick_lineup_autoformation

## 30-Second Usage

```python
from utils.team_builder import pick_lineup_autoformation
import pandas as pd

# Load your 15-player squad
squad_df = pd.DataFrame([
    {"player_id": 1, "position": "GK", "pred_points": 5.2, "p_start": 0.95, "name": "Alisson", "price": 5.5},
    # ... 14 more players
])

# Pick lineup
result = pick_lineup_autoformation(squad_df)

# Use results
print(f"Formation: {result['formation']}")
print(f"Starting XI: {result['xi_ids']}")
print(f"Captain: {result['captain_id']}")
print(f"Expected points: {result['xi_points_sum']:.2f}")
```

## Required Columns

Your `squad_df` must have:
- `position`: `"GK"`, `"DEF"`, `"MID"`, or `"FWD"`
- `player_id`: integer
- `pred_points`: float (your model's prediction)

Optional but recommended:
- `p_start`: starting probability (0-1)
- `name`: player name
- `price`: player price

## Common Use Cases

### 1. Trust Your Model Completely (No Minutes Penalty)

```python
result = pick_lineup_autoformation(squad_df, prefer_minutes=False)
```

### 2. Weight by Starting Probability (Default)

```python
result = pick_lineup_autoformation(squad_df, prefer_minutes=True, p_floor=0.6)
# Score = pred_points × clamp(p_start, 0.6, 1.0)
```

### 3. Force Specific Formation(s)

```python
result = pick_lineup_autoformation(
    squad_df,
    formation_preference=["4-3-3", "3-4-3"]  # Only try these two
)
```

### 4. Lower Minutes Threshold

```python
result = pick_lineup_autoformation(squad_df, p_floor=0.4)
# More lenient: allows rotation risks with smaller penalty
```

## Reading Results

### Starting XI
```python
xi_players = squad_df[squad_df['player_id'].isin(result['xi_ids'])]
print(xi_players[['name', 'position', 'pred_points']])
```

### Bench Order
```python
bench_gk = squad_df[squad_df['player_id'] == result['bench_gk_id']]
bench_out = squad_df[squad_df['player_id'].isin(result['bench_out_ids'])]
# bench_out_ids[0] = B1, [1] = B2, [2] = B3
```

### Captain & Vice
```python
captain = squad_df[squad_df['player_id'] == result['captain_id']].iloc[0]
vice = squad_df[squad_df['player_id'] == result['vice_id']].iloc[0]
print(f"Captain: {captain['name']}, Vice: {vice['name']}")
```

### Formation Comparison
```python
for formation, score in sorted(result['debug'].items(), key=lambda x: -x[1]):
    if score > -1e9:
        print(f"{formation}: {score:.2f}")
```

## CLI Quick Start

```bash
# Minimal (uses current squad CSV)
python code/lineup/auto_formation_cli.py \
  --season 2023-24 \
  --gw 30 \
  --squad_csv data/current/squad_2023-24.csv

# With preferences
python code/lineup/auto_formation_cli.py \
  --season 2023-24 \
  --gw 30 \
  --squad_csv data/current/squad_2023-24.csv \
  --formation_pref 4-3-3 3-4-3 \
  --p_floor 0.5 \
  --output out/lineup.csv
```

## Troubleshooting

### Error: "Missing required column: pred_points"
→ Add `pred_points` column to your DataFrame.

### Error: "Squad must have at least 2 goalkeepers"
→ Check you have exactly 2 GK in your 15-player squad.

### Error: "No valid formation found"
→ Check position counts:
```python
print(squad_df['position'].value_counts())
# Should have: 2 GK, 5 DEF, 5 MID, 3 FWD (typical)
```

### All formations show `-inf`
→ Not enough players per position for any formation. Check position distribution.

## Next Steps

1. **Read full docs:** `code/utils/README_pick_lineup_autoformation.md`
2. **Run tests:** `python code/test_pick_lineup.py`
3. **See implementation:** `code/utils/IMPLEMENTATION_SUMMARY.md`

---

**Ready to use!** ✅ No additional setup required.
