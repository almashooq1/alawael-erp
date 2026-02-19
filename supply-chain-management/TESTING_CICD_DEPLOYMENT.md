# 🏆 نظام احترافي متقدم - CI/CD و Testing و Deployment

**استراتيجية شاملة للتطبيق الاحترافي**  
**التاريخ**: فبراير 2026

---

## 🧪 Testing Strategy - استراتيجية الاختبار

### 1️⃣ Unit Tests for Barcode Service

#### ملف: `backend/__tests__/barcodeService.test.js`

```javascript
import { BarcodeService } from '../services/barcodeService.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

// Mock data
const mockProduct = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Test Product',
  sku: 'SKU-12345',
  price: 100,
  stock: 50,
};

describe('BarcodeService', () => {
  beforeAll(async () => {
    // تحضير قاعدة البيانات للاختبار
    await mongoose.connect(process.env.TEST_MONGODB_URI);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('generateQRCode', () => {
    test('should generate QR code successfully', async () => {
      const result = await BarcodeService.generateQRCode(mockProduct);

      expect(result.success).toBe(true);
      expect(result.qrCode).toBeDefined();
      expect(result.qrCode).toMatch(/^data:image\/png/);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.expiresAt).toBeInstanceOf(Date);
    });

    test('should throw error for invalid product data', async () => {
      await expect(BarcodeService.generateQRCode(null)).rejects.toThrow(
        'Invalid product data'
      );
    });

    test('should handle large data correctly', async () => {
      const largeProduct = {
        ...mockProduct,
        name: 'A'.repeat(2000), // Large name
      };

      await expect(BarcodeService.generateQRCode(largeProduct)).rejects.toThrow(
        'QR code data too large'
      );
    });

    test('should generate QR with custom options', async () => {
      const result = await BarcodeService.generateQRCode(mockProduct, {
        width: 500,
        errorCorrectionLevel: 'L',
      });

      expect(result.qrCode).toBeDefined();
      expect(result.qrCode.length).toBeGreaterThan(0);
    });
  });

  describe('generateBarcode', () => {
    test('should generate barcode successfully', async () => {
      const result = await BarcodeService.generateBarcode(
        'SKU-12345',
        'CODE128'
      );

      expect(result.success).toBe(true);
      expect(result.barcode).toBeDefined();
      expect(result.sku).toBe('SKU-12345');
      expect(result.format).toBe('CODE128');
    });

    test('should support multiple formats', async () => {
      const formats = ['CODE128', 'CODE39', 'EAN13'];

      for (const format of formats) {
        const result = await BarcodeService.generateBarcode(
          '12345678901',
          format
        );
        expect(result.success).toBe(true);
        expect(result.format).toBe(format);
      }
    });

    test('should reject invalid SKU', async () => {
      await expect(
        BarcodeService.generateBarcode('AB', 'CODE128')
      ).rejects.toThrow('Invalid SKU format');
    });

    test('should reject invalid format', async () => {
      await expect(
        BarcodeService.generateBarcode('SKU-12345', 'INVALID')
      ).rejects.toThrow('Unsupported format');
    });
  });

  describe('generateBatchCodes', () => {
    test('should generate batch codes successfully', async () => {
      const productIds = [
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
      ];

      const progressUpdates = [];
      const result = await BarcodeService.generateBatchCodes(
        productIds,
        progress => progressUpdates.push(progress)
      );

      expect(result.length).toBe(3);
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100);
    });

    test('should handle partial failures', async () => {
      const productIds = [
        new mongoose.Types.ObjectId(),
        null, // invalid ID
        new mongoose.Types.ObjectId(),
      ];

      const result = await BarcodeService.generateBatchCodes(productIds);

      const succeeded = result.filter(r => r.success).length;
      const failed = result.filter(r => !r.success).length;

      expect(succeeded + failed).toBe(3);
      expect(failed).toBeGreaterThan(0);
    });
  });
});
```

### 2️⃣ Integration Tests for API Routes

#### ملف: `backend/__tests__/barcodeRoutes.test.js`

