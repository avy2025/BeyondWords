@echo off
echo ======================================================
echo   Sign Language Translator - Setup & Run Menu
echo ======================================================
echo.
echo 1. Collect Training Data
echo 2. Train Model
echo 3. Run Real-Time Detection
echo 4. Exit
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo Starting Data Collection...
    .\venv\Scripts\python.exe collect_data.py
    pause
    goto :menu
)
if "%choice%"=="2" (
    echo Starting Model Training...
    .\venv\Scripts\python.exe train_model.py
    pause
    goto :menu
)
if "%choice%"=="3" (
    echo Starting Real-Time Detector...
    .\venv\Scripts\python.exe realtime_detect.py
    pause
    goto :menu
)
if "%choice%"=="4" (
    exit
)

:menu
cls
goto :echo
