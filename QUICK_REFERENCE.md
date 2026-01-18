# Phase 13 Quick Reference Card

## 🚀 Quick Start (60 seconds)

```bash
# Terminal 1: Start Backend (Smart Mode - No Auth)
cd backend
npm run start:smart

# Terminal 2: Verify it's working
curl http://localhost:3001/health
# Response: {"status":"ok"}
```

---

## 📦 NPM Scripts

| Script                  | Command                       | Purpose                         |
| ----------------------- | ----------------------------- | ------------------------------- |
| **start**               | `npm start`                   | Normal mode (JWT auth required) |
| **start:smart**         | `npm run start:smart`         | Development mode (auth bypass)  |
| **dev**                 | `npm run dev`                 | Watch mode with hot-reload      |
| **token:gen**           | `npm run token:gen`           | Generate JWT for testing        |
| **smoke:phase13**       | `npm run smoke:phase13`       | Quick smoke tests (2 endpoints) |
| **smoke:comprehensive** | `npm run smoke:comprehensive` | Full smoke test (8 endpoints)   |
| **test**                | `npm test`                    | Run Jest test suite             |
| **benchmark**           | `npm run benchmark`           | Load test                       |

---

## 🔑 API Endpoints (Phase 13)

### User Profile `/api/user-profile/*`

```bash
GET  /statistics      # User stats
POST /update          # Update profile
```

### 2FA `/api/2fa/*`

```bash
POST /send-otp-sms    # Send SMS OTP
POST /verify-otp      # Verify code
```

### Search `/api/search-advanced/*`

```bash
GET  /search?query=... # Full-text search
POST /advanced         # Filtered search
```

### Payments `/api/payments-advanced/*`

```bash
GET  /statistics       # Payment stats
POST /process          # Process payment
```

### Notifications `/api/notifications-advanced/*`

```bash
GET  /statistics       # Notification stats
POST /send             # Send notification
```

### Chatbot `/api/chatbot/*`

```bash
GET  /statistics       # Chat stats
POST /chat             # Send message
```

### AI `/api/ai-advanced/*`

```bash
GET  /predictions      # Get predictions
POST /feedback         # Submit feedback
```

### Automation `/api/automation/*`

```bash
GET  /workflows        # List workflows
POST /execute          # Execute workflow
```

---

## 🔐 Authentication

### Generate Token

```bash
npm run token:gen
# Output: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Use Token in Requests

```bash
TOKEN=$(npm run token:gen 2>/dev/null | tail -n1)

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/user-profile/statistics
```

### React Example

```javascript
const token = localStorage.getItem('authToken');

fetch('http://localhost:3001/api/user-profile/statistics', {
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
})
  .then(r => r.json())
  .then(data => console.log(data));
```

---

## 🧪 Testing

### Quick Health Check

```bash
curl http://localhost:3001/health  # Should return 200
```

### Phase 13 Full Test (All 8 endpoints)

```bash
npm run smoke:comprehensive
# Expected: ✓ Passed: 10 (endpoints + auth enforcement)
```

### Phase 97/98 Verification (IoT + Voice)

```bash
npm run start:smart  # In terminal 1
node tests/verify_phases_97_98.js  # In terminal 2
# Expected: PHASES 97 & 98 VERIFICATION SUCCESSFUL
```

---

## 🐛 Debugging

### Start Server with Logs

```bash
cd backend
NODE_ENV=development node server.js
```

### Check Port Usage

```bash
netstat -an | findstr 3001
```

### Kill Port

```bash
taskkill /F /IM node.exe
```

### View Logs

```bash
tail -f backend/server.log
```

---

## 📁 Project Structure

```
backend/
├── server.js                 # Main entry
├── middleware/
│   ├── auth.middleware.js    # JWT verification
│   └── authMiddleware.js     # Compatibility proxy
├── routes/
│   ├── userProfileRoutes.js
│   ├── twoFARoutes.js
│   ├── searchRoutes.js
│   ├── paymentRoutes.js
│   ├── notificationRoutes.js
│   ├── chatbotRoutes.js
│   ├── aiRoutes.js
│   └── automationRoutes.js
├── services/
│   └── Phase 13 implementations
├── scripts/
│   ├── gen_token.js          # Token generator
│   ├── smoke_phase13.js      # Basic smoke test
│   └── smoke_phase13_comprehensive.js  # Full test
└── tests/
    └── verify_phases_97_98.js
```

---

## 🛠️ Common Tasks

### Start Development with Hot Reload

```bash
npm run dev
```

### Generate JWT for Testing

```bash
npm run token:gen
```

### Test Single Endpoint

```bash
TOKEN=$(npm run token:gen 2>/dev/null | tail -n1)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/payments-advanced/statistics
```

### Test with Invalid Token (Should Fail)

```bash
curl -H "Authorization: Bearer invalid" \
  http://localhost:3001/api/user-profile/statistics
# Expected: 403 Forbidden
```

### Update .env Variables

```bash
# Edit backend/.env
PORT=3001
JWT_SECRET=your-secret
USE_MOCK_DB=true
SMART_TEST_MODE=true
```

---

## ✅ Pre-Deployment Check

```bash
# 1. Test everything
npm run smoke:comprehensive

# 2. Verify Phase 97/98
node tests/verify_phases_97_98.js

# 3. Check dependencies
npm audit

# 4. Verify auth works
npm run token:gen
# Use token to test endpoints

# All green? Ready to deploy! 🚀
```

---

## 📚 Documentation Links

- **[DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md)** - Full developer guide
- **[API_AUTHENTICATION_GUIDE.md](../API_AUTHENTICATION_GUIDE.md)** - Auth flows & examples
- **[frontend-integration-examples.js](../frontend-integration-examples.js)** - React integration code
- **[DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md)** - Pre-deployment verification

---

## 🆘 Troubleshooting

| Problem            | Solution                                        |
| ------------------ | ----------------------------------------------- |
| Port 3001 in use   | `taskkill /F /IM node.exe`                      |
| Auth always fails  | Check `.env` JWT_SECRET matches token generator |
| Health check fails | Ensure backend is running on port 3001          |
| Token invalid      | Generate new: `npm run token:gen`               |
| CORS errors        | Check backend has CORS middleware enabled       |
| Tests failing      | Run in smart mode first: `npm run start:smart`  |

---

## 🔗 Important Links

- **Backend Health:** http://localhost:3001/health
- **API Docs:** http://localhost:3001/api-docs (if enabled)
- **Environment Config:** `backend/.env`

---

**Last Updated:** January 16, 2026  
**Status:** ✅ All Phase 13 Endpoints Operational  
**Next:** Frontend Integration or Deployment
