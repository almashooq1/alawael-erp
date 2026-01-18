# 🔔 Phase 9: Active Intelligence System (Notifications)

**Date:** 2026-01-15
**Status:** ✅ Implemented

We have transformed the system from "Passive" (waiting for user input) to "Active" (alerting users about issues).

## 1. 🧠 Central Nervous System (`smartNotificationService.js`)

The new service acts as a background monitor that checks all other modules.

### Monitored Events:

1.  **Rehabilitation:** Checks for sessions scheduled for tomorrow.
    - **Action:** Sends a `TASK` notification to the assigned Therapist.
2.  **Finance:** Checks for unpaid invoices older than 30 days.
    - **Action:** Sends a `WARNING` notification to the Admin/Finance User.
3.  **HR:** Checks for staff with high workload (>50 sessions).
    - **Action:** Sends a `WARNING` to HR Managers about "Burnout Risk".

## 2. 📨 Notification API

We created a dedicated route to manage these alerts.

### Endpoints:

- `GET /api/notifications` - View my alerts (Top 20 + Unread Count).
- `PUT /api/notifications/:id/read` - Mark as read.
- `POST /api/notifications/run-checks` - **Magic Button**: Manually runs the AI checks that would normally run every night via Cron Job.

## 3. Usage Example

### Triggering the "Nightly Check" manually:

```http
POST /api/notifications/run-checks
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "results": {
    "rehab": { "message": "Sent 5 session reminders." },
    "finance": { "message": "Found 12 overdue invoices." },
    "hr": { "message": "No burnout alerts." }
  }
}
```

### Viewing Alerts:

```http
GET /api/notifications
```

**Response:**

```json
{
  "unread": 2,
  "data": [
    {
      "type": "WARNING",
      "title": "Financial Alert: Overdue Invoices",
      "message": "You have 12 overdue invoices totaling $15,000.",
      "link": "/finance/invoices?filter=overdue"
    }
  ]
}
```

The system is now **Proactive**. 🚀
