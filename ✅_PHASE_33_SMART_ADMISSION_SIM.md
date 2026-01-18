# 🔮 Phase 33: Strategic Admission Simulator (The "What If" Engine)

**Date:** 2026-01-16
**Status:** ✅ Implemented

**The Problem:** Management often accepts new patients without knowing if they have enough staff or rooms, causing "Waitlist Bloat" or "Burnout".
**The Solution:** A simulation engine that checks all operational constraints _before_ providing an answer.

## 1. 🎲 Scenario Planning

The CEO asks: _"Can we sign a contract with a new school to treat 10 students?"_
The System checks:

1.  **Room Availability** (Phase 31 Inventory/Room Inventory).
2.  **Therapist Slots** (Phase 28/19 Logic).
3.  **Revenue Projection** (Phase 18 Smart Billing).

## 2. 🚦 Traffic Light Output

- **GREEN:** "Yes, we have space. Expected Revenue: $15,000/mo."
- **RED:** "STOP. You need 2 more Speech Therapists first. Current Capacity: -15 slots."

## 3. API Usage

```http
POST /api/admission-smart/simulate
{
  "count": 10,
  "discipline": "SPEECH",
  "neededSessionsPerWeek": 2
}
```

**Response:**

```json
{
  "recommendation": "STOP. Need to hire 2 more SPEECH therapist(s) first.",
  "capacityAnalysis": {
    "currentAvailableSlots": 10,
    "requiredSlots": 20,
    "status": "OVERLOAD"
  }
}
```

This is true **Business Intelligence**, preventing operational crashes.
