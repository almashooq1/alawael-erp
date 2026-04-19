/**
 * nps-service.test.js — pure-math tests for the NPS service.
 */

'use strict';

const svc = require('../services/npsService');

function rec({ score, daysAgo = 0, comment = null, branchId = 'B1' }) {
  return {
    score,
    branchId,
    comment,
    submittedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
  };
}

describe('npsService.bucket', () => {
  it('0–6 → detractor', () => {
    [0, 3, 5, 6].forEach(s => expect(svc.bucket(s)).toBe('detractor'));
  });
  it('7–8 → passive', () => {
    [7, 8].forEach(s => expect(svc.bucket(s)).toBe('passive'));
  });
  it('9–10 → promoter', () => {
    [9, 10].forEach(s => expect(svc.bucket(s)).toBe('promoter'));
  });
  it('non-numeric → null', () => {
    expect(svc.bucket('abc')).toBeNull();
    expect(svc.bucket(null)).toBeNull();
  });
});

describe('npsService.summarize', () => {
  it('empty → sample 0, nps null, insufficient verdict', () => {
    const s = svc.summarize([]);
    expect(s.sample).toBe(0);
    expect(s.nps).toBeNull();
    expect(s.verdict).toBe('insufficient');
  });

  it('classic Bain example: 60% promoters - 20% detractors = +40 NPS', () => {
    const records = [
      ...Array.from({ length: 6 }, () => rec({ score: 10 })), // 6 promoters
      ...Array.from({ length: 2 }, () => rec({ score: 7 })), // 2 passives
      ...Array.from({ length: 2 }, () => rec({ score: 3 })), // 2 detractors
    ];
    const s = svc.summarize(records);
    expect(s.sample).toBe(10);
    expect(s.promoters).toBe(6);
    expect(s.detractors).toBe(2);
    expect(s.nps).toBe(40);
  });

  it('NPS can go negative (mostly detractors)', () => {
    const s = svc.summarize([rec({ score: 2 }), rec({ score: 4 }), rec({ score: 8 })]);
    // Below NPS_MIN_SAMPLE (10) → insufficient verdict but math still computed
    expect(s.nps).toBe(-66.7);
    expect(s.verdict).toBe('insufficient');
  });

  it('honors record.bucket if present (avoids re-bucketing)', () => {
    // Score implies promoter but bucket says detractor — model wins.
    const records = [
      { score: 9, bucket: 'detractor' },
      { score: 9, bucket: 'detractor' },
      { score: 9, bucket: 'detractor' },
    ];
    const s = svc.summarize(records);
    expect(s.detractors).toBe(3);
    expect(s.promoters).toBe(0);
  });

  it('skips invalid scores', () => {
    const s = svc.summarize([rec({ score: 8 }), { score: 'invalid' }, rec({ score: 9 })]);
    expect(s.sample).toBe(2);
  });

  it('verdict ok at sample ≥ minSample (default 10)', () => {
    const s = svc.summarize(Array.from({ length: 10 }, () => rec({ score: 9 })));
    expect(s.verdict).toBe('ok');
  });
});

describe('npsService.trendByPeriod', () => {
  it('groups by month key and sorts ascending', () => {
    const series = svc.trendByPeriod(
      [
        { score: 9, submittedAt: new Date('2026-01-15') },
        { score: 6, submittedAt: new Date('2026-02-10') },
        { score: 10, submittedAt: new Date('2026-01-20') },
      ],
      r => new Date(r.submittedAt).toISOString().slice(0, 7)
    );
    expect(series.map(s => s.periodKey)).toEqual(['2026-01', '2026-02']);
    expect(series[0].sample).toBe(2);
    expect(series[1].sample).toBe(1);
  });
});

describe('npsService.topThemes', () => {
  it('strips Arabic + English stop-words and ranks by frequency', () => {
    const comments = [
      'الموقع ممتاز والخدمة جيدة',
      'الموقع رائع لكن الانتظار طويل',
      'الموقع ممتاز جداً',
    ];
    const themes = svc.topThemes(comments, 5);
    expect(themes[0].word).toBe('الموقع');
    expect(themes[0].count).toBe(3);
  });

  it('ignores tokens shorter than 3 chars', () => {
    expect(svc.topThemes(['ok ok ok ok ok'], 5)).toEqual([]);
  });

  it('returns empty when no comments', () => {
    expect(svc.topThemes([], 5)).toEqual([]);
  });
});
