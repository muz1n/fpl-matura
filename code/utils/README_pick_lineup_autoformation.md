# pick_lineup_autoformation – Production-Ready FPL Lineup Picker

**Location:** `code/utils/team_builder.py`

## Overview

Auto-selects formation, starting XI, bench order, captain, and vice-captain from a 15-player FPL squad. Fully deterministic with robust tie-breaking.

## Function Signature

```python
def pick_lineup_autoformation(
    squad_df: pd.DataFrame,
    prefer_minutes: bool = True,
    p_start_col: str = "p_start",
    pred_col: str = "pred_points",
    position_col: str = "position",
    player_id_col: str = "player_id",
    name_col: str = "name",
    p_floor: float = 0.6,
    formation_preference: Optional[List[FormationStr]] = None,
    bench_policy: Optional[Dict[str, float]] = None,
    captain_policy: Optional[Dict[str, bool]] = None,
) -> LineupResult
```

### Parameters

- **`squad_df`**: DataFrame with 15 players. **Required columns:**
  - `position` (str): `"GK"`, `"DEF"`, `"MID"`, or `"FWD"`
  - `player_id` (int)
  - `pred_points` (float): predicted points for the gameweek
  - `p_start` (float, optional): starting probability in [0,1]
  - `price` (float, optional): player price (used for tie-breaking)
  - `name` (str, optional): player name (used for tie-breaking and display)

- **`prefer_minutes`** (bool, default `True`): If `True` and `p_start_col` present, multiply `pred_points` by `clamp(p_start, p_floor, 1.0)` to compute score. Otherwise score = `pred_points`.

- **`p_floor`** (float, default `0.6`): Minimum clamp value for `p_start` when `prefer_minutes=True`.

- **`formation_preference`** (optional): List of formations to try (e.g. `["4-3-3", "3-5-2"]`). Defaults to all 7 valid FPL formations.

- **`bench_policy`** (optional): Dict with bench-specific settings (e.g. `{"penalize_doubtful": 0.2}`). See bench policy documentation.

- **`captain_policy`** (optional): Dict with captain selection settings. Example: `{"prefer_minutes": True}` enables minutes-based tiebreaking when top 2 scores are within epsilon (0.05). When enabled, if the top 2 players have scores within 0.05 of each other, the player with higher `p_start` becomes captain. This ensures deterministic captain selection that prefers reliability over marginal score differences.

### Returns

**`LineupResult`** (TypedDict):

```python
{
    "formation": FormationStr,           # e.g. "3-4-3"
    "xi_ids": List[int],                 # 11 player IDs
    "bench_gk_id": int,
    "bench_out_ids": List[int],          # 3 outfield bench IDs (B1, B2, B3)
    "captain_id": int,
    "vice_id": int,
    "xi_points_sum": float,              # sum of pred_points (NOT score)
    "debug": Dict[str, float]            # formation -> XI sum mapping
}
```

## Algorithm

1. **Compute score:**
   - If `prefer_minutes=False` or `p_start_col` missing: `score = pred_points`
   - Else: `score = pred_points * clamp(p_start, p_floor, 1.0)`

2. **Pick starting GK:** Best GK by score → XI; second GK → `bench_gk_id`.

3. **Try all formations:**
   - For each formation (e.g. `"4-3-3"` = 4 DEF, 3 MID, 3 FWD):
     - Pick top N players by score for each outfield position.
     - Sum their scores.
   - Select formation with highest score sum.

4. **Captain/Vice:**
   - Default: Top 2 by score in the XI.
   - With `captain_policy={"prefer_minutes": True}`: If top 2 scores differ by ≤0.05, choose captain based on higher `p_start` (deterministic tiebreak).

5. **Bench outfield (3 players):**
   - Remaining outfield players sorted by:
     1. Score (desc)
     2. `p_start` (desc)
     3. Price (desc)
     4. Name (asc)
   - Top 3 become bench order (B1, B2, B3).

6. **Return:** Formation, XI IDs, bench, captain/vice, and debug dict mapping each formation to its score.

## Example Usage

### Basic

```python
from utils.team_builder import pick_lineup_autoformation
import pandas as pd

squad_df = pd.read_csv("my_squad.csv")  # 15 players with required columns

result = pick_lineup_autoformation(squad_df, prefer_minutes=True, p_floor=0.6)

print(f"Formation: {result['formation']}")
print(f"XI: {result['xi_ids']}")
print(f"Captain: {result['captain_id']}, Vice: {result['vice_id']}")
print(f"Expected XI points: {result['xi_points_sum']:.2f}")
```

### With Formation Preference

```python
result = pick_lineup_autoformation(
    squad_df,
    prefer_minutes=True,
    formation_preference=["4-3-3", "3-4-3", "4-4-2"]
)
```

### Disable Minutes Weighting

```python
result = pick_lineup_autoformation(squad_df, prefer_minutes=False)
# Now score = pred_points directly (no p_start adjustment)
```

### With Captain Policy (Minutes-Based Tiebreak)

```python
result = pick_lineup_autoformation(
    squad_df,
    captain_policy={"prefer_minutes": True}
)
# When top 2 scores are within 0.05, captain = player with higher p_start
# Ensures deterministic captain selection favoring reliability
```

## Input Validation

The function validates:
- At least 2 GK, 3 DEF, 3 MID, 1 FWD in squad.
- Each formation's position requirements are feasible.

Raises **`ValueError`** if:
- Missing required columns.
- Insufficient players for any valid formation.
- Fewer than 3 outfield players available for bench.

## Edge Cases

- **Missing `p_start` column:** Treated as `1.0` (no penalty).
- **Missing `price` or `name`:** Defaults filled for tie-breaking.
- **All formations infeasible:** Returns error with helpful message.
- **Ties in selection:** Deterministic sort by score → p_start → price → name.

## CLI Tool

A ready-to-use CLI is available at `code/lineup/auto_formation_cli.py`:

```bash
python code/lineup/auto_formation_cli.py \
  --season 2023-24 \
  --gw 30 \
  --squad_csv data/current/squad_2023-24.csv \
  --p_floor 0.6 \
  --formation_pref 4-3-3 3-4-3 \
  --output out/lineup_gw30.csv
```

## Tests

Run the test script to validate:

```bash
python code/test_pick_lineup.py
```

Expected output: ✅ Alle Tests erfolgreich!

## Debug Info

The `debug` dict maps each formation to its XI score sum:

```python
{
    "3-4-3": 54.94,
    "3-5-2": 53.96,
    "4-4-2": 54.50,
    # ...
}
```

Infeasible formations show `-inf`.

## Type Safety

Fully typed with `TypedDict`, `Literal`, and `Optional` annotations. Compatible with mypy/pyright.

## Related

- **Utility:** `parse_formation_counts(formation: str) -> Dict[str, int]`
  - Example: `parse_formation_counts("4-3-3")` → `{"DEF": 4, "MID": 3, "FWD": 3}`

---

**Author:** Generated for fpl-matura project  
**Date:** 2025-01  
**Version:** 2.0 (production-ready with full determinism)
