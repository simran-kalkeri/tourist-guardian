@echo off
echo Starting ML Service...
cd /d "%~dp0..\ml"
python -m pip install -r requirements.txt
python service.py



