/**
 * documentArchiveSmart.service — unit tests for the pure scoring function.
 * No DB / no mongoose dependency on `scoreDocument`.
 */

'use strict';

const { scoreDocument } = require('../services/documentArchiveSmart.service');

const NOW = new Date('2026-05-20T00:00:00Z');

function dateMonthsAgo(months) {
  const d = new Date(NOW);
  d.setMonth(d.getMonth() - months);
  return d;
}

describe('documentArchiveSmart.service — scoreDocument', () => {
  test('fresh document with no signals scores 0', () => {
    const doc = {
      createdAt: dateMonthsAgo(1),
      updatedAt: dateMonthsAgo(1),
      viewCount: 5,
      downloadCount: 1,
    };
    const { score, reasons } = scoreDocument(doc, { now: NOW, idleMonths: 6 });
    expect(score).toBe(0);
    expect(reasons).toEqual([]);
  });

  test('idle document past idleMonths gets +0.30', () => {
    const doc = {
      createdAt: dateMonthsAgo(12),
      updatedAt: dateMonthsAgo(7),
      lastViewedAt: dateMonthsAgo(7),
      viewCount: 10,
    };
    const { score, reasons } = scoreDocument(doc, { now: NOW, idleMonths: 6 });
    expect(score).toBeGreaterThanOrEqual(0.3);
    expect(reasons.some(r => r.includes('غير مستخدم'))).toBe(true);
  });

  test('expired document gets +0.30', () => {
    const doc = {
      createdAt: dateMonthsAgo(1),
      updatedAt: dateMonthsAgo(1),
      expiryDate: dateMonthsAgo(2),
      viewCount: 100,
    };
    const { score, reasons } = scoreDocument(doc, { now: NOW, idleMonths: 6 });
    expect(score).toBeGreaterThanOrEqual(0.3);
    expect(reasons).toContain('انتهت صلاحية المستند');
  });

  test('never-opened doc older than 1 year gets +0.15', () => {
    const doc = {
      createdAt: dateMonthsAgo(14),
      updatedAt: dateMonthsAgo(14),
      lastViewedAt: dateMonthsAgo(14),
      viewCount: 0,
      downloadCount: 0,
    };
    const { score, reasons } = scoreDocument(doc, { now: NOW, idleMonths: 6 });
    // idle(+0.3) + never-opened(+0.15) = 0.45
    expect(score).toBeGreaterThanOrEqual(0.45);
    expect(reasons.some(r => r.includes('لم يُفتح مطلقاً'))).toBe(true);
  });

  test('cancelled workflow gets +0.20', () => {
    const doc = {
      createdAt: dateMonthsAgo(2),
      updatedAt: dateMonthsAgo(2),
      workflowStatus: 'cancelled',
      viewCount: 3,
    };
    const { score, reasons } = scoreDocument(doc, { now: NOW, idleMonths: 6 });
    expect(score).toBeGreaterThanOrEqual(0.2);
    expect(reasons.some(r => r.includes('cancelled'))).toBe(true);
  });

  test('combined signals max at 1.0', () => {
    const doc = {
      createdAt: dateMonthsAgo(36),
      updatedAt: dateMonthsAgo(24),
      lastViewedAt: dateMonthsAgo(24),
      expiryDate: dateMonthsAgo(6),
      viewCount: 0,
      downloadCount: 0,
      workflowStatus: 'rejected',
      approvalStatus: 'مرفوض',
    };
    const { score, reasons } = scoreDocument(doc, { now: NOW, idleMonths: 6 });
    expect(score).toBeLessThanOrEqual(1);
    expect(score).toBeGreaterThanOrEqual(0.8);
    expect(reasons.length).toBeGreaterThanOrEqual(4);
  });

  test('idleMonths is configurable — high threshold suppresses idle signal', () => {
    const doc = {
      createdAt: dateMonthsAgo(10),
      lastViewedAt: dateMonthsAgo(8),
      viewCount: 5,
    };
    const lenient = scoreDocument(doc, { now: NOW, idleMonths: 24 });
    expect(lenient.score).toBe(0);
    const strict = scoreDocument(doc, { now: NOW, idleMonths: 3 });
    expect(strict.score).toBeGreaterThanOrEqual(0.3);
  });
});
