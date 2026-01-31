# 🎯 SECURITY HARDENING CHECKLIST

**Purpose**: Ensure Intelligent Agent meets security standards  
**Scope**: Infrastructure, Application, Data, Access  
**Last Updated**: January 29, 2026

---

## 🔐 Security Tiers

### Tier 1: Critical (Must Have)

- [ ] Encryption at rest
- [ ] Encryption in transit (TLS/SSL)
- [ ] Authentication & authorization
- [ ] Secrets management
- [ ] Network isolation
- [ ] Security scanning
- [ ] Audit logging
- [ ] Access control

### Tier 2: Important (Should Have)

- [ ] Rate limiting
- [ ] DDoS protection
- [ ] WAF rules
- [ ] API gateway security
- [ ] Penetration testing
- [ ] Security headers
- [ ] CORS configuration
- [ ] Input validation

### Tier 3: Enhanced (Nice to Have)

- [ ] Multi-factor authentication
- [ ] Service mesh
- [ ] Advanced threat detection
- [ ] Security orchestration
- [ ] Compliance automation
- [ ] Zero-trust architecture

---

## 🔒 Infrastructure Security

### Kubernetes Security

```bash
# [ ] Enable RBAC
kubectl api-resources | grep rbac

# [ ] Configure network policies
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-isolation
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: intelligent-agent
      component: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: intelligent-agent
          component: frontend
    ports:
    - protocol: TCP
      port: 5000
EOF

# [ ] Enable Pod Security Standards
kubectl label namespace production pod-security.kubernetes.io/enforce=baseline

# [ ] Verify admission controllers
kubectl api-versions | grep admission

# [ ] Check RBAC bindings
kubectl get rolebindings -A
kubectl get clusterrolebindings -A
```

### Container Security

```bash
# [ ] Non-root user
# Verify Dockerfile:
USER 1001  # Not root (UID 0)

# [ ] Read-only filesystem
securityContext:
  readOnlyRootFilesystem: true

# [ ] No privilege escalation
securityContext:
  allowPrivilegeEscalation: false

# [ ] Drop all capabilities
securityContext:
  capabilities:
    drop:
    - ALL

# [ ] Scan for vulnerabilities
trivy image ghcr.io/intelligent-agent/backend:latest

# [ ] Verify image doesn't contain secrets
docker history ghcr.io/intelligent-agent/backend:latest | grep -i "secret\|password\|key"
```

### Network Security

```bash
# [ ] Enable TLS for all traffic
# Verify in ingress:
tls:
  - hosts:
    - intelligent-agent.com
    secretName: intelligent-agent-tls

# [ ] Force HTTPS redirect
nginx.ingress.kubernetes.io/ssl-redirect: "true"

# [ ] Enable HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# [ ] Configure firewall rules
# (Cloud-provider specific)
# AWS Security Groups: Inbound 443 (HTTPS), 80 (HTTP → redirect)
# GCP Firewall: Allow 443, deny others

# [ ] Enable VPC flow logs
# (Platform-specific for debugging network issues)

# [ ] Restrict outbound traffic
# Only allow connections to: GitHub, npm registry, external APIs
```

---

## 🔑 Secrets & Credentials Management

### Kubernetes Secrets

```bash
# [ ] Use encrypted secrets (etcd encryption)
# [ ] Don't store secrets in git (use git-crypt or sealed-secrets)
# [ ] Rotate secrets regularly

# Create secret
kubectl create secret generic app-secrets \
  --from-literal=db_password=$(openssl rand -base64 32) \
  -n production

# [ ] Verify secret is not visible
kubectl get secret app-secrets -o yaml  # Shows Base64, not plain text

# [ ] Use RBAC to limit secret access
kubectl create rolebinding backend-secrets \
  --clusterrole=edit \
  --serviceaccount=production:backend \
  -n production
```

### External Secrets Management

```bash
# [ ] Consider using external secret manager:
# - HashiCorp Vault
# - AWS Secrets Manager
# - Google Secret Manager
# - Azure Key Vault

# Example with HashiCorp Vault:
vault kv put secret/intelligent-agent \
  database_password="$(openssl rand -base64 32)" \
  api_key="sk-..."

# Retrieve in pod
vault kv get secret/intelligent-agent
```

### Secret Rotation

```bash
# [ ] Establish rotation schedule (every 90 days)
# [ ] Implement rotation script

#!/bin/bash
echo "Rotating secrets..."

# Generate new secrets
NEW_DB_PASSWORD=$(openssl rand -base64 32)
NEW_JWT_SECRET=$(openssl rand -base64 32)

# Update secrets
kubectl patch secret intelligent-agent-secrets -p \
  "{\"data\":{\"database_password\":\"$(echo -n $NEW_DB_PASSWORD | base64)\"}} " \
  -n production

# Restart pods to pick up new secrets
kubectl rollout restart deployment/intelligent-agent-backend -n production

# Test new secrets work
kubectl logs deployment/intelligent-agent-backend -n production -f | grep -i "connected\|error"

echo "Secret rotation complete"
```

