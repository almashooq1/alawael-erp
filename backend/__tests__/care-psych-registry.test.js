'use strict';

/**
 * care-psych-registry.test.js — Phase 17 Commit 5 (4.0.87).
 */

const registry = require('../config/care/psych.registry');

describe('Psych registry — sanity', () => {
  it('validate() passes', () => {
    expect(() => registry.validate()).not.toThrow();
    expect(registry.validate()).toBe(true);
  });

  it('all taxonomies are frozen', () => {
    for (const t of [
      registry.FLAG_TYPES,
      registry.FLAG_SEVERITIES,
      registry.FLAG_STATUSES,
      registry.FLAG_TERMINAL_STATUSES,
      registry.FLAG_TRANSITIONS,
      registry.SCALES,
      registry.SCALE_CODES,
      registry.MDT_PURPOSES,
      registry.MDT_ROLES,
      registry.MDT_STATUSES,
      registry.MDT_TERMINAL_STATUSES,
      registry.MDT_TRANSITIONS,
    ]) {
      expect(Object.isFrozen(t)).toBe(true);
    }
  });

  it('has ≥ 10 flag types + 4 severities', () => {
    expect(registry.FLAG_TYPES.length).toBeGreaterThanOrEqual(10);
    expect(registry.FLAG_SEVERITIES).toEqual(['low', 'moderate', 'high', 'critical']);
  });

  it('has ≥ 6 flag statuses', () => {
    expect(registry.FLAG_STATUSES.length).toBeGreaterThanOrEqual(6);
    expect(registry.FLAG_STATUSES).toContain('active');
    expect(registry.FLAG_STATUSES).toContain('monitoring');
    expect(registry.FLAG_STATUSES).toContain('escalated');
    expect(registry.FLAG_STATUSES).toContain('resolved');
  });

  it('FLAG_TRANSITIONS has entry for every status', () => {
    for (const s of registry.FLAG_STATUSES) {
      expect(registry.FLAG_TRANSITIONS[s]).toBeDefined();
    }
  });

  it('CRITICAL_FLAG_SLA_ID is psych.risk_flag.response', () => {
    expect(registry.CRITICAL_FLAG_SLA_ID).toBe('psych.risk_flag.response');
  });

  it('matching SLA exists in sla.registry', () => {
    const sla = require('../config/sla.registry').byId('psych.risk_flag.response');
    expect(sla).toBeTruthy();
    expect(sla.severity).toBe('critical');
    expect(sla.businessHoursOnly).toBe(false);
    expect(sla.responseTargetMinutes).toBe(60);
  });
});

describe('Psych registry — flag transitions', () => {
  it('active → monitoring requires safetyPlan', () => {
    expect(registry.canFlagTransition('active', 'monitoring')).toBe(true);
    expect(registry.flagRequiredFields('active', 'monitoring')).toContain('safetyPlan');
  });

  it('active → escalated requires escalationReason', () => {
    expect(registry.canFlagTransition('active', 'escalated')).toBe(true);
    expect(registry.flagRequiredFields('active', 'escalated')).toContain('escalationReason');
  });

  it('active → resolved requires resolutionNotes', () => {
    expect(registry.flagRequiredFields('active', 'resolved')).toContain('resolutionNotes');
  });

  it('resolved → archived legal', () => {
    expect(registry.canFlagTransition('resolved', 'archived')).toBe(true);
  });

  it('monitoring → active requires reopenReason', () => {
    expect(registry.canFlagTransition('monitoring', 'active')).toBe(true);
    expect(registry.flagRequiredFields('monitoring', 'active')).toContain('reopenReason');
  });

  it('archived + cancelled have no outbound edges', () => {
    expect(registry.FLAG_TRANSITIONS.archived).toEqual([]);
    expect(registry.FLAG_TRANSITIONS.cancelled).toEqual([]);
  });

  it('isFlagTerminal true for resolved/archived/cancelled', () => {
    expect(registry.isFlagTerminal('resolved')).toBe(true);
    expect(registry.isFlagTerminal('archived')).toBe(true);
    expect(registry.isFlagTerminal('cancelled')).toBe(true);
    expect(registry.isFlagTerminal('active')).toBe(false);
  });

  it('illegal transitions flagged false', () => {
    expect(registry.canFlagTransition('archived', 'active')).toBe(false);
    expect(registry.canFlagTransition('cancelled', 'active')).toBe(false);
    expect(registry.canFlagTransition('active', 'archived')).toBe(false);
  });
});

