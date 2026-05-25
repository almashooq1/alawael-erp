# ⚡ Barcode API - Quick Start Guide

## 🎯 TL;DR

```bash
# 1. Start the server
cd backend
node barcode-server.js

# 2. Server is online at: http://localhost:4000
# 3. Health check: GET http://localhost:4000/api/barcode/health

# 4. Get a JWT token
node generate-jwt.js

# 5. Test an endpoint (with token)
# See API_TESTS.txt for examples
```

---

## 📌 Server Running Checklist

- [x] Server starts without errors
- [x] MongoDB connection successful
- [x] Port 4000 is listening
- [x] All endpoints responding
- [x] Authentication working
- [x] Rate limiting active

---

## 🔌 API Endpoints

### 1. Health Check (No Auth)

```text
GET http://localhost:4000/api/barcode/health

✅ Response: { "status": "healthy", "service": "barcode-api" }
```

### 2. Generate QR Code

```text
POST http://localhost:4000/api/barcode/qr-code
Header: Authorization: Bearer [JWT_TOKEN]

Body: {
  "data": "Your text here",
  "errorCorrectionLevel": "M"  // L|M|Q|H
}

✅ Response: { "type": "QR", "code": "[PNG data URL]" }
```

### 3. Generate Barcode

```text
POST http://localhost:4000/api/barcode/barcode
Header: Authorization: Bearer [JWT_TOKEN]

Body: {
  "data": "SKU-123-ABC",
  "format": "CODE128"  // CODE128|CODE39|EAN13|UPC
}

✅ Response: { "type": "BARCODE", "code": "[PNG data URL]" }
```

### 4. Batch Processing

```text
POST http://localhost:4000/api/barcode/batch
Header: Authorization: Bearer [JWT_TOKEN]

Body: {
  "items": [
    { "data": "QR001", "type": "QR" },
    { "data": "BC001", "type": "BARCODE", "format": "CODE39" }
  ]
}

✅ Response: { "successCount": 2, "results": [...] }
```

### 5. Get Statistics

```text
GET http://localhost:4000/api/barcode/statistics
Header: Authorization: Bearer [JWT_TOKEN]

✅ Response: { "statistics": [ ... ] }
```

---

## 🔑 How to Get JWT Tokens

```bash
node generate-jwt.js
```

Output includes three tokens for:

- **Admin** - Full access
- **Warehouse Manager** - Full access
- **Logistics** - Full access

Copy the token and use in Authorization header:

```text
Authorization: Bearer <TOKEN_HERE>
```

---

## 🧪 Quick Tests

### Test 1: Health Check (No Token Needed)

```bash
curl http://localhost:4000/api/barcode/health
```

### Test 2: Generate QR Code (With Token)

```bash
TOKEN="<your_admin_token>"

curl -X POST http://localhost:4000/api/barcode/qr-code \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data":"Test123","errorCorrectionLevel":"H"}'
```

### Test 3: Generate Barcode

```bash
TOKEN="<your_warehouse_manager_token>"

curl -X POST http://localhost:4000/api/barcode/barcode \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data":"SKU-001","format":"CODE128"}'
```

---

## 📊 Success Indicators

When running, you should see:

```text
✨ Barcode API Server running on http://localhost:4000
📍 Health Check: http://localhost:4000/api/barcode/health

🔌 Available Endpoints:
   POST   /api/barcode/qr-code      - Generate QR Code
   POST   /api/barcode/barcode      - Generate Barcode
   POST   /api/barcode/batch        - Batch Generation
   GET    /api/barcode/statistics   - Get Statistics
   GET    /api/barcode/health       - Health Check (Public)
```

All endpoints responding with HTTP 200 = ✅ Success

---

## 🐛 Troubleshooting

| Problem               | Solution                                 |
| --------------------- | ---------------------------------------- |
| Port 4000 in use      | Kill process: `taskkill /F /IM node.exe` |
| MongoDB error         | Verify MongoDB is running                |
| 401 Unauthorized      | Check JWT token is valid                 |
| 429 Too Many Requests | Rate limit exceeded (wait 15 min)        |
| Module not found      | Ensure you're in `backend/` directory    |

---

## 📚 Documentation Files

- `BARCODE_LIVE_TEST_REPORT.md` - Full test results
- `BARCODE_MODULE_CONVERSION_GUIDE.md` - Technical details
- `API_TESTS.txt` - Example API calls
- `generate-jwt.js` - Token generator
- `barcode-server.js` - Server entry point

---

## ✅ Known Working

- ✅ QR Code generation (all error correction levels)
- ✅ Barcode generation (CODE128 tested, others ready)
- ✅ Batch processing (tested with 2 items)
- ✅ Statistics tracking
- ✅ JWT authentication
- ✅ Role-based access
- ✅ Rate limiting
- ✅ MongoDB logging

---

## 🎯 Next Steps

1. **Frontend Integration** - Add BarcodeManager component to React app
2. **Unit Tests** - Run: `npm test -- barcode.test.js`
3. **Postman Collection** - Import test cases from API_TESTS.txt
4. **Production Deploy** - Docker or cloud platform
5. **Frontend Testing** - Test React components with API

---

**Status:** ✅ LIVE AND OPERATIONAL  
**Last Updated:** 2026-02-08  
**Version:** 1.0.0
