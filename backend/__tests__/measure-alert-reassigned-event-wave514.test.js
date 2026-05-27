'use strict';

/**
 * measure-alert-reassigned-event-wave514.test.js — Wave 514.
 *
 * Static drift guard for the W514 event contract + ACL grants. Static
 * analysis only — pure shape verification of the LIVE registry +
 * ACL registry. The dynamic emit (W512 applyMove route → integrationBus.publish)
 * is exercised by the W512 drift guard which loads the same route.
 *
 * Three artefacts must move in lockstep:
 *   1. domainEventContracts.MEDICAL_EVENTS.MEASURE_ALERT_REASSIGNED
 *      with the canonical envelope shape + REALTIME delivery.
 *   2. ACL grants for the new topic on admin / manager / supervisor /
 *      therapist + medical-domain clinical roles via 'medical.*'.
 *   3. routes/caseload-rebalance.routes.js references the event name
 *      in its publish call site (source-text sentinel).
 */

const path = require('path');
const fs = require('fs');

describe('W514 — measure_alert.reassigned event contract + ACL', () => {
  // ════════════════════════════════════════════════════════════════════
  // 1. Event contract
  // ════════════════════════════════════════════════════════════════════

  describe('domainEventContracts.MEDICAL_EVENTS.MEASURE_ALERT_REASSIGNED', () => {
    const { MEDICAL_EVENTS, getContract } = require('../events/contracts/domainEventContracts');

    it('exists with the canonical envelope shape', () => {
      expect(MEDICAL_EVENTS.MEASURE_ALERT_REASSIGNED).toBeDefined();
      const c = MEDICAL_EVENTS.MEASURE_ALERT_REASSIGNED;
      expect(c.domain).toBe('medical');
      expect(c.eventType).toBe('measure_alert.reassigned');
      expect(c.version).toBe(1);
      expect(typeof c.description).toBe('string');
      expect(c.payload).toBeDefined();
      expect(Array.isArray(c.delivery)).toBe(true);
      expect(typeof c.priority).toBe('string');
      expect(Array.isArray(c.consumers)).toBe(true);
      expect(c.consumers.length).toBeGreaterThan(0);
    });

    it('declares REALTIME delivery (otherwise the SSE bridge skips it)', () => {
      const c = MEDICAL_EVENTS.MEASURE_ALERT_REASSIGNED;
      const includesRealtime = c.delivery.some(d => /realtime/i.test(String(d)));
      expect(includesRealtime).toBe(true);
    });

    it('payload schema covers every documented field', () => {
      const c = MEDICAL_EVENTS.MEASURE_ALERT_REASSIGNED;
      const requiredKeys = [
        'alertId',
        'beneficiaryId',
        'branchId',
        'fromTherapistId',
        'toTherapistId',
        'actorId',
        'reason',
        'alertType',
        'severity',
      ];
      for (const k of requiredKeys) {
        expect(c.payload).toHaveProperty(k);
      }
    });

    it('is resolvable via getContract("medical", "measure_alert.reassigned")', () => {
      const c = getContract('medical', 'measure_alert.reassigned');
      expect(c).not.toBeNull();
      expect(c.eventType).toBe('measure_alert.reassigned');
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // 2. ACL grants
  // ════════════════════════════════════════════════════════════════════

  describe('realtime-topic-acl.registry topic grants', () => {
    const aclModule = require('../intelligence/realtime-topic-acl.registry');
    const acl =
      aclModule.ROLE_TOPIC_ALLOWLIST || aclModule.default?.ROLE_TOPIC_ALLOWLIST || aclModule;

    function roleAllows(role, topic) {
      const grants = acl[role];
      if (!grants || !Array.isArray(grants)) return false;
      if (grants.includes('*')) return true;
      if (grants.includes(topic)) return true;
      return grants.some(g => {
        if (!g.endsWith('.*')) return false;
        const prefix = g.slice(0, -2);
        return topic === prefix || topic.startsWith(prefix + '.');
      });
    }

    const T = 'medical.measure_alert.reassigned';

    it.each(['super_admin', 'head_office_admin', 'admin', 'manager', 'supervisor'])(
      '%s can subscribe to medical.measure_alert.reassigned',
      role => {
        expect(roleAllows(role, T)).toBe(true);
      }
    );

    it.each(['doctor', 'nurse', 'nursing_supervisor', 'head_nurse'])(
      '%s (clinical role) inherits via medical.*',
      role => {
        expect(roleAllows(role, T)).toBe(true);
      }
    );

    it('therapist receives this single topic (recipient of reassignment)', () => {
      expect(roleAllows('therapist', T)).toBe(true);
    });

    it('therapist is NOT given the broader medical.* — only the reassigned topic', () => {
      // Therapist sees reassignments + own caseload-relevant events but not
      // the supervisor-side measure_alert.raised firehose.
      expect(roleAllows('therapist', 'medical.measure_alert.raised')).toBe(false);
      expect(roleAllows('therapist', 'medical.risk.alert_raised')).toBe(false);
    });

    it('hr role is NOT granted (non-clinical)', () => {
      expect(roleAllows('hr', T)).toBe(false);
    });

    it('data_entry / viewer / guest get nothing', () => {
      expect(roleAllows('data_entry', T)).toBe(false);
      expect(roleAllows('viewer', T)).toBe(false);
      expect(roleAllows('guest', T)).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // 3. Producer wiring (source-text sentinel)
  // ════════════════════════════════════════════════════════════════════

  describe('caseload-rebalance.routes.js producer wiring', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '..', 'routes', 'caseload-rebalance.routes.js'),
      'utf8'
    );

    it('publishes medical.measure_alert.reassigned after successful applyMove', () => {
      // Sentinel: route must reference the canonical eventType string.
      expect(src).toContain("'measure_alert.reassigned'");
    });

    it('emit is gated on result.action === "applied" (no fire on skip paths)', () => {
      // The emit block lives inside the `if (result.action === 'applied')`
      // branch — verify the literal flow by source-text check.
      const appliedBranchIdx = src.indexOf("result.action === 'applied'");
      const emitIdx = src.indexOf("'measure_alert.reassigned'");
      expect(appliedBranchIdx).toBeGreaterThan(-1);
      expect(emitIdx).toBeGreaterThan(appliedBranchIdx);
    });

    it('emit is wrapped in try/catch (fire-and-forget — never breaks request)', () => {
      // The publish call must be inside a try block AND chained with
      // .catch so promise rejections also stay silent. Both required.
      expect(src).toMatch(/try\s*\{[\s\S]*measure_alert\.reassigned/);
      expect(src).toMatch(/measure_alert\.reassigned[\s\S]*\.catch\(/);
    });
  });
});
