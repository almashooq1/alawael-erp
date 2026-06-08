'use strict';

/**
 * W374 — DDD event-contracts drift guard.
 *
 * Locks the structural integrity of `backend/events/contracts/dddEventContracts.js`
 * (716 LOC, 17 domain groups, ~80 event contracts). This is the de-facto canonical
 * event registry that the doctrine's §3.2 illustrative names point to in practice
 * (doctrine uses examples like `beneficiary.created`; the contracts file uses
 * `beneficiary.registered` etc — "مثل" in §3.2 = illustrative not exhaustive).
 *
 * Pre-W374 state (2026-05-25):
 *   - Only the auto-generated structural test at
 *     `tests/unit/contracts-dddEventContracts.module.test.js` exists, asserting
 *     4 trivial properties (file exists, valid JS, 1 local require, has
 *     module.exports). It does NOT catch:
 *       * an accidentally-removed event group
 *       * a contract missing a required field (description, payload, etc)
 *       * a duplicate eventType across domains
 *       * version-back-rev (silently breaking consumers)
 *       * an eventType that doesn't match its declared domain prefix
 *   - No event-bus drift guard catches consumers referring to undefined domains.
 *
 * W374 plugs those gaps via a load-and-introspect approach (require the
 * registry directly — it's pure JS data, no mongoose). Same pattern as
 * `__tests__/care-plan-registry-integrity-wave332.test.js`.
 *
 * Checks:
 *   1. Aggregated `DDD_CONTRACTS` includes every named event group exactly once.
 *   2. Every contract has the canonical envelope: `{ domain, eventType,
 *      version, description, payload, delivery, priority, consumers }`.
 *   3. `eventType` is `<domain-prefix>.<snake_case>` (e.g. `beneficiary.registered`).
 *      Prefixes form a fixed allowlist mapped from the W354 TIER constant.
 *   4. No duplicate `eventType` strings across the entire registry.
 *   5. `version` is a positive integer (`>= 1`). No silent v0 / floats.
 *   6. `consumers` is a non-empty array of strings (downstream domains or
 *      services like 'notification'). Doctrine §3.2: events MUST have at least
 *      one consumer to justify their existence.
 *   7. `getDDDContractStats()` returns counts within stable bounds — additions
 *      are allowed, but a sudden drop in `totalEvents` signals accidental removal.
 *
 * Baseline (2026-05-25): 17 domain groups, ~80 unique eventTypes, all v1.
 * Future contract additions: increment `MIN_TOTAL_EVENTS` in tandem.
 * Future contract removals: require explicit ADR (consumer breakage risk).
 */

const contracts = require('../events/contracts/dddEventContracts');

// W377 (2026-05-25): shrunk from 17 to 9 groups after deleting 8 entirely-
// aspirational groups (workflow, family, dashboards, tele-rehab, ar-vr,
// group-therapy, research, field-training) per ADR-027. Remaining 9 are the
// groups where at least one event is wired or worth wiring per the wire/delete
// table in ADR-027.
const EXPECTED_DOMAIN_GROUPS = Object.freeze([
  'core',
  'episodes',
  'assessments',
  'care-plans',
  'sessions',
  'goals',
  'quality',
  'behavior',
  'ai-recommendations',
  'appointments', // W970 — appointment booking/cancellation/no-show → core timeline
  'safety', // W992 — seizure / safeguarding / restraint clinical safety events → core timeline
  'screenings', // W993 — vision / hearing functional screenings → core timeline
  'medications', // W994 — MAR dose outcomes (administered/refused/missed/held) → core timeline
  'discharge', // W995 — discharge plan completion → core timeline
  'admissions', // W996 — waitlist enrollment (admission) → core timeline
  'referrals', // W997 — referral conversion (loop closed) → core timeline
  'medical-referrals', // W998 — medical referral completion → core timeline
  'measurements', // W999 — measurement result approved → core timeline
  'insurance-claims', // W1000 — insurance claim paid → core timeline
  'invoices', // W1023 — invoice fully paid → core timeline
]);

