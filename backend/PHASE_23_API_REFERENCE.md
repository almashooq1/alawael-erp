/**
 * ============================================
 * PHASE 23 - RBAC API QUICK REFERENCE
 * ============================================
 * 
 * Complete API endpoint directory with examples
 */

# RBAC API Quick Reference

## Base URL
```
http://localhost:3000/api/rbac
```

## Authentication
All endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## 🔐 POLICY MANAGEMENT

### 1. Create Policy
```http
POST /policies
Content-Type: application/json

{
  "name": "Sales Department Access",
  "description": "Allow sales staff to access sales reports",
  "effect": "Allow",
  "actions": ["read", "write"],
  "resource": "sales_reports",
  "conditions": {
    "role": "sales_manager",
    "department": "sales",
    "location": "office"
  },
  "priority": 600
}

Response 201:
{
  "success": true,
  "message": "Policy created successfully",
  "data": {
    "id": "policy-xyz123",
    "name": "Sales Department Access",
    "effect": "Allow",
    "priority": 600,
    "enabled": true,
    "metadata": {
      "createdAt": "2025-01-10T10:30:00Z",
      "createdBy": "admin@company.com"
    }
  }
}
```

### 2. Get All Policies
```http
GET /policies?effect=Allow&status=active

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "policy-1",
      "name": "Admin Full Access",
      "effect": "Allow",
      "priority": 1000,
      ...
    },
    {
      "id": "policy-2",
      "name": "Sales Department Access",
      "effect": "Allow",
      "priority": 600,
      ...
    }
  ]
}
```

### 3. Get Single Policy
```http
GET /policies/policy-xyz123

Response 200:
{
  "success": true,
  "data": {
    "id": "policy-xyz123",
    "name": "Sales Department Access",
    "effect": "Allow",
    "priority": 600,
    "enabled": true,
    "conditions": { ... },
    "actions": [ ... ]
  }
}
```

### 4. Update Policy
```http
PUT /policies/policy-xyz123
Content-Type: application/json

{
  "priority": 700,
  "conditions": {
    "role": "sales_manager",
    "location": "office"
  }
}

Response 200:
{
  "success": true,
  "message": "Policy updated successfully",
  "data": { ...updated policy... }
}
```

### 5. Delete Policy
```http
DELETE /policies/policy-xyz123

Response 200:
{
  "success": true,
  "message": "Policy deleted successfully"
}
```

### 6. Evaluate Policy
```http
POST /policies/policy-xyz123/evaluate
Content-Type: application/json

{
  "role": "sales_manager",
  "action": "read",
  "resource": "sales_reports",
  "location": "office",
  "time": "09:00"
}

Response 200:
{
  "success": true,
  "message": "Policy evaluation completed",
  "data": {
    "decision": "Allow",
    "reason": "Policy conditions matched",
    "policies": ["policy-xyz123"]
  }
}
```

---

## 👥 ROLE MANAGEMENT

### 7. Create Role
```http
POST /roles
Content-Type: application/json

{
  "name": "Senior Manager",
  "description": "Senior management position",
  "level": 700,
  "parent": "role-manager"
}

Response 201:
{
  "success": true,
  "data": {
    "id": "role-senior-mgr",
    "name": "Senior Manager",
    "level": 700,
    "parent": "role-manager",
    "metadata": {
      "createdAt": "2025-01-10T10:35:00Z",
      "usageCount": 0
    }
  }
}
```

### 8. Get All Roles
```http
GET /roles

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "role-super-admin",
      "name": "Super Administrator",
      "level": 1000,
      "isSystem": true
    },
    {
      "id": "role-admin",
      "name": "Administrator",
      "level": 800,
      "parent": "role-super-admin"
    },
    ...
  ]
}
```

### 9. Assign Permission to Role
```http
POST /roles/role-manager/permissions/perm-user:create
Content-Type: application/json

{
  "reason": "Managers need to create users"
}

Response 200:
{
  "success": true,
  "message": "Permission assigned successfully",
  "data": {
    "roleId": "role-manager",
    "permId": "perm-user:create"
  }
}
```

### 10. Remove Permission from Role
```http
DELETE /roles/role-manager/permissions/perm-user:delete

Response 200:
{
  "success": true,
  "message": "Permission removed successfully"
}
```

