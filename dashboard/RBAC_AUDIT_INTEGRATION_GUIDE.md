# Phase 13 - Week 1: RBAC & Audit Integration Guide

## 📋 Overview

This guide explains how to integrate the new RBAC (Role-Based Access Control) and Audit Logging features into your React application.

## 🚀 Quick Start

### 1. Wrap your app with RBACProvider

```jsx
// src/App.js
import { RBACProvider } from './contexts/RBACContext';

function App() {
  return (
    <RBACProvider>
      {/* Your app components */}
    </RBACProvider>
  );
}
```

### 2. Protect routes with RoleGuard

```jsx
// src/routes/AdminRoutes.js
import { RoleGuard } from './components/rbac/RoleGuard';

function AdminRoutes() {
  return (
    <RoleGuard requiredRole="ADMIN">
      <AdminDashboard />
    </RoleGuard>
  );
}
```

### 3. Control element visibility with PermissionGuard

```jsx
// src/components/QualityForm.js
import { PermissionGuard, Can } from './components/rbac/PermissionGuard';

function QualityForm() {
  return (
    <div>
      <Can do="read:quality">
        <ViewQualityData />
      </Can>

      <Can do="write:quality">
        <EditQualityButton />
      </Can>

      <Can do="delete:quality">
        <DeleteQualityButton />
      </Can>
    </div>
  );
}
```

## 🎯 Core Components

### RBACProvider

Context provider that manages user roles and permissions.

**Props:** None (automatically loads from backend)

**Context Values:**
- `user` - Current user object
- `loading` - Loading state
- `permissions` - Array of user permissions
- `roleLevel` - Numeric role level (0-100)
- `userRole` - String role name
- `hasPermission(permission)` - Check specific permission
- `hasRole(role)` - Check exact role match
- `hasRoleLevel(role)` - Check role hierarchy
- `isAdmin` - Boolean for admin check
- `isAuthenticated` - Boolean for auth check

### RoleGuard

Component for protecting routes based on roles.

**Props:**
```jsx
<RoleGuard
  requiredRole="ADMIN"           // String or array of roles
  requireLevel={false}           // Check hierarchy (default: false)
  fallback={<AccessDenied />}   // Custom fallback component
  redirectTo="/access-denied"    // Redirect path (default)
>
  {children}
</RoleGuard>
```

**Examples:**
```jsx
// Exact role match (only ADMIN)
<RoleGuard requiredRole="ADMIN">
  <AdminPanel />
</RoleGuard>

// Multiple roles (ADMIN or QUALITY_MANAGER)
<RoleGuard requiredRole={["ADMIN", "QUALITY_MANAGER"]}>
  <ManagementPanel />
</RoleGuard>

// Role hierarchy (ADMIN, QUALITY_MANAGER, TEAM_LEAD all allowed)
<RoleGuard requiredRole="TEAM_LEAD" requireLevel={true}>
  <TeamPanel />
</RoleGuard>
```

### PermissionGuard (Can/Cannot)

Components for showing/hiding UI elements based on permissions.

**Props:**
```jsx
<PermissionGuard
  permission="write:quality"     // String or array of permissions
  requireAll={false}             // Require all permissions (default: false)
  fallback={<ReadOnlyView />}   // Show alternative content
  showTooltip={false}            // Show explanation tooltip
  disable={false}                // Disable instead of hide
>
  {children}
</PermissionGuard>
```

**Shorthand Components:**
```jsx
// Show if user CAN do action
<Can do="write:quality">
  <EditButton />
</Can>

// Show if user CANNOT do action
<Cannot do="write:quality">
  <ReadOnlyMessage />
</Cannot>
```

**Examples:**
```jsx
// Single permission check
<Can do="read:quality">
  <QualityDashboard />
</Can>

// Multiple permissions (any)
<PermissionGuard permission={["write:quality", "delete:quality"]}>
  <EditQualityForm />
</PermissionGuard>

// Multiple permissions (all required)
<PermissionGuard
  permission={["write:quality", "manage:teams"]}
  requireAll={true}
>
  <AdvancedFeatures />
</PermissionGuard>

// Disable button if no permission
<PermissionGuard permission="write:quality" disable={true} showTooltip={true}>
  <Button>Edit Quality Data</Button>
</PermissionGuard>
```

