# SECURITY HARDENING CHECKLIST
# ALAWAEL ERP Production Environment
# Version: 1.0.0 | Date: February 28, 2026

---

## 1. NETWORK SECURITY

### 1.1 Firewall Configuration
- [ ] **Windows Firewall**
  ```powershell
  # Allow only necessary ports
  New-NetFirewallRule -DisplayName "Allow HTTPS" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 443
  New-NetFirewallRule -DisplayName "Allow HTTP" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 80
  New-NetFirewallRule -DisplayName "Allow Node.js App" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3001
  
  # Block all other inbound traffic
  Set-NetFirewallProfile -DefaultInboundAction Block -DefaultOutboundAction Allow
  ```

- [ ] **Linux/macOS UFW Firewall**
  ```bash
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow 80/tcp    # HTTP
  ufw allow 443/tcp   # HTTPS
  ufw allow 3001/tcp  # Node.js backend
  ufw enable
  ```

### 1.2 DDoS Protection
- [ ] Setup rate limiting (Nginx configured)
- [ ] Enable CloudFlare DDoS protection (optional, recommended)
- [ ] Configure IP whitelist for internal services
- [ ] Monitor unusual traffic patterns

### 1.3 VPN & Network Access
- [ ] Restrict database access to localhost only
- [ ] Require VPN for sensitive operations
- [ ] Implement network segmentation (if applicable)
- [ ] Whitelist known IP addresses for admin access

---

## 2. APPLICATION SECURITY

### 2.1 Environment Security
- [ ] **Secrets Management**
  ```bash
  # Verify .env is in .gitignore
  cat backend/.gitignore | grep .env
  
  # Verify no secrets in git history
  git log -p | grep -i "password\|secret\|token\|apikey" || echo "✅ No secrets found"
  ```

- [ ] **Environment Variables**
  ```powershell
  # Production .env contains:
  NODE_ENV=production
  MONGODB_URI=mongodb://localhost:27017/alawael-erp
  JWT_SECRET=<secure-random-string>
  SESSION_SECRET=<secure-random-string>
  API_KEY=<randomized>
  ```

### 2.2 Code Security
- [ ] Run security audit
  ```bash
  cd backend
  npm audit
  npm audit fix --audit-level=moderate
  ```

- [ ] Dependencies locked at specific versions
  ```bash
  cat package-lock.json | head -10  # Verify lock file exists
  ```

- [ ] No deprecated dependencies in use
  ```bash
  npm outdated  # Check for outdated packages
  ```

### 2.3 API Security
- [ ] HTTPS enforced (all traffic redirected to SSL)
- [ ] CORS properly configured
  ```javascript
  // backend/config/cors.js
  const corsOptions = {
    origin: ['https://alawael-erp.com', 'https://www.alawael-erp.com'],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };
  ```

- [ ] Rate limiting implemented
  ```javascript
  // Max 100 requests per 15 minutes per IP
  const rateLimit = require('express-rate-limit');
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later.'
  });
  ```

- [ ] Request validation middleware active
- [ ] SQL injection protection (using parameterized queries)
- [ ] XSS protection (sanitize all inputs)
- [ ] CSRF tokens implemented

### 2.4 Authentication & Authorization
- [ ] JWT tokens with expiration (15 minutes)
- [ ] Refresh token rotation enabled
- [ ] Password requirements enforced
  - Minimum 12 characters
  - Mix of uppercase, lowercase, numbers, special characters
  - No common passwords allowed

- [ ] Multi-factor authentication (MFA) enabled
- [ ] Session timeout implemented (30 minutes inactivity)
- [ ] Role-based access control (RBAC) configured

---

## 3. DATA SECURITY

### 3.1 Database Security
- [ ] MongoDB authentication enabled
  ```bash
  # Connect with credentials
  mongo --username admin --password <secure-password> --authenticationDatabase admin
  ```

- [ ] Database encryption at rest (if available)
- [ ] Regular backups scheduled (automated)
- [ ] Backup encryption enabled
- [ ] Backup retention policy: 30 days minimum

### 3.2 Data Protection
- [ ] Sensitive data encrypted in transit
- [ ] PII data masked in logs
- [ ] No hardcoded sensitive data in code
- [ ] Audit logging enabled for data access
- [ ] GDPR compliance implemented (if applicable)

### 3.3 Backup & Disaster Recovery
- [ ] Daily automated backups verified
  ```bash
  # Check backup directory
  ls -lah /mongodb-backups/
  # Should show: backup_YYYY-MM-DD_HH-MM-SS folders
  ```

- [ ] Backup restoration tested monthly
- [ ] Disaster recovery plan documented
- [ ] RTO (Recovery Time Objective): < 1 hour
- [ ] RPO (Recovery Point Objective): < 24 hours

---

## 4. INFRASTRUCTURE SECURITY

### 4.1 Server Hardening
- [ ] SSH key-based authentication (no password login)
  ```bash
  # Generate SSH key pair
  ssh-keygen -t ed25519 -f ~/.ssh/alawael-backend
  
  # Add to server authorized_keys
  cat ~/.ssh/alawael-backend.pub >> ~/.ssh/authorized_keys
  ```

