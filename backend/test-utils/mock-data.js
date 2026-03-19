/* eslint-disable no-unused-vars */
/* eslint-env jest */
/**
 * Mock Data Generator
 * Create realistic test data easily
 */

const { expect } = global;

class MockDataGenerator {
  /**
   * Generate timestamps
   */
  static timestamps() {
    const now = new Date();
    return {
      now,
      yesterday: new Date(now.getTime() - 86400000),
      tomorrow: new Date(now.getTime() + 86400000),
      lastWeek: new Date(now.getTime() - 604800000),
      nextWeek: new Date(now.getTime() + 604800000),
      lastMonth: new Date(now.getTime() - 2592000000),
      nextMonth: new Date(now.getTime() + 2592000000),
    };
  }

  /**
   * Generate user data
   */
  static user(overrides = {}) {
    return {
      _id: this.mongoId(),
      firstName: 'John',
      lastName: 'Doe',
      email: `user${Date.now()}@example.com`,
      password: 'hashed_password_here',
      phone: '+1-555-0100',
      role: 'user',
      status: 'active',
      avatar: 'https://example.com/avatar.jpg',
      preferences: {
        language: 'en',
        timezone: 'UTC',
        notifications: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Generate admin data
   */
  static admin(overrides = {}) {
    return this.user({
      role: 'admin',
      permissions: ['read', 'write', 'delete'],
      ...overrides,
    });
  }

  /**
   * Generate employee data
   */
  static employee(overrides = {}) {
    return {
      _id: this.mongoId(),
      firstName: 'Jane',
      lastName: 'Smith',
      email: `emp${Date.now()}@company.com`,
      department: 'Engineering',
      position: 'Senior Developer',
      salary: 80000,
      joinDate: new Date(),
      manager: this.mongoId(),
      status: 'active',
      skills: ['JavaScript', 'Node.js', 'React'],
      createdAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Generate project data
   */
  static project(overrides = {}) {
    return {
      _id: this.mongoId(),
      name: `Project ${Date.now()}`,
      description: 'Project description',
      owner: this.mongoId(),
      team: [this.mongoId(), this.mongoId()],
      status: 'active',
      priority: 'high',
      startDate: new Date(),
      endDate: new Date(),
      budget: 50000,
      actualCost: 30000,
      progress: 60,
      tags: ['important', 'urgent'],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Generate task data
   */
  static task(projectId, overrides = {}) {
    return {
      _id: this.mongoId(),
      title: `Task ${Date.now()}`,
      description: 'Task description',
      projectId,
      assignee: this.mongoId(),
      reporter: this.mongoId(),
      status: 'todo',
      priority: 'medium',
      dueDate: new Date(),
      tags: ['backend', 'feature'],
      attachments: [],
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Generate payment data
   */
  static payment(overrides = {}) {
    return {
      _id: this.mongoId(),
      amount: 100.0,
      currency: 'USD',
      status: 'completed',
      method: 'credit_card',
      userId: this.mongoId(),
      invoiceId: this.mongoId(),
      transactionId: `TXN_${Date.now()}`,
      paidAt: new Date(),
      metadata: {},
      createdAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Generate API response
   */
  static response(data = {}, overrides = {}) {
    return {
      success: true,
      statusCode: 200,
      message: 'Operation successful',
      data,
      timestamp: new Date().toISOString(),
      requestId: `REQ_${Date.now()}`,
      ...overrides,
    };
  }

  /**
   * Generate error response
   */
  static errorResponse(message = 'An error occurred', overrides = {}) {
    return {
      success: false,
      statusCode: 400,
      message,
      error: {
        code: 'INTERNAL_ERROR',
        details: {},
      },
      timestamp: new Date().toISOString(),
      requestId: `REQ_${Date.now()}`,
      ...overrides,
    };
  }

  /**
   * Generate MongoDB ID
   */
  static mongoId() {
    return require('mongodb').ObjectId().toString();
  }

  /**
   * Generate UUID
   */
  static uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Generate random string
   */
  static randomString(length = 10) {
    return Math.random()
      .toString(36)
      .substring(2, 2 + length);
  }

  /**
   * Generate random number
   */
  static randomNumber(min = 0, max = 1000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate batch of items
   */
  static batch(generator, count, overrides = {}) {
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(generator.call(this, { ...overrides, index: i }));
    }
    return items;
  }
}

/**
 * Assertion Helpers
 */
class AssertionUtils {
  /**
   * Assert valid response structure
   */
  static assertValidResponse(response) {
    expect(response).toBeDefined();
    expect(response.body).toBeDefined();
    expect(response.status).toBeDefined();
    return response;
  }

  /**
   * Assert successful API response
   */
  static assertSuccessResponse(response) {
    this.assertValidResponse(response);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);
  }

  /**
   * Assert error response
   */
  static assertErrorResponse(response) {
    this.assertValidResponse(response);
    expect(response.body.success).toBe(false);
    expect(response.status).toBeGreaterThanOrEqual(400);
  }

  /**
   * Assert array not empty
   */
  static assertArrayNotEmpty(array) {
    expect(Array.isArray(array)).toBe(true);
    expect(array.length).toBeGreaterThan(0);
  }

  /**
   * Assert object has specific properties
   */
  static assertObjectHasProperties(obj, properties) {
    properties.forEach(prop => {
      expect(obj).toHaveProperty(prop);
    });
  }
}

/**
 * HTTP Helper
 */
class HTTPHelper {
  /**
   * Create headers
   */
  static headers(overrides = {}) {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...overrides,
    };
  }

  /**
   * Create auth header
   */
  static authHeaders(token) {
    return {
      ...this.headers(),
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Create form data headers
   */
  static formDataHeaders(overrides = {}) {
    return {
      Accept: 'application/json',
      ...overrides,
    };
  }
}

module.exports = {
  MockDataGenerator,
  AssertionUtils,
  HTTPHelper,
};
