/**
 * Unit Tests — waitlistPriority.service.js
 * Pure waitlist scoring logic — NO mocks needed
 */
'use strict';

const wl = require('../../services/scheduling/waitlistPriority.service');

// ═══════════════════════════════════════
//  Constants
// ═══════════════════════════════════════
describe('constants', () => {
  it('MAX / MIN / BASE', () => {
    expect(wl.MAX_PRIORITY_SCORE).toBe(100);
    expect(wl.MIN_PRIORITY_SCORE).toBe(0);
    expect(wl.BASE_PRIORITY_SCORE).toBe(50);
  });

  it('WAIT bonus', () => {
    expect(wl.MAX_WAIT_BONUS).toBe(20);
    expect(wl.WAIT_BONUS_PER_WEEK).toBe(2);
    expect(wl.OFFER_EXPIRY_HOURS).toBe(4);
  });

  it('WAITLIST_STATUS', () => {
    expect(wl.WAITLIST_STATUS.WAITING).toBe('waiting');
    expect(wl.WAITLIST_STATUS.OFFERED).toBe('offered');
    expect(wl.WAITLIST_STATUS.ACCEPTED).toBe('accepted');
    expect(wl.WAITLIST_STATUS.DECLINED).toBe('declined');
    expect(wl.WAITLIST_STATUS.EXPIRED).toBe('expired');
    expect(wl.WAITLIST_STATUS.REMOVED).toBe('removed');
  });

  it('PRIORITY_LEVELS', () => {
    expect(wl.PRIORITY_LEVELS.URGENT).toBe('urgent');
    expect(wl.PRIORITY_LEVELS.HIGH).toBe('high');
    expect(wl.PRIORITY_LEVELS.NORMAL).toBe('normal');
    expect(wl.PRIORITY_LEVELS.LOW).toBe('low');
  });

  it('DISABILITY_SEVERITY_SCORES', () => {
    expect(wl.DISABILITY_SEVERITY_SCORES.severe).toBe(40);
    expect(wl.DISABILITY_SEVERITY_SCORES.moderate).toBe(25);
    expect(wl.DISABILITY_SEVERITY_SCORES.mild).toBe(10);
    expect(wl.DISABILITY_SEVERITY_SCORES.unspecified).toBe(15);
  });

  it('AGE_PRIORITY_SCORES', () => {
    expect(wl.AGE_PRIORITY_SCORES.infant).toBe(30);
    expect(wl.AGE_PRIORITY_SCORES.toddler).toBe(25);
    expect(wl.AGE_PRIORITY_SCORES.child).toBe(15);
    expect(wl.AGE_PRIORITY_SCORES.teen).toBe(10);
    expect(wl.AGE_PRIORITY_SCORES.adult).toBe(5);
  });
});

// ═══════════════════════════════════════
//  getAgeCategory  (returns string)
// ═══════════════════════════════════════
describe('getAgeCategory', () => {
  it('infant <3', () => expect(wl.getAgeCategory(2)).toBe('infant'));
  it('toddler 3-5', () => expect(wl.getAgeCategory(4)).toBe('toddler'));
  it('child 6-11', () => expect(wl.getAgeCategory(10)).toBe('child'));
  it('teen 12-17', () => expect(wl.getAgeCategory(15)).toBe('teen'));
  it('adult 18+', () => expect(wl.getAgeCategory(25)).toBe('adult'));
  it('negative → adult', () => expect(wl.getAgeCategory(-1)).toBe('adult'));
});

// ═══════════════════════════════════════
//  calculateAgeScore
// ═══════════════════════════════════════
describe('calculateAgeScore', () => {
  it('infant=30', () => expect(wl.calculateAgeScore(2)).toBe(30));
  it('toddler=25', () => expect(wl.calculateAgeScore(5)).toBe(25));
  it('child=15', () => expect(wl.calculateAgeScore(10)).toBe(15));
  it('teen=10', () => expect(wl.calculateAgeScore(15)).toBe(10));
  it('adult=5', () => expect(wl.calculateAgeScore(25)).toBe(5));
});

