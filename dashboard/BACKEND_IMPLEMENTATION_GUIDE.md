# Phase 13 - Week 1: Backend Implementation Guide

## 📂 Project Structure

```
backend/
├── middleware/
│   ├── rbac.js              # RBAC middleware (6-tier role system)
│   └── audit.js             # Audit logging class
├── routes/
│   ├── advancedFeatures.routes.js  # RBAC & Audit API endpoints
│   └── ...
├── tests/
│   ├── rbac.test.js         # 45 RBAC tests (88.88% coverage)
│   └── audit.test.js        # 40 Audit tests (81.67% coverage)
├── logs/
│   └── audit/
│       ├── audit-2026-03-02.jsonl
│       └── ...
└── server.js                # Express server
```

---

## 🛡️ RBAC Middleware (`middleware/rbac.js`)

### Overview
Implements 6-tier role-based access control with hierarchical permissions and wildcard support.

### Role Hierarchy

```javascript
const rbacConfig = {
  roles: {
    ADMIN: {
      level: 100,
      permissions: [
        'read:all', 'write:all', 'delete:all',
        'manage:users', 'manage:roles', 'manage:config'
      ]
    },
    QUALITY_MANAGER: {
      level: 80,
      permissions: [
        'read:quality', 'write:quality',
        'read:reports', 'write:reports',
        'manage:teams', 'read:audit'
      ]
    },
    TEAM_LEAD: {
      level: 60,
      permissions: [
        'read:quality', 'read:reports', 'write:quality',
        'manage:team_members', 'read:team'
      ]
    },
    ANALYST: {
      level: 40,
      permissions: ['read:quality', 'read:reports', 'read:team']
    },
    VIEWER: {
      level: 20,
      permissions: ['read:reports', 'read:public']
    },
    GUEST: {
      level: 10,
      permissions: ['read:public']
    }
  }
};
```

### Core Functions

#### 1. `rbacMiddleware(req, res, next)`
Main middleware that loads user role and permissions.

**Implementation:**
```javascript
const rbacMiddleware = (req, res, next) => {
  try {
    // 1. Extract user from JWT (set by auth middleware)
    const user = req.user;

    if (!user || !user.role) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
    }

    // 2. Get role configuration
    const userRole = user.role.toUpperCase();
    const roleConfig = rbacConfig.roles[userRole];

    if (!roleConfig) {
      return res.status(400).json({
        error: 'Invalid role',
        role: userRole
      });
    }

    // 3. Attach role info to request object
    // IMPORTANT: Not req.user.*, but req.*
    req.role = userRole;
    req.roleLevel = roleConfig.level;
    req.permissions = roleConfig.permissions;

    next();
  } catch (error) {
    console.error('RBAC Middleware Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

**Key Points:**
- Assumes `req.user` is already set by authentication middleware
- Stores role data at `req.role`, `req.roleLevel`, `req.permissions` (NOT in req.user)
- Returns 401 for missing auth, 400 for invalid roles

**Usage:**
```javascript
const express = require('express');
const authMiddleware = require('./middleware/auth');
const rbacMiddleware = require('./middleware/rbac');

app.use('/api', authMiddleware);  // Add user to req
app.use('/api', rbacMiddleware);  // Add role/permissions to req
```

---

#### 2. `requireRole(...roles)`
Higher-order function that restricts access to specific roles.

**Implementation:**
```javascript
const requireRole = (...requiredRoles) => {
  return (req, res, next) => {
    const userRole = req.role;

    if (!requiredRoles.includes(userRole)) {
      // Log authorization failure
      console.warn(`Access denied: ${userRole} not in [${requiredRoles.join(', ')}]`);

      return res.status(403).json({
        error: 'Forbidden - Invalid role',
        required: requiredRoles,
        userRole: userRole
      });
    }

    next();
  };
};
```

**Usage:**
```javascript
// Single role requirement
app.get('/api/admin/settings', requireRole('ADMIN'), (req, res) => {
  // Only ADMIN can access
});

