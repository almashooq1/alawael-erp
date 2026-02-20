# NPM Scripts Configuration for ERP-Branch Integration Tests

This file documents the npm scripts that should be added to `package.json` for the testing infrastructure.

## Add these scripts to package.json:

```json
{
  "scripts": {
    "test": "jest --coverage",
    "test:unit": "jest tests/integration.test.js --coverage",
    "test:integration": "node tests/integration-test-suite.js",
    "test:watch": "jest tests/ --watch",
    "test:watch:unit": "jest tests/integration.test.js --watch",
    "test:debug": "node --inspect-brk node_modules/.bin/jest tests/integration.test.js",
    "test:ci": "jest --coverage --ci --maxWorkers=2",
    "test:quick": "jest tests/integration.test.js --passWithNoTests",
    "test:coverage": "jest --coverage && open coverage/lcov-report/index.html",
    "test:report": "node tests/integration-test-suite.js",
    "test:pre-deploy": "npm run test:ci && npm run test:integration",
    "test:all": "bash run_tests.sh all",
    "test:lint": "eslint integration/ tests/ --max-warnings 0",
    "test:security": "npm audit --production",
    "test:performance": "bash run_tests.sh performance"
  }
}
```

## Installation Instructions

### 1. Add Dev Dependencies

```bash
npm install --save-dev jest @types/jest jest-junit babel-jest
```

### 2. Create or Update package.json

Add the scripts section from above to your `package.json`

### 3. Verify Installation

```bash
npm test -- --version  # Should show Jest version
```

## Script Descriptions

### Core Testing Scripts

| Script | Purpose | Command |
|--------|---------|---------|
| `npm test` | Run all tests with coverage | `jest --coverage` |
| `npm run test:unit` | Run unit tests only | `jest tests/integration.test.js --coverage` |
| `npm run test:integration` | Run integration tests (requires services) | `node tests/integration-test-suite.js` |
| `npm run test:watch` | Run tests in watch mode | `jest tests/ --watch` |

### Development Scripts

| Script | Purpose | Command |
|--------|---------|---------|
| `npm run test:watch:unit` | Watch unit tests | `jest tests/integration.test.js --watch` |
| `npm run test:debug` | Debug tests with Node Inspector | Node debug mode |
| `npm run test:quick` | Quick test run (skip slow tests) | Fast execution |

### CI/CD Scripts

| Script | Purpose | Command |
|--------|---------|---------|
| `npm run test:ci` | CI optimized testing | Multi-worker Jest |
| `npm run test:pre-deploy` | Full pre-deployment suite | Unit + Integration |
| `npm run test:all` | All tests including performance | Bash script |

### Quality Scripts

| Script | Purpose | Command |
|--------|---------|---------|
| `npm run test:lint` | Lint code | ESLint check |
| `npm run test:security` | Security audit | npm audit |
| `npm run test:performance` | Performance benchmarks | Bash script |

### Report Generation

| Script | Purpose | Command |
|--------|---------|---------|
| `npm run test:coverage` | Generate and view coverage | HTML report |
| `npm run test:report` | Generate test report | Summary report |

## Usage Examples

### Basic Testing

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Watch mode for development
npm run test:watch

# Quick check before commit
npm run test:quick
```

### Integration Testing

```bash
# Start services first
npm start &  # ERP backend
cd ../advanced_branch_system && python app.py &  # Branch API

# Then run integration tests
npm run test:integration
```

### Pre-Deployment

```bash
# Full pre-deployment check
npm run test:pre-deploy

# Or all tests
npm run test:all
```

### Continuous Integration

```bash
# In CI/CD pipeline
npm run test:ci
```

### Debugging

```bash
# Debug a specific test
npm run test:debug

# Debug with Chrome DevTools
# Navigate to chrome://inspect and find the process
```

## Package.json Template

Here's a complete template for the scripts section:

```json
{
  "name": "erp-system-backend",
  "version": "2.0.0",
  "description": "ERP System Backend with Advanced Branch Management",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest --coverage",
    "test:unit": "jest tests/integration.test.js --coverage",
    "test:integration": "node tests/integration-test-suite.js",
    "test:watch": "jest tests/ --watch",
    "test:watch:unit": "jest tests/integration.test.js --watch",
    "test:debug": "node --inspect-brk node_modules/.bin/jest tests/integration.test.js",
    "test:ci": "jest --coverage --ci --maxWorkers=2",
    "test:quick": "jest tests/integration.test.js --passWithNoTests",
    "test:coverage": "jest --coverage && open coverage/lcov-report/index.html",
    "test:report": "node tests/integration-test-suite.js",
    "test:pre-deploy": "npm run test:ci && npm run test:integration",
    "test:all": "bash run_tests.sh all",
    "test:lint": "eslint integration/ tests/ --max-warnings 0",
    "test:security": "npm audit --production",
    "test:performance": "bash run_tests.sh performance",
    "build": "npm run test && npm run build:prod",
    "build:prod": "webpack --mode production",
    "lint": "eslint .",
    "format": "prettier --write '**/*.js'",
    "precommit": "npm run test:quick && npm run lint"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "babel-jest": "^29.5.0",
    "eslint": "^8.40.0",
    "jest": "^29.5.0",
    "jest-junit": "^16.0.0",
    "nodemon": "^2.0.22",
    "prettier": "^2.8.8"
  },
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.4.0",
    "dotenv": "^16.0.3"
  }
}
```

## Running Tests in CI/CD

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Pre-commit Hook

Create `.husky/pre-commit`:

```bash
#!/bin/sh
npm run test:quick
npm run lint
```

Install Husky:

```bash
npm install husky
npx husky install
npx husky add .husky/pre-commit "npm run test:quick && npm run lint"
```

## Environment Variables for Tests

Create `.env.test`:

```bash
NODE_ENV=test
BRANCH_API_URL=http://localhost:5000/api/v2
BRANCH_API_KEY=test-key
SYNC_INTERVAL=60000
ENABLE_CONTINUOUS_SYNC=false
```

## Troubleshooting

### Jest not found
```bash
npm install --save-dev jest
```

### Scripts not found
```bash
# Update npm scripts in package.json
# Reinstall dependencies
npm install
```

### Tests failing on CI
```bash
# Run in CI mode locally
npm run test:ci

# Check environment variables
echo $NODE_ENV
```

---

**Documentation Version**: 2.0.0
**Last Updated**: February 17, 2025
