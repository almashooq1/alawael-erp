# 🚀 PHASE 9 - QUICK START INSTALLATION GUIDE

## ⚡ 5-Minute Setup

### Step 1: Install NPM Dependencies

```bash
cd rehabilitation-system
npm install speakeasy qrcode redis compression passport-js stripe twilio @sendgrid/mail axios bull
```

### Step 2: Configure Environment Variables

Create or update `.env` file:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/rehabilitation

# Security
ENCRYPTION_KEY=your-super-secret-encryption-key-2025
HMAC_KEY=your-hmac-key-here

# Redis Caching
REDIS_HOST=localhost
REDIS_PORT=6379

# Stripe Payment
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLIC_KEY=pk_test_YOUR_KEY_HERE

# Twilio (SMS/WhatsApp)
TWILIO_ACCOUNT_SID=AC_YOUR_SID_HERE
TWILIO_AUTH_TOKEN=YOUR_TOKEN_HERE
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+1234567890

# SendGrid (Email)
SENDGRID_API_KEY=SG.YOUR_KEY_HERE
SENDGRID_FROM_EMAIL=noreply@rehabilitation.app

# Google APIs
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
YOUTUBE_API_KEY=YOUR_YOUTUBE_KEY

# Zoom Video Conference
ZOOM_CLIENT_ID=YOUR_ZOOM_CLIENT_ID
ZOOM_CLIENT_SECRET=YOUR_ZOOM_SECRET

# Node Environment
NODE_ENV=development
PORT=3001
```

### Step 3: Add Routes to `server.js`

```javascript
const express = require('express');
const app = express();

// ===== NEW PHASE 9 ROUTES =====

// 1. Security
const securityRoutes = require('./routes/security-advanced.routes');
app.use('/api/security', securityRoutes);

// 2. Support System
const supportRoutes = require('./routes/support-system.routes');
app.use('/api/support', supportRoutes);

// 3. Gamification
const gamificationRoutes = require('./routes/gamification.routes');
app.use('/api/gamification', gamificationRoutes);

// 4. AI/ML
const mlRoutes = require('./routes/ml-service.routes');
app.use('/api/ml', mlRoutes);

// 5. Integrations
const integrationsRoutes = require('./routes/integrations.routes');
app.use('/api/integrations', integrationsRoutes);

// 6. Advanced Management
const managementRoutes = require('./routes/advanced-management.routes');
app.use('/api/management', managementRoutes);

// ===== END PHASE 9 ROUTES =====

module.exports = app;
```

### Step 4: Integrate Services in App

```javascript
// In your express middleware setup
const performanceOptimizer = require('./services/performance-optimizer');
const encryptionService = require('./services/encryption-service');
const auditLogger = require('./services/audit-logger');

// Add compression middleware
app.use(performanceOptimizer.cacheMiddleware(300)); // 5 min cache

// Enable GZIP compression
app.use(require('compression')());

// Add to middleware chain
app.use((req, res, next) => {
  // Log all requests
  auditLogger.logUserAction(
    req.user?.id,
    req.method,
    {
      resource: req.path,
      operation: req.method,
      description: `${req.method} ${req.path}`,
    },
    req
  );
  next();
});
```

### Step 5: Create Frontend Components

Create React components directory:

```bash
mkdir -p frontend/components/{Security,Support,Gamification,ML,Integrations,Management}
```

---

## 🔧 Service Integration Details

### 1. Security Service Integration

```javascript
// In User authentication middleware
const encryptionService = require('./services/encryption-service');

// Encrypt sensitive user data
user.email = encryptionService.encrypt(user.email);

// On retrieval
user.email = encryptionService.decrypt(user.email);
```

### 2. Audit Logging Integration

```javascript
const auditLogger = require('./services/audit-logger');

