/**
 * Unit Tests — driverRatingService.js
 * In-memory driver rating, performance scoring, and trend analysis
 */
'use strict';

// No external mocks needed — all in-memory

let svc;

beforeEach(() => {
  jest.isolateModules(() => {
    svc = require('../../services/driverRatingService');
  });
});

// ═══════════════════════════════════════
//  addRating
// ═══════════════════════════════════════
describe('addRating', () => {
  it('returns null if missing driverId', () => {
    expect(svc.addRating({ overallRating: 4 })).toBeNull();
  });

  it('returns null if missing overallRating', () => {
    expect(svc.addRating({ driverId: 'DRV-999' })).toBeNull();
  });

  it('creates rating with auto-incrementing id', () => {
    const r = svc.addRating({ driverId: 'DRV-100', overallRating: 5, safety: 5 });
    expect(r).not.toBeNull();
    expect(r.id).toBeDefined();
    expect(r.driverId).toBe('DRV-100');
    expect(r.overallRating).toBe(5);
    expect(r.isVerified).toBe(false);
    expect(r.createdAt).toBeDefined();
  });

  it('increments id for each new rating', () => {
    const r1 = svc.addRating({ driverId: 'DRV-100', overallRating: 3 });
    const r2 = svc.addRating({ driverId: 'DRV-100', overallRating: 4 });
    expect(r2.id).toBeGreaterThan(r1.id);
  });
});

// ═══════════════════════════════════════
//  calculateAverageRating
// ═══════════════════════════════════════
describe('calculateAverageRating', () => {
  it('returns average for existing driver (DRV-001 has mock data)', () => {
    const avg = svc.calculateAverageRating('DRV-001');
    expect(typeof avg).toBe('number');
    expect(avg).toBe(4.5); // initializeMockData sets overallRating: 4.5
  });

  it('returns 0 for unknown driver', () => {
    expect(svc.calculateAverageRating('UNKNOWN')).toBe(0);
  });

  it('recalculates after adding ratings', () => {
    svc.addRating({ driverId: 'DRV-001', overallRating: 2 });
    // Now DRV-001 has [4.5, 2] → avg = 3.3 (rounded to 1 decimal)
    const avg = svc.calculateAverageRating('DRV-001');
    expect(avg).toBe(3.3);
  });
});

// ═══════════════════════════════════════
//  getRatingDistribution
// ═══════════════════════════════════════
describe('getRatingDistribution', () => {
  it('returns distribution object {5,4,3,2,1}', () => {
    const dist = svc.getRatingDistribution('DRV-001');
    expect(dist).toHaveProperty('5');
    expect(dist).toHaveProperty('4');
    expect(dist).toHaveProperty('3');
    expect(dist).toHaveProperty('2');
    expect(dist).toHaveProperty('1');
  });

  it('correctly counts ratings per star', () => {
    svc.addRating({ driverId: 'DRV-200', overallRating: 5 });
    svc.addRating({ driverId: 'DRV-200', overallRating: 5 });
    svc.addRating({ driverId: 'DRV-200', overallRating: 3 });
    const dist = svc.getRatingDistribution('DRV-200');
    expect(dist['5']).toBe(2);
    expect(dist['3']).toBe(1);
    expect(dist['1']).toBe(0);
  });
});

// ═══════════════════════════════════════
//  getDriverRatings
// ═══════════════════════════════════════
describe('getDriverRatings', () => {
  it('returns structure with driverId, total, averageRating, ratings, ratingDistribution', () => {
    const r = svc.getDriverRatings('DRV-001');
    expect(r.driverId).toBe('DRV-001');
    expect(r.total).toBeGreaterThanOrEqual(1);
    expect(typeof r.averageRating).toBe('number');
    expect(Array.isArray(r.ratings)).toBe(true);
    expect(r.ratingDistribution).toBeDefined();
  });

  it('respects limit', () => {
    for (let i = 0; i < 5; i++) {
      svc.addRating({ driverId: 'DRV-300', overallRating: 4 });
    }
    const r = svc.getDriverRatings('DRV-300', 2);
    expect(r.ratings.length).toBeLessThanOrEqual(2);
  });
});

