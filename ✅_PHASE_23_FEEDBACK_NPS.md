# 📣 Phase 23: Smart Feedback & NPS Reputation System

**Date:** 2026-01-16
**Status:** ✅ Implemented

We have closed the most important loop in business: **Customer Satisfaction**.
Instead of waiting for complaints, we actively measure the "Pulse" of the parents.

## 1. 📊 NPS Engine (Net Promoter Score)

The system calculates the global standard for customer loyalty.

- **Method:** "On a scale of 0-10, how likely are you to recommend us?"
- **Analysis:**
  - **Promoters (9-10):** Loyal enthusiasts.
  - **Detractors (0-6):** Unhappy customers (Risk of churn).
  - **Passives (7-8):** Satisfied but unenthusiastic.

## 2. 🚨 Detractor Alerts (Service Recovery)

When a parent gives a low score (Review <= 6):

- **System Action:** Flags feedback as `NEGATIVE`.
- **Trigger:** Creates an entry in the "Alerts List" for the Care Manager.
- **Goal:** Call the parent within 24 hours to resolve the issue before they leave.

## 3. 📝 Sentiment Analysis

- Automatically categorizes comments as Positive, Neutral, or Negative.
- (Future: Uses NLP, currently rule-based on score).

## 4. API Usage

### Submit Feedback

```http
POST /api/feedback-smart/submit
Body: { "session": "ID", "npsScore": 4, "comment": "Waiting time was too long" }
```

### Get Analytics (Admin)

```http
GET /api/feedback-smart/nps?month=1&year=2026
```

**Response:**

```json
{
  "nps": -20, // Negative score means more unhappy people!
  "breakdown": { "promoters": 20, "detractors": 40, "passives": 40 }
}
```

### Resolve Complaint

```http
PUT /api/feedback-smart/resolve/FEEDBACK_ID
Body: { "notes": "Called mother, apologized for delay. Offered free coffee." }
```

This transforms feedback from "Noise" into "Actionable Data".