// Log all sensitive operations
router.post('/programs', authenticate, async (req, res) => {
  const program = new Program(req.body);
  await program.save();

  await auditLogger.logUserAction(
    req.user.id,
    'PROGRAM_CREATED',
    {
      resource: 'program',
      resourceId: program._id,
      operation: 'CREATE',
      description: `Created program: ${program.name}`,
      dataClassification: 'confidential',
    },
    req
  );

  res.json(program);
});
```

### 3. Performance Optimization Integration

```javascript
const performanceOptimizer = require('./services/performance-optimizer');

// Cache expensive queries
router.get('/analytics/dashboard', performanceOptimizer.cacheMiddleware(600), async (req, res) => {
  // Database query that gets cached
  const data = await getAnalyticsData();
  res.json(data); // Automatically cached
});

// Batch queries
const userIds = [id1, id2, id3, ...];
const users = await performanceOptimizer.batchQuery(
  userIds,
  (id) => User.findById(id)
);
```

### 4. Gamification Integration

```javascript
const { GamificationService } = require('./routes/gamification.routes');
const gamificationService = new GamificationService();

// Award points when session completes
router.post('/sessions/:id/complete', authenticate, async (req, res) => {
  const session = await Session.findByIdAndUpdate(req.params.id, {
    completed: true,
    completedAt: Date.now(),
  });

  // Award points
  await gamificationService.awardPoints(
    req.user.id,
    50,
    'SESSION_COMPLETED',
    `Completed session: ${session.name}`
  );

  res.json(session);
});
```

### 5. ML Service Integration

```javascript
const { MLService } = require('./routes/ml-service.routes');
const mlService = new MLService();

// Get predictions on dashboard
router.get('/dashboard', authenticate, async (req, res) => {
  const predictions = await mlService.predictRecoveryProgress(req.user.id);
  const recommendations = await mlService.generateRecommendations(req.user.id);
  const anomalies = await mlService.detectAnomalies(req.user.id);

  res.json({
    predictions,
    recommendations,
    anomalies,
  });
});
```

---

## 📱 Frontend Component Examples

### 1. Security Settings Component

**File:** `frontend/components/Security/SecuritySettings.js`

```javascript
import React, { useState } from 'react';
import axios from 'axios';

