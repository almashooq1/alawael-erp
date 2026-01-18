# 🛡️ Access Control & Data Protection Update

**Date:** 2026-01-15
**Implemented By:** GitHub Copilot Agent

## Overview

We have fortified the system with advanced access controls and data protection mechanisms. This moves the project from "Development" to "Enterprise-Ready".

## 1. 🔑 Granular API Access (API Keys)

- **Problem:** Integrating mobile apps or 3rd party services required sharing user passwords or short-lived tokens.
- **Solution:** Persistent, revokable API Keys with scope restrictions.
- **New Middleware:** `apiKey.middleware.js` automatically validates `X-API-KEY` headers and injects a "Virtual User" context.

## 2. 🛡️ Admin Security Routes

- **New Route Group:** `/api/admin/*`
- **Protection:** All routes under this group require `ADMIN`, `SUPER_ADMIN`, or `DEVELOPER` roles.
- **Endpoints:**
  - `GET /api/admin/backups`: View all data snapshots.
  - `POST /api/admin/backups/create`: Force a new backup.
  - `GET /api/admin/apikeys`: Audit all active integrations.

## 3. 💾 Data Safety (Backup Service)

- **Functionality:** Automated execution of `mongodump` to create point-in-time recovery archives.
- **Storage:** Archives are stored locally in `backups/auto/` (formatted as `backup-YYYY-MM-DD-HH-MM-SS.gz`).
- **Audit:** Every backup creation is logged in the `AuditLog` system.

## 4. 🌍 Global Protection

- `maintenanceMiddleware` is now globally active in `server.js`.
- `apiKeyAuth` is globally active, allowing any route to optionally accept an API Key instead of a Bearer Token (useful for webhook endpoints).

## Usage Example (Admin Dashboard)

To generate a key for a new Mobile App:

```javascript
// POST /api/admin/apikeys
{
  "name": "Driver App v2",
  "permissions": ["READ_TRIPS", "UPDATE_LOCATION"],
  "daysValid": 365
}
```

Returns: `sk_a1b2c3d4...` (Show this ONCE).
