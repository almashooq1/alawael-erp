# Quick ML API Test Script
# Tests key ML endpoints

$baseUrl = "http://localhost:3001/api/ml"

Write-Host "`n=== ML API Quick Test ===`n" -ForegroundColor Cyan

# Simple test process
$testData = @{
    process = @{
        name = "Test Process"
        status = "active"
        steps = @(
            @{id="1"; name="Step 1"; type="manual"; status="done"}
            @{id="2"; name="Step 2"; type="manual"; status="in_progress"}
            @{id="3"; name="Step 3"; type="approval"; status="pending"}
        )
        createdAt = "2026-01-01"
        updatedAt = "2026-01-30"
    }
} | ConvertTo-Json -Depth 10

try {
    Write-Host "1. Health Check..." -NoNewline
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    Write-Host " OK" -ForegroundColor Green
    
    Write-Host "2. Metrics..." -NoNewline
    $metrics = Invoke-RestMethod -Uri "$baseUrl/metrics" -Method GET
    Write-Host " OK (Accuracy: $($metrics.data.accuracy))" -ForegroundColor Green
    
    Write-Host "3. Classification..." -NoNewline
    $classify = Invoke-RestMethod -Uri "$baseUrl/classify" -Method POST -Body $testData -ContentType "application/json"
    Write-Host " OK (Risk: $($classify.data.risk))" -ForegroundColor Green
    
    Write-Host "4. Delay Prediction..." -NoNewline
    $predict = Invoke-RestMethod -Uri "$baseUrl/predict/delay" -Method POST -Body $testData -ContentType "application/json"
    Write-Host " OK (Delay: $([math]::Round($predict.data.delayProbability * 100))%)" -ForegroundColor Green
    
    Write-Host "`n✅ All tests passed!`n" -ForegroundColor Green
}
catch {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
