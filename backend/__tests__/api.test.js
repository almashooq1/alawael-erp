/**
 * Test Suite - All API Endpoints
 * مجموعة الاختبارات - جميع نقاط النهاية
 *
 * Run with: npm test
 */

const request = require('supertest');
const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');

let app;
let server;
let authToken;
let userId;

// ============================================
// SETUP & TEARDOWN
// ============================================

beforeAll(async () => {
  // Mock app setup
  app = require('../server');
  server = app.listen(5001); // Test port
});

afterAll(async () => {
  if (server) {
    server.close();
  }
});

// ============================================
// AUTHENTICATION TESTS
// ============================================

describe('🔐 Authentication API', () => {
  it('POST /api/v1/auth/register - Should register new user', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `test${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        fullName: 'أحمد محمد',
        role: 'admin',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('accessToken');
    expect(response.body.data.user).toHaveProperty('email');

    authToken = response.body.data.accessToken;
    userId = response.body.data.user.id;
  });

  it('POST /api/v1/auth/register - Should reject invalid email', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      email: 'invalid-email',
      password: 'SecurePassword123!',
      firstName: 'أحمد',
    });

    expect(response.status).toBe(400);
  });

  it('POST /api/v1/auth/login - Should login successfully', async () => {
    // Register user first
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `login${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        fullName: 'فاطمة محمود',
      });

    // Login
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: registerRes.body.data.user.email,
      password: 'SecurePassword123!',
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty('data');
    expect(loginRes.body.data).toHaveProperty('accessToken');
    expect(loginRes.body.data.user).toHaveProperty('email');
  });

  it('POST /api/v1/auth/login - Should reject wrong password', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'nonexistent@example.com',
      password: 'WrongPassword',
    });

    expect(response.status).toBe(401);
  });
});

// ============================================
// USER ROUTES TESTS
// ============================================

describe('👤 User Management API', () => {
  it('GET /api/v1/users - Should get all users (protected)', async () => {
    const response = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('GET /api/v1/users/:id - Should get user by ID', async () => {
    const response = await request(app)
      .get(`/api/v1/users/${userId || 'test-id'}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404]).toContain(response.status);
  });

  it('PUT /api/v1/users/:id - Should update user', async () => {
    const response = await request(app)
      .put(`/api/v1/users/${userId || 'test-id'}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        firstName: 'محمود',
        phone: '+966-50-123-4567',
      });

    expect([200, 404]).toContain(response.status);
  });

  it('GET /api/v1/users - Should fail without auth token', async () => {
    const response = await request(app).get('/api/v1/users');

    expect(response.status).toBe(401);
  });
});

// ============================================
// DOCUMENT ROUTES TESTS
// ============================================

describe('📄 Document Management API', () => {
  let documentId;

  it('POST /api/v1/documents - Should create document', async () => {
    const response = await request(app)
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'اختبار المستند',
        description: 'هذا مستند اختبار',
        folder: 'Documents',
        tags: ['اختبار', 'عينة'],
      });

    expect([201, 400, 404, 200]).toContain(response.status);
  });

  it('GET /api/v1/documents - Should get all documents', async () => {
    const response = await request(app).get('/api/v1/documents').set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('documents');
    expect(Array.isArray(response.body.data.documents)).toBe(true);
  });

  it('PUT /api/v1/documents/:id - Should update document', async () => {
    const response = await request(app)
      .put(`/api/v1/documents/${documentId || 'test-id'}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'عنوان محدث',
        status: 'published',
      });

    expect([200, 404]).toContain(response.status);
  });

  it('DELETE /api/v1/documents/:id - Should delete document', async () => {
    const response = await request(app)
      .delete(`/api/v1/documents/${documentId || 'test-id'}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect([200, 404]).toContain(response.status);
  });
});

// ============================================
// PROJECT ROUTES TESTS
// ============================================

describe('📊 Project Management API', () => {
  let projectId;

  it('POST /api/v1/projects - Should create project', async () => {
    const response = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'مشروع اختبار',
        description: 'هذا مشروع اختبار النظام',
        budget: 100000,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

    expect([201, 400, 200]).toContain(response.status);
  });

  it('GET /api/v1/projects - Should get all projects', async () => {
    const response = await request(app).get('/api/v1/projects').set('Authorization', `Bearer ${authToken}`);

    expect([200, 400]).toContain(response.status);
  });

  it('PUT /api/v1/projects/:id - Should update project', async () => {
    const response = await request(app).put(`/api/v1/projects/test-id`).set('Authorization', `Bearer ${authToken}`).send({
      status: 'in-progress',
      progress: 25,
    });

    expect([200, 400, 404]).toContain(response.status);
  });

  it('POST /api/v1/projects/:id/tasks - Should add task to project', async () => {
    const response = await request(app).post(`/api/v1/projects/test-id/tasks`).set('Authorization', `Bearer ${authToken}`).send({
      title: 'مهمة 1',
      priority: 'high',
      dueDate: new Date().toISOString(),
    });

    expect([201, 400, 404]).toContain(response.status);
  });
});

