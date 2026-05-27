'use strict';

/**
 * measure-alert-realtime-bridge-wave506.test.js — Wave 506 (Phase C).
 *
 * Closes the W479 polling-→-SSE gap for the outcome measure alerts surface.
 * Three artefacts in lock-step:
 *
 *   1. domainEventContracts.MEDICAL_EVENTS.MEASURE_ALERT_RAISED
 *      — canonical contract envelope; subscribers + producers verify
 *      against this shape.
 *
 *   2. modelEventBridge.MAPPINGS contains MeasureAlert → medical.measure_alert.raised
 *      with create-only trigger + correct payload mapping.
 *
 *   3. realtime-topic-acl.registry grants 'medical.measure_alert.raised' to
 *      admin + manager + supervisor explicitly + medical-domain clinical
 *      roles via the existing 'medical.*' prefix.
 *
 * Static analysis only — no Mongoose, no integration test. The W404 wave
 * proved the pattern works in production; this drift guard ensures the
 * three artefacts stay aligned. If a future wave renames the contract
 * or moves it to a different domain, this test fails BEFORE the change
 * lands on main.
 */

const path = require('path');
const fs = require('fs');

describe('W506 — Phase C measure alert realtime wiring', () => {
  // ════════════════════════════════════════════════════════════════════
  // 1. Event contract registered in the LIVE registry
  // ════════════════════════════════════════════════════════════════════

  describe('domainEventContracts.MEDICAL_EVENTS.MEASURE_ALERT_RAISED', () => {
    const { MEDICAL_EVENTS, getContract } = require('../events/contracts/domainEventContracts');

    it('exists with the canonical envelope shape', () => {
      expect(MEDICAL_EVENTS.MEASURE_ALERT_RAISED).toBeDefined();
      const c = MEDICAL_EVENTS.MEASURE_ALERT_RAISED;
      expect(c.domain).toBe('medical');
      expect(c.eventType).toBe('measure_alert.raised');
      expect(c.version).toBe(1);
      expect(typeof c.description).toBe('string');
      expect(c.payload).toBeDefined();
      expect(Array.isArray(c.delivery)).toBe(true);
      expect(c.delivery.length).toBeGreaterThanOrEqual(2);
      expect(typeof c.priority).toBe('string');
      expect(Array.isArray(c.consumers)).toBe(true);
      expect(c.consumers.length).toBeGreaterThan(0);
    });

    it('declares REALTIME delivery (otherwise the SSE bridge skips it)', () => {
      const c = MEDICAL_EVENTS.MEASURE_ALERT_RAISED;
      const includesRealtime = c.delivery.some(d => /realtime/i.test(String(d)));
      expect(includesRealtime).toBe(true);
    });

    it('payload schema covers every field the W394 mapping emits', () => {
      const c = MEDICAL_EVENTS.MEASURE_ALERT_RAISED;
      // Each key listed here corresponds to a field the modelEventBridge
      // mapping below populates. Both lists must move together.
      const requiredKeys = [
        'alertId',
        'beneficiaryId',
        'measureId',
        'measureCode',
        'alertType',
        'severity',
        'branchId',
      ];
      for (const k of requiredKeys) {
        expect(c.payload).toHaveProperty(k);
      }
    });

    it('is resolvable via getContract("medical", "measure_alert.raised")', () => {
      const c = getContract('medical', 'measure_alert.raised');
      expect(c).not.toBeNull();
      expect(c.eventType).toBe('measure_alert.raised');
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // 2. modelEventBridge mapping
  // ════════════════════════════════════════════════════════════════════

  describe('modelEventBridge MeasureAlert → medical.measure_alert.raised', () => {
    const { MAPPINGS } = require('../integration/modelEventBridge');
    const mapping = MAPPINGS.find(
      m => m.modelName === 'MeasureAlert' && m.eventType === 'measure_alert.raised'
    );

    it('is registered with create-only trigger', () => {
      expect(mapping).toBeDefined();
      expect(mapping.domain).toBe('medical');
      expect(mapping.trigger).toBe('create-only');
    });

    it('payload extracts the documented fields from a MeasureAlert doc', () => {
      const doc = {
        _id: 'alert1',
        beneficiaryId: 'b1',
        measureId: 'm1',
        measureCode: 'BERG',
        alertType: 'FORECAST_OFF_TRACK',
        severity: 'critical',
        branchId: 'br1',
      };
      const p = mapping.payload(doc);
      expect(p.alertId).toBe('alert1');
      expect(p.beneficiaryId).toBe('b1');
      expect(p.measureId).toBe('m1');
      expect(p.measureCode).toBe('BERG');
      expect(p.alertType).toBe('FORECAST_OFF_TRACK');
      expect(p.severity).toBe('critical');
      expect(p.branchId).toBe('br1');
    });

    it('payload tolerates missing branchId (returns empty string, not "undefined" or "null")', () => {
      const doc = {
        _id: 'alert2',
        beneficiaryId: 'b1',
        measureId: 'm1',
        measureCode: 'BERG',
        alertType: 'REGRESSION_DETECTED',
        severity: 'high',
      };
      const p = mapping.payload(doc);
      expect(p.branchId).toBe('');
      // Stringification correctness sentinel — never the literal 'undefined'.
      expect(p.branchId).not.toBe('undefined');
      expect(p.branchId).not.toBe('null');
    });

    it('payload defaults severity to "medium" when missing', () => {
      const p = mapping.payload({
        _id: 'a3',
        beneficiaryId: 'b',
        measureId: 'm',
        measureCode: 'X',
        alertType: 'PLATEAU_DETECTED',
      });
      expect(p.severity).toBe('medium');
    });

    it('payload shape exactly matches the contract — no extra fields, no missing fields', () => {
      const { MEDICAL_EVENTS } = require('../events/contracts/domainEventContracts');
      const contract = MEDICAL_EVENTS.MEASURE_ALERT_RAISED;
      const sample = mapping.payload({
        _id: 'a',
        beneficiaryId: 'b',
        measureId: 'm',
        measureCode: 'C',
        alertType: 'MCID_NOT_MET',
        severity: 'low',
        branchId: 'br',
      });
      // Strict envelope check (W408 lesson — only this catches drift).
      expect(Object.keys(sample).sort()).toEqual(Object.keys(contract.payload).sort());
    });

    it('preloads MeasureAlert model so mongoose.model() lookup succeeds', () => {
      // The model file resolution path is in modelEventBridge._preloadOptionalModels;
      // here we just ensure the source file references that path. (Bridge
      // wiring is tested in integration in W404 + others.)
      const src = fs.readFileSync(
        path.resolve(__dirname, '..', 'integration', 'modelEventBridge.js'),
        'utf8'
      );
      expect(src).toMatch(/domains\/goals\/models\/MeasureAlert/);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // 3. Realtime ACL grants the new topic to the documented roles
  // ════════════════════════════════════════════════════════════════════

  describe('realtime-topic-acl.registry topic grants', () => {
    const aclModule = require('../intelligence/realtime-topic-acl.registry');
    // The registry module is opaque about export shape; try common ones.
    const acl =
      aclModule.ROLE_TOPIC_ALLOWLIST || aclModule.default?.ROLE_TOPIC_ALLOWLIST || aclModule;

    function roleAllows(role, topic) {
      const grants = acl[role];
      if (!grants || !Array.isArray(grants)) return false;
      if (grants.includes('*')) return true;
      if (grants.includes(topic)) return true;
      // Prefix match: 'medical.*' covers 'medical.measure_alert.raised'.
      return grants.some(g => {
        if (!g.endsWith('.*')) return false;
        const prefix = g.slice(0, -2);
        return topic === prefix || topic.startsWith(prefix + '.');
      });
    }

    const T = 'medical.measure_alert.raised';

    it.each(['super_admin', 'head_office_admin', 'admin', 'manager', 'supervisor'])(
      '%s can subscribe to medical.measure_alert.raised',
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

    it('therapist (non-medical scope) is NOT granted', () => {
      // Therapist sees session.* / careplan.* / goal.achieved + ai.recommendation_generated
      // — outcome measure alerts go up the supervisor / clinical chain.
      expect(roleAllows('therapist', T)).toBe(false);
    });

    it('hr role (cross-cutting non-clinical) is NOT granted', () => {
      expect(roleAllows('hr', T)).toBe(false);
    });
  });
});
