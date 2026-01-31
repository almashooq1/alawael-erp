# 🧪 ML API Testing Guide

Complete testing guide for Phase 8 Enhanced Machine Learning API

---

## 📋 Prerequisites

```bash
# Start server
cd intelligent-agent
node dist/backend/app.js
```

Server should be running on: `http://localhost:3001`

---

## 🎯 API Endpoints

### Base URL

```
http://localhost:3001/api/ml
```

### Available Endpoints

1. **POST** `/classify` - Enhanced risk classification
2. **POST** `/predict/delay` - Advanced delay prediction
3. **POST** `/predict/batch` - Batch predictions
4. **POST** `/train` - Train ML model
5. **GET** `/metrics` - Model performance metrics
6. **POST** `/analyze/complete` - Complete ML analysis
7. **GET** `/health` - ML service health check
8. **POST** `/explain` - Explain prediction
9. **POST** `/compare` - Compare multiple processes
10. **POST** `/optimize` - Get optimization recommendations

---

## 🧪 Test Cases

### 1. Health Check ✅

**Request:**

```bash
curl http://localhost:3001/api/ml/health
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "service": "ML Service",
    "status": "operational",
    "version": "2.0.0",
    "features": [
      "deep_learning",
      "risk_classification",
      "delay_prediction",
      "bottleneck_detection",
      "batch_processing",
      "model_training"
    ],
    "timestamp": "2026-01-30T..."
  }
}
```

---

### 2. Enhanced Risk Classification 🎯

**Request:**

```bash
curl -X POST http://localhost:3001/api/ml/classify \
  -H "Content-Type: application/json" \
  -d '{
    "process": {
      "name": "تطوير منتج جديد",
      "status": "active",
      "steps": [
        {
          "id": "step1",
          "name": "دراسة السوق",
          "type": "manual",
          "status": "done",
          "dueDate": "2026-01-15"
        },
        {
          "id": "step2",
          "name": "تصميم المنتج",
          "type": "manual",
          "status": "in_progress",
          "dueDate": "2026-01-25",
          "actions": [{"label": "مراجعة", "type": "review"}]
        },
        {
          "id": "step3",
          "name": "موافقة الإدارة",
          "type": "approval",
          "status": "pending",
          "dueDate": "2026-02-01"
        },
        {
          "id": "step4",
          "name": "التطوير",
          "type": "automated",
          "status": "pending",
          "dueDate": "2026-02-15"
        }
      ],
      "createdAt": "2026-01-10",
      "updatedAt": "2026-01-30"
    }
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "risk": "medium",
    "confidence": 0.87,
    "probability": 0.5,
    "patterns": ["active_execution", "high_approval_dependency"],
    "features": {
      "totalSteps": 4,
      "completedSteps": 1,
      "pendingSteps": 2,
      "inProgressSteps": 1,
      "completionRatio": 0.25,
      "avgStepDuration": 1728000000,
      "delayedSteps": 0,
      "criticalSteps": 1,
      "complexity": 0.25,
      "velocity": 0.05
    },
    "explanation": "المخاطر: متوسطة. معدل الإنجاز: 25.0%.",
    "recommendations": ["✅ تسريع عمليات الموافقات - نقطة اختناق محتملة"]
  },
  "message": "Classification completed successfully"
}
```

---

### 3. Advanced Delay Prediction 📊

**Request:**

```bash
curl -X POST http://localhost:3001/api/ml/predict/delay \
  -H "Content-Type: application/json" \
  -d '{
    "process": {
      "name": "عملية تجريبية",
      "status": "active",
      "steps": [
        {"id": "1", "name": "خطوة 1", "type": "manual", "status": "done", "dueDate": "2026-01-01"},
        {"id": "2", "name": "خطوة 2", "type": "manual", "status": "in_progress", "dueDate": "2026-01-20"},
        {"id": "3", "name": "خطوة 3", "type": "approval", "status": "pending", "dueDate": "2026-02-01"}
      ],
      "createdAt": "2025-12-25",
      "updatedAt": "2026-01-30"
    }
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "delayProbability": 0.33,
    "estimatedCompletionDate": "2026-02-15T...",
    "bottlenecks": [
      {
        "stepId": "2",
        "stepName": "خطوة 2",
        "severity": "medium",
        "estimatedDelay": 10,
        "causes": []
      }
    ],
    "criticalPath": ["2", "3"],
    "resourceNeeds": [
      {
        "resourceType": "human",
        "currentUtilization": 0.33,
        "predictedNeed": 0.6,
        "availability": 0.7,
        "recommendation": "الموارد كافية"
      }
    ],
    "risks": [
      {
        "riskType": "delay",
        "probability": 0.33,
        "impact": "medium",
        "mitigation": ["إعادة جدولة المهام", "زيادة الموارد"]
      }
    ],
    "confidence": 0.85
  },
  "message": "Delay prediction completed"
}
```

---

### 4. Complete Analysis 🔬

**Request:**

