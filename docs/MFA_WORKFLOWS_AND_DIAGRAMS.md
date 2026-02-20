# MFA System - Workflows & Diagrams
# مخططات وسير عمل نظام MFA

## 1. TOTP Setup Workflow

```
User Request TOTP Setup
          ↓
Generate Secret & QR Code
          ↓
Display QR Code to User
          ↓
User scans with authenticator app
          ↓
User enters 6-digit code
          ↓
Verify TOTP code against secret
          ↓
✅ Valid → Generate backup codes
❌ Invalid → Ask for retry
          ↓
Save settings to database
          ↓
Display backup codes to user
          ↓
Setup Complete
```

### Key Functions Called

```javascript
// Backend flow
mfaService.generateTOTPSecret(userEmail)
  → Returns: { secret, qrCode, manualEntryKey }

mfaService.verifyTOTP(token, secret)
  → Returns: boolean

mfaService.generateBackupCodes()
  → Returns: [code1, code2, ...]

MFASettings.findOneAndUpdate(mfaData)
  → Saves to database
```

---

## 2. Email OTP Verification Flow

```
User Initiates Email OTP Setup
          ↓
Generate 6-digit OTP code
          ↓
Hash code with SHA256
          ↓
Send email with code
          ↓
Log OTP attempt in database
          ↓
User receives email
          ↓
User enters code in UI
          ↓
Compare user input with stored hash
(using timing-safe comparison)
          ↓
✅ Valid → Mark as verified, enable method
❌ Invalid → Increment attempts, ask retry
          ↓
Setup Complete or Max Attempts Exceeded
```

### API Call Sequence

```javascript
POST /api/mfa/email/initiate
  → mfaService.generateEmailOTP()
  → emailService.sendOTPEmail()
  → OTPLog.create()
  → Response: { expiresIn, recipient }

POST /api/mfa/email/verify
  → OTPLog.findOne()
  → mfaService.verifyOTP()
  → MFASettings.findOneAndUpdate()
  → Response: { success, message }
```

---

## 3. SMS OTP Verification Flow

```
User Selects SMS OTP
          ↓
User enters phone number + country code
          ↓
Generate 6-digit OTP
          ↓
Call SMS service (Twilio, etc.)
          ↓
SMS sent to user
          ↓
Log delivery attempt
          ↓
User receives SMS
          ↓
User enters 6-digit code
          ↓
Verify code (constant-time comparison)
          ↓
✅ Valid → Enable SMS OTP method
❌ Invalid → Track attempt, allow retry
          ↓
Setup Complete
```

---

## 4. Login with MFA Flow

```
User enters email + password
          ↓
Validate credentials
          ↓
Check if user has MFA enabled
          ↓
✅ Yes → Create MFA session → Send OTP → Return sessionId
❌ No → Generate JWT token → Return token → Login complete
          ↓
User receives OTP via email/SMS/prompt
User enters OTP code
          ↓
POST /api/mfa/login/verify
          ↓
Validate MFA session (exists, not expired, attempts < max)
          ↓
Get user's MFA settings
          ↓
Verify code based on method (TOTP/Email/SMS/Backup)
          ↓
✅ Valid → Mark session as verified
          ↓
Generate JWT token
          ↓
Return token to client
          ↓
Client stores token, logs in
          ↓
Login Complete
```

### Code Example

```javascript
// Backend login flow (auth controller)
async function login(req, res) {
  const { email, password } = req.body;
  
  // Validate credentials
  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.comparePassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Check MFA
  const mfaSettings = await MFASettings.findOne({ userId: user._id });
  
  if (mfaSettings?.totp?.enabled || mfaSettings?.emailOTP?.enabled) {
    // Create MFA session
    const sessionId = crypto.randomBytes(16).toString('hex');
    const session = await MFASession.create({
      sessionId,
      userId: user._id,
      method: mfaSettings.primaryMethod,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    
    // Send OTP if email/SMS
    if (mfaSettings.emailOTP?.enabled) {
      const otp = mfaService.generateEmailOTP();
      await emailService.sendOTPEmail(user.email, otp.code);
    }
    
    return res.json({
      requireMFA: true,
      sessionId,
      methods: Object.keys({
        ...(mfaSettings.totp?.enabled && { totp: true }),
        ...(mfaSettings.emailOTP?.enabled && { email: true }),
        ...(mfaSettings.smsOTP?.enabled && { sms: true }),
      }),
    });
  }
  
  // No MFA, generate token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  return res.json({ token, requireMFA: false });
}
```

---

## 5. Trusted Device Flow

```
User logged in successfully
          ↓
User selects "Trust this device"
          ↓
System generates device fingerprint
  (browser user agent + custom data)
          ↓
Create device entry in database
          ↓
Generate secure device token
          ↓
Set token expiration (30 days default)
          ↓
Client stores device token
  (localStorage or secure cookie)
          ↓
Future Logins:
  User enters credentials
          ↓
  System detects MFA requirement
          ↓
  Check for device token in request
          ↓
  Find matching trusted device
          ↓
  ✅ Device found, valid, not expired
    → Skip MFA, login complete
  ❌ Device not found or expired
    → Require MFA verification
```