// Multiple roles allowed
app.get('/api/quality/reports',
  requireRole('ADMIN', 'QUALITY_MANAGER', 'TEAM_LEAD'),
  (req, res) => {
    // ADMIN, QUALITY_MANAGER, or TEAM_LEAD can access
  }
);
```

**Testing:**
```javascript
// Test: Admin can access
req.role = 'ADMIN';
const middleware = requireRole('ADMIN');
middleware(req, res, next);
expect(next).toHaveBeenCalled();

// Test: Viewer cannot access
req.role = 'VIEWER';
middleware(req, res, next);
expect(res.status).toHaveBeenCalledWith(403);
```

---

#### 3. `requirePermission(...permissions)`
Restricts access to users with specific permissions (supports wildcards).

**Implementation:**
```javascript
const requirePermission = (...requiredPerms) => {
  return (req, res, next) => {
    const userPerms = req.permissions || [];

    // Check if user has all required permissions
    const hasAllPerms = requiredPerms.every(reqPerm =>
      hasPermission(userPerms, reqPerm)
    );

    if (!hasAllPerms) {
      return res.status(403).json({
        error: 'Forbidden - Insufficient permissions',
        required: requiredPerms,
        user: req.user?.id,
        userRole: req.role
      });
    }

    next();
  };
};
```

**Helper: `hasPermission(userPerms, required)`**
```javascript
const hasPermission = (userPerms, required) => {
  // 1. Direct match
  if (userPerms.includes(required)) {
    return true;
  }

  // 2. Check wildcard permissions
  const [action, resource] = required.split(':');

  // Check for action:all (e.g., read:all grants read:quality)
  if (userPerms.includes(`${action}:all`)) {
    return true;
  }

  // Check for write:all grants read:* (write > read)
  if (action === 'read' && userPerms.includes('write:all')) {
    return true;
  }

  // 3. Check for manage:* permissions (manage includes read/write/delete)
  if (['read', 'write', 'delete'].includes(action)) {
    if (userPerms.includes(`manage:${resource}`)) {
      return true;
    }
  }

  return false;
};
```

**Wildcard Examples:**
```javascript
// User has permissions: ['write:all']
hasPermission(['write:all'], 'write:quality')  // true
hasPermission(['write:all'], 'write:reports')  // true
hasPermission(['write:all'], 'read:quality')   // false (different action)

// User has permissions: ['manage:users']
hasPermission(['manage:users'], 'read:users')   // true
hasPermission(['manage:users'], 'write:users')  // true
hasPermission(['manage:users'], 'delete:users') // true
```

**Usage:**
```javascript
// Single permission
app.put('/api/quality/metrics',
  requirePermission('write:quality'),
  (req, res) => {
    // User needs write:quality (or write:all)
  }
);

// Multiple permissions (all required)
app.delete('/api/quality/metrics/:id',
  requirePermission('write:quality', 'delete:quality'),
  (req, res) => {
    // User needs BOTH permissions
  }
);
```

---

#### 4. `requireRoleLevel(minLevel)`
Restricts access based on role hierarchy level.

**Implementation:**
```javascript
const requireRoleLevel = (minLevel) => {
  return (req, res, next) => {
    const userLevel = req.roleLevel || 0;

    if (userLevel < minLevel) {
      return res.status(403).json({
        error: 'Forbidden - Insufficient role level',
        required: minLevel,
        userLevel: userLevel
      });
    }

    next();
  };
};
```

**Usage:**
```javascript
// Only level 60+ can access (TEAM_LEAD, QUALITY_MANAGER, ADMIN)
app.get('/api/team/performance',
  requireRoleLevel(60),
  (req, res) => {
    // ANALYST (40) and VIEWER (20) blocked
  }
);
```

**Use Case:**
Better than `requireRole('TEAM_LEAD', 'QUALITY_MANAGER', 'ADMIN')` when you want hierarchical access:
```javascript
// ✅ Good: Uses hierarchy
requireRoleLevel(60)  // Any role ≥60

