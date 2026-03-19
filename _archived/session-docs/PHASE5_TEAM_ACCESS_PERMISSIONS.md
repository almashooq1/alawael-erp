# PHASE 5: TEAM ACCESS & PERMISSIONS SETUP
# Production Role-Based Access Control
# ALAWAEL ERP System
# Date: February 28, 2026

---

## OVERVIEW

Establish secure role-based access control (RBAC) for team members with principle of least privilege.

**Objectives:**
- Define user roles (Admin, DevOps, Developer, Support)
- Configure SSH key-based authentication
- Setup application-level permissions
- Enable audit logging for all access
- Create access request/approval workflow

**Setup Time:** 30-45 minutes

---

## USER ROLES & PERMISSIONS

### Role 1: System Administrator
**Count:** 1-2 people  
**Responsibility:** Complete system access, backups, security

```powershell
# Permissions:
- SSH access to production server (SSH key)
- PM2 process management (start/stop/restart)
- Database admin access (MongoDB)
- Log file access and rotation
- Backup and recovery procedures
- Security patch deployment
- SSH public key modifications

# Users:
1. Primary Admin: [Name]
   Email: admin@alawael-erp.com
   SSH Key: ~/.ssh/id_rsa_alawael_admin
   
2. Secondary Admin: [Backup Name]
   Email: backup-admin@alawael-erp.com
   SSH Key: ~/.ssh/id_rsa_alawael_admin_backup
```

### Role 2: DevOps Engineer
**Count:** 1-2 people  
**Responsibility:** Deployment, monitoring, scaling

```powershell
# Permissions:
- SSH access to production server (SSH key)
- PM2 logs access (read-only)
- Deployment scripts execution
- Database backup verification (read-only)
- Monitoring dashboard access
- Alert management
- No SSH key modification permissions

# Users:
1. DevOps Lead: [Name]
   Email: devops@alawael-erp.com
   SSH Key: ~/.ssh/id_rsa_alawael_devops
   
2. DevOps Secondary: [Name]
   Email: devops-secondary@alawael-erp.com
   SSH Key: ~/.ssh/id_rsa_alawael_devops_secondary
```

### Role 3: Developer
**Count:** 2-5 people  
**Responsibility:** Code deployment, testing

```powershell
# Permissions:
- Git repository access (push to main branch with approval)
- PM2 logs access (read-only)
- Non-production API testing
- Database query access (read staging database only)
- Code review responsibilities
- No production server SSH access
- No production database write access

# Users:
1. Lead Developer: [Name]
   Email: dev-lead@alawael-erp.com
   Git SSH Key: ~/.ssh/id_rsa_alawael_dev
   
2-5. Other Developers
   Emails: dev1@alawael-erp.com, dev2@alawael-erp.com, ...
   Git SSH Keys: Individual SSH keys per developer
```

### Role 4: Support/Operations
**Count:** 1-2 people  
**Responsibility:** User support, incident triage

```powershell
# Permissions:
- PM2 logs access (read-only)
- API health checks
- User data queries (read-only, non-sensitive)
- Ticket management system access
- No production server SSH access
- No source code access
- Limited incident escalation capability

# Users:
1. Support Lead: [Name]
   Email: support@alawael-erp.com
   Dashboard Access: Company Slack + monitoring tools
```

---

## SSH KEY SETUP

### Generate SSH Keys (For Each User)

**For Admin/DevOps on Windows:**
```powershell
# Generate RSA key pair
ssh-keygen -t rsa -b 4096 -f "$env:USERPROFILE\.ssh\id_rsa_alawael" -N "secure-passphrase"

# Output:
# Your public key has been saved in ...\id_rsa_alawael.pub
# Your private key has been saved in ...\id_rsa_alawael

# Verify
Get-Content "$env:USERPROFILE\.ssh\id_rsa_alawael.pub"
```