```javascript
import request from 'supertest';
import app from '../server.js';
import { generateToken } from '../utils/auth.js';

describe('Barcode API Routes', () => {
  let token;
  let adminToken;

  beforeAll(() => {
    // توليد tokens للاختبار
    token = generateToken({ id: 'testUser', role: 'warehouse_manager' });
    adminToken = generateToken({ id: 'admin', role: 'admin' });
  });

  describe('POST /api/barcode/generate-qr/:productId', () => {
    test('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/barcode/generate-qr/507f1f77bcf86cd799439011')
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('authentication');
    });

    test('should generate QR code with valid token', async () => {
      const response = await request(app)
        .post('/api/barcode/generate-qr/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)
        .send({ errorCorrection: 'H' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.qrCode).toBeDefined();
    });

    test('should return 403 for insufficient permissions', async () => {
      const userToken = generateToken({ id: 'user', role: 'viewer' });

      const response = await request(app)
        .post('/api/barcode/generate-qr/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(response.status).toBe(403);
    });

    test('should handle rate limiting', async () => {
      // إرسال طلبات متعددة بسرعة
      const requests = Array(150)
        .fill(null)
        .map(() =>
          request(app)
            .post('/api/barcode/generate-qr/507f1f77bcf86cd799439011')
            .set('Authorization', `Bearer ${token}`)
            .send({})
        );

      const responses = await Promise.all(requests);

      // يجب أن يكون هناك طلبات متأخرة (Rate limited)
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/barcode/batch-generate', () => {
    test('should reject empty product list', async () => {
      const response = await request(app)
        .post('/api/barcode/batch-generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ productIds: [] });

      expect(response.status).toBe(400);
    });

    test('should reject more than 1000 products', async () => {
      const productIds = Array(1001).fill(new mongoose.Types.ObjectId());

      const response = await request(app)
        .post('/api/barcode/batch-generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ productIds });

      expect(response.status).toBe(400);
    });

    test('should process batch successfully', async () => {
      const productIds = [
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
      ];

      const response = await request(app)
        .post('/api/barcode/batch-generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ productIds });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.total).toBe(2);
    });
  });

  describe('GET /api/barcode/logs', () => {
    test('should retrieve logs with filters', async () => {
      const response = await request(app)
        .get('/api/barcode/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ limit: 10, skip: 0 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.logs)).toBe(true);
    });

    test('should filter logs by action', async () => {
      const response = await request(app)
        .get('/api/barcode/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ action: 'GENERATE_QR' });

      expect(response.status).toBe(200);
      response.body.logs.forEach(log => {
        expect(log.action).toBe('GENERATE_QR');
      });
    });

    test('should filter logs by date range', async () => {
      const startDate = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get('/api/barcode/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ startDate, endDate });

      expect(response.status).toBe(200);
      expect(response.body.logs.length).toBeGreaterThanOrEqual(0);
    });
  });
});
```

### 3️⃣ E2E Tests

#### ملف: `backend/__tests__/e2e.barcode.test.js`

```javascript
import request from 'supertest';
import app from '../server.js';

describe('Barcode System E2E', () => {
  let productId;
  let qrCode;
  let token;

  beforeAll(() => {
    token = generateToken({ id: 'testUser', role: 'admin' });
  });

  test('E2E: Create Product → Generate QR → Scan → Retrieve', async () => {
    // 1. Create product
    const createResponse = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Product',
        sku: 'TEST-001',
        price: 99.99,
        stock: 100,
      });

    expect(createResponse.status).toBe(201);
    productId = createResponse.body.product._id;

    // 2. Generate QR
    const qrResponse = await request(app)
      .post(`/api/barcode/generate-qr/${productId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(qrResponse.status).toBe(200);
    qrCode = qrResponse.body.qrCode;

    // 3. Scan QR (simulate scanning)
    const scanResponse = await request(app)
      .post('/api/barcode/scan')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: qrResponse.body.data,
        type: 'qr',
      });

    expect(scanResponse.status).toBe(200);
    expect(scanResponse.body.product._id).toBe(productId);

    // 4. Verify logs
    const logsResponse = await request(app)
      .get('/api/barcode/logs')
      .set('Authorization', `Bearer ${token}`);

    expect(logsResponse.status).toBe(200);
    const logs = logsResponse.body.logs;
    expect(logs.some(l => l.action === 'GENERATE_QR')).toBe(true);
  });
});
```

---

## 🚀 CI/CD Pipeline - خط الأنابيب المستمر

### GitHub Actions Configuration

#### ملف: `.github/workflows/ci-cd.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:5.0
        options: >-
          --health-cmd mongosh --eval \"db.adminCommand('ping')\"
          --health-interval 10s --health-timeout 5s --health-retries 5
        ports:
          - 27017:27017
      redis:
        image: redis:7.0
        options: >-
          --health-cmd "redis-cli ping" --health-interval 10s --health-timeout
          5s --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Run Linter
        run: npm run lint

      - name: Run Unit Tests
        run: npm run test:unit
        env:
          TEST_MONGODB_URI: mongodb://localhost:27017/test
          REDIS_URL: redis://localhost:6379

      - name: Run Integration Tests
        run: npm run test:integration
        env:
          TEST_MONGODB_URI: mongodb://localhost:27017/test
          REDIS_URL: redis://localhost:6379

      - name: Generate Coverage Report
        run: npm run test:coverage

      - name: Upload Coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false

      - name: Run Security Audit
        run: npm audit --production

  build:
    needs: test
    runs-on: ubuntu-latest

    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Build Docker Image
        run: docker build -t scm-system:latest .

      - name: Tag Image
        run:
          docker tag scm-system:latest ghcr.io/${{ github.repository
          }}/scm-system:${{ github.sha }}

      - name: Push Image
        run: |
          echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker push ghcr.io/${{ github.repository }}/scm-system:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest

    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Staging
        run: |
          kubectl set image deployment/scm-system \
            scm-system=ghcr.io/${{ github.repository }}/scm-system:${{ github.sha }} \
            -n staging

      - name: Verify Deployment
        run: kubectl rollout status deployment/scm-system -n staging

  e2e-tests:
    needs: deploy
    runs-on: ubuntu-latest

    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Run E2E Tests
        run: npm run test:e2e
        env:
          API_URL: https://staging.scm-system.com
          TEST_TIMEOUT: 30000

      - name: Publish Test Results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: e2e-results
          path: test-results/