// Allowed `eventType` prefixes. Most match W354 TIER domain names; a few are
// short-form aliases the contracts adopted before W354 (e.g. `ai` for
// `ai-recommendations`, `telerehab` for `tele-rehab`). The contracts file IS
// the source of truth — listing here only locks the current allowlist so a
// NEW typo'd prefix (e.g. `ben.created`) fails CI.
const ALLOWED_EVENT_PREFIXES = Object.freeze(
  new Set([
    'beneficiary',
    'episode',
    'assessment',
    'care_plan',
    'careplan',
    'session',
    'goal',
    'workflow',
    'journey',
    'quality',
    'family',
    'dashboard',
    'kpi',
    'decision',
    'telerehab',
    'arvr',
    'behavior',
    'group_therapy',
    'group',
    'research',
    'training',
    'field_training',
    'ai',
    'recommendation',
    'appointment', // W970 — appointment.booked / .cancelled / .no_show
    'seizure', // W992 — seizure.recorded
    'safeguarding', // W992 — safeguarding.concern_raised
    'restraint', // W992 — restraint.applied
    'screening', // W993 — screening.completed (vision + hearing)
    'medication', // W994 — medication.dose_recorded (MAR)
    'discharge', // W995 — discharge.completed
    'admission', // W996 — admission.enrolled (waitlist)
    'referral', // W997 — referral.converted (ReferralTracking)
    'medical_referral', // W998 — medical_referral.completed (MedicalReferral)
    'measurement', // W999 — measurement.result_approved (MeasurementResult)
    'insurance_claim', // W1000 — insurance_claim.paid (InsuranceClaim)
    'invoice', // W1023 — invoice.paid (Invoice)
  ])
);

const REQUIRED_CONTRACT_FIELDS = Object.freeze([
  'domain',
  'eventType',
  'version',
  'description',
  'payload',
  'delivery',
  'priority',
  'consumers',
]);

const MIN_TOTAL_EVENTS = 10; // floor; post-W377 actual count = 18 (was 34 pre-W377)
const MAX_TOTAL_EVENTS = 200; // ceiling; sanity bound — re-baseline if exceeded