**For Developers on Mac/Linux:**
```bash
# Generate key
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa_alawael -N "secure-passphrase"

# Add to SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_rsa_alawael

# Configure SSH client
cat >> ~/.ssh/config << EOF
Host alawael-prod
  HostName alawael-erp.example.com
  User production
  IdentityFile ~/.ssh/id_rsa_alawael
  IdentitiesOnly yes
EOF
```

### Add Public Keys to Server

**On Production Server:**
```bash
# Create authorized_keys file
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add all authorized public keys
# (Copy-paste each user's public key)
cat >> ~/.ssh/authorized_keys << 'EOF'
# Admin SSH Key
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAAB... admin@alawael-erp.com

# DevOps SSH Key
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAAB... devops@alawael-erp.com

# Developer SSH Key
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAAB... dev@alawael-erp.com
EOF

# Secure permissions
chmod 600 ~/.ssh/authorized_keys

# Disable password authentication in sshd_config
sudo vi /etc/ssh/sshd_config
# Set: PasswordAuthentication no
# Then restart: sudo systemctl restart sshd
```

### Test SSH Connection

```powershell
# Test connection
ssh -i "$env:USERPROFILE\.ssh\id_rsa_alawael" production@alawael-prod.example.com

# Expected: Connected to production server
# If failed: Check key permissions and server configuration
```

---

## APPLICATION-LEVEL PERMISSIONS

### Database Roles & Access

**MongoDB User Creation:**
```javascript
// Connect as admin
use admin

// Create application user (reduced privileges)
db.createUser({
  user: "alawael_app",
  pwd: "application-secure-password",
  roles: [
    { role: "readWrite", db: "alawael-erp" }
  ]
})

// Create readonly user (for backups/monitoring)
db.createUser({
  user: "alawael_readonly",
  pwd: "readonly-secure-password",
  roles: [
    { role: "read", db: "alawael-erp" }
  ]
})

// Create admin user (for maintenance)
db.createUser({
  user: "alawael_admin",
  pwd: "admin-secure-password",
  roles: [
    { role: "dbAdmin", db: "alawael-erp" },
    { role: "backup", db: "admin" },
    { role: "restore", db: "admin" }
  ]
})
```

### Application User Management

**In your Node.js application:**
```javascript
// backend/config/users.js
const ROLES = {
  ADMIN: 'admin',
  DEVOPS: 'devops',
  DEVELOPER: 'developer',
  SUPPORT: 'support'
};

const PERMISSIONS = {
  admin: {
    canManageUsers: true,
    canViewLogs: true,
    canRestartServices: true,
    canModifyDatabase: true,
    canApproveDeployments: true,
    canBackup: true,
    canRestore: true
  },
  devops: {
    canManageUsers: false,
    canViewLogs: true,
    canRestartServices: true,
    canModifyDatabase: false,
    canApproveDeployments: true,
    canBackup: true,
    canRestore: false
  },
  developer: {
    canManageUsers: false,
    canViewLogs: false,
    canRestartServices: false,
    canModifyDatabase: false,
    canApproveDeployments: false,
    canBackup: false,
    canRestore: false
  },
  support: {
    canManageUsers: false,
    canViewLogs: true,
    canRestartServices: false,
    canModifyDatabase: false,
    canApproveDeployments: false,
    canBackup: false,
    canRestore: false
  }
};

// Middleware for role checking
const requireRole = (requiredRole) => (req, res, next) => {
  if (!req.user || req.user.role !== requiredRole) {
    return res.status(403).json({ 
      error: 'Insufficient permissions',
      required: requiredRole,
      actual: req.user?.role
    });
  }
  next();
};

module.exports = { ROLES, PERMISSIONS, requireRole };
```

---

## AUDIT LOGGING

### Enable Comprehensive Audit Logs

**Configure MongoDB Audit:**
```yaml
# /etc/mongod.conf
auditLog:
  destination: file
  format: JSON
  path: /var/log/mongodb/audit.log
  filter: { atype: { $in: [ "createUser", "dropUser", "updateUser", "authenticate", "authorize" ] } }
```

