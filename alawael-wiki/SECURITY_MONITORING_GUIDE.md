# 🔒 Security & Monitoring Setup Guide

**Version:** 1.0.0  
**Date:** February 22, 2026  
**Status:** Production Ready

---

## 📋 Table of Contents

1. [Security Configuration](#security-configuration)
2. [Monitoring Setup](#monitoring-setup)
3. [Logging Configuration](#logging-configuration)
4. [Alert Configuration](#alert-configuration)
5. [Backup & Disaster Recovery](#backup--disaster-recovery)
6. [Security Checklist](#security-checklist)

---

## 🔐 Security Configuration

### **1. Environment Variables Security**

```bash
# .env.production - Never commit this file!
# Add to .gitignore:
.env.production
.env.*.local
.env.local

# Use strong, random values:
JWT_SECRET=generate-with-crypto.randomBytes(32).toString('hex')
SESSION_SECRET=use-strong-random-string
ENCRYPTION_KEY=use-strong-random-string
```

### **2. Password Hashing & Storage**

```javascript
// In authentication service
const bcrypt = require('bcrypt');

// Hash password before storing
const hashedPassword = await bcrypt.hash(password, 10);

// Verify password on login
const isValid = await bcrypt.compare(password, hashedPassword);
```

### **3. JWT Configuration**

```javascript
// In config/jwt.js
module.exports = {
  secretKey: process.env.JWT_SECRET,
  expiryTime: '7d',
  refreshTokenExpiry: '30d',
  algorithm: 'HS256',
  issuer: 'alawael-api',
  audience: 'alawael-users'
};
```

### **4. CORS Configuration**

```javascript
// Restrict origins based on environment
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
```

### **5. HTTPS/TLS Configuration**

```javascript
// Use HTTPS in production
const https = require('https');
const fs = require('fs');

if (process.env.NODE_ENV === 'production') {
  const options = {
    key: fs.readFileSync('/path/to/private-key.pem'),
    cert: fs.readFileSync('/path/to/certificate.pem')
  };
  
  https.createServer(options, app).listen(3000);
}
```

### **6. Rate Limiting**

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false // Disable X-RateLimit-* headers
});

// Apply to all routes
app.use('/api/', limiter);

// Stricter limit for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true
});

app.post('/api/auth/login', loginLimiter, authController.login);
```

### **7. SQL Injection & NoSQL Injection Prevention**

```javascript
// Use Mongoose schema validation
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    match: /.+\@.+\..+/
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  }
});

// Use parameterized queries
// MongoDB with mongoose automatically prevents NoSQL injection
User.find({ email: sanitizedEmail });
```

### **8. XSS Prevention**

```javascript
const helmet = require('helmet');

// Use helmet to set security headers
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", 'data:', 'https:']
  }
}));
```

### **9. Data Encryption**

```javascript
const crypto = require('crypto');

const algorithm = 'aes-256-gcm';
const encryptionKey = process.env.ENCRYPTION_KEY;

function encryptData(data) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(encryptionKey, 'hex'), iv);
  
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    iv: iv.toString('hex'),
    data: encrypted,
    authTag: cipher.getAuthTag().toString('hex')
  };
}

function decryptData(encrypted) {
  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(encryptionKey, 'hex'),
    Buffer.from(encrypted.iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));
  let decrypted = decipher.update(encrypted.data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
}
```

### **10. Two-Factor Authentication (2FA)**

```javascript
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Generate 2FA secret
function generate2FASecret(email) {
  return speakeasy.generateSecret({
    name: `Alawael (${email})`,
    issuer: 'Alawael',
    length: 32
  });
}

// Verify 2FA token
function verify2FAToken(secret, token) {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2
  });
}
```

---

## 📊 Monitoring Setup

### **1. Application Monitoring with Sentry**

```bash
# Install Sentry
npm install @sentry/node @sentry/tracing
```

```javascript
// Initialize in app.js
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  maxBreadcrumbs: 50,
  beforeSend: (event) => {
    // Filter sensitive data
    if (event.request?.headers?.authorization) {
      delete event.request.headers.authorization;
    }
    return event;
  }
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// ... your routes ...

