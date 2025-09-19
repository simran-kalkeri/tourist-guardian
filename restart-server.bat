@echo off
echo ================================================
echo   RESTARTING BACKEND SERVER WITH SOS FIXES
echo ================================================
echo.

echo Step 1: Stopping any existing server processes...
echo Please go to your server terminal and press Ctrl+C to stop the server
echo.

echo Step 2: After stopping the server, press any key to continue...
pause

echo Step 3: Starting the backend server...
cd /d "C:\simran\SIH '25\tourist-guardian\backend"
echo Current directory: %cd%
echo.

echo Starting server with: npm start
npm start

pause