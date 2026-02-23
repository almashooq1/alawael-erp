# 🔐 ADVANCED SECURITY IMPLEMENTATION GUIDE
## Integrate New Security Features - AlAwael ERP v2.0.0

**Created**: February 22, 2026  
**Status**: Ready for Implementation  
**Estimated Time**: 4-6 hours to integrate all features  

---

## 📦 NEW SECURITY MIDDLEWARE CREATED

### 1. **twoFactorAuth.middleware.js** ✅
Location: `backend/middleware/twoFactorAuth.middleware.js`
- TOTP (Google Authenticator) support
- Backup codes for account recovery
- 2FA enforcement middleware
- QR code generation

### 2. **securityLogging.middleware.js** ✅
Location: `backend/middleware/securityLogging.middleware.js`
- Advanced event logging (18 event types)
- Color-coded severity levels
- Suspicious activity detection
- 7+ day retention with auto-rotation

### 3. **accountSecurity.middleware.js** ✅
Location: `backend/middleware/accountSecurity.middleware.js`
- Account lockout after failed attempts
- Session management (max 3 concurrent)
- Device tracking
- Security reports per user

### 4. **dataProtection.middleware.js** ✅
Location: `backend/middleware/dataProtection.middleware.js`
- AES-256-GCM encryption
- PII masking for non-admins
- GDPR compliance (export/delete)
- Consent management

---

## 🚀 INTEGRATION STEPS

### Step 1: Add Dependencies to package.json

```bash
cd backend
npm install speakeasy qrcode
```

**Why**: Required for 2FA functionality (Google Authenticator compatible)

---

### Step 2: Update Server Configuration

**File**: `backend/server.unified.js`

Add to imports section:
```javascript
// Security middleware imports
const { logger, securityLoggingMiddleware } = require('./middleware/securityLogging.middleware');
const { accountSecurityMiddleware, sessionValidationMiddleware } = require('./middleware/accountSecurity.middleware');
const { dataProtectionMiddleware, sensitiveDateMaskingMiddleware } = require('./middleware/dataProtection.middleware');
const { require2FA } = require('./middleware/twoFactorAuth.middleware');
```

Add after existing middleware (before routes):
```javascript
// Security middleware stack
app.use(dataProtectionMiddleware);
app.use(securityLoggingMiddleware);
app.use(accountSecurityMiddleware);
app.use(sessionValidationMiddleware);

// Detect suspicious patterns
const { detectSuspiciousActivity } = require('./middleware/securityLogging.middleware');
app.use(detectSuspiciousActivity);
```

---

### Step 3: Add 2FA Routes

**File**: `backend/routes/auth.routes.js`

Add new endpoints:
```javascript
const { 
  generate2FASecret, 
  enableUserTwoFactor,
  disableUserTwoFactor,
  regenerateBackupCodes,
  getTwoFactorStatus,
  verify2FAMiddleware
} = require('../middleware/twoFactorAuth.middleware');

// 1. Generate 2FA secret (before enabling)
router.post('/2fa/setup', authenticate, async (req, res) => {
  try {
    const secret = await generate2FASecret(req.user.id, req.user.email);
    res.json({
      message: '2FA secret generated. Scan QR code with authenticator app.',
      secret: secret.secret,
      qrCode: secret.qrCode,
      manualEntryKey: secret.manualEntryKey,
      backupCodes: secret.backupCodes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Enable 2FA (verify secret first)
router.post('/2fa/enable', authenticate, verify2FAMiddleware, enableUserTwoFactor);

// 3. Disable 2FA
router.post('/2fa/disable', authenticate, requirePassword, disableUserTwoFactor);

// 4. Get 2FA status
router.get('/2fa/status', authenticate, getTwoFactorStatus);

// 5. Regenerate backup codes
router.post('/2fa/backup-codes', authenticate, require2FA, regenerateBackupCodes);

// 6. Verify 2FA during login
router.post('/login/verify-2fa', verify2FAMiddleware, (req, res) => {
  res.json({
    message: '2FA verified successfully',
    sessionId: req.session?.sessionId
  });
});
```

---

### Step 4: Protect Sensitive Endpoints

**File**: `backend/routes/admin.routes.js`

```javascript
const { require2FA } = require('../middleware/twoFactorAuth.middleware');
const { getSecurityReport } = require('../middleware/accountSecurity.middleware');

// Require 2FA for sensitive admin operations
router.delete('/users/:id', authenticate, require2FA, adminOnly, async (req, res) => {
  // Delete user logic
});

router.put('/config', authenticate, require2FA, adminOnly, async (req, res) => {
  // Configuration changes
});

// Get security report
router.get('/users/:id/security-report', authenticate, adminOnly, (req, res) => {
  const report = securityManager.getSecurityReport(req.params.id);
  res.json(report);
});
```