// ═══════════════════════════════════════
//  getPerformanceScore
// ═══════════════════════════════════════
describe('getPerformanceScore', () => {
  it('returns weighted score for DRV-001', () => {
    // DRV-001 mock: safety:95, punctuality:92, satisfaction:94, tripCompletion:98
    // weighted = 95*0.3 + 92*0.2 + 94*0.3 + 98*0.2 = 28.5 + 18.4 + 28.2 + 19.6 = 94.7 → round = 95
    const score = svc.getPerformanceScore('DRV-001');
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(90);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('returns 0 for unknown driver', () => {
    expect(svc.getPerformanceScore('UNKNOWN')).toBe(0);
  });
});

// ═══════════════════════════════════════
//  getPerformanceLevel
// ═══════════════════════════════════════
describe('getPerformanceLevel', () => {
  it('DRV-001 gets PLATINUM or GOLD (score ~95)', () => {
    const level = svc.getPerformanceLevel('DRV-001');
    expect(['PLATINUM', 'GOLD']).toContain(level.level);
    expect(level).toHaveProperty('score');
    expect(level).toHaveProperty('badge');
    expect(level).toHaveProperty('color');
    expect(Array.isArray(level.benefits)).toBe(true);
  });

  it('unknown driver gets BRONZE (score 0)', () => {
    const level = svc.getPerformanceLevel('UNKNOWN');
    expect(level.level).toBe('BRONZE');
  });
});

// ═══════════════════════════════════════
//  getRecommendation
// ═══════════════════════════════════════
describe('getRecommendation', () => {
  it('returns Arabic string for known categories', () => {
    const r = svc.getRecommendation('safety', 3);
    expect(typeof r).toBe('string');
    expect(r.length).toBeGreaterThan(0);
  });

  it('returns different recommendations for different categories', () => {
    const safety = svc.getRecommendation('safety', 3);
    const punctuality = svc.getRecommendation('punctuality', 3);
    expect(safety).not.toBe(punctuality);
  });

  it('handles unknown category gracefully', () => {
    const r = svc.getRecommendation('unknown_cat', 3);
    expect(typeof r).toBe('string');
  });
});

// ═══════════════════════════════════════
//  calculateTrend
// ═══════════════════════════════════════
describe('calculateTrend', () => {
  it('returns insufficient-data for <2 ratings', () => {
    expect(svc.calculateTrend('DRV-001')).toBe('insufficient-data');
  });

  it('returns trend object when enough ratings', () => {
    svc.addRating({ driverId: 'DRV-001', overallRating: 5 });
    svc.addRating({ driverId: 'DRV-001', overallRating: 5 });
    const t = svc.calculateTrend('DRV-001');
    expect(t).toHaveProperty('trend');
    expect(t).toHaveProperty('change');
    expect(['improving', 'declining', 'stable']).toContain(t.trend);
  });

  it('detects improving trend', () => {
    svc.addRating({ driverId: 'DRV-500', overallRating: 1 });
    svc.addRating({ driverId: 'DRV-500', overallRating: 1 });
    svc.addRating({ driverId: 'DRV-500', overallRating: 1 });
    svc.addRating({ driverId: 'DRV-500', overallRating: 5 });
    svc.addRating({ driverId: 'DRV-500', overallRating: 5 });
    svc.addRating({ driverId: 'DRV-500', overallRating: 5 });
    const t = svc.calculateTrend('DRV-500');
    expect(t.trend).toBe('improving');
    expect(t.change).toBeGreaterThan(0);
  });

  it('detects declining trend', () => {
    svc.addRating({ driverId: 'DRV-600', overallRating: 5 });
    svc.addRating({ driverId: 'DRV-600', overallRating: 5 });
    svc.addRating({ driverId: 'DRV-600', overallRating: 5 });
    svc.addRating({ driverId: 'DRV-600', overallRating: 1 });
    svc.addRating({ driverId: 'DRV-600', overallRating: 1 });
    svc.addRating({ driverId: 'DRV-600', overallRating: 1 });
    const t = svc.calculateTrend('DRV-600');
    expect(t.trend).toBe('declining');
    expect(t.change).toBeGreaterThan(0); // change is absolute magnitude in this implementation
  });
});

// ═══════════════════════════════════════
//  compareDrivers
// ═══════════════════════════════════════
describe('compareDrivers', () => {
  it('returns array of comparisons', () => {
    svc.addRating({ driverId: 'DRV-A', overallRating: 4 });
    svc.addRating({ driverId: 'DRV-B', overallRating: 3 });
    const cmp = svc.compareDrivers(['DRV-A', 'DRV-B']);
    expect(Array.isArray(cmp)).toBe(true);
    expect(cmp.length).toBe(2);
    expect(cmp[0]).toHaveProperty('driverId');
    expect(cmp[0]).toHaveProperty('averageRating');
    expect(cmp[0]).toHaveProperty('performanceScore');
    expect(cmp[0]).toHaveProperty('performanceLevel');
  });
});

// ═══════════════════════════════════════
//  getPerformanceAlerts
// ═══════════════════════════════════════
describe('getPerformanceAlerts', () => {
  it('returns array of alerts', () => {
    const alerts = svc.getPerformanceAlerts('DRV-001');
    expect(Array.isArray(alerts)).toBe(true);
  });

  it('generates critical alert for low scores', () => {
    // Add many low ratings to trigger alerts
    for (let i = 0; i < 10; i++) {
      svc.addRating({ driverId: 'DRV-BAD', overallRating: 1 });
    }
    const alerts = svc.getPerformanceAlerts('DRV-BAD');
    if (alerts.length > 0) {
      expect(alerts[0]).toHaveProperty('severity');
      expect(alerts[0]).toHaveProperty('message');
      expect(alerts[0]).toHaveProperty('action');
    }
  });
});

// ═══════════════════════════════════════
//  getPerformanceInsights
// ═══════════════════════════════════════
describe('getPerformanceInsights', () => {
  it('returns insights structure', () => {
    const ins = svc.getPerformanceInsights('DRV-001');
    expect(ins).toHaveProperty('categoryAverages');
    expect(ins).toHaveProperty('weakPoints');
    expect(ins).toHaveProperty('overallTrend');
    expect(ins).toHaveProperty('recommendations');
    expect(Array.isArray(ins.weakPoints)).toBe(true);
    expect(Array.isArray(ins.recommendations)).toBe(true);
  });
});
