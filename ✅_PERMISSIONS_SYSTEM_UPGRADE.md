# 🔐 Advanced Permissions & Access Control System

**Date:** 2026-01-15
**Status:** ✅ Implemented

## Overview

We have upgraded the legacy `admin/user` role system to a comprehensive **Role-Based Access Control (RBAC)** architecture with granular permission capabilities.

## 1. New Roles Supported

The system now supports the following professional roles:

- **Admin**: Full system access.
- **Manager**: View capabilities across departments.
- **HR**: Employee & Attendance management.
- **Accountant**: Finance, Payroll, & Invoices.
- **Doctor**: Patient records & Medical sessions.
- **Therapist**: Session updates & Patient viewing.
- **Receptionist**: Scheduling & Basic user lookup.
- **User**: Basic access.

## 2. Granular Permissions

Instead of hardcoding role checks in controllers, we now check for _Capabilities_.
Example: `checkPermission('create:employee')`.

Defined in `backend/config/roles.js`:

- `create:user`, `read:finance`, `manage:attendance`, `update:patient`, etc.

## 3. How to Use

### Protecting a Route

```javascript
const { checkPermission } = require('../middleware/checkPermission');
const { PERMISSIONS } = require('../config/roles');

// Only users with 'create:employee' permission (HR, Admin) can access
router.post('/employees', auth.authenticateToken, checkPermission(PERMISSIONS.CREATE_EMPLOYEE), employeeController.create);
```

### Checking in Frontend (Recommended Future Step)

The frontend should decode the JWT, read the `role`, and map it to `ROLE_PERMISSIONS` to show/hide UI elements dynamically.

## 4. Implementation Details

- **Config:** `backend/config/roles.js` (Central Permission Matrix)
- **Middleware:** `backend/middleware/checkPermission.js`
- **Model:** `backend/models/User.js` updated with new Enum.

## Next Steps

- Update existing routes to use granular permissions instead of `authorize(['admin'])`.
- Expose a `/api/auth/me` endpoint that returns the user's permissions list to the frontend.
