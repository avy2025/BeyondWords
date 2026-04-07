# BeyondWords + Sign Language - Run three services (each in a new window)
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "--- BeyondWords Development Environment ---" -ForegroundColor Cyan
Write-Host "Project Root: $root"
Write-Host "Services: Node API (:5000), Vite Client (:5173), Python WS (:8765)" -ForegroundColor Green

# 1. Start Node.js API Server (BeyondWords Backend)
if (Test-Path "$root\server") {
    Write-Host "[1/3] Starting Node API Server..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$root\server'; npm run dev"
    )
    Start-Sleep -Seconds 2
} else {
    Write-Error "Could not find server folder."
}

# 2. Start Vite Client (BeyondWords Frontend)
if (Test-Path "$root\client") {
    Write-Host "[2/3] Starting Vite Frontend Client..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$root\client'; npm run dev"
    )
    Start-Sleep -Seconds 2
} else {
    Write-Error "Could not find client folder."
}

# 3. Start Python Sign Language Bridge (SignLanguageAdvanced — PyTorch LSTM model)
if (Test-Path "$root\python_bridge") {
    if (Test-Path "$root\python_bridge\sign_model.pth") {
        Write-Host "[3/3] Starting Python Sign WS Server..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList @(
            "-NoExit",
            "-Command",
            "Set-Location '$root\python_bridge'; .\.venv\Scripts\python.exe sign_ws_server.py"
        )
    } else {
        Write-Warning "Model file (sign_model.pth) not found in python_bridge. Did you train it?"
        Write-Host "You may need to run: cd '$root\python_bridge'; python train_model.py" -ForegroundColor Gray
    }
} else {
    Write-Error "Could not find python_bridge folder."
}

Write-Host "`nAll services starting..." -ForegroundColor Cyan
Write-Host "Please check the individual terminal windows for logs."
Write-Host "Open: http://localhost:5173" -ForegroundColor Green

