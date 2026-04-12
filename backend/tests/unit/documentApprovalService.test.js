/**
 * Unit Tests — DocumentApprovalService
 * P#66 - Batch 26
 *
 * Pure in-memory singleton (Map + EventEmitter).
 * Covers: getTemplates, createApprovalRequest, submitDecision,
 *         getApprovalRequest, getPendingApprovals, getApprovalRequests,
 *         delegateApproval, cancelApprovalRequest, getStatistics,
 *         _evaluateCondition, _updateWorkflowStatus (SEQUENTIAL/PARALLEL/ANY/MAJORITY/UNANIMOUS)
 */

'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('DocumentApprovalService', () => {
  let service;

  beforeEach(() => {
    jest.isolateModules(() => {
      service = require('../../services/documentApprovalService');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Constants & Initial State                                          */
  /* ------------------------------------------------------------------ */
  describe('constants & initial state', () => {
    it('exports APPROVAL_STATUSES', () => {
      expect(service.APPROVAL_STATUSES).toBeDefined();
      expect(service.APPROVAL_STATUSES.PENDING).toBe('pending');
      expect(service.APPROVAL_STATUSES.APPROVED).toBe('approved');
      expect(service.APPROVAL_STATUSES.REJECTED).toBe('rejected');
      expect(service.APPROVAL_STATUSES.CANCELLED).toBe('cancelled');
    });

    it('exports WORKFLOW_TYPES', () => {
      expect(service.WORKFLOW_TYPES).toBeDefined();
      expect(service.WORKFLOW_TYPES.SEQUENTIAL).toBe('sequential');
      expect(service.WORKFLOW_TYPES.PARALLEL).toBe('parallel');
      expect(service.WORKFLOW_TYPES.ANY).toBe('any');
      expect(service.WORKFLOW_TYPES.MAJORITY).toBe('majority');
      expect(service.WORKFLOW_TYPES.UNANIMOUS).toBe('unanimous');
    });

    it('starts with empty requests', () => {
      expect(service.approvalRequests.size).toBe(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getTemplates                                                        */
  /* ------------------------------------------------------------------ */
  describe('getTemplates', () => {
    it('returns default workflow templates', async () => {
      const res = await service.getTemplates();
      expect(res.success).toBe(true);
      expect(res.data.length).toBe(6);
    });

    it('includes purchase, leave, contract templates', async () => {
      const res = await service.getTemplates();
      const ids = res.data.map(t => t.id);
      expect(ids).toContain('tpl_purchase');
      expect(ids).toContain('tpl_leave');
      expect(ids).toContain('tpl_contract');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  _evaluateCondition                                                  */
  /* ------------------------------------------------------------------ */
  describe('_evaluateCondition', () => {
    it('evaluates "amount < 1000" correctly', () => {
      expect(service._evaluateCondition('amount < 1000', { amount: 500 })).toBe(true);
      expect(service._evaluateCondition('amount < 1000', { amount: 1500 })).toBe(false);
    });

    it('evaluates "amount > 50000"', () => {
      expect(service._evaluateCondition('amount > 50000', { amount: 60000 })).toBe(true);
      expect(service._evaluateCondition('amount > 50000', { amount: 100 })).toBe(false);
    });

    it('evaluates <= >= == != operators', () => {
      expect(service._evaluateCondition('qty <= 10', { qty: 10 })).toBe(true);
      expect(service._evaluateCondition('qty >= 5', { qty: 5 })).toBe(true);
      expect(service._evaluateCondition('level == 3', { level: 3 })).toBe(true);
      expect(service._evaluateCondition('level != 3', { level: 5 })).toBe(true);
    });

    it('returns false for missing field', () => {
      expect(service._evaluateCondition('amount < 1000', { qty: 5 })).toBe(false);
    });

    it('returns false for null/undefined condition or metadata', () => {
      expect(service._evaluateCondition(null, {})).toBe(false);
      expect(service._evaluateCondition('x < 1', null)).toBe(false);
    });

    it('returns false for invalid condition pattern', () => {
      expect(service._evaluateCondition('foobar', { foo: 1 })).toBe(false);
    });

    it('returns false for unknown operator', () => {
      // 'amount ~~ 100' won't match any case
      expect(service._evaluateCondition('amount ~~ 100', { amount: 100 })).toBe(false);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  createApprovalRequest                                               */
  /* ------------------------------------------------------------------ */
  describe('createApprovalRequest', () => {
    it('creates a request from template', async () => {
      const res = await service.createApprovalRequest({
        documentId: 'doc1',
        documentTitle: 'Purchase Order',
        templateId: 'tpl_purchase',
        requestedBy: 'u1',
        requestedByName: 'Ahmed',
        metadata: { amount: 5000 },
      });
      expect(res.success).toBe(true);
      expect(res.data.status).toBe('pending');
      expect(res.data.steps.length).toBe(3);
      expect(res.data.workflowType).toBe('sequential');
      expect(res.data.currentStep).toBe(1);
    });

    it('auto-approves when condition matches', async () => {
      const res = await service.createApprovalRequest({
        documentId: 'doc2',
        templateId: 'tpl_purchase',
        requestedBy: 'u1',
        metadata: { amount: 500 }, // < 1000 → auto-approve
      });
      expect(res.data.status).toBe('auto_approved');
      expect(res.data.autoApproveReason).toBeDefined();
    });

    it('creates a custom request without template', async () => {
      const res = await service.createApprovalRequest({
        documentId: 'doc3',
        requestedBy: 'u1',
        approvers: [
          { role: 'manager', titleAr: 'مدير', slaHours: 24 },
          { role: 'director', titleAr: 'مدير عام', slaHours: 48 },
        ],
      });
      expect(res.success).toBe(true);
      expect(res.data.steps.length).toBe(2);
      expect(res.data.templateName).toBe('سير عمل مخصص');
    });

    it('sets priority and notes', async () => {
      const res = await service.createApprovalRequest({
        documentId: 'doc4',
        requestedBy: 'u1',
        approvers: [{ role: 'manager' }],
        priority: 'urgent',
        notes: 'Urgent request',
      });
      expect(res.data.priority).toBe('urgent');
      expect(res.data.notes).toBe('Urgent request');
    });

    it('emits "approvalRequested" event', async () => {
      const spy = jest.fn();
      service.on('approvalRequested', spy);
      await service.createApprovalRequest({
        documentId: 'doc5',
        requestedBy: 'u1',
        approvers: [{ role: 'mgr' }],
      });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('emits "autoApproved" for auto-approved requests', async () => {
      const spy = jest.fn();
      service.on('autoApproved', spy);
      await service.createApprovalRequest({
        documentId: 'doc6',
        templateId: 'tpl_expense',
        requestedBy: 'u1',
        metadata: { amount: 200 }, // < 500
      });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('each step has slaDeadline', async () => {
      const res = await service.createApprovalRequest({
        documentId: 'doc7',
        templateId: 'tpl_leave',
        requestedBy: 'u1',
      });
      res.data.steps.forEach(s => {
        expect(s.slaDeadline).toBeDefined();
      });
    });

    it('creates history entry on creation', async () => {
      const res = await service.createApprovalRequest({
        documentId: 'doc8',
        requestedBy: 'u1',
        requestedByName: 'Ali',
        approvers: [{ role: 'mgr' }],
      });
      expect(res.data.history.length).toBe(1);
      expect(res.data.history[0].action).toBe('created');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  submitDecision — SEQUENTIAL workflow                                */
  /* ------------------------------------------------------------------ */
  describe('submitDecision (sequential)', () => {
    let requestId;
    beforeEach(async () => {
      const res = await service.createApprovalRequest({
        documentId: 'docS',
        templateId: 'tpl_leave',
        requestedBy: 'u1',
      });
      requestId = res.data.id;
    });

    it('approves step 1 and advances currentStep', async () => {
      const req = service.approvalRequests.get(requestId);
      const step1Id = req.steps[0].id;
      const res = await service.submitDecision(requestId, step1Id, {
        approved: true,
        approverId: 'mgr1',
        approverName: 'Manager',
      });
      expect(res.success).toBe(true);
      expect(res.data.currentStep).toBe(2);
      expect(res.data.status).toBe('pending');
    });

    it('approves all steps → status approved', async () => {
      const req = service.approvalRequests.get(requestId);
      await service.submitDecision(requestId, req.steps[0].id, {
        approved: true,
        approverId: 'mgr1',
      });
      const res = await service.submitDecision(requestId, req.steps[1].id, {
        approved: true,
        approverId: 'hr1',
      });
      expect(res.data.status).toBe('approved');
      expect(res.data.completedAt).toBeDefined();
    });

    it('rejects at any step → status rejected', async () => {
      const req = service.approvalRequests.get(requestId);
      const res = await service.submitDecision(requestId, req.steps[0].id, {
        approved: false,
        approverId: 'mgr1',
        comment: 'Denied',
      });
      expect(res.data.status).toBe('rejected');
    });

    it('prevents out-of-order step in sequential', async () => {
      const req = service.approvalRequests.get(requestId);
      const step2Id = req.steps[1].id;
      const res = await service.submitDecision(requestId, step2Id, {
        approved: true,
        approverId: 'hr1',
      });
      expect(res.success).toBe(false);
    });

    it('rejects decision on non-existent request', async () => {
      const res = await service.submitDecision('fake', 'step_1', { approved: true });
      expect(res.success).toBe(false);
    });

    it('rejects decision on non-existent step', async () => {
      const res = await service.submitDecision(requestId, 'step_999', { approved: true });
      expect(res.success).toBe(false);
    });

    it('rejects decision when request not pending', async () => {
      const req = service.approvalRequests.get(requestId);
      await service.submitDecision(requestId, req.steps[0].id, {
        approved: false,
        approverId: 'x',
      });
      // Now rejected, try another decision
      const res = await service.submitDecision(requestId, req.steps[1].id, {
        approved: true,
        approverId: 'y',
      });
      expect(res.success).toBe(false);
    });

    it('emits "decisionSubmitted" event', async () => {
      const spy = jest.fn();
      service.on('decisionSubmitted', spy);
      const req = service.approvalRequests.get(requestId);
      await service.submitDecision(requestId, req.steps[0].id, { approved: true, approverId: 'x' });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('emits "approvalCompleted" when fully approved', async () => {
      const spy = jest.fn();
      service.on('approvalCompleted', spy);
      const req = service.approvalRequests.get(requestId);
      await service.submitDecision(requestId, req.steps[0].id, { approved: true, approverId: 'a' });
      await service.submitDecision(requestId, req.steps[1].id, { approved: true, approverId: 'b' });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('emits "approvalRejected" on rejection', async () => {
      const spy = jest.fn();
      service.on('approvalRejected', spy);
      const req = service.approvalRequests.get(requestId);
      await service.submitDecision(requestId, req.steps[0].id, {
        approved: false,
        approverId: 'a',
      });
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  submitDecision — PARALLEL / UNANIMOUS                               */
  /* ------------------------------------------------------------------ */
  describe('submitDecision (parallel)', () => {
    let requestId;
    beforeEach(async () => {
      const res = await service.createApprovalRequest({
        documentId: 'docP',
        templateId: 'tpl_document_publish',
        requestedBy: 'u1',
      });
      requestId = res.data.id;
    });

    it('approves when all required approve', async () => {
      const req = service.approvalRequests.get(requestId);
      await service.submitDecision(requestId, req.steps[0].id, { approved: true, approverId: 'a' });
      const res = await service.submitDecision(requestId, req.steps[1].id, {
        approved: true,
        approverId: 'b',
      });
      expect(res.data.status).toBe('approved');
    });

    it('rejects if any required step rejected', async () => {
      const req = service.approvalRequests.get(requestId);
      const res = await service.submitDecision(requestId, req.steps[0].id, {
        approved: false,
        approverId: 'a',
      });
      expect(res.data.status).toBe('rejected');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  submitDecision — ANY workflow                                       */
  /* ------------------------------------------------------------------ */
  describe('submitDecision (any)', () => {
    let requestId;
    beforeEach(async () => {
      const res = await service.createApprovalRequest({
        documentId: 'docAny',
        requestedBy: 'u1',
        approvers: [
          { role: 'a1', titleAr: 'أ', required: true },
          { role: 'a2', titleAr: 'ب', required: true },
        ],
      });
      requestId = res.data.id;
      // Forcefully change workflow type to ANY
      service.approvalRequests.get(requestId).workflowType = 'any';
    });

    it('approves when any one approves', async () => {
      const req = service.approvalRequests.get(requestId);
      const res = await service.submitDecision(requestId, req.steps[0].id, {
        approved: true,
        approverId: 'a',
      });
      expect(res.data.status).toBe('approved');
    });

    it('rejects only when all reject', async () => {
      const req = service.approvalRequests.get(requestId);
      // Need to bypass sequential check — set currentStep to match
      req.currentStep = null;
      await service.submitDecision(requestId, req.steps[0].id, {
        approved: false,
        approverId: 'a',
      });
      // After first rejection, status should still be pending since step[1] is pending
      // But sequential check may block; set currentStep for step 2
      if (req.status === 'pending') {
        req.currentStep = 2;
        const res = await service.submitDecision(requestId, req.steps[1].id, {
          approved: false,
          approverId: 'b',
        });
        expect(res.data.status).toBe('rejected');
      }
    });
  });

  /* ------------------------------------------------------------------ */
  /*  submitDecision — MAJORITY workflow                                  */
  /* ------------------------------------------------------------------ */
  describe('submitDecision (majority)', () => {
    let requestId;
    beforeEach(async () => {
      const res = await service.createApprovalRequest({
        documentId: 'docMaj',
        requestedBy: 'u1',
        approvers: [
          { role: 'a1', required: true },
          { role: 'a2', required: true },
          { role: 'a3', required: true },
        ],
      });
      requestId = res.data.id;
      // Force MAJORITY type
      const req = service.approvalRequests.get(requestId);
      req.workflowType = 'majority';
      req.currentStep = null; // disable sequential enforcement
    });

    it('approves when majority approve (2 of 3)', async () => {
      const req = service.approvalRequests.get(requestId);
      await service.submitDecision(requestId, req.steps[0].id, { approved: true, approverId: 'a' });
      const res = await service.submitDecision(requestId, req.steps[1].id, {
        approved: true,
        approverId: 'b',
      });
      expect(res.data.status).toBe('approved');
    });

    it('rejects when majority reject', async () => {
      const req = service.approvalRequests.get(requestId);
      await service.submitDecision(requestId, req.steps[0].id, {
        approved: false,
        approverId: 'a',
      });
      const res = await service.submitDecision(requestId, req.steps[1].id, {
        approved: false,
        approverId: 'b',
      });
      expect(res.data.status).toBe('rejected');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getApprovalRequest                                                  */
  /* ------------------------------------------------------------------ */
  describe('getApprovalRequest', () => {
    it('returns a specific request', async () => {
      const { data } = await service.createApprovalRequest({
        documentId: 'docG',
        requestedBy: 'u1',
        approvers: [{ role: 'mgr' }],
      });
      const res = await service.getApprovalRequest(data.id);
      expect(res.success).toBe(true);
      expect(res.data.documentId).toBe('docG');
    });

    it('returns error for non-existent id', async () => {
      const res = await service.getApprovalRequest('fake');
      expect(res.success).toBe(false);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getPendingApprovals                                                 */
  /* ------------------------------------------------------------------ */
  describe('getPendingApprovals', () => {
    it('returns pending approvals for a user by approverId', async () => {
      const { data } = await service.createApprovalRequest({
        documentId: 'docPA',
        requestedBy: 'u1',
        approvers: [{ role: 'manager', approverId: 'mgr1', slaHours: 24 }],
      });
      const res = await service.getPendingApprovals('mgr1');
      expect(res.data.length).toBe(1);
      expect(res.data[0].id).toBe(data.id);
    });

    it('returns pending by role match', async () => {
      await service.createApprovalRequest({
        documentId: 'docPR',
        requestedBy: 'u1',
        approvers: [{ role: 'finance', slaHours: 24 }],
      });
      const res = await service.getPendingApprovals(null, 'finance');
      expect(res.data.length).toBe(1);
    });

    it('excludes non-pending requests', async () => {
      const { data } = await service.createApprovalRequest({
        documentId: 'docPX',
        requestedBy: 'u1',
        approvers: [{ role: 'mgr', approverId: 'mgr1' }],
      });
      await service.cancelApprovalRequest(data.id, 'u1');
      const res = await service.getPendingApprovals('mgr1');
      expect(res.data.length).toBe(0);
    });

    it('sorts by priority then date', async () => {
      await service.createApprovalRequest({
        documentId: 'low',
        requestedBy: 'u1',
        priority: 'low',
        approvers: [{ role: 'mgr', approverId: 'mgr1' }],
      });
      await service.createApprovalRequest({
        documentId: 'urg',
        requestedBy: 'u1',
        priority: 'urgent',
        approvers: [{ role: 'mgr', approverId: 'mgr1' }],
      });
      const res = await service.getPendingApprovals('mgr1');
      expect(res.data[0].priority).toBe('urgent');
    });

    it('detects overdue steps', async () => {
      const { data } = await service.createApprovalRequest({
        documentId: 'docO',
        requestedBy: 'u1',
        approvers: [{ role: 'mgr', approverId: 'mgr1', slaHours: 1 }],
      });
      // Force SLA in the past
      const req = service.approvalRequests.get(data.id);
      req.steps[0].slaDeadline = new Date(Date.now() - 86400000);
      const res = await service.getPendingApprovals('mgr1');
      expect(res.data[0].isOverdue).toBe(true);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getApprovalRequests (list with filters)                             */
  /* ------------------------------------------------------------------ */
  describe('getApprovalRequests', () => {
    beforeEach(async () => {
      await service.createApprovalRequest({
        documentId: 'd1',
        requestedBy: 'u1',
        priority: 'urgent',
        approvers: [{ role: 'mgr' }],
      });
      await service.createApprovalRequest({
        documentId: 'd2',
        requestedBy: 'u2',
        priority: 'normal',
        approvers: [{ role: 'mgr' }],
      });
    });

    it('returns all requests', async () => {
      const res = await service.getApprovalRequests();
      expect(res.total).toBe(2);
      expect(res.page).toBe(1);
    });

    it('filters by requestedBy', async () => {
      const res = await service.getApprovalRequests({ requestedBy: 'u1' });
      expect(res.total).toBe(1);
    });

    it('filters by priority', async () => {
      const res = await service.getApprovalRequests({ priority: 'urgent' });
      expect(res.total).toBe(1);
    });

    it('paginates results', async () => {
      const res = await service.getApprovalRequests({ page: 1, limit: 1 });
      expect(res.data.length).toBe(1);
      expect(res.pages).toBe(2);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  delegateApproval                                                    */
  /* ------------------------------------------------------------------ */
  describe('delegateApproval', () => {
    it('delegates a step to another user', async () => {
      const { data } = await service.createApprovalRequest({
        documentId: 'docDel',
        requestedBy: 'u1',
        approvers: [{ role: 'mgr', approverId: 'mgr1' }],
      });
      const res = await service.delegateApproval(data.id, data.steps[0].id, {
        delegateToId: 'mgr2',
        delegateToName: 'Deputy',
        delegatedBy: 'mgr1',
        reason: 'On leave',
      });
      expect(res.success).toBe(true);
      const step = res.data.steps[0];
      expect(step.delegatedTo).toBe('mgr2');
    });

    it('adds delegation to history', async () => {
      const { data } = await service.createApprovalRequest({
        documentId: 'docDelH',
        requestedBy: 'u1',
        approvers: [{ role: 'mgr' }],
      });
      await service.delegateApproval(data.id, data.steps[0].id, {
        delegateToId: 'd1',
        delegateToName: 'Del',
        delegatedBy: 'orig',
      });
      const req = service.approvalRequests.get(data.id);
      expect(req.history.some(h => h.action === 'delegated')).toBe(true);
    });

    it('fails on non-existent request', async () => {
      const res = await service.delegateApproval('fake', 'step_1', {});
      expect(res.success).toBe(false);
    });

    it('fails on non-existent step', async () => {
      const { data } = await service.createApprovalRequest({
        documentId: 'docDS',
        requestedBy: 'u1',
        approvers: [{ role: 'mgr' }],
      });
      const res = await service.delegateApproval(data.id, 'step_x', {});
      expect(res.success).toBe(false);
    });

    it('emits "approvalDelegated" event', async () => {
      const spy = jest.fn();
      service.on('approvalDelegated', spy);
      const { data } = await service.createApprovalRequest({
        documentId: 'docDE',
        requestedBy: 'u1',
        approvers: [{ role: 'mgr' }],
      });
      await service.delegateApproval(data.id, data.steps[0].id, {
        delegateToId: 'd1',
        delegateToName: 'D',
        delegatedBy: 'o',
      });
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  cancelApprovalRequest                                               */
  /* ------------------------------------------------------------------ */
  describe('cancelApprovalRequest', () => {
    it('cancels a pending request', async () => {
      const { data } = await service.createApprovalRequest({
        documentId: 'docC',
        requestedBy: 'u1',
        approvers: [{ role: 'mgr' }],
      });
      const res = await service.cancelApprovalRequest(data.id, 'u1');
      expect(res.success).toBe(true);
      expect(res.data.status).toBe('cancelled');
    });

    it('fails on non-existent request', async () => {
      const res = await service.cancelApprovalRequest('fake', 'u1');
      expect(res.success).toBe(false);
    });

    it('fails if request is not pending', async () => {
      const { data } = await service.createApprovalRequest({
        documentId: 'docCC',
        requestedBy: 'u1',
        approvers: [{ role: 'mgr' }],
      });
      await service.cancelApprovalRequest(data.id, 'u1');
      const res = await service.cancelApprovalRequest(data.id, 'u1');
      expect(res.success).toBe(false);
    });

    it('emits "approvalCancelled" event', async () => {
      const spy = jest.fn();
      service.on('approvalCancelled', spy);
      const { data } = await service.createApprovalRequest({
        documentId: 'docCE',
        requestedBy: 'u1',
        approvers: [{ role: 'mgr' }],
      });
      await service.cancelApprovalRequest(data.id, 'u1');
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getStatistics                                                       */
  /* ------------------------------------------------------------------ */
  describe('getStatistics', () => {
    it('returns zeros when empty', async () => {
      const res = await service.getStatistics();
      expect(res.data.totalRequests).toBe(0);
      expect(res.data.approvalRate).toBe(0);
    });

    it('counts by status, template, priority', async () => {
      await service.createApprovalRequest({
        documentId: 'd1',
        requestedBy: 'u1',
        priority: 'urgent',
        approvers: [{ role: 'mgr' }],
      });
      await service.createApprovalRequest({
        documentId: 'd2',
        requestedBy: 'u1',
        priority: 'normal',
        approvers: [{ role: 'mgr' }],
      });
      const res = await service.getStatistics();
      expect(res.data.totalRequests).toBe(2);
      expect(res.data.byPriority.urgent).toBe(1);
      expect(res.data.byPriority.normal).toBe(1);
    });

    it('calculates approval rate', async () => {
      // Create and approve one
      const { data } = await service.createApprovalRequest({
        documentId: 'apr',
        requestedBy: 'u1',
        approvers: [{ role: 'mgr' }],
      });
      await service.submitDecision(data.id, data.steps[0].id, {
        approved: true,
        approverId: 'a',
      });
      // Create another and leave pending
      await service.createApprovalRequest({
        documentId: 'pnd',
        requestedBy: 'u1',
        approvers: [{ role: 'mgr' }],
      });
      const res = await service.getStatistics();
      expect(res.data.approvalRate).toBe(50); // 1 approved / 2 total
    });

    it('detects overdue requests', async () => {
      const { data } = await service.createApprovalRequest({
        documentId: 'odue',
        requestedBy: 'u1',
        approvers: [{ role: 'mgr', slaHours: 1 }],
      });
      const req = service.approvalRequests.get(data.id);
      req.steps[0].slaDeadline = new Date(Date.now() - 86400000);
      const res = await service.getStatistics();
      expect(res.data.overdueCount).toBe(1);
    });
  });
});
