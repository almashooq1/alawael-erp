# AlAwael ERP Backend - Developer Guide (Phase 13+)

## Quick Start

### Smart Mode (Testing/Development)

Fast startup with all features enabled, auth bypass for quick testing:

```bash
cd backend
npm run start:smart
```

Listens on `http://localhost:3001`, mock DB enabled, `SMART_TEST_MODE=true` allows unauthenticated endpoint access.

### Normal Mode (Production-like)

Standard startup with full JWT auth enforcement:

```bash
cd backend
npm start
```

Requires valid JWT tokens for secured endpoints.

---

## Available npm Scripts

| Script                        | Purpose                        | Notes                            |
| ----------------------------- | ------------------------------ | -------------------------------- |
| `npm start`                   | Start backend (normal mode)    | Port 3001, full JWT auth         |
| `npm run start:smart`         | Start in smart mode            | `SMART_TEST_MODE=true`, mock DB  |
| `npm run smoke:phase13`       | Run basic Phase 13 smoke tests | Uses JWT, tests 2 endpoints      |
| `npm run smoke:comprehensive` | Test all 8 Phase 13 routes     | New: comprehensive coverage      |
| `npm run token:gen`           | Generate valid JWT token       | Outputs token for manual testing |
| `npm run dev`                 | Start with nodemon             | Hot-reload on file changes       |
| `npm test`                    | Run Jest test suite            | Coverage reports generated       |

---

## Phase 13 API Endpoints

All endpoints require `Authorization: Bearer <JWT>` header in normal mode.

### 1. User Profile (`/api/user-profile/*`)

```bash
GET /api/user-profile/statistics          # User account stats
GET /api/user-profile/preferences         # User settings
POST /api/user-profile/update             # Update profile
```

### 2. Two-Factor Authentication (`/api/2fa/*`)

```bash
GET /api/2fa/status                       # Check 2FA status
POST /api/2fa/enable                      # Enable 2FA
POST /api/2fa/verify                      # Verify 2FA code
```

### 3. Advanced Search (`/api/search-advanced/*`)

```bash
GET /api/search-advanced/query?q=<term>   # Full-text search
POST /api/search-advanced/filter          # Filtered search
```

### 4. Payments (`/api/payments-advanced/*`)

```bash
GET /api/payments-advanced/statistics     # Payment stats
POST /api/payments-advanced/process       # Process payment
GET /api/payments-advanced/history        # Payment history
```

### 5. Notifications (`/api/notifications-advanced/*`)

```bash
GET /api/notifications-advanced/statistics   # Notification stats
GET /api/notifications-advanced/list         # List notifications
POST /api/notifications-advanced/send        # Send notification
```

### 6. Chatbot (`/api/chatbot/*`)

```bash
GET /api/chatbot/status                   # Chatbot status
POST /api/chatbot/message                 # Send message
```

### 7. AI Advanced (`/api/ai-advanced/*`)

```bash
GET /api/ai-advanced/predictions          # Get predictions
POST /api/ai-advanced/model/train         # Train model
```

### 8. Automation (`/api/automation/*`)

```bash
GET /api/automation/workflows             # List workflows
POST /api/automation/execute              # Execute workflow
```

---

## Testing Guide

### Quick Validation (Smart Mode)

```bash
# Terminal 1: Start backend
npm run start:smart

# Terminal 2: Quick health check (no auth needed in smart mode)
curl http://localhost:3001/health
curl http://localhost:3001/api/health
```

### Full Phase 13 Coverage (Normal Mode with JWT)

```bash
# Terminal 1: Start backend
npm start

# Terminal 2: Get valid token
TOKEN=$(npm run token:gen)

# Test endpoints with token
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/notifications-advanced/statistics

# Or use comprehensive smoke tests
npm run smoke:comprehensive
```

### Phase 97/98 Verification (Smart Mode)

```bash
# Terminal 1: Start backend
npm run start:smart

# Terminal 2: Run verification
node tests/verify_phases_97_98.js
```

---

## Authentication

### JWT Generation

The `scripts/gen_token.js` script generates a valid JWT signed with your `.env` `JWT_SECRET`:

```bash
node scripts/gen_token.js
```

Output: A complete JWT token you can use in API requests.

### Token Format

```
Authorization: Bearer <JWT_TOKEN>
```

### Smart Mode Override

When `SMART_TEST_MODE=true`, endpoints don't require valid tokens. Useful for:

