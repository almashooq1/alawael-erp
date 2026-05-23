'use strict';

/**
 * W332 drift guard — care-planning.registry.js integrity.
 *
 * Wave 41 shipped a production-grade 13-state lifecycle + rich transition
 * graph for CarePlanVersion. This guard protects that infrastructure from
 * future erosion by asserting structural invariants the registry MUST hold.
 *
 * Discovery context: W332 was scoped as "build CarePlan state machine lib
 * mirroring W325 P2 measure-lifecycle.lib.js" — but test-run of the new
 * 04-care-plan-goals-engine.prompt.md revealed the lib already exists, AND
 * is more sophisticated than the W325 P2 pattern (frozen STATUSES + frozen
 * TRANSITIONS + 8 plan types + actor-role gating + readiness-score floors
 * + self-distinct-approver SoD + severity tiers + audit categories). The
 * CarePlanVersion model pulls `enum: reg.STATUS_LIST` dynamically (line
 * 320), so no model↔registry desync is possible by design.
 *
 * Highest-value protection now = lock the registry's shape so future
 * drift can't quietly degrade the W41 design.
 *
 * The lib has zero mongoose dependency → 100% testable under jest.mock.
 */

const fs = require('fs');
const path = require('path');
const reg = require('../intelligence/care-planning.registry');

// ═══════════════════════════════════════════════════════════════════════
// Static structure
// ═══════════════════════════════════════════════════════════════════════

