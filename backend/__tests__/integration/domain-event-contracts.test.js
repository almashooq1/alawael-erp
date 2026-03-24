/**
 * Domain Event Contracts — Tests
 *
 * Tests contract registry, lookup, validation, and statistics.
 */

'use strict';

const {
  HR_EVENTS,
  FINANCE_EVENTS,
  BENEFICIARY_EVENTS,
  MEDICAL_EVENTS,
  ATTENDANCE_EVENTS: _ATTENDANCE_EVENTS,
  NOTIFICATION_EVENTS: _NOTIFICATION_EVENTS,
  SYSTEM_EVENTS: _SYSTEM_EVENTS,
  ALL_CONTRACTS,
  getContract,
  getDomainContracts,
  listAllEventTypes,
  validatePayload,
  getContractStats,
} = require('../../events/contracts/domainEventContracts');

describe('DomainEventContracts', () => {
  // ─── Contract Structure ──────────────────────────────────────────────

  describe('contract structure', () => {
    it('should define 7 domain groups', () => {
      expect(Object.keys(ALL_CONTRACTS)).toEqual(
        expect.arrayContaining([
          'hr',
          'finance',
          'beneficiary',
          'medical',
          'attendance',
          'notification',
          'system',
        ])
      );
    });

    it('should have proper structure for each event contract', () => {
      for (const [domain, contracts] of Object.entries(ALL_CONTRACTS)) {
        for (const [_key, contract] of Object.entries(contracts)) {
          expect(contract).toHaveProperty('domain', domain);
          expect(contract).toHaveProperty('eventType');
          expect(contract).toHaveProperty('version');
          expect(contract).toHaveProperty('description');
          expect(contract).toHaveProperty('payload');
          expect(contract).toHaveProperty('delivery');
          expect(contract).toHaveProperty('priority');
          expect(contract).toHaveProperty('consumers');
          expect(Array.isArray(contract.delivery)).toBe(true);
          expect(Array.isArray(contract.consumers)).toBe(true);
          expect(typeof contract.payload).toBe('object');
        }
      }
    });
  });

  // ─── HR Events ───────────────────────────────────────────────────────

  describe('HR_EVENTS', () => {
    it('should define employee.hired event', () => {
      expect(HR_EVENTS.EMPLOYEE_HIRED).toBeDefined();
      expect(HR_EVENTS.EMPLOYEE_HIRED.eventType).toBe('employee.hired');
      expect(HR_EVENTS.EMPLOYEE_HIRED.payload.employeeId).toBe('string');
    });

    it('should define salary.changed event', () => {
      expect(HR_EVENTS.SALARY_CHANGED).toBeDefined();
      expect(HR_EVENTS.SALARY_CHANGED.priority).toBe('critical');
    });

    it('should have at least 5 HR events', () => {
      expect(Object.keys(HR_EVENTS).length).toBeGreaterThanOrEqual(5);
    });
  });

  // ─── Finance Events ──────────────────────────────────────────────────

  describe('FINANCE_EVENTS', () => {
    it('should define invoice.created event', () => {
      expect(FINANCE_EVENTS.INVOICE_CREATED).toBeDefined();
      expect(FINANCE_EVENTS.INVOICE_CREATED.payload.amount).toBe('number');
    });

    it('should define payment.received event', () => {
      expect(FINANCE_EVENTS.PAYMENT_RECEIVED).toBeDefined();
    });

    it('should have at least 4 Finance events', () => {
      expect(Object.keys(FINANCE_EVENTS).length).toBeGreaterThanOrEqual(4);
    });
  });

  // ─── Beneficiary Events ──────────────────────────────────────────────

  describe('BENEFICIARY_EVENTS', () => {
    it('should define beneficiary.registered event', () => {
      expect(BENEFICIARY_EVENTS.REGISTERED).toBeDefined();
      expect(BENEFICIARY_EVENTS.REGISTERED.eventType).toBe('beneficiary.registered');
    });

    it('should define assessment.completed event', () => {
      expect(BENEFICIARY_EVENTS.ASSESSMENT_COMPLETED).toBeDefined();
    });
  });

  // ─── Medical Events ──────────────────────────────────────────────────

  describe('MEDICAL_EVENTS', () => {
    it('should define therapy session event', () => {
      expect(MEDICAL_EVENTS.THERAPY_SESSION_COMPLETED).toBeDefined();
    });

    it('should define risk alert event as critical priority', () => {
      expect(MEDICAL_EVENTS.RISK_ALERT_RAISED.priority).toBe('critical');
    });
  });

  // ─── getContract ─────────────────────────────────────────────────────

  describe('getContract', () => {
    it('should find a contract by domain and eventType', () => {
      const contract = getContract('hr', 'employee.hired');
      expect(contract).toBeDefined();
      expect(contract.domain).toBe('hr');
      expect(contract.eventType).toBe('employee.hired');
    });

    it('should return null for unknown domain', () => {
      expect(getContract('nonexistent', 'something')).toBeNull();
    });

    it('should return null for unknown eventType', () => {
      expect(getContract('hr', 'nonexistent.event')).toBeNull();
    });
  });

  // ─── getDomainContracts ──────────────────────────────────────────────

  describe('getDomainContracts', () => {
    it('should return all contracts for a domain', () => {
      const contracts = getDomainContracts('hr');
      expect(contracts).toBeDefined();
      expect(Object.keys(contracts).length).toBeGreaterThanOrEqual(5);
    });

    it('should return null for unknown domain', () => {
      expect(getDomainContracts('nonexistent')).toBeNull();
    });
  });

  // ─── listAllEventTypes ───────────────────────────────────────────────

  describe('listAllEventTypes', () => {
    it('should list events across all domains', () => {
      const all = listAllEventTypes();
      expect(all.length).toBeGreaterThanOrEqual(20);
    });

    it('should include domain, eventType, description', () => {
      const all = listAllEventTypes();
      for (const entry of all) {
        expect(entry).toHaveProperty('domain');
        expect(entry).toHaveProperty('eventType');
        expect(entry).toHaveProperty('description');
      }
    });
  });

  // ─── validatePayload ─────────────────────────────────────────────────

  describe('validatePayload', () => {
    it('should validate correct payload', () => {
      const result = validatePayload('hr', 'employee.hired', {
        employeeId: 'emp-1',
        name: 'John',
        department: 'IT',
        position: 'Dev',
        startDate: new Date(),
        contractType: 'full-time',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect type mismatch', () => {
      const result = validatePayload('hr', 'employee.hired', {
        employeeId: 123, // should be string
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return invalid for unknown contract', () => {
      const result = validatePayload('nonexistent', 'event', {});
      expect(result.valid).toBe(false);
    });

    it('should pass with missing optional fields', () => {
      const result = validatePayload('hr', 'employee.hired', {
        employeeId: 'emp-1',
        name: 'John',
        // other fields omitted
      });
      expect(result.valid).toBe(true);
    });
  });

  // ─── getContractStats ────────────────────────────────────────────────

  describe('getContractStats', () => {
    it('should return stats with domain counts', () => {
      const stats = getContractStats();
      expect(stats.domains).toBe(7);
      expect(stats.totalEvents).toBeGreaterThanOrEqual(20);
      expect(stats.perDomain).toBeDefined();
      expect(stats.perDomain.hr).toBeGreaterThanOrEqual(5);
    });
  });
});
