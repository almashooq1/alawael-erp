# Phase 13 - Week 1: Security Best Practices

## 🔒 RBAC Security Guidelines

### 1. Principle of Least Privilege
Always assign the minimum role and permissions required for users to perform their job functions.

**✅ Good Practice:**
```javascript
// User only needs to view quality data
assignRole(user, 'VIEWER');  // Has only read:quality, read:reports
```

**❌ Bad Practice:**
```javascript
// Over-privileged user
assignRole(user, 'ADMIN');  // Full access when only viewing needed
```

---

### 2. Regular Permission Audits
Review user roles and permissions quarterly to ensure they're still appropriate.

**Implementation:**
```javascript
// Generate permission audit report
const auditReport = await axios.get('/api/audit/statistics', {
  params: { days: 90 }
});

// Review users with elevated permissions
const highPrivilegeUsers = users.filter(u =>
  ['ADMIN', 'QUALITY_MANAGER'].includes(u.role)
);

// Verify each user still needs their access level
highPrivilegeUsers.forEach(user => {
  console.log(`Review: ${user.email} - ${user.role}`);
});
```

---

### 3. Enforce Strong Authentication
Combine RBAC with strong authentication mechanisms.

**Required Security Measures:**
```javascript
// 1. Use JWT with short expiration
const token = jwt.sign(
  { userId, role, permissions },
  SECRET_KEY,
  { expiresIn: '1h' }  // Short-lived tokens
);

// 2. Implement refresh tokens
const refreshToken = jwt.sign(
  { userId },
  REFRESH_SECRET,
  { expiresIn: '7d' }
);

// 3. Validate tokens on every request
app.use((req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});
```

---

### 4. Log All Permission Changes
Every role change must be logged with justification.

**✅ Correct Implementation:**
```javascript
const changeUserRole = async (userId, newRole, reason) => {
  const user = await User.findById(userId);
  const oldRole = user.role;

  // Require reason for audit trail
  if (!reason || reason.trim().length < 10) {
    throw new Error('Reason required (minimum 10 characters)');
  }

  // Update role
  user.role = newRole;
  await user.save();

  // Log the change
  await auditLogger.logAuthorizationEvent(
    req.user.id,
    'ROLE_CHANGED',
    `User ${userId}`,
    true,
    reason,
    {
      targetUserId: userId,
      oldRole,
      newRole,
      changedBy: req.user.email
    }
  );

  return user;
};
```

---

### 5. Separate Development and Production Roles
Never use production admin accounts in development.

**Environment-Specific Roles:**
```javascript
// .env.development
DEFAULT_ADMIN_EMAIL=dev-admin@localhost
ALLOW_ROLE_ESCALATION=true  // For testing only

// .env.production
DEFAULT_ADMIN_EMAIL=admin@alawael.com
ALLOW_ROLE_ESCALATION=false  // Strict production
```

---

## 🔐 Password and Token Security

### 1. Secure Token Storage
```javascript
// ❌ NEVER store in localStorage (vulnerable to XSS)
localStorage.setItem('token', jwt);

// ✅ Store in httpOnly cookie (XSS-safe)
res.cookie('authToken', jwt, {
  httpOnly: true,
  secure: true,  // HTTPS only
  sameSite: 'strict',
  maxAge: 3600000  // 1 hour
});
```

### 2. Token Rotation
```javascript
// Rotate tokens on sensitive operations
const rotateToken = async (req, res) => {
  const oldToken = req.user;

  // Issue new token
  const newToken = jwt.sign(
    { userId: oldToken.userId, role: oldToken.role },
    SECRET_KEY,
    { expiresIn: '1h' }
  );

  // Invalidate old token (use Redis blacklist)
  await redis.set(`blacklist:${oldToken.jti}`, '1', 'EX', 3600);

  return newToken;
};
```

### 3. Password Hashing
```javascript
const bcrypt = require('bcrypt');

// Always use high salt rounds (minimum 12)
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};
```

