# MFA System - Quick Start Guide
# دليل البدء السريع لنظام MFA

## ⚡ 5-Minute Setup

### Step 1: Install Dependencies

```bash
# Backend dependencies
cd erp_new_system/backend
npm install speakeasy qrcode nodemailer

# Frontend dependencies (already have axios)
cd ../frontend
npm install
```

### Step 2: Update Environment Variables

```bash
# .env file in backend
MFA_OTP_EXPIRATION=300000
MFA_SESSION_DURATION=900000
MFA_BACKUP_CODES_COUNT=10
MFA_TRUSTED_DEVICE_DURATION=2592000000

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
```

### Step 3: Register Routes

In `backend/app.js`:

```javascript
const mfaRoutes = require('./routes/mfa');
app.use('/api/mfa', mfaRoutes);
```

### Step 4: Add MFA Middleware

Update your protected routes:

```javascript
const { protect } = require('./middleware/auth');
const { checkMFAStatus } = require('./middleware/mfaAuth');

// On sensitive routes
router.post('/sensitive-action', 
  protect, 
  checkMFAStatus, 
  handleAction
);
```

### Step 5: Add Frontend Components

In your React app:

```jsx
// In your settings page
import MFASetup from './components/MFASetup';
import MFASettings from './components/MFASettings';

function SettingsPage() {
  return (
    <div>
      <MFASetup />
      <MFASettings />
    </div>
  );
}
```

### Step 6: Update Login Page

```jsx
import MFAVerification from './components/MFAVerification';

function LoginPage() {
  const [showMFA, setShowMFA] = useState(false);
  const [mfaSessionId, setMFASessionId] = useState('');

  const handleLogin = async (email, password) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });

      if (response.data.requireMFA) {
        setMFASessionId(response.data.sessionId);
        setShowMFA(true);
      } else {
        localStorage.setItem('authToken', response.data.token);
        navigate('/dashboard');
      }
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <>
      {!showMFA ? (
        <LoginForm onSubmit={handleLogin} />
      ) : (
        <MFAVerification
          sessionId={mfaSessionId}
          onVerificationSuccess={() => navigate('/dashboard')}
          onCancel={() => setShowMFA(false)}
        />
      )}
    </>
  );
}
```

---

## 📋 File Structure

```
Your Project/
├── backend/
│   ├── services/
│   │   └── mfaService.js           ✅ Created
│   ├── models/
│   │   └── mfa.models.js           ✅ Created
│   ├── controllers/
│   │   └── mfaController.js        ✅ Created
│   ├── middleware/
│   │   ├── auth.js                 (existing)
│   │   └── mfaAuth.js              ✅ Created
│   ├── routes/
│   │   └── mfa.js                  ✅ Created
│   ├── tests/
│   │   └── mfa.service.test.js     ✅ Created
│   └── app.js                      (update needed)
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── MFASetup.jsx        ✅ Created
│       │   ├── MFAVerification.jsx ✅ Created
│       │   └── MFASettings.jsx     ✅ Created
│       └── css/
│           └── MFASetup.css        ✅ Created
│
└── docs/
    └── MFA_IMPLEMENTATION_GUIDE.md ✅ Created
```

---

## 🧪 Testing the System

### 1. Test TOTP Setup

```bash
# Start your backend server
npm start

# In browser console or Postman
curl -X POST http://localhost:3001/api/mfa/totp/initiate \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return QR code data
```

### 2. Test Email OTP

```bash
curl -X POST http://localhost:3001/api/mfa/email/initiate \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check your email for OTP code
```

### 3. Test MFA Verification

```bash
curl -X POST http://localhost:3001/api/mfa/login/verify \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "YOUR_SESSION_ID",
    "token": "123456",
    "method": "totp"
  }'
```

---

## 🔒 Security Checklist

- [ ] Set `NODE_ENV=production` in production
- [ ] Use HTTPS only in production
- [ ] Store JWT_SECRET securely
- [ ] Enable rate limiting on OTP endpoints
- [ ] Implement CSRF protection
- [ ] Use secure session cookies
- [ ] Regularly rotate secrets
- [ ] Monitor audit logs for suspicious activity

---

## 🚀 Deployment

### Backend Deployment

```bash
# Build for production
npm run build

# Set environment variables on your hosting
DATABASE_URL=mongodb://...
JWT_SECRET=<secure-random-string>
SMTP_USER=<email>
SMTP_PASS=<password>

# Start application
npm start
```

### Frontend Deployment

```bash
# Build React app
npm run build

# Deploy to hosting (Vercel, Netlify, AWS, etc.)
npm run deploy
```

---

## 📱 Supported Authenticator Apps

- Google Authenticator (Android, iOS)
- Microsoft Authenticator (Android, iOS)
- Authy (Android, iOS, Windows, Mac)
- FreeOTP (Android, iOS)
- 1Password (Android, iOS, Mac, Windows)

---

## 🌍 Supported Countries for SMS

Default supported:
- 🇸🇦 Saudi Arabia (+966)
- 🇦🇪 UAE (+971)
- 🇶🇦 Qatar (+974)
- 🇴🇲 Oman (+968)
- 🇰🇼 Kuwait (+965)
- 🇧🇭 Bahrain (+973)
- 🇺🇸 USA (+1)
- 🇬🇧 UK (+44)

To add more countries, update the country code select in `MFASetup.jsx`.

---

## 📊 API Response Examples

### Setup Success

```json
{
  "success": true,
  "message": "TOTP enabled successfully",
  "data": {
    "backupCodes": [
      "A1B2-C3D4",
      "E5F6-G7H8",
      "..."
    ]
  }
}
```

### Verification Success

```json
{
  "success": true,
  "message": "MFA verification successful",
  "data": {
    "sessionId": "xxx",
    "userId": "user123",
    "verified": true
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Invalid MFA token",
  "code": "MFA_INVALID",
  "attemptsRemaining": 3
}
```

---

## 🐛 Debugging

Enable debug output:

```bash
# In terminal
DEBUG=mfa:* npm start

# Will show detailed MFA operation logs
```

Check browser console:

```javascript
// React component debugging
console.log('MFA Status:', req.mfaStatus);
console.log('MFA Verified:', req.mfaVerified);
```

---

## 📞 Support

### Common Issues

**Q: QR code not displaying?**
A: Make sure `qrcode` package is installed: `npm install qrcode`

**Q: OTP code always invalid?**
A: Check system time synchronization. TOTP is time-sensitive.

**Q: SMS not sending?**
A: Verify Twilio/SMS service credentials in .env file.

**Q: Backup codes not working?**
A: Ensure codes are not all used up. Generate new ones in settings.

---

## 📈 Next Steps

After basic setup:

1. **Add Account Recovery** - Implement recovery key system
2. **Add Analytics** - Track MFA adoption rates
3. **Add Admin Dashboard** - Manage user MFA settings
4. **Add Biometric Support** - Fingerprint/Face ID authentication
5. **Add Push Notifications** - For MFA approvals

---

## 🎓 Learning Resources

- [TOTP Specification (RFC 6238)](https://tools.ietf.org/html/rfc6238)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8949)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Google Authenticator Documentation](https://support.google.com/accounts/answer/185839)

---

**Version:** 1.0.0
**Last Updated:** February 2026
**Status:** Ready for Production ✅
