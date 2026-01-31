# 🧪 Complete ML API Testing Script
# Tests all 10 ML endpoints with real data

$baseUrl = "http://localhost:3001/api/ml"
$ErrorActionPreference = "Continue"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🤖 ML API Complete Testing Suite" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test data
$testProcess = @{
    process = @{
        name = "تطوير منتج جديد"
        description = "عملية تطوير منتج تقني متكامل"
        status = "active"
        steps = @(
            @{
                id = "step1"
                name = "دراسة السوق"
                type = "manual"
                status = "done"
                assignee = "أحمد محمد"
                dueDate = "2026-01-15T00:00:00.000Z"
                actions = @(
                    @{label = "تحليل المنافسين"; type = "research"}
                )
            }
            @{
                id = "step2"
                name = "تصميم المنتج"
                type = "manual"
                status = "in_progress"
                assignee = "فاطمة علي"
                dueDate = "2026-01-20T00:00:00.000Z"
                actions = @(
                    @{label = "إنشاء النماذج"; type = "design"}
                    @{label = "مراجعة التصميم"; type = "review"}
                )
            }
            @{
                id = "step3"
                name = "موافقة الإدارة"
                type = "approval"
                status = "pending"
                dueDate = "2026-02-01T00:00:00.000Z"
            }
            @{
                id = "step4"
                name = "تطوير البرمجيات"
                type = "automated"
                status = "pending"
                dueDate = "2026-02-15T00:00:00.000Z"
                actions = @(
                    @{label = "كتابة الكود"; type = "development"}
                    @{label = "اختبار الوحدة"; type = "testing"}
                )
            }
            @{
                id = "step5"
                name = "الاختبار النهائي"
                type = "manual"
                status = "pending"
                dueDate = "2026-02-28T00:00:00.000Z"
            }
        )
        createdAt = "2026-01-10T00:00:00.000Z"
        updatedAt = "2026-01-30T00:00:00.000Z"
    }
} | ConvertTo-Json -Depth 10

$testProcess2 = @{
    process = @{
        name = "عملية بسيطة"
        status = "active"
        steps = @(
            @{id = "1"; name = "خطوة 1"; type = "manual"; status = "done"}
            @{id = "2"; name = "خطوة 2"; type = "manual"; status = "done"}
        )
        createdAt = "2026-01-25T00:00:00.000Z"
        updatedAt = "2026-01-30T00:00:00.000Z"
    }
} | ConvertTo-Json -Depth 10

$batchProcesses = @{
    processes = @(
        @{
            name = "عملية A"
            status = "active"
            steps = @(@{id = "1"; name = "خطوة"; type = "manual"; status = "done"})
            createdAt = "2026-01-01T00:00:00.000Z"
            updatedAt = "2026-01-30T00:00:00.000Z"
        }
        @{
            name = "عملية B"
            status = "active"
            steps = @(
                @{id = "1"; name = "خطوة 1"; type = "manual"; status = "pending"}
                @{id = "2"; name = "خطوة 2"; type = "approval"; status = "pending"}
            )
            createdAt = "2026-01-01T00:00:00.000Z"
            updatedAt = "2026-01-30T00:00:00.000Z"
        }
        @{
            name = "عملية C"
            status = "active"
            steps = @(
                @{id = "1"; name = "خطوة 1"; type = "manual"; status = "in_progress"; dueDate = "2026-01-15T00:00:00.000Z"}
                @{id = "2"; name = "خطوة 2"; type = "manual"; status = "pending"}
                @{id = "3"; name = "خطوة 3"; type = "approval"; status = "pending"}
            )
            createdAt = "2026-01-01T00:00:00.000Z"
            updatedAt = "2026-01-30T00:00:00.000Z"
        }
    )
} | ConvertTo-Json -Depth 10

$testResults = @()
$passCount = 0
$failCount = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [string]$Body = $null
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    $startTime = Get-Date
    
    try {
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri "$baseUrl$Endpoint" -Method GET -ErrorAction Stop
        } else {
            $response = Invoke-RestMethod -Uri "$baseUrl$Endpoint" -Method POST -Body $Body -ContentType "application/json" -ErrorAction Stop
        }
        
        $duration = (Get-Date) - $startTime
        $durationMs = [math]::Round($duration.TotalMilliseconds, 2)
        
        Write-Host "✅ PASSED" -ForegroundColor Green
        Write-Host "   Response Time: ${durationMs}ms" -ForegroundColor Gray
        Write-Host "   Success: $($response.success)" -ForegroundColor Gray
        
        if ($response.message) {
            Write-Host "   Message: $($response.message)" -ForegroundColor Gray
        }
        
        $script:passCount++
        $script:testResults += @{
            Name = $Name
            Status = "PASSED"
            Duration = "${durationMs}ms"
            Success = $response.success
        }
        
        return $response
    }
    catch {
        $duration = (Get-Date) - $startTime
        $durationMs = [math]::Round($duration.TotalMilliseconds, 2)
        
        Write-Host "❌ FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        
        $script:failCount++
        $script:testResults += @{
            Name = $Name
            Status = "FAILED"
            Duration = "${durationMs}ms"
            Error = $_.Exception.Message
        }
        
        return $null
    }
    finally {
        Write-Host ""
    }
}

# Test 1: Health Check
$health = Test-Endpoint -Name "1. Health Check" -Method "GET" -Endpoint "/health"

# Test 2: Metrics
$metrics = Test-Endpoint -Name "2. Model Metrics" -Method "GET" -Endpoint "/metrics"

# Test 3: Risk Classification
$classification = Test-Endpoint -Name "3. Risk Classification" -Method "POST" -Endpoint "/classify" -Body $testProcess

