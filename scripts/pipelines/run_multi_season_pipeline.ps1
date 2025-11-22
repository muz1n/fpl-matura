#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Führt Full-Season Backtests für mehrere Seasons parallel aus
    
.DESCRIPTION
    Startet die Pipeline für mehrere Seasons gleichzeitig.
    Nützlich für schnelle Gesamt-Evaluation.
    
.PARAMETER Seasons
    Array von Seasons (z.B. @("2020-21", "2021-22", "2022-23"))
    
.PARAMETER GwStart
    Start Gameweek (Standard: 2)
    
.PARAMETER GwEnd
    End Gameweek (Standard: 38)
    
.EXAMPLE
    .\run_multi_season_pipeline.ps1 -Seasons @("2020-21", "2021-22", "2022-23", "2023-24")
#>

param(
    [Parameter(Mandatory = $false)]
    [string[]]$Seasons = @("2020-21", "2021-22", "2022-23", "2023-24"),
    
    [Parameter(Mandatory = $false)]
    [int]$GwStart = 2,
    
    [Parameter(Mandatory = $false)]
    [int]$GwEnd = 38
)

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Multi-Season Pipeline" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Seasons: $($Seasons -join ', ')" -ForegroundColor White
Write-Host "GW Range: $GwStart - $GwEnd" -ForegroundColor White
Write-Host "Parallel Execution: $(if ($Seasons.Count -gt 1) { 'JA' } else { 'NEIN' })" -ForegroundColor White
Write-Host ""

$StartTime = Get-Date
$Jobs = @()

# Starte Pipeline für jede Season als separater Job
foreach ($Season in $Seasons) {
    Write-Host "[START] Pipeline für $Season..." -ForegroundColor Yellow
    
    $JobName = "Pipeline_$Season"
    $ScriptBlock = {
        param($Season, $GwStart, $GwEnd)
        
        $ErrorActionPreference = "Stop"
        Set-Location $using:PWD
        
        try {
            & .\run_full_season_pipeline.ps1 -Season $Season -GwStart $GwStart -GwEnd $GwEnd
            return @{
                Season  = $Season
                Success = $true
                Error   = $null
            }
        }
        catch {
            return @{
                Season  = $Season
                Success = $false
                Error   = $_.Exception.Message
            }
        }
    }
    
    $Job = Start-Job -Name $JobName -ScriptBlock $ScriptBlock -ArgumentList $Season, $GwStart, $GwEnd
    $Jobs += $Job
    
    Write-Host "  → Job gestartet: $JobName (ID: $($Job.Id))" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Warte auf Abschluss..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Warte auf alle Jobs und zeige Fortschritt
$CompletedCount = 0
$TotalJobs = $Jobs.Count

while ($CompletedCount -lt $TotalJobs) {
    Start-Sleep -Seconds 5
    
    foreach ($Job in $Jobs) {
        if ($Job.State -eq "Completed" -and -not $Job.HasMoreData) {
            continue
        }
        
        if ($Job.State -eq "Completed") {
            $Result = Receive-Job -Job $Job
            $CompletedCount++
            
            if ($Result.Success) {
                Write-Host "✓ $($Result.Season) abgeschlossen" -ForegroundColor Green
            }
            else {
                Write-Host "✗ $($Result.Season) FEHLER: $($Result.Error)" -ForegroundColor Red
            }
        }
        elseif ($Job.State -eq "Failed") {
            Write-Host "✗ $($Job.Name) fehlgeschlagen" -ForegroundColor Red
            $CompletedCount++
        }
        elseif ($Job.State -eq "Running") {
            Write-Host "⟳ $($Job.Name) läuft noch... ($CompletedCount/$TotalJobs abgeschlossen)" -ForegroundColor Yellow
        }
    }
}

# Aufräumen
$Jobs | Remove-Job -Force

$EndTime = Get-Date
$Duration = $EndTime - $StartTime
$DurationStr = "{0:hh\:mm\:ss}" -f $Duration

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Multi-Season Pipeline abgeschlossen!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Verarbeitete Seasons: $TotalJobs" -ForegroundColor White
Write-Host "Gesamt-Dauer: $DurationStr" -ForegroundColor White
Write-Host ""
Write-Host "Naechste Schritte:" -ForegroundColor Yellow
Write-Host "  1. Pruefe Ergebnisse in out/backtests/" -ForegroundColor White
Write-Host "  2. Vergleiche Summaries:" -ForegroundColor White
foreach ($Season in $Seasons) {
    Write-Host "     - team_backtest_summary_$Season`_gw$GwStart-$GwEnd.csv" -ForegroundColor Gray
}
Write-Host ""