// ═══════════════════════════════════════
//  calculateSeverityScore
// ═══════════════════════════════════════
describe('calculateSeverityScore', () => {
  it('severe=40', () => expect(wl.calculateSeverityScore('severe')).toBe(40));
  it('moderate=25', () => expect(wl.calculateSeverityScore('moderate')).toBe(25));
  it('mild=10', () => expect(wl.calculateSeverityScore('mild')).toBe(10));
  it('unspecified=15', () => expect(wl.calculateSeverityScore('unspecified')).toBe(15));
  it('unknown → unspecified=15', () => expect(wl.calculateSeverityScore('xyz')).toBe(15));
});

// ═══════════════════════════════════════
//  calculateWaitTimeBonus
// ═══════════════════════════════════════
describe('calculateWaitTimeBonus', () => {
  it('0 days = 0 bonus', () => expect(wl.calculateWaitTimeBonus(0)).toBe(0));
  it('7 days = 2 pts', () => expect(wl.calculateWaitTimeBonus(7)).toBe(2));
  it('30 days = 8 pts (4 weeks)', () => expect(wl.calculateWaitTimeBonus(30)).toBe(8));
  it('capped at 20', () => {
    expect(wl.calculateWaitTimeBonus(200)).toBe(20);
    expect(wl.calculateWaitTimeBonus(365)).toBe(20);
  });
  it('negative → 0', () => expect(wl.calculateWaitTimeBonus(-5)).toBe(0));
});

// ═══════════════════════════════════════
//  calculatePriorityScore  (returns number 0-100)
// ═══════════════════════════════════════
describe('calculatePriorityScore', () => {
  it('returns numeric score in range', () => {
    // moderate=25 + toddler=25 + 4wk=8 + notReceiving=10 = 68
    const r = wl.calculatePriorityScore({
      ageInYears: 4,
      disabilitySeverity: 'moderate',
      waitingDays: 30,
    });
    expect(r).toBe(68);
  });

  it('higher for severe + young', () => {
    const mild = wl.calculatePriorityScore({
      ageInYears: 25,
      disabilitySeverity: 'mild',
      waitingDays: 0,
    });
    const severe = wl.calculatePriorityScore({
      ageInYears: 2,
      disabilitySeverity: 'severe',
      waitingDays: 0,
    });
    expect(severe).toBeGreaterThan(mild);
  });

  it('urgent referral adds 15', () => {
    const base = wl.calculatePriorityScore({ ageInYears: 10, disabilitySeverity: 'moderate' });
    const urgent = wl.calculatePriorityScore({
      ageInYears: 10,
      disabilitySeverity: 'moderate',
      isUrgentReferral: true,
    });
    expect(urgent).toBe(base + 15);
  });

  it('not receiving services adds 10', () => {
    const noService = wl.calculatePriorityScore({
      ageInYears: 10,
      disabilitySeverity: 'moderate',
      currentlyReceivingServices: false,
    });
    const hasService = wl.calculatePriorityScore({
      ageInYears: 10,
      disabilitySeverity: 'moderate',
      currentlyReceivingServices: true,
    });
    expect(noService).toBe(hasService + 10);
  });

  it('multiple services adds 5', () => {
    const single = wl.calculatePriorityScore({
      ageInYears: 10,
      disabilitySeverity: 'moderate',
      requestedServicesCount: 1,
    });
    const multi = wl.calculatePriorityScore({
      ageInYears: 10,
      disabilitySeverity: 'moderate',
      requestedServicesCount: 3,
    });
    expect(multi).toBe(single + 5);
  });

  it('capped at 100', () => {
    const r = wl.calculatePriorityScore({
      ageInYears: 1,
      disabilitySeverity: 'severe',
      waitingDays: 365,
      isUrgentReferral: true,
      requestedServicesCount: 5,
    });
    expect(r).toBeLessThanOrEqual(100);
  });

  it('throws for missing data', () => {
    expect(() => wl.calculatePriorityScore(null)).toThrow();
  });
});

// ═══════════════════════════════════════
//  getPriorityLevel  (returns string)
// ═══════════════════════════════════════
describe('getPriorityLevel', () => {
  it('urgent >= 80', () => expect(wl.getPriorityLevel(85)).toBe('urgent'));
  it('high 60-79', () => expect(wl.getPriorityLevel(65)).toBe('high'));
  it('normal 40-59', () => expect(wl.getPriorityLevel(50)).toBe('normal'));
  it('low <40', () => expect(wl.getPriorityLevel(20)).toBe('low'));
});

