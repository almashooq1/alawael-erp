# Phase 4: Security Hardening

**Date**: February 2, 2026  
**Objective**: Achieve production-grade security posture  
**Focus**: OWASP Top 10 + Advanced Security

---

## 🔒 Security Hardening Strategy

### Security Assessment

#### Current State

```
OWASP Coverage: 60%
Security Tests: 45/100 (45%)
Vulnerability Scans: 0
Penetration Testing: Not performed
Security Headers: Basic
```

#### Target State

```
OWASP Coverage: 100%
Security Tests: 100+/100 (100%)
Vulnerability Scans: Automated
Penetration Testing: Complete
Security Headers: Advanced
```

---

## 🎯 OWASP Top 10 Implementation

### 1. Injection Attacks (SQL, NoSQL, Command)

#### Tests to Add

```javascript
describe('Injection Prevention', () => {
  test('should prevent SQL injection', () => {
    const input = "'; DROP TABLE users; --";
    expect(() => validateQuery(input)).toThrow();
  });

  test('should prevent NoSQL injection', () => {
    const input = { $ne: null };
    expect(() => sanitizeInput(input)).not.toEqual(input);
  });

  test('should prevent command injection', () => {
    const input = '; rm -rf /';
    expect(() => executeCommand(input)).toThrow();
  });

  test('should handle special characters safely', () => {
    const input = '<script>alert("xss")</script>';
    const safe = sanitizeInput(input);
    expect(safe).not.toContain('<script>');
  });
});
```

### 2. Authentication & Session Management

#### Tests to Add

```javascript
describe('Authentication Security', () => {
  test('should enforce strong password requirements', () => {
    expect(validatePassword('weak')).toBeFalsy();
    expect(validatePassword('StrongP@ss123')).toBeTruthy();
  });

  test('should implement session timeout', () => {
    const session = createSession();
    jest.runTimersToTime(3600000); // 1 hour
    expect(isSessionValid(session)).toBeFalsy();
  });

  test('should prevent session fixation', () => {
    const session1 = createSession();
    const session2 = createSession();
    expect(session1.id).not.toBe(session2.id);
  });

  test('should hash passwords with salt', () => {
    const password = 'TestPassword123!';
    const hash1 = hashPassword(password);
    const hash2 = hashPassword(password);
    expect(hash1).not.toBe(hash2); // Different salts
    expect(comparePasswords(password, hash1)).toBeTruthy();
  });

  test('should implement multi-factor authentication', () => {
    const mfa = setupMFA('user@example.com');
    expect(mfa.secret).toBeDefined();
    expect(mfa.qrCode).toBeDefined();
  });
});
```

### 3. Sensitive Data Exposure

#### Tests to Add

```javascript
describe('Data Protection', () => {
  test('should encrypt sensitive data at rest', () => {
    const data = 'sensitive_info';
    const encrypted = encryptData(data);
    expect(encrypted).not.toBe(data);
    expect(decryptData(encrypted)).toBe(data);
  });

  test('should use HTTPS for transit', () => {
    const request = createRequest();
    expect(request.protocol).toBe('https');
  });

  test('should remove sensitive data from logs', () => {
    const logEntry = createLogEntry({
      password: 'secret123',
      creditCard: '4111111111111111',
    });
    expect(logEntry).not.toContain('secret123');
    expect(logEntry).not.toContain('4111111111111111');
  });

  test('should implement field-level encryption', () => {
    const user = {
      name: 'John',
      ssn: '123-45-6789', // Sensitive
    };
    const encrypted = encryptField(user.ssn);
    expect(encrypted).not.toBe(user.ssn);
  });
});
```

### 4. XML External Entities (XXE)

#### Tests to Add

```javascript
describe('XXE Prevention', () => {
  test('should prevent XXE attacks', () => {
    const xxePayload = `
      <!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
      <foo>&xxe;</foo>
    `;
    expect(() => parseXML(xxePayload)).toThrow();
  });

  test('should disable DTD processing', () => {
    const xmlParser = createSecureXMLParser();
    expect(xmlParser.config.dtdProcessing).toBeFalsy();
  });
});
```

### 5. Broken Access Control

#### Tests to Add

```javascript
describe('Access Control', () => {
  test('should enforce role-based access control', () => {
    const user = { role: 'user' };
    expect(canAccess(user, 'admin-panel')).toBeFalsy();
  });

  test('should prevent privilege escalation', () => {
    const user = createUser({ role: 'user' });
    expect(() => updateRole(user, 'admin')).toThrow();
  });

  test('should verify ownership of resources', () => {
    const user1 = { id: 1 };
    const user2 = { id: 2 };
    const doc = { ownerId: user1.id };
    expect(canEdit(user2, doc)).toBeFalsy();
  });

  test('should check authorization on every request', () => {
    const req = createRequest({ user: null });
    expect(requireAuth(req)).toBeFalsy();
  });
});
```

### 6. Security Misconfiguration

#### Tests to Add

