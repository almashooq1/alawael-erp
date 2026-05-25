'use strict';

/**
 * W404 — additions to the W394 modelEventBridge.
 *
 * Verifies the 3 new mappings closing the last LIVE-registry baseline
 * entries:
 *   - Prescription → medical.prescription.issued (create-only)
 *   - RiskSnapshot → medical.risk.alert_raised (predicate-gated; emits
 *       only on tierDelta='escalated' or first-snapshot landing in
 *       high/critical)
 *   - PayrollPeriod → finance.payroll.processed (status-flip to 'closed')
 *
 * Pairs with W382 ratchet (KNOWN_DEAD_CONTRACTS 3 → 0) and W392 ratchet
 * (KNOWN_LIVE_ORPHAN_SUBSCRIBERS 1 → 0).
 */

const { MAPPINGS } = require('../integration/modelEventBridge');

function findMapping(modelName, eventType) {
  return MAPPINGS.find(m => m.modelName === modelName && m.eventType === eventType);
}

describe('W404 — new LIVE-registry mappings', () => {
  describe('Prescription → medical.prescription.issued', () => {
    const mapping = findMapping('Prescription', 'prescription.issued');

    it('is registered with create-only trigger', () => {
      expect(mapping).toBeDefined();
      expect(mapping.domain).toBe('medical');
      expect(mapping.trigger).toBe('create-only');
    });

    it('payload extracts prescriptionId, beneficiaryId, doctorId, medications[]', () => {
      const doc = {
        _id: 'rx1',
        beneficiary: 'b1',
        prescriber: 'd1',
        items: [
          { medication: 'm1', medicationName: 'Paracetamol', dose: '500mg', frequency: 'TID' },
          { medication: 'm2', medicationName: 'Ibuprofen', dose: '200mg', frequency: 'BID' },
        ],
      };
      const p = mapping.payload(doc);
      expect(p.prescriptionId).toBe('rx1');
      expect(p.beneficiaryId).toBe('b1');
      expect(p.doctorId).toBe('d1');
      expect(p.medications).toHaveLength(2);
      expect(p.medications[0]).toEqual({
        medicationId: 'm1',
        name: 'Paracetamol',
        dose: '500mg',
        frequency: 'TID',
        duration: '',
      });
    });

    it('payload tolerates missing items array', () => {
      const p = mapping.payload({ _id: 'rx2', beneficiary: 'b2', prescriber: 'd2' });
      expect(p.medications).toEqual([]);
    });
  });

  describe('RiskSnapshot → medical.risk.alert_raised', () => {
    const mapping = findMapping('RiskSnapshot', 'risk.alert_raised');

    it('is registered with create-only trigger + predicate', () => {
      expect(mapping).toBeDefined();
      expect(mapping.domain).toBe('medical');
      expect(mapping.trigger).toBe('create-only');
      expect(typeof mapping.predicate).toBe('function');
    });

    it('predicate true on tierDelta=escalated regardless of tier', () => {
      expect(mapping.predicate({ tierDelta: 'escalated', overallTier: 'low' })).toBe(true);
      expect(mapping.predicate({ tierDelta: 'escalated', overallTier: 'moderate' })).toBe(true);
      expect(mapping.predicate({ tierDelta: 'escalated', overallTier: 'critical' })).toBe(true);
    });

    it('predicate true on first-snapshot only when tier is high/critical', () => {
      expect(mapping.predicate({ tierDelta: 'first', overallTier: 'high' })).toBe(true);
      expect(mapping.predicate({ tierDelta: 'first', overallTier: 'critical' })).toBe(true);
      expect(mapping.predicate({ tierDelta: 'first', overallTier: 'moderate' })).toBe(false);
      expect(mapping.predicate({ tierDelta: 'first', overallTier: 'low' })).toBe(false);
    });

    it('predicate false on routine recompute (unchanged/deescalated)', () => {
      expect(mapping.predicate({ tierDelta: 'unchanged', overallTier: 'critical' })).toBe(false);
      expect(mapping.predicate({ tierDelta: 'deescalated', overallTier: 'high' })).toBe(false);
    });

    it('payload extracts beneficiaryId, riskLevel, riskType, details, raisedBy', () => {
      const doc = {
        beneficiaryId: 'b1',
        overallTier: 'critical',
        reason: 'fall_risk_elevated',
        explanation: '3 falls last 30 days',
      };
      const p = mapping.payload(doc);
      expect(p).toEqual({
        beneficiaryId: 'b1',
        riskLevel: 'critical',
        riskType: 'fall_risk_elevated',
        details: '3 falls last 30 days',
        raisedBy: 'risk_profile_sweeper',
      });
    });
  });

  describe('PayrollPeriod → finance.payroll.processed', () => {
    const mapping = findMapping('PayrollPeriod', 'payroll.processed');

    it('is registered with status-flip to "closed"', () => {
      expect(mapping).toBeDefined();
      expect(mapping.domain).toBe('finance');
      expect(mapping.trigger).toBe('status-flip');
      expect(mapping.flipField).toBe('status');
      expect(mapping.flipTo).toEqual(['closed']);
    });

    it('payload extracts payrollId, period, employeeCount, processedAt', () => {
      const closedAt = new Date('2026-05-31T20:00:00.000Z');
      const doc = {
        _id: 'pp1',
        periodCode: '2026-05',
        casesCounted: 42,
        closedAt,
      };
      const p = mapping.payload(doc);
      expect(p).toEqual({
        payrollId: 'pp1',
        period: '2026-05',
        totalAmount: 0,
        employeeCount: 42,
        processedAt: closedAt,
      });
    });

    it('payload fills sensible defaults when fields missing', () => {
      const p = mapping.payload({ _id: 'pp2' });
      expect(p.period).toBe('');
      expect(p.employeeCount).toBe(0);
      expect(p.totalAmount).toBe(0);
      expect(p.processedAt).toBeInstanceOf(Date);
    });
  });

  it('MAPPINGS now contains 17+ entries (post W404 additions)', () => {
    expect(MAPPINGS.length).toBeGreaterThanOrEqual(17);
  });
});
