@echo off
REM Vollständiger Multi-Season Backtest mit allen Methoden
REM Erstellt Backtests für 2020-21 bis 2023-24 mit rf, rf_relaxed, rf_pos, rf_rank, ma3, pos

echo ========================================
echo Multi-Season Backtest Runner
echo ========================================
echo.

REM Aktiviere virtuelle Umgebung
call .venv\Scripts\activate.bat

REM 2020-21
echo [1/4] Running backtest for 2020-21...
python code\evaluation\team_backtest.py --season 2020-21 --gw_start 2 --gw_end 38 --methods rf rf_relaxed rf_pos rf_rank ma3 pos
if %errorlevel% neq 0 (
    echo ERROR: Backtest 2020-21 failed
    pause
    exit /b 1
)

REM 2021-22
echo.
echo [2/4] Running backtest for 2021-22...
python code\evaluation\team_backtest.py --season 2021-22 --gw_start 2 --gw_end 38 --methods rf rf_relaxed rf_pos rf_rank ma3 pos
if %errorlevel% neq 0 (
    echo ERROR: Backtest 2021-22 failed
    pause
    exit /b 1
)

REM 2022-23
echo.
echo [3/4] Running backtest for 2022-23...
python code\evaluation\team_backtest.py --season 2022-23 --gw_start 2 --gw_end 38 --methods rf rf_relaxed rf_pos rf_rank ma3 pos
if %errorlevel% neq 0 (
    echo ERROR: Backtest 2022-23 failed
    pause
    exit /b 1
)

REM 2023-24
echo.
echo [4/4] Running backtest for 2023-24...
python code\evaluation\team_backtest.py --season 2023-24 --gw_start 2 --gw_end 38 --methods rf rf_relaxed rf_pos rf_rank ma3 pos
if %errorlevel% neq 0 (
    echo ERROR: Backtest 2023-24 failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✓ All backtests completed successfully!
echo ========================================
echo.
echo Results saved in: out\backtests\
echo - team_backtest_SEASON_gw2-38.csv (Detail-Ergebnisse)
echo - team_backtest_summary_SEASON_gw2-38.csv (Zusammenfassung)
echo.
pause