---

## 👤 USER-ROLE ASSIGNMENT

### 11. Assign Role to User
```http
POST /users/user123/roles/role-manager
Content-Type: application/json

{
  "reason": "Promoted to manager position"
}

Response 200:
{
  "success": true,
  "message": "Role assigned to user successfully",
  "data": {
    "userId": "user123",
    "roleId": "role-manager"
  }
}
```

### 12. Remove Role from User
```http
DELETE /users/user123/roles/role-manager
Content-Type: application/json

{
  "reason": "Left manager position"
}

Response 200:
{
  "success": true,
  "message": "Role removed from user successfully"
}
```

### 13. Get User Permissions
```http
GET /users/user123/permissions

Response 200:
{
  "success": true,
  "data": {
    "userId": "user123",
    "permissions": [
      "perm-user:read",
      "perm-user:update",
      "perm-resource:read",
      "perm-report:read",
      ...
    ]
  }
}
```

---

## 📋 RULE MANAGEMENT

### 14. Create Rule
```http
POST /rules
Content-Type: application/json

{
  "name": "Business Hours Only",
  "description": "Restrict sensitive operations to business hours",
  "conditions": [
    {
      "type": "time",
      "operator": "between",
      "value": {
        "start": "08:00",
        "end": "18:00"
      }
    },
    {
      "type": "location",
      "operator": "in",
      "value": ["office", "vpn"]
    }
  ],
  "actions": [
    {
      "id": "allow",
      "params": {}
    },
    {
      "id": "log_action",
      "params": { "severity": "info" }
    }
  ],
  "priority": 600
}

Response 201:
{
  "success": true,
  "data": {
    "id": "rule-biz-hours",
    "name": "Business Hours Only",
    "priority": 600,
    "enabled": true,
    "metadata": {
      "executionCount": 0,
      "createdAt": "2025-01-10T10:40:00Z"
    }
  }
}
```

### 15. Get All Rules
```http
GET /rules?search=business&enabled=true

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "rule-biz-hours",
      "name": "Business Hours Only",
      "enabled": true,
      "priority": 600,
      ...
    }
  ]
}
```

### 16. Test Rule Evaluation
```http
POST /rules/rule-biz-hours/evaluate
Content-Type: application/json

{
  "location": "office",
  "time": "09:00"
}

Response 200:
{
  "success": true,
  "message": "Rule evaluation completed",
  "data": {
    "matched": true,
    "actions": [
      {
        "id": "allow",
        "params": {}
      },
      {
        "id": "log_action",
        "params": { "severity": "info" }
      }
    ],
    "priority": 600
  }
}
```

### 17. Get Rule Templates
```http
GET /rules/templates

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "template-biz-hours",
      "name": "Business Hours Only",
      "description": "Restrict access to business hours",
      "conditions": [ ... ]
    },
    {
      "id": "template-mfa",
      "name": "MFA Required",
      "description": "Require multi-factor authentication",
      "conditions": [ ... ]
    },
    ...
  ]
}
```

---

## 📊 AUDIT & COMPLIANCE

### 18. Query Audit Logs
```http
GET /audit/logs?userId=user123&type=POLICY_EVALUATION&page=1&limit=50&sortBy=timestamp&sortOrder=desc

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "log-1",
      "type": "POLICY_EVALUATION",
      "userId": "user123",
      "action": "read",
      "resource": "documents",
      "decision": "Allow",
      "reason": "Policy matched",
      "timestamp": "2025-01-10T10:45:00Z",
      "ipAddress": "192.168.1.100"
    }
  ],
  "pagination": {
    "total": 234,
    "page": 1,
    "limit": 50,
    "pages": 5
  }
}
```

### 19. Get User Activity Report
```http
GET /audit/user/user123

Response 200:
{
  "success": true,
  "data": {
    "userId": "user123",
    "totalActions": 456,
    "roleChanges": 2,
    "permissionChanges": 5,
    "policyEvaluations": 245,
    "deniedActions": 12,
    "lastActivity": "2025-01-10T10:45:00Z",
    "ipAddresses": ["192.168.1.100", "192.168.1.101"]
  }
}
```