// ❌ Verbose: Must list all allowed roles
requireRole('TEAM_LEAD', 'QUALITY_MANAGER', 'ADMIN')
```

---

#### 5. Helper Functions

**`getRoleInfo(roleName)`**
```javascript
const getRoleInfo = (roleName) => {
  const role = rbacConfig.roles[roleName.toUpperCase()];
  if (!role) return null;

  return {
    name: roleName.toUpperCase(),
    level: role.level,
    permissions: role.permissions
  };
};

// Usage
const adminInfo = getRoleInfo('ADMIN');
// { name: 'ADMIN', level: 100, permissions: [...] }
```

**`getAllRoles()`**
```javascript
const getAllRoles = () => {
  return Object.entries(rbacConfig.roles)
    .map(([name, config]) => ({
      name,
      level: config.level,
      permissions: config.permissions
    }))
    .sort((a, b) => b.level - a.level);  // Highest first
};

// Returns:
// [
//   { name: 'ADMIN', level: 100, permissions: [...] },
//   { name: 'QUALITY_MANAGER', level: 80, permissions: [...] },
//   ...
// ]
```

**`checkAccess(role, permission)`**
```javascript
const checkAccess = (role, permission) => {
  const roleConfig = rbacConfig.roles[role.toUpperCase()];
  if (!roleConfig) return false;

  return hasPermission(roleConfig.permissions, permission);
};

// Usage
const canWrite = checkAccess('ANALYST', 'write:quality');
// false - ANALYST only has read:quality
```

---

## 📋 Audit Logger (`middleware/audit.js`)

### Overview
Implements comprehensive audit logging to JSON Lines files with automatic rotation.

### Class Structure

```javascript
class AuditLogger {
  constructor(options = {}) {
    this.auditDir = options.auditDir || path.join(__dirname, '../logs/audit');
    this.retentionDays = options.retentionDays || 90;

    // Create audit directory if not exists
    if (!fs.existsSync(this.auditDir)) {
      fs.mkdirSync(this.auditDir, { recursive: true });
    }

    // Start cleanup scheduler
    this.scheduleCleanup();
  }

  // ... methods
}

// Export singleton instance
module.exports = new AuditLogger();
```

---

### Core Methods

#### 1. `logAuthEvent(userId, email, action, success, details)`
Log authentication events (LOGIN, LOGOUT, PASSWORD_CHANGE).

**Implementation:**
```javascript
logAuthEvent(userId, email, action, success, details = {}) {
  const event = {
    timestamp: new Date().toISOString(),
    category: 'AUTHENTICATION',
    userId: userId || null,
    email: email || 'unknown',
    action,  // LOGIN, LOGOUT, PASSWORD_CHANGE, etc.
    success,
    ipAddress: details.ipAddress,
    userAgent: details.userAgent,
    severity: success ? 'INFO' : 'WARNING',
    details
  };

  this._writeLog(event);
  return event;
}
```

**Usage:**
```javascript
const auditLogger = require('./middleware/audit');