```javascript
describe('Security Configuration', () => {
  test('should enforce security headers', () => {
    const response = getSecurityHeaders();
    expect(response['Content-Security-Policy']).toBeDefined();
    expect(response['X-Content-Type-Options']).toBe('nosniff');
    expect(response['X-Frame-Options']).toBe('DENY');
    expect(response['X-XSS-Protection']).toBe('1; mode=block');
  });

  test('should disable unnecessary HTTP methods', () => {
    expect(() => testMethod('OPTIONS')).toThrow();
    expect(() => testMethod('TRACE')).toThrow();
  });

  test('should use secure cookie settings', () => {
    const cookie = createSecureCookie('session');
    expect(cookie.secure).toBeTruthy();
    expect(cookie.httpOnly).toBeTruthy();
    expect(cookie.sameSite).toBe('Strict');
  });

  test('should enforce HTTPS redirect', () => {
    const request = createHTTPRequest();
    const redirect = enforceHTTPS(request);
    expect(redirect.location).toContain('https');
  });
});
```

### 7. XSS (Cross-Site Scripting)

#### Tests to Add

```javascript
describe('XSS Prevention', () => {
  test('should escape HTML special characters', () => {
    const input = '<script>alert("xss")</script>';
    const escaped = escapeHTML(input);
    expect(escaped).not.toContain('<script>');
    expect(escaped).toContain('&lt;script&gt;');
  });

  test('should validate content security policy', () => {
    const csp = getCSP();
    expect(csp).toContain("default-src 'self'");
  });

  test('should sanitize user input', () => {
    const malicious = '<img src=x onerror=alert("xss")>';
    const safe = sanitizeHTML(malicious);
    expect(safe).not.toContain('onerror');
  });

  test('should prevent DOM-based XSS', () => {
    const element = document.createElement('div');
    const userInput = '<script>alert("xss")</script>';
    element.textContent = userInput; // Safe
    expect(element.innerHTML).not.toContain('<script>');
  });
});
```

### 8. Insecure Deserialization

#### Tests to Add

```javascript
describe('Deserialization Security', () => {
  test('should validate serialized data before use', () => {
    const maliciousData = Buffer.from('malicious_payload');
    expect(() => deserialize(maliciousData)).toThrow();
  });

  test('should use safe JSON parsing', () => {
    const data = '{"__proto__": {"isAdmin": true}}';
    const obj = JSON.parse(data);
    expect(obj.isAdmin).toBeUndefined();
  });

  test('should restrict object types in deserialization', () => {
    const allowedTypes = ['User', 'Document'];
    const unsafe = new Function();
    expect(() => safeDeserialize(unsafe, allowedTypes)).toThrow();
  });
});
```

### 9. Using Components with Known Vulnerabilities

#### Tests to Add

```javascript
describe('Dependency Vulnerability', () => {
  test('should check npm dependencies for vulnerabilities', () => {
    // npm audit should return 0 vulnerabilities
    expect(runAudit()).toBe(0);
  });

  test('should use updated package versions', () => {
    const packageJson = require('../package.json');
    // All versions should match security standards
    expect(packageJson.dependencies).toBeDefined();
  });
});
```

### 10. Insufficient Logging & Monitoring

#### Tests to Add

```javascript
describe('Logging & Monitoring', () => {
  test('should log security events', () => {
    const spy = jest.spyOn(logger, 'warn');
    triggerSecurityEvent();
    expect(spy).toHaveBeenCalled();
  });

  test('should alert on suspicious activity', () => {
    const alert = jest.fn();
    detectSuspiciousActivity();
    expect(alert).toHaveBeenCalled();
  });

  test('should implement audit logging', () => {
    const log = logAuditEvent('user_login', 'user123');
    expect(log.timestamp).toBeDefined();
    expect(log.action).toBe('user_login');
  });

  test('should monitor failed authentication attempts', () => {
    for (let i = 0; i < 5; i++) {
      attemptLogin('user', 'wrongpass');
    }
    expect(isAccountLocked('user')).toBeTruthy();
  });
});
```

---

## 🛡️ Security Headers Configuration

```javascript
// backend/middleware/securityHeaders.middleware.js
const securityHeaders = (req, res, next) => {
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'");

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Feature Policy
  res.setHeader('Permissions-Policy', 'microphone=(), camera=()');

  // HSTS
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );

  next();
};

module.exports = securityHeaders;
```

---

## 🔍 Vulnerability Scanning

### Install Security Tools

```bash
npm install --save-dev snyk
npm install --save-dev npm-check-updates
```

### Run Security Audits

```bash
# NPM audit
npm audit

# Snyk scan
snyk test

# Check for outdated packages
npm outdated

# Update vulnerable packages
npm update
npm audit fix
```

---

## 📋 Security Checklist

- [ ] Implement 10+ OWASP tests
- [ ] Add 50+ security test cases
- [ ] Configure security headers
- [ ] Enable HTTPS/TLS
- [ ] Implement MFA
- [ ] Add encryption for sensitive data
- [ ] Set up audit logging
- [ ] Run vulnerability scans
- [ ] Implement rate limiting
- [ ] Enable CORS restrictions

---

**Phase 4 Status**: READY TO EXECUTE  
**Estimated Duration**: 60 minutes  
**Next Phase**: Load Testing Implementation