```bash
curl -X POST http://localhost:3001/api/ml/analyze/complete \
  -H "Content-Type: application/json" \
  -d '{
    "process": {
      "name": "مشروع كبير",
      "status": "active",
      "steps": [
        {"id": "1", "name": "التخطيط", "type": "manual", "status": "done"},
        {"id": "2", "name": "التنفيذ", "type": "manual", "status": "in_progress"},
        {"id": "3", "name": "المراجعة", "type": "approval", "status": "pending"}
      ],
      "createdAt": "2026-01-01",
      "updatedAt": "2026-01-30"
    }
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "classification": { "risk": "medium", "confidence": 0.85, ... },
    "delayPrediction": { "delayProbability": 0.3, ... },
    "summary": {
      "overallRisk": "medium",
      "delayProbability": 0.3,
      "confidence": 0.85,
      "estimatedCompletion": "2026-02-15T...",
      "criticalIssues": 0,
      "recommendations": ["✅ تسريع عمليات الموافقات"]
    }
  },
  "message": "Complete analysis finished"
}
```

---

### 5. Batch Predictions 📦

**Request:**

```bash
curl -X POST http://localhost:3001/api/ml/predict/batch \
  -H "Content-Type: application/json" \
  -d '{
    "processes": [
      {
        "name": "عملية 1",
        "status": "active",
        "steps": [
          {"id": "1", "name": "خطوة", "type": "manual", "status": "done"}
        ],
        "createdAt": "2026-01-01",
        "updatedAt": "2026-01-30"
      },
      {
        "name": "عملية 2",
        "status": "active",
        "steps": [
          {"id": "1", "name": "خطوة", "type": "manual", "status": "pending"}
        ],
        "createdAt": "2026-01-01",
        "updatedAt": "2026-01-30"
      }
    ]
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "count": 2,
    "predictions": [
      { "risk": "low", "confidence": 0.9, ... },
      { "risk": "medium", "confidence": 0.85, ... }
    ]
  },
  "message": "Batch prediction completed for 2 processes"
}
```

---

### 6. Model Training 🎓

**Request:**

```bash
curl -X POST http://localhost:3001/api/ml/train \
  -H "Content-Type: application/json" \
  -d '{
    "historicalProcesses": [
      {
        "name": "عملية تاريخية 1",
        "status": "completed",
        "steps": [
          {"id": "1", "name": "خطوة", "type": "manual", "status": "done"}
        ],
        "createdAt": "2025-12-01",
        "updatedAt": "2025-12-15"
      },
      {
        "name": "عملية تاريخية 2",
        "status": "completed",
        "steps": [
          {"id": "1", "name": "خطوة", "type": "manual", "status": "done"}
        ],
        "createdAt": "2025-12-01",
        "updatedAt": "2025-12-20"
      }
    ]
  }'
```