app.use(Sentry.Handlers.errorHandler());
```

### **2. Uptime Monitoring**

```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  const healthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV,
    checks: {
      memory: process.memoryUsage(),
      database: 'connected', // Check MongoDB connection
      redis: 'connected',    // Check Redis connection
      cpu: process.cpuUsage()
    }
  };
  
  res.json(healthStatus);
});

// Register with uptime monitoring service (e.g., UptimeRobot)
// POST https://api.uptimerobot.com/v2/monitorAdd
```

### **3. APM Monitoring**

```javascript
// Add to package.json
"elastic-apm-node": "^3.50.0"

// Add to app.js before other requires
const apm = require('elastic-apm-node')({
  serviceName: 'alawael-backend',
  secretToken: process.env.ELASTIC_APM_SECRET_TOKEN,
  serverUrl: process.env.ELASTIC_APM_SERVER_URL,
  environment: process.env.NODE_ENV,
  logLevel: 'warn'
});
```

### **4. Database Monitoring**

```javascript
// MongoDB monitoring
const mongooseConnection = mongoose.connection;

mongooseConnection.on('connected', () => {
  console.log('MongoDB connected');
  // Log to monitoring service
});

mongooseConnection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  // Alert ops team
});

// Check MongoDB performance
db.serverStatus().ok === 1
```

### **5. Redis Monitoring**

```javascript
// Monitor Redis connection
redis.on('error', (err) => {
  console.error('Redis error:', err);
  // Alert ops team
});

redis.on('ready', () => {
  console.log('Redis ready');
});

// Get Redis stats
redis.info('stats', (err, info) => {
  console.log('Redis stats:', info);
});
```

---

## 📝 Logging Configuration

### **1. Winston Logger Setup**

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'alawael-backend' },
  transports: [
    // File logs
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error'
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }),
    // Console logs (development)
    ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ] : [])
  ]
});

module.exports = logger;
```

### **2. Request Logging with Morgan**

```javascript
const morgan = require('morgan');

// Custom morgan format
morgan.token('user-id', (req) => req.user?.id || 'anonymous');

const morganFormat = ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms';

app.use(morgan(morganFormat, {
  stream: fs.createWriteStream('logs/access.log', { flags: 'a' })
}));
```

### **3. Audit Logging**

```javascript
// Log sensitive operations
const auditLog = async (action, userId, resource, details) => {
  try {
    const log = new AuditLog({
      action,
      userId,
      resource,
      details,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date()
    });
    
    await log.save();
  } catch (err) {
    logger.error('Audit log failed:', err);
  }
};

// Usage
app.put('/users/:id', async (req, res) => {
  // ... update user ...
  await auditLog('UPDATE_USER', req.user.id, `User:${req.params.id}`, req.body);
});
```

---

## 🔔 Alert Configuration

### **Alert Rules**

```yaml
# alerts.yml
groups:
  - name: Application Alerts
    rules:
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) > 0.01
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: DatabaseDown
        expr: up{job="mongodb"} == 0
        for: 1m
        annotations:
          summary: "MongoDB is down"

      - alert: HighMemoryUsage
        expr: memory_usage_percent > 80
        for: 5m
        annotations:
          summary: "High memory usage"

      - alert: HighCPUUsage
        expr: cpu_usage_percent > 80
        for: 5m
        annotations:
          summary: "High CPU usage"

      - alert: SlowQueryResponse
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
        for: 5m
        annotations:
          summary: "Slow query response"
```

### **Slack Integration**

```javascript
const axios = require('axios');

const notifySlack = async (message, level = 'info') => {
  const colors = {
    error: '#FF0000',
    warning: '#FFA500',
    info: '#0099FF'
  };

  try {
    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      attachments: [{
        color: colors[level],
        title: `Alert: ${level.toUpperCase()}`,
        text: message,
        ts: Math.floor(Date.now() / 1000)
      }]
    });
  } catch (err) {
    logger.error('Slack notification failed:', err);
  }
};

// Usage
if (errorRate > threshold) {
  await notifySlack('High error rate detected!', 'error');
}
```

---

## 💾 Backup & Disaster Recovery

### **Automated Backup Strategy**

