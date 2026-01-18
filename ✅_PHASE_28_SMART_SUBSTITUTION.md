# 🔄 Phase 28: Intelligent Staff Substitution

**Date:** 2026-01-16
**Status:** ✅ Implemented

Operational chaos happens when a therapist calls in sick at 8:00 AM.
The **Smart Substitution Service** prevents cancellation of appointments by finding the perfect backup instantly.

## 1. 🕵️‍♂️ Matching Algorithm

It scores potential replacements based on:

1.  **Specialty Match:** Must match the absentee's field (e.g., Speech Therapy).
2.  **Availability:** Checks calendar for slot conflicts (overlap).
3.  **Continuity of Care (+10 pts):** Prioritizes therapists who _already know_ the patient.
4.  **Workload Balancing (+5 pts):** Favors staff who have a lighter schedule that day, avoiding burnout.

## 2. ⚡ Use Case

Receptionist clicks "Find Cover" for a session:

1.  System scans 20 therapists.
2.  Filters out 15 (Busy or Wrong Specialty).
3.  Scores relevant 5.
4.  Returns: _"Dr. Sarah is the best match (Score 15) - She treated this child last month."_

## 3. API Usage

```http
POST /api/substitution-smart/find
{
  "originalTherapistId": "65f...",
  "date": "2026-01-20",
  "startTime": "10:00",
  "patientId": "65a..."
}
```

**Response:**

```json
{
  "candidates": [
    {
      "therapist": { "name": "Dr. Sarah" },
      "score": 15,
      "reasons": ["Has treated patient 3 times", "Light schedule today"]
    },
    {
      "therapist": { "name": "Dr. Ahmed" },
      "score": 0,
      "reasons": []
    }
  ]
}
```

This transforms a "Cancellation Crisis" into a smooth "Provider Swap".