**Note:** Minimum 10 processes required for training

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "modelId": "model_1738262400000",
    "accuracy": 0.92,
    "trainingTime": 2543
  },
  "message": "Model trained successfully with 10 samples"
}
```

---

### 7. Get Model Metrics 📈

**Request:**

```bash
curl http://localhost:3001/api/ml/metrics
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "accuracy": 0.92,
    "precision": 0.89,
    "recall": 0.87,
    "f1Score": 0.88
  },
  "message": "Metrics retrieved successfully"
}
```

---

### 8. Explain Prediction 💡

**Request:**

```bash
curl -X POST http://localhost:3001/api/ml/explain \
  -H "Content-Type: application/json" \
  -d '{
    "process": {
      "name": "عملية معقدة",
      "status": "active",
      "steps": [
        {"id": "1", "name": "خطوة 1", "type": "manual", "status": "done"},
        {"id": "2", "name": "خطوة 2", "type": "manual", "status": "in_progress", "dueDate": "2026-01-20"},
        {"id": "3", "name": "خطوة 3", "type": "approval", "status": "pending"}
      ],
      "createdAt": "2026-01-01",
      "updatedAt": "2026-01-30"
    }
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "prediction": "medium",
    "confidence": 0.85,
    "explanation": "المخاطر: متوسطة. السرعة بطيئة (0.03 خطوات/يوم). معدل الإنجاز: 33.3%.",
    "features": { ... },
    "patterns": ["slow_progress", "active_execution"],
    "recommendations": ["⚡ زيادة السرعة: خصص المزيد من الموارد"],
    "featureImportance": {
      "completionRatio": 0.1,
      "delayedSteps": 0.083,
      "velocity": 0.0006,
      "complexity": 0,
      "criticalSteps": 0.033
    }
  },
  "message": "Explanation generated"
}
```

---

### 9. Compare Processes ⚖️

**Request:**

```bash
curl -X POST http://localhost:3001/api/ml/compare \
  -H "Content-Type: application/json" \
  -d '{
    "processes": [
      {
        "name": "عملية A",
        "status": "active",
        "steps": [{"id": "1", "name": "خطوة", "type": "manual", "status": "done"}],
        "createdAt": "2026-01-01",
        "updatedAt": "2026-01-30"
      },
      {
        "name": "عملية B",
        "status": "active",
        "steps": [
          {"id": "1", "name": "خطوة 1", "type": "manual", "status": "pending"},
          {"id": "2", "name": "خطوة 2", "type": "approval", "status": "pending"}
        ],
        "createdAt": "2026-01-01",
        "updatedAt": "2026-01-30"
      }
    ]
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "analyses": [
      { "risk": "medium", ... },
      { "risk": "low", ... }
    ],
    "statistics": {
      "totalProcesses": 2,
      "highRisk": 0,
      "mediumRisk": 1,
      "lowRisk": 1,
      "avgConfidence": 0.875,
      "avgCompletionRatio": 0.75
    },
    "recommendations": ["✅ ثقة عالية في التوقعات"]
  },
  "message": "Compared 2 processes"
}
```

---

### 10. Optimization Recommendations 🚀

**Request:**

```bash
curl -X POST http://localhost:3001/api/ml/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "process": {
      "name": "عملية تحتاج تحسين",
      "status": "active",
      "steps": [
        {"id": "1", "name": "خطوة 1", "type": "manual", "status": "done"},
        {"id": "2", "name": "خطوة 2", "type": "manual", "status": "in_progress", "dueDate": "2026-01-15"},
        {"id": "3", "name": "موافقة", "type": "approval", "status": "pending"},
        {"id": "4", "name": "خطوة 4", "type": "manual", "status": "pending"}
      ],
      "createdAt": "2026-01-01",
      "updatedAt": "2026-01-30"
    }
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "priority": "high",
    "actions": [
      "⏰ حدد أسباب التأخير وقم بالتصعيد إذا لزم الأمر",
      "⚡ زيادة السرعة: خصص المزيد من الموارد",
      "✅ تسريع عمليات الموافقات",
      "إعادة جدولة المهام"
    ],
    "quickWins": [
      "حل 1 اختناقات محددة",
      "تسريع 1 موافقات",
      "زيادة سرعة التنفيذ"
    ],
    "longTerm": [
      "تحسين عمليات الموافقات",
      "أتمتة المهام المتكررة",
      "بناء قاعدة معرفة",
      "تدريب الفريق"
    ],
    "estimatedImpact": {
      "timeReduction": "8%",
      "riskReduction": "medium",
      "costSavings": "متوسطة إلى عالية"
    }
  },
  "message": "Optimization plan generated"
}
```

---

## 🔥 PowerShell Testing Script

Save as `test-ml-api.ps1`:

```powershell
# ML API Testing Script
$baseUrl = "http://localhost:3001/api/ml"

# 1. Health Check
Write-Host "Testing Health Check..." -ForegroundColor Cyan
Invoke-RestMethod -Uri "$baseUrl/health" -Method GET | ConvertTo-Json -Depth 10

# 2. Simple Classification
Write-Host "`nTesting Classification..." -ForegroundColor Cyan
$process = @{
  process = @{
    name = "عملية اختبار"
    status = "active"
    steps = @(
      @{id="1"; name="خطوة 1"; type="manual"; status="done"}
      @{id="2"; name="خطوة 2"; type="manual"; status="in_progress"}
    )
    createdAt = "2026-01-01"
    updatedAt = "2026-01-30"
  }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "$baseUrl/classify" -Method POST -Body $process -ContentType "application/json" | ConvertTo-Json -Depth 10

# 3. Get Metrics
Write-Host "`nTesting Metrics..." -ForegroundColor Cyan
Invoke-RestMethod -Uri "$baseUrl/metrics" -Method GET | ConvertTo-Json -Depth 10

Write-Host "`n✅ All tests completed!" -ForegroundColor Green
```

**Run:**

```powershell
.\test-ml-api.ps1
```

---

## 📊 Expected Performance

- **Classification Time:** < 50ms
- **Prediction Time:** < 100ms
- **Batch Processing:** < 500ms for 10 processes
- **Training Time:** 2-5 seconds for 100 samples

---

## ✅ Success Criteria

- [x] All endpoints return 200 status
- [x] ML service health check passes
- [x] Classification provides confidence scores
- [x] Predictions include bottleneck analysis
- [x] Explanations are in Arabic
- [x] Recommendations are actionable
- [x] Feature importance calculated
- [x] Batch processing works

---

## 🐛 Common Issues

### Issue: "Model not initialized"

**Solution:** Service initializes models on first request. Wait 2-3 seconds
after server start.

### Issue: "Invalid process data"

**Solution:** Ensure `steps` array is not empty and has required fields.

### Issue: "Training failed"

**Solution:** Provide at least 10 historical processes.

---

## 📈 Next Steps

1. ✅ Test all 10 endpoints
2. 🔄 Add real-time WebSocket updates
3. 🔄 Create ML dashboard
4. 🔄 Add automated model retraining
5. 🔄 Implement SHAP explanations

---

**Documentation Complete!** 🎉
