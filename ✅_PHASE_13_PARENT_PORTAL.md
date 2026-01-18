# 👨‍👩‍👧 Phase 13: Integrated Parent Portal

**Date:** 2026-01-15
**Status:** ✅ Implemented

We have opened the doors for the "Customers" (Parents/Guardians) to interact with the system digitally.
This reduces phone calls to reception and improves transparency.

## 1. 👪 Portal Capabilities

- **Role-Based Access:** Added `parent` role to User system.
- **My Family View:** Parents can see all their registered children.
- **360° Child Timeline:**
  - See **Sessions** completed recently (Did my child attend today?).
  - See **Invoices** (What do I owe?).
  - See **Therapy Plans** (What are the goals?).

## 2. 📱 API Endpoints

- `GET /api/portal/children`: List all linked beneficiaries.
- `GET /api/portal/children/:id/timeline`: The comprehensive dashboard for a single child.

## 3. Usage Scenario

### Parent Login

Parent logs in using the standard Auth API (`/api/auth/login`) and receives a token with role `parent`.

### viewing Child's Status

```http
GET /api/portal/children/65a.../timeline
```

**Response:**

```json
{
  "recentSessions": [{ "date": "2026-01-14", "therapist": "Dr. Sarah", "status": "COMPLETED", "rating": 5 }],
  "invoices": [{ "number": "INV-2026-001", "amount": 150, "status": "UNPAID" }],
  "activePlans": [
    { "goalsCount": 5, "progress": 0.4 } // 40% Progress
  ]
}
```

The system is now **Customer-Facing**. 🚀