### UserRoleManager

Admin UI for managing user roles.

**Features:**
- View all users and their roles
- Change user roles (ADMIN only)
- Provide reason for role changes
- Audit trail integration

**Usage:**
```jsx
import { UserRoleManager } from './components/rbac/UserRoleManager';

function AdminPage() {
  return (
    <RoleGuard requiredRole="ADMIN">
      <UserRoleManager />
    </RoleGuard>
  );
}
```

### AuditLogViewer

UI for viewing and filtering audit logs.

**Features:**
- Filter by category, date range, user
- Search functionality
- Export to CSV
- Real-time updates

**Usage:**
```jsx
import { AuditLogViewer } from './components/audit/AuditLogViewer';

function SecurityPage() {
  return (
    <Can do="read:audit">
      <AuditLogViewer />
    </Can>
  );
}
```

## 🎣 Custom Hooks

### useRBAC()

Main hook for accessing RBAC context.

```jsx
import { useRBAC } from './contexts/RBACContext';

function MyComponent() {
  const {
    user,
    loading,
    hasPermission,
    hasRole,
    isAdmin
  } = useRBAC();

  if (loading) return <Loading />;
  if (!user) return <Login />;

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p>Role: {user.role}</p>

      {hasPermission('write:quality') && (
        <button>Edit Quality Data</button>
      )}

      {isAdmin && (
        <AdminControls />
      )}
    </div>
  );
}
```

### usePermission(permission, options)

Simplified permission check hook.

```jsx
import { usePermission } from './hooks/usePermission';

function QualityActions() {
  const canRead = usePermission('read:quality');
  const canWrite = usePermission('write:quality');
  const canDelete = usePermission('delete:quality');

  // Check multiple (any)
  const canEdit = usePermission(['write:quality', 'update:quality']);

  // Check multiple (all)
  const fullAccess = usePermission(
    ['write:quality', 'delete:quality'],
    { requireAll: true }
  );

  return (
    <div>
      {canRead && <ViewData />}
      {canWrite && <EditData />}
      {canDelete && <DeleteButton />}
      {fullAccess && <AdvancedOptions />}
    </div>
  );
}
```

### usePermissions(permissionMap)

Get multiple permission checks at once.

```jsx
import { usePermissions } from './hooks/usePermission';

function DataTable() {
  const { canView, canEdit, canDelete, canExport } = usePermissions({
    canView: 'read:quality',
    canEdit: 'write:quality',
    canDelete: 'delete:quality',
    canExport: 'export:quality',
  });

  return (
    <table>
      {canView && <tbody>{data}</tbody>}
      {canEdit && <EditColumn />}
      {canDelete && <DeleteColumn />}
      {canExport && <ExportButton />}
    </table>
  );
}
```

### useAuditLog()

Hook for logging actions and fetching audit data.

```jsx
import { useAuditLog } from './hooks/useAuditLog';

function DataEditor() {
  const {
    logDataAccess,
    logConfigChange,
    fetchLogs,
    exportLogs,
  } = useAuditLog();

  const handleSave = async (data) => {
    // Save data
    await api.saveQualityData(data);

    // Log the action
    await logDataAccess(
      'UPDATE',
      'quality_metrics',
      'quality_data',
      1,
      { dataId: data.id }
    );
  };

  const handleConfigChange = async (key, newValue, oldValue) => {
    await api.updateConfig(key, newValue);

    await logConfigChange(
      key,
      oldValue,
      newValue,
      'User updated configuration',
      { section: 'quality_settings' }
    );
  };

  return <Form onSubmit={handleSave} />;
}
```

## 🔑 Role Hierarchy

| Role | Level | Permissions |
|------|-------|-------------|
| ADMIN | 100 | All permissions (read:all, write:all, delete:all, manage:users, manage:roles) |
| QUALITY_MANAGER | 80 | read:quality, write:quality, read:reports, write:reports, manage:teams |
| TEAM_LEAD | 60 | read:quality, write:quality, read:team, manage:team_members |
| ANALYST | 40 | read:quality, read:reports, write:reports |
| VIEWER | 20 | read:quality, read:reports |
| GUEST | 10 | read:public |