---

## 6. Account Recovery Flow

```
User loses access to MFA device
          ↓
User clicks "Can't access authenticator?"
          ↓
Enter backup code / recovery key
          ↓
System verifies backup code
  (only works once, is hashed)
          ↓
✅ Valid → Log recovery event
          ↓
Generate new recovery key
          ↓
Require password reset
          ↓
Regenerate backup codes
          ↓
Log recovery in audit trail
(for admin review if needed)
          ↓
Account access restored
```

---

## 7. Data Flow Diagram

```
┌─────────────────────────────────────────────┐
│          CLIENT (Browser)                   │
│  - React Components                         │
│  - User Interaction                         │
│  - Token/Device Token Storage               │
└──────────────┬──────────────────────────────┘
               │ HTTPS Requests
               ↓
┌─────────────────────────────────────────────┐
│     SERVER (Node.js/Express)                │
│  ┌────────────────────────────────────────┐ │
│  │ Routes (mfa.js)                        │ │
│  │ - /api/mfa/*                           │ │
│  └────────────┬─────────────────────────┘ │
│               ↓                             │
│  ┌────────────────────────────────────────┐ │
│  │ Middleware (mfaAuth.js)                │ │
│  │ - checkMFAStatus                       │ │
│  │ - requireMFA                           │ │
│  │ - checkTrustedDevice                   │ │
│  └────────────┬─────────────────────────┘ │
│               ↓                             │
│  ┌────────────────────────────────────────┐ │
│  │ Controllers (mfaController.js)         │ │
│  │ - Setup handlers                       │ │
│  │ - Verification handlers                │ │
│  │ - Settings handlers                    │ │
│  └────────────┬─────────────────────────┘ │
│               ↓                             │
│  ┌────────────────────────────────────────┐ │
│  │ Services                               │ │
│  │ - mfaService.js                        │ │
│  │ - emailService.js                      │ │
│  │ - smsService.js                        │ │
│  └────────────┬─────────────────────────┘ │
│               ↓                             │
└────────────────┬──────────────────────────┘
                 │
    ┌────────────┼────────────┐
    ↓            ↓            ↓
┌─────────┐  ┌────────┐  ┌──────────┐
│ MongoDB │  │ Email  │  │ SMS      │
│ (Data)  │  │ Service│  │ Service  │
└─────────┘  └────────┘  └──────────┘
```

---

## 8. Security Flow

```
User submits OTP code
          ↓
├─ Input Validation
│  └─ Check format (6 digits / XXXX-XXXX)
│
├─ Rate Limiting
│  └─ Verify attempts < max (5)
│
├─ Session Validation
│  └─ Check session exists, not expired
│
├─ Code Verification
│  ├─ Hash submitted code: SHA256
│  ├─ Constant-time comparison with stored hash
│  └─ Timing-attack resistant
│
├─ Audit Logging
│  ├─ Log attempt (success/failure)
│  ├─ IP address
│  ├─ User agent
│  └─ Timestamp
│
└─ Authorization
   └─ Issue session token if valid
```

---

## 9. Database Schema Overview

```
User (existing)
  ├─ twoFactorEnabled: Boolean
  ├─ twoFactorSecret: String (encrypted)
  └─ lastLogin: Date

MFASettings (new)
  ├─ userId: ObjectId (unique)
  ├─ totp: { enabled, secret, verifiedAt, ... }
  ├─ emailOTP: { enabled, verifiedAt, ... }
  ├─ smsOTP: { enabled, phoneNumber, ... }
  ├─ backupCodes: [{ code (hashed), used, usedAt }]
  ├─ trustedDevices: [{ deviceId, token, expiresAt, ... }]
  └─ auditLog: [{ action, status, timestamp, ... }]

MFASession (new, TTL: 15 minutes)
  ├─ sessionId: String (unique)
  ├─ userId: ObjectId
  ├─ method: String (totp/email/sms)
  ├─ status: String (pending/verified/expired)
  ├─ otpHash: String
  ├─ attempts: Number
  └─ expiresAt: Date

OTPLog (new, TTL: 30 days)
  ├─ userId: ObjectId
  ├─ method: String
  ├─ recipient: String (email/phone)
  ├─ otpHash: String
  ├─ status: String
  ├─ verifiedAt: Date
  └─ verificationAttempts: Number

TrustedDevice (new)
  ├─ userId: ObjectId
  ├─ deviceId: String (unique)
  ├─ fingerprint: String
  ├─ token: String (unique)
  ├─ expiresAt: Date
  └─ lastUsedAt: Date

MFAAuditLog (new, TTL: 90 days)
  ├─ userId: ObjectId
  ├─ action: String
  ├─ status: String
  ├─ method: String
  ├─ ipAddress: String
  ├─ userAgent: String
  └─ createdAt: Date (auto-indexed)
```

