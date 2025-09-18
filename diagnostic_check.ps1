#!/usr/bin/env pwsh

Write-Output "🔍 GEOFENCING & TOURIST DIAGNOSTIC CHECK"
Write-Output "========================================"
Write-Output "Time: $(Get-Date)"
Write-Output ""

# 1. Check backend server
Write-Output "1️⃣ BACKEND SERVER CHECK"
try {
    $health = Invoke-WebRequest -Uri "http://localhost:5000/health" -Method GET -TimeoutSec 3
    Write-Output "   ✅ Backend is running (Status: $($health.StatusCode))"
} catch {
    Write-Output "   ❌ Backend is NOT running - Please start backend first!"
    Write-Output "      Run: cd backend && npm start"
    exit 1
}

# 2. Check frontend server
Write-Output "`n2️⃣ FRONTEND SERVER CHECK"
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 3
    Write-Output "   ✅ Frontend is running (Status: $($frontend.StatusCode))"
} catch {
    Write-Output "   ❌ Frontend is NOT running - Please start frontend!"
    Write-Output "      Run: cd frontend && npm start"
}

# 3. Test geofencing API
Write-Output "`n3️⃣ GEOFENCING API TEST"
$testBody = @{
    touristId = "789824"
    latitude = 26.159448
    longitude = 92.891066
    touristName = "shaktiman"
} | ConvertTo-Json

try {
    $geoResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/geofencing/check-location" -Method POST -Body $testBody -ContentType "application/json"
    $result = ($geoResponse.Content | ConvertFrom-Json).data
    
    if ($result.isInZone -and $result.alert_required) {
        Write-Output "   ✅ Geofencing working - Alert required for high-risk zone"
    } else {
        Write-Output "   ⚠️ Geofencing not detecting high-risk zone"
    }
} catch {
    Write-Output "   ❌ Geofencing API error: $($_.Exception.Message)"
}

# 4. Check alert history
Write-Output "`n4️⃣ ALERT HISTORY CHECK"
try {
    $alerts = Invoke-WebRequest -Uri "http://localhost:5000/api/geofencing/alert-history" -Method GET -ContentType "application/json"
    $alertData = ($alerts.Content | ConvertFrom-Json).data
    Write-Output "   📋 Total alerts: $($alertData.Count)"
    
    if ($alertData.Count -gt 0) {
        $recent = $alertData[0]
        Write-Output "   🕐 Latest alert: $($recent.touristName) at $(([DateTime]$recent.timestamp).ToString('HH:mm:ss'))"
    }
} catch {
    Write-Output "   ❌ Cannot check alert history: $($_.Exception.Message)"
}

# 5. Check tourist data
Write-Output "`n5️⃣ TOURIST DATA CHECK"
$loginBody = @{ username = "admin"; password = "admin123" } | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = ($loginResponse.Content | ConvertFrom-Json).token
    
    $headers = @{ "Authorization" = "Bearer $token" }
    $touristResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/tourists" -Method GET -Headers $headers
    $tourists = ($touristResponse.Content | ConvertFrom-Json).tourists
    
    Write-Output "   👥 Total active tourists: $($tourists.Count)"
    
    foreach ($tourist in $tourists) {
        $risk = if ($tourist.latitude -and $tourist.longitude) {
            # Quick distance check to high-risk zone center (26.3978, 92.5298)
            $distance = [Math]::Sqrt([Math]::Pow($tourist.latitude - 26.3978, 2) + [Math]::Pow($tourist.longitude - 92.5298, 2)) * 111000
            if ($distance -lt 50000) { "🟡 HIGH RISK" } else { "🟢 SAFE" }
        } else { "❓ NO LOCATION" }
        
        Write-Output "   • $($tourist.name) (ID: $($tourist.blockchainId)) - $risk"
    }
} catch {
    Write-Output "   ❌ Cannot check tourist data: $($_.Exception.Message)"
}

Write-Output "`n🌟 WHAT TO CHECK IN BROWSER:"
Write-Output "=============================="
Write-Output "1. Open: http://localhost:3000"
Write-Output "2. Login: admin / admin123"
Write-Output "3. Go to 'Admin Risk Zones' page"
Write-Output "4. Look for:"
Write-Output "   • Tourist markers (colored circles) on the map"
Write-Output "   • 'Tourists (3)' in the map legend"
Write-Output "   • 'Live' indicator (green) showing WebSocket connection"
Write-Output "   • Toggle buttons: 'Show/Hide Tourists'"
Write-Output ""
Write-Output "5. Click on orange tourist markers to see popup info"
Write-Output "6. Check browser console (F12) for any errors"
Write-Output ""
Write-Output "🔄 If changes not visible:"
Write-Output "• Hard refresh: Ctrl+F5 (Chrome/Firefox)"
Write-Output "• Clear browser cache"
Write-Output "• Check browser console for errors"