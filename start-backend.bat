@echo off
cd /d "%~dp0backend"
py -3.12 -m pip install -r requirements.txt >nul 2>&1
py -3.12 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