export default function SecuritySettings() {
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [backupCodes, setBackupCodes] = useState([]);
  const [securityLog, setSecurityLog] = useState([]);

  const setupTwoFa = async () => {
    try {
      const response = await axios.post('/api/security/2fa/setup');
      setQrCode(response.data.qrCode);
      setBackupCodes(response.data.backupCodes);
    } catch (error) {
      console.error('Setup failed:', error);
    }
  };

  const verifyTwoFa = async token => {
    try {
      await axios.post('/api/security/2fa/verify', { token });
      setTwoFaEnabled(true);
    } catch (error) {
      console.error('Verification failed:', error);
    }
  };

  const getSecurityLog = async () => {
    try {
      const response = await axios.get('/api/security/log');
      setSecurityLog(response.data.logs);
    } catch (error) {
      console.error('Failed to get log:', error);
    }
  };

  return (
    <div className="security-settings">
      <h2>إعدادات الأمان</h2>

      {!twoFaEnabled ? (
        <div>
          <button onClick={setupTwoFa}>تفعيل المصادقة الثنائية</button>
          {qrCode && (
            <div>
              <img src={qrCode} alt="QR Code" />
              <input
                type="text"
                placeholder="أدخل الرمز"
                onBlur={e => verifyTwoFa(e.target.value)}
              />
            </div>
          )}
        </div>
      ) : (
        <p>✅ المصادقة الثنائية مفعلة</p>
      )}

      <button onClick={getSecurityLog}>عرض السجل الأمني</button>
      <table>
        <tbody>
          {securityLog.map((log, i) => (
            <tr key={i}>
              <td>{log.action}</td>
              <td>{new Date(log.timestamp).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 2. Chatbot Widget Component

**File:** `frontend/components/Support/ChatbotWidget.js`

```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ChatbotWidget() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    setMessages([...messages, { type: 'user', text: input }]);

    try {
      const response = await axios.post('/api/support/chat', {
        message: input,
      });
      setMessages(prev => [
        ...prev,
        {
          type: 'bot',
          text: response.data.response,
          suggestions: response.data.suggestions,
        },
      ]);
    } catch (error) {
      console.error('Chat error:', error);
    }

    setInput('');
  };

  return (
    <div className="chatbot-widget">
      {isOpen && (
        <div className="chat-container">
          <div className="messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.type}`}>
                {msg.text}
                {msg.suggestions && (
                  <div className="suggestions">
                    {msg.suggestions.map((s, j) => (
                      <button key={j} onClick={() => setInput(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && sendMessage()}
            placeholder="اكتب سؤالك..."
          />
        </div>
      )}
      <button onClick={() => setIsOpen(!isOpen)}>💬</button>
    </div>
  );
}
```

### 3. Leaderboard Component

**File:** `frontend/components/Gamification/Leaderboard.js`

```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lb, rank, st] = await Promise.all([
          axios.get('/api/gamification/leaderboard?limit=20'),
          axios.get('/api/gamification/rank'),
          axios.get('/api/gamification/stats'),
        ]);

        setLeaderboard(lb.data.leaderboard);
        setUserRank(rank.data.rank);
        setStats(st.data.stats);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="leaderboard">
      <h2>لوحة المتصدرين</h2>

      {stats && (
        <div className="user-stats">
          <p>النقاط: {stats.points}</p>
          <p>الترتيب: #{userRank?.rank}</p>
          <p>المستوى: {userRank?.level}</p>
          <p>الشارات: {stats.badges}</p>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>المستخدم</th>
            <th>النقاط</th>
            <th>المستوى</th>
            <th>الشارات</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((user, i) => (
            <tr key={i}>
              <td>{user.rank}</td>
              <td>
                {user.userId.firstName} {user.userId.lastName}
              </td>
              <td>{user.totalPoints}</td>
              <td>{user.level}</td>
              <td>{user.badges}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 🧪 Testing Commands

### Test 2FA Endpoint

```bash
# Setup 2FA
curl -X POST http://localhost:3001/api/security/2fa/setup \
  -H "Authorization: Bearer YOUR_TOKEN"

# Verify 2FA
curl -X POST http://localhost:3001/api/security/2fa/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token":"123456"}'
```

### Test Chatbot

```bash
curl -X POST http://localhost:3001/api/support/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"كيف يمكنني تحسين برنامجي؟"}'
```

### Test Leaderboard

```bash
curl http://localhost:3001/api/gamification/leaderboard?limit=10
```

### Test ML Predictions

```bash
curl -X GET http://localhost:3001/api/ml/predictions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Database Schema Updates

Run these MongoDB migrations:

```javascript
// Create indexes for better performance
db.users.createIndex({ email: 1 });
db.users.createIndex({ role: 1 });
db.programs.createIndex({ userId: 1, createdAt: -1 });
db.sessions.createIndex({ userId: 1, date: -1 });
db.auditlogs.createIndex({ userId: 1, timestamp: -1 });
db.auditlogs.createIndex({ action: 1, timestamp: -1 });
db.leaderboards.createIndex({ totalPoints: -1 });
```

---

## 🚀 Deployment Checklist

- [ ] Install all dependencies
- [ ] Set environment variables
- [ ] Configure MongoDB connection
- [ ] Configure Redis connection
- [ ] Set up Stripe account & keys
- [ ] Set up Twilio account & keys
- [ ] Set up SendGrid account & keys
- [ ] Set up Google OAuth credentials
- [ ] Set up Zoom credentials
- [ ] Run database migrations
- [ ] Create frontend components
- [ ] Test all endpoints
- [ ] Set up SSL/HTTPS
- [ ] Enable CORS for frontend
- [ ] Set rate limiting
- [ ] Deploy to production

---

## 📞 Support & Documentation

For issues or questions:

1. Check the main documentation in `⚡_PHASE_9_ALL_TRACKS_COMPLETE.md`
2. Review individual route files for API details
3. Check environment configuration in `.env`

**Ready to go! 🎉**