---

## 📋 Audit Logging Security

### 1. Never Log Sensitive Data
```javascript
// ❌ BAD: Logs password
auditLogger.logDataAccess(
  userId,
  'UPDATE',
  'users',
  'user_data',
  1,
  { password: 'secret123' }  // NEVER LOG PASSWORDS!
);

// ✅ GOOD: Sanitized details
auditLogger.logDataAccess(
  userId,
  'UPDATE',
  'users',
  'user_data',
  1,
  { fields: ['email', 'name'], passwordChanged: true }  // Safe
);
```

### 2. Protect Audit Log Files
```bash
# Set strict permissions on audit log directory
chmod 700 /path/to/audit/logs
chown app-user:app-group /path/to/audit/logs

# Only root and app can read
-rwx------ 1 app-user app-group audit-2026-03-02.jsonl
```

### 3. Encrypt Audit Logs at Rest
```javascript
const crypto = require('crypto');

// Encrypt sensitive audit data before writing
const encryptAuditLog = (logEntry, key) => {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(JSON.stringify(logEntry), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

// Write encrypted log
fs.appendFileSync(
  auditFile,
  encryptAuditLog(event, AUDIT_ENCRYPTION_KEY) + '\n'
);
```

### 4. Implement Log Retention Policy
```javascript
// Auto-delete logs older than 90 days (compliance requirement)
const cleanupOldLogs = async () => {
  const retentionDays = 90;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const logFiles = fs.readdirSync(auditDir);

  for (const file of logFiles) {
    const match = file.match(/audit-(\d{4}-\d{2}-\d{2})\.jsonl/);
    if (match) {
      const fileDate = new Date(match[1]);
      if (fileDate < cutoffDate) {
        // Archive before deletion (for compliance)
        await archiveToS3(path.join(auditDir, file));
        // Then delete local copy
        fs.unlinkSync(path.join(auditDir, file));
      }
    }
  }
};
```

---

## 🚨 Security Event Monitoring

### 1. Detect Suspicious Activity
```javascript
// Monitor for brute force attacks
const detectBruteForce = (userId, ipAddress) => {
  const key = `login_attempts:${ipAddress}`;
  const attempts = redis.incr(key);
  redis.expire(key, 300);  // 5 minute window

  if (attempts > 5) {
    // Log security event
    auditLogger.logSecurityEvent(
      'HIGH',
      'BRUTE_FORCE_ATTEMPT',
      `Multiple failed login attempts from ${ipAddress}`,
      { attempts, userId, ipAddress }
    );

    // Block IP temporarily
    redis.set(`blocked:${ipAddress}`, '1', 'EX', 3600);
    return true;
  }

  return false;
};
```

### 2. Monitor Privilege Escalation
```javascript
// Alert on suspicious role changes
app.put('/api/users/:id/role', requireRole('ADMIN'), async (req, res) => {
  const { role } = req.body;
  const targetUser = await User.findById(req.params.id);

  // Flag if non-superadmin tries to create admin
  if (role === 'ADMIN' && !req.user.isSuperAdmin) {
    auditLogger.logSecurityEvent(
      'CRITICAL',
      'PRIVILEGE_ESCALATION_ATTEMPT',
      `User ${req.user.email} attempted to create admin ${targetUser.email}`,
      {
        actor: req.user.id,
        target: targetUser.id,
        attemptedRole: role
      }
    );

    return res.status(403).json({ error: 'Unauthorized privilege escalation' });
  }

  // ... proceed with role change
});
```

