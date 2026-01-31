# 🔗 AGI Integration Guide

## دمج نظام AGI مع Backend الرئيسي

هذا الدليل يشرح كيفية دمج نظام AGI مع Backend الرئيسي للتطبيق.

---

## 📋 الطرق المتاحة للتكامل

### 1️⃣ كخدمة منفصلة (Microservice) ⭐ موصى به

النظام يعمل كخدمة مستقلة على منفذ منفصل:

```
Backend الرئيسي: http://localhost:5000
AGI System: http://localhost:5001
```

**المميزات:**

- ✅ فصل المسؤوليات
- ✅ قابلية التوسع المستقلة
- ✅ سهولة الصيانة
- ✅ تحديثات بدون توقف

---

### 2️⃣ كـ Module داخل Backend

دمج AGI كـ module داخل الـ backend الرئيسي.

---

## 🚀 الطريقة 1: كخدمة منفصلة (موصى به)

### الخطوة 1: تشغيل AGI System

```bash
# في terminal منفصل
cd intelligent-agent/backend/agi
npm install
npm run dev
```

AGI سيعمل على: `http://localhost:5001`

### الخطوة 2: استدعاء AGI من Backend الرئيسي

#### في Express Backend:

```typescript
// backend/services/agi.service.ts
import axios from 'axios';

const AGI_URL = process.env.AGI_URL || 'http://localhost:5001/api/agi';

export class AGIService {
  /**
   * Process general input through AGI
   */
  async process(input: string, context?: any) {
    try {
      const response = await axios.post(`${AGI_URL}/process`, {
        input,
        context,
      });
      return response.data;
    } catch (error) {
      console.error('AGI Service Error:', error);
      throw error;
    }
  }

  /**
   * Use reasoning capabilities
   */
  async reason(goal: string, evidence: any[], method?: string) {
    const response = await axios.post(`${AGI_URL}/reason`, {
      goal,
      evidence,
      method,
    });
    return response.data;
  }

  /**
   * Make decisions
   */
  async decide(situation: string, options: any[], criteria: any[]) {
    const response = await axios.post(`${AGI_URL}/decide`, {
      situation,
      options,
      criteria,
    });
    return response.data;
  }

  /**
   * Create innovative solutions
   */
  async create(problem: string, constraints: string[], outcomes: string[]) {
    const response = await axios.post(`${AGI_URL}/create`, {
      problem,
      constraints,
      outcomes,
    });
    return response.data;
  }

  /**
   * Plan for goals
   */
  async plan(goal: string, deadline?: Date, horizon?: string) {
    const response = await axios.post(`${AGI_URL}/plan`, {
      goal,
      deadline,
      horizon,
    });
    return response.data;
  }
}

export const agiService = new AGIService();
```

### الخطوة 3: استخدام AGI في Routes

```typescript
// backend/routes/intelligent.routes.ts
import express from 'express';
import { agiService } from '../services/agi.service';

const router = express.Router();

/**
 * POST /api/intelligent/process
 * Process any input through AGI
 */
router.post('/process', async (req, res) => {
  try {
    const { input, context } = req.body;
    const result = await agiService.process(input, context);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/intelligent/analyze
 * Analyze and provide insights
 */
router.post('/analyze', async (req, res) => {
  try {
    const { data, analysisType } = req.body;

    // Use AGI reasoning
    const reasoning = await agiService.reason(
      `Analyze: ${analysisType}`,
      [data],
      'inductive'
    );

    res.json({ analysis: reasoning });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/intelligent/suggest
 * Get AI suggestions
 */
router.post('/suggest', async (req, res) => {
  try {
    const { problem, context } = req.body;

    // Use AGI creativity
    const suggestions = await agiService.create(
      problem,
      context.constraints || [],
      context.outcomes || []
    );

    res.json({ suggestions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### الخطوة 4: تسجيل Routes في Backend الرئيسي

```typescript
// backend/server.ts
import intelligentRoutes from './routes/intelligent.routes';

