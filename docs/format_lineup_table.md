# format_lineup_table Function

## Overview

The `format_lineup_table` function creates a clean, readable string table displaying a FPL lineup with starting XI and bench players.

## Location

`code/utils/team_builder.py`

## Function Signature

```python
def format_lineup_table(
    squad_df: pd.DataFrame,
    xi_ids: List[int],
    bench_gk_id: int,
    bench_out_ids: List[int],
    captain_id: Optional[int] = None,
    vice_id: Optional[int] = None,
    player_id_col: str = "player_id",
    name_col: str = "name",
    position_col: str = "position",
    pred_col: str = "pred_points",
    p_start_col: str = "p_start",
) -> str
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `squad_df` | `pd.DataFrame` | - | DataFrame with player information |
| `xi_ids` | `List[int]` | - | List of 11 player IDs in starting XI |
| `bench_gk_id` | `int` | - | ID of goalkeeper on bench |
| `bench_out_ids` | `List[int]` | - | List of 3 outfield player IDs on bench (B1, B2, B3) |
| `captain_id` | `Optional[int]` | `None` | Captain player ID (adds (C) marker) |
| `vice_id` | `Optional[int]` | `None` | Vice-captain player ID (adds (VC) marker) |
| `player_id_col` | `str` | `"player_id"` | Column name for player ID |
| `name_col` | `str` | `"name"` | Column name for player name |
| `position_col` | `str` | `"position"` | Column name for position |
| `pred_col` | `str` | `"pred_points"` | Column name for predicted points |
| `p_start_col` | `str` | `"p_start"` | Column name for starting probability |

## Returns

A formatted string table with:
- Starting XI section (11 players)
- Bench section (1 GK + 3 outfield players)
- Position, name, predicted points, and start probability for each player
- Captain (C) and vice-captain (VC) markers
- Bench slot indicators: [GK], [B1], [B2], [B3]

## Example Usage

### Basic Usage

```python
from utils.team_builder import pick_lineup_autoformation, format_lineup_table

# Pick lineup
result = pick_lineup_autoformation(squad_df)

# Format and print
table = format_lineup_table(
    squad_df=squad_df,
    xi_ids=result["xi_ids"],
    bench_gk_id=result["bench_gk_id"],
    bench_out_ids=result["bench_out_ids"],
    captain_id=result["captain_id"],
    vice_id=result["vice_id"],
)

print(table)
```

### With Custom Column Names

```python
table = format_lineup_table(
    squad_df=custom_df,
    xi_ids=result["xi_ids"],
    bench_gk_id=result["bench_gk_id"],
    bench_out_ids=result["bench_out_ids"],
    captain_id=result["captain_id"],
    vice_id=result["vice_id"],
    name_col="web_name",
    pred_col="predicted_points",
)
```

## Example Output

```
======================================================================
STARTING XI
----------------------------------------------------------------------
  GK  | Alisson                   |  5.20 pts | 100% start
  DEF | Alexander-Arnold          |  6.50 pts |  95% start
  DEF | Robertson                 |  6.20 pts |  98% start
  DEF | Van Dijk                  |  5.80 pts |  92% start
  MID | Salah                (VC) |  8.50 pts |  99% start
  MID | Saka                      |  7.20 pts |  95% start
  MID | Palmer                    |  6.80 pts |  93% start
  MID | Foden                     |  6.50 pts |  88% start
  FWD | Haaland              (C)  |  9.20 pts |  97% start
  FWD | Watkins                   |  6.50 pts |  90% start
  FWD | Solanke                   |  5.80 pts |  88% start
----------------------------------------------------------------------
BENCH
----------------------------------------------------------------------
  [GK]  GK  | Kelleher                  |  3.80 pts |  30% start
  [B1]  DEF | Gabriel                   |  5.50 pts |  90% start
  [B2]  MID | Gordon                    |  5.20 pts |  85% start
  [B3]  DEF | White                     |  4.80 pts |  85% start
======================================================================
```

## Features

- **Clean formatting**: Fixed-width columns for easy reading
- **Captain markers**: (C) and (VC) clearly identify captain and vice
- **Bench indicators**: [GK], [B1], [B2], [B3] show bench order
- **Complete info**: Position, name, points, and start probability
- **Separation**: Clear visual separation between XI and bench
- **Consistent width**: 70-character width fits most terminal windows

## CLI Integration

The function is integrated into `auto_formation_cli_v2.py` for automatic lineup display:

```bash
python code/lineup/auto_formation_cli_v2.py --season 2023-24 --gw 30 --window 5 --k 3 --squad_csv data/current/squad_2023-24.csv
```

The CLI automatically prints the formatted table after selecting the lineup.

## Error Handling

- If a player ID is not found in `squad_df`, displays `"Player {id} (not found)"`
- Missing columns are handled with default values (e.g., `p_start` defaults to 1.0)
- Returns a valid string table even with incomplete data

## Testing

Run the test suite:
```bash
python code/test_format_lineup.py
```

Expected: Clean table output with all 15 players, proper markers, and correct formatting.
