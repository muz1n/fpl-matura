@echo off
REM Set UTF-8 Codepage fuer Unicode Symbole (✓ etc.)
chcp 65001 > nul
REM Erzwinge UTF-8 Encoding fuer Python stdout/stderr
set PYTHONIOENCODING=utf-8
REM Full-Season Pipeline: Generiert Vorhersagen (rf, rf_relaxed, ma3, pos) und fuehrt Backtest durch
REM rf_optfill nutzt rf predictions + POS fallback (kein eigener Generation-Schritt)
REM Usage: run_full_season_pipeline.bat SEASON [GW_START] [GW_END]

setlocal enabledelayedexpansion

set SEASON=%1
set GW_START=%2
set GW_END=%3

if "%SEASON%"=="" (
    echo FEHLER: Season fehlt
    echo Usage: run_full_season_pipeline.bat SEASON [GW_START] [GW_END]
    echo Beispiel: run_full_season_pipeline.bat 2022-23 2 38
    exit /b 1
)

if "%GW_START%"=="" set GW_START=2
if "%GW_END%"=="" set GW_END=38

echo ========================================
echo Full-Season Pipeline fuer %SEASON%
echo GW Range: %GW_START% - %GW_END%
echo Methoden: rf, rf_relaxed, ma3, pos, rf_optfill
echo ========================================
echo.

REM Aktiviere virtuelle Umgebung
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
)

set START_TIME=%TIME%

REM Schritt 1: RF Vorhersagen
echo.
echo ========================================
echo Schritt 1/5: RF Vorhersagen
echo ========================================
for /L %%G in (%GW_START%,1,%GW_END%) do (
    echo [GW%%G] Generiere RF Vorhersagen...
    python code\models\make_predictions.py --season %SEASON% --gw %%G --method rf
    if errorlevel 1 (
        echo WARNUNG: RF GW%%G fehlgeschlagen
    )
)

REM Schritt 2: RF_RELAXED Vorhersagen
echo.
echo ========================================
echo Schritt 2/5: RF_RELAXED Vorhersagen
echo ========================================
for /L %%G in (%GW_START%,1,%GW_END%) do (
    echo [GW%%G] Generiere RF_RELAXED Vorhersagen...
    python code\models\make_predictions.py --season %SEASON% --gw %%G --method rf_relaxed
    if errorlevel 1 (
        echo WARNUNG: RF_RELAXED GW%%G fehlgeschlagen
    )
)

REM Schritt 3: MA3 Vorhersagen
echo.
echo ========================================
echo Schritt 3/5: MA3 Vorhersagen
echo ========================================
for /L %%G in (%GW_START%,1,%GW_END%) do (
    echo [GW%%G] Generiere MA3 Vorhersagen...
    python code\models\make_predictions.py --season %SEASON% --gw %%G --method ma3
    if errorlevel 1 (
        echo WARNUNG: MA3 GW%%G fehlgeschlagen
    )
)

REM Schritt 4: POS Vorhersagen
echo.
echo ========================================
echo Schritt 4/5: POS Vorhersagen
echo ========================================
for /L %%G in (%GW_START%,1,%GW_END%) do (
    echo [GW%%G] Generiere POS Vorhersagen...
    python code\models\make_predictions.py --season %SEASON% --gw %%G --method pos
    if errorlevel 1 (
        echo WARNUNG: POS GW%%G fehlgeschlagen
    )
)

REM Schritt 5: Team Backtest
echo.
echo ========================================
echo Schritt 5/5: Team Backtest
echo ========================================
echo Starte Backtest mit Methoden: rf, rf_relaxed, rf_optfill, ma3, pos
echo Note: rf_optfill nutzt rf+pos fallback, keine eigene Generierung noetig
python code\evaluation\team_backtest.py --season %SEASON% --gw_start %GW_START% --gw_end %GW_END% --methods rf rf_relaxed rf_optfill ma3 pos

if errorlevel 1 (
    echo FEHLER beim Backtest
    exit /b 1
)

set END_TIME=%TIME%

echo.
echo ========================================
echo Pipeline erfolgreich abgeschlossen!
echo ========================================
echo Season:   %SEASON%
echo GW Range: %GW_START% - %GW_END%
echo Start:    %START_TIME%
echo Ende:     %END_TIME%
echo.
echo Ergebnisse:
echo   - out\backtests\team_backtest_%SEASON%_gw%GW_START%-%GW_END%.csv
echo   - out\backtests\team_backtest_summary_%SEASON%_gw%GW_START%-%GW_END%.csv
echo.