// ═══════════════════════════════════════
//  sortWaitlistByPriority
// ═══════════════════════════════════════
describe('sortWaitlistByPriority', () => {
  it('sorts desc by priorityScore', () => {
    const entries = [{ priorityScore: 30 }, { priorityScore: 90 }, { priorityScore: 60 }];
    const sorted = wl.sortWaitlistByPriority(entries);
    expect(sorted[0].priorityScore).toBe(90);
    expect(sorted[2].priorityScore).toBe(30);
  });

  it('tiebreaker: longer waitingDays first', () => {
    const entries = [
      { priorityScore: 50, waitingDays: 5 },
      { priorityScore: 50, waitingDays: 20 },
    ];
    const sorted = wl.sortWaitlistByPriority(entries);
    expect(sorted[0].waitingDays).toBe(20);
  });

  it('empty array returns empty', () => {
    expect(wl.sortWaitlistByPriority([])).toEqual([]);
  });
});

// ═══════════════════════════════════════
//  recalculatePriorities
// ═══════════════════════════════════════
describe('recalculatePriorities', () => {
  it('increases waitingDays and recalculates', () => {
    const entries = [{ ageInYears: 10, disabilitySeverity: 'moderate', waitingDays: 0 }];
    const r = wl.recalculatePriorities(entries, 7);
    expect(r[0].waitingDays).toBe(7);
    expect(r[0].priorityScore).toBeGreaterThan(0);
    expect(r[0].priorityLevel).toBeDefined();
  });

  it('severe young gets higher score than mild adult', () => {
    const entries = [
      { ageInYears: 25, disabilitySeverity: 'mild', waitingDays: 0 },
      { ageInYears: 2, disabilitySeverity: 'severe', waitingDays: 60 },
    ];
    const r = wl.recalculatePriorities(entries, 1);
    expect(r[1].priorityScore).toBeGreaterThan(r[0].priorityScore);
  });
});

// ═══════════════════════════════════════
//  filterWaitlist
// ═══════════════════════════════════════
describe('filterWaitlist', () => {
  const entries = [
    { status: 'waiting', branchId: 'br1', serviceType: 'pt', priorityScore: 80 },
    { status: 'offered', branchId: 'br2', serviceType: 'ot', priorityScore: 40 },
    { status: 'waiting', branchId: 'br1', serviceType: 'ot', priorityScore: 60 },
  ];

  it('filters by status', () => {
    const r = wl.filterWaitlist(entries, { status: 'waiting' });
    expect(r.length).toBe(2);
  });

  it('filters by branchId', () => {
    const r = wl.filterWaitlist(entries, { branchId: 'br1' });
    expect(r.length).toBe(2);
  });

  it('filters by serviceType', () => {
    const r = wl.filterWaitlist(entries, { serviceType: 'ot' });
    expect(r.length).toBe(2);
  });

  it('filters by minPriorityScore', () => {
    const r = wl.filterWaitlist(entries, { minPriorityScore: 50 });
    expect(r.length).toBe(2);
  });

  it('combines filters', () => {
    const r = wl.filterWaitlist(entries, { status: 'waiting', branchId: 'br1', serviceType: 'ot' });
    expect(r.length).toBe(1);
  });
});

// ═══════════════════════════════════════
//  getNextInLine  (requires availableSlot)
// ═══════════════════════════════════════
describe('getNextInLine', () => {
  const slot = { serviceType: 'pt', branchId: 'br1' };

  it('returns highest priority waiting entry matching slot', () => {
    const entries = [
      { status: 'offered', priorityScore: 90, branchId: 'br1', serviceType: 'pt' },
      { status: 'waiting', priorityScore: 80, branchId: 'br1', serviceType: 'pt' },
      { status: 'waiting', priorityScore: 60, branchId: 'br1', serviceType: 'pt' },
    ];
    const r = wl.getNextInLine(entries, slot);
    expect(r.priorityScore).toBe(80);
    expect(r.status).toBe('waiting');
  });

  it('returns null when no waiting match', () => {
    const entries = [{ status: 'offered', priorityScore: 90, branchId: 'br1', serviceType: 'pt' }];
    expect(wl.getNextInLine(entries, slot)).toBeNull();
  });

  it('returns null for empty', () => {
    expect(wl.getNextInLine([], slot)).toBeNull();
  });
});