// Successful login
app.post('/api/auth/login', async (req, res) => {
  const user = await User.authenticate(req.body.email, req.body.password);

  if (user) {
    auditLogger.logAuthEvent(
      user.id,
      user.email,
      'LOGIN',
      true,
      {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    res.json({ token: generateToken(user) });
  } else {
    auditLogger.logAuthEvent(
      null,
      req.body.email,
      'LOGIN',
      false,
      {
        ipAddress: req.ip,
        reason: 'Invalid credentials'
      }
    );

    res.status(401).json({ error: 'Invalid credentials' });
  }
});
```

---

#### 2. `logAuthorizationEvent(userId, action, resource, allowed, reason, details)`
Log authorization checks (permission/role checks).

**Implementation:**
```javascript
logAuthorizationEvent(userId, action, resource, allowed, reason, details = {}) {
  const event = {
    timestamp: new Date().toISOString(),
    category: 'AUTHORIZATION',
    userId,
    action,         // ACCESS_GRANTED, ACCESS_DENIED, ROLE_CHANGED
    resource,       // /api/admin/users, quality_metrics, etc.
    allowed,
    reason,
    severity: allowed ? 'INFO' : 'WARNING',
    details
  };

  this._writeLog(event);
  return event;
}
```

**Usage:**
```javascript
// Log permission denied
const requirePermission = (...perms) => {
  return (req, res, next) => {
    const hasAccess = checkPermissions(req.permissions, perms);

    if (!hasAccess) {
      auditLogger.logAuthorizationEvent(
        req.user.id,
        'ACCESS_DENIED',
        req.originalUrl,
        false,
        'Insufficient permissions',
        {
          requiredPermissions: perms,
          userPermissions: req.permissions,
          userRole: req.role
        }
      );

      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
};
```

---

#### 3. `logDataAccess(userId, action, resource, dataType, recordCount, details)`
Log CRUD operations on sensitive data.

**Implementation:**
```javascript
logDataAccess(userId, action, resource, dataType, recordCount = 1, details = {}) {
  const event = {
    timestamp: new Date().toISOString(),
    category: 'DATA_ACCESS',
    userId,
    action,       // READ, WRITE, UPDATE, DELETE, BULK_READ, etc.
    resource,     // quality_metrics, users, reports
    dataType,     // quality_data, user_data, report_data
    recordCount,
    severity: this._getDataAccessSeverity(action, recordCount),
    details
  };

  this._writeLog(event);
  return event;
}

_getDataAccessSeverity(action, recordCount) {
  // BULK operations are WARNING
  if (recordCount > 100 || action.startsWith('BULK_')) {
    return 'WARNING';
  }

  // DELETE is WARNING
  if (action === 'DELETE') {
    return 'WARNING';
  }

  // READ/WRITE are INFO
  return 'INFO';
}
```

**Usage:**
```javascript
// Log data update
app.put('/api/quality/metrics/:id', async (req, res) => {
  const metric = await QualityMetric.update(req.params.id, req.body);

  auditLogger.logDataAccess(
    req.user.id,
    'UPDATE',
    'quality_metrics',
    'quality_data',
    1,
    {
      recordId: req.params.id,
      fields: Object.keys(req.body)
    }
  );

  res.json(metric);
});

// Log bulk delete
app.delete('/api/reports/old', async (req, res) => {
  const deleted = await Report.deleteOlderThan(90);

  auditLogger.logDataAccess(
    req.user.id,
    'BULK_DELETE',
    'reports',
    'report_data',
    deleted.count,
    {
      daysOld: 90,
      criteria: 'archived reports'
    }
  );

  res.json({ deleted: deleted.count });
});
```

---

#### 4. `logConfigChange(userId, configKey, oldValue, newValue, reason, details)`
Log configuration changes.

**Implementation:**
```javascript
logConfigChange(userId, configKey, oldValue, newValue, reason, details = {}) {
  const event = {
    timestamp: new Date().toISOString(),
    category: 'CONFIG_CHANGE',
    userId,
    configKey,
    oldValue,
    newValue,
    reason,
    severity: 'INFO',
    details
  };

  this._writeLog(event);
  return event;
}
```

**Usage:**
```javascript
app.put('/api/settings/:key', requirePermission('manage:config'), async (req, res) => {
  const { value, reason } = req.body;
  const oldValue = await Settings.get(req.params.key);

  await Settings.set(req.params.key, value);

  auditLogger.logConfigChange(
    req.user.id,
    req.params.key,
    oldValue,
    value,
    reason,
    {
      environment: process.env.NODE_ENV
    }
  );

  res.json({ success: true });
});
```

---

#### 5. `logSecurityEvent(severity, type, description, details)`
Log security-related events (intrusions, threats).

**Implementation:**
```javascript
logSecurityEvent(severity, type, description, details = {}) {
  const event = {
    timestamp: new Date().toISOString(),
    category: 'SECURITY',
    severity,  // CRITICAL, HIGH, MEDIUM, LOW, INFO
    type,      // INTRUSION_ATTEMPT, SQL_INJECTION_ATTEMPT, etc.
    description,
    details
  };

  this._writeLog(event);

  // Alert on critical events
  if (severity === 'CRITICAL') {
    this._alertSecurityTeam(event);
  }

  return event;
}
```

**Usage:**
```javascript
// Brute force detection
const loginAttempts = {};

app.post('/api/auth/login', async (req, res) => {
  const { email } = req.body;

  // Track attempts
  loginAttempts[email] = (loginAttempts[email] || 0) + 1;

  if (loginAttempts[email] > 5) {
    auditLogger.logSecurityEvent(
      'HIGH',
      'BRUTE_FORCE_ATTEMPT',
      `Multiple failed login attempts for ${email}`,
      {
        email,
        attempts: loginAttempts[email],
        ipAddress: req.ip
      }
    );

    return res.status(429).json({ error: 'Too many attempts' });
  }

  // ... continue login
});
```

---

#### 6. `logAPICall(userId, method, endpoint, statusCode, duration, details)`
Log API calls for monitoring.

**Implementation:**
```javascript
logAPICall(userId, method, endpoint, statusCode, duration, details = {}) {
  const event = {
    timestamp: new Date().toISOString(),
    category: 'API_CALL',
    userId: userId || null,
    method,
    endpoint,
    statusCode,
    duration,  // milliseconds
    severity: statusCode >= 500 ? 'ERROR' : 'INFO',
    details
  };

  this._writeLog(event);
  return event;
}
```

**Usage (Middleware):**
```javascript
// API call logger middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  // Override res.json to log after response
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    const duration = Date.now() - startTime;

    auditLogger.logAPICall(
      req.user?.id,
      req.method,
      req.originalUrl,
      res.statusCode,
      duration,
      {
        queryParams: req.query,
        bodySize: JSON.stringify(req.body || {}).length
      }
    );

    return originalJson(data);
  };

  next();
});
```

---

### File Management

#### 1. `_writeLog(event)`
Write event to daily audit log file.

**Implementation:**
```javascript
_writeLog(event) {
  try {
    const logFile = this._getLogFilePath();
    const logLine = JSON.stringify(event) + '\n';

    // Use graceful-fs for safe concurrent writes
    fs.appendFileSync(logFile, logLine, 'utf8');
  } catch (error) {
    console.error('Audit log write failed:', error);
    // Fallback to console
    console.log('AUDIT_EVENT:', JSON.stringify(event));
  }
}

_getLogFilePath() {
  const today = new Date().toISOString().split('T')[0];
  return path.join(this.auditDir, `audit-${today}.jsonl`);
}
```

**File Format (JSON Lines):**
```
{"timestamp":"2026-03-02T10:30:00.000Z","category":"AUTHENTICATION","userId":1,"email":"user@alawael.com","action":"LOGIN","success":true,"severity":"INFO"}
{"timestamp":"2026-03-02T10:35:00.000Z","category":"DATA_ACCESS","userId":1,"action":"UPDATE","resource":"quality_metrics","dataType":"quality_data","recordCount":1,"severity":"WARNING"}
```

---

#### 2. `query(filters)`
Query audit logs with filtering.

**Implementation:**
```javascript
async query(filters = {}) {
  const { category, userId, startDate, endDate, severity } = filters;
  const logs = [];

  // Read all relevant log files
  const files = this._getLogFilesInRange(startDate, endDate);

  for (const file of files) {
    const fileContent = fs.readFileSync(file, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const event = JSON.parse(line);

        // Apply filters
        if (category && event.category !== category) continue;
        if (userId && event.userId !== userId) continue;
        if (severity && event.severity !== severity) continue;

        logs.push(event);
      } catch (err) {
        // Skip malformed lines
        console.warn('Invalid log line:', line);
      }
    }
  }

  return logs;
}

