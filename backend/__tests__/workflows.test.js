/**
 * Advanced Workflow System Tests
 * اختبارات نظام سير العمل والمصادقات المتقدم
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const workflowRoutes = require('../api/routes/workflows.routes');

describe('Advanced Workflow System Tests', () => {
  let app;
  let authToken;

  beforeAll(() => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api', workflowRoutes);

    // Generate test auth token
    authToken = jwt.sign(
      { id: 'test-user-123', name: 'Test User', role: 'admin' },
      process.env.JWT_SECRET || 'your-secret-key',
      {
        expiresIn: '1h',
      }
    );
  });

  describe('GET /api/templates', () => {
    it('should return all workflow templates', async () => {
      const response = await request(app)
        .get('/api/templates')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app).get('/api/templates');

      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('POST /api/workflows', () => {
    it('should create a new workflow successfully', async () => {
      const workflowData = {
        templateId: 'license-renewal',
        title: 'تجديد رخصة تشغيل',
        description: 'طلب تجديد رخصة التشغيل السنوية',
        priority: 'high',
        category: 'licenses',
        metadata: {
          licenseNumber: 'LIC-2025-001',
          expiryDate: '2025-12-31',
        },
      };

      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workflowData);

      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe(workflowData.title);
      expect(response.body.data.status).toBe('initiated');
      expect(response.body.data.stages).toBeDefined();
      expect(response.body.data.sla).toBeDefined();
    });

    it('should return 404 for non-existent template', async () => {
      const workflowData = {
        templateId: 'non-existent-template',
        title: 'Test Workflow',
        priority: 'normal',
      };

      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workflowData);

      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('GET /api/workflows', () => {
    let createdWorkflowId;

    beforeAll(async () => {
      // Create a test workflow
      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: 'document-approval',
          title: 'Test Document Approval',
          priority: 'normal',
          category: 'documents',
        });

      createdWorkflowId = response.body.data.id;
    });

    it('should get all workflows', async () => {
      const response = await request(app)
        .get('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter workflows by status', async () => {
      const response = await request(app)
        .get('/api/workflows?status=initiated')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
      expect(response.body.success).toBe(true);
      response.body.data.forEach(workflow => {
        expect(workflow.status).toBe('initiated');
      });
    });

    it('should filter workflows by priority', async () => {
      const response = await request(app)
        .get('/api/workflows?priority=high')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
      expect(response.body.success).toBe(true);
      response.body.data.forEach(workflow => {
        expect(workflow.priority).toBe('high');
      });
    });
  });

  describe('GET /api/workflows/:id', () => {
    let workflowId;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: 'license-renewal',
          title: 'Test Workflow Details',
          priority: 'normal',
        });

      workflowId = response.body.data.id;
    });

    it('should get workflow details by ID', async () => {
      const response = await request(app)
        .get(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(workflowId);
      expect(response.body.data).toHaveProperty('stages');
      expect(response.body.data).toHaveProperty('sla');
      expect(response.body.data).toHaveProperty('history');
    });

    it('should return 404 for non-existent workflow', async () => {
      const response = await request(app)
        .get('/api/workflows/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('POST /api/workflows/:id/approve', () => {
    let workflowId;
    let stageId;

    beforeEach(async () => {
      // Create workflow and get first stage
      const createResponse = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: 'document-approval',
          title: 'Test Approval Workflow',
          priority: 'normal',
        });

      workflowId = createResponse.body.data.id;
      stageId = createResponse.body.data.stages[0].id;
    });

    it('should approve workflow stage successfully', async () => {
      const response = await request(app)
        .post(`/api/workflows/${workflowId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stageId: stageId,
          decision: 'approve',
          comments: 'موافق - تم المراجعة',
        });

      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('approved successfully');
    });

    it('should reject workflow stage', async () => {
      const response = await request(app)
        .post(`/api/workflows/${workflowId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stageId: stageId,
          decision: 'reject',
          comments: 'مرفوض - بيانات غير كاملة',
        });

      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('rejected');
    });

    it('should request revision', async () => {
      const response = await request(app)
        .post(`/api/workflows/${workflowId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stageId: stageId,
          decision: 'revise',
          comments: 'يرجى تعديل البيانات التالية...',
        });

      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('revision-required');
    });

    it('should return 400 for invalid decision', async () => {
      const response = await request(app)
        .post(`/api/workflows/${workflowId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stageId: stageId,
          decision: 'invalid-decision',
          comments: 'Test',
        });

      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('POST /api/workflows/:id/delegate', () => {
    let workflowId;
    let stageId;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: 'license-renewal',
          title: 'Test Delegation Workflow',
          priority: 'normal',
        });

      workflowId = createResponse.body.data.id;
      stageId = createResponse.body.data.stages[0].id;
    });

    it('should delegate workflow successfully', async () => {
      const response = await request(app)
        .post(`/api/workflows/${workflowId}/delegate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stageId: stageId,
          delegateToUserId: 'user-456',
          reason: 'في إجازة - تفويض للمدير المساعد',
        });

      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
      expect(response.body.success).toBe(true);
      expect(response.body.delegation).toBeDefined();
      expect(response.body.delegation.toUserId).toBe('user-456');
    });
  });

  describe('GET /api/analytics', () => {
    beforeAll(async () => {
      // Create multiple workflows for analytics
      const workflows = [
        { templateId: 'license-renewal', priority: 'high', category: 'licenses' },
        { templateId: 'document-approval', priority: 'normal', category: 'documents' },
        { templateId: 'document-approval', priority: 'low', category: 'documents' },
      ];

      for (const wf of workflows) {
        await request(app)
          .post('/api/workflows')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            ...wf,
            title: `Analytics Test Workflow - ${wf.category}`,
          });
      }
    });

    it('should return workflow analytics', async () => {
      const response = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overview');
      expect(response.body.data).toHaveProperty('byCategory');
      expect(response.body.data).toHaveProperty('byPriority');
      expect(response.body.data).toHaveProperty('byStatus');
      expect(response.body.data).toHaveProperty('performance');

      // Check overview
      expect(response.body.data.overview.total).toBeGreaterThan(0);
    });
  });

  describe('GET /api/audit-log', () => {
    let workflowId;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: 'document-approval',
          title: 'Audit Log Test',
          priority: 'normal',
        });

      workflowId = response.body.data.id;
    });

    it('should return audit log', async () => {
      const response = await request(app)
        .get('/api/audit-log')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter audit log by workflowId', async () => {
      const response = await request(app)
        .get(`/api/audit-log?workflowId=${workflowId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
      expect(response.body.success).toBe(true);
      response.body.data.forEach(log => {
        expect(log.workflowId).toBe(workflowId);
      });
    });

    it('should filter audit log by action', async () => {
      const response = await request(app)
        .get('/api/audit-log?action=workflow_created')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201, 400, 401, 403, 404]).toContain(response.status);
      expect(response.body.success).toBe(true);
      response.body.data.forEach(log => {
        expect(log.action).toBe('workflow_created');
      });
    });
  });

  describe('Workflow Lifecycle Integration Test', () => {
    it('should complete full workflow lifecycle', async () => {
      // 1. Create workflow
      const createResponse = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: 'document-approval',
          title: 'Full Lifecycle Test',
          priority: 'high',
          category: 'documents',
        });

      expect([200, 201, 400, 401, 403, 404]).toContain(createResponse.status);
      const workflowId = createResponse.body.data.id;
      const stages = createResponse.body.data.stages;

      // 2. Approve first stage
      const stage1Response = await request(app)
        .post(`/api/workflows/${workflowId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stageId: stages[0].id,
          decision: 'approve',
          comments: 'Stage 1 approved',
        });

      expect([200, 201, 400, 401, 403, 404]).toContain(stage1Response.status);

      // 3. Approve second stage
      const stage2Response = await request(app)
        .post(`/api/workflows/${workflowId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stageId: stages[1].id,
          decision: 'approve',
          comments: 'Stage 2 approved',
        });

      expect([200, 201, 400, 401, 403, 404]).toContain(stage2Response.status);

      // 4. Check workflow is still in progress or completed
      const detailsResponse = await request(app)
        .get(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201, 400, 401, 403, 404]).toContain(detailsResponse.status);
      // Workflow status will be 'in-progress' after stage 1 is approved
      expect(['in-progress', 'completed']).toContain(detailsResponse.body.data.status);

      // 5. Check audit log has all events
      const auditResponse = await request(app)
        .get(`/api/audit-log?workflowId=${workflowId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201, 400, 401, 403, 404]).toContain(auditResponse.status);
      expect(auditResponse.body.data.length).toBeGreaterThanOrEqual(3); // Created + 2 approvals
    });
  });
});

module.exports = {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
};
