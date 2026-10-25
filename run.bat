@echo off
echo ========================================================
echo    Starting Elo Restro OS - AI Restaurant Intelligence
echo ========================================================
echo Navigating to project directory...
cd /d "%~dp0"
echo Seeding pristine demo dataset...
python seed_data.py
echo Starting FastAPI Web Server at http://127.0.0.1:8000 ...
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
pause