- Quick integration tests
- Phase 97/98 verification (wearable IoT + voice assistant)
- Development without auth setup

---

## Environment Variables

### Key Variables (`.env`)

```bash
PORT=3001
USE_MOCK_DB=true              # Use in-memory mock instead of MongoDB
SMART_TEST_MODE=true          # Bypass auth for testing
JWT_SECRET=alawael-erp-secret-key-2026-change-in-production
NODE_ENV=development          # or production
```

### Running with Custom Env

```bash
PORT=3002 USE_MOCK_DB=true npm start
PORT=3001 SMART_TEST_MODE=true npm start
```

---

## Health & Status Endpoints

All endpoints return `{ status: 'ok' }` with HTTP 200:

```bash
GET /health              # Basic health
GET /api/health          # Health alias (same)
GET /api/system/status   # Full system status
```

---

## Middleware & Security

### Active Middleware Stack

- **Helmet**: Security headers
- **Express Sanitizer**: Input sanitization
- **Rate Limiter**: Request throttling
- **CORS**: Cross-origin support
- **Auth Middleware**: JWT verification (normal mode) / bypass (smart mode)
- **Response Handler**: Standardized JSON responses

### Auth Middleware Routing

- Route imports: `../middleware/authMiddleware` → **Proxy file**
- Proxy re-exports from: `auth.middleware.js` (main auth)
- Token check: Validates JWT against `.env` `JWT_SECRET`
- Role check: `requireRole('admin')` for admin-only endpoints

---

## Smoke Test Details

### Basic Smoke (`npm run smoke:phase13`)

- 2 endpoints tested
- Requires valid JWT
- Output: Status codes for `/notifications-advanced/statistics` and `/payments-advanced/statistics`

### Comprehensive Smoke (`npm run smoke:comprehensive`)

- All 8 Phase 13 routes tested with valid token
- Auth enforcement tested (invalid token → 401/403)
- Output: Pass/fail summary with endpoint names

---

## Troubleshooting

### Port Already in Use

```bash
# Find and kill process on port 3001
netstat -an | findstr 3001
taskkill /F /IM node.exe
```

### Health Check Fails

1. Verify backend is running: `netstat -an | findstr 3001`
2. Check logs for errors: `npm start` (foreground mode)
3. Ensure `.env` exists with `PORT=3001`

### JWT Token Invalid

1. Verify `.env` `JWT_SECRET` is set
2. Generate new token: `npm run token:gen`
3. Use complete token (with `Bearer ` prefix)

### Mongoose Index Warnings

Non-blocking duplicate index warnings in logs (known issue, scheduled for cleanup).

---

## Common Workflows

### Develop with Hot-Reload

```bash
npm run dev
```

### Run Tests + Coverage

```bash
npm test
```

### Quick Full-Stack Check

```bash
# Start backend (smart mode)
npm run start:smart

# In another terminal, verify phases
node tests/verify_phases_97_98.js
```

### Deploy-Ready Validation

```bash
npm run smoke:comprehensive
```

---

## Project Structure

```
backend/
├── server.js                 # Main entry, route mounting
├── middleware/
│   ├── auth.middleware.js   # JWT verification logic
│   ├── authMiddleware.js    # Compatibility proxy
│   └── ...other middleware
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
│   └── ...Phase 13 service implementations
├── models/
│   └── ...MongoDB schemas
├── scripts/
│   ├── gen_token.js                    # JWT token generator
│   ├── smoke_phase13.js                # Basic smoke tests
│   └── smoke_phase13_comprehensive.js  # Full coverage tests
├── tests/
│   └── verify_phases_97_98.js          # IoT + voice verification
└── package.json                         # npm scripts
```

---

## Next Steps

1. **Frontend Integration**: Connect React app to secured endpoints using generated JWT
2. **Database Migration**: Switch from mock DB (`USE_MOCK_DB=false`) to MongoDB Atlas
3. **CI/CD Pipeline**: Add GitHub Actions for automated testing
4. **Load Testing**: Run benchmarks with `npm run benchmark`
5. **Documentation**: Generate Swagger API docs (`/api-docs`)

---

## Support & Questions

- Phase 13 features: 8 advanced routes operational and tested
- Phase 97/98: Wearable IoT + voice assistant verified
- Auth: Full JWT + role-based access control
- Tests: Smoke tests, phase verification, Jest coverage available

Last Updated: January 16, 2026  
Backend Status: ✅ Operational