```

---

## 🐳 Docker Configuration

### ملف: `Dockerfile`

```dockerfile
# Build stage
FROM node:18-alpine as builder

WORKDIR /build

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

# Copy from builder
COPY --from=builder /build /app

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3001

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "server.js"]
```

### ملف: `docker-compose.yml`

```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: scm-app
    ports:
      - '3001:3001'
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/scm
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - SMTP_HOST=${SMTP_HOST}
    depends_on:
      mongo:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3001/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  mongo:
    image: mongo:5.0-alpine
    container_name: scm-mongo
    environment:
      - MONGO_INITDB_DATABASE=scm
    volumes:
      - mongo_data:/data/db
    ports:
      - '27017:27017'
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/scm
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7.0-alpine
    container_name: scm-redis
    volumes:
      - redis_data:/data
    ports:
      - '6379:6379'
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  nginx:
    image: nginx:alpine
    container_name: scm-nginx
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mongo_data:
  redis_data:

networks:
  default:
    name: scm-network
```

---

## 📊 Performance Testing

### ملف: `__tests__/performance.test.js`

```javascript
import k6 from 'k6';
import http from 'k6/http';
import { check, group, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 20 }, // رفع تدريجي إلى 20 مستخدم
    { duration: '1m30s', target: 50 }, // رفع إلى 50 مستخدم
    { duration: '20s', target: 0 }, // إنزال تدريجي
  ],
  thresholds: {
    http_req_duration: ['p(99)<1500', 'p(95)<1000'], // 99% من الطلبات أقل من 1.5 ثانية
    http_req_failed: ['rate<0.1'], // أقل من 10% فشل
  },
};

const BASE_URL = 'http://localhost:3001/api';
const TOKEN = 'your-test-token';

export default function () {
  let authHeaders = {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  // Test QR Generation
  group('QR Code Generation', () => {
    let response = http.post(
      `${BASE_URL}/barcode/generate-qr/507f1f77bcf86cd799439011`,
      { errorCorrection: 'H' },
      authHeaders
    );

    check(response, {
      'status is 200': r => r.status === 200,
      'response time < 500ms': r => r.timings.duration < 500,
      'has qrCode': r => JSON.parse(r.body).qrCode !== undefined,
    });
  });

  sleep(1);

  // Test Batch Generation
  group('Batch Code Generation', () => {
    let productIds = [
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439012',
      '507f1f77bcf86cd799439013',
    ];

    let response = http.post(
      `${BASE_URL}/barcode/batch-generate`,
      JSON.stringify({ productIds }),
      authHeaders
    );

    check(response, {
      'status is 200': r => r.status === 200,
      'response time < 2000ms': r => r.timings.duration < 2000,
    });
  });

  sleep(1);

  // Test Logs Retrieval
  group('Logs Retrieval', () => {
    let response = http.get(`${BASE_URL}/barcode/logs?limit=50`, authHeaders);

    check(response, {
      'status is 200': r => r.status === 200,
      'response time < 300ms': r => r.timings.duration < 300,
      'has logs': r => JSON.parse(r.body).logs.length > 0,
    });
  });

  sleep(2);
}
```

---

## 📋 npm Scripts

#### ملف: `package.json` (الجزء المهم)

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "echo 'No build needed for Node.js'",
    "lint": "eslint . --ext .js",
    "lint:fix": "eslint . --ext .js --fix",
    "test": "jest --coverage",
    "test:unit": "jest --testPathPattern='\\.unit\\.js$'",
    "test:integration": "jest --testPathPattern='\\.integration\\.js$'",
    "test:e2e": "jest --testPathPattern='\\.e2e\\.js$' --runInBand",
    "test:coverage": "jest --coverage --coverageReporters=lcov",
    "test:watch": "jest --watch",
    "test:performance": "k6 run __tests__/performance.test.js",
    "docker:build": "docker build -t scm-system:latest .",
    "docker:run": "docker-compose up -d",
    "docker:stop": "docker-compose down",
    "docker:logs": "docker-compose logs -f app",
    "db:migrate": "node scripts/migrate.js",
    "db:seed": "node scripts/seed.js",
    "analyze": "npm audit --report=json | jq '.metadata.vulnerabilities'"
  }
}
```

---

## 🔍 النتائج المتوقعة

### Test Coverage

```
Statements   : 95%+ ✅
Branches     : 90%+ ✅
Functions    : 95%+ ✅
Lines        : 95%+ ✅
```

### Performance Metrics

```
API Response Time:
- GETمتوسط: < 200ms
- POST متوسط: < 500ms
- Batch Operations: < 2000ms

Uptime: > 99.9%
Error Rate: < 0.1%
```

### Security

```
✅ JWT Authentication
✅ Rate Limiting
✅ Input Validation
✅ SQL Injection Protection
✅ XSS Protection
✅ CORS Configuration
✅ Secure Headers
✅ API Key Management
```

---
