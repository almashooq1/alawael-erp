'use strict';

/**
 * facility-registry.test.js — Phase 16 Commit 3 (4.0.68).
 *
 * Shape + drift invariants over the Facility domain registry.
 */

const {
  FACILITY_TYPES,
  FACILITY_STATUSES,
  OWNERSHIP_TYPES,
  INSPECTION_TYPES,
  INSPECTION_TYPE_CODES,
  INSPECTION_STATUSES,
  FINDING_SEVERITIES,
  FINDING_STATUSES,
  FINDING_PAUSE_STATUSES,
  FINDING_RESOLUTION_STATUSES,
  inspectionTypeByCode,
  slaPolicyForFinding,
  shouldSpawnWorkOrder,
  workOrderPriorityForSeverity,
  validate,
} = require('../config/facility.registry');

describe('Facility registry — sanity', () => {
  it('exposes the facility-type taxonomy', () => {
    expect(FACILITY_TYPES.length).toBeGreaterThanOrEqual(5);
    expect(Object.isFrozen(FACILITY_TYPES)).toBe(true);
  });

  it('exposes the facility-status taxonomy', () => {
    expect(FACILITY_STATUSES).toContain('active');
    expect(FACILITY_STATUSES).toContain('decommissioned');
    expect(Object.isFrozen(FACILITY_STATUSES)).toBe(true);
  });

  it('exposes the ownership-type taxonomy', () => {
    expect(OWNERSHIP_TYPES).toEqual(expect.arrayContaining(['owned', 'leased']));
    expect(Object.isFrozen(OWNERSHIP_TYPES)).toBe(true);
  });

  it('has ≥ 10 inspection types, all with positive cadence', () => {
    expect(INSPECTION_TYPES.length).toBeGreaterThanOrEqual(10);
    for (const t of INSPECTION_TYPES) {
      expect(typeof t.code).toBe('string');
      expect(typeof t.labelAr).toBe('string');
      expect(typeof t.cadenceDays).toBe('number');
      expect(t.cadenceDays).toBeGreaterThan(0);
    }
  });

  it('inspection-type codes are unique', () => {
    const codes = INSPECTION_TYPES.map(t => t.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('finding pause statuses match the facility SLA pauseOnStates', () => {
    const sla = require('../config/sla.registry').byId('facility.inspection.closeout');
    expect(sla).toBeTruthy();
    for (const p of FINDING_PAUSE_STATUSES) {
      expect(sla.pauseOnStates).toContain(p);
    }
  });
});

describe('Facility registry — lookups', () => {
  it('inspectionTypeByCode returns match or null', () => {
    expect(inspectionTypeByCode('fire_safety')).toBeTruthy();
    expect(inspectionTypeByCode('does_not_exist')).toBeNull();
  });

  it('slaPolicyForFinding returns the facility closeout policy', () => {
    expect(slaPolicyForFinding({ severity: 'critical' })).toBe('facility.inspection.closeout');
  });
});

describe('Facility registry — shouldSpawnWorkOrder', () => {
  it('spawns for critical + major severities', () => {
    expect(shouldSpawnWorkOrder({ severity: 'critical' })).toBe(true);
    expect(shouldSpawnWorkOrder({ severity: 'major' })).toBe(true);
  });

  it('does NOT spawn for minor / observation', () => {
    expect(shouldSpawnWorkOrder({ severity: 'minor' })).toBe(false);
    expect(shouldSpawnWorkOrder({ severity: 'observation' })).toBe(false);
  });
});

describe('Facility registry — workOrderPriorityForSeverity', () => {
  it('maps critical → critical, major → high, minor → normal, observation → low', () => {
    expect(workOrderPriorityForSeverity('critical')).toBe('critical');
    expect(workOrderPriorityForSeverity('major')).toBe('high');
    expect(workOrderPriorityForSeverity('minor')).toBe('normal');
    expect(workOrderPriorityForSeverity('observation')).toBe('low');
  });
});

describe('Facility registry — validate()', () => {
  it('passes on the shipped registry', () => {
    expect(() => validate()).not.toThrow();
    expect(validate()).toBe(true);
  });
});

describe('Facility registry — status buckets', () => {
  it('pause + resolution statuses are valid FINDING_STATUSES', () => {
    for (const s of FINDING_PAUSE_STATUSES) expect(FINDING_STATUSES).toContain(s);
    for (const s of FINDING_RESOLUTION_STATUSES) expect(FINDING_STATUSES).toContain(s);
  });

  it('pause + resolution buckets are disjoint', () => {
    const pauseSet = new Set(FINDING_PAUSE_STATUSES);
    for (const s of FINDING_RESOLUTION_STATUSES) expect(pauseSet.has(s)).toBe(false);
  });

  it('inspection statuses include scheduled→in_progress→completed→closed path', () => {
    for (const s of ['scheduled', 'in_progress', 'completed', 'closed']) {
      expect(INSPECTION_STATUSES).toContain(s);
    }
  });

  it('INSPECTION_TYPE_CODES frozen array derived from INSPECTION_TYPES', () => {
    expect(Object.isFrozen(INSPECTION_TYPE_CODES)).toBe(true);
    expect(INSPECTION_TYPE_CODES.length).toBe(INSPECTION_TYPES.length);
  });
});

describe('Facility registry — severities', () => {
  it('finding severities are ordered critical/major/minor/observation', () => {
    expect(FINDING_SEVERITIES).toEqual(['critical', 'major', 'minor', 'observation']);
  });
});
