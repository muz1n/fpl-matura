# Multi-Season Backtest Runner (PowerShell)
# Generiert Predictions und fuehrt Backtests fuer alle Seasons aus

$SEASONS = @("2020-21", "2021-22", "2022-23", "2023-24")
$GW_START = 30
$GW_END = 38

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Multi-Season Backtest Runner" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Seasons: $($SEASONS -join ', ')"
Write-Host "GW Range: $GW_START-$GW_END"
Write-Host "Methods: rf, ma3, pos, rf_pos, rf_rank"
Write-Host ""

foreach ($SEASON in $SEASONS) {
    Write-Host ""
    Write-Host "====================================" -ForegroundColor Yellow
    Write-Host "Processing Season: $SEASON" -ForegroundColor Yellow
    Write-Host "====================================" -ForegroundColor Yellow
    
    # [1/4] Base predictions (rf, ma3, pos)
    Write-Host "[1/4] Generating base predictions (rf, ma3, pos) for GW $GW_START to $GW_END..." -ForegroundColor Green
    for ($GW = $GW_START; $GW -le $GW_END; $GW++) {
        Write-Host "  - GW $GW..."
        
        & python code\models\make_predictions.py --season $SEASON --gw $GW --method rf
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: RF predictions failed for season $SEASON GW $GW" -ForegroundColor Red
            Read-Host "Press Enter to exit"
            exit 1
        }
        
        & python code\models\make_predictions.py --season $SEASON --gw $GW --method ma3
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: MA3 predictions failed for season $SEASON GW $GW" -ForegroundColor Red
            Read-Host "Press Enter to exit"
            exit 1
        }
        
        & python code\models\make_predictions.py --season $SEASON --gw $GW --method pos
        if ($LASTEXITCODE -ne 0) {
            Write-Host "ERROR: POS predictions failed for season $SEASON GW $GW" -ForegroundColor Red
            Read-Host "Press Enter to exit"
            exit 1
        }
    }
    Write-Host "Base predictions (rf, ma3, pos) done for $SEASON" -ForegroundColor Green
    
    # [2/4] rf_pos predictions
    Write-Host "[2/4] Generating rf_pos predictions..." -ForegroundColor Green
    & python code\models\position_model.py --season $SEASON --start_gw $GW_START --end_gw $GW_END
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: rf_pos failed for season $SEASON" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "rf_pos done for $SEASON" -ForegroundColor Green
    
    # [3/4] rf_rank predictions
    Write-Host "[3/4] Generating rf_rank predictions..." -ForegroundColor Green
    & python code\models\moving_average_model.py --season $SEASON --start_gw $GW_START --end_gw $GW_END
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: rf_rank failed for season $SEASON" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "rf_rank done for $SEASON" -ForegroundColor Green
    
    # [4/4] Team Backtest
    Write-Host "[4/4] Running team backtest..." -ForegroundColor Green
    & python code\evaluation\team_backtest.py --season $SEASON --gw-start $GW_START --gw-end $GW_END
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Backtest failed for season $SEASON" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "Backtest done for $SEASON" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Season $SEASON completed successfully!" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "ALL SEASONS COMPLETED!" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Output files in out/ directory:"
Get-ChildItem -Path "out\team_backtest_*_gw$GW_START-$GW_END.csv" | Select-Object -ExpandProperty Name
Write-Host ""

Read-Host "Press Enter to close"