- [ ] Automatic security updates enabled
  - Ubuntu: `unattended-upgrades` package
  - Windows: Windows Update automatic

- [ ] Disable unnecessary services
- [ ] Change default SSH port (if on Linux)

### 4.2 User Access Control
- [ ] Principle of least privilege implemented
- [ ] Admin accounts require MFA
- [ ] Service accounts running with minimal permissions
- [ ] Regular access reviews (quarterly)

### 4.3 System Monitoring
- [ ] System logs actively monitored
  - Windows: Event Viewer
  - Linux: /var/log/syslog

- [ ] Failed login attempts logged and alerted
- [ ] Failed sudo attempts logged
- [ ] Configuration file modifications tracked
- [ ] Unexpected process execution detected

---

## 5. CONTAINERIZATION SECURITY (If Using Docker)

### 5.1 Docker Security
- [ ] Base image kept up-to-date
- [ ] No secrets in Docker image
- [ ] Non-root user in container
  ```dockerfile
  USER nodeuserbackend
  ```

- [ ] Read-only filesystem where possible
- [ ] Container health checks configured
- [ ] Resource limits set (CPU, memory)

### 5.2 Container Registry
- [ ] Private container registry used
- [ ] Image scanning enabled
- [ ] Only signed images allowed
- [ ] Image retention policy: 30 days

---

## 6. INCIDENT RESPONSE

### 6.1 Incident Response Plan
- [ ] Incident response team defined
- [ ] Escalation procedures documented
- [ ] Communication plan during incidents
- [ ] Post-incident review process in place

### 6.2 Security Events to Monitor
- [ ] Unauthorized access attempts (5+ in 1 hour) → ALERT
- [ ] Service unavailability > 10 minutes → PAGE ON-CALL
- [ ] Data breach indicators (unusual database queries) → INCIDENT
- [ ] Performance degradation > 50% → ALERT

### 6.3 Emergency Contacts
- [ ] Primary Admin: admin@alawael-erp.com
- [ ] Security Team: security@alawael-erp.com
- [ ] On-Call: [Phone/Pager]
- [ ] Third-party vendors: [Contact info]

---

## 7. COMPLIANCE & AUDITING

### 7.1 Audit Logging
- [ ] All admin actions logged
- [ ] API access logs with timestamps
- [ ] Database query logs (sensitive operations)
- [ ] Log retention: Minimum 90 days
- [ ] Logs immutable (write-once, read-many)

### 7.2 Compliance Requirements
- [ ] GDPR compliance (if EU users)
- [ ] Data Localization (data stored in approved regions)
- [ ] PCI DSS (if handling credit cards)
- [ ] SOC 2 compliance (if required by clients)

### 7.3 Regular Security Audits
- [ ] Monthly security scans
- [ ] Quarterly penetration testing
- [ ] Annual third-party security audit
- [ ] Vulnerability assessment quarterly

---

## 8. DEPLOYMENT CHECKLIST

- [ ] All security measures implemented
- [ ] Security team approval obtained
- [ ] Security testing completed
- [ ] Monitoring alerts configured
- [ ] Incident response team trained
- [ ] Documentation updated
- [ ] Backup verification completed
- [ ] Rollback plan prepared

---

## 9. ONGOING MAINTENANCE

### 9.1 Weekly Tasks
- [ ] Review security logs
- [ ] Check backup integrity
- [ ] Monitor SSL certificate expiration (>30 days remaining)

### 9.2 Monthly Tasks
- [ ] Run security audit (`npm audit`)
- [ ] Review failed login attempts
- [ ] Test backup restoration
- [ ] Update security documentation

### 9.3 Quarterly Tasks
- [ ] Penetration testing
- [ ] Vulnerability assessment
- [ ] Access review
- [ ] Security training

### 9.4 Annual Tasks
- [ ] Full security audit
- [ ] Compliance review
- [ ] Disaster recovery drill
- [ ] Security policy update

---

## 10. SECURITY RESOURCES

### External Tools & Services
- **npm audit**: Built-in dependency vulnerability scanning
- **OWASP ZAP**: Free security testing tool
- **Burp Suite Community**: Web security testing
- **Synopsys/Black Duck**: Software composition analysis
- **Snyk**: Continuous vulnerability monitoring
- **Wiz**: Cloud security posture management

### References
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Node.js Security: https://nodejs.org/en/docs/guides/security/
- Express.js Security: https://expressjs.com/en/advanced/best-practice-security.html
- MongoDB Security: https://docs.mongodb.com/manual/security/

---

## Completion Status

**Date Completed:** February 28, 2026  
**Completed By:** ALAWAEL Deployment Team  
**Verified By:** Security Review Team  

**Total Checks:** 87  
**Completed Checks:** [To be updated after implementation]  
**Compliance Score:** [To be calculated]  

---

*Last Updated: February 28, 2026*  
*Next Review: March 31, 2026*
