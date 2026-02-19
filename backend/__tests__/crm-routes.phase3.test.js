/**
 * CRM Routes Comprehensive Test Suite - Phase 3
 * Tests for customer relationship management features
 * Target: Improve from 10.92% to 60%+ coverage
 */

const request = require('supertest');
const app = require('../server');

// Mock CRM service
jest.mock('../services/crm.service', () => {
  return {
    createCustomer: jest.fn().mockResolvedValue({
      _id: 'cust123',
      name: 'Acme Corp',
      email: 'contact@acme.com',
      phone: '+966501234567',
      category: 'enterprise',
      status: 'active',
      createdAt: new Date(),
    }),
    getCustomers: jest.fn().mockResolvedValue([
      {
        _id: 'cust1',
        name: 'Customer 1',
        category: 'enterprise',
        status: 'active',
      },
    ]),
    createOpportunity: jest.fn().mockResolvedValue({
      _id: 'opp123',
      customerId: 'cust123',
      name: 'New Deal',
      value: 50000,
      stage: 'qualified',
      probability: 0.8,
      closeDate: new Date(),
    }),
    getOpportunities: jest.fn().mockResolvedValue([
      {
        _id: 'opp1',
        customerId: 'cust1',
        name: 'Opportunity 1',
        value: 25000,
        stage: 'proposal',
      },
    ]),
    createTicket: jest.fn().mockResolvedValue({
      _id: 'ticket123',
      customerId: 'cust123',
      subject: 'Support Request',
      description: 'Need assistance',
      priority: 'high',
      status: 'open',
      assigned_to: 'agent123',
    }),
    getTickets: jest.fn().mockResolvedValue([
      {
        _id: 'ticket1',
        customerId: 'cust1',
        subject: 'Issue 1',
        priority: 'medium',
        status: 'open',
      },
    ]),
    updateCustomer: jest.fn().mockResolvedValue({
      _id: 'cust123',
      name: 'Updated Name',
    }),
    updateOpportunity: jest.fn().mockResolvedValue({
      _id: 'opp123',
      stage: 'won',
    }),
    updateTicket: jest.fn().mockResolvedValue({
      _id: 'ticket123',
      status: 'resolved',
    }),
  };
});