### 3. SQL Injection Detection
```javascript
// Detect SQL injection attempts in input
const detectSQLInjection = (input) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/i,
    /(--|\#|\/\*|\*\/)/,
    /(\bOR\b|\bAND\b).*?=.*?=/i,
    /(\bunion\b|\bexec\b|\bexecute\b)/i
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(input)) {
      auditLogger.logSecurityEvent(
        'CRITICAL',
        'SQL_INJECTION_ATTEMPT',
        'SQL injection attempt detected',
        {
          input: input.substring(0, 100),  // Log partial input
          pattern: pattern.toString()
        }
      );
      return true;
    }
  }

  return false;
};

// Validate all user input
app.use((req, res, next) => {
  const inputs = [...Object.values(req.body), ...Object.values(req.query)];

  for (const input of inputs) {
    if (typeof input === 'string' && detectSQLInjection(input)) {
      return res.status(400).json({ error: 'Invalid input detected' });
    }
  }

  next();
});
```

### 4. XSS Protection
```javascript
const xss = require('xss');

// Sanitize all user input to prevent XSS
const sanitizeInput = (data) => {
  if (typeof data === 'string') {
    return xss(data);
  }
  if (typeof data === 'object') {
    return Object.keys(data).reduce((acc, key) => {
      acc[key] = sanitizeInput(data[key]);
      return acc;
    }, {});
  }
  return data;
};

app.use((req, res, next) => {
  req.body = sanitizeInput(req.body);
  req.query = sanitizeInput(req.query);
  next();
});
```

---

## 🔍 Frontend Security

### 1. Never Trust Client-Side Checks
```jsx
// ❌ BAD: Only client-side permission check
function DeleteButton() {
  const { hasPermission } = useRBAC();

  // Attacker can bypass this in browser
  if (!hasPermission('delete:quality')) {
    return null;
  }

  return <button onClick={handleDelete}>Delete</button>;
}

// ✅ GOOD: Client + server checks
function DeleteButton() {
  const { hasPermission } = useRBAC();

  const handleDelete = async () => {
    try {
      // Server validates permission again
      await axios.delete('/api/quality/metrics/123');
    } catch (err) {
      if (err.response?.status === 403) {
        alert('Permission denied');
      }
    }
  };

  // Client-side check is for UX only
  if (!hasPermission('delete:quality')) {
    return null;
  }

  return <button onClick={handleDelete}>Delete</button>;
}
```

### 2. Secure API Communication
```javascript
// Always use HTTPS in production
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Validate SSL certificates
if (process.env.NODE_ENV === 'production') {
  apiClient.defaults.httpsAgent = new https.Agent({
    rejectUnauthorized: true  // Reject invalid certs
  });
}
```

### 3. CSRF Protection
```javascript
// Backend: Set CSRF token
app.use(csrf({ cookie: true }));

app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Frontend: Include CSRF token
const csrfToken = await fetch('/api/csrf-token').then(r => r.json());

axios.defaults.headers.common['X-CSRF-Token'] = csrfToken;
```

---

## 📊 Compliance and Reporting

### 1. GDPR Compliance for Audit Logs
```javascript
// Implement right to be forgotten
const anonymizeUserInAuditLogs = async (userId) => {
  const logFiles = fs.readdirSync(auditDir);

  for (const file of logFiles) {
    const logs = fs.readFileSync(path.join(auditDir, file), 'utf8')
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const log = JSON.parse(line);

        // Anonymize user data
        if (log.userId === userId) {
          log.userId = 'ANONYMIZED';
          log.email = 'anonymized@deleted';
          delete log.details.ipAddress;
        }

        return JSON.stringify(log);
      });

    fs.writeFileSync(path.join(auditDir, file), logs.join('\n') + '\n');
  }
};
```

