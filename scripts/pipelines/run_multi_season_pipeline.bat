@echo off
REM Multi-Season Pipeline: Startet Full-Season Pipeline fuer mehrere Seasons
REM Usage: run_multi_season_pipeline.bat

setlocal enabledelayedexpansion

echo ========================================
echo Multi-Season Pipeline
echo ========================================
echo Seasons: 2020-21, 2021-22, 2022-23, 2023-24
echo GW Range: 2-38
echo.
echo WICHTIG: Dieser Prozess kann mehrere Stunden dauern!
echo.
pause

set START_TIME=%TIME%

REM Season 1: 2020-21
echo.
echo ========================================
echo Season 1/4: 2020-21
echo ========================================
start "Pipeline 2020-21" /MIN cmd /c "run_full_season_pipeline.bat 2020-21 2 38 > logs\pipeline_2020-21.log 2>&1"

REM Season 2: 2021-22
echo.
echo ========================================
echo Season 2/4: 2021-22
echo ========================================
start "Pipeline 2021-22" /MIN cmd /c "run_full_season_pipeline.bat 2021-22 2 38 > logs\pipeline_2021-22.log 2>&1"

REM Season 3: 2022-23
echo.
echo ========================================
echo Season 3/4: 2022-23
echo ========================================
start "Pipeline 2022-23" /MIN cmd /c "run_full_season_pipeline.bat 2022-23 2 38 > logs\pipeline_2022-23.log 2>&1"

REM Season 4: 2023-24
echo.
echo ========================================
echo Season 4/4: 2023-24
echo ========================================
start "Pipeline 2023-24" /MIN cmd /c "run_full_season_pipeline.bat 2023-24 2 38 > logs\pipeline_2023-24.log 2>&1"

echo.
echo ========================================
echo Alle Pipelines gestartet!
echo ========================================
echo.
echo 4 Prozesse laufen jetzt parallel im Hintergrund.
echo Logs werden geschrieben nach: logs\pipeline_SEASON.log
echo.
echo Zum Ueberwachen der Fortschritte:
echo   - Oeffne Task Manager und suche nach "cmd.exe" Prozessen
echo   - Oder pruefe die Log-Dateien in logs\
echo.
echo Geschaetzte Gesamtdauer: 2-4 Stunden (parallel)
echo.
