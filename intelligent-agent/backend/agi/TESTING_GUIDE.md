# 🧪 Testing Guide - Rehab AGI

دليل شامل لاختبار نظام Rehab AGI

**Last Updated**: January 30, 2026

---

## 📋 Testing Strategy

### Test Levels

```
Unit Tests         → Individual functions
Integration Tests  → API endpoints + database
E2E Tests          → Full user workflows
Load Tests         → Performance under stress
Security Tests     → Vulnerability scanning
```

### Test Coverage Goals

- **Overall**: 90%+
- **Critical Paths**: 100%
- **AI Functions**: 95%+
- **API Endpoints**: 100%
- **Error Handling**: 95%+

---

## 🧪 Unit Testing

### Setup

```bash
# Install dependencies
npm install --save-dev jest @types/jest ts-jest

# Run tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage
```

### Example Test

```typescript
describe('Beneficiary Analysis', () => {
  it('should analyze beneficiary with valid ID', () => {
    const result = rehabAGI.analyzeBeneficiary('BEN-001');
    expect(result).toBeDefined();
    expect(result.overallStatus).toBeTruthy();
  });

  it('should throw error for invalid ID', () => {
    expect(() => {
      rehabAGI.analyzeBeneficiary('');
    }).toThrow('معرف المستفيد مطلوب');
  });

  it('should handle missing data gracefully', () => {
    const result = rehabAGI.analyzeBeneficiary('BEN-999');
    expect(result.status).toBe('pending');
  });
});
```

---

## 🔗 Integration Testing

### API Endpoint Tests

```bash
# Start server
npm start

# In another terminal, run integration tests
npm run test:integration
```

### Example Test

```typescript
describe('API: /api/rehab-agi/analyze', () => {
  it('should return 200 for valid request', async () => {
    const response = await request(app)
      .post('/api/rehab-agi/analyze')
      .send({
        beneficiaryId: 'BEN-001',
      })
      .expect(200);

    expect(response.body.analysis).toBeDefined();
  });

  it('should return 400 for missing required field', async () => {
    const response = await request(app)
      .post('/api/rehab-agi/analyze')
      .send({})
      .expect(400);

    expect(response.body.error).toBeDefined();
  });

  it('should return 401 without authentication', async () => {
    const response = await request(app)
      .post('/api/rehab-agi/analyze')
      .send({ beneficiaryId: 'BEN-001' })
      .expect(401);
  });
});
```

---

## 🚀 End-to-End Testing

### Using Cypress

```bash
# Install Cypress
npm install --save-dev cypress

# Open Cypress
npx cypress open

# Run all E2E tests
npx cypress run
```

### Example E2E Test

```javascript
describe('Rehab AGI E2E Tests', () => {
  beforeEach(() => {
    cy.visit('http://localhost:5001');
  });

  it('should login and view dashboard', () => {
    cy.login('user@example.com', 'password');
    cy.url().should('include', '/dashboard');
    cy.contains('Welcome').should('be.visible');
  });

  it('should create new beneficiary', () => {
    cy.login('user@example.com', 'password');
    cy.contains('Add Beneficiary').click();
    cy.get('[data-cy=name-input]').type('أحمد');
    cy.get('[data-cy=submit]').click();
    cy.contains('Beneficiary created').should('be.visible');
  });

  it('should analyze beneficiary', () => {
    cy.login('user@example.com', 'password');
    cy.selectBeneficiary('BEN-001');
    cy.contains('Analyze').click();
    cy.contains('Analysis Results').should('be.visible');
  });
});
```

---

## ⚡ Load Testing

### Using Apache JMeter

```bash
# Install JMeter
# Download from: https://jmeter.apache.org/

# Create test plan:
1. Thread Group (100 users, 10 requests each)
2. HTTP Request to /api/rehab-agi/analyze
3. View Results Tree

# Run test
jmeter -n -t test_plan.jmx -l results.jtl
```

### Using k6

```bash
# Install k6
npm install -g k6

# Create test script (load-test.js)
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
};

export default function() {
  let res = http.post('http://localhost:5001/api/rehab-agi/analyze', {
    beneficiaryId: 'BEN-001',
  });
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}

# Run test
k6 run load-test.js
```

---

## 🔒 Security Testing

### OWASP Top 10 Testing

