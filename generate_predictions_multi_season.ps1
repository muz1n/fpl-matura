# Resume-faehiger Multi-Season Backtest Runner
# Generiert fehlende Predictions und Backtests, ueberspringt vorhandene

$SEASONS = @("2020-21", "2021-22", "2022-23", "2023-24")
$GW_START = 30
$GW_END = 38
$BASIC_METHODS = @("rf", "ma3", "pos")

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Resume-faehiger Multi-Season Runner" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

foreach ($SEASON in $SEASONS) {
    Write-Host ""
    Write-Host "Season: $SEASON" -ForegroundColor Yellow
    Write-Host "------------------------------------" -ForegroundColor Yellow
    
    # [1] Basic Predictions (rf, ma3, pos)
    Write-Host "[1/3] Basic Predictions (rf, ma3, pos)..." -ForegroundColor Green
    $missing_preds = 0
    for ($GW = $GW_START; $GW -le $GW_END; $GW++) {
        foreach ($METHOD in $BASIC_METHODS) {
            $pred_file = "out\predictions_${SEASON}_gw${GW}_${METHOD}.json"
            if (-not (Test-Path $pred_file)) {
                Write-Host "  Missing: GW $GW $METHOD - generating..." -ForegroundColor Gray
                & python code\models\make_predictions.py --season $SEASON --gw $GW --method $METHOD
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "  ERROR: Failed for $SEASON GW $GW $METHOD" -ForegroundColor Red
                    $missing_preds++
                }
            }
        }
    }
    if ($missing_preds -eq 0) {
        Write-Host "  All basic predictions present for $SEASON" -ForegroundColor Green
    }
    
    # [2] rf_pos
    Write-Host "[2/3] rf_pos Predictions..." -ForegroundColor Green
    $rf_pos_exists = $true
    for ($GW = $GW_START; $GW -le $GW_END; $GW++) {
        if (-not (Test-Path "out\predictions_${SEASON}_gw${GW}_rf_pos.json")) {
            $rf_pos_exists = $false
            break
        }
    }
    
    if ($rf_pos_exists) {
        Write-Host "  rf_pos already present for $SEASON" -ForegroundColor Green
    }
    else {
        Write-Host "  Generating rf_pos for $SEASON..." -ForegroundColor Gray
        & python code\models\position_model.py --season $SEASON --start_gw $GW_START --end_gw $GW_END
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ERROR: rf_pos failed for $SEASON" -ForegroundColor Red
        }
    }
    
    # [3] rf_rank
    Write-Host "[3/3] rf_rank Predictions..." -ForegroundColor Green
    $rf_rank_exists = $true
    for ($GW = $GW_START; $GW -le $GW_END; $GW++) {
        if (-not (Test-Path "out\predictions_${SEASON}_gw${GW}_rf_rank.json")) {
            $rf_rank_exists = $false
            break
        }
    }
    
    if ($rf_rank_exists) {
        Write-Host "  rf_rank already present for $SEASON" -ForegroundColor Green
    }
    else {
        Write-Host "  Generating rf_rank for $SEASON..." -ForegroundColor Gray
        & python code\models\moving_average_model.py --season $SEASON --start_gw $GW_START --end_gw $GW_END
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ERROR: rf_rank failed for $SEASON" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Season $SEASON predictions complete!" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "ZUSAMMENFASSUNG" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

foreach ($SEASON in $SEASONS) {
    Write-Host ""
    Write-Host "Season: $SEASON" -ForegroundColor Yellow
    
    $total = 0
    $present = 0
    
    for ($GW = $GW_START; $GW -le $GW_END; $GW++) {
        foreach ($METHOD in @("rf", "ma3", "pos", "rf_pos", "rf_rank")) {
            $total++
            if (Test-Path "out\predictions_${SEASON}_gw${GW}_${METHOD}.json") {
                $present++
            }
        }
    }
    
    $pct = [math]::Round(($present / $total) * 100, 1)
    Write-Host "  Predictions: $present / $total ($pct%)" -ForegroundColor $(if ($present -eq $total) { "Green" } else { "Yellow" })
    
    # Backtests pruefen (manuell ausfuehren wegen team_backtest Fehler)
    $bt_detail = "out\team_backtest_${SEASON}_gw${GW_START}-${GW_END}.csv"
    $bt_summary = "out\team_backtest_summary_${SEASON}_gw${GW_START}-${GW_END}.csv"
    
    if ((Test-Path $bt_detail) -and (Test-Path $bt_summary)) {
        Write-Host "  Backtest: Present" -ForegroundColor Green
    }
    else {
        Write-Host "  Backtest: Missing (run manually: python code\evaluation\team_backtest.py --season $SEASON --gw_start $GW_START --gw_end $GW_END)" -ForegroundColor Yellow
    }
}

Write-Host ""
Read-Host "Press Enter to close"