### 20. Get Compliance Report
```http
GET /audit/compliance

Response 200:
{
  "success": true,
  "data": {
    "reportDate": "2025-01-10T11:00:00Z",
    "totalAuditLogs": 50000,
    "uniqueUsers": 230,
    "roleModifications": 45,
    "permissionModifications": 120,
    "roleDetails": {
      "role-admin": { "assigns": 5, "removes": 2 },
      "role-manager": { "assigns": 12, "removes": 3 }
    },
    "permissionDetails": {
      "perm-user:create": { "adds": 15, "removes": 2 },
      ...
    }
  }
}
```

### 21. Get Decision Statistics
```http
GET /audit/decisions

Response 200:
{
  "success": true,
  "data": {
    "totalDecisions": 50000,
    "allowed": 45000,
    "denied": 5000,
    "allowPercentage": "90.00",
    "denyPercentage": "10.00"
  }
}
```

---

## 📈 STATISTICS

### 22. Get All Statistics
```http
GET /statistics

Response 200:
{
  "success": true,
  "data": {
    "rbac": {
      "totalRoles": 25,
      "totalPermissions": 45,
      "systemRoles": 5,
      "customRoles": 20,
      "usersWithRoles": 230,
      "roleAssignments": 450
    },
    "policies": {
      "totalPolicies": 40,
      "enabledPolicies": 35,
      "evaluationCount": 45000,
      "cacheHitRate": 0.85
    },
    "rules": {
      "totalRules": 20,
      "enabledRules": 18,
      "totalExecutions": 12000,
      "templates": 4
    },
    "audit": {
      "totalLogs": 50000,
      "allowDecisions": 45000,
      "deniedDecisions": 5000,
      "allowRate": "90%"
    }
  }
}
```

### 23. Health Check
```http
GET /health

Response 200:
{
  "success": true,
  "message": "RBAC system is healthy",
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-10T11:00:00Z",
    "services": {
      "policyEngine": "operational",
      "rbacManager": "operational",
      "auditLog": "operational",
      "ruleBuilder": "operational"
    }
  }
}
```

---

## 🛡️ Error Responses

All errors follow the format:

```json
{
  "success": false,
  "message": "Description of error",
  "en": "Description of error in English"
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |

---

## 🔑 Query Parameters

### Pagination
```
?page=1&limit=50
```

### Filtering
```
?userId=user123
?type=POLICY_EVALUATION
?effect=Allow
?decision=Deny
?severity=ERROR
```

### Sorting
```
?sortBy=timestamp
?sortOrder=desc  (or asc)
```

### Date Range
```
?startDate=2025-01-01
?endDate=2025-01-31
```

---

## 📌 Common Use Cases

### Use Case 1: Restrict Access After Hours
```javascript
// Create a policy
POST /policies
{
  "name": "No Late Night Access",
  "effect": "Deny",
  "conditions": {
    "time": { "type": "outside", "hours": "18:00-08:00" }
  },
  "actions": ["read", "delete"],
  "resource": "sensitive_data",
  "priority": 800
}
```

### Use Case 2: Multi-Location Access Control
```javascript
// Create rule
POST /rules
{
  "name": "Office and VPN Only",
  "conditions": [{
    "type": "location",
    "operator": "in",
    "value": ["office", "vpn"]
  }],
  "actions": [{ "id": "allow" }],
  "priority": 600
}
```

### Use Case 3: Role-Based Resource Access
```javascript
// Assign permission to role
POST /roles/role-manager/permissions/perm-resource:write

// Assign role to user
POST /users/user123/roles/role-manager
```

---

## 🧪 Testing with cURL

```bash
# Create a policy
curl -X POST http://localhost:3000/api/rbac/policies \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Policy","effect":"Allow","actions":["read"],"resource":"*"}'

# Get all policies
curl -X GET http://localhost:3000/api/rbac/policies \
  -H "Authorization: Bearer TOKEN"

# Evaluate policy
curl -X POST http://localhost:3000/api/rbac/policies/policy-id/evaluate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin","action":"read","resource":"documents"}'
```

---

**Last Updated**: 2025-01-10  
**API Version**: 1.0  
**Status**: Production Ready
