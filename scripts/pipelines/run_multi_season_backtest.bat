@echo off
REM Multi-Season Backtest Runner
REM Generiert Predictions und fuehrt Backtests fuer alle Seasons aus

setlocal enabledelayedexpansion

set SEASONS=2020-21 2021-22 2022-23 2023-24
set GW_START=30
set GW_END=38

echo ====================================
echo Multi-Season Backtest Runner
echo ====================================
echo.
echo Seasons: %SEASONS%
echo GW Range: %GW_START%-%GW_END%
echo Methods: rf, ma3, pos, rf_pos, rf_rank
echo.

for %%S in (%SEASONS%) do (
    echo.
    echo ====================================
    echo Processing Season: %%S
    echo ====================================
    
    echo [1/4] Generating base predictions (rf, ma3, pos) for GW %GW_START% to %GW_END%...
    for /L %%G in (%GW_START%,1,%GW_END%) do (
        echo   - GW %%G...
        python code\models\make_predictions.py --season %%S --gw %%G --method rf
        if errorlevel 1 (
            echo ERROR: RF predictions failed for season %%S GW %%G
            pause
            exit /b 1
        )
        python code\models\make_predictions.py --season %%S --gw %%G --method ma3
        if errorlevel 1 (
            echo ERROR: MA3 predictions failed for season %%S GW %%G
            pause
            exit /b 1
        )
        python code\models\make_predictions.py --season %%S --gw %%G --method pos
        if errorlevel 1 (
            echo ERROR: POS predictions failed for season %%S GW %%G
            pause
            exit /b 1
        )
    )
    echo Base predictions (rf, ma3, pos) done for %%S
    
    echo [2/4] Generating rf_pos predictions...
    python code\models\position_model.py --season %%S --start_gw %GW_START% --end_gw %GW_END%
    if errorlevel 1 (
        echo ERROR: rf_pos failed for season %%S
        pause
        exit /b 1
    )
    echo rf_pos done for %%S
    
    echo [3/4] Generating rf_rank predictions...
    python code\models\moving_average_model.py --season %%S --start_gw %GW_START% --end_gw %GW_END%
    if errorlevel 1 (
        echo ERROR: rf_rank failed for season %%S
        pause
        exit /b 1
    )
    echo rf_rank done for %%S
    
    echo [4/4] Running team backtest...
    python code\evaluation\team_backtest.py --season %%S --gw-start %GW_START% --gw-end %GW_END%
    if errorlevel 1 (
        echo ERROR: Backtest failed for season %%S
        pause
        exit /b 1
    )
    echo Backtest done for %%S
    
    echo.
    echo Season %%S completed successfully!
    echo.
)

echo.
echo ====================================
echo ALL SEASONS COMPLETED!
echo ====================================
echo.
echo Output files in out/ directory:
dir /b out\team_backtest_*_gw%GW_START%-%GW_END%.csv
echo.

pause
