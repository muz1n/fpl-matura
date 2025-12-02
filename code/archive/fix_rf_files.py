import json
from pathlib import Path
from datetime import datetime

PRED_DIR = Path("out/predictions")  # Pfad anpassen falls nötig
METHODS_TO_FIX = ["rf_pos", "rf_rank"]


def detect_season(filename: str):
    return filename.split("_")[1]


def detect_gw(filename: str):
    return int(filename.split("_")[2].replace("gw", ""))


def detect_method(filename: str):
    return filename.split("_")[3].replace(".json", "")


def fix_file(path: Path):
    try:
        data = None
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"❌ Fehler beim Lesen mit utf-8: {path}: {e}")
            try:
                data = json.loads(path.read_text(encoding="latin-1"))
                print(f"⚠️ Datei {path} wurde mit latin-1 gelesen.")
            except Exception as e2:
                print(f"❌ Fehler beim Lesen mit latin-1: {path}: {e2}")
                return False
        if isinstance(data, dict) and "players" in data:
            return False
        if isinstance(data, list):
            filename = path.name
            season = detect_season(filename)
            gw = detect_gw(filename)
            method = detect_method(filename)
            fixed_players = []
            for idx, p in enumerate(data):
                fixed_players.append(
                    {
                        "player_id": idx + 1,
                        "name": p.get("name"),
                        "pos": p.get("position", "UNK"),
                        "team": p.get("team", "UNK"),
                        "predicted_points": p.get("predicted_points", 0.0),
                        "price": 0.0,
                    }
                )
            fixed_json = {
                "season": season,
                "gw": gw,
                "method": method,
                "generated_at": str(datetime.now()),
                "players": fixed_players,
            }
            path.write_text(json.dumps(fixed_json, indent=2))
            return True
    except Exception as e:
        print(f"❌ Fehler in Datei {path}: {e}")
    return False


def main():
    changed = 0
    for file in PRED_DIR.glob("*.json"):
        if any(m in file.name for m in METHODS_TO_FIX):
            if fix_file(file):
                changed += 1
                print(f"✔️ Repariert: {file.name}")
    print()
    print(f"Fertig. Reparierte Dateien: {changed}")


if __name__ == "__main__":
    main()
