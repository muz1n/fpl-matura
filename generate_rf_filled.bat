@echo off
REM Generiert rf_filled Vorhersagen für eine komplette Saison
REM Erfordert dass RF, MA3 und POS Vorhersagen bereits existieren

setlocal enabledelayedexpansion

set SEASON=%1
set GW_START=%2
set GW_END=%3

if "%SEASON%"=="" (
    echo Verwendung: generate_rf_filled.bat SEASON GW_START GW_END
    echo Beispiel: generate_rf_filled.bat 2022-23 2 38
    exit /b 1
)

if "%GW_START%"=="" set GW_START=1
if "%GW_END%"=="" set GW_END=38

echo ========================================
echo rf_filled Vorhersagen generieren
echo Season: %SEASON%
echo GW Range: %GW_START% - %GW_END%
echo ========================================
echo.

REM Aktiviere virtuelle Umgebung falls vorhanden
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
)

set ERROR_COUNT=0

for /L %%G in (%GW_START%,1,%GW_END%) do (
    echo.
    echo [GW%%G] Erstelle rf_filled Vorhersagen...
    python code\models\filled_model.py --season %SEASON% --gw %%G
    
    if errorlevel 1 (
        echo [GW%%G] FEHLER bei rf_filled Generierung
        set /a ERROR_COUNT+=1
    ) else (
        echo [GW%%G] ✓ Erfolgreich
    )
)

echo.
echo ========================================
echo rf_filled Generierung abgeschlossen
echo Fehler: %ERROR_COUNT%
echo ========================================

if %ERROR_COUNT% gtr 0 (
    exit /b 1
)
