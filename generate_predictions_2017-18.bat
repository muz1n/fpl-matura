@echo off
REM Generiere Predictions fuer 2017-18 GW30-38

for %%g in (30 31 32 33 34 35 36 37 38) do (
    echo.
    echo === Generating predictions for GW%%g ===
    python code\make_predictions.py --season 2017-18 --gw %%g --methode rf
    python code\make_predictions.py --season 2017-18 --gw %%g --methode ma3
    python code\make_predictions.py --season 2017-18 --gw %%g --methode pos
)

echo.
echo === All predictions generated! ===
pause