**Application-Level Audit Logging:**
```javascript
// backend/middleware/auditLog.js
const auditLog = (req, res, next) => {
  const logEntry = {
    timestamp: new Date(),
    userId: req.user?.id,
    username: req.user?.email,
    action: req.method,
    endpoint: req.originalUrl,
    ipAddress: req.ip,
    statusCode: res.statusCode,
    responseTime: Date.now() - req.startTime
  };

  // Log sensitive operations
  if (req.method !== 'GET' || req.originalUrl.includes('/admin')) {
    console.log('AUDIT:', JSON.stringify(logEntry));
    
    // Also write to audit log file
    fs.appendFileSync('/var/log/alawael/audit.log', JSON.stringify(logEntry) + '\n');
  }

  next();
};
```

### Monitor Audit Logs

```bash
# View recent audit entries
tail -100 /var/log/alawael/audit.log | grep "dropUser\|deleteDatabase"

# Check for failed authentications
grep "authentication.*failed" /var/log/mongodb/audit.log | tail -20

# Generate daily audit report
grep "2026-02-28" /var/log/alawael/audit.log | grep -v "GET " > /var/log/alawael/daily-report-2026-02-28.log
```

---

## ACCESS REQUEST & APPROVAL WORKFLOW

### Request Process

1. **User requests access:**
   ```
   Email: access-requests@alawael-erp.com
   Subject: Access Request - [Name] - [Role]
   Content:
   - Full Name
   - Email
   - Role Requested (Admin/DevOps/Developer/Support)
   - Business Justification
   - Manager Approval Email
   - Start Date
   - Expected Duration
   ```

2. **Manager approves (receives authorization email)**

3. **Admin grants access (implements SSH key, permissions)**

4. **User acknowledges and confirms access**

5. **Annual review of all user access**

### Revocation Process

1. **Manager submits offboarding request**
2. **Admin removes SSH keys**
3. **Admin revokes database permissions**
4. **Admin removes Git access**
5. **Confirmation email sent**
6. **Audit log entry created**

---

## SECURITY BEST PRACTICES

### Password Policy (Where Passwords Are Used)
- Minimum 16 characters
- Mix of uppercase, lowercase, numbers, special characters
- No dictionary words
- Expires every 90 days
- 5-generation history (can't reuse recent passwords)
- Account lockout after 5 failed attempts (30-minute duration)

### SSH Key Policy
- RSA 4096-bit minimum
- One key per user per device
- Annual key rotation
- Passphrase required (minimum 12 characters)
- No shared keys across users
- Ed25519 keys preferred when possible

### Session Management
- SSH session timeout: 15 minutes of inactivity
- Database connection timeout: 10 minutes
- Application session timeout: 30 minutes
- Multiple session prevention: 1 session per user across all devices

---

## TEAM CONTACT DIRECTORY

| Role | Name | Email | Phone | SSH Key | Status |
|------|------|-------|-------|---------|--------|
| Admin | [Name] | admin@alawael-erp.com | [Phone] | id_rsa_admin | Active |
| Admin | [Name] | backup-admin@alawael-erp.com | [Phone] | id_rsa_admin2 | Active |
| DevOps | [Name] | devops@alawael-erp.com | [Phone] | id_rsa_devops | Active |
| Developer | [Name] | dev1@alawael-erp.com | [Phone] | id_rsa_dev1 | Active |
| Developer | [Name] | dev2@alawael-erp.com | [Phone] | id_rsa_dev2 | Active |
| Support | [Name] | support@alawael-erp.com | [Phone] | (Dashboard Only) | Active |

---

## IMPLEMENTATION CHECKLIST

- [ ] SSH keys generated for all users
- [ ] Public keys added to authorized_keys
- [ ] Password authentication disabled on SSH
- [ ] Database user roles created with least privilege
- [ ] Application RBAC configured
- [ ] Audit logging enabled (system and application)
- [ ] Access request workflow documented
- [ ] Team contact directory completed
- [ ] Emergency access procedures documented
- [ ] Annual review schedule established

---

**Status: ✅ TEAM ACCESS SETUP COMPLETE**

*Document Version: 1.0*  
*Created: February 28, 2026*