```bash
#!/bin/bash
# backup-all.sh

BACKUP_DIR="/var/backups/alawael"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup MongoDB
mongodump \
  --uri="$MONGODB_URI" \
  --out="$BACKUP_DIR/mongo_$TIMESTAMP"

# Backup application data
tar -czf "$BACKUP_DIR/app_data_$TIMESTAMP.tar.gz" /app/data

# Upload to S3
aws s3 sync $BACKUP_DIR s3://alawael-backups/ \
  --delete \
  --storage-class STANDARD_IA

# Clean old backups (keep last 30 days)
find $BACKUP_DIR -type d -mtime +30 -exec rm -rf {} +

echo "Backup completed: $TIMESTAMP"
```

### **Recovery Procedure**

```bash
#!/bin/bash
# restore-backup.sh

BACKUP_DATE=${1:-latest}
BACKUP_DIR="/var/backups/alawael"

# Download from S3
aws s3 sync s3://alawael-backups/$BACKUP_DATE $BACKUP_DIR/

# Restore MongoDB
mongorestore \
  --uri="$MONGODB_URI" \
  "$BACKUP_DIR/mongo_$BACKUP_DATE"

# Restore app data
tar -xzf "$BACKUP_DIR/app_data_$BACKUP_DATE.tar.gz" -C /

echo "Recovery completed from: $BACKUP_DATE"
```

---

## ✅ Security Checklist

### **Pre-Production Deployment**

- [ ] **Authentication**
  - [ ] JWT secret configured (min 32 chars)
  - [ ] Password hashing enabled (bcrypt)
  - [ ] 2FA implemented
  - [ ] Session timeout configured (15-30 min)
  - [ ] Login rate limiting enabled

- [ ] **Transport Security**
  - [ ] HTTPS/TLS enabled
  - [ ] Certificate valid and not expired
  - [ ] HSTS headers configured
  - [ ] CSP headers set

- [ ] **Database Security**
  - [ ] MongoDB authentication enabled
  - [ ] Network restricted (not open to public)
  - [ ] Encryption at rest enabled
  - [ ] Backups encrypted
  - [ ] No default credentials

- [ ] **API Security**
  - [ ] CORS properly configured
  - [ ] Rate limiting enabled
  - [ ] Input validation on all endpoints
  - [ ] No sensitive data in logs
  - [ ] API keys rotated
  - [ ] OAuth2 for third-party integrations

- [ ] **Code Security**
  - [ ] Dependency audit passed (`npm audit`)
  - [ ] No hardcoded secrets
  - [ ] Security headers configured (helmet)
  - [ ] Error messages don't leak info
  - [ ] Code reviewed

- [ ] **Monitoring & Logging**
  - [ ] Sentry configured
  - [ ] Error tracking enabled
  - [ ] Access logs configured
  - [ ] Audit logs enabled
  - [ ] Alert rules configured
  - [ ] Slack/Email notifications setup

- [ ] **Backup & Recovery**
  - [ ] Backup strategy defined
  - [ ] Automated backups running
  - [ ] Recovery tested
  - [ ] Backup encryption enabled

- [ ] **Compliance**
  - [ ] GDPR compliance checked
  - [ ] Data retention policies defined
  - [ ] Privacy policy updated
  - [ ] Terms of service updated

---

## 📞 Security Incident Response

### **Incident Severity Levels**

- **Critical (P1):** System down, data breach, security exploit
- **High (P2):** Degraded performance, security vulnerability
- **Medium (P3):** Minor bugs, warnings
- **Low (P4):** Documentation, improvements

### **Contact Escalation**

1. **On-Call Engineer:** [contact]
2. **Security Team:** security@alawael.com
3. **Management:** [contact]
4. **External:** [incident reporting contact]

---

## 📈 Security Metrics Dashboard

Monitor these KPIs:

```
- Failed login attempts
- API error rate
- Average response time
- Database performance
- Memory usage
- CPU usage
- Uptime percentage
- Security events per day
- Backup success rate
```

---

**Last Updated:** February 22, 2026  
**Next Review:** March 22, 2026

---

🎉 **All security measures configured and monitoring active!**