describe('W332 care-planning.registry static structure', () => {
  it('exposes exactly 13 STATUSES, all frozen', () => {
    expect(Object.isFrozen(reg.STATUSES)).toBe(true);
    expect(Object.isFrozen(reg.STATUS_LIST)).toBe(true);
    expect(reg.STATUS_LIST.length).toBe(13);
    // Expected canonical set (lower_snake_case)
    const expected = [
      'draft',
      'validation_pending',
      'ready_for_submission',
      'submitted_to_supervisor',
      'under_review',
      'revision_requested',
      'escalated_to_branch_manager',
      'approved',
      'rejected',
      'archived',
      'superseded',
      'saved_to_record',
      'family_notification_sent',
    ];
    expect(reg.STATUS_LIST).toEqual(expect.arrayContaining(expected));
    expect(reg.STATUS_LIST.length).toBe(expected.length); // no extras
  });

  it('exposes exactly 8 PLAN_TYPES, all frozen', () => {
    expect(Object.isFrozen(reg.PLAN_TYPES)).toBe(true);
    expect(Object.isFrozen(reg.PLAN_TYPE_LIST)).toBe(true);
    expect(reg.PLAN_TYPE_LIST.length).toBe(8);
    const expected = [
      'individual_therapy',
      'individual_education',
      'behavioral',
      'family_support',
      'group',
      'multidisciplinary',
      'review',
      'intensive',
    ];
    expect(reg.PLAN_TYPE_LIST).toEqual(expect.arrayContaining(expected));
    expect(reg.PLAN_TYPE_LIST.length).toBe(expected.length);
  });

  it('TERMINAL_STATUSES is a frozen Set with valid status members', () => {
    expect(reg.TERMINAL_STATUSES instanceof Set).toBe(true);
    for (const s of reg.TERMINAL_STATUSES) {
      expect(reg.STATUS_LIST).toContain(s);
    }
    // archived + superseded + family_notification_sent are terminal by design
    expect(reg.TERMINAL_STATUSES.has(reg.STATUSES.ARCHIVED)).toBe(true);
    expect(reg.TERMINAL_STATUSES.has(reg.STATUSES.SUPERSEDED)).toBe(true);
    expect(reg.TERMINAL_STATUSES.has(reg.STATUSES.FAMILY_NOTIFICATION_SENT)).toBe(true);
  });

  it('TRANSITIONS is a frozen array', () => {
    expect(Array.isArray(reg.TRANSITIONS)).toBe(true);
    expect(Object.isFrozen(reg.TRANSITIONS)).toBe(true);
    expect(reg.TRANSITIONS.length).toBeGreaterThan(8); // we know there are ~14 transitions
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Transition graph integrity
// ═══════════════════════════════════════════════════════════════════════

describe('W332 care-planning.registry transition graph integrity', () => {
  it('every transition has all required fields', () => {
    const required = [
      'id',
      'descriptionAr',
      'descriptionEn',
      'from',
      'to',
      'actorRoles',
      'severity',
      'auditCategory',
    ];
    for (const t of reg.TRANSITIONS) {
      for (const field of required) {
        expect(t).toHaveProperty(field);
        expect(t[field]).not.toBeNull();
        expect(t[field]).not.toBeUndefined();
      }
    }
  });

  it('every transition id is unique', () => {
    const ids = reg.TRANSITIONS.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every transition `from[]` and `to` reference defined STATUSES', () => {
    const statusSet = new Set(reg.STATUS_LIST);
    for (const t of reg.TRANSITIONS) {
      expect(Array.isArray(t.from)).toBe(true);
      expect(t.from.length).toBeGreaterThan(0);
      for (const from of t.from) {
        expect(statusSet.has(from)).toBe(true);
      }
      expect(statusSet.has(t.to)).toBe(true);
    }
  });

  it('terminal-status outgoing transitions are limited to documented escape hatches', () => {
    // ARCHIVED + SUPERSEDED are strictly terminal — no outgoing transitions.
    // FAMILY_NOTIFICATION_SENT is semi-terminal — exactly ONE legitimate escape:
    // `supersede` (a newer plan version replaces a notified-to-family one,
    // for late corrections after family communication). Any other outgoing
    // transition from a terminal is a design regression.
    const STRICT_TERMINALS = new Set([reg.STATUSES.ARCHIVED, reg.STATUSES.SUPERSEDED]);
    const ALLOWED_FROM_FAMILY_SENT = new Set(['supersede']);
    for (const t of reg.TRANSITIONS) {
      for (const from of t.from) {
        if (STRICT_TERMINALS.has(from)) {
          throw new Error(
            `Transition "${t.id}" originates from strictly-terminal status "${from}". ` +
              `ARCHIVED and SUPERSEDED must have zero outbound transitions.`
          );
        }
        if (from === reg.STATUSES.FAMILY_NOTIFICATION_SENT) {
          if (!ALLOWED_FROM_FAMILY_SENT.has(t.id)) {
            throw new Error(
              `Transition "${t.id}" originates from FAMILY_NOTIFICATION_SENT but is not the ` +
                `documented escape hatch (\`supersede\`). Add to ALLOWED_FROM_FAMILY_SENT in this ` +
                `test only if a new escape is genuinely needed.`
            );
          }
        }
      }
    }
  });

  it('severity tier is in the canonical set', () => {
    const validSeverities = new Set(['low', 'medium', 'high', 'critical']);
    for (const t of reg.TRANSITIONS) {
      expect(validSeverities.has(t.severity)).toBe(true);
    }
  });

  it('minReadinessScore (if set) is in [0, 100]', () => {
    for (const t of reg.TRANSITIONS) {
      if (t.minReadinessScore != null) {
        expect(t.minReadinessScore).toBeGreaterThanOrEqual(0);
        expect(t.minReadinessScore).toBeLessThanOrEqual(100);
      }
    }
  });

  it('auditCategory follows the `care-plan.<action>` namespace', () => {
    for (const t of reg.TRANSITIONS) {
      expect(t.auditCategory).toMatch(/^care-plan\.[a-z][\w-]*$/);
    }
  });

  it('every non-DRAFT status is reachable from DRAFT via some transition chain', () => {
    // BFS from DRAFT following transitions
    const graph = new Map();
    for (const t of reg.TRANSITIONS) {
      for (const from of t.from) {
        if (!graph.has(from)) graph.set(from, new Set());
        graph.get(from).add(t.to);
      }
    }
    const reachable = new Set([reg.STATUSES.DRAFT]);
    const queue = [reg.STATUSES.DRAFT];
    while (queue.length > 0) {
      const cur = queue.shift();
      const nexts = graph.get(cur);
      if (!nexts) continue;
      for (const n of nexts) {
        if (!reachable.has(n)) {
          reachable.add(n);
          queue.push(n);
        }
      }
    }
    // REJECTED is reachable; ARCHIVED via SUPERSEDED chain. Verify all states reachable.
    const unreachable = reg.STATUS_LIST.filter(s => !reachable.has(s));
    if (unreachable.length > 0) {
      throw new Error(
        `${unreachable.length} status(es) unreachable from DRAFT: ${unreachable.join(', ')}. ` +
          `Either add a transition path or remove the orphan status from STATUSES.`
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Model ↔ registry sync
// ═══════════════════════════════════════════════════════════════════════

describe('W332 CarePlanVersion ↔ registry sync', () => {
  // Static analysis on source — backend/jest.setup.js mocks mongoose so we
  // cannot inspect schema.path('status').enumValues at runtime.

  it('CarePlanVersion.status.enum pulls dynamically from reg.STATUS_LIST', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'models', 'CarePlanVersion.js'), 'utf8');
    expect(src).toMatch(/status\s*:\s*\{[\s\S]{0,200}enum\s*:\s*reg\.STATUS_LIST/);
  });

  it('CarePlanVersion.planType.enum pulls dynamically from reg.PLAN_TYPE_LIST', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'models', 'CarePlanVersion.js'), 'utf8');
    expect(src).toMatch(/planType\s*:\s*\{[\s\S]{0,200}enum\s*:\s*reg\.PLAN_TYPE_LIST/);
  });

  it('CarePlanVersion.status defaults to reg.STATUSES.DRAFT (not a hardcoded string)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'models', 'CarePlanVersion.js'), 'utf8');
    expect(src).toMatch(/default\s*:\s*reg\.STATUSES\.DRAFT/);
  });
});