### 2. Generate Compliance Reports
```javascript
// Generate monthly security audit report
const generateSecurityReport = async (month, year) => {
  const stats = await auditLogger.getAuditStats(30);

  const report = {
    period: `${year}-${month}`,
    generatedAt: new Date().toISOString(),

    summary: {
      totalEvents: stats.totalEvents,
      securityEvents: stats.securityEvents,
      failureRate: stats.failureRate
    },

    security: {
      criticalEvents: stats.recentCritical.length,
      bruteForceAttempts: stats.byType.BRUTE_FORCE_ATTEMPT || 0,
      sqlInjectionAttempts: stats.byType.SQL_INJECTION_ATTEMPT || 0,
      xssAttempts: stats.byType.XSS_ATTEMPT || 0
    },

    access: {
      totalRoleChanges: stats.byCategory.AUTHORIZATION || 0,
      failedAuthAttempts: stats.byCategory.AUTHENTICATION || 0,
      dataAccessEvents: stats.byCategory.DATA_ACCESS || 0
    },

    recommendations: generateRecommendations(stats)
  };

  // Export as PDF for management
  await exportReportToPDF(report, `security-report-${year}-${month}.pdf`);

  return report;
};
```

---

## ✅ Security Checklist

### Pre-Deployment
- [ ] All passwords hashed with bcrypt (12+ rounds)
- [ ] JWT tokens use strong secret keys (256-bit minimum)
- [ ] HTTPS enforced in production
- [ ] CORS properly configured
- [ ] Rate limiting enabled on all endpoints
- [ ] SQL injection protection implemented
- [ ] XSS protection enabled
- [ ] CSRF tokens configured
- [ ] Audit logs encrypted at rest
- [ ] Log retention policy configured (90 days)
- [ ] Security event monitoring active
- [ ] Admin accounts use 2FA (if available)

### Post-Deployment
- [ ] Monitor audit logs daily for suspicious activity
- [ ] Review failed login attempts weekly
- [ ] Audit user roles monthly
- [ ] Generate compliance reports monthly
- [ ] Update dependencies for security patches
- [ ] Conduct penetration testing quarterly
- [ ] Review and rotate secrets annually

### Incident Response
- [ ] Security incident playbook documented
- [ ] Incident response team identified
- [ ] Escalation procedures defined
- [ ] Backup and recovery tested
- [ ] Contact information for security team updated

---

## 🆘 Emergency Procedures

### 1. Compromised User Account
```javascript
// Immediately revoke all user sessions
const revokeUserSessions = async (userId) => {
  // 1. Blacklist all active tokens
  const activeSessions = await redis.keys(`session:${userId}:*`);
  for (const session of activeSessions) {
    await redis.del(session);
  }

  // 2. Force password reset
  await User.update(
    { id: userId },
    { passwordResetRequired: true, accountLocked: true }
  );

  // 3. Log security event
  await auditLogger.logSecurityEvent(
    'CRITICAL',
    'ACCOUNT_COMPROMISED',
    `User account ${userId} compromised - all sessions revoked`,
    { userId, action: 'EMERGENCY_LOCKDOWN' }
  );

  // 4. Notify security team
  await notifySecurityTeam({
    severity: 'CRITICAL',
    event: 'ACCOUNT_COMPROMISED',
    userId
  });
};
```

### 2. Suspected Data Breach
```javascript
// Emergency breach response
const handleDataBreach = async () => {
  // 1. Enable emergency mode
  await redis.set('EMERGENCY_MODE', '1');

  // 2. Revoke all active sessions
  await redis.flushdb();

  // 3. Log breach
  await auditLogger.logSecurityEvent(
    'CRITICAL',
    'DATA_BREACH_SUSPECTED',
    'Emergency mode activated - all sessions revoked',
    { timestamp: new Date().toISOString() }
  );

  // 4. Notify all admins
  await notifyAdmins({
    subject: 'CRITICAL: Security Breach Detected',
    message: 'All user sessions have been terminated. Investigate immediately.'
  });

  // 5. Start forensic logging
  await enableEnhancedLogging();
};
```

---

## 📞 Security Contacts

```
Security Team: security@alawael.com
Emergency Hotline: +966-xxx-xxxx (24/7)
Incident Report: https://security.alawael.com/report
```

---

## 📚 Further Reading

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CIS Controls](https://www.cisecurity.org/controls)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [GDPR Compliance Guide](https://gdpr.eu/)