---

## 🛡️ Application Security

### Input Validation

```bash
# [ ] Validate all user inputs
# Check code for:
// Good:
const { body, validationResult } = require('express-validator');
router.post('/api/users', [
  body('email').isEmail(),
  body('username').isLength({ min: 3, max: 20 }),
  body('password').isLength({ min: 12 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors });
  // Process...
});

// Bad:
app.post('/api/users', (req, res) => {
  // No validation!
  const user = req.body;
  // Use directly...
});
```

### SQL Injection Prevention

```bash
# [ ] Use prepared statements (parameterized queries)
// Good (using parameterized queries):
const query = 'SELECT * FROM users WHERE email = $1';
db.query(query, [email]);

// Bad (string concatenation):
const query = `SELECT * FROM users WHERE email = '${email}'`;
db.query(query);

# Verify in codebase:
grep -r "SELECT.*\$" ./backend/models/ | head -5
```

### XSS Prevention

```bash
# [ ] Sanitize output
// Good:
<p>{sanitizeHtml(userInput)}</p>

// Bad:
<p dangerouslySetInnerHTML={{__html: userInput}} />

# [ ] Set security headers
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "https://cdn.example.com"],
    styleSrc: ["'self'", "'unsafe-inline'"],
  }
}));
```

### CSRF Protection

```bash
# [ ] Implement CSRF tokens
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: false });

app.post('/api/form', csrfProtection, (req, res) => {
  // Verify CSRF token
  // Process form
});

# [ ] Enable SameSite cookies
res.cookie('session', token, {
  sameSite: 'strict',
  httpOnly: true,
  secure: true
});
```

### Authentication & Authorization

```bash
# [ ] Strong password requirements
// Enforce in registration:
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Check against common passwords

# [ ] Multi-factor authentication (MFA)
// Implement:
- TOTP (Time-based One-Time Password)
- WebAuthn (FIDO2)
- SMS (for backup only)

# [ ] Rate limiting on login attempts
// After 5 failed attempts:
- Lock account for 15 minutes
- Send email alert
- Require email verification

# [ ] Implement JWT properly
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { userId: user.id },
  process.env.JWT_SECRET,
  { expiresIn: '24h', algorithm: 'HS256' }
);

# [ ] Verify JWT on every request
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

---

## 🔍 Data Security

### Data Encryption

```bash
# [ ] Encrypt database connections
# PostgreSQL connection string:
postgresql://user:password@host:5432/db?sslmode=require

# [ ] Enable database encryption at rest
# AWS RDS: Enable encryption
# GCP Cloud SQL: Enable encryption
# Azure Database: Enable encryption

# [ ] Encrypt application secrets in code
// Use @aws-sdk/client-secrets-manager
const client = new SecretsManagerClient();
const secret = await client.send(new GetSecretValueCommand({
  SecretId: 'intelligent-agent-secrets'
}));

# [ ] Encrypt sensitive fields in database
// Example fields: passwords, SSNs, credit cards, tokens
```

### Data Privacy

```bash
# [ ] Implement data retention policies
// Delete after X days:
- Session logs: 90 days
- Audit logs: 1 year
- User activity: 180 days
- Failed logins: 30 days

# [ ] Implement GDPR compliance
// User rights:
- Right to access: /api/users/me/export
- Right to delete: /api/users/me (DELETE)
- Right to portability: /api/users/me/export
- Right to be forgotten: Automatic after 30 days inactivity

# [ ] Anonymize sensitive data in logs
// Before logging:
- Hash user IDs
- Redact email addresses
- Hide API keys: "sk_****...****"
- Redact credit card numbers: "****...****1234"
```

### Backup Security

```bash
# [ ] Encrypt backups
# [ ] Store in separate location (different region)
# [ ] Test restore procedures
# [ ] Limit access to backups

# Create encrypted backup
pg_dump intelligent_agent | openssl enc -aes-256-cbc -e > backup.enc

# Store in secure location
aws s3 cp backup.enc s3://backups-encrypted/ --sse-c

# Verify backup integrity
aws s3 ls s3://backups-encrypted/
```

---

## 📊 Monitoring & Logging

### Security Logging

```bash
# [ ] Log all authentication attempts
kubectl logs deployment/intelligent-agent-backend -n production | grep -i "login\|auth"

# [ ] Log all API access
# Log format should include:
- Timestamp
- User ID (hashed if sensitive)
- Endpoint
- Method
- Status code
- Response time
- IP address (last octet masked)

# [ ] Log all configuration changes
kubectl audit all -n production

# [ ] Log all secret access
kubectl logs -f deployment/intelligent-agent-backend | grep -i "secret\|credential"
```

### Security Alerts

```bash
# [ ] Alert on failed authentication (>5 attempts)
# [ ] Alert on unauthorized API calls
# [ ] Alert on database connection failures
# [ ] Alert on SSL certificate expiry (<30 days)
# [ ] Alert on suspicious traffic patterns
# [ ] Alert on vulnerability scanner findings

