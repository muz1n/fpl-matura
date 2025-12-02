@echo off
REM Batch-Skript: Backtests fuer alle Methoden durchfuehren
REM Verwendet: rf, rf_relaxed, rf_pos, rf_rank, ma3, pos

set PYTHON=C:\Users\$\Documents\Schule\matura\fpl-matura\.venv\Scripts\python.exe

echo ========================================
echo Backtests fuer alle Methoden starten
echo ========================================
echo.

REM Season 2023-24, GW 30-38
echo [1/4] Backtest fuer Season 2023-24, GW 30-38...
%PYTHON% code\evaluation\team_backtest.py --season 2023-24 --gw_start 30 --gw_end 38 --methods rf rf_relaxed rf_pos rf_rank ma3 pos
if %errorlevel% neq 0 (
    echo FEHLER bei 2023-24 GW 30-38
    pause
    exit /b 1
)
echo.

REM Season 2022-23, GW 30-38
echo [2/4] Backtest fuer Season 2022-23, GW 30-38...
%PYTHON% code\evaluation\team_backtest.py --season 2022-23 --gw_start 30 --gw_end 38 --methods rf rf_relaxed rf_pos rf_rank ma3 pos
if %errorlevel% neq 0 (
    echo FEHLER bei 2022-23 GW 30-38
    pause
    exit /b 1
)
echo.

REM Season 2021-22, GW 30-38
echo [3/4] Backtest fuer Season 2021-22, GW 30-38...
%PYTHON% code\evaluation\team_backtest.py --season 2021-22 --gw_start 30 --gw_end 38 --methods rf rf_relaxed rf_pos rf_rank ma3 pos
if %errorlevel% neq 0 (
    echo FEHLER bei 2021-22 GW 30-38
    pause
    exit /b 1
)
echo.

REM Season 2020-21, GW 30-38
echo [4/4] Backtest fuer Season 2020-21, GW 30-38...
%PYTHON% code\evaluation\team_backtest.py --season 2020-21 --gw_start 30 --gw_end 38 --methods rf rf_relaxed rf_pos rf_rank ma3 pos
if %errorlevel% neq 0 (
    echo FEHLER bei 2020-21 GW 30-38
    pause
    exit /b 1
)
echo.

echo ========================================
echo Alle Backtests erfolgreich abgeschlossen!
echo ========================================
echo.
echo Naechste Schritte:
echo 1. Backtest-Page im Browser neu laden
echo 2. Alle 6 Methoden sollten nun sichtbar sein
echo.
pause
