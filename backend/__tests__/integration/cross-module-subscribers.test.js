/**
 * Cross-Module Subscribers — Tests
 *
 * Tests subscriber creation, initialization, and cross-module
 * event flow wiring.
 */

'use strict';

const {
  createSubscribers,
  initializeCrossModuleSubscribers,
} = require('../../integration/crossModuleSubscribers');

const { SystemIntegrationBus } = require('../../integration/systemIntegrationBus');
const { ModuleConnector } = require('../../integration/moduleConnector');

describe('CrossModuleSubscribers', () => {
  let bus;
  let connector;

  beforeEach(() => {
    bus = new SystemIntegrationBus();
    bus.initialize();
    connector = new ModuleConnector();
    connector.initialize({ integrationBus: bus });
  });

  afterEach(() => {
    bus.removeAllListeners();
  });

  // ─── Subscriber Creation ──────────────────────────────────────────────

  describe('createSubscribers', () => {
    it('should create a list of subscriber definitions', () => {
      const subs = createSubscribers(bus, connector);
      expect(Array.isArray(subs)).toBe(true);
      expect(subs.length).toBeGreaterThanOrEqual(10);
    });

    it('should have name, pattern, and handler for each', () => {
      const subs = createSubscribers(bus, connector);
      for (const sub of subs) {
        expect(sub).toHaveProperty('name');
        expect(sub).toHaveProperty('pattern');
        expect(sub).toHaveProperty('handler');
        expect(typeof sub.handler).toBe('function');
      }
    });
  });

  // ─── Initialization ──────────────────────────────────────────────────

  describe('initializeCrossModuleSubscribers', () => {
    it('should register all subscribers with the bus', () => {
      const result = initializeCrossModuleSubscribers(bus, connector);
      expect(result.subscriberCount).toBeGreaterThanOrEqual(10);
      expect(result.subscribers.length).toEqual(result.subscriberCount);
    });

    it('should return subscriber details', () => {
      const result = initializeCrossModuleSubscribers(bus, connector);
      for (const sub of result.subscribers) {
        expect(sub).toHaveProperty('name');
        expect(sub).toHaveProperty('pattern');
      }
    });

    it('should handle null integration bus gracefully', () => {
      const result = initializeCrossModuleSubscribers(null, connector);
      expect(result.subscriberCount).toBe(0);
    });
  });

  // ─── Event Flow: HR → Finance (settlement on termination) ────────────

  describe('HR → Finance settlement flow', () => {
    it('should publish finance.settlement.requested when employee terminated', async () => {
      const settlementHandler = jest.fn();
      initializeCrossModuleSubscribers(bus, connector);

      // Subscribe to the downstream event
      bus.subscribe('finance.settlement.requested', settlementHandler);

      // Publish the trigger event
      await bus.publish(
        'hr',
        'employee.terminated',
        {
          employeeId: 'emp-1',
          reason: 'resignation',
          effectiveDate: '2025-01-01',
          settlementAmount: 50000,
        },
        {
          metadata: { correlationId: 'test-corr-1' },
        }
      );

      // Wait for async propagation
      await new Promise(r => { setTimeout(r, 50); });

      expect(settlementHandler).toHaveBeenCalledTimes(1);
      expect(settlementHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            employeeId: 'emp-1',
            settlementAmount: 50000,
          }),
        })
      );
    });
  });

  // ─── Event Flow: Finance → Dashboard (payment KPI) ───────────────────

  describe('Finance → Dashboard KPI flow', () => {
    it('should publish dashboard.kpi.update when payment received', async () => {
      const kpiHandler = jest.fn();
      initializeCrossModuleSubscribers(bus, connector);

      bus.subscribe('dashboard.kpi.update', kpiHandler);

      await bus.publish('finance', 'payment.received', {
        paymentId: 'pay-1',
        invoiceId: 'inv-1',
        amount: 5000,
        method: 'bank_transfer',
      });

      await new Promise(r => { setTimeout(r, 50); });

      expect(kpiHandler).toHaveBeenCalledTimes(1);
      expect(kpiHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            module: 'finance',
            metric: 'payment_received',
            value: 5000,
          }),
        })
      );
    });
  });

  // ─── Event Flow: Attendance → HR (absence flagging) ──────────────────

  describe('Attendance → HR absence flow', () => {
    it('should publish hr.absence.flagged when absence detected', async () => {
      const flagHandler = jest.fn();
      initializeCrossModuleSubscribers(bus, connector);

      bus.subscribe('hr.absence.flagged', flagHandler);

      await bus.publish('attendance', 'absence.detected', {
        employeeId: 'emp-5',
        date: '2025-01-15',
        type: 'unexcused',
      });

      await new Promise(r => { setTimeout(r, 50); });

      expect(flagHandler).toHaveBeenCalledTimes(1);
      expect(flagHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            employeeId: 'emp-5',
            type: 'unexcused',
          }),
        })
      );
    });
  });

  // ─── Event Flow: System → Security (permission denied) ───────────────

  describe('System → Security alert flow', () => {
    it('should publish system.security.alert on permission denied', async () => {
      const alertHandler = jest.fn();
      initializeCrossModuleSubscribers(bus, connector);

      bus.subscribe('system.security.alert', alertHandler);

      await bus.publish('system', 'auth.permission_denied', {
        userId: 'user-1',
        resource: '/admin/settings',
        action: 'DELETE',
        ip: '192.168.1.1',
      });

      await new Promise(r => { setTimeout(r, 50); });

      expect(alertHandler).toHaveBeenCalledTimes(1);
      expect(alertHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            type: 'permission_denied',
            userId: 'user-1',
          }),
        })
      );
    });
  });

  // ─── Event Flow: HR → Finance (salary change budget impact) ──────────

  describe('HR → Finance salary budget impact', () => {
    it('should publish finance.salary.budget_impact on salary change', async () => {
      const budgetHandler = jest.fn();
      initializeCrossModuleSubscribers(bus, connector);

      bus.subscribe('finance.salary.budget_impact', budgetHandler);

      await bus.publish('hr', 'salary.changed', {
        employeeId: 'emp-2',
        oldSalary: 8000,
        newSalary: 10000,
        effectiveDate: '2025-02-01',
        reason: 'promotion',
      });

      await new Promise(r => { setTimeout(r, 50); });

      expect(budgetHandler).toHaveBeenCalledTimes(1);
      expect(budgetHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            employeeId: 'emp-2',
            monthlyDelta: 2000,
          }),
        })
      );
    });
  });

  // ─── Event Flow: Finance → Audit (invoice audit trail) ───────────────

  describe('Finance → Audit trail', () => {
    it('should publish system.audit.entry when invoice created', async () => {
      const auditHandler = jest.fn();
      initializeCrossModuleSubscribers(bus, connector);

      bus.subscribe('system.audit.entry', auditHandler);

      await bus.publish('finance', 'invoice.created', {
        invoiceId: 'inv-100',
        beneficiaryId: 'ben-5',
        amount: 15000,
        currency: 'SAR',
      });

      await new Promise(r => { setTimeout(r, 50); });

      expect(auditHandler).toHaveBeenCalledTimes(1);
      expect(auditHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            action: 'invoice.created',
            entityType: 'invoice',
            entityId: 'inv-100',
          }),
        })
      );
    });
  });

  // ─── Event Flow: Medical → Dashboard (therapy KPI) ───────────────────

  describe('Medical → Dashboard therapy KPI', () => {
    it('should publish dashboard.kpi.update on therapy session', async () => {
      const kpiHandler = jest.fn();
      initializeCrossModuleSubscribers(bus, connector);

      bus.subscribe('dashboard.kpi.update', kpiHandler);

      await bus.publish('medical', 'therapy.session_completed', {
        sessionId: 'sess-1',
        beneficiaryId: 'ben-10',
        therapistId: 'ther-1',
        sessionType: 'occupational',
        duration: 45,
        outcome: 'good',
      });

      await new Promise(r => { setTimeout(r, 50); });

      expect(kpiHandler).toHaveBeenCalledTimes(1);
      expect(kpiHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            module: 'medical',
            metric: 'therapy_sessions',
          }),
        })
      );
    });
  });

  // ─── Event Flow: Beneficiary → Dashboard (assessment KPI) ────────────

  describe('Beneficiary → Dashboard assessment KPI', () => {
    it('should publish dashboard.kpi.update on assessment completed', async () => {
      const kpiHandler = jest.fn();
      initializeCrossModuleSubscribers(bus, connector);

      bus.subscribe('dashboard.kpi.update', kpiHandler);

      await bus.publish('beneficiary', 'assessment.completed', {
        beneficiaryId: 'ben-20',
        assessmentId: 'asmt-1',
        assessmentType: 'disability',
        overallScore: 85,
        assessor: 'Dr. Smith',
      });

      await new Promise(r => { setTimeout(r, 50); });

      expect(kpiHandler).toHaveBeenCalledTimes(1);
      expect(kpiHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            module: 'beneficiary',
            metric: 'assessments_completed',
          }),
        })
      );
    });
  });
});
