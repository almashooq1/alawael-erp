/**
 * document-expiry-radar-service.test.js — pure-math tests.
 */

'use strict';

const svc = require('../services/documentExpiryRadarService');

function item({
  id = 'D1',
  source = 'document',
  category = 'عقود',
  title = 'License',
  daysUntilExpiry = 45,
  status = 'active',
}) {
  const expiryDate =
    daysUntilExpiry == null ? null : new Date(Date.now() + daysUntilExpiry * 86400000);
  return { _id: id, source, category, title, expiryDate, status };
}

describe('documentExpiryRadarService.classifyWindow', () => {
  it('classifies by days-until-expiry', () => {
    expect(svc.classifyWindow(null)).toBe('unknown');
    expect(svc.classifyWindow(new Date(Date.now() - 86400000))).toBe('expired');
    expect(svc.classifyWindow(new Date(Date.now() + 5 * 86400000))).toBe('critical');
    expect(svc.classifyWindow(new Date(Date.now() + 45 * 86400000))).toBe('warning');
    expect(svc.classifyWindow(new Date(Date.now() + 200 * 86400000))).toBe('ok');
  });
});

describe('documentExpiryRadarService.summarize', () => {
  it('empty → zeros', () => {
    const s = svc.summarize([]);
    expect(s.total).toBe(0);
    expect(s.expired).toBe(0);
  });

  it('counts per window', () => {
    const s = svc.summarize([
      item({ daysUntilExpiry: -10 }),
      item({ daysUntilExpiry: 5 }),
      item({ daysUntilExpiry: 5 }),
      item({ daysUntilExpiry: 50 }),
      item({ daysUntilExpiry: 200 }),
    ]);
    expect(s.expired).toBe(1);
    expect(s.critical).toBe(2);
    expect(s.warning).toBe(1);
    expect(s.ok).toBe(1);
  });

  it('tracks per-source buckets', () => {
    const s = svc.summarize([
      item({ source: 'document', daysUntilExpiry: 5 }),
      item({ source: 'employment', daysUntilExpiry: -5 }),
    ]);
    expect(s.bySource.document.critical).toBe(1);
    expect(s.bySource.employment.expired).toBe(1);
  });
});

describe('documentExpiryRadarService.radarList', () => {
  it('excludes OK items, sorts by days-until-expiry asc', () => {
    const rows = svc.radarList([
      item({ id: 'A', daysUntilExpiry: 5 }),
      item({ id: 'B', daysUntilExpiry: -5 }),
      item({ id: 'C', daysUntilExpiry: 200 }), // OK — excluded
      item({ id: 'D', daysUntilExpiry: 45 }),
    ]);
    expect(rows.length).toBe(3);
    // expired first (negative days), then soonest expiring next
    expect(rows[0]._id).toBe('B');
    expect(rows[rows.length - 1]._id).toBe('D');
  });

  it('assigns classification window to each row', () => {
    const [expired, critical, warning] = svc.radarList([
      item({ daysUntilExpiry: -5 }),
      item({ daysUntilExpiry: 5 }),
      item({ daysUntilExpiry: 45 }),
    ]);
    expect(expired.window).toBe('expired');
    expect(critical.window).toBe('critical');
    expect(warning.window).toBe('warning');
  });

  it('honours limit', () => {
    const many = [];
    for (let i = 1; i <= 10; i++) many.push(item({ id: `A${i}`, daysUntilExpiry: i }));
    const rows = svc.radarList(many, new Date(), 3);
    expect(rows.length).toBe(3);
  });
});

describe('documentExpiryRadarService.byCategory', () => {
  it('aggregates per-category window counts', () => {
    const rows = svc.byCategory([
      item({ category: 'شهادات', daysUntilExpiry: -5 }),
      item({ category: 'شهادات', daysUntilExpiry: 5 }),
      item({ category: 'عقود', daysUntilExpiry: 200 }),
    ]);
    const certs = rows.find(r => r.category === 'شهادات');
    expect(certs.total).toBe(2);
    expect(certs.expired).toBe(1);
    expect(certs.critical).toBe(1);
  });

  it('sorts by urgent categories (expired + critical) first', () => {
    const rows = svc.byCategory([
      item({ category: 'cat-ok', daysUntilExpiry: 200 }),
      item({ category: 'cat-urgent', daysUntilExpiry: -5 }),
      item({ category: 'cat-urgent', daysUntilExpiry: 5 }),
    ]);
    expect(rows[0].category).toBe('cat-urgent');
  });
});

describe('documentExpiryRadarService.upcomingRenewals', () => {
  it('returns items expiring in the next N days', () => {
    const rows = svc.upcomingRenewals(
      [
        item({ daysUntilExpiry: 5 }),
        item({ daysUntilExpiry: 45 }),
        item({ daysUntilExpiry: -5 }), // expired — excluded
      ],
      30
    );
    expect(rows.length).toBe(1);
    expect(rows[0].daysUntilExpiry).toBe(5);
  });
});

describe('documentExpiryRadarService.detectSurge', () => {
  it('fires when next-30d load exceeds forward baseline', () => {
    const items = [];
    // Baseline: 15 items in mid-bucket positions (months 2-6). Using
    // bucket-start boundaries (e.g. day 30) is flaky because tiny clock
    // drift between item creation and detectSurge's internal `new Date()`
    // can push them into bucket 0. Mid-bucket positions (day 45/75/…) are
    // robust.
    for (let m = 2; m <= 6; m++) {
      for (let i = 0; i < 3; i++) {
        items.push(item({ daysUntilExpiry: (m - 1) * 30 + 15 + i }));
      }
    }
    // Surge: 20 items evenly spread in days 3..27 of the next-30 bucket.
    for (let i = 0; i < 20; i++) items.push(item({ daysUntilExpiry: (i % 25) + 3 }));
    const s = svc.detectSurge(items);
    expect(s.active).toBe(true);
    expect(s.current).toBe(20);
    expect(s.baselineAvg).toBe(3);
  });

  it('silent when baseline too small', () => {
    const s = svc.detectSurge([item({ daysUntilExpiry: 5 })]);
    expect(s.active).toBe(false);
    expect(s.reason).toBe('insufficient_baseline');
  });
});
