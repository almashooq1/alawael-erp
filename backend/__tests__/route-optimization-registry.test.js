'use strict';

/**
 * route-optimization-registry.test.js — Phase 16 Commit 7 (4.0.72).
 *
 * Shape + drift invariants over the route-optimization registry.
 */

const {
  JOB_STATUSES,
  JOB_TERMINAL_STATUSES,
  JOB_TRANSITIONS,
  PICKUP_PRIORITIES,
  STOP_STATUSES,
  STOP_RESOLUTION_STATUSES,
  STOP_MISSED_STATUSES,
  VEHICLE_CAPABILITIES,
  DEFAULT_SHIFTS,
  canTransition,
  eventForTransition,
  isTerminal,
  slaPolicyForStop,
  priorityRank,
  geoBucketKey,
  vehicleCanServe,
  plannedArrivalAt,
  varianceMinutes,
  validate,
} = require('../config/routeOptimization.registry');

describe('Route optimization registry — sanity', () => {
  it('exposes 6 canonical job statuses', () => {
    expect(JOB_STATUSES.length).toBe(6);
  });

  it('registries are frozen', () => {
    expect(Object.isFrozen(JOB_STATUSES)).toBe(true);
    expect(Object.isFrozen(JOB_TRANSITIONS)).toBe(true);
    expect(Object.isFrozen(PICKUP_PRIORITIES)).toBe(true);
    expect(Object.isFrozen(STOP_STATUSES)).toBe(true);
    expect(Object.isFrozen(VEHICLE_CAPABILITIES)).toBe(true);
    expect(Object.isFrozen(DEFAULT_SHIFTS)).toBe(true);
  });

  it('validate() passes', () => {
    expect(() => validate()).not.toThrow();
  });

  it('terminal statuses have no outgoing transitions', () => {
    for (const t of JOB_TERMINAL_STATUSES) {
      expect(JOB_TRANSITIONS[t]).toEqual([]);
    }
  });

  it('SLA policy is transport.trip.pickup', () => {
    expect(slaPolicyForStop()).toBe('transport.trip.pickup');
    // And it's registered in the SLA registry.
    const sla = require('../config/sla.registry').byId('transport.trip.pickup');
    expect(sla).toBeTruthy();
  });
});

describe('Route optimization registry — transitions', () => {
  it('planning → optimized legal; planning → published illegal', () => {
    expect(canTransition('planning', 'optimized')).toBe(true);
    expect(canTransition('planning', 'published')).toBe(false);
  });

  it('optimized → planning (reopen) legal', () => {
    expect(canTransition('optimized', 'planning')).toBe(true);
    expect(eventForTransition('optimized', 'planning')).toBe('reopened');
  });

  it('published → in_transit legal', () => {
    expect(canTransition('published', 'in_transit')).toBe(true);
  });

  it('in_transit → completed legal', () => {
    expect(canTransition('in_transit', 'completed')).toBe(true);
  });

  it('completed has no outgoing transitions', () => {
    expect(canTransition('completed', 'cancelled')).toBe(false);
  });

  it('isTerminal works', () => {
    expect(isTerminal('completed')).toBe(true);
    expect(isTerminal('cancelled')).toBe(true);
    expect(isTerminal('planning')).toBe(false);
  });
});

describe('Route optimization registry — priorityRank', () => {
  it('medical < standard < optional', () => {
    expect(priorityRank('medical')).toBeLessThan(priorityRank('standard'));
    expect(priorityRank('standard')).toBeLessThan(priorityRank('optional'));
  });

  it('unknown priority ranks last', () => {
    expect(priorityRank('unknown')).toBeGreaterThan(priorityRank('optional'));
  });
});

describe('Route optimization registry — geoBucketKey', () => {
  it('uses postalCode prefix when available', () => {
    expect(geoBucketKey({ postalCode: '11564-xxx' })).toBe('pc:1156');
  });

  it('falls back to rounded coords', () => {
    expect(geoBucketKey({ coordinates: { lat: 24.7132, lng: 46.6753 } })).toBe('ll:24.71,46.68');
  });

  it('returns unknown when neither available', () => {
    expect(geoBucketKey({})).toBe('unknown');
  });

  it('groups nearby coords into same bucket', () => {
    const a = geoBucketKey({ coordinates: { lat: 24.713, lng: 46.677 } });
    const b = geoBucketKey({ coordinates: { lat: 24.714, lng: 46.678 } });
    expect(a).toBe(b);
  });
});

describe('Route optimization registry — vehicleCanServe', () => {
  it('vehicle missing capability cannot serve', () => {
    expect(
      vehicleCanServe(
        { capabilities: ['child_seat'] },
        { requiredCapabilities: ['wheelchair_lift'] }
      )
    ).toBe(false);
  });

  it('vehicle with all caps can serve', () => {
    expect(
      vehicleCanServe(
        { capabilities: ['wheelchair_lift', 'medical_equipment'] },
        { requiredCapabilities: ['wheelchair_lift'] }
      )
    ).toBe(true);
  });

  it('no required caps always serves', () => {
    expect(vehicleCanServe({ capabilities: [] }, { requiredCapabilities: [] })).toBe(true);
  });
});

describe('Route optimization registry — plannedArrivalAt', () => {
  it('adds minutesPerStop * stopIndex to departureTime', () => {
    const dep = new Date('2026-05-01T07:00:00Z');
    const arr = plannedArrivalAt(dep, 3, 10);
    expect(arr.getTime()).toBe(dep.getTime() + 30 * 60 * 1000);
  });

  it('stop 0 = departureTime', () => {
    const dep = new Date('2026-05-01T07:00:00Z');
    expect(plannedArrivalAt(dep, 0, 10).getTime()).toBe(dep.getTime());
  });
});

describe('Route optimization registry — varianceMinutes', () => {
  it('late = positive minutes', () => {
    const p = new Date('2026-05-01T07:10:00Z');
    const a = new Date('2026-05-01T07:15:30Z');
    expect(varianceMinutes(p, a)).toBe(6); // 5.5 rounds to 6
  });

  it('early = negative', () => {
    const p = new Date('2026-05-01T07:10:00Z');
    const a = new Date('2026-05-01T07:07:00Z');
    expect(varianceMinutes(p, a)).toBe(-3);
  });

  it('null when either side missing', () => {
    expect(varianceMinutes(null, new Date())).toBeNull();
    expect(varianceMinutes(new Date(), null)).toBeNull();
  });
});

describe('Route optimization registry — stop buckets', () => {
  it('resolution + missed statuses are valid', () => {
    for (const s of STOP_RESOLUTION_STATUSES) expect(STOP_STATUSES).toContain(s);
    for (const s of STOP_MISSED_STATUSES) expect(STOP_STATUSES).toContain(s);
  });
});