---

## 10. Common Implementation Patterns

### Pattern 1: Protected Endpoint with MFA

```javascript
// Route: POST /api/sensitive-action
const { protect } = require('./middleware/auth');
const { requireMFA } = require('./middleware/mfaAuth');

router.post('/sensitive-action',
  protect,                    // Authenticate user
  requireMFA,                 // Require MFA verification
  async (req, res) => {
    // User is authenticated and MFA verified
    // Safe to proceed with sensitive operation
  }
);
```

### Pattern 2: Optional Trusted Device Bypass

```javascript
router.post('/login',
  async (req, res) => {
    const { email, password, deviceToken } = req.body;
    
    // 1. Verify credentials
    const user = await authenticateUser(email, password);
    
    // 2. Check if device is trusted
    if (deviceToken) {
      const device = await TrustedDevice.findOne({
        userId: user._id,
        token: deviceToken,
        expiresAt: { $gt: new Date() }
      });
      
      if (device) {
        // Skip MFA, generate token
        return res.json({ token: generateJWT(user) });
      }
    }
    
    // 3. Require MFA
    const session = await createMFASession(user._id);
    return res.json({ requireMFA: true, sessionId: session.id });
  }
);
```

### Pattern 3: Action-Specific MFA Verification

```javascript
const { verifyMFAForAction } = require('./middleware/mfaAuth');

// Route: POST /api/export-data
router.post('/export-data',
  protect,
  verifyMFAForAction('dataExport'),
  async (req, res) => {
    // User verified MFA for data export
    // Safe to export sensitive data
  }
);
```

### Pattern 4: MFA Setup Wizard in Frontend

```jsx
function MFASetupFlow() {
  const [stage, setStage] = useState('method');
  
  const handleMethodSelect = async (method) => {
    if (method === 'totp') {
      const response = await api.post('/api/mfa/totp/initiate');
      setQRCode(response.data.qrCode);
      setStage('totp-verify');
    }
  };
  
  const handleVerify = async (code) => {
    const response = await api.post('/api/mfa/totp/verify', {
      token: code,
      secret: qrCode.secret
    });
    setBackupCodes(response.data.backupCodes);
    setStage('backup-codes');
  };
  
  return (
    <>
      {stage === 'method' && <MethodSelection />}
      {stage === 'totp-verify' && <TOTPVerification />}
      {stage === 'backup-codes' && <BackupCodes />}
    </>
  );
}
```

---

## 11. Error Handling Flow

```
MFA Request
        ↓
        ├─ ValidationError
        │  └─ Return 400 with details
        │
        ├─ AuthenticationError
        │  ├─ User not authenticated
        │  └─ Return 401
        │
        ├─ SessionError
        │  ├─ Session expired
        │  ├─ Session not found
        │  └─ Return 403
        │
        ├─ VerificationError
        │  ├─ Invalid MFA code
        │  ├─ Maximum attempts exceeded
        │  └─ Return 400 with attemptsRemaining
        │
        ├─ ServiceError
        │  ├─ Email delivery failed
        │  ├─ SMS delivery failed
        │  └─ Return 500 with error details
        │
        └─ UnknownError
           └─ Return 500 with generic message
```

---

## 12. Performance Optimization Tips

1. **Database Indices**
   ```javascript
   // Essential indices for performance
   MFASettings.collection.createIndex({ userId: 1 });
   MFASession.collection.createIndex({ sessionId: 1 });
   MFASession.collection.createIndex({ userId: 1 });
   OTPLog.collection.createIndex({ userId: 1, createdAt: 1 });
   TrustedDevice.collection.createIndex({ userId: 1 });
   ```

2. **Caching**
   ```javascript
   // Cache MFA settings to reduce database hits
   const mfaSettings = await redis.get(`mfa:${userId}`);
   if (!mfaSettings) {
     mfaSettings = await MFASettings.findOne({ userId });
     await redis.setex(`mfa:${userId}`, 3600, mfaSettings);
   }
   ```

3. **Connection Pooling**
   ```javascript
   // Use connection pooling for better performance
   mongoose.connect(uri, {
     maxPoolSize: 10,
     minPoolSize: 5
   });
   ```

---

## 13. Monitoring & Alerting

```
Key Metrics to Monitor:
  ├─ MFA Activation Rate
  │  └─ % of users with MFA enabled
  │
  ├─ Verification Success Rate
  │  └─ % of successful MFA verifications
  │
  ├─ Failed Verification Attempts
  │  └─ Alert if > 1000 per hour
  │
  ├─ OTP Delivery Success Rate
  │  └─ Email/SMS delivery failures
  │
  ├─ API Response Times
  │  └─ Alert if > 1000ms
  │
  └─ Error Rates
     └─ Alert on spikes
```

---

**Last Updated:** February 2026
**Version:** 1.0.0