---

### Step 5: Data Protection on User Routes

**File**: `backend/routes/user.routes.js`

```javascript
const { DataProtectionManager } = require('../middleware/dataProtection.middleware');

// Export user data (GDPR)
router.get('/export-data', authenticate, (req, res) => {
  const exportData = DataProtectionManager.createUserDataExport(req.user);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=data-export.json');
  res.send(exportData);
});

// Delete account (GDPR right to be forgotten)
router.post('/delete-account', authenticate, requirePassword, async (req, res) => {
  try {
    const anonymized = DataProtectionManager.anonymizeUserData(req.user);
    await User.findByIdAndUpdate(req.user.id, anonymized);
    
    res.json({
      message: 'Your account has been anonymized. Data will be permanently deleted in 30 days.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get consent status
router.get('/consent', authenticate, (req, res) => {
  const consents = ConsentManager.getUserConsents(req.user.id);
  res.json(consents);
});

// Set consent
router.post('/consent', authenticate, (req, res) => {
  const { consentType, value } = req.body;
  const result = ConsentManager.setUserConsent(req.user.id, consentType, value);
  res.json(result);
});
```

---

### Step 6: Environment Variables Configuration

**File**: `.env.production`

Add to your environment:
```bash
# Two-Factor Authentication
TWO_FACTOR_WINDOW=2

# Account Security
MAX_LOGIN_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15
SESSION_TIMEOUT_MINUTES=30
MAX_SESSIONS_PER_USER=3

# Data Protection
ENCRYPTION_KEY=<generate-with-crypto.randomBytes(32).toString('hex')>
DATA_RETENTION_DAYS=365

# Security Logging
LOG_RETENTION_DAYS=90
SECURITY_LOG_DIR=./logs/security

# Compliance
GDPR_ENABLED=true
DATA_PROCESSING_CONSENT_REQUIRED=true
```

**Generate ENCRYPTION_KEY**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### Step 7: Update User Model

**File**: `backend/models/User.model.js`

Add fields to schema:
```javascript
const userSchema = new Schema({
  // ... existing fields ...

  // Two-Factor Authentication
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, select: false }, // Not returned by default
  twoFactorBackupCodes: { type: [String], select: false },
  twoFactorEnabledAt: { type: Date },

  // Account Security
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  passwordChangedAt: { type: Date },
  lastLoginAt: { type: Date },
  lastLoginIP: { type: String },

  // Data Protection & GDPR
  anonymized: { type: Boolean, default: false },
  anonymizedAt: { type: Date },
  consentDataProcessing: { type: Boolean, default: false },
  consentAnalytics: { type: Boolean, default: false },
  consentMarketing: { type: Boolean, default: false },
  consentUpdatedAt: { type: Date },
  
  // Compliance
  dataExportedAt: { type: Date },
  deleteRequestedAt: { type: Date }
});

// Add methods
userSchema.methods.verify2FA = async function(token) {
  const { verify2FAToken } = require('../middleware/twoFactorAuth.middleware');
  return verify2FAToken(this.twoFactorSecret, token);
};

userSchema.methods.recordFailedLogin = function(ip) {
  const { securityManager } = require('../middleware/accountSecurity.middleware');
  return securityManager.recordFailedLogin(this._id, ip);
};

userSchema.methods.getSecurityReport = function() {
  const { securityManager } = require('../middleware/accountSecurity.middleware');
  return securityManager.getSecurityReport(this._id);
};
```

---

### Step 8: Add Security Headers

**File**: `backend/server.unified.js`

Update Helmet configuration:
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.alawael.com"]
    }
  },
  hsts: {
    maxAge: 31536000,           // 1 year
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  permissionsPolicy: {
    geolocation: [],
    microphone: []
  }
}));
```

---

### Step 9: API Endpoint Protection

**File**: `backend/routes/sensitive.routes.js`

```javascript
const { 
  require2FA, 
  logAuthAttempt, 
  logPermissionDenied 
} = require('../middleware/securityLogging.middleware');

// Require 2FA for ultra-sensitive operations
router.post('/financial/transfer', 
  authenticate, 
  require2FA,  // Require 2FA
  async (req, res) => {
    // Verify additional data
    // Process transfer
  }
);

