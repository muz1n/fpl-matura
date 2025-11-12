# Bench Policy Quick Reference

## Basic Usage

```python
from utils.team_builder import pick_lineup_autoformation

# Default: No penalty (existing behavior)
lineup = pick_lineup_autoformation(squad_df)

# With doubtful penalty: 20% score reduction for doubtful players
lineup = pick_lineup_autoformation(
    squad_df,
    bench_policy={"penalize_doubtful": 0.2}
)
```

## Required Data Setup

```python
import pandas as pd

squad_df = pd.DataFrame({
    "player_id": [1, 2, 3, ...],
    "name": ["Player A", "Player B", ...],
    "position": ["GK", "DEF", "MID", ...],
    "pred_points": [5.0, 6.5, 7.2, ...],
    "p_start": [0.95, 0.80, 0.90, ...],      # Optional
    "doubtful": [False, True, False, ...],   # Optional - NEW
})
```

## Bench Policy Values

| Value | Effect | Use Case |
|-------|--------|----------|
| `None` | No penalty (default) | Standard lineup selection |
| `0.1` | 10% reduction | Minor injury concerns |
| `0.2` | 20% reduction | Moderate doubts |
| `0.25` | 25% reduction | **Recommended** for press conference flags |
| `0.5` | 50% reduction | Major fitness concerns |
| `1.0` | 100% reduction (bench last) | Extreme - avoid doubtful players entirely |

## Example Scenarios

### Scenario 1: Friday Press Conference Flags

```python
# Mark players with injury doubts from press conference
injury_news = ["Haaland", "Salah", "Saka"]
squad_df["doubtful"] = squad_df["name"].isin(injury_news)

# Apply moderate penalty
lineup = pick_lineup_autoformation(
    squad_df,
    bench_policy={"penalize_doubtful": 0.25}
)
```

### Scenario 2: Yellow Card Accumulation

```python
# Players on 4 yellows (one away from suspension)
squad_df["doubtful"] = squad_df["yellow_cards"] >= 4

# Conservative bench strategy
lineup = pick_lineup_autoformation(
    squad_df,
    bench_policy={"penalize_doubtful": 0.3}
)
```

### Scenario 3: Fitness Tracking

```python
# Players who missed training
squad_df["doubtful"] = squad_df["training_attendance"] < 3

# Light penalty
lineup = pick_lineup_autoformation(
    squad_df,
    bench_policy={"penalize_doubtful": 0.15}
)
```

## What Gets Affected

| Component | Affected by bench_policy? |
|-----------|---------------------------|
| Starting XI | ❌ No (uses original score) |
| Captain | ❌ No (uses original score) |
| Vice Captain | ❌ No (uses original score) |
| Bench GK | ❌ No (always 2nd GK by score) |
| **Bench Order (3 outfielders)** | ✅ **Yes** (applies penalty) |

## Math Example

Player A: `pred_points=6.0`, `doubtful=False`  
Player B: `pred_points=6.5`, `doubtful=True`

**Without penalty:**
- A bench score: 6.0
- B bench score: 6.5
- **Bench order:** B, A (B ranks higher)

**With `penalize_doubtful=0.25`:**
- A bench score: 6.0 (unchanged)
- B bench score: 6.5 × (1 - 0.25) = 6.5 × 0.75 = **4.875**
- **Bench order:** A, B (A ranks higher now)

## Testing Your Setup

```python
# Quick test
print("Doubtful players:", squad_df[squad_df["doubtful"]]["name"].tolist())

# Compare with/without policy
result_default = pick_lineup_autoformation(squad_df)
result_penalized = pick_lineup_autoformation(
    squad_df, 
    bench_policy={"penalize_doubtful": 0.25}
)

print("Default bench:", result_default["bench_out_ids"])
print("Penalized bench:", result_penalized["bench_out_ids"])
```

## Tips

✅ **Do:**
- Use 0.2-0.3 for typical injury doubts
- Mark players from injury reports as doubtful
- Test different penalty values for your strategy

❌ **Don't:**
- Apply to starting XI decisions (use `p_start` column instead)
- Use extreme values (>0.5) unless intentional
- Mark too many players as doubtful (defeats the purpose)

## Full Demo

```bash
# See complete working example
python code/demo_bench_policy.py
```

## Tests

```bash
# Run test suite
pytest code/test_pick_lineup_autoformation.py -v

# Specific test
pytest code/test_pick_lineup_autoformation.py::TestPickLineupAutoformation::test_bench_policy_penalize_doubtful -v
```

---

**Documentation:** `docs/bench_policy_feature.md`  
**Implementation:** `code/utils/team_builder.py::pick_lineup_autoformation`  
**Tests:** `code/test_pick_lineup_autoformation.py`
