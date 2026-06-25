'use strict';

/**
 * whatsapp-rehab-outcomes-behavioral-wave1524.test.js — behavioral counterpart
 * to the static guard whatsapp-rehab-outcomes-wave1499.
 *
 * The M8 outcomes dashboard compares no-show / goal-achievement rates between
 * the WhatsApp-active and the rest. The static guard checks the source text; it
 * cannot verify the KPI MATH, which is where a silent bug would live — notably
 * the complement trick (withoutWhatsApp = overall − within) and its clamping
 * (a wrong denominator quietly skews every rate on the dashboard). These pure
 * helpers are exported precisely so the math can be unit-tested; this file does
 * that (no DB, no boot — the mocked mongoose is never touched by the helpers).
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/whatsapp-rehab-outcomes-behavioral-wave1524.test.js
 */

const svc = require('../services/whatsapp/whatsappRehabOutcomes.service');

describe('W1524 pct — 1-decimal percentage, safe denominator', () => {
  test('rounds to one decimal', () => {
    expect(svc.pct(1, 3)).toBe(33.3);
    expect(svc.pct(2, 3)).toBe(66.7);
    expect(svc.pct(5, 10)).toBe(50);
    expect(svc.pct(1, 8)).toBe(12.5);
  });
  test('zero / negative denominator → 0 (never NaN/Infinity)', () => {
    expect(svc.pct(5, 0)).toBe(0);
    expect(svc.pct(0, 0)).toBe(0);
    expect(svc.pct(3, -2)).toBe(0);
  });
});

describe('W1524 splitSegments — complement = overall − within, with clamping', () => {
  test('normal split: without = overall − within', () => {
    const s = svc.splitSegments({ overallTotal: 100, overallHit: 40, withinTotal: 30, withinHit: 12 });
    expect(s.withWhatsApp).toEqual({ total: 30, hit: 12 });
    expect(s.withoutWhatsApp).toEqual({ total: 70, hit: 28 });
  });

  test('within clamped to overall → no negative complement', () => {
    // withinTotal exceeds overallTotal (e.g. stale id set) → clamp, not a -ve total
    const s = svc.splitSegments({ overallTotal: 100, overallHit: 40, withinTotal: 150, withinHit: 60 });
    expect(s.withWhatsApp).toEqual({ total: 100, hit: 40 });
    expect(s.withoutWhatsApp).toEqual({ total: 0, hit: 0 });
  });

  test('missing/zero fields default to 0', () => {
    const s = svc.splitSegments({});
    expect(s.withWhatsApp).toEqual({ total: 0, hit: 0 });
    expect(s.withoutWhatsApp).toEqual({ total: 0, hit: 0 });
  });

  test('hit is clamped independently of total', () => {
    const s = svc.splitSegments({ overallTotal: 50, overallHit: 10, withinTotal: 20, withinHit: 99 });
    // withinHit clamped to overallHit (10); without.hit = 10 − 10 = 0
    expect(s.withWhatsApp.hit).toBe(10);
    expect(s.withoutWhatsApp.hit).toBe(0);
  });
});

describe('W1524 noShowBlock / goalBlock — field mapping + rate via pct', () => {
  test('noShowBlock maps hit→noShow and computes ratePct per segment', () => {
    const block = svc.noShowBlock(svc.splitSegments({ overallTotal: 100, overallHit: 40, withinTotal: 30, withinHit: 12 }));
    expect(block.withWhatsApp).toEqual({ total: 30, noShow: 12, ratePct: 40 });
    expect(block.withoutWhatsApp).toEqual({ total: 70, noShow: 28, ratePct: 40 });
  });

  test('goalBlock maps hit→achieved and computes achievedPct per segment', () => {
    const block = svc.goalBlock(svc.splitSegments({ overallTotal: 80, overallHit: 60, withinTotal: 20, withinHit: 18 }));
    expect(block.withWhatsApp).toEqual({ total: 20, achieved: 18, achievedPct: 90 });
    expect(block.withoutWhatsApp).toEqual({ total: 60, achieved: 42, achievedPct: 70 });
  });

  test('zero-total segment → 0% (no divide-by-zero)', () => {
    const block = svc.noShowBlock(svc.splitSegments({ overallTotal: 10, overallHit: 3, withinTotal: 10, withinHit: 3 }));
    expect(block.withoutWhatsApp).toEqual({ total: 0, noShow: 0, ratePct: 0 });
  });
});

describe('W1524 emptyOutcomes — safe zero shape', () => {
  test('all-zero payload + sources passthrough + windowDays', () => {
    const out = svc.emptyOutcomes({ adoption: 'unavailable' }, 30);
    expect(out.windowDays).toBe(30);
    expect(out.adoption).toEqual({ withWhatsApp: 0, totalActive: 0, pct: 0 });
    expect(out.noShow.withWhatsApp.ratePct).toBe(0);
    expect(out.goals.withoutWhatsApp.achievedPct).toBe(0);
    expect(out.nps).toEqual({ average: null, count: 0 });
    expect(out.sources).toEqual({ adoption: 'unavailable' });
  });
});