## 📊 Permission Hierarchy

Wildcard permissions grant access to sub-permissions:

- `read:all` → `read:quality`, `read:reports`, `read:team`, `read:public`
- `write:all` → `write:quality`, `write:reports`
- `delete:all` → `delete:quality`, `delete:reports`
- `manage:users` → `read:users`, `write:users`, `delete:users`
- `manage:roles` → `read:roles`, `write:roles`

## 🔒 Best Practices

### 1. Always wrap app with RBACProvider
```jsx
// ✅ Good
<RBACProvider>
  <Router>
    <App />
  </Router>
</RBACProvider>

// ❌ Bad (RBAC hooks won't work)
<Router>
  <App />
</Router>
```

### 2. Use appropriate guard for use case
```jsx
// ✅ Route protection
<RoleGuard requiredRole="ADMIN">
  <AdminPage />
</RoleGuard>

// ✅ Element visibility
<Can do="write:quality">
  <EditButton />
</Can>

// ❌ Don't use RoleGuard for small elements
<RoleGuard requiredRole="ADMIN">
  <Button>Edit</Button>
</RoleGuard>
```

### 3. Log important user actions
```jsx
const { logDataAccess } = useAuditLog();

const handleDelete = async (id) => {
  await api.delete(id);

  // ✅ Always log security-critical actions
  await logDataAccess('DELETE', 'quality_metrics', 'quality_data', 1, { id });
};
```

### 4. Handle loading states
```jsx
const { user, loading } = useRBAC();

if (loading) {
  return <Spinner />;  // ✅ Show loading state
}

// ❌ Don't render before loading completes
```

### 5. Provide fallbacks for access denied
```jsx
// ✅ Good UX
<RoleGuard
  requiredRole="ADMIN"
  fallback={<AccessDeniedMessage />}
>
  <AdminPanel />
</RoleGuard>

// ❌ Poor UX (blank screen)
<RoleGuard requiredRole="ADMIN">
  <AdminPanel />
</RoleGuard>
```

## 📝 Complete Example

```jsx
// src/App.js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { RBACProvider } from './contexts/RBACContext';
import { RoleGuard } from './components/rbac/RoleGuard';
import { UserRoleManager } from './components/rbac/UserRoleManager';
import { AuditLogViewer } from './components/audit/AuditLogViewer';
import Dashboard from './pages/Dashboard';
import QualityPage from './pages/QualityPage';

function App() {
  return (
    <RBACProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />

          <Route
            path="/quality"
            element={
              <RoleGuard requiredRole="ANALYST" requireLevel={true}>
                <QualityPage />
              </RoleGuard>
            }
          />

          <Route
            path="/admin/users"
            element={
              <RoleGuard requiredRole="ADMIN">
                <UserRoleManager />
              </RoleGuard>
            }
          />

          <Route
            path="/admin/audit"
            element={
              <RoleGuard requiredRole="ADMIN">
                <AuditLogViewer />
              </RoleGuard>
            }
          />
        </Routes>
      </Router>
    </RBACProvider>
  );
}

export default App;
```

## 🐛 Troubleshooting

### "useRBAC must be used within RBACProvider"
**Solution:** Wrap your app with `<RBACProvider>`

### "Cannot read property 'role' of null"
**Solution:** Check loading state before accessing user
```jsx
const { user, loading } = useRBAC();
if (loading || !user) return <Loading />;
```

### Permissions not updating after role change
**Solution:** Refresh token or reload user data
```jsx
// Reload page or re-fetch user data
window.location.reload();
```

## 📚 API Reference

See full API documentation in:
- Backend API: `dashboard/server/routes/rbac.routes.js`
- Backend API: `dashboard/server/routes/audit.routes.js`
- Component docs: JSDoc comments in each component file

## ✅ Testing

Unit tests are available in:
- `dashboard/server/tests/rbac.test.js` (45 tests)
- `dashboard/server/tests/audit.test.js` (40 tests)

Run tests:
```bash
cd dashboard/server
npm test
npm test -- --coverage
```