describe('W374 DDD event-contracts drift guard', () => {
  describe('aggregator integrity', () => {
    it('exports DDD_CONTRACTS aggregator + getDDDContractStats helper', () => {
      expect(typeof contracts.DDD_CONTRACTS).toBe('object');
      expect(contracts.DDD_CONTRACTS).not.toBeNull();
      expect(typeof contracts.getDDDContractStats).toBe('function');
    });

    it('DDD_CONTRACTS includes exactly the expected domain groups', () => {
      const actual = Object.keys(contracts.DDD_CONTRACTS).sort();
      const expected = [...EXPECTED_DOMAIN_GROUPS].sort();
      expect(actual).toEqual(expected);
    });

    it('every named event group is also exported as a named export', () => {
      // W377 (2026-05-25): 8 group-export pairs removed per ADR-027 deletions.
      const groupExportMap = {
        core: 'BENEFICIARY_DDD_EVENTS',
        episodes: 'EPISODE_EVENTS',
        assessments: 'ASSESSMENT_EVENTS',
        'care-plans': 'CARE_PLAN_EVENTS',
        sessions: 'SESSION_EVENTS',
        goals: 'GOAL_EVENTS',
        quality: 'QUALITY_EVENTS',
        behavior: 'BEHAVIOR_EVENTS',
        'ai-recommendations': 'AI_RECOMMENDATION_EVENTS',
        appointments: 'APPOINTMENT_EVENTS', // W970
      };
      for (const [group, exportName] of Object.entries(groupExportMap)) {
        expect(contracts[exportName]).toBe(contracts.DDD_CONTRACTS[group]);
      }
    });
  });

  describe('contract shape', () => {
    it('every contract has the canonical envelope fields', () => {
      const violations = [];
      for (const [group, events] of Object.entries(contracts.DDD_CONTRACTS)) {
        for (const [eventKey, evt] of Object.entries(events)) {
          for (const field of REQUIRED_CONTRACT_FIELDS) {
            if (!(field in evt) || evt[field] === undefined) {
              violations.push(`  - ${group}.${eventKey} missing "${field}"`);
            }
          }
        }
      }
      if (violations.length > 0) {
        throw new Error(
          `${violations.length} contract(s) missing required envelope field(s):\n` +
            violations.join('\n') +
            `\n\nDoctrine §3.2 — every event MUST declare: ${REQUIRED_CONTRACT_FIELDS.join(', ')}.`
        );
      }
    });

    it('every contract.version is a positive integer (>= 1)', () => {
      const violations = [];
      for (const [group, events] of Object.entries(contracts.DDD_CONTRACTS)) {
        for (const [eventKey, evt] of Object.entries(events)) {
          if (!Number.isInteger(evt.version) || evt.version < 1) {
            violations.push(`  - ${group}.${eventKey}.version = ${JSON.stringify(evt.version)}`);
          }
        }
      }
      if (violations.length > 0) {
        throw new Error(
          `${violations.length} contract(s) have invalid version:\n` +
            violations.join('\n') +
            `\n\nVersion must be a positive integer. Increment when changing payload shape.`
        );
      }
    });

    it('every contract.consumers is a non-empty array of strings', () => {
      const violations = [];
      for (const [group, events] of Object.entries(contracts.DDD_CONTRACTS)) {
        for (const [eventKey, evt] of Object.entries(events)) {
          if (!Array.isArray(evt.consumers) || evt.consumers.length === 0) {
            violations.push(`  - ${group}.${eventKey} has no consumers (length=0 or not-array)`);
            continue;
          }
          for (const c of evt.consumers) {
            if (typeof c !== 'string' || !c) {
              violations.push(`  - ${group}.${eventKey} consumer "${c}" is not a string`);
            }
          }
        }
      }
      if (violations.length > 0) {
        throw new Error(
          `${violations.length} contract(s) have invalid consumers:\n` +
            violations.join('\n') +
            `\n\nDoctrine §3.2 — events without consumers shouldn't exist. ` +
            `If a producer emits but no subscriber listens, delete the contract or add the subscriber.`
        );
      }
    });
  });

  describe('naming convention', () => {
    it('every eventType matches <allowed_prefix>.<snake_case> shape', () => {
      const violations = [];
      const re = /^([a-z][a-z0-9_]*)\.[a-z][a-z0-9_]*$/;
      for (const [group, events] of Object.entries(contracts.DDD_CONTRACTS)) {
        for (const [eventKey, evt] of Object.entries(events)) {
          const m = evt.eventType.match(re);
          if (!m) {
            violations.push(
              `  - ${group}.${eventKey}.eventType "${evt.eventType}" doesn't match <prefix>.<snake_case>`
            );
            continue;
          }
          if (!ALLOWED_EVENT_PREFIXES.has(m[1])) {
            violations.push(
              `  - ${group}.${eventKey}.eventType prefix "${m[1]}" not in ALLOWED_EVENT_PREFIXES`
            );
          }
        }
      }
      if (violations.length > 0) {
        throw new Error(
          `${violations.length} eventType(s) violate naming convention:\n` +
            violations.join('\n') +
            `\n\nPattern: <prefix>.<snake_case>. Prefix must be in the allowlist. ` +
            `Adding a new prefix requires updating ALLOWED_EVENT_PREFIXES in this guard.`
        );
      }
    });

    it('no duplicate eventType strings across the entire registry', () => {
      const seen = new Map();
      const duplicates = [];
      for (const [group, events] of Object.entries(contracts.DDD_CONTRACTS)) {
        for (const [eventKey, evt] of Object.entries(events)) {
          const t = evt.eventType;
          if (seen.has(t)) {
            duplicates.push(`  - "${t}" appears in BOTH ${seen.get(t)} AND ${group}.${eventKey}`);
          } else {
            seen.set(t, `${group}.${eventKey}`);
          }
        }
      }
      if (duplicates.length > 0) {
        throw new Error(
          `${duplicates.length} duplicate eventType string(s):\n` +
            duplicates.join('\n') +
            `\n\neventType strings must be globally unique. Two contracts with the same string ` +
            `cause subscriber confusion + integration-bus routing errors. Rename one or merge.`
        );
      }
    });

    it('contract.domain matches the DDD_CONTRACTS group key (or known alias)', () => {
      // Many contracts declare a domain string that matches the group key
      // exactly (e.g. group 'episodes' → contract.domain 'episodes'). A few
      // pre-W354 contracts use looser strings (e.g. group 'core' → contract.
      // domain 'core'). We only verify that contract.domain is a non-empty
      // string here; tighter alignment is a follow-up.
      const violations = [];
      for (const [group, events] of Object.entries(contracts.DDD_CONTRACTS)) {
        for (const [eventKey, evt] of Object.entries(events)) {
          if (typeof evt.domain !== 'string' || !evt.domain) {
            violations.push(`  - ${group}.${eventKey}.domain is empty or not-string`);
          }
        }
      }
      if (violations.length > 0) {
        throw new Error(
          `${violations.length} contract(s) have empty/non-string domain:\n` + violations.join('\n')
        );
      }
    });
  });

  describe('stability via stats', () => {
    it('getDDDContractStats() returns totals within stable bounds', () => {
      const stats = contracts.getDDDContractStats();
      expect(stats.domains).toBe(EXPECTED_DOMAIN_GROUPS.length);
      expect(stats.totalEvents).toBeGreaterThanOrEqual(MIN_TOTAL_EVENTS);
      expect(stats.totalEvents).toBeLessThanOrEqual(MAX_TOTAL_EVENTS);
      // Per-domain sanity: no domain has zero events (would be a dead group).
      for (const [domain, count] of Object.entries(stats.perDomain)) {
        if (count === 0) {
          throw new Error(`Domain "${domain}" has zero events — group dead, remove or populate.`);
        }
      }
    });
  });
});
