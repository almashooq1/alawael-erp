# Multi-Factor Authentication (MFA) Implementation Guide
# دليل تطبيق المصادقة متعددة العوامل (MFA)

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Installation](#installation)
5. [API Endpoints](#api-endpoints)
6. [Frontend Integration](#frontend-integration)
7. [Configuration](#configuration)
8. [Security Best Practices](#security-best-practices)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This comprehensive MFA system provides multiple authentication methods to enhance account security:

- **TOTP (Time-based One-Time Password)**: Using authenticator apps
- **Email OTP**: Verification codes sent via email
- **SMS OTP**: Verification codes sent via text message
- **Backup Codes**: Recovery codes for account access
- **Trusted Devices**: Remember devices for a set period

### Key Features

✅ Multiple authentication methods
✅ Flexible setup wizard
✅ Secure OTP generation and verification
✅ Trusted device management
✅ Comprehensive audit logging
✅ Account recovery mechanisms
✅ Security scoring system
✅ Responsive UI components

---

## Architecture

### Backend Structure

```
backend/
├── services/
│   └── mfaService.js           # Core MFA logic
├── models/
│   └── mfa.models.js           # MongoDB schemas
├── controllers/
│   └── mfaController.js        # API handlers
├── middleware/
│   └── mfaAuth.js              # MFA verification middleware
└── routes/
    └── mfa.js                  # API routes
```

### Frontend Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── MFASetup.jsx        # Setup wizard
│   │   ├── MFAVerification.jsx # Login verification
│   │   └── MFASettings.jsx     # Settings management
│   └── css/
│       ├── MFASetup.css
│       ├── MFAVerification.css
│       └── MFASettings.css
```

### Database Models

#### MFASettings
Stores user's MFA configuration and preferences.

```javascript
{
  userId: ObjectId,
  totp: { enabled, secret, verifiedAt, backupCodesGenerated },
  emailOTP: { enabled, verifiedAt },
  smsOTP: { enabled, phoneNumber, countryCode, verifiedAt },
  backupCodes: [{ code, used, usedAt }],
  trustedDevices: [...],
  security: { requireMFAForSensitiveActions, rememberDeviceFor },
  auditLog: [...]
}
```

#### MFASession
Temporary sessions for MFA verification process.

```javascript
{
  sessionId: String,
  userId: ObjectId,
  method: String,  // 'totp', 'email', 'sms', 'backup'
  status: String,  // 'pending', 'verified', 'expired', 'failed'
  otpCode: String,
  expiresAt: Date,
  attempts: Number
}
```

---

## Features

### 1. TOTP (Authenticator App)

**Setup Process:**
1. User initiates TOTP setup
2. System generates secret and QR code
3. User scans QR code with authenticator app
4. User verifies with 6-digit code
5. System generates backup codes

**Advantages:**
- Works offline
- No server-side token needed
- Time-synchronized across devices

### 2. Email OTP

**Setup Process:**
1. User initiates setup
2. System sends 6-digit code to email
3. User enters code to verify
4. Email OTP is enabled

**Configuration:**
```javascript
// Expiration: 5 minutes
// Resend available after 30 seconds
```

### 3. SMS OTP

**Setup Process:**
1. User enters phone number and country code
2. System sends 6-digit code via SMS
3. User enters code to verify
4. SMS OTP is enabled

**Supported Countries:**
- Saudi Arabia (+966)
- UAE (+971)
- Qatar (+974)
- And many more...

### 4. Backup Codes

- 10 codes generated during setup
- Each code can only be used once
- Used for account recovery
- Codes are hashed before storage

### 5. Trusted Devices

- Users can mark devices as trusted
- Skips MFA verification for period (default: 30 days)
- Device fingerprinting for security
- Users can revoke trust anytime

---

## Installation

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install speakeasy qrcode

# Frontend
cd frontend
npm install axios
```

### 2. Update .env File

```env
# MFA Settings
MFA_OTP_EXPIRATION=300000          # 5 minutes
MFA_SESSION_DURATION=900000        # 15 minutes
MFA_BACKUP_CODES_COUNT=10
MFA_TRUSTED_DEVICE_DURATION=2592000000  # 30 days

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SMS Service (Optional)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### 3. Add Routes to Main App

```javascript
const mfaRoutes = require('./routes/mfa');
app.use('/api/mfa', mfaRoutes);
```

### 4. Import MFA Middleware

```javascript
const { 
  checkMFAStatus, 
  requireMFA, 
  checkTrustedDevice,
  verifyMFAForAction 
} = require('./middleware/mfaAuth');
```

---

## API Endpoints

### Setup Endpoints

#### 1. Get Setup Guide
```
GET /api/mfa/setup-guide
Response:
{
  "totp": { "name", "description", "steps", "advantages" },
  "email": { ... },
  "sms": { ... }
}
```

#### 2. Initiate TOTP Setup
```
POST /api/mfa/totp/initiate
Authorization: Bearer {token}

Response:
{
  "qrCode": "data:image/png;base64,...",
  "manualEntryKey": "JBSWY3DPEBLW64TMMQ======",
  "setupInstructions": { ... }
}
```

#### 3. Verify and Enable TOTP
```
POST /api/mfa/totp/verify
Authorization: Bearer {token}
Body: {
  "token": "123456",
  "secret": "JBSWY3DPEBLW64TMMQ======"
}

Response:
{
  "backupCodes": ["XXXX-XXXX", ...],
  "message": "TOTP enabled successfully"
}
```

#### 4. Initiate Email OTP
```
POST /api/mfa/email/initiate
Authorization: Bearer {token}

Response:
{
  "expiresIn": 300,
  "recipient": "user@example.com"
}
```

#### 5. Verify Email OTP
```
POST /api/mfa/email/verify
Authorization: Bearer {token}
Body: { "code": "123456" }

Response:
{
  "message": "Email OTP enabled successfully"
}
```

#### 6. Initiate SMS OTP
```
POST /api/mfa/sms/initiate
Authorization: Bearer {token}
Body: {
  "phoneNumber": "5xxxxxxxx",
  "countryCode": "+966"
}
```

#### 7. Verify SMS OTP
```
POST /api/mfa/sms/verify
Authorization: Bearer {token}
Body: {
  "code": "123456",
  "phoneNumber": "5xxxxxxxx",
  "countryCode": "+966"
}
```

### Verification Endpoints

#### Login MFA Verification
```
POST /api/mfa/login/verify
Body: {
  "sessionId": "xxx",
  "token": "123456",
  "method": "totp"
}

Response:
{
  "verified": true,
  "userId": "xxx"
}
```

### Settings Endpoints

#### Get MFA Settings
```
GET /api/mfa/settings
Authorization: Bearer {token}

Response: { MFASettings object }
```

#### Disable MFA Method
```
POST /api/mfa/settings/disable-method
Authorization: Bearer {token}
Body: { "method": "totp" }
```

### Trusted Device Endpoints

#### Trust Device
```
POST /api/mfa/device/trust
Authorization: Bearer {token}
Body: {
  "deviceName": "My Laptop",
  "deviceFingerprint": "xxx"
}

Response: {
  "deviceToken": "xxx",
  "expiresAt": "2025-03-20T10:00:00Z"
}
```

#### Get Trusted Devices
```
GET /api/mfa/device/list
Authorization: Bearer {token}

Response: [{ device objects }]
```

#### Revoke Trusted Device
```
DELETE /api/mfa/device/{deviceId}
Authorization: Bearer {token}
```

---

## Frontend Integration

### 1. MFA Setup Component

```jsx
import MFASetup from './components/MFASetup';

// In your settings page
<MFASetup />
```

### 2. MFA Verification Component

```jsx
import MFAVerification from './components/MFAVerification';

// During login flow
{showMFAVerification && (
  <MFAVerification 
    sessionId={sessionId}
    onVerificationSuccess={handleLoginSuccess}
    onCancel={handleCancel}
  />
)}
```

### 3. MFA Settings Component

```jsx
import MFASettings from './components/MFASettings';

// In settings page
<MFASettings />
```

### 4. Update Authentication Flow

```javascript
// Login flow
const handleLogin = async (email, password) => {
  try {
    const response = await api.post('/auth/login', {
      email,
      password
    });
    
    if (response.data.requireMFA) {
      // Show MFA verification
      setMFASession(response.data.sessionId);
      setShowMFAVerification(true);
    } else {
      // Login successful
      localStorage.setItem('authToken', response.data.token);
      navigate('/dashboard');
    }
  } catch (error) {
    setError(error.message);
  }
};
```

---

## Configuration

### Environment Variables

```env
# MFA Configuration
MFA_ENABLED=true
MFA_OTP_EXPIRATION=300000          # 5 minutes
MFA_BACKUP_CODES_COUNT=10
MFA_REQUIRE_MFA_FOR_SENSITIVE=true

# Token Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d

# Session Configuration
SESSION_TIMEOUT=15m
TRUSTED_DEVICE_DURATION=30d

# Email Service
EMAIL_FROM=noreply@example.com
EMAIL_SERVICE=gmail

# SMS Service
SMS_SERVICE=twilio
```

### Security Settings

```javascript
// In MFASettings
{
  requireMFA: false,                    // Require all users to use MFA
  primaryMethod: 'totp',                // Default MFA method
  security: {
    requireMFAForSensitiveActions: true,
    requireMFAForDataExport: true,
    requireMFAForPasswordChange: true,
    rememberDeviceFor: 30                // Days
  }
}
```

---

## Security Best Practices

### 1. Protect Secrets

```javascript
// ❌ DON'T: Store secrets in plain text
const secret = user.twoFactorSecret;

// ✅ DO: Use environment variables
const secret = process.env.TOTP_SECRET;

// ✅ DO: Encrypt sensitive data
const encrypted = encrypt(secret);
```

### 2. Rate Limiting

```javascript
// Implement rate limiting on OTP endpoints
const rateLimit = require('express-rate-limit');

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 requests per window
  message: 'Too many OTP attempts'
});

router.post('/otp/initiate', otpLimiter, ...);
```

### 3. Secure Session Management

```javascript
// Use secure, httpOnly cookies
res.cookie('mfaSessionId', sessionId, {
  httpOnly: true,
  secure: true,       // HTTPS only
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000
});
```

### 4. Audit Logging

```javascript
// Log all MFA activities
await MFAAuditLog.create({
  userId,
  action: 'mfa_enable',
  status: 'success',
  method: 'totp',
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  timestamp: new Date()
});
```

### 5. Backup Code Security

```javascript
// Always hash backup codes
const backupCodeHash = crypto
  .createHash('sha256')
  .update(backupCode)
  .digest('hex');

// Use constant-time comparison
const match = crypto.timingSafeEqual(
  Buffer.from(providedHash),
  Buffer.from(storedHash)
);
```

---

## Testing

### Unit Tests

```javascript
// Test TOTP verification
describe('TOTP Verification', () => {
  it('should verify valid TOTP token', () => {
    const secret = 'JBSWY3DPEBLW64TMMQ======';
    const token = '123456'; // Valid token from authenticator
    
    const result = mfaService.verifyTOTP(token, secret);
    expect(result).toBe(true);
  });

  it('should reject invalid TOTP token', () => {
    const secret = 'JBSWY3DPEBLW64TMMQ======';
    const token = '000000'; // Invalid token
    
    const result = mfaService.verifyTOTP(token, secret);
    expect(result).toBe(false);
  });
});

// Test OTP verification
describe('OTP Verification', () => {
  it('should verify valid OTP', () => {
    const result = mfaService.verifyOTP('123456', '123456', new Date(Date.now() + 300000));
    expect(result.isValid).toBe(true);
  });

  it('should reject expired OTP', () => {
    const result = mfaService.verifyOTP('123456', '123456', new Date(Date.now() - 1000));
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('EXPIRED');
  });
});
```

### Integration Tests

```javascript
// Test full MFA setup flow
describe('MFA Setup Flow', () => {
  it('should complete TOTP setup', async () => {
    // 1. Get QR code
    const initResponse = await request(app)
      .post('/api/mfa/totp/initiate')
      .set('Authorization', `Bearer ${token}`);
    
    expect(initResponse.status).toBe(200);
    expect(initResponse.body.data.qrCode).toBeDefined();
    
    // 2. Verify with code
    const verifyResponse = await request(app)
      .post('/api/mfa/totp/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({
        token: getValidTOTPToken(initResponse.body.data.secret),
        secret: initResponse.body.data.secret
      });
    
    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.data.backupCodes).toBeDefined();
  });
});
```

### Manual Testing Checklist

- [ ] TOTP setup with Google Authenticator
- [ ] TOTP verification during login
- [ ] Email OTP setup and verification
- [ ] SMS OTP setup and verification
- [ ] Backup code generation and usage
- [ ] Trusted device marking and removal
- [ ] MFA settings management
- [ ] Account recovery flow
- [ ] Session expiration handling
- [ ] Concurrent session management
- [ ] Audit log recording
- [ ] Rate limiting on OTP endpoints

---

## Troubleshooting

### Common Issues

#### 1. QR Code Not Displaying

**Problem:** QR code image not showing in setup screen.

**Solution:**
```javascript
// Make sure qrcode package is installed
npm install qrcode

// Verify QR code generation
const qrCode = await QRCode.toDataURL(url);
console.log('QR Code generated:', qrCode.substring(0, 50));
```

#### 2. OTP Codes Expiring Too Quickly

**Problem:** Users report OTP codes expire before they can enter them.

**Solution:**
```javascript
// Increase OTP expiration window
const otpExpiration = 10 * 60 * 1000; // 10 minutes instead of 5

// Or increase TOTP window
const isValid = speakeasy.totp.verify({
  secret,
  window: 3  // Allow 3 time windows (±90 seconds)
});
```

#### 3. SMS OTP Not Arriving

**Problem:** SMS OTP delivery failures.

**Solution:**
```javascript
// Verify Twilio credentials
console.log('Twilio SID:', process.env.TWILIO_ACCOUNT_SID);

// Check phone number format
const fullNumber = `${countryCode}${phoneNumber}`;
console.log('Sending SMS to:', fullNumber);

// Log delivery status
if (response.status === 'undelivered') {
  console.error('SMS delivery error:', response.error_message);
}
```

#### 4. Device Trust Not Working

**Problem:** Trusted devices still requiring MFA.

**Solution:**
```javascript
// Verify device fingerprint consistency
const fingerprint1 = generateFingerprint();
const fingerprint2 = generateFingerprint(); // Same as 1?

// Check device token in request headers
console.log('Device token provided:', req.headers['x-device-token']);

// Verify device hasn't expired
if (device.expiresAt < new Date()) {
  // Device trust expired
}
```

### Debugging

Enable debug logging:

```javascript
// In your app.js
process.env.DEBUG = 'mfa:*';

// In mfaService.js
const debug = require('debug')('mfa:service');
debug('OTP generated:', otpData);
```

### Getting Help

If you encounter issues:

1. Check the [API Endpoints](#api-endpoints) section
2. Review the [Security Best Practices](#security-best-practices)
3. Run the [tests](#testing)
4. Check browser console for errors
5. Review server logs for detailed error messages

---

## Support & Contact

For questions or issues:
- 📧 Email: support@erpsystem.com
- 📞 Phone: +966-XX-XXXX-XXXX
- 🐛 Bug Reports: issues@erpsystem.com

---

**Last Updated:** February 2026
**Version:** 1.0.0