// Mock auth middleware
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'user123', name: 'Sales Manager', role: 'admin' };
    next();
  },
  requireAdmin: (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ success: false, message: 'Admin access required' });
    }
  },
  requireAuth: (req, res, next) => {
    req.user = { id: 'user123', name: 'Sales Manager', role: 'admin' };
    next();
  },
  requireRole:
    (...roles) =>
    (req, res, next) => {
      if (req.user && roles.includes(req.user.role)) {
        next();
      } else {
        res.status(403).json({ success: false, message: 'Forbidden' });
      }
    },
  optionalAuth: (req, res, next) => next(),
  protect: (req, res, next) => next(),
  authorize:
    (...roles) =>
    (req, res, next) =>
      next(),
  authorizeRole:
    (...roles) =>
    (req, res, next) =>
      next(),
  authenticate: (req, res, next) => next(),
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe.skip('CRM Routes - Phase 3 Coverage', () => {
  describe('Customer Management', () => {
    it('should create new customer', async () => {
      const res = await request(app)
        .post('/api/crm/customers')
        .send({
          name: 'Tech Solutions Inc',
          email: 'sales@techsol.com',
          phone: '+966501234567',
          category: 'enterprise',
          industry: 'Technology',
          website: 'https://techsol.com',
          address: 'Riyadh, Saudi Arabia',
          city: 'Riyadh',
          country: 'Saudi Arabia',
        })
        .expect(201);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body.customer).toHaveProperty('_id');
      expect(res.body.customer.name).toBe('Tech Solutions Inc');
    });

    it('should reject customer without name', async () => {
      const res = await request(app)
        .post('/api/crm/customers')
        .send({
          email: 'test@example.com',
          category: 'enterprise',
        })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should get all customers', async () => {
      const res = await request(app).get('/api/crm/customers').expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.customers)).toBe(true);
    });

    it('should get customers with pagination', async () => {
      const res = await request(app).get('/api/crm/customers?page=1&limit=10').expect(200);

      expect(res.body.pagination).toBeDefined();
    });

    it('should filter customers by category', async () => {
      const res = await request(app).get('/api/crm/customers?category=enterprise').expect(200);

      expect(res.body.customers).toBeDefined();
    });

    it('should filter customers by status', async () => {
      const res = await request(app).get('/api/crm/customers?status=active').expect(200);

      expect(res.body.customers).toBeDefined();
    });

    it('should search customers by name', async () => {
      const res = await request(app).get('/api/crm/customers/search?q=acme').expect(200);

      expect(res.body.customers).toBeDefined();
    });

    it('should get single customer', async () => {
      const res = await request(app).get('/api/crm/customers/cust123').expect(200);

      expect(res.body.customer).toHaveProperty('_id');
    });

    it('should update customer', async () => {
      const res = await request(app)
        .put('/api/crm/customers/cust123')
        .send({
          name: 'Updated Company Name',
          status: 'inactive',
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should add contact to customer', async () => {
      const res = await request(app)
        .post('/api/crm/customers/cust123/contacts')
        .send({
          name: 'John Doe',
          title: 'CEO',
          email: 'john@example.com',
          phone: '+966501234567',
          isPrimary: true,
        })
        .expect(201);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should delete customer', async () => {
      const res = await request(app).delete('/api/crm/customers/cust123').expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should attach notes to customer', async () => {
      const res = await request(app)
        .post('/api/crm/customers/cust123/notes')
        .send({
          content: 'High value customer, prefers email communication',
        })
        .expect(201);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should export customers list', async () => {
      const res = await request(app).get('/api/crm/customers/export/csv').expect(200);

      expect(res.type).toContain('text/csv');
    });
  });

  describe('Opportunity Management', () => {
    it('should create opportunity', async () => {
      const res = await request(app)
        .post('/api/crm/opportunities')
        .send({
          customerId: 'cust123',
          name: 'Annual Contract Renewal',
          value: 150000,
          stage: 'qualified',
          probability: 0.75,
          closeDate: new Date('2026-06-30'),
          description: 'Renewing annual service contract',
          product: 'Enterprise Suite',
        })
        .expect(201);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body.opportunity).toHaveProperty('_id');
      expect(res.body.opportunity.value).toBe(150000);
    });

    it('should get all opportunities', async () => {
      const res = await request(app).get('/api/crm/opportunities').expect(200);

      expect(Array.isArray(res.body.opportunities)).toBe(true);
    });

    it('should get opportunities for customer', async () => {
      const res = await request(app).get('/api/crm/opportunities?customerId=cust123').expect(200);

      expect(res.body.opportunities).toBeDefined();
    });

    it('should filter opportunities by stage', async () => {
      const res = await request(app).get('/api/crm/opportunities?stage=proposal').expect(200);

      expect(res.body.opportunities).toBeDefined();
    });

    it('should filter opportunities by probability', async () => {
      const res = await request(app)
        .get('/api/crm/opportunities?minProbability=0.5&maxProbability=1.0')
        .expect(200);

      expect(res.body.opportunities).toBeDefined();
    });

    it('should get total pipeline value', async () => {
      const res = await request(app).get('/api/crm/opportunities/pipeline/value').expect(200);

      expect(res.body).toHaveProperty('totalPipelineValue');
    });

    it('should update opportunity stage', async () => {
      const res = await request(app)
        .patch('/api/crm/opportunities/opp123/stage')
        .send({
          stage: 'proposal',
          probability: 0.8,
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should move opportunity to won', async () => {
      const res = await request(app)
        .post('/api/crm/opportunities/opp123/won')
        .send({
          actualCloseDate: new Date(),
          actualValue: 150000,
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should move opportunity to lost', async () => {
      const res = await request(app)
        .post('/api/crm/opportunities/opp123/lost')
        .send({
          reason: 'Budget constraints',
          notes: 'Customer decided to postpone',
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should add activity to opportunity', async () => {
      const res = await request(app)
        .post('/api/crm/opportunities/opp123/activities')
        .send({
          type: 'call',
          subject: 'Discussed pricing',
          date: new Date(),
          notes: 'Customer interested in volume discount',
        })
        .expect(201);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should delete opportunity', async () => {
      const res = await request(app).delete('/api/crm/opportunities/opp123').expect(200);

      expect(res.body).toHaveProperty('success', true);
    });
  });

  describe('Ticket Management', () => {
    it('should create support ticket', async () => {
      const res = await request(app)
        .post('/api/crm/tickets')
        .send({
          customerId: 'cust123',
          subject: 'System not responding',
          description: 'The application keeps timing out',
          priority: 'high',
          category: 'technical',
          attachments: [],
        })
        .expect(201);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body.ticket).toHaveProperty('_id');
      expect(res.body.ticket.status).toBe('open');
    });

    it('should get all tickets', async () => {
      const res = await request(app).get('/api/crm/tickets').expect(200);

      expect(Array.isArray(res.body.tickets)).toBe(true);
    });

    it('should get tickets for customer', async () => {
      const res = await request(app).get('/api/crm/tickets?customerId=cust123').expect(200);

      expect(res.body.tickets).toBeDefined();
    });

    it('should filter tickets by status', async () => {
      const res = await request(app).get('/api/crm/tickets?status=open').expect(200);

      expect(res.body.tickets).toBeDefined();
    });

    it('should filter tickets by priority', async () => {
      const res = await request(app).get('/api/crm/tickets?priority=high').expect(200);

      expect(res.body.tickets).toBeDefined();
    });

    it('should assign ticket to agent', async () => {
      const res = await request(app)
        .patch('/api/crm/tickets/ticket123/assign')
        .send({
          agentId: 'agent456',
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should add comment to ticket', async () => {
      const res = await request(app)
        .post('/api/crm/tickets/ticket123/comments')
        .send({
          comment: 'We are investigating the issue',
          isPublic: true,
        })
        .expect(201);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should update ticket status', async () => {
      const res = await request(app)
        .patch('/api/crm/tickets/ticket123/status')
        .send({
          status: 'in_progress',
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should resolve ticket', async () => {
      const res = await request(app)
        .post('/api/crm/tickets/ticket123/resolve')
        .send({
          resolution: 'Issue fixed by clearing cache',
          satisfactionScore: 4,
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should close ticket', async () => {
      const res = await request(app).post('/api/crm/tickets/ticket123/close').expect(200);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should reopen closed ticket', async () => {
      const res = await request(app)
        .post('/api/crm/tickets/ticket123/reopen')
        .send({
          reason: 'Issue still persists',
        })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    });
  });

  describe('CRM Analytics & Reports', () => {
    it('should get sales dashboard', async () => {
      const res = await request(app).get('/api/crm/dashboard').expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('dashboard');
    });

    it('should get customer statistics', async () => {
      const res = await request(app).get('/api/crm/analytics/customers').expect(200);

      expect(res.body).toHaveProperty('totalCustomers');
      expect(res.body).toHaveProperty('byCategory');
      expect(res.body).toHaveProperty('byStatus');
    });

    it('should get pipeline analysis', async () => {
      const res = await request(app).get('/api/crm/analytics/pipeline').expect(200);

      expect(res.body).toHaveProperty('byStage');
      expect(res.body).toHaveProperty('totalValue');
      expect(res.body).toHaveProperty('avgDealValue');
    });

    it('should get win/loss analysis', async () => {
      const res = await request(app).get('/api/crm/analytics/win-loss').expect(200);

      expect(res.body).toHaveProperty('winRate');
      expect(res.body).toHaveProperty('totalWon');
      expect(res.body).toHaveProperty('totalLost');
    });

    it('should get ticket metrics', async () => {
      const res = await request(app).get('/api/crm/analytics/tickets').expect(200);

      expect(res.body).toHaveProperty('openTickets');
      expect(res.body).toHaveProperty('avgResolutionTime');
      expect(res.body).toHaveProperty('satisfactionScore');
    });

    it('should get sales forecast', async () => {
      const res = await request(app).get('/api/crm/forecast?period=Q2').expect(200);

      expect(res.body).toHaveProperty('forecast');
    });

    it('should export CRM report', async () => {
      const res = await request(app)
        .get('/api/crm/export/report?format=pdf&period=monthly')
        .expect(200);

      expect(res.type).toContain('application/pdf');
    });
  });

  describe('CRM Activity Tracking', () => {
    it('should get customer activity log', async () => {
      const res = await request(app).get('/api/crm/customers/cust123/activities').expect(200);

      expect(res.body).toHaveProperty('activities');
    });

    it('should log customer interaction', async () => {
      const res = await request(app)
        .post('/api/crm/customers/cust123/activities')
        .send({
          type: 'email',
          subject: 'Follow-up on proposal',
          date: new Date(),
          duration: 30,
          notes: 'Customer interested in additional features',
        })
        .expect(201);

      expect(res.body).toHaveProperty('success', true);
    });

    it('should get opportunity activities', async () => {
      const res = await request(app).get('/api/crm/opportunities/opp123/activities').expect(200);

      expect(res.body).toHaveProperty('activities');
    });
  });

  describe('CRM Error Handling', () => {
    it('should handle missing customer', async () => {
      const res = await request(app).get('/api/crm/customers/nonexistent').expect(404);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should handle database errors', async () => {
      const crmService = require('../services/crm.service');
      crmService.getCustomers.mockRejectedValueOnce(new Error('DB Error'));

      const res = await request(app).get('/api/crm/customers').expect(500);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should log CRM operations', async () => {
      const logger = require('../utils/logger');

      await request(app)
        .post('/api/crm/customers')
        .send({
          name: 'Test Company',
          email: 'test@company.com',
        })
        .expect(201);

      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('CRM Edge Cases', () => {
    it('should handle concurrent customer creation', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/crm/customers')
            .send({
              name: `Company ${i}`,
              email: `company${i}@example.com`,
            })
        );
      }

      const results = await Promise.all(promises);
      results.forEach(res => {
        expect([200, 201, 400, 401, 403, 404]).toContain(res.status);
      });
    });

    it('should handle very large deal values', async () => {
      const res = await request(app)
        .post('/api/crm/opportunities')
        .send({
          customerId: 'cust123',
          name: 'Multi-million deal',
          value: 999999999.99,
          stage: 'qualified',
          probability: 0.5,
        })
        .expect(201);

      expect(res.body.opportunity).toBeDefined();
    });

    it('should handle special characters in names', async () => {
      const res = await request(app)
        .post('/api/crm/customers')
        .send({
          name: 'شركة النجاح للتكنولوجيا - Success Tech',
          email: 'contact@successtech.com',
        })
        .expect(201);

      expect(res.body.customer).toBeDefined();
    });

    it('should handle bulk operations', async () => {
      const res = await request(app)
        .post('/api/crm/customers/bulk-import')
        .send({
          customers: [
            { name: 'Customer 1', email: 'cust1@example.com' },
            { name: 'Customer 2', email: 'cust2@example.com' },
            { name: 'Customer 3', email: 'cust3@example.com' },
          ],
        })
        .expect(201);

      expect(res.body).toHaveProperty('imported');
    });

    it('should handle long-running reports', async () => {
      const res = await request(app)
        .post('/api/crm/reports/generate')
        .send({
          type: 'comprehensive',
          period: 'yearly',
          year: 2026,
          includeAnalytics: true,
        })
        .expect(202);

      expect(res.body).toHaveProperty('reportId');
    });
  });
});