_getLogFilesInRange(startDate, endDate) {
  const files = fs.readdirSync(this.auditDir);
  const start = startDate ? new Date(startDate) : new Date(0);
  const end = endDate ? new Date(endDate) : new Date();

  return files
    .filter(file => file.match(/^audit-\d{4}-\d{2}-\d{2}\.jsonl$/))
    .filter(file => {
      const dateStr = file.match(/audit-(\d{4}-\d{2}-\d{2})/)[1];
      const fileDate = new Date(dateStr);
      return fileDate >= start && fileDate <= end;
    })
    .map(file => path.join(this.auditDir, file));
}
```

---

#### 3. `getAuditStats(days = 30)`
Get audit statistics.

**Implementation:**
```javascript
async getAuditStats(days = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = await this.query({ startDate, endDate });

  const stats = {
    totalEvents: logs.length,
    timeRange: { start: startDate, end: endDate, days },
    byCategory: {},
    bySeverity: {},
    topUsers: [],
    failureRate: 0,
    securityEvents: 0,
    recentCritical: []
  };

  // Count by category
  logs.forEach(log => {
    stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
    stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
  });

  // Security stats
  stats.securityEvents = stats.byCategory.SECURITY || 0;
  stats.recentCritical = logs
    .filter(log => log.severity === 'CRITICAL')
    .slice(-10);  // Last 10 critical events

  // Failure rate (failed auth / total auth)
  const authLogs = logs.filter(log => log.category === 'AUTHENTICATION');
  const failedAuth = authLogs.filter(log => !log.success).length;
  stats.failureRate = authLogs.length > 0 ? failedAuth / authLogs.length : 0;

  return stats;
}
```

---

#### 4. `cleanup()`
Remove old audit logs based on retention policy.

**Implementation:**
```javascript
cleanup() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

  const files = fs.readdirSync(this.auditDir);
  let deletedCount = 0;

  files.forEach(file => {
    const match = file.match(/^audit-(\d{4}-\d{2}-\d{2})\.jsonl$/);
    if (match) {
      const fileDate = new Date(match[1]);

      if (fileDate < cutoffDate) {
        fs.unlinkSync(path.join(this.auditDir, file));
        deletedCount++;
        console.log(`Deleted old audit log: ${file}`);
      }
    }
  });

  return { deleted: deletedCount, retentionDays: this.retentionDays };
}