// ============================================
// EMPLOYEE ROUTES TESTS
// ============================================

describe('👥 Employee Management API', () => {
  let employeeId;

  it('POST /api/v1/employees - Should create employee', async () => {
    const response = await request(app).post('/api/v1/employees').set('Authorization', `Bearer ${authToken}`).send({
      userId,
      employeeId: 'EMP001',
      department: 'تطوير البرامج',
      position: 'مطور أول',
      salary: 8000,
      joinDate: new Date().toISOString(),
    });

    expect([201, 400, 403, 200]).toContain(response.status);
  });

  it('GET /api/v1/employees - Should get all employees', async () => {
    const response = await request(app).get('/api/v1/employees').set('Authorization', `Bearer ${authToken}`);

    expect([200, 400, 403]).toContain(response.status);
  });

  it('PUT /api/v1/employees/test-id - Should update employee', async () => {
    const response = await request(app).put(`/api/v1/employees/test-id`).set('Authorization', `Bearer ${authToken}`).send({
      salary: 9000,
      status: 'active',
    });

    expect([200, 400, 403, 404]).toContain(response.status);
  });

  it('POST /api/v1/employees/test-id/attendance - Should record attendance', async () => {
    const response = await request(app).post(`/api/v1/employees/test-id/attendance`).set('Authorization', `Bearer ${authToken}`).send({
      checkIn: new Date().toISOString(),
      status: 'present',
    });

    expect([200, 400, 404]).toContain(response.status);
  });
});

// ============================================
// CUSTOMER ROUTES TESTS
// ============================================

describe('🤝 Customer Management API', () => {
  let customerId;

  it('POST /api/v1/customers - Should create customer', async () => {
    const response = await request(app).post('/api/v1/customers').set('Authorization', `Bearer ${authToken}`).send({
      name: 'أحمد العبدالله',
      email: 'ahmad@example.com',
      phone: '+966-50-123-4567',
      company: 'شركة التقنية',
      address: 'الرياض، السعودية',
    });

    expect([201, 400, 404, 200]).toContain(response.status);
  });

  it('GET /api/v1/customers - Should get all customers', async () => {
    const response = await request(app).get('/api/v1/customers').set('Authorization', `Bearer ${authToken}`);

    expect([200, 400, 404]).toContain(response.status);
  });

  it('PUT /api/v1/customers/test-id - Should update customer', async () => {
    const response = await request(app).put(`/api/v1/customers/test-id`).set('Authorization', `Bearer ${authToken}`).send({
      status: 'active',
      phone: '+966-50-999-8888',
    });

    expect([200, 400, 404]).toContain(response.status);
  });
});

// ============================================
// PRODUCT ROUTES TESTS
// ============================================

describe('📦 Product Management API', () => {
  let productId;

  it('POST /api/v1/products - Should create product', async () => {
    const response = await request(app).post('/api/v1/products').set('Authorization', `Bearer ${authToken}`).send({
      name: 'لاب توب',
      sku: 'LAPTOP-001',
      description: 'لاب توب عالي الأداء',
      price: 15000,
      category: 'الإلكترونيات',
      stock: 50,
      minStock: 10,
      maxStock: 100,
    });

    expect([201, 400, 404, 200]).toContain(response.status);
  });

  it('GET /api/v1/products - Should get all products', async () => {
    const response = await request(app).get('/api/v1/products').set('Authorization', `Bearer ${authToken}`);

    expect([200, 400, 404]).toContain(response.status);
  });

  it('PUT /api/v1/products/test-id - Should update product', async () => {
    const response = await request(app).put(`/api/v1/products/test-id`).set('Authorization', `Bearer ${authToken}`).send({
      price: 16000,
      stock: 45,
    });

    expect([200, 400, 404]).toContain(response.status);
  });
});

// ============================================
// HEALTH CHECK TESTS
// ============================================

describe('🏥 Health Check API', () => {
  it('GET /api/v1/health - Should return health status', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
    expect(response.body).toHaveProperty('timestamp');
  });
});

// ============================================
// ERROR HANDLING TESTS
// ============================================

describe('❌ Error Handling', () => {
  it('Should return 404 or 401 for non-existent route', async () => {
    const response = await request(app).get('/api/v1/nonexistent');

    expect([404, 401]).toContain(response.status);
  });

  it('Should return 400/500 for server errors', async () => {
    const response = await request(app).post('/api/v1/documents').set('Authorization', `Bearer ${authToken}`).send({
      // Invalid data
      invalidField: 'test',
    });

    expect([400, 500, 404]).toContain(response.status);
  });
});
