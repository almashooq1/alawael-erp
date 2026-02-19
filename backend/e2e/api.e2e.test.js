/**
 * 🌐 E2E Tests: API Integration
 * End-to-end tests for API endpoints, CRUD operations, and data validation
 */

const { test, expect } = require('@playwright/test');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

/**
 * Helper function to make API requests
 */
async function makeRequest(method, endpoint, data = null, headers = {}) {
  const url = `${API_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const body = await response.json().catch(() => null);

  return {
    status: response.status,
    headers: response.headers,
    body,
  };
}

test.describe('🌐 API Integration E2E Tests', () => {
  test.describe('User API', () => {
    test('should create a new user via POST /users', async () => {
      const newUser = {
        username: 'newuser' + Date.now(),
        email: `user${Date.now()}@test.com`,
        password: 'Password@123',
      };

      const response = await makeRequest('POST', '/users', newUser);

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.username).toBe(newUser.username);
      expect(response.body.password).toBeUndefined(); // Password should not be returned
    });

    test('should reject duplicate email on user creation', async () => {
      const userData = {
        username: 'testuser',
        email: 'duplicate@test.com',
        password: 'Password@123',
      };

      // Create first user
      await makeRequest('POST', '/users', userData);

      // Try to create with same email
      const response = await makeRequest('POST', '/users', {
        username: 'otheruser',
        email: userData.email,
        password: 'Password@123',
      });

      expect(response.status).toBe(409); // Conflict
      expect(response.body.error).toBeDefined();
    });

    test('should retrieve user by ID via GET /users/:id', async () => {
      // Create a user first
      const userData = {
        username: 'getuser' + Date.now(),
        email: `getuser${Date.now()}@test.com`,
        password: 'Password@123',
      };

      const createResponse = await makeRequest('POST', '/users', userData);
      const userId = createResponse.body.id;

      // Retrieve the user
      const getResponse = await makeRequest('GET', `/users/${userId}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.id).toBe(userId);
      expect(getResponse.body.username).toBe(userData.username);
    });

    test('should update user via PUT /users/:id', async () => {
      // Create a user
      const userData = {
        username: 'updateuser' + Date.now(),
        email: `updateuser${Date.now()}@test.com`,
        password: 'Password@123',
      };

      const createResponse = await makeRequest('POST', '/users', userData);
      const userId = createResponse.body.id;

      // Update the user
      const updateData = {
        username: 'updated' + Date.now(),
        email: `updated${Date.now()}@test.com`,
      };

      const updateResponse = await makeRequest('PUT', `/users/${userId}`, updateData);

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.username).toBe(updateData.username);
      expect(updateResponse.body.email).toBe(updateData.email);
    });

    test('should delete user via DELETE /users/:id', async () => {
      // Create a user
      const userData = {
        username: 'deleteuser' + Date.now(),
        email: `deleteuser${Date.now()}@test.com`,
        password: 'Password@123',
      };

      const createResponse = await makeRequest('POST', '/users', userData);
      const userId = createResponse.body.id;

      // Delete the user
      const deleteResponse = await makeRequest('DELETE', `/users/${userId}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.message || deleteResponse.body.success).toBeDefined();

      // Verify user is deleted
      const getResponse = await makeRequest('GET', `/users/${userId}`);
      expect(getResponse.status).toBeGreaterThanOrEqual(404);
    });

    test('should list users with pagination via GET /users', async () => {
      const response = await makeRequest('GET', '/users?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data || response.body.users || response.body)).toBe(true);
      expect(response.body.pagination || response.body.total).toBeDefined();
    });
  });

  test.describe('Data CRUD Operations', () => {
    test('should create document with required fields', async () => {
      const document = {
        title: 'Test Document ' + Date.now(),
        content: 'This is test content',
        type: 'test',
      };

      const response = await makeRequest('POST', '/documents', document);

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.title).toBe(document.title);
    });

    test('should reject document without required fields', async () => {
      const incompleteDocument = {
        content: 'Missing title',
        // title is missing
      };

      const response = await makeRequest('POST', '/documents', incompleteDocument);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.error || response.body.errors).toBeDefined();
    });

    test('should filter documents by status', async () => {
      // Create documents with different statuses
      const doc1 = {
        title: 'Active Doc ' + Date.now(),
        content: 'Active content',
        status: 'active',
      };

      const doc2 = {
        title: 'Inactive Doc ' + Date.now(),
        content: 'Inactive content',
        status: 'inactive',
      };

      await makeRequest('POST', '/documents', doc1);
      await makeRequest('POST', '/documents', doc2);

      // Query for active documents
      const response = await makeRequest('GET', '/documents?status=active');

      expect(response.status).toBe(200);
      const documents = response.body.data || response.body;
      const activeCount = documents.filter(d => d.status === 'active').length;
      expect(activeCount).toBeGreaterThan(0);
    });

    test('should search documents by title', async () => {
      const searchTerm = 'SearchTest' + Date.now();
      const document = {
        title: searchTerm,
        content: 'Searchable content',
      };

      await makeRequest('POST', '/documents', document);

      // Search
      const response = await makeRequest('GET', `/documents?search=${searchTerm}`);

      expect(response.status).toBe(200);
      const documents = response.body.data || response.body;
      const found = documents.find(d => d.title.includes(searchTerm));
      expect(found).toBeDefined();
    });
  });

  test.describe('Error Handling', () => {
    test('should return 404 for non-existent resource', async () => {
      const response = await makeRequest('GET', '/users/nonexistent-id');
      expect(response.status).toBe(404);
    });

    test('should return validation error for invalid data', async () => {
      const invalidData = {
        email: 'invalid-email-format', // Invalid email
        password: '123', // Too short
      };

      const response = await makeRequest('POST', '/users', invalidData);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.errors || response.body.error).toBeDefined();
    });

    test('should handle concurrent requests safely', async () => {
      const requests = [];

      // Create multiple requests concurrently
      for (let i = 0; i < 5; i++) {
        requests.push(
          makeRequest('POST', '/users', {
            username: `concurrentuser${i}${Date.now()}`,
            email: `concurrent${i}${Date.now()}@test.com`,
            password: 'Password@123',
          })
        );
      }

      const responses = await Promise.all(requests);

      // All should succeed
      expect(responses.every(r => r.status === 201)).toBe(true);

      // All should have unique IDs
      const ids = responses.map(r => r.body.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  test.describe('Data Validation', () => {
    test('should reject XSS attempts in input', async () => {
      const xssPayload = {
        title: '<script>alert("XSS")</script>Test',
        content: 'Normal content',
      };

      const response = await makeRequest('POST', '/documents', xssPayload);

      // Should either sanitize or reject
      if (response.status === 201) {
        expect(response.body.title).not.toContain('<script>');
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    test('should reject SQL injection attempts', async () => {
      const sqlPayload = {
        title: "'; DROP TABLE users; --",
        content: 'Malicious content',
      };

      const response = await makeRequest('POST', '/documents', sqlPayload);

      // Should either sanitize or reject
      if (response.status === 201) {
        expect(response.body.title).not.toContain('DROP TABLE');
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    test('should enforce field length limits', async () => {
      const oversizedData = {
        title: 'A'.repeat(10000), // Extremely long title
        content: 'Content',
      };

      const response = await makeRequest('POST', '/documents', oversizedData);

      // Should reject or truncate
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('Response Format', () => {
    test('should return consistent JSON format', async () => {
      const response = await makeRequest('GET', '/users');

      expect(response.headers.get('content-type')).toContain('application/json');
      expect(response.body).toBeDefined();
      expect(typeof response.body).toBe('object');
    });

    test('should include proper HTTP status codes', async () => {
      // Success
      const getResponse = await makeRequest('GET', '/users');
      expect([200, 201].includes(getResponse.status)).toBe(true);

      // Error
      const badResponse = await makeRequest('GET', '/users/invalid');
      expect([400, 404].includes(badResponse.status)).toBe(true);
    });

    test('should include error messages on failure', async () => {
      const response = await makeRequest('GET', '/users/nonexistent');

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.error || response.body.message || response.body.errors).toBeDefined();
    });
  });

  test.describe('Performance', () => {
    test('should respond within acceptable time for simple queries', async () => {
      const startTime = Date.now();
      const response = await makeRequest('GET', '/users?limit=10');
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000); // Should complete in < 2 seconds
    });

    test('should handle large result sets efficiently', async () => {
      const startTime = Date.now();
      const response = await makeRequest('GET', '/documents?limit=1000');
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
    });
  });
});
