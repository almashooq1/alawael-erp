/**
 * Unit Tests — SmartMeasurementProgramEngine.js
 * Pure sync methods — trend, recommendations, matching, effectiveness
 */
'use strict';

jest.mock('mongoose', () => ({
  model: jest.fn(() => ({})),
  Schema: class {},
  Types: { ObjectId: jest.fn() },
}));
jest.mock('../../models/MeasurementModels', () => ({}));
jest.mock('../../models/RehabilitationProgramModels', () => ({}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const SmartMeasurementProgramEngine = require('../../services/SmartMeasurementProgramEngine');

let engine;
beforeEach(() => {
  engine = new SmartMeasurementProgramEngine();
});

// ═══════════════════════════════════════
//  calculateProgressTrend
// ═══════════════════════════════════════
describe('calculateProgressTrend', () => {
  it('empty previousResults → new start', () => {
    const r = engine.calculateProgressTrend([], { rawScore: 80 });
    expect(r).toEqual({ trend: 'بداية جديدة', rate: 0, recommendations: [] });
  });

  it('strong improvement (>20%) → تحسن قوي', () => {
    // prev [40] reversed → [40], push 80 → [40,80]. imp = (80-40)/40*100 = 100%
    const r = engine.calculateProgressTrend([{ rawScore: 40 }], { rawScore: 80 });
    expect(r.trend).toBe('تحسن قوي');
    expect(r.rate).toBe(100);
    expect(r.recommendations).toEqual([
      'الاستمرار في البرنامج الحالي',
      'الترقي لمستوى أعلى من الصعوبة',
    ]);
  });

  it('notable improvement (10-20%) → تحسن ملحوظ', () => {
    // prev [100] reversed → [100], push 115 → imp = 15%
    const r = engine.calculateProgressTrend([{ rawScore: 100 }], { rawScore: 115 });
    expect(r.trend).toBe('تحسن ملحوظ');
    expect(r.rate).toBe(15);
    expect(r.recommendations).toEqual(['الاستمرار مع تعزيز البرنامج قليلاً']);
  });

  it('small improvement (0-10%) → مستقر', () => {
    // prev [100] → push 105 → imp = 5%
    const r = engine.calculateProgressTrend([{ rawScore: 100 }], { rawScore: 105 });
    expect(r.trend).toBe('مستقر');
    expect(r.rate).toBe(5);
    expect(r.recommendations).toEqual(['مراجعة الاستراتيجيات المستخدمة', 'تكثيف التدخل']);
  });

  it('no change → مستقر with rate 0', () => {
    const r = engine.calculateProgressTrend([{ rawScore: 50 }], { rawScore: 50 });
    expect(r.trend).toBe('مستقر');
    expect(r.rate).toBe(0);
  });

  it('notable decline (<-10%) → انخفاض ملحوظ', () => {
    // prev [100] → push 85 → imp = -15%
    const r = engine.calculateProgressTrend([{ rawScore: 100 }], { rawScore: 85 });
    expect(r.trend).toBe('انخفاض ملحوظ');
    expect(r.rate).toBe(-15);
  });

  it('severe decline (<-20%) → انخفاض حاد', () => {
    // prev [100] → push 70 → imp = -30%
    const r = engine.calculateProgressTrend([{ rawScore: 100 }], { rawScore: 70 });
    expect(r.trend).toBe('انخفاض حاد');
    expect(r.rate).toBe(-30);
  });

  it('multiple previous results — uses reversed order', () => {
    // prev [{40},{60}] mapped → [40,60], reversed → [60,40], push 90 → [60,40,90]
    // initial=60, latest=90, imp=(90-60)/60*100 = 50%
    const r = engine.calculateProgressTrend(
      [{ rawScore: 40 }, { rawScore: 60 }],
      { rawScore: 90 }
    );
    expect(r.trend).toBe('تحسن قوي');
    expect(r.rate).toBe(50);
  });
});

// ═══════════════════════════════════════
//  generateProgressRecommendations
// ═══════════════════════════════════════
describe('generateProgressRecommendations', () => {
  it('improvement > 20 → continue + advance', () => {
    const r = engine.generateProgressRecommendations('تحسن قوي', 25);
    expect(r).toEqual([
      'الاستمرار في البرنامج الحالي',
      'الترقي لمستوى أعلى من الصعوبة',
    ]);
  });

  it('improvement 10-20 → reinforce', () => {
    const r = engine.generateProgressRecommendations('تحسن ملحوظ', 15);
    expect(r).toEqual(['الاستمرار مع تعزيز البرنامج قليلاً']);
  });

  it('improvement 0-10 → review strategies', () => {
    const r = engine.generateProgressRecommendations('مستقر', 5);
    expect(r).toEqual(['مراجعة الاستراتيجيات المستخدمة', 'تكثيف التدخل']);
  });

  it('improvement -10 to 0 → radical change', () => {
    const r = engine.generateProgressRecommendations('مستقر', -5);
    expect(r).toEqual(['تعديل جذري على البرنامج', 'اجتماع فريق متعدد التخصصات']);
  });

  it('improvement < -10 → full re-assessment', () => {
    const r = engine.generateProgressRecommendations('انخفاض حاد', -25);
    expect(r).toEqual([
      'إعادة تقييم شامل',
      'مراجعة التشخيص الأساسي',
      'استشارة متخصصين إضافيين',
    ]);
  });

  it('boundary: exactly 0 → radical change bucket', () => {
    const r = engine.generateProgressRecommendations('مستقر', 0);
    expect(r).toEqual(['تعديل جذري على البرنامج', 'اجتماع فريق متعدد التخصصات']);
  });

  it('boundary: exactly -10 → radical change bucket', () => {
    const r = engine.generateProgressRecommendations('مستقر', -10);
    expect(r).toEqual(['تعديل جذري على البرنامج', 'اجتماع فريق متعدد التخصصات']);
  });
});

// ═══════════════════════════════════════
//  calculateExpectedCompletionDate
// ═══════════════════════════════════════
describe('calculateExpectedCompletionDate', () => {
  it('default 12 weeks', () => {
    const d = engine.calculateExpectedCompletionDate();
    const expected = new Date();
    expected.setDate(expected.getDate() + 12 * 7);
    expect(Math.abs(d.getTime() - expected.getTime())).toBeLessThan(86400000);
  });

  it('custom weeks', () => {
    const d = engine.calculateExpectedCompletionDate(4);
    const expected = new Date();
    expected.setDate(expected.getDate() + 4 * 7);
    expect(Math.abs(d.getTime() - expected.getTime())).toBeLessThan(86400000);
  });

  it('returns Date object', () => {
    expect(engine.calculateExpectedCompletionDate()).toBeInstanceOf(Date);
  });
});

// ═══════════════════════════════════════
//  generateMatchReasoning
// ═══════════════════════════════════════
describe('generateMatchReasoning', () => {
  it('returns pipe-separated reasoning string', () => {
    const program = {
      targetDisabilities: ['توحد', 'تأخر نمائي'],
      objectives: [{ description: 'تحسين التواصل' }, { description: 'تنمية المهارات' }],
    };
    const result = { overallLevel: 'متوسط' };
    const r = engine.generateMatchReasoning(program, result);
    expect(typeof r).toBe('string');
    expect(r).toContain('|');
  });

  it('includes disability types', () => {
    const r = engine.generateMatchReasoning(
      { targetDisabilities: ['سمعية'], objectives: [{ description: 'x' }] },
      { overallLevel: 'خفيف' }
    );
    expect(r).toContain('سمعية');
    expect(r).toContain('يطابق نوع الإعاقة');
  });

  it('includes overall level', () => {
    const r = engine.generateMatchReasoning(
      { targetDisabilities: ['بصرية'], objectives: [{ description: 'y' }] },
      { overallLevel: 'شديد' }
    );
    expect(r).toContain('شديد');
    expect(r).toContain('مستوى الشدة المناسب');
  });

  it('includes up to 2 objectives', () => {
    const r = engine.generateMatchReasoning(
      {
        targetDisabilities: ['حركية'],
        objectives: [
          { description: 'هدف أول' },
          { description: 'هدف ثاني' },
          { description: 'هدف ثالث' },
        ],
      },
      { overallLevel: 'متوسط' }
    );
    expect(r).toContain('هدف أول');
    expect(r).toContain('هدف ثاني');
    expect(r).not.toContain('هدف ثالث');
  });

  it('handles single objective', () => {
    const r = engine.generateMatchReasoning(
      { targetDisabilities: ['ذهنية'], objectives: [{ description: 'هدف وحيد' }] },
      { overallLevel: 'خفيف' }
    );
    expect(r).toContain('هدف وحيد');
  });
});

// ═══════════════════════════════════════
//  calculateOverallEffectiveness
// ═══════════════════════════════════════
describe('calculateOverallEffectiveness', () => {
  const mkProgress = (completed, total, statuses, skill, engagement) => ({
    completedSessions: completed,
    totalPlannedSessions: total,
    objectiveProgress: statuses.map(s => ({ status: s })),
    statistics: { skillAcquisitionRate: skill, engagementScore: engagement },
  });

  it('perfect scores → "1.00"', () => {
    const p = mkProgress(10, 10, ['MET', 'EXCEEDED'], 100, 100);
    // attendance=100, objective=100, skill=100, engagement=100
    // (100*0.25 + 100*0.4 + 100*0.2 + 100*0.15)/100 = 1.00
    expect(engine.calculateOverallEffectiveness(p)).toBe('1.00');
  });

  it('all zeros → "0.00"', () => {
    const p = mkProgress(0, 10, ['NOT_MET'], 0, 0);
    // attendance=0, objective=0, skill=0, engagement=0
    expect(engine.calculateOverallEffectiveness(p)).toBe('0.00');
  });

  it('50% across all → "0.50"', () => {
    const p = mkProgress(5, 10, ['MET', 'NOT_MET'], 50, 50);
    // attendance=50, objective=50, skill=50, engagement=50
    // (50*0.25 + 50*0.4 + 50*0.2 + 50*0.15)/100 = 50/100 = 0.50
    expect(engine.calculateOverallEffectiveness(p)).toBe('0.50');
  });

  it('weighted correctly — different rates', () => {
    const p = mkProgress(8, 10, ['MET', 'MET', 'NOT_MET', 'EXCEEDED'], 60, 80);
    // attendance = 80, objective = 3/4*100 = 75, skill=60, engagement=80
    // (80*0.25 + 75*0.4 + 60*0.2 + 80*0.15)/100
    // = (20 + 30 + 12 + 12)/100 = 74/100 = 0.74
    expect(engine.calculateOverallEffectiveness(p)).toBe('0.74');
  });

  it('EXCEEDED counted as met', () => {
    const p = mkProgress(10, 10, ['EXCEEDED', 'EXCEEDED'], 100, 100);
    expect(engine.calculateOverallEffectiveness(p)).toBe('1.00');
  });

  it('missing statistics defaults to 0', () => {
    const p = {
      completedSessions: 10,
      totalPlannedSessions: 10,
      objectiveProgress: [{ status: 'MET' }],
    };
    // attendance=100, objective=100, skill=0, engagement=0
    // (100*0.25 + 100*0.4 + 0 + 0)/100 = 65/100 = 0.65
    expect(engine.calculateOverallEffectiveness(p)).toBe('0.65');
  });

  it('returns string from toFixed(2)', () => {
    const p = mkProgress(1, 3, ['MET'], 40, 60);
    const r = engine.calculateOverallEffectiveness(p);
    expect(typeof r).toBe('string');
    expect(r).toMatch(/^\d+\.\d{2}$/);
  });
});
