# rf_rank_boost.py
"""
Time-aware Random Forest regressor for FPL ranking prediction.

Usage:
    python code/rf_rank_boost.py --season 2022-23 --start_gw 30 --end_gw 38

Outputs:
    1) out/rf_rank_boost_summary_<season>_gw<start>-<end>.csv
    2) out/rf_rank_boost_bypos_<season>_gw<start>-<end>.csv
    3) out/rf_rank_boost_preds_<season>_gw<start>-<end>.csv
    4) For each gw: out/predictions_gw{gw}_rf_rank.json
"""
import argparse
import os
import json
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from scipy.stats import spearmanr
from itertools import product

# --- Utility Functions ---
def safe_rolling(df, col, window, groupby, shift=1):
    return (
        df.groupby(groupby)[col]
        .transform(lambda x: x.shift(shift).rolling(window, min_periods=1).mean())
    )

def one_hot_position(df):
    positions = ['GK', 'DEF', 'MID', 'FWD']
    for pos in positions:
        df[f'pos_{pos}'] = (df['position'] == pos).astype(int)
    return df

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

# --- Main ---
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--season', required=True)
    parser.add_argument('--start_gw', type=int, required=True)
    parser.add_argument('--end_gw', type=int, required=True)
    args = parser.parse_args()

    season = args.season
    start_gw = args.start_gw
    end_gw = args.end_gw
    out_dir = 'out'
    ensure_dir(out_dir)

    # Load data
    df = pd.read_csv(f'data/merged_gw_{season}.csv')
    df = df[df['season'] == season] if 'season' in df.columns else df
    # Basic columns
    base_cols = [
        'element', 'name', 'position', 'team', 'GW',
        'minutes', 'total_points', 'ict_index', 'influence',
        'creativity', 'threat'
    ]
    # Optional columns
    home_col = 'home' if 'home' in df.columns else None
    opp_col = 'opponent_strength' if 'opponent_strength' in df.columns else None

    # Rolling features
    for stat in ['minutes', 'total_points', 'ict_index', 'influence', 'creativity', 'threat']:
        df[f'{stat}_ma3'] = safe_rolling(df, stat, 3, 'element')
    # Home/opponent
    if home_col:
        df['home'] = df['home'].astype(int)
    if opp_col:
        df['opponent_strength'] = df['opponent_strength'].astype(float)
    df = one_hot_position(df)

    # Feature list
    features = [
        'minutes_ma3', 'total_points_ma3', 'ict_index_ma3', 'influence_ma3',
        'creativity_ma3', 'threat_ma3',
    ]
    if home_col:
        features.append('home')
    if opp_col:
        features.append('opponent_strength')
    features += [f'pos_{p}' for p in ['GK', 'DEF', 'MID', 'FWD']]

    # Prepare train/test splits
    train_df = df[df['GW'] < start_gw].copy()
    test_df = df[(df['GW'] >= start_gw) & (df['GW'] <= end_gw)].copy()

    # Grid search
    param_grid = {
        'n_estimators': [300, 600],
        'min_samples_leaf': [1, 2, 4],
        'max_depth': [None, 12, 20],
    }
    grid = list(product(*param_grid.values()))
    best_score = -np.inf
    best_params = None
    for n_est, min_leaf, max_d in grid:
        rf = RandomForestRegressor(
            n_estimators=n_est,
            min_samples_leaf=min_leaf,
            max_depth=max_d,
            random_state=42,
            n_jobs=-1
        )
        X_train = train_df[features].fillna(0)
        y_train = train_df['total_points']
        rf.fit(X_train, y_train)
        preds = rf.predict(X_train)
        rho, _ = spearmanr(y_train, preds)
        if rho > best_score:
            best_score = rho
            best_params = dict(n_estimators=n_est, min_samples_leaf=min_leaf, max_depth=max_d)
    # Final model
    rf = RandomForestRegressor(**best_params, random_state=42, n_jobs=-1)
    rf.fit(train_df[features].fillna(0), train_df['total_points'])

    # Step through test GWs
    preds_list = []
    bypos_metrics = []
    for gw in range(start_gw, end_gw + 1):
        gw_df = df[df['GW'] == gw].copy()
        # Recompute rolling features for gw < t
        for stat in ['minutes', 'total_points', 'ict_index', 'influence', 'creativity', 'threat']:
            gw_df[f'{stat}_ma3'] = safe_rolling(df[df['GW'] < gw], stat, 3, 'element').reindex(gw_df.index)
        if home_col:
            gw_df['home'] = gw_df['home'].astype(int)
        if opp_col:
            gw_df['opponent_strength'] = gw_df['opponent_strength'].astype(float)
        gw_df = one_hot_position(gw_df)
        X_gw = gw_df[features].fillna(0)
        pred_points = rf.predict(X_gw)
        gw_df['predicted_points'] = pred_points
        # Save per-gw predictions
        pred_json = gw_df[['GW', 'element', 'name', 'position', 'team', 'predicted_points']].to_dict(orient='records')
        with open(f'{out_dir}/predictions_gw{gw}_rf_rank.json', 'w', encoding='utf-8') as f:
            json.dump(pred_json, f, ensure_ascii=False, indent=2)
        preds_list.append(gw_df)
    # Concatenate all predictions
    all_preds = pd.concat(preds_list, ignore_index=True)
    # Save all predictions
    all_preds[['GW', 'element', 'name', 'position', 'team', 'predicted_points']].to_csv(
        f'{out_dir}/rf_rank_boost_preds_{season}_gw{start_gw}-{end_gw}.csv', index=False)
    # Metrics
    test_points = test_df['total_points']
    pred_points = all_preds['predicted_points']
    mae = mean_absolute_error(test_points, pred_points)
    rmse = np.sqrt(mean_squared_error(test_points, pred_points))
    rho, _ = spearmanr(test_points, pred_points)
    # By position
    pos_metrics = []
    for pos in ['GK', 'DEF', 'MID', 'FWD']:
        test_pos = test_df[test_df['position'] == pos]
        preds_pos = all_preds[all_preds['position'] == pos]
        if len(test_pos) == 0 or len(preds_pos) == 0:
            continue
        # Align indices by GW and element
        merged = pd.merge(
            test_pos[['GW', 'element', 'total_points']],
            preds_pos[['GW', 'element', 'predicted_points']],
            on=['GW', 'element'], how='inner'
        )
        mae_pos = mean_absolute_error(merged['total_points'], merged['predicted_points'])
        rmse_pos = np.sqrt(mean_squared_error(merged['total_points'], merged['predicted_points']))
        rho_pos, _ = spearmanr(merged['total_points'], merged['predicted_points'])
        pos_metrics.append({
            'position': pos,
            'MAE': mae_pos,
            'RMSE': rmse_pos,
            'Spearman_rho': rho_pos
        })
    # Save summary
    summary_dict = {
        'season': season,
        'start_gw': start_gw,
        'end_gw': end_gw,
        'MAE': mae,
        'RMSE': rmse,
        'Spearman_rho': rho
    }
    if best_params:
        summary_dict.update(best_params)
    summary = pd.DataFrame([summary_dict])
    summary.to_csv(f'{out_dir}/rf_rank_boost_summary_{season}_gw{start_gw}-{end_gw}.csv', index=False)
    # Save by position
    pd.DataFrame(pos_metrics).to_csv(f'{out_dir}/rf_rank_boost_bypos_{season}_gw{start_gw}-{end_gw}.csv', index=False)
    print(f'Overall Spearman rho: {rho:.4f}, MAE: {mae:.4f}')

if __name__ == '__main__':
    main()
