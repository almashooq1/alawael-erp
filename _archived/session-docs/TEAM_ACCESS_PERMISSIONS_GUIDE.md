# TEAM ACCESS & PERMISSIONS SETUP GUIDE
# RBAC, SSH Keys, and Audit Logging Configuration
# Version: 1.0.0 | Date: February 28, 2026

---

## QUICK START

### For Admin User (Full Access)
```powershell
# 1. Generate SSH key
ssh-keygen -t ed25519 -f "C:\Users\admin\.ssh\alawael-prod" -N "secure-passphrase"

# 2. Add public key to authorized list
# File: C:\alawael\.ssh\authorized_keys
# Content: [paste public key from alawael-prod.pub]

# 3. Setup PM2 permissions
# User: admin | Role: admin | Can: start/stop/restart/logs

# 4. Database access
# MongoDB user: admin | Role: dbOwner | Database: alawael-erp
```

---

## SSH KEY GENERATION

### Create Individual Keys Per Team Member

```powershell
# For each team member, run:
$teamMember = "john-dev"
ssh-keygen -t ed25519 `
  -f "C:\Users\admin\.ssh\$teamMember" `
  -C "$teamMember@alawael-erp.com" `
  -N "secure-passphrase-here"

# Output:
# C:\Users\admin\.ssh\john-dev (PRIVATE - keep secret)
# C:\Users\admin\.ssh\john-dev.pub (PUBLIC - add to server)
```

### Add Keys to Server

```powershell
# 1. Collect all public keys
Get-Content C:\Users\admin\.ssh\*.pub > C:\alawael\.ssh\authorized_keys

# 2. Secure permissions
icacls "C:\alawael\.ssh\authorized_keys" /inheritance:r /grant "SYSTEM:F" /grant "Administrators:F"

# 3. Verify
Get-Content C:\alawael\.ssh\authorized_keys | Measure-Object -Line
# Should show: N lines (one per team member)
```

---

## ROLE-BASED ACCESS CONTROL (RBAC)

### Define Team Roles

| Role | Permissions | Users | Access Level |
|------|-------------|-------|--------------|
| **Admin** | Full (start/stop/logs/config) | 1-2 | Complete |
| **Developer** | Read logs, restart app | 3-5 | Limited |
| **SRE/DevOps** | Monitoring, backups, scaling | 1-2 | Advanced |
| **Support** | View logs only | 2-3 | Read-only |
| **Finance** | Billing, reports only | 1 | Read-only |

### Implement RBAC with PM2

```powershell
# Create PM2 users with roles
Function New-PM2User {
    param(
        [string]$Username,
        [string]$Role = "user"
    )
    
    $roles = @{
        "admin" = @("start", "stop", "restart", "logs", "config", "status")
        "developer" = @("logs", "status", "restart")
        "read-only" = @("logs", "status")
    }
    
    # Store user with assigned permissions
    $userConfig = @{
        username = $Username
        role = $Role
        permissions = $roles[$Role]
        createdAt = Get-Date
        lastAccess = $null
    }
    
    # Save to file (example)
    $userConfig | ConvertTo-Json | Set-Content -Path "C:\alawael\rbac\$Username.json"
    
    Write-Host "✅ User $Username created with $Role role"
}

# Create team members
New-PM2User -Username "john-dev" -Role "developer"
New-PM2User -Username "sarah-admin" -Role "admin"
New-PM2User -Username "mike-support" -Role "read-only"
```

### Grant Database Access

```powershell
# MongoDB RBAC via JavaScript shell
# Run in mongo client:

use admin
db.createUser({
  user: "john-dev",
  pwd: "secure-password",
  roles: [
    { role: "read", db: "alawael-erp" }
  ]
})

db.createUser({
  user: "sarah-admin",
  pwd: "secure-password",
  roles: [
    { role: "dbOwner", db: "alawael-erp" }
  ]
})

