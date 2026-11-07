# RakSat local stack: API :8787 + Web :3000 + Worker
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host ""
Write-Host "  Starting RakSat: API + Web + Worker"
Write-Host "  -------------------------------------"
Write-Host "  API     http://localhost:8787"
Write-Host "  Web     http://localhost:3000"
Write-Host "  Worker  reminders / LINE / push"
Write-Host ""

Start-Process cmd -ArgumentList '/k', "`"$Root\dev-api.cmd`""
Start-Sleep -Seconds 2
Start-Process cmd -ArgumentList '/k', "`"$Root\dev-web.cmd`""
Start-Sleep -Seconds 1
Start-Process cmd -ArgumentList '/k', "`"$Root\dev-worker.cmd`""

Write-Host "  Opened 3 terminal windows."
