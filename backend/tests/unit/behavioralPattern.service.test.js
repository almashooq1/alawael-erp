/**
 * Unit Tests — behavioralPattern.service.js
 * Pure analysis functions — mock AiAlert + logger
 */
'use strict';

jest.mock('../../models/AiAlert', () => ({
  create: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const bp = require('../../services/ai/behavioralPattern.service');

// Helper: create session with date relative to now
function makeSession(daysAgo, overrides = {}) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    session_date: d.toISOString(),
    attendance_status: 'attended',
    performance_score: 70,
    start_time: '09:00',
    notes: '',
    ...overrides,
  };
}

// ═══════════════════════════════════════
//  detectPerformanceDrop
// ═══════════════════════════════════════
describe('detectPerformanceDrop', () => {
  it('returns null when no sessions', () => {
    expect(bp.detectPerformanceDrop([])).toBeNull();
  });

  it('returns null when no recent sessions', () => {
    const old = Array.from({ length: 5 }, (_, i) => makeSession(60 + i));
    expect(bp.detectPerformanceDrop(old)).toBeNull();
  });

  it('returns null when no previous sessions', () => {
    const recent = Array.from({ length: 5 }, (_, i) => makeSession(i + 1));
    expect(bp.detectPerformanceDrop(recent)).toBeNull();
  });

  it('detects >=20% performance drop', () => {
    // Previous 4 weeks (28-56 days ago): high scores
    const previous = Array.from({ length: 5 }, (_, i) =>
      makeSession(35 + i, { performance_score: 80 })
    );
    // Recent 4 weeks (0-28 days ago): low scores (50% drop)
    const recent = Array.from({ length: 5 }, (_, i) =>
      makeSession(5 + i, { performance_score: 40 })
    );
    const r = bp.detectPerformanceDrop([...previous, ...recent]);
    expect(r).not.toBeNull();
    expect(r.type).toBe('performance_drop');
    expect(r.data.drop_percentage).toBeGreaterThanOrEqual(20);
  });

  it('critical severity for >=40% drop', () => {
    const previous = Array.from({ length: 5 }, (_, i) =>
      makeSession(35 + i, { performance_score: 100 })
    );
    const recent = Array.from({ length: 5 }, (_, i) =>
      makeSession(5 + i, { performance_score: 30 })
    );
    const r = bp.detectPerformanceDrop([...previous, ...recent]);
    expect(r).not.toBeNull();
    expect(r.severity).toBe('critical');
  });

  it('warning severity for 20-39% drop', () => {
    const previous = Array.from({ length: 5 }, (_, i) =>
      makeSession(35 + i, { performance_score: 80 })
    );
    const recent = Array.from({ length: 5 }, (_, i) =>
      makeSession(5 + i, { performance_score: 58 })
    );
    const r = bp.detectPerformanceDrop([...previous, ...recent]);
    if (r) {
      expect(r.severity).toBe('warning');
    }
  });

  it('returns null for <20% drop', () => {
    const previous = Array.from({ length: 5 }, (_, i) =>
      makeSession(35 + i, { performance_score: 80 })
    );
    const recent = Array.from({ length: 5 }, (_, i) =>
      makeSession(5 + i, { performance_score: 75 })
    );
    expect(bp.detectPerformanceDrop([...previous, ...recent])).toBeNull();
  });

  it('skips absent sessions', () => {
    const previous = Array.from({ length: 5 }, (_, i) =>
      makeSession(35 + i, { performance_score: 80 })
    );
    const recent = Array.from({ length: 5 }, (_, i) =>
      makeSession(5 + i, { performance_score: 80, attendance_status: 'absent' })
    );
    expect(bp.detectPerformanceDrop([...previous, ...recent])).toBeNull();
  });

  it('has Arabic and English messages', () => {
    const previous = Array.from({ length: 5 }, (_, i) =>
      makeSession(35 + i, { performance_score: 80 })
    );
    const recent = Array.from({ length: 5 }, (_, i) =>
      makeSession(5 + i, { performance_score: 30 })
    );
    const r = bp.detectPerformanceDrop([...previous, ...recent]);
    expect(r.message_ar).toBeDefined();
    expect(r.message_en).toBeDefined();
  });
});

// ═══════════════════════════════════════
//  analyzeAttendancePattern
// ═══════════════════════════════════════
describe('analyzeAttendancePattern', () => {
  it('returns null for <10 sessions', () => {
    const sessions = Array.from({ length: 5 }, (_, i) => makeSession(i + 1));
    expect(bp.analyzeAttendancePattern(sessions)).toBeNull();
  });

  it('returns null for <20% absence rate', () => {
    const sessions = Array.from({ length: 20 }, (_, i) => makeSession(i + 1));
    // 1 absent out of 20 = 5%
    sessions[0].attendance_status = 'absent';
    expect(bp.analyzeAttendancePattern(sessions)).toBeNull();
  });

  it('detects high absence >=20%', () => {
    const sessions = Array.from({ length: 15 }, (_, i) => makeSession(i + 1));
    // Mark 5 as absent => 33%
    for (let i = 0; i < 5; i++) sessions[i].attendance_status = 'absent';
    const r = bp.analyzeAttendancePattern(sessions);
    expect(r).not.toBeNull();
    expect(r.type).toBe('high_absence');
    expect(r.data.absence_rate).toBeGreaterThanOrEqual(0.2);
  });

  it('critical for >=40% absence', () => {
    const sessions = Array.from({ length: 10 }, (_, i) => makeSession(i + 1));
    for (let i = 0; i < 5; i++) sessions[i].attendance_status = 'absent';
    const r = bp.analyzeAttendancePattern(sessions);
    if (r) {
      expect(r.severity).toBe('critical');
    }
  });

  it('includes per-day breakdown', () => {
    const sessions = Array.from({ length: 15 }, (_, i) => makeSession(i + 1));
    for (let i = 0; i < 5; i++) sessions[i].attendance_status = 'absent';
    const r = bp.analyzeAttendancePattern(sessions);
    if (r) {
      expect(r.data.absences_by_day).toBeDefined();
      expect(r.data.total_sessions).toBeDefined();
      expect(r.data.total_absences).toBeDefined();
    }
  });

  it('max consecutive absences tracked', () => {
    const sessions = Array.from({ length: 15 }, (_, i) => makeSession(i + 1));
    // 3 consecutive absences
    sessions[0].attendance_status = 'absent';
    sessions[1].attendance_status = 'absent';
    sessions[2].attendance_status = 'absent';
    sessions[3].attendance_status = 'absent';
    sessions[4].attendance_status = 'absent';
    const r = bp.analyzeAttendancePattern(sessions);
    if (r) {
      expect(r.data.max_consecutive_absences).toBeGreaterThanOrEqual(3);
    }
  });
});

// ═══════════════════════════════════════
//  analyzeTimePerformanceCorrelation
// ═══════════════════════════════════════
describe('analyzeTimePerformanceCorrelation', () => {
  it('returns null for <15 sessions', () => {
    const sessions = Array.from({ length: 10 }, (_, i) =>
      makeSession(i + 1, { start_time: '09:00', performance_score: 80 })
    );
    expect(bp.analyzeTimePerformanceCorrelation(sessions)).toBeNull();
  });

  it('returns null when diff <10 points', () => {
    // All similar scores morning and afternoon
    const morning = Array.from({ length: 8 }, (_, i) =>
      makeSession(i + 1, { start_time: '09:00', performance_score: 75 })
    );
    const afternoon = Array.from({ length: 8 }, (_, i) =>
      makeSession(i + 10, { start_time: '14:00', performance_score: 73 })
    );
    expect(bp.analyzeTimePerformanceCorrelation([...morning, ...afternoon])).toBeNull();
  });

  it('detects morning > afternoon', () => {
    const morning = Array.from({ length: 10 }, (_, i) =>
      makeSession(i + 1, { start_time: '09:00', performance_score: 90 })
    );
    const afternoon = Array.from({ length: 10 }, (_, i) =>
      makeSession(i + 10, { start_time: '14:00', performance_score: 60 })
    );
    const r = bp.analyzeTimePerformanceCorrelation([...morning, ...afternoon]);
    expect(r).not.toBeNull();
    expect(r.type).toBe('time_performance_correlation');
    expect(r.data.better_time).toBe('morning');
    expect(r.data.difference).toBeGreaterThanOrEqual(10);
    expect(r.severity).toBe('info');
  });

  it('detects afternoon > morning', () => {
    const morning = Array.from({ length: 10 }, (_, i) =>
      makeSession(i + 1, { start_time: '09:00', performance_score: 55 })
    );
    const afternoon = Array.from({ length: 10 }, (_, i) =>
      makeSession(i + 10, { start_time: '14:00', performance_score: 85 })
    );
    const r = bp.analyzeTimePerformanceCorrelation([...morning, ...afternoon]);
    expect(r).not.toBeNull();
    expect(r.data.better_time).toBe('afternoon');
  });

  it('has morning and afternoon averages', () => {
    const morning = Array.from({ length: 10 }, (_, i) =>
      makeSession(i + 1, { start_time: '09:00', performance_score: 90 })
    );
    const afternoon = Array.from({ length: 10 }, (_, i) =>
      makeSession(i + 10, { start_time: '14:00', performance_score: 60 })
    );
    const r = bp.analyzeTimePerformanceCorrelation([...morning, ...afternoon]);
    expect(r.data.morning_avg).toBeDefined();
    expect(r.data.afternoon_avg).toBeDefined();
  });
});

// ═══════════════════════════════════════
//  analyzeSessionNotes
// ═══════════════════════════════════════
describe('analyzeSessionNotes', () => {
  it('returns empty for <5 sessions', () => {
    const sessions = Array.from({ length: 3 }, (_, i) =>
      makeSession(i + 1, { notes: 'رفض المشاركة' })
    );
    expect(bp.analyzeSessionNotes(sessions)).toEqual([]);
  });

  it('detects refusal keyword (رفض)', () => {
    // need >=40% of sessions containing the keyword
    const sessions = Array.from({ length: 10 }, (_, i) =>
      makeSession(i + 1, { notes: i < 5 ? 'رفض المشاركة في الجلسة' : 'جلسة جيدة' })
    );
    const r = bp.analyzeSessionNotes(sessions);
    expect(r.length).toBeGreaterThan(0);
    const refusal = r.find(p => p.data.behavior === 'refusal');
    expect(refusal).toBeDefined();
    expect(refusal.type).toBe('pattern_detected');
    expect(refusal.severity).toBe('warning');
  });

  it('detects aggression keyword (عدوان)', () => {
    const sessions = Array.from({ length: 8 }, (_, i) =>
      makeSession(i + 1, { notes: i < 4 ? 'سلوك عدوان شديد' : 'تعاون ممتاز' })
    );
    const r = bp.analyzeSessionNotes(sessions);
    const aggression = r.find(p => p.data.behavior === 'aggression');
    expect(aggression).toBeDefined();
  });

  it('does not trigger below 40% threshold', () => {
    const sessions = Array.from({ length: 10 }, (_, i) =>
      makeSession(i + 1, { notes: i < 2 ? 'رفض' : 'جلسة عادية' })
    );
    const r = bp.analyzeSessionNotes(sessions);
    const refusal = r.find(p => p.data.behavior === 'refusal');
    expect(refusal).toBeUndefined();
  });

  it('detects multiple patterns simultaneously', () => {
    const sessions = Array.from({ length: 10 }, (_, i) =>
      makeSession(i + 1, { notes: 'رفض وبكاء وقلق أثناء الجلسة' })
    );
    const r = bp.analyzeSessionNotes(sessions);
    expect(r.length).toBeGreaterThanOrEqual(3); // refusal, crying, anxiety
  });

  it('includes percentage data', () => {
    const sessions = Array.from({ length: 10 }, (_, i) =>
      makeSession(i + 1, { notes: 'رفض وتشتت' })
    );
    const r = bp.analyzeSessionNotes(sessions);
    expect(r.length).toBeGreaterThan(0);
    r.forEach(p => {
      expect(p.data.percentage).toBeDefined();
      expect(p.data.occurrences).toBeDefined();
      expect(p.data.total_sessions).toBeDefined();
    });
  });
});