# Verify users
db.getUsers()
```

---

## AUDIT LOGGING SETUP

### Enable Application Audit Logging

**File: backend/.env**
```bash
# Audit logging configuration
AUDIT_LOG_ENABLED=true
AUDIT_LOG_LEVEL=info
AUDIT_LOG_RETENTION_DAYS=90
AUDIT_LOG_DESTINATION=./logs/audit.log

# Track these events
AUDIT_EVENTS=login,logout,create,update,delete,export,config_change
```

### Configure Audit Log Schema

```javascript
// backend/config/audit-logger.js
const auditLog = {
  timestamp: new Date().toISOString(),
  userId: "john-dev",
  action: "UPDATE",
  resourceType: "Document",
  resourceId: "doc_12345",
  changes: {
    before: { status: "draft" },
    after: { status: "published" }
  },
  ipAddress: "192.168.1.100",
  userAgent: "Mozilla/5.0...",
  result: "SUCCESS",
  errorMessage: null
};

// Log audit entries
fs.appendFileSync('./logs/audit.log', JSON.stringify(auditLog) + '\n');
```

### Monitor Audit Logs

```powershell
# View recent audit entries
Get-Content backend\logs\audit.log -Tail 20 | ConvertFrom-Json | Format-Table timestamp, userId, action, result

# Search for specific user activity
Select-String "john-dev" backend\logs\audit.log | Measure-Object
# Shows: N occurrences of john-dev in audit logs

# Export audit logs for compliance
Get-Content backend\logs\audit.log | ConvertFrom-Json | Export-Csv audit-export-$(Get-Date -Format 'yyyyMMdd').csv
```

---

## TEAM ONBOARDING CHECKLIST

When adding new team member:

- [ ] Generate SSH key pair
- [ ] Add public key to authorized_keys
- [ ] Create MongoDB user account
- [ ] Assign PM2 role
- [ ] Grant GitHub repository access
- [ ] Setup VPN access (if applicable)
- [ ] Add to team communication (Slack, Email)
- [ ] Provide documentation links
- [ ] Schedule knowledge transfer
- [ ] First week monitoring (high touch)

---

## OFFBOARDING CHECKLIST

When removing team member:

- [ ] Revoke SSH key access
- [ ] Disable MongoDB user account
- [ ] Remove PM2 permissions
- [ ] Revoke GitHub access
- [ ] Remove from VPN
- [ ] Remove from communication channels
- [ ] Audit any data accessed last 30 days
- [ ] Ensure knowledge transfer completed
- [ ] Archive work/documents

---

## ACCESS CONTROL BEST PRACTICES

1. **Principle of Least Privilege**
   - Give minimum permissions needed
   - Escalate access only when required
   - Regular access review (quarterly)

2. **Password Policy**
   - Minimum 12 characters
   - Mix of upper, lower, number, special
   - Expire every 90 days
   - No reuse of last 5 passwords

3. **SSH Key Security**
   - 4096-bit RSA or ed25519 minimum
   - Encrypted private keys (passphrase required)
   - Rotate keys annually
   - Store private keys securely

4. **MFA (Multi-Factor Authentication)**
   - Require for admin access
   - Use authenticator app or security key
   - Backup codes stored securely

5. **IP Whitelisting**
   - Restrict admin access to known IPs
   - VPN required for remote access
   - Monitor and log all access attempts

---

## COMPLIANCE REQUIREMENTS

For team to acknowledge:

**Document: SECURITY & ACCESS POLICY**

```
All team members must:
✓ Protect private SSH keys
✓ Never share credentials
✓ Log out when away from desk
✓ Mark work confidential if needed
✓ Report security incidents immediately
✓ Comply with access controls
✓ Update password every 90 days
✓ Enable MFA on all accounts
✓ Delete local copies after work
```

---

## CONTACTS

**Access Issues:**
- admin@alawael-erp.com
- Response time: < 1 hour

**Security Concerns:**
- security@alawael-erp.com (urgent)
- Report incidents immediately

**Compliance Questions:**
- compliance@alawael-erp.com

---

*Last Updated: February 28, 2026*
