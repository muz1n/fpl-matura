# Captain Policy Feature

## Overview

The `captain_policy` parameter enables deterministic captain selection with minutes-based tiebreaking when top candidates have similar predicted scores.

## Usage

```python
from utils.team_builder import pick_lineup_autoformation

result = pick_lineup_autoformation(
    squad_df=squad,
    captain_policy={"prefer_minutes": True}
)
```

## How It Works

### Default Behavior (No Policy)
- Captain = player with highest score (`pred_points` or `pred_points * p_start`)
- Vice-captain = player with second-highest score

### With `captain_policy={"prefer_minutes": True}`
When the top 2 players' scores are within **epsilon = 0.05**:
- Compare their `p_start` (predicted starting probability)
- Captain = player with **higher p_start**
- Vice-captain = player with lower p_start

When scores differ by **more than 0.05**, use the default behavior.

## Deterministic Tiebreaks

The algorithm ensures complete determinism:
1. Primary: score difference > 0.05 → highest score wins
2. Secondary: score difference ≤ 0.05 → highest p_start wins
3. Tertiary: if p_start also equal → preserve score order (stable)

## Example

```python
# Scenario: Two defenders with very similar scores
# DEF1: 6.02 points, 95% start probability
# DEF2: 6.00 points, 99% start probability
# Difference: 0.02 (within epsilon 0.05)

# Without captain_policy
result_default = pick_lineup_autoformation(squad_df=squad)
# Captain: DEF1 (highest score)

# With captain_policy
result_policy = pick_lineup_autoformation(
    squad_df=squad,
    captain_policy={"prefer_minutes": True}
)
# Captain: DEF2 (higher p_start within epsilon)
```

## Rationale

This policy addresses a common FPL scenario:
- Two players have nearly identical predicted points
- One is more likely to start/play more minutes
- Traditional selection picks higher score (may be marginal)
- Prefer-minutes policy picks the more reliable option

This reduces captain risk from rotation or late lineup changes.

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `captain_policy` | `Optional[Dict[str, bool]]` | `None` | Configuration dict for captain selection |
| `captain_policy["prefer_minutes"]` | `bool` | - | If True, use p_start tiebreak for close scores |

## Requirements

- `p_start` column must exist in squad DataFrame
- Values should be between 0.0 and 1.0 (predicted starting probability)
- If `p_start` missing, policy is ignored (falls back to default behavior)

## Testing

Run the test suite:
```bash
python code/test_captain_policy.py
```

Expected output shows:
- Default behavior: highest score → captain
- Policy behavior: highest p_start (within epsilon) → captain
