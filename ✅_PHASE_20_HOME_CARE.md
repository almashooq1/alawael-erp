# 🏠 Phase 20: Smart Home Care & Family Engagement

**Date:** 2026-01-16
**Status:** ✅ Implemented

We have extended the care beyond the clinic walls.
Rehabilitation success depends 70% on what happens at home. This module ensures home continuity.

## 1. 📋 Home Assignments

Therapists can now prescribe "Digital Homework":

- **Structure:** Title, Description, Video URL, Frequency (Daily, etc.).
- **Target:** Parent executes the activity with the child.

## 2. 🤳 Engagement Tracking (The Loop)

Parents don't just read instructions; they must "Log" them.

- **Action:** Parent clicks "Mark as Done" or uploads a video.
- **Feedback:** Therapist can comment on the submission (e.g., "Great posture!").

## 3. 📉 Dropout Risk Detector (Smart Adherence)

- **Problem:** Parents often stop doing exercises after 2 weeks.
- **Solution:** `SmartHomeCareService` monitors inactivity.
  - **Logic:** Calculates `Adherence Score` (Completed / Expected).
  - **Alert:** If no logs for **7 days**, notifies the therapist: "Family Inactive - Call them!"

## 4. API Usage

### Therapist Assigns Task

```http
POST /api/homecare-smart/assign
Body: {
  "beneficiary": "ID...",
  "title": "Leg Stretching",
  "frequency": "DAILY",
  "videoUrl": "http://youtube..."
}
```

### Parent Gets Dashboard

```http
GET /api/homecare-smart/list?beneficiaryId=ID...
```

**Response:**

```json
{
  "adherence": { "score": 85, "level": "GOOD" },
  "data": [{ "title": "Leg Stretching", "status": "ACTIVE" }]
}
```

### System Checks Risks

```http
POST /api/homecare-smart/run-monitor
```

**Response:**

```json
{
  "details": [{ "beneficiary": "Sarah", "daysInactive": 10 }]
}
```

This creates a **360-degree Care Loop**: Clinic -> Home -> Clinic.
