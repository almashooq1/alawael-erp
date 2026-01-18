# 🚀 Enterprise Integrations & Backup System

**Date:** 2026-01-15
**Status:** ✅ Added

We have added robust data management and integration capabilities.

## 1. 💾 Automated Backup Service

You can now create instant snapshots of the database.

- **Location:** `backups/auto/` (automatically created).
- **Format:** GZIP compressed MongoDB archive.
- **Triggers:**
  - **Manual:** via API `POST /api/admin/backups/create`.
  - **Auto:** Can be scripted or scheduled.

**API Endpoints:**

- `GET /api/admin/backups`: List all backup files with size and date.
- `POST /api/admin/backups/create`: Trigger immediate backup.

## 2. 🔑 API Key Management

Securely integrate third-party apps (Mobile Apps, Payment Gateways, Partner Systems).

- **Security:** Keys are secure, revokable, and trackable.
- **Permissions:** Each key can be assigned specific scopes (e.g. `READ_ONLY`, `FINANCE_WRITE`).
- **Usage Tracking:** See exactly when a key was last used.

**How to authenticate:**
Add the header `X-API-KEY: sk_fe3a...` to any request.

**Manage Keys (Admin Only):**

- `POST /api/admin/apikeys`: Create new key (set expiry days, permissions).
- `GET /api/admin/apikeys`: List all keys.
- `DELETE /api/admin/apikeys/:id`: Revoke access immediately.

## 3. 📂 New Code Added

- `backend/services/backup.service.js`
- `backend/models/ApiKey.js`
- `backend/middleware/apiKey.middleware.js`
- `backend/routes/admin.routes.js`

## How to Test

1. **Trigger Backup:**

```bash
curl -X POST http://localhost:3000/api/admin/backups/create -H "Authorization: Bearer ADMIN_TOKEN"
```

2. **Generate API Key:**
   Login as Admin, hit `POST /api/admin/apikeys` with body `{"name": "Test App", "daysValid": 365}`.
3. **Use API Key:**

```bash
curl http://localhost:3000/api/system -H "X-API-KEY: sk_your_generated_key"
```
