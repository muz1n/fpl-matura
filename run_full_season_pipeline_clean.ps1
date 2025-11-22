#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Komplette Pipeline f??r Full-Season Backtests mit rf_filled
    
.DESCRIPTION
    Dieser Skript f??hrt folgende Schritte aus:
    1. Generiert RF, MA3, POS Vorhersagen f??r alle GWs
    2. Generiert rf_filled Vorhersagen
    3. F??hrt Team-Backtest durch
    
    Kann mehrere Seasons parallel verarbeiten.
    
.PARAMETER Season
    Saison (z.B. "2022-23")
    
.PARAMETER GwStart
    Start Gameweek (Standard: 2)
    
.PARAMETER GwEnd
    End Gameweek (Standard: 38)
    
.PARAMETER SkipPredictions
    ??berspringe Vorhersage-Generierung (falls bereits vorhanden)
    
.EXAMPLE
    .\run_full_season_pipeline.ps1 -Season "2022-23"
    
.EXAMPLE
    .\run_full_season_pipeline.ps1 -Season "2022-23" -SkipPredictions
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Season,
    
    [Parameter(Mandatory=$false)]
    [int]$GwStart = 2,
    
    [Parameter(Mandatory=$false)]
    [int]$GwEnd = 38,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipPredictions
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Full-Season Pipeline f??r $Season" -ForegroundColor Cyan
Write-Host "GW Range: $GwStart - $GwEnd" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Aktiviere virtuelle Umgebung
if (Test-Path ".venv\Scripts\Activate.ps1") {
    Write-Host "[SETUP] Aktiviere virtuelle Umgebung..." -ForegroundColor Yellow
    & .venv\Scripts\Activate.ps1
}

$StartTime = Get-Date

# Schritt 1: Basis-Vorhersagen generieren
if (-not $SkipPredictions) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Schritt 1/3: Generiere Basis-Vorhersagen" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    # Pruefe ob Vorhersagen bereits existieren
    $sampleFile = "out\predictions_$Season`_gw$GwStart`_rf.json"
    if (Test-Path $sampleFile) {
        Write-Host "Vorhersagen scheinen bereits zu existieren" -ForegroundColor Green
        $response = Read-Host "Moechtest du sie neu generieren? (y/N)"
        if ($response -ne "y" -and $response -ne "Y") {
            Write-Host "Ueberspringe Vorhersage-Generierung" -ForegroundColor Yellow
            $SkipPredictions = $true
        }
    }
    
    if (-not $SkipPredictions) {
        Write-Host "[1/3] Starte Vorhersage-Generierung fuer RF, MA3, POS..." -ForegroundColor Yellow
        & .\generate_predictions_multi_season.ps1 -Season $Season -GwStart $GwStart -GwEnd $GwEnd
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "FEHLER bei Basis-Vorhersagen" -ForegroundColor Red
            exit 1
        }
        Write-Host "Basis-Vorhersagen erfolgreich" -ForegroundColor Green
    }
} else {
    Write-Host "[SKIP] Vorhersage-Generierung ??bersprungen" -ForegroundColor Yellow
}

# Schritt 2: rf_filled Vorhersagen generieren
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Schritt 2/3: Generiere rf_filled Vorhersagen" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "[2/3] Starte rf_filled Generierung..." -ForegroundColor Yellow
& .\generate_rf_filled.bat $Season $GwStart $GwEnd

if ($LASTEXITCODE -ne 0) {
    Write-Host "??? FEHLER bei rf_filled Generierung" -ForegroundColor Red
    exit 1
}
Write-Host "??? rf_filled Vorhersagen erfolgreich" -ForegroundColor Green

# Schritt 3: Team Backtest durchf??hren
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Schritt 3/3: Team Backtest" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "[3/3] Starte Team-Backtest mit allen Methoden..." -ForegroundColor Yellow
python code\evaluation\team_backtest.py --season $Season --gw_start $GwStart --gw_end $GwEnd --methods rf ma3 pos rf_filled

if ($LASTEXITCODE -ne 0) {
    Write-Host "??? FEHLER beim Backtest" -ForegroundColor Red
    exit 1
}

$EndTime = Get-Date
$Duration = $EndTime - $StartTime
$DurationStr = "{0:hh\:mm\:ss}" -f $Duration

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Pipeline erfolgreich abgeschlossen!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Season:   $Season" -ForegroundColor White
Write-Host "GW Range: $GwStart - $GwEnd" -ForegroundColor White
Write-Host "Dauer:    $DurationStr" -ForegroundColor White
Write-Host ""
Write-Host "Ergebnisse:" -ForegroundColor Yellow
Write-Host "  - Backtest CSV:     out\backtests\team_backtest_$Season`_gw$GwStart-$GwEnd.csv" -ForegroundColor White
Write-Host "  - Backtest Summary: out\backtests\team_backtest_summary_$Season`_gw$GwStart-$GwEnd.csv" -ForegroundColor White
Write-Host ""
