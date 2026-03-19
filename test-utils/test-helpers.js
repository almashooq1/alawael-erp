/**
 * Test Helpers and Utilities
 * Common functions used across all tests
 */

const fs = require('fs');
const path = require('path');

/**
 * Database Helpers
 */
class DatabaseHelper {
  static async setupTestDB() {
    // Connect to test database
    // Create collections
  }

  static async dropTestDB() {
    // Drop all collections
    // Close connection
  }

  static async clearCollections(collectionNames) {
    // Clear specific collections
  }

  static async seedData(data) {
    // Insert seed data
  }

  static async insertDocument(collection, data) {
    // Insert single document
  }

  static async findDocument(collection, filter) {
    // Find document
  }

  static async updateDocument(collection, filter, update) {
    // Update document
  }

  static async deleteDocument(collection, filter) {
    // Delete document
  }

  static async getDocumentCount(collection) {
    // Get document count
  }
}

/**
 * Authentication Helpers
 */
class AuthHelper {
  static generateToken(userId, role = 'user') {
    // Generate JWT or session token
    return `token_${userId}_${role}_${Date.now()}`;
  }

  static generateValidCredentials() {
    return {
      email: `test${Date.now()}@example.com`,
      password: 'Test@12345',
      fullName: 'Test User',
    };
  }

  static generateExpiredToken() {
    // Generate expired token
    return 'expired_token_' + Date.now();
  }

  static generateInvalidToken() {
    return 'invalid_token_format';
  }

  static extractTokenFromResponse(response) {
    return response.body?.data?.accessToken || response.body?.token;
  }

  static createAuthHeader(token) {
    return { Authorization: `Bearer ${token}` };
  }
}

/**
 * Data Generation Helpers
 */
class DataGenerator {
  static generateUser(overrides = {}) {
    return {
      fullName: 'Test User',
      email: `test${Date.now()}@example.com`,
      password: 'Test@12345',
      role: 'user',
      status: 'active',
      ...overrides,
    };
  }

  static generateEmployee(overrides = {}) {
    return {
      name: 'Test Employee',
      email: `emp${Date.now()}@example.com`,
      department: 'IT',
      position: 'Developer',
      salary: 5000,
      joinDate: new Date(),
      ...overrides,
    };
  }

  static generateProject(overrides = {}) {
    return {
      name: `Project ${Date.now()}`,
      description: 'Test Project',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(),
      lead: 'test-user-id',
      ...overrides,
    };
  }

  static generateTask(projectId, overrides = {}) {
    return {
      title: `Task ${Date.now()}`,
      description: 'Test Task',
      projectId,
      assignee: 'test-user-id',
      status: 'todo',
      priority: 'medium',
      dueDate: new Date(),
      ...overrides,
    };
  }

  static generateBatch(generator, count, overrides = {}) {
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(generator({ ...overrides, id: i }));
    }
    return items;
  }
}

/**
 * Assertion Helpers
 */
class AssertionHelper {
  static assertValidResponse(response) {
    expect(response.body).toBeDefined();
    expect(response.body.success).toBeDefined();
    return response.body;
  }

  static assertSuccessResponse(response) {
    const body = this.assertValidResponse(response);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    return body.data;
  }

  static assertErrorResponse(response) {
    const body = this.assertValidResponse(response);
    expect(body.success).toBe(false);
    expect(body.error || body.message).toBeDefined();
    return body;
  }

  static assertPaginatedResponse(response) {
    const body = this.assertSuccessResponse(response);
    expect(body).toBeInstanceOf(Array);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.total).toBeDefined();
    expect(response.body.pagination.page).toBeDefined();
    return response.body;
  }

  static assertValidMongoId(id) {
    expect(id).toMatch(/^[0-9a-fA-F]{24}$/);
  }

  static assertValidEmail(email) {
    expect(email).toMatch(/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/);
  }

  static assertValidDate(date) {
    expect(new Date(date).getTime()).toBeGreaterThan(0);
  }
}

/**
 * File Helpers
 */
class FileHelper {
  static createTempFile(content, extension = 'txt') {
    const filename = `test_${Date.now()}.${extension}`;
    const filepath = path.join(__dirname, `../temp/${filename}`);

    fs.ensureDirSync(path.dirname(filepath));
    fs.writeFileSync(filepath, content);

    return filepath;
  }

  static deleteTempFile(filepath) {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  }

  static readTempFile(filepath) {
    return fs.readFileSync(filepath, 'utf-8');
  }

  static createTempDirectory() {
    const dirname = `test_${Date.now()}`;
    const dirpath = path.join(__dirname, `../temp/${dirname}`);

    fs.ensureDirSync(dirpath);

    return dirpath;
  }

  static deleteTempDirectory(dirpath) {
    if (fs.existsSync(dirpath)) {
      fs.rmSync(dirpath, { recursive: true });
    }
  }
}

/**
 * Mock Helpers
 */
class MockHelper {
  static createMockRequest(overrides = {}) {
    return {
      method: 'GET',
      url: '/',
      headers: {},
      params: {},
      query: {},
      body: {},
      user: { _id: 'test-user', role: 'user' },
      ...overrides,
    };
  }

  static createMockResponse() {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      getHeader: jest.fn(),
    };
  }

  static createMockNext() {
    return jest.fn();
  }

  static createMockLogger() {
    return {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
  }
}

/**
 * Time Helpers
 */
class TimeHelper {
  static async wait(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  static formatDate(date) {
    return new Date(date).toISOString();
  }

  static getCurrentTimestamp() {
    return Date.now();
  }

  static addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
  }

  static addHours(date, hours) {
    return new Date(date.getTime() + hours * 3600000);
  }

  static addDays(date, days) {
    return new Date(date.getTime() + days * 86400000);
  }
}

/**
 * Performance Helpers
 */
class PerformanceHelper {
  static createTimer() {
    const start = Date.now();
    return {
      elapsed: () => Date.now() - start,
      reset: () => (start = Date.now()),
    };
  }

  static async measureAsync(fn, label = 'Operation') {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    console.log(`⏱️ ${label}: ${duration}ms`);
    return { result, duration };
  }

  static measure(fn, label = 'Operation') {
    const start = Date.now();
    const result = fn();
    const duration = Date.now() - start;
    console.log(`⏱️ ${label}: ${duration}ms`);
    return { result, duration };
  }
}

module.exports = {
  DatabaseHelper,
  AuthHelper,
  DataGenerator,
  AssertionHelper,
  FileHelper,
  MockHelper,
  TimeHelper,
  PerformanceHelper,
};
