#!/bin/bash

# Advanced Security & Crisis Management - v1.0.0
# Implements comprehensive security hardening and crisis response procedures

set -e

echo "🛡️  Alawael v1.0.0 - Security & Crisis Management Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create security hardening guide
cat > SECURITY_HARDENING_GUIDE.md << 'SECURITY_EOF'
# Security Hardening Guide - Alawael v1.0.0

## 🔒 Security Framework

### Authentication & Authorization

#### Password Security
- [ ] Minimum 12 characters
- [ ] Require uppercase, lowercase, numbers, special chars
- [ ] Password hashing: bcrypt with salt rounds = 12
- [ ] Reset token: 20 char random, expires in 1 hour
- [ ] No password history reuse

```javascript
// Secure password hashing
const bcrypt = require('bcrypt');

const hash = await bcrypt.hash(password, 12);
const isValid = await bcrypt.compare(password, hash);
```

#### JWT Configuration
- [ ] Secret key: min 32 characters, random
- [ ] Algorithm: HS256 or RS256 (asymmetric preferred)
- [ ] Token expiry: 24 hours (access), 7 days (refresh)
- [ ] Refresh token rotation on use
- [ ] Revoke list for logged-out tokens

```javascript
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { userId: user._id, role: user.role },
  process.env.JWT_SECRET,
  {
    algorithm: 'HS256',
    expiresIn: '24h',
    issuer: 'alawael',
    audience: 'users'
  }
);
```

#### Session Management
- [ ] Secure cookies: httpOnly, secure, sameSite
- [ ] Session timeout: 30 minutes of inactivity
- [ ] Concurrent session limit: max 3 per user
- [ ] Session tracking: IP and user agent validation

```javascript
app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 1800000  // 30 minutes
  }
}));
```

#### Multi-Factor Authentication (MFA)
- [ ] TOTP (Time-based One-Time Password) via Google Authenticator
- [ ] SMS backup codes (for account recovery)
- [ ] Required for privileged operations
- [ ] Audit logging of MFA changes

### Data Protection

#### Encryption at Rest
- [ ] Database field-level encryption for sensitive data
- [ ] AES-256 for encryption, random IVs for each field
- [ ] Key management: Enterprise key management service
- [ ] Key rotation: Every 90 days

```javascript
const crypto = require('crypto');

function encryptField(data, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}
```

#### Encryption in Transit
- [ ] TLS 1.2+ for all connections
- [ ] HSTS: Enable for 1 year (includeSubDomains)
- [ ] Certificate pinning for critical endpoints
- [ ] Perfect forward secrecy (PFS) enabled

```nginx
# NGINX TLS Configuration
server {
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;
  
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

#### Secrets Management
- [ ] Never commit secrets to repository
- [ ] Use environment variables for all secrets
- [ ] Rotate credentials every 90 days
- [ ] Use password manager for shared secrets

```bash
# .env.example (committed, no secrets)
DATABASE_URL=mongodb://localhost:27017/alawael
API_KEY=your-api-key-here
JWT_SECRET=your-jwt-secret-here

# .env (not committed, with real values)
DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/alawael
API_KEY=sk-1234567890abcdefghij
JWT_SECRET=your-actual-secret-key-min-32-chars
```

### API Security

#### Rate Limiting
- [ ] Global: 1000 requests/minute per IP
- [ ] Auth endpoint: 10 attempts/minute
- [ ] API endpoints: 100 requests/minute per user
- [ ] Implement exponential backoff

```javascript
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 60000,  // 1 minute
  max: 10,           // 10 requests
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, try again later'
});

const apiLimiter = rateLimit({
  windowMs: 60000,
  max: 100,
  keyGenerator: (req) => req.user?.id || req.ip
});
```

#### CORS Configuration
- [ ] Whitelist specific origins
- [ ] Allow only necessary methods
- [ ] Restrict headers to required ones
- [ ] Allow credentials only when needed

```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 3600
}));
```

#### Input Validation
- [ ] Validate all inputs on server side
- [ ] Use schema validation (Joi, Zod)
- [ ] Sanitize special characters
- [ ] Limit request size (50MB max)

```javascript
const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(12).required(),
  age: Joi.number().integer().min(18).max(120)
});

