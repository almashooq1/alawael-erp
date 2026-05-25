'use strict';

/**
 * W382 — domainEventContracts.js drift guard (structural + dead-contract).
 *
 * Mirror of W374 + W375 for the OTHER event registry. The W377 prep discovered
 * dddEventContracts.js was structurally orphaned (only loaded by drift guards)
 * while `backend/events/contracts/domainEventContracts.js` is the LIVE
 * registry actually loaded by `startup/integrationBus.js:19` for cross-module
 * integration. The two files cover nearly-disjoint domain sets:
 *
 *   dddEventContracts.js     — DDD bounded contexts (episodes, care-plans,
 *                              sessions, goals, etc.) — covered by W374/W375.
 *   domainEventContracts.js  — cross-cutting infrastructure (hr, finance,
 *                              beneficiary, medical, attendance, notification,
 *                              system) — covered by THIS wave.
 *
 * Same envelope shape `{ domain, eventType, version, description, payload,
 * delivery, priority, consumers }`. Same gap classes (dead contracts where
 * declared but never emitted/consumed).
 *
 * Two test groups in one file:
 *
 *   STRUCTURAL — same checks as W374:
 *     - 7 expected domains exist + match named exports
 *     - canonical envelope fields on every contract
 *     - version ≥ 1, consumers non-empty array of strings
 *     - eventType matches <prefix>.<snake_case> with allowlisted prefix
 *     - no duplicate eventType strings within the registry
 *     - getContractStats() in stable bounds
 *
 *   DEAD-CONTRACT — same ratchet-down pattern as W375:
 *     - 19 of 30 contracts (63%) currently dead (W382 introduction)
 *     - new dead contracts fail CI; stale baseline entries fail CI
 *     - 11 alive include: hr.employee.hired, hr.leave.approved, finance.invoice.created,
 *       finance.payment.received, beneficiary.{registered,status_changed,discharged,
 *       assessment.completed,goal.achieved}, notification.sent, system.error.
 *
 * Reconciliation strategy: ADR-027-bis (TBD). Same Wire-vs-Delete framework
 * as ADR-027 (which targeted dddEventContracts.js). HR/finance/medical/etc.
 * contracts touch unfamiliar services — per-domain stakeholder decisions
 * needed before wirings land.
 */

const fs = require('fs');
const path = require('path');
const contracts = require('../events/contracts/domainEventContracts');

const BACKEND_ROOT = path.join(__dirname, '..');

// ─── Expected shape ──────────────────────────────────────────────────────────

const EXPECTED_DOMAINS = Object.freeze([
  'hr',
  'finance',
  'beneficiary',
  'medical',
  'attendance',
  'notification',
  'system',
]);

const DOMAIN_EXPORT_MAP = Object.freeze({
  hr: 'HR_EVENTS',
  finance: 'FINANCE_EVENTS',
  beneficiary: 'BENEFICIARY_EVENTS',
  medical: 'MEDICAL_EVENTS',
  attendance: 'ATTENDANCE_EVENTS',
  notification: 'NOTIFICATION_EVENTS',
  system: 'SYSTEM_EVENTS',
});

