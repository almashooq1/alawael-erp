# 📉 Phase 27: AI Patient Retention & Churn Prediction

**Date:** 2026-01-16
**Status:** ✅ Implemented

Acquiring a new patient costs 5x more than retaining an existing one.
We have implemented a **"Business Health Engine"** that predicts who is about to leave.

## 1. 🔮 Churn Risk Algorithm

The `SmartRetentionService` calculates a `Risk Score (0-100)` for every active patient based on 3 signals:

1.  **Attendance Signal:** Has the patient been absent for >14 days? Or cancelling frequent sessions (>50%)?
2.  **Satisfaction Signal (NPS):** Did the parent recently give a low rating?
3.  **Clinical Signal:** Has the therapy plan stalled (no goal updates) for >45 days?

## 2. 🚦 Risk Levels

- **CRITICAL (75-100):** Patient is extremely likely to drop out. Immediate call required.
- **HIGH (50-74):** Warning signs detected.
- **MODERATE (25-49):** Watch list.
- **LOW (0-24):** Healthy engagement.

## 3. 🛡️ Care Manager Action

- The system provides a **"Risk Report"** sorted by urgency.
- Managers can proactively call the "Critical" cases to offer solutions (Rescheduling, Therapist Change, Discount).

## 4. API Usage

### Scan All Patients

```http
POST /api/retention-smart/run-scan
```

**Response:**

```json
{
  "count": 3,
  "data": [
    {
      "patient": { "firstName": "Omar" },
      "risk": {
        "score": 80,
        "level": "CRITICAL",
        "reasons": ["Absent for 20 days", "Low Satisfaction (Detractor)"]
      }
    }
  ]
}
```

This turns the Operational Team from "Reactive" (Wait for cancellations) to "Proactive" (Prevent them).