const { error, value } = schema.validate(req.body);
if (error) return res.status(400).send(error.details);
```

#### OWASP Top 10 Prevention

| Vulnerability | Prevention |
|----------------|-----------|
| Injection | Parameterized queries, input validation |
| Broken Auth | Strong passwords, MFA, session management |
| Sensitive Data | Encryption, HTTPS, secure cookies |
| XML External Entities | Disable entity expansion |
| Broken Access Control | Role-based access, policy enforcement |
| Security Misconfiguration | Configuration hardening, minimal dependencies |
| XSS | Output encoding, CSP headers, sanitization |
| Insecure Deserialization | Validate serialized objects, avoid untrusted data |
| Using Components with Known Vulnerabilities | Dependency scanning, regular updates |
| Insufficient Logging | Audit logging, error tracking, alerting |

### Infrastructure Security

#### Network Security
- [ ] Private database (no public IP)
- [ ] VPC/Network security groups
- [ ] Whitelist IP addresses where possible
- [ ] No open ports except 22, 443

```bash
# AWS Security Group Rules
# Inbound HTTPS only (443)
aws ec2 authorize-security-group-ingress \
  --group-id sg-123456 \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Whitelist specific IPs for SSH (22)
aws ec2 authorize-security-group-ingress \
  --group-id sg-123456 \
  --protocol tcp \
  --port 22 \
  --cidr 203.0.113.0/32
```

#### Database Security
- [ ] Require authentication (username/password or certificate)
- [ ] No default credentials
- [ ] Minimal user privileges (principle of least privilege)
- [ ] Monitor all database access
- [ ] Regular backups with encryption

```bash
# MongoDB users with minimal privileges
db.createUser({
  user: "app_user",
  pwd: "secure_password",
  roles: [{
    role: "readWrite",
    db: "alawael"
  }]
});

# Create read-only user for analytics
db.createUser({
  user: "analytics_user",
  pwd: "secure_password",
  roles: [{
    role: "read",
    db: "alawael"
  }]
});
```

#### Container Security
- [ ] Scan images for vulnerabilities
- [ ] Use Alpine Linux (minimal image)
- [ ] Non-root user in containers
- [ ] Read-only filesystem where possible

```dockerfile
# Security hardened Dockerfile
FROM node:18-alpine

