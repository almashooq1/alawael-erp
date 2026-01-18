# ✅ Phases 75 & 76: The "Human Element"

## 🚀 Overview

Development has now pivoted to the most critical assets of the center: **The Staff** (Phase 75) and **The Patient Experience** (Phase 76).

---

## 👥 Phase 75: Smart Staff Roster & Optimization

**Goal:** Prevent burnout and optimize coverage using AI, rather than manual Excel sheets.

### Key Features

- **AI Schedule Generator:** `POST /api/roster-smart/generate`
  - Creates fair, balanced shifts that consider:
    - Staff skills (e.g., "Need at least one Senior OT on floor").
    - Patient Volume Predictions (from Phase 1).
    - Legal labor limits.
- **Burnout Detector:** `GET /api/roster-smart/fatigue`
  - Flags risk factors like "Back-to-back double shifts" or "7 consecutive workdays".
  - Protects staff wellbeing proactively.
- **"Gig" Shift Picking:**
  - Allows staff to grab open shifts for extra pay (Future UI Feature).

### Architecture

- **Service:** `backend/services/smartRoster.service.js`
- **Routes:** `backend/routes/roster_smart.routes.js`

---

## 🛤️ Phase 76: Patient Journey & Experience Analytics (PX)

**Goal:** Treat the "Patient Experience" as a product to be optimized.

### Key Features

- **Journey Timeline Visualization:** `GET /api/journey-smart/timeline/:id`
  - Maps the entire lifecycle: Referral -> Assessment -> Waitlist -> Treatment -> Discharge.
  - Highlights "Bottlenecks" where the patient gets stuck (e.g., "Waiting 14 days for insurance approval").
- **Churn/Drop-off Analysis:** `GET /api/journey-smart/churn-analysis`
  - Answers: _"Why do we lose 15% of patients after the assessment?"_
  - Identifies systemic issues (Price, Parking, Attitude) causing patient loss.
- **Live Sentiment Pulse:**
  - Real-time "Happiness Output" from surveys and app feedback.

### Architecture

- **Service:** `backend/services/smartJourney.service.js`
- **Routes:** `backend/routes/journey_smart.routes.js`

---

## 💡 Strategic Value

- **Phase 75** keeps the team happy and compliant.
- **Phase 76** keeps the customers loyal and revenue flowing.