// Require 2FA for bulk operations
router.delete('/bulk-delete', 
  authenticate, 
  require2FA,  // Require 2FA
  adminOnly,
  async (req, res) => {
    // Log the operation
    const { logger } = require('../middleware/securityLogging.middleware');
    logger.logEvent('BULK_DELETE', {
      userId: req.user.id,
      username: req.user.username,
      ip: req.ip,
      action: 'Bulk delete requested',
      details: { count: req.body.ids?.length }
    });
    
    // Perform bulk delete
  }
);
```

---

## 📊 Testing & Verification

### Test 2FA Flow
```bash
# 1. Generate 2FA secret
curl -X POST http://localhost:3000/api/v1/auth/2fa/setup \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"

# 2. Scan QR code with Google Authenticator

# 3. Enable 2FA (provide token from app)
curl -X POST http://localhost:3000/api/v1/auth/2fa/enable \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"token": "<current-totp-token>"}'

# 4. Verify 2FA status
curl -X GET http://localhost:3000/api/v1/auth/2fa/status \
  -H "Authorization: Bearer <token>"
```

### Test Account Lockout
```bash
# 1. Try login 5+ times with wrong password
curl -X POST http://localhost:3000/api/v1/auth/login \
  -d '{"email":"user@example.com", "password":"wrong"}' \
  -H "Content-Type: application/json"

# Expected: Account locked for 15 minutes on 5th attempt
```

### Test Data Export (GDPR)
```bash
# Export user data
curl -X GET http://localhost:3000/api/v1/user/export-data \
  -H "Authorization: Bearer <token>" \
  > user-data-export.json
```

### Test Security Logging
```bash
# Check security logs
ls -lah logs/security/

# View today's security events
cat logs/security/security-2026-02-22.log | jq
```

---

## 🎯 Verification Checklist

**After Integration**:
- [ ] 2FA working for admin accounts
- [ ] Account lockout triggers after 5 failed attempts
- [ ] Security logs being written to disk
- [ ] PII fields are masked for non-admins
- [ ] GDPR data export functioning
- [ ] Delete account anonymization working
- [ ] Session management limiting to 3 concurrent
- [ ] npm audit showing 0 vulnerabilities
- [ ] All tests still passing
- [ ] Security headers verified via curl

---

## 📈 Performance Impact

**Expected Results After Integration**:

| Feature | Performance Overhead | Benefit |
|---------|---------------------|---------|
| 2FA | <1ms per request | Prevent account takeover |
| Account Security | <2ms per request | Brute force protection |
| Security Logging | <5ms per request | Audit trail + threat detection |
| Data Protection | <3ms (encrypted fields) | GDPR compliance + data privacy |
| **Total Overhead** | **~10ms per request** | **Comprehensive security** |

**Net Effect**: Negligible impact due to async logging

---

## 🔄 Next Steps After Integration

1. **Run Tests**: `npm test` (ensure all tests pass)
2. **Security Audit**: `npm audit`
3. **Load Testing**: Run performance test again
4. **Documentation**: Update API docs with new endpoints
5. **Deployment**: Re-create Docker image with new features
6. **Monitoring**: Setup alerts for security events
7. **User Communication**: Inform users about 2FA option

---

## 🆘 Troubleshooting

### Issue: 2FA QR code not displaying
```javascript
// Ensure qrcode is installed
npm install qrcode

// Verify in routes
const QRCode = require('qrcode');
```

### Issue: Encryption errors
```javascript
// Ensure ENCRYPTION_KEY is set
console.log('Key length:', process.env.ENCRYPTION_KEY?.length); // Should be 64

// Regenerate if needed
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Issue: Session validation failing
```javascript
// Ensure sessions middleware is configured
// app.use(session({ ... }))

// Check session store (Redis/MongoDB)
// Verify sessionId is being set after login
```

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/Top10)
- [GDPR Compliance Guide](https://gdpr-info.eu)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Speakeasy TOTP Library](https://github.com/speakeasyjs/speakeasy)

---

## 💾 Backup & Recovery

Before implementing, create backups:
```bash
# Backup .env file
cp .env .env.backup.$(date +%s)

# Backup database
mongodump --uri="mongodb://..." --out=backup-$(date +%s)

# Commit current code
git add .
git commit -m "Backup before security middleware integration"
```

---

**Status**: 🟢 **READY FOR IMPLEMENTATION**  
**Effort**: 4-6 hours  
**Complexity**: Medium  
**Testing Time**: 1-2 hours  