# Configure in Prometheus
groups:
- name: security_alerts
  rules:
  - alert: FailedAuthAttempts
    expr: rate(failed_auth_total[5m]) > 5
    for: 1m
    annotations:
      summary: "Multiple failed authentication attempts"
  - alert: UnauthorizedAPIAccess
    expr: rate(http_requests_total{status="401"}[5m]) > 10
    for: 1m
```

---

## 🔧 Vulnerability Management

### Regular Scanning

```bash
# [ ] Weekly vulnerability scans
# [ ] Automated dependency scanning

# npm audit
npm audit --audit-level=high

# Docker image scanning
trivy image ghcr.io/intelligent-agent/backend:latest --severity HIGH,CRITICAL

# OWASP dependency check
dependency-check --project "Intelligent Agent" --format HTML

# CodeQL static analysis
codeql database create codeql-db --language=javascript
codeql database analyze codeql-db --format=SARIF-latest

# [ ] Subscribe to security advisories
# - npm package advisories
# - NVD (National Vulnerability Database)
# - GHSA (GitHub Security Advisory Database)
```

### Incident Response Plan

```bash
# [ ] Document response procedures
1. Detection
   - Monitoring alert received
   - Manual report submitted

2. Triage
   - Assess severity (Critical/High/Medium/Low)
   - Determine impact scope
   - Identify affected users

3. Containment
   - Isolate affected system
   - Stop data exfiltration
   - Preserve evidence

4. Investigation
   - Analyze logs and metrics
   - Determine root cause
   - Identify compromise timeline

5. Remediation
   - Fix vulnerability
   - Deploy patch
   - Rotate credentials
   - Update security rules

6. Communication
   - Notify affected users
   - Update stakeholders
   - Post-incident report

7. Prevention
   - Implement monitoring
   - Update security controls
   - Conduct training
   - Update policies

# [ ] Test incident response plan (quarterly drills)
# [ ] Document lessons learned
```

---

## 📋 Compliance Checklist

### OWASP Top 10

- [ ] A01:2021 – Broken Access Control
- [ ] A02:2021 – Cryptographic Failures
- [ ] A03:2021 – Injection
- [ ] A04:2021 – Insecure Design
- [ ] A05:2021 – Security Misconfiguration
- [ ] A06:2021 – Vulnerable and Outdated Components
- [ ] A07:2021 – Identification and Authentication Failures
- [ ] A08:2021 – Software and Data Integrity Failures
- [ ] A09:2021 – Logging and Monitoring Failures
- [ ] A10:2021 – Server-Side Request Forgery

### GDPR Compliance

- [ ] Legal basis for data processing documented
- [ ] Data Processing Agreement (DPA) in place
- [ ] Privacy Policy published
- [ ] User consent mechanisms (cookies, opt-in)
- [ ] Data Subject Rights implemented
- [ ] Data retention policies documented
- [ ] Breach notification procedures in place
- [ ] Data Protection Officer appointed (if required)
- [ ] Privacy impact assessment (DPIA) completed

### SOC 2 Type II

- [ ] CC6: Logical Access Controls
- [ ] CC7: System Monitoring
- [ ] CC8: Change Management
- [ ] CC9: Risk Mitigation

### ISO 27001

- [ ] Asset management
- [ ] Personnel security
- [ ] Physical security
- [ ] Operations security
- [ ] Communications security
- [ ] System acquisition & development
- [ ] Supplier relationships
- [ ] Information security incident management
- [ ] Business continuity management

---

## 🚀 Security Hardening Roadmap

### Phase 1 (Weeks 1-2): Immediate

- [ ] Enable RBAC
- [ ] Enable network policies
- [ ] Implement TLS everywhere
- [ ] Rotate secrets

### Phase 2 (Weeks 3-4): Short-term

- [ ] Set up security scanning
- [ ] Implement input validation
- [ ] Add security headers
- [ ] Enable audit logging

### Phase 3 (Weeks 5-8): Medium-term

- [ ] Implement MFA
- [ ] Set up SIEM
- [ ] Complete penetration test
- [ ] Implement encryption at rest

### Phase 4 (Ongoing): Long-term

- [ ] Continuous vulnerability scanning
- [ ] Security training program
- [ ] Incident response drills
- [ ] Compliance audits

---

## ✅ Security Signoff

| Component      | Status | Reviewer | Date |
| -------------- | ------ | -------- | ---- |
| Infrastructure | ☐      |          |      |
| Application    | ☐      |          |      |
| Data           | ☐      |          |      |
| Access Control | ☐      |          |      |
| Monitoring     | ☐      |          |      |

**Security Lead Approval**: ********\_\_\_******** Date: ****\_\_\_****

**Ready for Production**: YES / NO

---

**Questions?** Contact Security Team  
**Report Vulnerabilities**: security@intelligent-agent.com  
**Last Audit**: January 29, 2026  
**Next Audit**: April 29, 2026
