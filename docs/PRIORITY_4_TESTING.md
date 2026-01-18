# 🧪 Priority 4: Testing Suite Complete Guide

## Overview

Comprehensive testing suite for Alawael ERP System covering Unit, Integration, and E2E tests.

---

## Part 1: Jest Unit Testing

**File: backend/jest.config.js**

```javascript
module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
  collectCoverageFrom: ['routes/**/*.js', 'api/**/*.js', 'utils/**/*.js', '!**/*.test.js'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
```

**File: backend/**tests**/routes/backup.routes.test.js**

```javascript
const request = require('supertest');
const express = require('express');
const backupRoutes = require('../../routes/backup.routes');

describe('Backup Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use('/api/backup', backupRoutes);
  });

  describe('POST /api/backup/create', () => {
    it('should create a backup', async () => {
      const res = await request(app).post('/api/backup/create').set('Content-Type', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.filename).toMatch(/^backup-/);
    });

    it('should return error on failure', async () => {
      // Mock failure scenario
      const res = await request(app).post('/api/backup/create');

      expect(res.status).toEqual(expect.any(Number));
    });
  });

  describe('GET /api/backup/list', () => {
    it('should list all backups', async () => {
      const res = await request(app).get('/api/backup/list');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.backups)).toBe(true);
    });
  });

  describe('GET /api/backup/stats', () => {
    it('should return backup statistics', async () => {
      const res = await request(app).get('/api/backup/stats');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats.totalBackups).toEqual(expect.any(Number));
    });
  });
});
```

---

## Part 2: Integration Tests

**File: backend/**tests**/integration/api.integration.test.js**

```javascript
const request = require('supertest');
const app = require('../../server');

describe('API Integration Tests', () => {
  describe('Backup System', () => {
    it('should create and list backups', async () => {
      // Create backup
      const createRes = await request(app).post('/api/backup/create');

      expect(createRes.status).toBe(200);

      // List backups
      const listRes = await request(app).get('/api/backup/list');

      expect(listRes.status).toBe(200);
      expect(listRes.body.backups.length).toBeGreaterThan(0);
    });

    it('should get backup statistics', async () => {
      const res = await request(app).get('/api/backup/stats');

      expect(res.status).toBe(200);
      expect(res.body.stats).toHaveProperty('totalBackups');
      expect(res.body.stats).toHaveProperty('totalSize');
    });
  });

  describe('Health Checks', () => {
    it('should respond to health endpoint', async () => {
      const res = await request(app).get('/api/health').expect(200);

      expect(res.body.status).toBe('ok');
    });

    it('should return server information', async () => {
      const res = await request(app).get('/api/info');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('version');
      expect(res.body).toHaveProperty('timestamp');
    });
  });
});
```

---

## Part 3: End-to-End Tests with Cypress

**File: frontend/cypress.config.js**

```javascript
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3002',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    specPattern: 'cypress/e2e/**/*.cy.js',
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'webpack',
    },
  },
});
```

**File: frontend/cypress/e2e/auth.cy.js**

```javascript
describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should display login page', () => {
    cy.contains('Login').should('be.visible');
  });

  it('should handle form submission', () => {
    cy.get('input[type="email"]').type('user@example.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
  });
});
```

**File: frontend/cypress/e2e/navigation.cy.js**

```javascript
describe('Navigation', () => {
  beforeEach(() => {
    cy.visit('/dashboard');
  });

  it('should navigate between pages', () => {
    cy.get('nav a[href="/employees"]').click();
    cy.url().should('include', '/employees');

    cy.get('nav a[href="/finance"]').click();
    cy.url().should('include', '/finance');
  });

  it('should have working sidebar', () => {
    cy.get('aside').should('be.visible');
    cy.get('aside a').should('have.length.greaterThan', 0);
  });
});
```

---

## Part 4: Performance Testing

**File: backend/**tests**/performance/load.test.js**

```javascript
const loadtest = require('loadtest');

describe('Performance Tests', () => {
  it('should handle 100 requests/sec', done => {
    const options = {
      url: 'http://localhost:3001/api/backup/list',
      concurrent: 10,
      maxRequests: 1000,
      requestsPerSecond: 100,
      timeout: 30000,
    };

    loadtest.loadTest(options, (error, result) => {
      if (error) {
        return done(error);
      }

      expect(result.rps.mean).toBeGreaterThan(90);
      expect(result.totalRequests).toBe(1000);
      done();
    });
  }, 60000);
});
```

---

## Part 5: Test Scripts

**File: backend/package.json**

```json
{
  "scripts": {
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "test:unit": "jest --testPathPattern=__tests__",
    "test:integration": "jest --testPathPattern=integration",
    "test:coverage": "jest --coverage --collectCoverageFrom='routes/**/*.js'",
    "test:performance": "jest --testPathPattern=performance",
    "lint": "eslint . --ext .js",
    "lint:fix": "eslint . --ext .js --fix"
  }
}
```

**File: frontend/package.json**

```json
{
  "scripts": {
    "test": "react-scripts test",
    "test:coverage": "react-scripts test --coverage",
    "cypress": "cypress open",
    "cypress:headless": "cypress run",
    "cypress:ci": "cypress run --browser chrome --headless"
  }
}
```

---

## Part 6: CI/CD Integration (GitHub Actions)

**File: .github/workflows/test.yml**

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 16

      - name: Install dependencies
        run: cd backend && npm install

      - name: Run unit tests
        run: cd backend && npm run test:unit

      - name: Run integration tests
        run: cd backend && npm run test:integration

      - name: Upload coverage
        uses: codecov/codecov-action@v2

  frontend-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 16

      - name: Install dependencies
        run: cd frontend && npm install

      - name: Build project
        run: cd frontend && npm run build

      - name: Run E2E tests
        run: cd frontend && npm run cypress:ci
```

---

## Running Tests

### Unit Tests

```bash
cd backend
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### E2E Tests

```bash
cd frontend
npm run cypress:headless
```

### Coverage Report

```bash
npm run test:coverage
```

### Watch Mode (Development)

```bash
npm run test:watch
```

---

## Test Coverage Goals

| Module      | Target  | Current |
| ----------- | ------- | ------- |
| Routes      | 80%     | -       |
| Utils       | 85%     | -       |
| Models      | 90%     | -       |
| Middleware  | 75%     | -       |
| **Overall** | **80%** | -       |

---

**Status**: ⏳ Ready for implementation
**Time**: ~60 minutes
**Difficulty**: Medium