// ═══════════════════════════════════════
//  createOffer
// ═══════════════════════════════════════
describe('createOffer', () => {
  it('creates offer with expiry', () => {
    const entry = { id: 'e1', beneficiaryId: 'b1' };
    const slot = {
      date: '2025-06-15',
      startTime: '09:00',
      endTime: '10:00',
      therapistId: 't1',
      branchId: 'br1',
    };
    const now = new Date('2025-06-10T08:00:00Z');
    const r = wl.createOffer(entry, slot, now);
    expect(r.entryId).toBe('e1');
    expect(r.beneficiaryId).toBe('b1');
    expect(r.offeredSlot.date).toBe('2025-06-15');
    expect(r.status).toBe('offered');
    expect(r.expiresAt).toBeDefined();
    expect(new Date(r.expiresAt).getTime()).toBe(now.getTime() + 4 * 3600000);
  });

  it('throws for missing entry/slot', () => {
    expect(() => wl.createOffer(null, {})).toThrow();
    expect(() => wl.createOffer({}, null)).toThrow();
  });
});

// ═══════════════════════════════════════
//  isOfferExpired / getRemainingOfferMinutes
// ═══════════════════════════════════════
describe('isOfferExpired', () => {
  it('not expired when future', () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    expect(wl.isOfferExpired(future)).toBe(false);
  });

  it('expired when past', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(wl.isOfferExpired(past)).toBe(true);
  });

  it('null expiresAt → expired', () => {
    expect(wl.isOfferExpired(null)).toBe(true);
  });
});

describe('getRemainingOfferMinutes', () => {
  it('positive for future', () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    expect(wl.getRemainingOfferMinutes(future)).toBeGreaterThan(50);
  });

  it('negative for expired', () => {
    const past = new Date(Date.now() - 60000).toISOString();
    expect(wl.getRemainingOfferMinutes(past)).toBeLessThan(0);
  });

  it('null → -1', () => {
    expect(wl.getRemainingOfferMinutes(null)).toBe(-1);
  });
});

// ═══════════════════════════════════════
//  calculateWaitlistStats
// ═══════════════════════════════════════
describe('calculateWaitlistStats', () => {
  it('returns full stats', () => {
    const entries = [
      { status: 'waiting', waitingDays: 30, priorityScore: 85, serviceType: 'pt' },
      { status: 'waiting', waitingDays: 10, priorityScore: 50, serviceType: 'ot' },
      { status: 'offered', waitingDays: 5, priorityScore: 70, serviceType: 'pt' },
    ];
    const r = wl.calculateWaitlistStats(entries);
    expect(r.total).toBe(3);
    expect(r.waiting).toBe(2);
    expect(r.offered).toBe(1);
    expect(r.averageWaitDays).toBe(20);
    expect(r.maxWaitDays).toBe(30);
    expect(r.urgentCount).toBe(1);
    expect(r.byServiceType).toBeDefined();
  });

  it('empty entries', () => {
    const r = wl.calculateWaitlistStats([]);
    expect(r.total).toBe(0);
    expect(r.waiting).toBe(0);
    expect(r.averageWaitDays).toBe(0);
  });

  it('no waiting entries', () => {
    const r = wl.calculateWaitlistStats([{ status: 'offered', waitingDays: 5, priorityScore: 70 }]);
    expect(r.waiting).toBe(0);
    expect(r.averageWaitDays).toBe(0);
    expect(r.averagePriorityScore).toBe(0);
  });
});

// ═══════════════════════════════════════
//  estimateWaitDays
// ═══════════════════════════════════════
describe('estimateWaitDays', () => {
  it('position/intake ratio', () => {
    // ceil(10/5) * 7 = 14
    expect(wl.estimateWaitDays(10, 5)).toBe(14);
  });

  it('partial week rounds up', () => {
    // ceil(3/5) * 7 = 7
    expect(wl.estimateWaitDays(3, 5)).toBe(7);
  });

  it('throws for position < 1', () => {
    expect(() => wl.estimateWaitDays(0, 5)).toThrow();
  });

  it('throws for zero intake', () => {
    expect(() => wl.estimateWaitDays(5, 0)).toThrow();
  });
});
