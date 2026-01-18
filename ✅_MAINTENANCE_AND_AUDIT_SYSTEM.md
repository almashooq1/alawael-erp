# 🛠️ System Maintenance & Reliability Upgrades

**Date:** 2026-01-15
**Implemented By:** GitHub Copilot Agent

## New Features

### 1. 🚧 Global Maintenance Mode

We added a "Kill Switch" for the application. When Maintenance Mode is **ENABLED**:

- All API requests return `503 Service Unavailable`.
- **Admins** can still log in and use the system to perform updates or tests.
- **Login Routes** are always accessible.

**How to Toggle:**

```http
POST /api/system/maintenance
Content-Type: application/json
Authorization: Bearer <AdminToken>

{
  "enabled": true
}
```

### 2. 🕵️ Advanced Audit Logging

Every critical action is now recorded in a persistent MongoDB collection (`auditlogs`).

- Tracks: Who, What, When, IP, Status.
- Retention: 1 Year.

**View Logs:**

```http
GET /api/system/audit-logs?module=FINANCE&action=APPROVE
```

### 3. 💓 System Health Monitor

Endpoint for monitoring tools (like UptimeRobot or Prometheus integration).

```http
GET /api/system
```

Returns:

- CPU/Memory Usage
- Database Connection Status
- Maintenance Mode Status

## File Changes

- `backend/middleware/maintenance.middleware.js` (NEW)
- `backend/routes/system.routes.js` (UPDATED)
- `backend/services/audit.service.js` (NEW)
- `backend/server.js` (UPDATED to include global middleware)
