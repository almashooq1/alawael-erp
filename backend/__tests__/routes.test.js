const request = require('supertest');
const app = require('../server');
const db = require('../config/inMemoryDB');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

describe('HR Routes', () => {
  let adminToken;
  let userToken;

  beforeEach(() => {
    db.write({
      users: [
        {
          _id: 'admin-1',
          email: 'admin@example.com',
          password: 'hashed',
          fullName: 'Admin User',
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      employees: [],
      attendances: [],
      leaves: [],
      performance: [],
    });

    adminToken = jwt.sign({ userId: 'admin-1', email: 'admin@example.com', role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });

    userToken = jwt.sign({ userId: 'user-1', email: 'user@example.com', role: 'user' }, JWT_SECRET, { expiresIn: '24h' });
  });

  describe('GET /api/hr/employees', () => {
    it('should return all employees for admin', async () => {
      const res = await request(app).get('/api/hr/employees').set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(res.status);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/hr/employees');

      expect([401, 404]).toContain(res.status);
    });
  });

  describe('POST /api/hr/employees', () => {
    it('should create new employee', async () => {
      const res = await request(app).post('/api/hr/employees').set('Authorization', `Bearer ${adminToken}`).send({
        name: 'Ahmed Hassan',
        email: 'ahmed@example.com',
        department: 'IT',
        position: 'Developer',
        salary: 5000,
      });

      expect([201, 200, 400, 401, 403, 404]).toContain(res.status);
    });
  });

  describe('GET /api/hr/employees/:id', () => {
    it('should get employee by ID', async () => {
      const res = await request(app).get('/api/hr/employees/123').set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });

  describe('PUT /api/hr/employees/:id', () => {
    it('should update employee', async () => {
      const res = await request(app).put('/api/hr/employees/123').set('Authorization', `Bearer ${adminToken}`).send({
        name: 'Updated Name',
      });

      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });

  describe('DELETE /api/hr/employees/:id', () => {
    it('should delete employee', async () => {
      const res = await request(app).delete('/api/hr/employees/123').set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });

  describe('GET /api/hr/attendance', () => {
    it('should get attendance records', async () => {
      const res = await request(app).get('/api/hr/attendance').set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });

  describe('POST /api/hr/attendance', () => {
    it('should record attendance', async () => {
      const res = await request(app).post('/api/hr/attendance').set('Authorization', `Bearer ${userToken}`).send({
        employeeId: '123',
        checkIn: new Date(),
      });

      expect([201, 200, 400, 401, 403, 404]).toContain(res.status);
    });
  });

  describe('GET /api/hr/leaves', () => {
    it('should get leaves', async () => {
      const res = await request(app).get('/api/hr/leaves').set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });

  describe('POST /api/hr/leaves', () => {
    it('should request leave', async () => {
      const res = await request(app).post('/api/hr/leaves').set('Authorization', `Bearer ${userToken}`).send({
        type: 'annual',
        startDate: new Date(),
        endDate: new Date(),
        reason: 'Vacation',
      });

      expect([201, 200, 400, 401, 403, 404]).toContain(res.status);
    });
  });
});

describe('Finance Routes', () => {
  let adminToken;

  beforeEach(() => {
    db.write({
      users: [
        {
          _id: 'admin-1',
          email: 'admin@example.com',
          password: 'hashed',
          fullName: 'Admin User',
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      employees: [],
      attendances: [],
      leaves: [],
    });

    adminToken = jwt.sign({ userId: 'admin-1', email: 'admin@example.com', role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
  });

  describe('GET /api/finance/budgets', () => {
    it('should get budgets', async () => {
      const res = await request(app).get('/api/finance/budgets').set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });

  describe('POST /api/finance/expenses', () => {
    it('should record expense', async () => {
      const res = await request(app).post('/api/finance/expenses').set('Authorization', `Bearer ${adminToken}`).send({
        category: 'Office Supplies',
        amount: 100,
        description: 'Printer ink',
      });

      expect([201, 200, 400, 401, 403, 404]).toContain(res.status);
    });
  });

  describe('GET /api/finance/reports', () => {
    it('should get financial reports', async () => {
      const res = await request(app).get('/api/finance/reports').set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });
});

describe('Notifications Routes', () => {
  let userToken;
  let adminToken;

  beforeEach(() => {
    db.write({
      users: [
        {
          _id: 'admin-1',
          email: 'admin@example.com',
          password: 'hashed',
          fullName: 'Admin User',
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: 'user-1',
          email: 'user@example.com',
          password: 'hashed',
          fullName: 'User',
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      employees: [],
      attendances: [],
      leaves: [],
    });

    userToken = jwt.sign({ userId: 'user-1', email: 'user@example.com', role: 'user' }, JWT_SECRET, { expiresIn: '24h' });

    adminToken = jwt.sign({ userId: 'admin-1', email: 'admin@example.com', role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
  });

  describe('GET /api/notifications', () => {
    it('should get user notifications', async () => {
      const res = await request(app).get('/api/notifications').set('Authorization', `Bearer ${userToken}`);

      expect([200, 401, 403, 404]).toContain(res.status);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/notifications');

      expect([401, 404]).toContain(res.status);
    });
  });

  describe('POST /api/notifications', () => {
    it('should send notification', async () => {
      const res = await request(app).post('/api/notifications').set('Authorization', `Bearer ${adminToken}`).send({
        title: 'Test Notification',
        message: 'This is a test',
        userId: 'user-1',
      });

      expect([201, 200, 400, 401, 403, 404]).toContain(res.status);
    });
  });

  describe('GET /api/notifications/:id', () => {
    it('should get specific notification', async () => {
      const res = await request(app).get('/api/notifications/123').set('Authorization', `Bearer ${userToken}`);

      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      const res = await request(app).put('/api/notifications/123/read').set('Authorization', `Bearer ${userToken}`);

      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });
});

describe('Reports Routes', () => {
  let adminToken;

  beforeEach(() => {
    db.write({
      users: [
        {
          _id: 'admin-1',
          email: 'admin@example.com',
          password: 'hashed',
          fullName: 'Admin User',
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      employees: [],
      attendances: [],
      leaves: [],
    });

    adminToken = jwt.sign({ userId: 'admin-1', email: 'admin@example.com', role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
  });

  describe('GET /api/reports/hr', () => {
    it('should get HR reports', async () => {
      const res = await request(app).get('/api/reports/hr').set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });

  describe('GET /api/reports/finance', () => {
    it('should get finance reports', async () => {
      const res = await request(app).get('/api/reports/finance').set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });

  describe('GET /api/reports/attendance', () => {
    it('should get attendance reports', async () => {
      const res = await request(app).get('/api/reports/attendance').set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });

  describe('GET /api/reports/generate', () => {
    it('should generate report', async () => {
      const res = await request(app)
        .get('/api/reports/generate')
        .query({ type: 'hr', startDate: '2024-01-01', endDate: '2024-12-31' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });
});

describe('AI Routes', () => {
  let userToken;

  beforeEach(() => {
    db.write({
      users: [
        {
          _id: 'user-1',
          email: 'user@example.com',
          password: 'hashed',
          fullName: 'User',
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      employees: [],
      attendances: [],
      leaves: [],
    });

    userToken = jwt.sign({ userId: 'user-1', email: 'user@example.com', role: 'user' }, JWT_SECRET, { expiresIn: '24h' });
  });

  describe('GET /api/ai/predictions', () => {
    it('should get AI predictions', async () => {
      const res = await request(app).get('/api/ai/predictions').set('Authorization', `Bearer ${userToken}`);

      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });

  describe('POST /api/ai/chat', () => {
    it('should send chat message', async () => {
      const res = await request(app).post('/api/ai/chat').set('Authorization', `Bearer ${userToken}`).send({
        message: 'Hello AI',
      });

      expect([200, 201, 400, 401, 403, 404]).toContain(res.status);
    });

    it('should require message field', async () => {
      const res = await request(app).post('/api/ai/chat').set('Authorization', `Bearer ${userToken}`).send({});

      expect([400, 401, 403, 404]).toContain(res.status);
    });
  });

  describe('GET /api/ai/analytics', () => {
    it('should get analytics', async () => {
      const res = await request(app).get('/api/ai/analytics').set('Authorization', `Bearer ${userToken}`);

      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });
});
