import os
import re
from pathlib import Path
import subprocess

PRED_DIR = Path("out/predictions")
rf_pattern = re.compile(r"^predictions_gw(\d+)_rf_(pos|rank)\.json$")

for file in PRED_DIR.iterdir():
    match = rf_pattern.match(file.name)
    if match:
        gw = match.group(1)
        method = match.group(2)
        # Versuche Season aus benachbarten Dateien zu holen
        season = None
        for sibling in PRED_DIR.iterdir():
            if sibling.name.startswith("predictions_") and sibling.name.endswith(
                f"_gw{gw}_rf_{method}.json"
            ):
                season = sibling.name.split("_")[1]
                break
        if not season:
            # Default: 2020-21, falls nicht ermittelbar
            season = "2020-21"
        new_name = f"predictions_{season}_gw{gw}_rf_{method}.json"
        new_path = PRED_DIR / new_name
        print(f"Umbenennen: {file.name} -> {new_name}")
        if new_path.exists():
            print(f"⚠️ Ziel existiert, wird überschrieben: {new_name}")
            new_path.unlink()
        os.rename(file, new_path)

# Repariere alle Dateien nach Umbenennung
subprocess.run(["python", "fix_rf_files.py"])
