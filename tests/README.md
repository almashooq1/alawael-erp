/\*\*

- tests/README.md - Testing Framework Documentation
- Comprehensive guide to running and writing tests \*/

# Testing Framework Documentation

## Overview

This testing suite provides comprehensive coverage for the Beneficiary
Management System using **Jest**, a JavaScript testing framework. The tests are
organized into three main categories:

### Test Categories

1. **Unit Tests** - Test individual functions and methods
2. **Integration Tests** - Test API endpoints and service interactions
3. **Model Tests** - Test data validation and schema constraints

## Project Structure

```
tests/
├── setup.js                          # Jest setup & global mocks
├── utils/
│   └── testHelpers.js               # Shared test utilities
├── models/
│   ├── Beneficiary.test.js          # Beneficiary model tests
│   ├── AttendanceRecord.test.js     # Attendance model tests
│   ├── Scholarship.test.js          # Scholarship model tests
│   ├── Achievement.test.js          # Achievement model tests
│   └── ...                          # Additional model tests
├── services/
│   ├── AttendanceService.test.js    # Service business logic
│   ├── ScholarshipService.test.js   # Scholarship service
│   └── ...                          # Additional service tests
└── routes/
    ├── attendance.routes.test.js    # API route endpoints
    ├── scholarships.routes.test.js  # Scholarship routes
    └── ...                          # Additional route tests
```

## Installation

```bash
# Install dependencies
npm install --save-dev jest babel-jest jest-junit @babel/preset-env

# Ensure jest.config.js exists in project root
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test File

```bash
npm test -- tests/models/Beneficiary.test.js
```

### Run Tests with Coverage Report

```bash
npm test -- --coverage
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Tests with Verbose Output

```bash
npm test -- --verbose
```

### Run Single Test Suite

```bash
npm test -- -t "Beneficiary Model"
```

### Run Tests Matching Pattern

```bash
npm test -- tests/services/
```

## Test Configuration

### Jest Configuration (`jest.config.js`)

Key settings:

- **testEnvironment**: `node` - Tests run in Node.js environment
- **testMatch**: Pattern for test file discovery
- **collectCoverageFrom**: Files to include in coverage
- **coverageThreshold**: Minimum coverage requirements
- **testTimeout**: 10 seconds per test

### Coverage Thresholds

The project enforces minimum coverage standards:

- **Branches**: 70%
- **Functions**: 75%
- **Lines**: 75%
- **Statements**: 75%

## Global Test Utilities

### Available in All Tests via `global.testUtils`

#### Mock Data Generators

```javascript
// Create mock beneficiary
const beneficiary = global.testUtils.createMockBeneficiary();

// Create mock attendance record
const attendance = global.testUtils.createMockAttendanceRecord();

// Create mock scholarship
const scholarship = global.testUtils.createMockScholarship();

// Create mock achievement
const achievement = global.testUtils.createMockAchievement();

// Create mock support plan
const supportPlan = global.testUtils.createMockSupportPlan();
```

#### HTTP Helpers

```javascript
// Create mock response object
const res = global.testUtils.createMockResponse();

// Create mock request object
const req = global.testUtils.createMockRequest({
  params: { beneficiaryId: '123' },
  query: { period: 'semester' },
});

// Verify response structure
global.testUtils.verifyResponseStructure(response);
```

#### Assertion Helpers

```javascript
// Compare dates
global.testUtils.datesEqual(date1, date2);
```

## Writing Tests

### Test File Structure

```javascript
describe('Feature Name', () => {
  let mockData;

  beforeEach(() => {
    // Setup before each test
    mockData = global.testUtils.createMockBeneficiary();
  });

  afterEach(() => {
    // Cleanup after each test
    jest.clearAllMocks();
  });

  describe('Sub-feature', () => {
    test('should do something', () => {
      // Test implementation
      expect(result).toBe(expected);
    });
  });
});
```

### Common Test Patterns

#### Testing Function Behavior

```javascript
test('should return correct value', () => {
  const result = function(input);
  expect(result).toBe(expectedValue);
});
```

#### Testing Error Handling

