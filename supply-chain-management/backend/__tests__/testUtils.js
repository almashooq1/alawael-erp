/**
 * Test Utilities Helper
 * Common utilities for testing supply chain management system
 */

const mongoose = require('mongoose');

/**
 * Generate valid MongoDB ObjectId
 * @returns {string} Valid ObjectId
 */
function generateObjectId() {
  return new mongoose.Types.ObjectId().toString();
}

/**
 * Create mock user object
 * @param {Object} overrides - Fields to override
 * @returns {Object} Mock user
 */
function createMockUser(overrides = {}) {
  return {
    _id: generateObjectId(),
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    role: 'user',
    ...overrides,
  };
}

/**
 * Create mock document object
 * @param {Object} overrides - Fields to override
 * @returns {Object} Mock document
 */
function createMockDocument(overrides = {}) {
  return {
    _id: generateObjectId(),
    title: 'Test Document',
    content: 'Test content',
    status: 'draft',
    owner: generateObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Mock Request object
 */
class MockRequest {
  constructor(bodyData = {}, paramData = {}, queryData = {}) {
    this.body = bodyData;
    this.params = paramData;
    this.query = queryData;
    this.headers = { authorization: 'Bearer test-token' };
    this.user = createMockUser();
    this.userId = this.user._id;
    this.id = generateObjectId();
  }
}

/**
 * Mock Response object
 */
class MockResponse {
  constructor() {
    this.statusCode = 200;
    this.responseData = null;
    this.headers = {};
  }

  status(code) {
    this.statusCode = code;
    return this;
  }

  json(data) {
    this.responseData = data;
    return this;
  }

  header(key, value) {
    this.headers[key] = value;
    return this;
  }

  setHeader(key, value) {
    this.headers[key] = value;
  }

  send(data) {
    this.responseData = data;
    return this;
  }

  sendStatus(code) {
    this.statusCode = code;
    return this;
  }
}

/**
 * Mock Next function
 */
function mockNext() {
  return jest.fn();
}

/**
 * Create mock service
 * @param {string} serviceName - Name of service
 * @returns {Object} Mock service with common methods
 */
function createMockService(serviceName) {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    list: jest.fn(),
    count: jest.fn(),
    emit: jest.fn(),
    once: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  };
}

/**
 * Wait for async operation
 * @param {number} ms - Milliseconds to wait
 */
function wait(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Assert response structure
 * @param {Object} response - Response object
 * @param {boolean} expectedSuccess - Expected success value
 */
function assertResponseStructure(response, expectedSuccess = true) {
  expect(response).toBeDefined();
  expect(response.success).toBe(expectedSuccess);
  expect(response.message).toBeDefined();
  if (expectedSuccess) {
    expect(response.data).toBeDefined();
  }
}

/**
 * Create test database seed
 * @returns {Object} Seeded entities
 */
async function seedTestDatabase() {
  const users = ['user1', 'user2', 'user3'].map(name =>
    createMockUser({
      username: name,
      _id: generateObjectId(),
    })
  );

  const documents = ['doc1', 'doc2', 'doc3'].map(name =>
    createMockDocument({
      title: name,
      _id: generateObjectId(),
      owner: users[0]._id,
    })
  );

  return { users, documents };
}

/**
 * Mock Mongoose Model Query
 */
class MockQuery {
  constructor(data = null) {
    this.data = data;
  }

  exec() {
    return Promise.resolve(this.data);
  }

  then(callback) {
    return Promise.resolve(this.data).then(callback);
  }

  catch(callback) {
    return Promise.resolve(this.data).catch(callback);
  }

  select() {
    return this;
  }

  lean() {
    return this;
  }

  limit(n) {
    return this;
  }

  skip(n) {
    return this;
  }

  sort(field) {
    return this;
  }

  populate() {
    return this;
  }
}

/**
 * Create mock model method
 */
function createMockFindByIdStub(model, returnData = null) {
  return {
    findById: jest.fn().mockReturnValue(new MockQuery(returnData || createMockDocument())),
  };
}

module.exports = {
  generateObjectId,
  createMockUser,
  createMockDocument,
  MockRequest,
  MockResponse,
  mockNext,
  createMockService,
  wait,
  assertResponseStructure,
  seedTestDatabase,
  MockQuery,
  createMockFindByIdStub,
};
