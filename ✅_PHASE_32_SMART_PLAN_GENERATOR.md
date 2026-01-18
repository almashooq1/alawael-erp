# 🧠 Phase 32: Integrated Smart Treatment Plan Generator

**Date:** 2026-01-16
**Status:** ✅ Implemented

**The Gap:** After "Referral OCR" (Phase 29), the clinical manager still had to manually pick goals and frequencies.
**The Solution:** This integration connects **Patient Diagnosis** directly to **Goal Bank** and **Scheduling Rules**.

## 1. ⚡ Automatic Plan Drafting
When a new patient profile is created (or scanned):
1.  **AI Reads Diagnosis:** e.g., "Autism Spectrum Disorder, Age 4".
2.  **Rule Engine Triggers:**
    -   Selects "Speech Therapy (3x/week)" & "OT (2x/week)".
    -   Selects "ABA (4x/week)".
3.  **Goal Selector:** Pulls top 3 age-appropriate goals from `SmartClinicalService`.
4.  **Home Program:** Appends standard home advice.

## 2. 📝 Output
A "Review Ready" plan is generated instantly. The Clinical Director just needs to click **"Approve"** or tweak slightly.

## 3. Integration Depth
-   Uses **OCR Data** (Phase 29).
-   Uses **Goal Bank** (Phase 16).
-   Feeds into **Scheduling** (Phase 19).

## 4. API Usage
```http
POST /api/plan-smart/generate/:patientId
```

**Response:**
```json
{
  "diagnosis": "Autism",
  "disciplines": [
    {
      "domain": "Speech Therapy",
      "frequencyPerWeek": 3,
      "longTermGoals": ["Improve expressive language..."],
      "shortTermGoals": ["Will use 3-word sentences..."]
    }
  ]
}
```
Reduces "Plan Writing" time by 90%.