const ALLOWED_EVENT_PREFIXES = Object.freeze(
  new Set([
    'employee',
    'leave',
    'salary',
    'department',
    'invoice',
    'payment',
    'expense',
    'budget',
    'payroll',
    'beneficiary',
    'assessment',
    'goal',
    'record',
    'therapy',
    'prescription',
    'risk',
    'absence',
    'notification',
    'auth',
    'cache',
    'system',
    'error', // W397 — ERROR_OCCURRED renamed from 'system.error' to 'error.occurred'
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

const MIN_TOTAL_EVENTS = 25; // floor; current = 30
const MAX_TOTAL_EVENTS = 100; // ceiling

// ─── Dead-contract baseline ──────────────────────────────────────────────────
//
// Keys: <domain>.<KEY>. Inline comment shows the eventType for grep convenience.
// W382-discovery snapshot (2026-05-25): 19 of 30 contracts dead. 11 alive include
// the 4 that W380's beneficiary/goals/assessment wires happen to satisfy via
// eventType-string collision (`beneficiary.status_changed`, `goal.achieved`,
// `assessment.completed` are identical across both registries).
//
// To regenerate: comment out the KNOWN_DEAD_CONTRACTS filter in the first dead-
// contract test + re-run to see the current state.
// W396 (2026-05-25) closed 6 more entries: EXPENSE_APPROVED, DELIVERY_FAILED,
// SALARY_CHANGED, DEPARTMENT_TRANSFERRED via modelEventBridge additions;
// USER_LOGGED_IN, USER_LOGGED_OUT via auth.middleware integrationBus.publish.
// Baseline 13 → 7. Remaining entries need: non-existent models (Prescription,
// RiskAlert, PayrollRun), sweepers (absence, budget), or deeper auth/cache
// middleware hooks.
const KNOWN_DEAD_CONTRACTS = new Set([
  // finance — 2 remaining (no model + sweeper-driven)
  'finance.BUDGET_THRESHOLD_REACHED', // budget.threshold_reached — needs nightly sweeper
  'finance.PAYROLL_PROCESSED', // payroll.processed — no PayrollRun model registered
  // medical — 2 remaining (models don't exist)
  'medical.PRESCRIPTION_ISSUED', // prescription.issued — no Prescription model
  'medical.RISK_ALERT_RAISED', // risk.alert_raised — no RiskAlert/ClinicalRiskScore model registered for hook
  // attendance — 1 remaining (sweeper)
  'attendance.ABSENCE_DETECTED', // absence.detected — needs daily sweeper
  // system — 3 remaining (deeper middleware hooks)
  'system.ERROR_OCCURRED', // error.occurred — needs central error-handler middleware producer. W397 renamed eventType from 'system.error' to 'error.occurred' so subscriber wildcard 'system.error.*' matches runtime fullEventName 'system.error.occurred' — but no producer fires yet. Static scan finds no 'error.occurred' literal because subscribers use wildcard.
  'system.PERMISSION_DENIED', // auth.permission_denied — authorization middleware (multiple callsites)
  'system.CACHE_INVALIDATED', // cache.invalidated — cache layer hook (no central point)
]);

// ─── Scan helpers ────────────────────────────────────────────────────────────

const SCAN_SKIP_DIRS = new Set([
  '__tests__',
  '__mocks__',
  'tests',
  'node_modules',
  '.jest-cache',
  'coverage',
  '_archived',
  'events', // contracts file lives here; exclude self-references
  '_test-fixtures',
]);

function walkJs(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SCAN_SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJs(full, out);
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

function loadSources() {
  const files = walkJs(BACKEND_ROOT);
  const map = new Map();
  for (const f of files) map.set(f, fs.readFileSync(f, 'utf8'));
  return map;
}

function findDeadContracts(sources) {
  const dead = new Set();
  for (const [domain, events] of Object.entries(contracts.ALL_CONTRACTS)) {
    for (const [key, evt] of Object.entries(events)) {
      const needleSingle = `'${evt.eventType}'`;
      const needleDouble = `"${evt.eventType}"`;
      let referenced = false;
      for (const src of sources.values()) {
        if (src.includes(needleSingle) || src.includes(needleDouble)) {
          referenced = true;
          break;
        }
      }
      if (!referenced) dead.add(`${domain}.${key}`);
    }
  }
  return dead;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('W382 domainEventContracts drift guard', () => {
  describe('aggregator integrity', () => {
    it('exports ALL_CONTRACTS + getContractStats helper', () => {
      expect(typeof contracts.ALL_CONTRACTS).toBe('object');
      expect(contracts.ALL_CONTRACTS).not.toBeNull();
      expect(typeof contracts.getContractStats).toBe('function');
    });

    it('ALL_CONTRACTS includes exactly the expected 7 domains', () => {
      const actual = Object.keys(contracts.ALL_CONTRACTS).sort();
      expect(actual).toEqual([...EXPECTED_DOMAINS].sort());
    });

    it('every domain has a matching named export', () => {
      for (const [domain, exportName] of Object.entries(DOMAIN_EXPORT_MAP)) {
        expect(contracts[exportName]).toBe(contracts.ALL_CONTRACTS[domain]);
      }
    });

    it('also exports helper utilities (getContract, getDomainContracts, listAllEventTypes, validatePayload)', () => {
      expect(typeof contracts.getContract).toBe('function');
      expect(typeof contracts.getDomainContracts).toBe('function');
      expect(typeof contracts.listAllEventTypes).toBe('function');
      expect(typeof contracts.validatePayload).toBe('function');
    });
  });

  describe('contract shape', () => {
    it('every contract has the canonical envelope fields', () => {
      const violations = [];
      for (const [domain, events] of Object.entries(contracts.ALL_CONTRACTS)) {
        for (const [key, evt] of Object.entries(events)) {
          for (const field of REQUIRED_CONTRACT_FIELDS) {
            if (!(field in evt) || evt[field] === undefined) {
              violations.push(`  - ${domain}.${key} missing "${field}"`);
            }
          }
        }
      }
      if (violations.length > 0) {
        throw new Error(
          `${violations.length} contract(s) missing required envelope field(s):\n` +
            violations.join('\n')
        );
      }
    });

    it('every contract.version is a positive integer (≥ 1)', () => {
      const violations = [];
      for (const [domain, events] of Object.entries(contracts.ALL_CONTRACTS)) {
        for (const [key, evt] of Object.entries(events)) {
          if (!Number.isInteger(evt.version) || evt.version < 1) {
            violations.push(`  - ${domain}.${key}.version = ${JSON.stringify(evt.version)}`);
          }
        }
      }
      if (violations.length > 0) {
        throw new Error(
          `${violations.length} contract(s) have invalid version:\n` + violations.join('\n')
        );
      }
    });

    it('every contract.consumers is a non-empty array of strings', () => {
      const violations = [];
      for (const [domain, events] of Object.entries(contracts.ALL_CONTRACTS)) {
        for (const [key, evt] of Object.entries(events)) {
          if (!Array.isArray(evt.consumers) || evt.consumers.length === 0) {
            violations.push(`  - ${domain}.${key} has no consumers`);
            continue;
          }
          for (const c of evt.consumers) {
            if (typeof c !== 'string' || !c) {
              violations.push(`  - ${domain}.${key} consumer "${c}" is not a string`);
            }
          }
        }
      }
      if (violations.length > 0) {
        throw new Error(
          `${violations.length} contract(s) have invalid consumers:\n` + violations.join('\n')
        );
      }
    });
  });

  describe('naming convention', () => {
    it('every eventType matches <allowed_prefix>.<snake_case> shape', () => {
      const violations = [];
      const re = /^([a-z][a-z0-9_]*)\.[a-z][a-z0-9_]*$/;
      for (const [domain, events] of Object.entries(contracts.ALL_CONTRACTS)) {
        for (const [key, evt] of Object.entries(events)) {
          const m = evt.eventType.match(re);
          if (!m) {
            violations.push(`  - ${domain}.${key}.eventType "${evt.eventType}" malformed`);
            continue;
          }
          if (!ALLOWED_EVENT_PREFIXES.has(m[1])) {
            violations.push(`  - ${domain}.${key}.eventType prefix "${m[1]}" not allowed`);
          }
        }
      }
      if (violations.length > 0) {
        throw new Error(
          `${violations.length} eventType(s) violate naming convention:\n` + violations.join('\n')
        );
      }
    });

    it('no duplicate eventType strings within this registry', () => {
      const seen = new Map();
      const duplicates = [];
      for (const [domain, events] of Object.entries(contracts.ALL_CONTRACTS)) {
        for (const [key, evt] of Object.entries(events)) {
          if (seen.has(evt.eventType)) {
            duplicates.push(
              `  - "${evt.eventType}" in BOTH ${seen.get(evt.eventType)} AND ${domain}.${key}`
            );
          } else {
            seen.set(evt.eventType, `${domain}.${key}`);
          }
        }
      }
      if (duplicates.length > 0) {
        throw new Error(`${duplicates.length} duplicate(s):\n` + duplicates.join('\n'));
      }
    });
  });

  describe('stability via stats', () => {
    it('getContractStats() returns totals within stable bounds', () => {
      const stats = contracts.getContractStats();
      expect(stats.domains).toBe(EXPECTED_DOMAINS.length);
      expect(stats.totalEvents).toBeGreaterThanOrEqual(MIN_TOTAL_EVENTS);
      expect(stats.totalEvents).toBeLessThanOrEqual(MAX_TOTAL_EVENTS);
      for (const [domain, count] of Object.entries(stats.perDomain)) {
        if (count === 0) {
          throw new Error(`Domain "${domain}" has zero events — group dead`);
        }
      }
    });
  });

  describe('dead-contract discovery — referenceability', () => {
    it('no NEW dead contract appears beyond the W382 baseline', () => {
      const sources = loadSources();
      const currentDead = findDeadContracts(sources);
      const newDead = [...currentDead].filter(k => !KNOWN_DEAD_CONTRACTS.has(k));
      if (newDead.length > 0) {
        throw new Error(
          `${newDead.length} NEW dead contract(s) in domainEventContracts.js ` +
            `(declared but zero references outside the contracts file):\n` +
            newDead.map(k => `  - ${k}`).join('\n') +
            `\n\nEvery new event contract MUST be producer-wired in the same PR. ` +
            `Either add producer (e.g. \`bus.emit('<eventType>', payload)\`) or delete the contract.`
        );
      }
    });

    it('every entry in KNOWN_DEAD_CONTRACTS is still dead (ratchet-down check)', () => {
      const sources = loadSources();
      const currentDead = findDeadContracts(sources);
      const stale = [...KNOWN_DEAD_CONTRACTS].filter(k => !currentDead.has(k));
      if (stale.length > 0) {
        throw new Error(
          `${stale.length} entry/entries in KNOWN_DEAD_CONTRACTS are no longer dead. ` +
            `Remove from Set in same commit as producer wiring:\n` +
            stale.map(s => `  - ${s}`).join('\n')
        );
      }
    });
  });

  describe('sanity', () => {
    it('every KNOWN_DEAD_CONTRACTS entry resolves to a real contract', () => {
      const allKeys = new Set();
      for (const [domain, events] of Object.entries(contracts.ALL_CONTRACTS)) {
        for (const k of Object.keys(events)) allKeys.add(`${domain}.${k}`);
      }
      const bogus = [...KNOWN_DEAD_CONTRACTS].filter(k => !allKeys.has(k));
      if (bogus.length > 0) {
        throw new Error(
          `${bogus.length} entry/entries in KNOWN_DEAD_CONTRACTS don't resolve:\n` +
            bogus.map(b => `  - ${b}`).join('\n')
        );
      }
    });
  });
});
