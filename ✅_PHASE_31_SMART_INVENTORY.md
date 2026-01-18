# 📦 Phase 31: Smart Inventory & Maintenance

**Date:** 2026-01-16
**Status:** ✅ Implemented

Rehab centers manage two critical asset types:

1.  **Consumables:** Oils, wipes, electrodes (High turnover).
2.  **Capital Equipment:** Lokomat, Spider Cage, Treadmills (High maintenance).

The **Smart Inventory Engine** prevents "Stockouts" and "Breakdowns".

## 1. 🔮 Stock Depletion AI

Instead of fixed reorder points, the AI looks at the _Session Schedule_.

- "You have 40 sessions/day this week -> You will run out of Gel in 3 days."
- Status: `HEALTHY`, `LOW`, `CRITICAL`.

## 2. 🔧 Usage-Based Maintenance

Tracks actual "Usage Hours" (mocked via session duration) for machines.

- **Lokomat:** "450/500 hours used. Schedule Service."
- Prevents using un-calibrated equipment on patients.

## 3. API Usage

```http
GET /api/inventory-smart/predictions
```

**Response:**

```json
[
  {
    "item": "Ultrasound Gel",
    "daysUntilEmpty": 2,
    "status": "CRITICAL"
  },
  {
    "item": "Face Masks",
    "daysUntilEmpty": 15,
    "status": "HEALTHY"
  }
]
```

This transforms Inventory from "Counting Boxes" to "Predicting Demand".
