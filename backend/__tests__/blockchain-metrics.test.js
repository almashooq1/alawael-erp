/**
 * blockchain-metrics.test.js — pure counter tests.
 *
 * Counters are observability — they MUST never throw and MUST be monotonic
 * within a process. Verifies the Prom-friendly snapshot shape (rows of
 * { name, labels, value }).
 */

'use strict';

const m = require('../services/blockchain/metrics');

describe('blockchain metrics', () => {
  beforeEach(() => m._resetForTests());

  it('starts with an empty snapshot', () => {
    expect(m.snapshot()).toEqual([]);
  });

  it('counts certificate outcomes by label', () => {
    m.bumpCertificate('created');
    m.bumpCertificate('created');
    m.bumpCertificate('issued');
    const rows = m.snapshot();
    expect(rows).toContainEqual({
      name: 'blockchain_certificates_total',
      labels: { outcome: 'created' },
      value: 2,
    });
    expect(rows).toContainEqual({
      name: 'blockchain_certificates_total',
      labels: { outcome: 'issued' },
      value: 1,
    });
  });

  it('separates anchors by network and outcome', () => {
    m.bumpAnchor('ethereum', 'success');
    m.bumpAnchor('ethereum', 'success');
    m.bumpAnchor('ethereum', 'fail');
    m.bumpAnchor('polygon', 'success');
    const rows = m.snapshot().filter(r => r.name === 'blockchain_anchors_total');
    expect(rows).toHaveLength(3);
    expect(
      rows.find(r => r.labels.network === 'ethereum' && r.labels.outcome === 'success').value
    ).toBe(2);
    expect(
      rows.find(r => r.labels.network === 'ethereum' && r.labels.outcome === 'fail').value
    ).toBe(1);
    expect(
      rows.find(r => r.labels.network === 'polygon' && r.labels.outcome === 'success').value
    ).toBe(1);
  });

  it('coerces hashMatch into a strict-true boolean label', () => {
    m.bumpVerification('valid', true);
    m.bumpVerification('valid', false);
    m.bumpVerification('valid', undefined);
    const rows = m.snapshot().filter(r => r.name === 'blockchain_verifications_total');
    // true → "true", anything else → "false"
    const trueRow = rows.find(r => r.labels.hash_match === 'true');
    const falseRow = rows.find(r => r.labels.hash_match === 'false');
    expect(trueRow.value).toBe(1);
    expect(falseRow.value).toBe(2);
  });

  it('counts auto-issue by source + outcome', () => {
    m.bumpAutoIssue('lms', 'issued');
    m.bumpAutoIssue('lms', 'deduped');
    m.bumpAutoIssue('iep', 'error');
    const rows = m.snapshot().filter(r => r.name === 'blockchain_auto_issue_total');
    expect(rows).toHaveLength(3);
    expect(rows.every(r => r.value === 1)).toBe(true);
  });

  it('never throws on weird input — counters are best-effort observability', () => {
    expect(() => m.bumpCertificate(undefined)).not.toThrow();
    expect(() => m.bumpAnchor(null, null)).not.toThrow();
  });

  it('snapshot is a fresh array — mutating it does not affect future bumps', () => {
    m.bumpCertificate('created');
    const snap = m.snapshot();
    snap.push({ name: 'fake', labels: {}, value: 999 });
    const snap2 = m.snapshot();
    expect(snap2.find(r => r.name === 'fake')).toBeUndefined();
  });
});