describe('Psych registry — scales', () => {
  it('SCALE_CODES includes phq9 + gad7 + dass21', () => {
    expect(registry.SCALE_CODES).toEqual(expect.arrayContaining(['phq9', 'gad7', 'dass21']));
  });

  it('getScale returns scale object for known codes', () => {
    const s = registry.getScale('phq9');
    expect(s).toBeTruthy();
    expect(s.itemCount).toBe(9);
    expect(s.totalMax).toBe(27);
    expect(registry.getScale('bogus')).toBeNull();
  });

  it('PHQ-9 item 9 is marked as critical suicidal-ideation trigger', () => {
    const s = registry.getScale('phq9');
    expect(s.criticalItemIndices).toContain(8); // 0-indexed
    expect(s.criticalFlagType).toBe('suicidal_ideation');
  });

  it('scoreScale throws on wrong response length', () => {
    expect(() => registry.scoreScale('phq9', [0, 0, 0])).toThrow(/expects 9 responses/);
  });

  it('scoreScale throws on out-of-range response', () => {
    expect(() => registry.scoreScale('phq9', [0, 0, 0, 0, 0, 0, 0, 0, 5])).toThrow(/out of range/);
  });

  it('PHQ-9 all zeros → minimal band', () => {
    const out = registry.scoreScale('phq9', [0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(out.total).toBe(0);
    expect(out.band).toBe('minimal');
    expect(out.autoFlag).toBeNull();
  });

  it('PHQ-9 item 9 non-zero → auto suicidal_ideation flag', () => {
    const out = registry.scoreScale('phq9', [0, 0, 0, 0, 0, 0, 0, 0, 2]);
    expect(out.autoFlag).toBeTruthy();
    expect(out.autoFlag.type).toBe('suicidal_ideation');
  });

  it('PHQ-9 total ≥ 20 → auto severe_depression flag', () => {
    // All items max except item 9 (no suicidal ideation) — 8*3 = 24
    const out = registry.scoreScale('phq9', [3, 3, 3, 3, 3, 3, 3, 3, 0]);
    expect(out.total).toBe(24);
    expect(out.band).toBe('severe');
    expect(out.autoFlag).toBeTruthy();
    expect(out.autoFlag.type).toBe('severe_depression');
  });

  it('GAD-7 score 16 → severe + auto severe_anxiety flag', () => {
    const out = registry.scoreScale('gad7', [3, 3, 3, 3, 2, 1, 1]);
    expect(out.total).toBe(16);
    expect(out.band).toBe('severe');
    expect(out.autoFlag?.type).toBe('severe_anxiety');
  });

  it('GAD-7 score 5 → mild + no flag', () => {
    const out = registry.scoreScale('gad7', [1, 1, 1, 1, 1, 0, 0]);
    expect(out.total).toBe(5);
    expect(out.band).toBe('mild');
    expect(out.autoFlag).toBeNull();
  });

  it('all scale bands cover full total range contiguously', () => {
    for (const [code, s] of Object.entries(registry.SCALES)) {
      let cursor = s.totalMin;
      for (const b of s.bands) {
        expect(b.minScore).toBe(cursor);
        cursor = b.maxScore + 1;
      }
      expect(cursor - 1).toBe(s.totalMax);
    }
  });
});

describe('Psych registry — MDT', () => {
  it('scheduled → in_progress → completed happy path', () => {
    expect(registry.canMdtTransition('scheduled', 'in_progress')).toBe(true);
    expect(registry.canMdtTransition('in_progress', 'completed')).toBe(true);
  });

  it('completed → scheduled illegal', () => {
    expect(registry.canMdtTransition('completed', 'scheduled')).toBe(false);
  });

  it('scheduled → completed requires summary', () => {
    expect(registry.mdtRequiredFields('scheduled', 'completed')).toContain('summary');
  });

  it('scheduled → rescheduled requires rescheduledTo', () => {
    expect(registry.mdtRequiredFields('scheduled', 'rescheduled')).toContain('rescheduledTo');
  });

  it('completed/cancelled/rescheduled are terminal', () => {
    for (const s of ['completed', 'cancelled', 'rescheduled']) {
      expect(registry.isMdtTerminal(s)).toBe(true);
      expect(registry.MDT_TRANSITIONS[s]).toEqual([]);
    }
  });

  it('has ≥ 6 MDT purposes + 8 roles', () => {
    expect(registry.MDT_PURPOSES.length).toBeGreaterThanOrEqual(6);
    expect(registry.MDT_ROLES.length).toBeGreaterThanOrEqual(8);
  });
});

describe('Psych registry — graph reachability', () => {
  it('every flag status reachable from active', () => {
    const reachable = new Set(['active']);
    let added = true;
    while (added) {
      added = false;
      for (const [from, edges] of Object.entries(registry.FLAG_TRANSITIONS)) {
        if (!reachable.has(from)) continue;
        for (const e of edges) {
          if (!reachable.has(e.to)) {
            reachable.add(e.to);
            added = true;
          }
        }
      }
    }
    for (const s of registry.FLAG_STATUSES) {
      expect(reachable.has(s)).toBe(true);
    }
  });

  it('every mdt status reachable from scheduled', () => {
    const reachable = new Set(['scheduled']);
    let added = true;
    while (added) {
      added = false;
      for (const [from, edges] of Object.entries(registry.MDT_TRANSITIONS)) {
        if (!reachable.has(from)) continue;
        for (const e of edges) {
          if (!reachable.has(e.to)) {
            reachable.add(e.to);
            added = true;
          }
        }
      }
    }
    for (const s of registry.MDT_STATUSES) {
      expect(reachable.has(s)).toBe(true);
    }
  });
});