scheduleCleanup() {
  // Run cleanup daily at midnight
  setInterval(() => {
    this.cleanup();
  }, 24 * 60 * 60 * 1000);  // 24 hours
}
```

---

## 🧪 Testing Guide

### Test Structure

```javascript
// tests/rbac.test.js
describe('RBAC Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { id: 1, email: 'test@example.com', role: 'ADMIN' },
      method: 'GET',
      originalUrl: '/api/test'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('rbacMiddleware', () => {
    it('should attach role and permissions to request', () => {
      rbacMiddleware(req, res, next);

      expect(req.role).toBe('ADMIN');
      expect(req.roleLevel).toBe(100);
      expect(req.permissions).toContain('read:all');
      expect(next).toHaveBeenCalled();
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test tests/rbac.test.js

# Watch mode
npm test -- --watch
```

---

## 🚀 Deployment Checklist

### Environment Variables
```bash
# .env.production
NODE_ENV=production
JWT_SECRET=your-256-bit-secret-key
AUDIT_DIR=/var/log/alawael/audit
AUDIT_RETENTION_DAYS=90
```

### Pre-Deployment
1. ✅ All tests passing (73/73)
2. ✅ Code coverage > 80% (83.78%)
3. ✅ Audit directory exists with proper permissions
4. ✅ JWT secret is strong (256-bit minimum)
5. ✅ HTTPS enabled in production
6. ✅ Rate limiting configured

### Post-Deployment
1. Monitor audit logs for suspicious activity
2. Verify cleanup scheduler is running
3. Check disk space for audit logs
4. Test role and permission enforcement
5. Verify admin access works

---

## 📚 Additional Resources

- [RBAC API Reference](./RBAC_AUDIT_API_REFERENCE.md)
- [React Integration Guide](./RBAC_AUDIT_INTEGRATION_GUIDE.md)
- [Security Best Practices](./SECURITY_BEST_PRACTICES.md)