```bash
# 1. SQL Injection
curl -X POST http://localhost:5001/api/rehab-agi/analyze \
  -d "beneficiaryId='; DROP TABLE beneficiaries; --"

# Expected: Error handling, no data loss

# 2. XSS (Cross-Site Scripting)
curl -X POST http://localhost:5001/api/rehab-agi/analyze \
  -d "beneficiaryId=<script>alert('xss')</script>"

# Expected: Input sanitization, no script execution

# 3. Authentication Bypass
curl -X GET http://localhost:5001/api/admin \
  # No Authorization header

# Expected: 401 Unauthorized

# 4. Rate Limiting
for i in {1..1100}; do
  curl http://localhost:5001/api/rehab-agi/health
done

# Expected: 429 Too Many Requests after limit
```

### Using OWASP ZAP

```bash
# Install OWASP ZAP
# Download from: https://www.zaproxy.org/

# Automated scan
zaproxy.sh -cmd \
  -quickurl http://localhost:5001 \
  -quickout report.html
```

---

## 📊 Performance Testing

### Metrics to Monitor

```
Response Time (ms)      Target: < 200ms (avg), < 500ms (p95)
Throughput (req/sec)    Target: 1000+
Error Rate (%)          Target: < 0.1%
CPU Usage (%)           Target: < 80%
Memory Usage (MB)       Target: < 2GB
Database Queries (ms)   Target: < 100ms
Cache Hit Rate (%)      Target: > 80%
```

### Performance Test Script

```bash
#!/bin/bash

echo "Performance Test Results"
echo "========================"
echo ""

# Test 1: Single request
echo "Test 1: Single Request Response Time"
time curl -s http://localhost:5001/api/rehab-agi/analyze \
  -H "Content-Type: application/json" \
  -d '{"beneficiaryId":"BEN-001"}'

# Test 2: Concurrent requests
echo ""
echo "Test 2: Concurrent Requests (100)"
for i in {1..100}; do
  curl -s http://localhost:5001/api/rehab-agi/health &
done
wait

# Test 3: Database query
echo ""
echo "Test 3: Database Query Performance"
psql -h localhost -U postgres -d rehab_agi \
  -c "EXPLAIN ANALYZE SELECT * FROM beneficiaries LIMIT 10;"
```

---

## ✅ Test Checklist

### Before Each Release

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Code coverage > 90%
- [ ] No critical security vulnerabilities
- [ ] Performance targets met
- [ ] E2E tests pass
- [ ] Load tests completed
- [ ] No memory leaks detected
- [ ] Database integrity verified
- [ ] Backup/restore tested

### Manual Testing

- [ ] Create beneficiary
- [ ] Analyze beneficiary
- [ ] Generate reports
- [ ] Export data
- [ ] Update settings
- [ ] Delete records
- [ ] Test error handling
- [ ] Verify audit logs
- [ ] Test internationalization
- [ ] Check responsive design

---

## 📝 Test Reporting

### Example Report

```markdown
# Test Report - v1.1.0

## Summary

- Total Tests: 150
- Passed: 148 (98.7%)
- Failed: 2 (1.3%)
- Skipped: 0

## Details

- Unit Tests: 120/120 ✓
- Integration Tests: 20/20 ✓
- E2E Tests: 8/10 (2 UI timeouts)
- Load Tests: Passed
- Security Tests: Passed

## Issues

1. Login page timeout in E2E (timing issue)
2. Modal dialog not found (UI selector issue)

## Recommendations

- Fix login timeout
- Update UI selectors
- Add retry logic to E2E tests
```

---

## 🔄 Continuous Testing

### GitHub Actions CI/CD

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
```

---

## 🎯 Testing Best Practices

### Do's

- ✓ Write tests first (TDD)
- ✓ Test happy paths
- ✓ Test error cases
- ✓ Test edge cases
- ✓ Keep tests simple
- ✓ Use descriptive names
- ✓ Mock external services
- ✓ Run tests frequently

### Don'ts

- ✗ Write tests after code
- ✗ Test implementation details
- ✗ Have brittle tests
- ✗ Hardcode test data
- ✗ Make tests too complex
- ✗ Skip important tests
- ✗ Ignore test failures
- ✗ Test everything equally

---

## 📚 Testing Resources

- [Jest Documentation](https://jestjs.io/)
- [Cypress Documentation](https://docs.cypress.io/)
- [k6 Load Testing](https://k6.io/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

---

**Last Updated**: January 30, 2026
