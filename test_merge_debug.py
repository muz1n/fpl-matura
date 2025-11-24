#!/usr/bin/env python3
"""Debug-Skript um das Merge-Problem zu verstehen."""

import json
import pandas as pd

# Lade rf_pos Predictions
with open("out/predictions/predictions_2020-21_gw30_rf_pos.json") as f:
    pred_raw = json.load(f)

pred_df = pd.DataFrame(pred_raw)
pred_df["pos"] = pred_df["position"]  # Rename wie im Code

print("=== PRED_DF VOR MERGE ===")
print(f"Columns: {pred_df.columns.tolist()}")
print(f"Shape: {pred_df.shape}")
print(f"Has player_id: {'player_id' in pred_df.columns}")
print()

# Lade Truth-Daten
truth = pd.read_csv("data/cleaned_merged_gw_2020-21.csv")
truth_gw30 = truth[truth["GW"] == 30].copy()

print("=== TRUTH_GW30 ===")
print(f"Shape: {truth_gw30.shape}")
print()

# Simuliere den Code-Flow
needed = ["player_id", "pos", "team", "price"]

for col in needed:
    if col not in pred_df.columns or pred_df[col].isna().all():
        print(f"\n=== PROCESSING MISSING COL: {col} ===")

        # Merge nach name, team, pos
        truth_basic = truth_gw30[["player_id", "name", "pos", "team", "price"]].dropna(
            subset=["name", "team", "pos"]
        )

        print(f"Truth_basic shape: {truth_basic.shape}")
        print(f"Pred_df columns before merge: {pred_df.columns.tolist()}")

        pred_df = pred_df.merge(
            truth_basic,
            on=["name", "team", "pos"],
            how="left",
            suffixes=("", "_truth"),
        )

        print(f"After merge columns: {pred_df.columns.tolist()}")
        print(f"After merge shape: {pred_df.shape}")

        if "player_id_truth" in pred_df.columns:
            matched = pred_df["player_id_truth"].notna().sum()
            print(f"Matched via player_id_truth: {matched}/{len(pred_df)}")

        # player_id auffuellen
        if "player_id_truth" in pred_df.columns:
            if "player_id" in pred_df.columns:
                pred_df["player_id"] = pred_df["player_id"].fillna(
                    pred_df["player_id_truth"]
                )
            else:
                pred_df["player_id"] = pred_df["player_id_truth"]
                print("Created player_id from player_id_truth")

        if "player_id" in pred_df.columns:
            final_matched = pred_df["player_id"].notna().sum()
            print(f"Final player_id count: {final_matched}/{len(pred_df)}")

        # BREAK after first iteration (wichtig!)
        print("\n⚠️  BREAKING after first col - would normally continue loop!")
        # break  # <- DAS FEHLT IM ORIGINAL CODE!

print("\n=== FINAL PRED_DF ===")
print(f"Columns: {pred_df.columns.tolist()}")
print(f"Shape: {pred_df.shape}")
if "player_id" in pred_df.columns:
    print(f"Players with ID: {pred_df['player_id'].notna().sum()}/{len(pred_df)}")