app.use('/api/intelligent', intelligentRoutes);
```

---

## 🔧 الطريقة 2: كـ Module داخلي

### الخطوة 1: نسخ ملفات AGI

```bash
cp -r intelligent-agent/backend/agi/* backend/modules/agi/
```

### الخطوة 2: استيراد مباشر

```typescript
// backend/controllers/ai.controller.ts
import AGICoreSystem from '../modules/agi/agi.core';

const agi = new AGICoreSystem({
  cognitiveFrequency: 1000,
  maxWorkingMemory: 7,
  learningRate: 0.01,
  explorationRate: 0.1,
});

export class AIController {
  async processRequest(req: Request, res: Response) {
    try {
      const { input, context } = req.body;
      const result = await agi.process(input, context);
      res.json({ success: true, result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
```

---

## 🐳 Docker Deployment

### مع Docker Compose:

```yaml
# docker-compose.yml (في الـ root)
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - '5000:5000'
    environment:
      - AGI_URL=http://agi-system:5001
    depends_on:
      - agi-system

  agi-system:
    build: ./intelligent-agent/backend/agi
    ports:
      - '5001:5001'
    environment:
      - NODE_ENV=production

  frontend:
    build: ./frontend
    ports:
      - '3000:3000'
    depends_on:
      - backend
```

### تشغيل:

```bash
docker-compose up -d
```

---

## 🔄 Load Balancing (للإنتاج)

### مع Nginx:

```nginx
# nginx.conf
upstream agi_backend {
    least_conn;
    server agi-system-1:5001;
    server agi-system-2:5001;
    server agi-system-3:5001;
}

server {
    listen 80;

    location /api/agi/ {
        proxy_pass http://agi_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://backend:5000;
    }
}
```

---

## 📊 مثال كامل: دمج مع Express Backend

```typescript
// backend/index.ts
import express from 'express';
import cors from 'cors';
import { agiService } from './services/agi.service';
import intelligentRoutes from './routes/intelligent.routes';

const app = express();

app.use(cors());
app.use(express.json());

// Existing routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);

// AGI-powered intelligent routes
app.use('/api/intelligent', intelligentRoutes);

// Example: Add AGI capabilities to existing endpoints
app.post('/api/products/recommend', async (req, res) => {
  try {
    const { userId, preferences } = req.body;

    // Get user data
    const userData = await getUserData(userId);

    // Use AGI for intelligent recommendations
    const reasoning = await agiService.reason(
      'Recommend products based on user preferences',
      [userData, preferences],
      'analogical'
    );

    const decision = await agiService.decide(
      'Select best product recommendations',
      reasoning.conclusions,
      ['relevance', 'price', 'availability']
    );

    res.json({ recommendations: decision.selectedOption });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(5000, () => {
  console.log('Backend running on http://localhost:5000');
  console.log('AGI features available at /api/intelligent');
});
```

---

## 🧪 اختبار التكامل

```typescript
// backend/tests/agi.integration.test.ts
import request from 'supertest';
import app from '../app';

describe('AGI Integration Tests', () => {
  test('should process intelligent request', async () => {
    const response = await request(app)
      .post('/api/intelligent/process')
      .send({
        input: 'Analyze sales trends',
        context: { domain: 'business' },
      });

    expect(response.status).toBe(200);
    expect(response.body.result).toBeDefined();
  });

  test('should get AI suggestions', async () => {
    const response = await request(app)
      .post('/api/intelligent/suggest')
      .send({
        problem: 'Improve customer retention',
        context: {
          constraints: ['limited budget'],
          outcomes: ['increase retention by 20%'],
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.suggestions).toBeDefined();
  });
});
```

---

## 📈 مراقبة الأداء

```typescript
// backend/middleware/agi.monitor.ts
export function agiMonitoringMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    console.log({
      path: req.path,
      method: req.method,
      duration,
      status: res.statusCode,
      agiCall: req.path.includes('/intelligent'),
    });
  });

  next();
}
```

---

## 🔐 الأمان

### إضافة Authentication:

```typescript
// backend/middleware/agi.auth.ts
export function agiAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const apiKey = req.headers['x-agi-api-key'];

  if (!apiKey || apiKey !== process.env.AGI_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

// في routes:
router.use(agiAuthMiddleware);
```

---

## 🎯 أفضل الممارسات

### 1. استخدام Cache للنتائج

```typescript
import Redis from 'ioredis';
const redis = new Redis();

async function cachedAGIProcess(input: string, context: any) {
  const cacheKey = `agi:${input}:${JSON.stringify(context)}`;

  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Call AGI
  const result = await agiService.process(input, context);

  // Cache result (1 hour)
  await redis.setex(cacheKey, 3600, JSON.stringify(result));

  return result;
}
```

### 2. تعامل مع الأخطاء

```typescript
async function safeAGICall(operation: () => Promise<any>) {
  const maxRetries = 3;
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }

  throw lastError;
}
```

### 3. Timeouts

```typescript
import axios from 'axios';

const agiClient = axios.create({
  baseURL: process.env.AGI_URL,
  timeout: 30000, // 30 seconds
  headers: { 'Content-Type': 'application/json' },
});
```

---

## 📞 الدعم

للمزيد من المعلومات:

- [AGI Documentation](./README_AGI.md)
- [Examples](./EXAMPLES.md)
- [API Reference](./agi.routes.ts)

---

**Happy Integrating! 🚀🔗**