```javascript
test('should throw error on invalid input', () => {
  expect(() => {
    functionThatThrows(invalidInput);
  }).toThrow('Error message');
});
```

#### Testing Async Functions

```javascript
test('should resolve promise', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

#### Testing Array Operations

```javascript
test('should filter array correctly', () => {
  const items = [1, 2, 3, 4, 5];
  const filtered = items.filter(x => x > 2);
  expect(filtered).toEqual([3, 4, 5]);
});
```

## Test Examples

### Model Validation Test

```javascript
describe('Beneficiary Model', () => {
  test('should validate email format', () => {
    const validEmail = 'user@example.com';
    const invalidEmail = 'user@invalid';

    expect(validateEmail(validEmail)).toBe(true);
    expect(validateEmail(invalidEmail)).toBe(false);
  });
});
```

### Service Logic Test

```javascript
describe('AttendanceService', () => {
  test('should record attendance successfully', async () => {
    const data = { beneficiaryId: '123', status: 'present' };
    const result = await service.recordAttendance(data);

    expect(result.status).toBe('success');
    expect(result.data).toBeDefined();
  });
});
```

### Route Integration Test

```javascript
describe('Attendance Routes', () => {
  test('should handle POST request', () => {
    const req = global.testUtils.createMockRequest({
      body: { beneficiaryId: '123', status: 'present' },
    });
    const res = global.testUtils.createMockResponse();

    handleRoute(req, res);

    expect(res.status).toBeCalled();
  });
});
```

## Coverage Reports

### HTML Coverage Report

After running tests with coverage:

```bash
npm test -- --coverage
```

Open `coverage/index.html` in a browser to view detailed coverage report.

### Command Line Summary

```bash
npm test -- --coverage --collectCoverageFrom='backend/**/*.js'
```

## Mocking

### Mock Functions

```javascript
const mockFn = jest.fn();
mockFn.mockReturnValue(value);
mockFn.mockResolvedValue(promise);
```

### Mock Modules

```javascript
jest.mock('mongodb', () => ({
  // mock implementation
}));
```

### Clear Mocks

```javascript
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});
```

## Debugging Tests

### Run Single Test

```bash
npm test -- -t "specific test name"
```

### Verbose Output

```bash
npm test -- --verbose
```

### Debug Node Process

```bash
node --inspect-brk ./node_modules/.bin/jest
```

## Best Practices

1. **Test Naming**: Use clear, descriptive test names

   ```javascript
   ✅ test('should record attendance for present status')
   ❌ test('test attendance')
   ```

2. **Arrange-Act-Assert Pattern**:

   ```javascript
   test('should...', () => {
     // Arrange
     const input = setupData();

     // Act
     const result = executeFunction(input);

     // Assert
     expect(result).toBe(expected);
   });
   ```

3. **DRY Principle**: Use `beforeEach` to avoid duplication
4. **Mock External Dependencies**: Don't test database directly
5. **Test Edge Cases**: Test boundary conditions and errors
6. **Isolated Tests**: Each test should be independent

## Continuous Integration

### Running Tests in CI/CD

```bash
# Run tests with coverage and generate report
npm test -- --coverage --ci --testTimeout=10000

# Generate JUnit output for CI systems
npm test -- --ci --reporters=default --reporters=jest-junit
```

## Troubleshooting

### Test Timeout

```bash
# Increase timeout for specific test
jest.setTimeout(30000);
```

### Module Not Found

Ensure module paths match `moduleNameMapper` in jest.config.js

### Mock Not Working

Clear module cache:

```javascript
jest.resetModules();
```

## Test Statistics

### Current Coverage

- **Total Test Files**: 8+
- **Total Test Cases**: 300+
- **Coverage Target**: 75%+
- **Execution Time**: <30 seconds

### Test Breakdown

- **Model Tests**: 80+ tests
- **Service Tests**: 100+ tests
- **Route Tests**: 120+ tests

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing JavaScript Guide](https://testingjavascript.com/)
- [Mocking Best Practices](https://jestjs.io/docs/mock-functions)

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Implement feature
3. Ensure all tests pass
4. Maintain or improve coverage
5. Update this documentation

---

**Last Updated**: February 15, 2026 **Maintainer**: Development Team
