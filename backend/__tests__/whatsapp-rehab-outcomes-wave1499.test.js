/**
 * W1499 — WhatsApp rehab-outcomes drift guard
 *
 * Static (source-shape) guards + pure-function tests for the WhatsApp↔outcome
 * KPI aggregator. No DB, no boot (consistent with W1491).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const svc = require('../services/whatsapp/whatsappRehabOutcomes.service');

const ROUTE_SRC = fs.readFileSync(path.join(__dirname, '../routes/whatsapp.routes.js'), 'utf8');
const SVC_SRC = fs.readFileSync(
  path.join(__dirname, '../services/whatsapp/whatsappRehabOutcomes.service.js'),
  'utf8'
);

describe('W1499 rehab-outcomes route + service shape', () => {
  test('route declares GET /analytics/rehab-outcomes (branch-scoped, delegates)', () => {
    expect(ROUTE_SRC).toContain("'/analytics/rehab-outcomes'");
    const idx = ROUTE_SRC.indexOf("'/analytics/rehab-outcomes'");
    const slice = ROUTE_SRC.slice(idx, idx + 500);
    expect(slice).toMatch(/effectiveBranchScope\(req\)/);
    expect(slice).toMatch(/whatsappRehabOutcomes\.buildRehabOutcomes/);
  });

  test('route wires the service require', () => {
    expect(ROUTE_SRC).toMatch(
      /require\(['"]\.\.\/services\/whatsapp\/whatsappRehabOutcomes\.service['"]\)/
    );
  });

  test('service is defensive (lazy mongoose.model + Promise.allSettled)', () => {
    expect(SVC_SRC).toMatch(/mongoose\.model\(/);
    expect(SVC_SRC).toMatch(/Promise\.allSettled/);
  });
});

describe('W1499 pure helpers', () => {
  test('pct rounds to 1 decimal + 0-safe denominator', () => {
    expect(svc.pct(1, 4)).toBe(25);
    expect(svc.pct(1, 3)).toBe(33.3);
    expect(svc.pct(3, 3)).toBe(100);
    expect(svc.pct(5, 0)).toBe(0);
    expect(svc.pct(0, 0)).toBe(0);
  });

  test('splitSegments derives the complement (overall − within) + caps within', () => {
    const s = svc.splitSegments({ overallTotal: 10, overallHit: 4, withinTotal: 6, withinHit: 1 });
    expect(s.withWhatsApp).toEqual({ total: 6, hit: 1 });
    expect(s.withoutWhatsApp).toEqual({ total: 4, hit: 3 });
    // within can never exceed overall
    const capped = svc.splitSegments({
      overallTotal: 2,
      overallHit: 1,
      withinTotal: 9,
      withinHit: 9,
    });
    expect(capped.withWhatsApp).toEqual({ total: 2, hit: 1 });
    expect(capped.withoutWhatsApp).toEqual({ total: 0, hit: 0 });
  });

  test('noShowBlock / goalBlock compute rates per segment', () => {
    const ns = svc.noShowBlock(
      svc.splitSegments({ overallTotal: 10, overallHit: 4, withinTotal: 6, withinHit: 1 })
    );
    expect(ns.withWhatsApp).toEqual({ total: 6, noShow: 1, ratePct: 16.7 });
    expect(ns.withoutWhatsApp).toEqual({ total: 4, noShow: 3, ratePct: 75 });

    const g = svc.goalBlock(
      svc.splitSegments({ overallTotal: 8, overallHit: 5, withinTotal: 5, withinHit: 4 })
    );
    expect(g.withWhatsApp).toEqual({ total: 5, achieved: 4, achievedPct: 80 });
    expect(g.withoutWhatsApp).toEqual({ total: 3, achieved: 1, achievedPct: 33.3 });
  });

  test('emptyOutcomes has the full KPI shape', () => {
    const e = svc.emptyOutcomes({}, 90);
    expect(e.windowDays).toBe(90);
    expect(e.adoption).toEqual({ withWhatsApp: 0, totalActive: 0, pct: 0 });
    expect(e.noShow.withWhatsApp.ratePct).toBe(0);
    expect(e.goals.withoutWhatsApp.achievedPct).toBe(0);
    expect(e.nps).toEqual({ average: null, count: 0 });
    expect(e.engagement).toEqual({ conversations: 0, familiesEngaged: 0 });
  });
});

describe('W1499 buildRehabOutcomes is defensive', () => {
  test('no registered models / null branch → empty shape without throwing', async () => {
    const out = await svc.buildRehabOutcomes(null, { now: 1_700_000_000_000 });
    expect(out.adoption.pct).toBe(0);
    expect(out.noShow.withWhatsApp.total).toBe(0);
    expect(out.nps.count).toBe(0);
    expect(out.windowDays).toBe(svc.DEFAULT_WINDOW_DAYS);
  });
});