# Install security updates
RUN apk update && apk upgrade

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy files with correct ownership
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Run security scan
RUN npm audit
```

### Application Monitoring

#### Security Logging
- [ ] Log all authentication attempts
- [ ] Log all authorization failures
- [ ] Log all data access
- [ ] Log all admin actions
- [ ] Exclude sensitive data from logs

```javascript
// Security logging
const auditLogger = (action, user, resource, result) => {
  logger.info({
    timestamp: new Date(),
    action: action,
    userId: user.id,
    userEmail: user.email,
    resource: resource,
    result: result,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
};
```

#### Anomaly Detection
- [ ] Monitor failed login attempts (alert > 5 in 1 hour)
- [ ] Monitor API errors (alert > 100 in 5 minutes)
- [ ] Monitor unusual IP addresses
- [ ] Monitor unusual patterns (e.g., mass data access)

#### Alerting
- [ ] Immediate alerts for critical security events
- [ ] Daily summary of security events
- [ ] Integration with incident response

### Compliance & Auditing

#### Compliance Requirements
- [ ] GDPR: Data privacy, right to delete
- [ ] CCPA: Consumer privacy rights
- [ ] PCI-DSS: If handling credit cards
- [ ] SOC 2: If processing customer data

#### Audit Trail
- [ ] Immutable logging
- [ ] Tamper-proof audit logs
- [ ] Retention: 7 years for compliance data
- [ ] Regular log review

#### Penetration Testing
- [ ] Quarterly external penetration testing
- [ ] Annual security audit
- [ ] Regular vulnerability scanning
- [ ] Bug bounty program (optional)

SECURITY_EOF

echo "✅ Security hardening guide created: SECURITY_HARDENING_GUIDE.md"
echo ""

# Create crisis management plan
cat > CRISIS_MANAGEMENT_PLAN.md << 'CRISIS_EOF'
# Crisis Management Plan - Alawael v1.0.0

## 🚨 Crisis Response Framework

### Severity Levels

**Level 1: Critical (Immediate Response)**
- System completely unavailable
- Data corruption or loss
- Security breach (confirmed)
- Revenue impact > $100K/hour
- Customer data exposure
- Response time: 5 minutes, 24/7

**Level 2: High (Urgent Response)**
- Major functionality broken
- 50% services down
- Performance degradation > 50%
- Customer impact: > 100 users
- Response time: 30 minutes, 24/7

**Level 3: Medium (Standard Response)**
- Partial functionality broken
- 10% services down
- Performance degradation > 20%
- Customer impact: < 100 users
- Response time: 4 hours, business hours

**Level 4: Low (Scheduled Response)**
- Minor issues
- Workarounds available
- No customer impact
- Response time: next business day

---

## 🎯 Crisis Command Structure

### Incident Commander
**Role:** Lead response efforts, coordinate team, communicate status

**Responsibilities:**
- [ ] Declare incident severity
- [ ] Activate response team
- [ ] Communicate status every 15 minutes
- [ ] Make critical decisions
- [ ] Approve workarounds/rollbacks
- [ ] Post-incident review lead

### Technical Lead
**Role:** Diagnose and fix technical issues

**Responsibilities:**
- [ ] Analyze logs and errors
- [ ] Identify root cause
- [ ] Implement fix or workaround
- [ ] Test solution
- [ ] Verify resolution

### DevOps Lead
**Role:** Infrastructure response and deployment

**Responsibilities:**
- [ ] Scale resources if needed
- [ ] Manage failover/failback
- [ ] Deploy fixes
- [ ] Monitor system health
- [ ] Coordinate backups/restore

### Communications Lead
**Role:** Internal and external communication

**Responsibilities:**
- [ ] Update status page
- [ ] Notify stakeholders
- [ ] Post on social media
- [ ] Prepare public statements
- [ ] Customer support briefing

---

## 📋 Crisis Scenarios & Response Plans

### Scenario 1: Database Corruption

**Indicators:**
- Invalid data in database
- Application errors querying data
- Data integrity checks fail
- Monitoring alerts on query errors

**Immediate Actions (< 5 minutes):**
1. [ ] Declare incident (severity: P1)
2. [ ] Activate incident command
3. [ ] Stop write operations (read-only mode)
4. [ ] Begin diagnostics

**Recovery Actions (5-30 minutes):**
1. [ ] Identify corruption scope
2. [ ] Check latest good backup
3. [ ] Estimate data loss window
4. [ ] Restore from backup
5. [ ] Verify data integrity
6. [ ] Resume operations gradually

**Expected Timeline:**
- Detection: 5 minutes
- Assessment: 5-10 minutes
- Recovery: 15-30 minutes
- **Total RTO: 30-45 minutes**
- **RPO: Last backup (24 hours)**

**Prevention Measures:**
- Daily automated backups
- Backup integrity checks
- Point-in-time recovery available
- Data validation tests
- Monitoring for corruption patterns

---

### Scenario 2: Complete Service Outage

**Indicators:**
- Health check endpoint unreachable
- All API endpoints returning 5xx errors
- Load balancer unable to reach instances
- Customer reports system down

**Immediate Actions (< 5 minutes):**
1. [ ] Declare incident (severity: P1)
2. [ ] Verify outage (check multiple sources)
3. [ ] Check infrastructure status
4. [ ] Page on-call engineering lead

**Diagnosis (5-15 minutes):**
1. [ ] Check container status: `docker ps`
2. [ ] Review recent logs: `docker logs -f`
3. [ ] Check resource usage: `docker stats`
4. [ ] Verify network connectivity
5. [ ] Check external service dependencies

**Recovery (5-30 minutes):**
```bash
# Option 1: Quick restart
docker-compose restart

# Option 2: Full restart if needed
docker-compose down
docker-compose up -d

# Option 3: Scale up if overloaded
docker-compose up --scale app=5

# Option 4: Deploy previous known-good version
git checkout [previous-tag]
docker build -t alawael:recovery .
docker run -d alawael:recovery
```

**Expected Timeline:**
- Detection: 1-2 minutes
- Setup: 2-3 minutes
- Recovery: 5-10 minutes
- **Total RTO: 10-15 minutes**

**Prevention Measures:**
- Health checks every 30 seconds
- Automated alerting
- Load balancer with failover
- Multiple instances
- Container restart policies

---

### Scenario 3: Security Breach

**Indicators:**
- Unauthorized access detected
- Suspicious database queries
- Credential compromise suspected
- External announcement of breach

**Immediate Actions (< 5 minutes):**
1. [ ] Declare incident (severity: P1)
2. [ ] Notify security officer
3. [ ] Preserve evidence (logs, snapshots)
4. [ ] Pause normal operations if needed
5. [ ] Activate security response team

**Containment (15-30 minutes):**
1. [ ] Isolate affected systems
2. [ ] Disable compromised user accounts
3. [ ] Reset all passwords
4. [ ] Revoke all API tokens/keys
5. [ ] Review access logs for unauthorized activity
6. [ ] Block suspicious IP addresses

**Investigation (1-24 hours):**
1. [ ] Analyze security logs
2. [ ] Identify breach vector
3. [ ] Determine data exposed
4. [ ] Assess customer impact
5. [ ] Notify affected customers
6. [ ] File incident report with authorities (if required)

**Remediation (24-72 hours):**
1. [ ] Patch vulnerability
2. [ ] Redeploy systems
3. [ ] Force password reset for all users
4. [ ] Implement additional monitoring
5. [ ] Review and update security policies

**Communication:**
- Hour 1: Internal notification
- Hour 2: Customer notification (if data exposed)
- Hour 4: Public statement
- Day 3: Detailed post-mortem

---

### Scenario 4: Performance Degradation

**Indicators:**
- Response times > 1000ms
- Database queries taking > 2 seconds
- Error rate > 1%
- Customer complaints about slowness

**Immediate Actions (< 10 minutes):**
1. [ ] Declare incident (severity: P2)
2. [ ] Gather performance metrics
3. [ ] Identify performance bottleneck

**Diagnosis (10-20 minutes):**
```bash
# Check system resources
docker stats

# Check database
db.currentOp()

# Check slow queries
db.setProfilingLevel(1, { slowms: 100 })

# Analyze cache hit rate
redis-cli INFO stats
```

**Quick Fixes:**
1. [ ] Clear cache if relevant
2. [ ] Kill long-running queries
3. [ ] Add database indexes if missing
4. [ ] Scale up resources if CPU/memory high
5. [ ] Reduce batch sizes if processing large amounts

**Long-term Solution:**
1. [ ] Investigate root cause
2. [ ] Add appropriate monitoring
3. [ ] Implement caching
4. [ ] Optimize queries
5. [ ] Upgrade infrastructure if needed

---

## 🔧 Crisis Toolkit

### Monitoring & Diagnostics

```bash
# Health check
curl -s http://localhost:3000/api/health | jq .

# Container stats
docker stats --no-stream

# Database status
mongosh --eval "db.adminCommand('ping')"

# Memory usage
docker inspect --format='{{.State.Pid}}' container-id | xargs ps aux

# Network connections
netstat -tupln | grep ESTABLISHED

# Disk space
df -h

# System load
uptime
top -b -n 1 | head -n 10
```

### Emergency Procedures

**Rollback to Previous Version**
```bash
# Find previous version
git log --oneline -5

# Checkout previous version
git checkout [previous-commit]

# Rebuild
docker build -t alawael:rollback .

# Deploy
docker kill alawael-api
docker run -d --name alawael-api alawael:rollback

# Verify
./health-check.sh
```

**Scale Resources Quickly**
```bash
# Increase instances
docker-compose up -d --scale app=10

# Increase memory (in docker-compose.yml)
mem_limit: 2g

# Add temporary cache layer
docker run -d redis:latest
```

**Database Recovery**
```bash
# From backup
./restore-database.sh /backups/daily/db_backup_*.gz

# Point-in-time restore
mongorestore --archive=backup.gz -u admin -p password
```

### Communication Templates

**Internal Update (every 15 min)**
```
🔴 CRITICAL INCIDENT: [TITLE]
Status: [INVESTIGATING/MITIGATING/RESOLVED]
Duration: [TIME]
Impact: [DETAIL]
Next Update: [TIME + 15 min]
```

**Customer Communication**
```
We're aware of [ISSUE] affecting [PERCENTAGE]% of users.
Our team is working on a fix. Latest status: [STATUS]
We apologize for the inconvenience.
```

**Post-Incident Report**
```
Timeline:
- 14:32: Issue detected
- 14:35: Incident declared
- 14:50: Root cause identified
- 15:10: Fix deployed
- 15:15: System normalized

Root Cause: [CAUSE]
Impact: [DETAILS]
Resolution: [SOLUTION]
Prevention: [FUTURE MEASURES]
```

---

## 📞 Crisis Team Contact Information

| Role | Name | Phone | Email | Backup |
|------|------|-------|-------|--------|
| Incident Commander | [Name] | [Phone] | [Email] | [Backup] |
| Technical Lead | [Name] | [Phone] | [Email] | [Backup] |
| DevOps Lead | [Name] | [Phone] | [Email] | [Backup] |
| Communications | [Name] | [Phone] | [Email] | [Backup] |
| Security Lead | [Name] | [Phone] | [Email] | [Backup] |

---

## 📊 Post-Incident Process

### Within 24 Hours
- [ ] Incident report filed
- [ ] Root cause analysis begun
- [ ] Corrective actions identified
- [ ] Timeline documented

### Within 1 Week
- [ ] Detailed RCA complete
- [ ] Preventive measures identified
- [ ] Post-mortem meeting held
- [ ] Action items assigned with owners

### Within 30 Days
- [ ] All action items completed
- [ ] Monitoring improvements deployed
- [ ] Process updates documented
- [ ] Team training completed

---

## 🎓 Crisis Drills

**Monthly Drill Schedule:**
- First Monday: Communication drill
- Second Monday: Technical recovery drill
- Third Monday: Full end-to-end drill
- Fourth Monday: Security incident drill

**Drill Requirements:**
- [ ] Use production-like environment
- [ ] Measure actual response times
- [ ] Test communication procedures
- [ ] Verify playbook accuracy
- [ ] Document lessons learned

CRISIS_EOF

echo "✅ Crisis management plan created: CRISIS_MANAGEMENT_PLAN.md"
echo ""

# Create security audit checklist
cat > SECURITY_AUDIT_CHECKLIST.md << 'AUDIT_EOF'
# Security Audit Checklist - Alawael v1.0.0

## Pre-Audit Preparation

### Information to Gather
- [ ] Architecture diagram (data flow, network topology)
- [ ] User access matrix (who has what permissions)
- [ ] Secrets rotation history
- [ ] Incident history (last 12 months)
- [ ] Third-party services used
- [ ] Compliance requirements
- [ ] Security policies documentation

### Audit Scope
- [ ] Application code security
- [ ] Infrastructure security
- [ ] Network security
- [ ] Data protection
- [ ] Access control
- [ ] Incident response capability
- [ ] Compliance status

---

## Security Assessment

### Authentication (20 points)

- [ ] (5) Strong password requirements enforced
- [ ] (5) Multi-factor authentication available
- [ ] (5) Session management secure
- [ ] (5) API keys with expiration and rotation

### Authorization (20 points)

- [ ] (5) Role-based access control (RBAC) implemented
- [ ] (5) Principle of least privilege enforced
- [ ] (5) Admin access restricted and logged
- [ ] (5) API request authentication on all endpoints

### Data Protection (20 points)

- [ ] (5) Encryption at rest (AES-256)
- [ ] (5) Encryption in transit (TLS 1.2+)
- [ ] (5) Sensitive data not logged
- [ ] (5) Database backups encrypted

### Network Security (15 points)

- [ ] (5) Firewall rules configured
- [ ] (5) Private database (no public IP)
- [ ] (5) VPC or equivalent isolation

### Application Security (20 points)

- [ ] (5) Input validation on all endpoints
- [ ] (5) Output encoding for XSS prevention
- [ ] (5) SQL injection prevention (parameterized queries)
- [ ] (5) CSRF protection enabled

### Vulnerability Management (15 points)

- [ ] (5) Dependency scanning enabled
- [ ] (5) Security patches applied regularly
- [ ] (5) Vulnerability tracking system in place

### Monitoring & Logging (10 points)

- [ ] (5) Security events logged
- [ ] (5) Alerts for suspicious activity

---

## Scoring Guide

| Score | Assessment | Action Required |
|-------|-----------|-----------------|
| 90-100 | Excellent | Maintain current practices |
| 80-89 | Good | Plan improvements for next quarter |
| 70-79 | Fair | Implement improvements in next sprint |
| 60-69 | Poor | Urgent action required |
| < 60 | Critical | Do not deploy to production |

---

## Remediation Tasks

### Critical (Must complete before production)

- [ ] [Task]: [Owner]: [Deadline]
- [ ] [Task]: [Owner]: [Deadline]

### High (Complete within 2 weeks)

- [ ] [Task]: [Owner]: [Deadline]
- [ ] [Task]: [Owner]: [Deadline]

### Medium (Complete within 1 month)

- [ ] [Task]: [Owner]: [Deadline]

### Low (Plan for next quarter)

- [ ] [Task]: [Owner]: [Deadline]

---

**Audit Date:** __________  
**Auditor:** __________  
**Score:** __________  
**Status:** __________  
**Sign-off:** __________  

AUDIT_EOF

echo "✅ Security audit checklist created: SECURITY_AUDIT_CHECKLIST.md"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Security & Crisis Management Setup Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📚 Created Security Documentation:"
echo "   1. SECURITY_HARDENING_GUIDE.md"
echo "   2. CRISIS_MANAGEMENT_PLAN.md"
echo "   3. SECURITY_AUDIT_CHECKLIST.md"
echo ""

echo "🔒 Security Hardening Included:"
echo "   ✅ Authentication & authorization"
echo "   ✅ Password security (bcrypt)"
echo "   ✅ JWT configuration"
echo "   ✅ Session management"
echo "   ✅ Multi-factor authentication"
echo "   ✅ Encryption at rest & transit"
echo "   ✅ API security (rate limiting, CORS)"
echo "   ✅ Input validation"
echo "   ✅ OWASP Top 10 prevention"
echo ""

echo "🚨 Crisis Management Scenarios:"
echo "   ✅ Database corruption recovery"
echo "   ✅ Complete service outage"
echo "   ✅ Security breach response"
echo "   ✅ Performance degradation"
echo ""

echo "⏱️  Response Times:"
echo "   • Critical: < 5 minutes (24/7)"
echo "   • High: < 30 minutes"
echo "   • Medium: < 4 hours"
echo "   • Low: next business day"
echo ""

echo "✅ All security & crisis files created!"
echo ""
