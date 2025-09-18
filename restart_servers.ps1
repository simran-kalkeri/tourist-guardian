# RESTART SERVERS SCRIPT
# This script will kill existing Node.js processes and restart both backend and frontend

Write-Host "🔄 Restarting Tourist Guardian Servers..." -ForegroundColor Yellow

# Kill existing Node.js processes
Write-Host "🛑 Stopping existing Node.js processes..." -ForegroundColor Red
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Clean up any remaining processes on ports 3000 and 5000
Write-Host "🧹 Cleaning up ports..." -ForegroundColor Yellow
$port3000 = netstat -ano | Select-String ":3000 " | ForEach-Object { ($_ -split '\s+')[4] }
$port5000 = netstat -ano | Select-String ":5000 " | ForEach-Object { ($_ -split '\s+')[4] }

if ($port3000) {
    taskkill /F /PID $port3000 2>$null
}
if ($port5000) {
    taskkill /F /PID $port5000 2>$null
}

Start-Sleep -Seconds 2

# Start backend server
Write-Host "🚀 Starting Backend Server (Port 5000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\simran\SIH ''25\tourist-guardian\backend'; Write-Host 'BACKEND SERVER STARTING...' -ForegroundColor Red; npm start"

# Wait a bit for backend to start
Start-Sleep -Seconds 5

# Start frontend server
Write-Host "🌐 Starting Frontend Server (Port 3000)..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\simran\SIH ''25\tourist-guardian\frontend'; Write-Host 'FRONTEND SERVER STARTING...' -ForegroundColor Blue; npm start"

# Wait a bit and check status
Start-Sleep -Seconds 5

Write-Host "📊 Checking server status..." -ForegroundColor Cyan

# Check if servers are running
$backend = netstat -an | Select-String ":5000.*LISTENING"
$frontend = netstat -an | Select-String ":3000.*LISTENING"

if ($backend) {
    Write-Host "✅ Backend Server: RUNNING on port 5000" -ForegroundColor Green
} else {
    Write-Host "❌ Backend Server: NOT RUNNING" -ForegroundColor Red
}

if ($frontend) {
    Write-Host "✅ Frontend Server: RUNNING on port 3000" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend Server: NOT RUNNING" -ForegroundColor Red
}

Write-Host "`n🎯 Server URLs:" -ForegroundColor Yellow
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Blue
Write-Host "   Backend:  http://localhost:5000" -ForegroundColor Green
Write-Host "   API:      http://localhost:5000/api/" -ForegroundColor Cyan

Write-Host "`n🔧 Servers have been restarted! Tourists should now persist in the simulation." -ForegroundColor Magenta
Write-Host "   The cleanup job has been changed to run every 24 hours instead of hourly." -ForegroundColor Yellow