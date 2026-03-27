# Al-Awael ERP — Backend

Express.js API server for the Al-Awael Day Care Center ERP system.

## Tech Stack

| Component       | Version    | Purpose                                    |
| --------------- | ---------- | ------------------------------------------ |
| Express         | ^4.18.2    | HTTP framework                             |
| Mongoose        | ^9.1.4     | MongoDB ODM                                |
| ioredis         | ^5.9.2     | Redis client (caching, rate limiting)      |
| Socket.IO       | ^4.7.2     | Real-time WebSocket                        |
| Winston         | ^3.19.0    | Structured logging                         |
| Jest            | ^29.7.0    | Test framework                             |
| Helmet          | ^8.0.0     | Security headers                           |
| express-rate-limit | ^7.x    | API rate limiting                          |

## Directory Structure

```
backend/
├── app.js                    # Express app (middleware + routes)
├── server.js                 # HTTP server + DB + Socket.IO init
├── middleware.js              # Middleware barrel export
├── rbac.js                   # Role & permission definitions
│
├── config/                   # Configuration
│   ├── database.js           #   MongoDB connection with retry
│   ├── database.optimization.js  #   Indexes & query hints
│   ├── performance.js        #   Redis caching, compression, timing
│   ├── security.config.js    #   Rate limit configs
│   ├── security.advanced.js  #   Auth rate limiter, mongo-sanitize
│   ├── mongoose.plugins.js   #   Global Mongoose plugins (slow query, toJSON)
│   ├── swagger.config.js     #   Swagger/OpenAPI setup
│   └── socket.config.js      #   Socket.IO configuration
│
├── middleware/                # Express middleware
│   ├── securityHeaders.js    #   Helmet + CSP + Permissions-Policy
│   ├── securityHardening.js  #   JSON depth limiter, security validator
│   ├── csrfProtection.js     #   CSRF (cookie-to-header token)
│   ├── rateLimiter.js        #   Multi-tier rate limiting
│   ├── sanitize.js           #   Input sanitization (XSS + NoSQL)
│   ├── requestValidation.js  #   Joi-based request validation
│   ├── globalValidation.js   #   ObjectId params, query hygiene
│   ├── paginationDefaults.js #   Auto-cap ?limit to prevent DB dumps
│   └── ...
│
├── routes/                   # API routes
│   └── _registry.js          #   Centralised route mounting
│
├── models/                   # Mongoose schemas
├── services/                 # Business logic
├── controllers/              # Route handlers
├── errors/                   # Error classes & handler
├── utils/                    # Shared utilities
├── sockets/                  # Socket.IO event handlers
├── integration/              # Cross-module event bus
├── infrastructure/           # Event store, message queue, migrations
│
├── __tests__/                # Jest test suites
├── scripts/                  # Utility scripts
├── docs/                     # Backend-specific docs
└── jest.config.js            # Jest configuration
```

## Running

```bash
# Development (with nodemon)
npm start

# Production
node server.js

# With PM2 (cluster mode)
pm2 start ecosystem.config.js
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- --testPathPattern=auth

# Detect open handles (CI mode)
CI=true npm test
```

**Test Infrastructure:**
- MongoMemoryServer for isolated DB testing
- Mock database for unit tests (via jest.setup.js)
- 301 test suites, 9409 tests passing

## Security Middleware Stack

Request flow (order matters):

1. **Request ID** — Unique trace ID for every request
2. **Security Headers** — Helmet + CSP + HSTS + Permissions-Policy
3. **Suspicious Activity Detector** — Anomaly detection
4. **Mongo Sanitize** — NoSQL injection prevention
5. **Graceful Shutdown** — Reject during shutdown
6. **API Key Auth** — API key validation
7. **Maintenance Mode** — 503 during maintenance
8. **CORS** — Cross-origin configuration
9. **Body Parsing** — JSON/URL-encoded (1MB limit, 10MB for uploads)
10. **JSON Depth Limiter** — Prevents DoS via nested payloads
11. **Input Sanitization** — XSS + HPP protection
12. **CSRF Protection** — Cookie-to-header token (timing-safe)
13. **Compression** — Brotli/gzip (adaptive)
14. **Cache Middleware** — Redis-backed response caching
15. **Rate Limiting** — Multi-tier (general, auth, API, export)
16. **Audit Trail** — Automatic write operation logging

## Performance Features

- **Redis caching** with circuit breaker (auto-fallback on failure)
- **Response compression** (gzip, threshold: 512B)
- **Request timing** with P50/P90/P95/P99 percentile tracking
- **ETag support** for conditional GET responses
- **Mongoose slow query logging** (configurable threshold)
- **Memory pressure monitoring** (heap usage alerts)
- **In-memory response cache** with LRU eviction
- **Pagination cap** (max 100 items per request)

## Quality Gates

```bash
npm run lint          # ESLint (0 errors, 0 warnings)
npm run format        # Prettier formatting
npm run quality:push  # Pre-push checks
npm run quality:ci    # CI gate (lint + test + coverage)
```
