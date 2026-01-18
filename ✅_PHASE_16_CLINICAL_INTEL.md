# 🩺 Phase 16: Clinical Intelligence & Goal Bank

**Date:** 2026-01-16
**Status:** ✅ Implemented

We have added a "Brain" for the therapists to ensure high clinical quality and faster paperwork.

## 1. 📚 The Goal Bank

Therapists often spend hours writing goals. We created a shared repository of SMART goals.

- **Model:** `GoalBank` (Domain, Category, Age Range, Difficulty).
- **Feature:** Therapists can select from pre-written, standard medical goals instead of typing from scratch.
- **Crowdsourcing:** Therapists can add new successful goals to the bank for others to use.

## 2. 🤖 AI Goal Suggester

- **Route:** `GET /api/clinical-smart/goals/suggest?domain=SPEECH&age=5`
- **Logic:** Inputs the child's Diagnosis Type (Domain) and Age, and outputs appropriate goals.
- **Example:** A 5-year-old in Speech Therapy -> Suggests "Produce /s/ sound correctly".

## 3. 📉 Stalled Progress Detection

- **Clinical Quality Check:** The system checks all Active Plans.
- **Logic:** If a plan hasn't been updated (no progress logged) in **30 days**:
  - **Action:** Sends a `WARNING` notification to the Case Manager / Supervisor.
  - **Message:** "Clinical Alert: Therapy plan for [Patient] hasn't been updated..."

## 4. Usage Example

### Get Suggestions for a 4-year-old (OT)

```http
GET /api/clinical-smart/goals/suggest?domain=OCCUPATIONAL&age=4
```

**Response:**

```json
[
  {
    "description": "Hold a pencil using a tripod grasp dynamically.",
    "category": "Fine Motor",
    "difficulty": "INTERMEDIATE"
  }
]
```

The system is now **Clinically Intelligent**. 🚀
