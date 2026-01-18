# 🎉 New Feature: Persistent Notification System

**Date:** 2026-01-15
**Status:** ✅ Added

We have upgraded the notification system from simple transient socket messages to a robust, database-backed inbox system.

## 🔔 How it Works

1. **Storage:** Notifications are now saved in MongoDB (Collection: `notifications`).
2. **Real-time:** If the user is online, they still receive the Socket.IO event immediately.
3. **Offline Support:** If the user is offline, the notification waits in their "Inbox" until they log in.

## 🔌 API Endpoints

All endpoints are under `/api/notifications` and require authentication.

| Method | Endpoint | Description |
| null | null | null |
| GET | `/` | Get list of notifications (Supports `?page=1` and `?unreadOnly=true`) |
| PUT | `/:id/read` | Mark a specific notification as READ |
| PUT | `/mark-all-read` | Mark ALL notifications as READ |

## 🛠️ Usage for Developers

### Sending a Notification

Use the `NotificationService`. Passing `io` is optional but recommended for realtime delivery.

```javascript
const NotificationService = require('../services/notification.service');

// Example: Task Assignment
await NotificationService.send(req.io, userId, {
  title: 'New Task Assigned',
  message: 'You have been assigned to Project X',
  type: 'TASK',
  link: '/tasks/123',
});
```

### Auto-Cleaning

- Notifications expire and auto-delete after **30 days** to keep the database light.