if ($classification) {
    Write-Host "   📊 Risk: $($classification.data.risk)" -ForegroundColor Cyan
    Write-Host "   📈 Confidence: $([math]::Round($classification.data.confidence * 100, 1))%" -ForegroundColor Cyan
    Write-Host "   💡 Patterns: $($classification.data.patterns -join ', ')" -ForegroundColor Cyan
    Write-Host ""
}

# Test 4: Delay Prediction
$delayPrediction = Test-Endpoint -Name "4. Delay Prediction" -Method "POST" -Endpoint "/predict/delay" -Body $testProcess

if ($delayPrediction) {
    Write-Host "   ⏰ Delay Probability: $([math]::Round($delayPrediction.data.delayProbability * 100, 1))%" -ForegroundColor Cyan
    Write-Host "   📅 Estimated Completion: $($delayPrediction.data.estimatedCompletionDate)" -ForegroundColor Cyan
    Write-Host "   🚧 Bottlenecks: $($delayPrediction.data.bottlenecks.Count)" -ForegroundColor Cyan
    Write-Host ""
}

# Test 5: Complete Analysis
$completeAnalysis = Test-Endpoint -Name "5. Complete Analysis" -Method "POST" -Endpoint "/analyze/complete" -Body $testProcess

if ($completeAnalysis) {
    Write-Host "   🎯 Overall Risk: $($completeAnalysis.data.summary.overallRisk)" -ForegroundColor Cyan
    Write-Host "   ⚠️ Critical Issues: $($completeAnalysis.data.summary.criticalIssues)" -ForegroundColor Cyan
    Write-Host ""
}

# Test 6: Explanation
$explanation = Test-Endpoint -Name "6. Explain Prediction" -Method "POST" -Endpoint "/explain" -Body $testProcess

if ($explanation) {
    Write-Host "   📝 Explanation: $($explanation.data.explanation)" -ForegroundColor Cyan
    Write-Host "   🔑 Top Feature: completionRatio ($([math]::Round($explanation.data.featureImportance.completionRatio, 3)))" -ForegroundColor Cyan
    Write-Host ""
}

# Test 7: Batch Prediction
$batchResult = Test-Endpoint -Name "7. Batch Prediction" -Method "POST" -Endpoint "/predict/batch" -Body $batchProcesses

if ($batchResult) {
    Write-Host "   📦 Processes Analyzed: $($batchResult.data.count)" -ForegroundColor Cyan
    Write-Host ""
}

# Test 8: Compare Processes
$comparison = Test-Endpoint -Name "8. Compare Processes" -Method "POST" -Endpoint "/compare" -Body $batchProcesses

if ($comparison) {
    Write-Host "   ⚖️ High Risk: $($comparison.data.statistics.highRisk)" -ForegroundColor Cyan
    Write-Host "   ⚖️ Medium Risk: $($comparison.data.statistics.mediumRisk)" -ForegroundColor Cyan
    Write-Host "   ⚖️ Low Risk: $($comparison.data.statistics.lowRisk)" -ForegroundColor Cyan
    Write-Host "   📊 Avg Confidence: $([math]::Round($comparison.data.statistics.avgConfidence * 100, 1))%" -ForegroundColor Cyan
    Write-Host ""
}

# Test 9: Optimization
$optimization = Test-Endpoint -Name "9. Optimization Plan" -Method "POST" -Endpoint "/optimize" -Body $testProcess

if ($optimization) {
    Write-Host "   🚀 Priority: $($optimization.data.priority)" -ForegroundColor Cyan
    Write-Host "   ⚡ Quick Wins: $($optimization.data.quickWins.Count)" -ForegroundColor Cyan
    Write-Host "   📈 Time Reduction: $($optimization.data.estimatedImpact.timeReduction)" -ForegroundColor Cyan
    Write-Host ""
}

# Test 10: Training (with minimal data - will expect error or success)
$trainingData = @{
    historicalProcesses = @(
        1..12 | ForEach-Object {
            @{
                name = "عملية تاريخية $_"
                status = "completed"
                steps = @(
                    @{id = "1"; name = "خطوة"; type = "manual"; status = "done"}
                )
                createdAt = "2025-12-01T00:00:00.000Z"
                updatedAt = "2025-12-15T00:00:00.000Z"
            }
        }
    )
} | ConvertTo-Json -Depth 10

$training = Test-Endpoint -Name "10. Model Training" -Method "POST" -Endpoint "/train" -Body $trainingData

if ($training) {
    Write-Host "   🎓 Model ID: $($training.data.modelId)" -ForegroundColor Cyan
    Write-Host "   📊 Accuracy: $([math]::Round($training.data.accuracy * 100, 1))%" -ForegroundColor Cyan
    Write-Host "   ⏱️ Training Time: $($training.data.trainingTime)ms" -ForegroundColor Cyan
    Write-Host ""
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Total Tests: $($passCount + $failCount)" -ForegroundColor White
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red

$successRate = if (($passCount + $failCount) -gt 0) { 
    [math]::Round(($passCount / ($passCount + $failCount)) * 100, 1) 
} else { 
    0 
}

Write-Host "`nSuccess Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 90) { "Green" } elseif ($successRate -ge 70) { "Yellow" } else { "Red" })

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ Testing Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

# Detailed results
Write-Host "Detailed Results:" -ForegroundColor Cyan
$testResults | ForEach-Object {
    $status = if ($_.Status -eq "PASSED") { "✅" } else { "❌" }
    Write-Host "  $status $($_.Name) - $($_.Duration)" -ForegroundColor $(if ($_.Status -eq "PASSED") { "Green" } else { "Red" })
}

Write-Host "`nServer: http://localhost:3001" -ForegroundColor Gray
Write-Host "ML API: http://localhost:3001/api/ml" -ForegroundColor Gray
