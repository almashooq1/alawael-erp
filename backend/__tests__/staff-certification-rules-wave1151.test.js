/**
 * W1151 — staff-certification expiry alert rules.
 *
 * Covers the credential model the web-admin `staff-certifications` UI actually
 * writes to (`StaffCertification`, via /api/v1/rehabilitation-advanced/...) —
 * distinct from `EmployeeCredential` (the W1147 credential-* rules). Without
 * these, expiry alerting would never fire on the org's onboarded credential
 * data because it lands in StaffCertification, not EmployeeCredential.
 *
 * Direct `evaluate(ctx)` tests with an injected fake finder (no Mongo). The
 * finder supports nested dotted keys (expiry is at certification_info.expiry_date)
 * plus the $in/$nin/$lt/$gte/$lte operators the rules use.
 */

'use strict';

const rules = require('../alerts/rules');
const expiredRule = require('../alerts/rules/staff-certification-expired');
const expiry30dRule = require('../alerts/rules/staff-certification-expiry-30d');

function shallowMatch(doc, q) {
  return Object.entries(q).every(([k, v]) => {
    const docVal = k.includes('.')
      ? k.split('.').reduce((o, p) => (o ? o[p] : undefined), doc)
      : doc[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if ('$in' in v) return v.$in.includes(docVal);
      if ('$nin' in v) return !v.$nin.includes(docVal);
      if ('$lt' in v || '$gt' in v || '$gte' in v || '$lte' in v) {
        if (docVal == null) return false;
        const d = docVal instanceof Date ? docVal.getTime() : docVal;
        if (v.$gte != null) {
          const g = v.$gte instanceof Date ? v.$gte.getTime() : v.$gte;
          if (d < g) return false;
        }
        if (v.$lte != null) {
          const l = v.$lte instanceof Date ? v.$lte.getTime() : v.$lte;
          if (d > l) return false;
        }
        if (v.$lt != null) {
          const lt = v.$lt instanceof Date ? v.$lt.getTime() : v.$lt;
          if (d >= lt) return false;
        }
        if (v.$gt != null) {
          const gt = v.$gt instanceof Date ? v.$gt.getTime() : v.$gt;
          if (d <= gt) return false;
        }
        return true;
      }
      return false;
    }
    return docVal === v;
  });
}

function finder(rows) {
  return { find: async q => rows.filter(r => shallowMatch(r, q)) };
}

const cert = (id, over = {}) => ({
  _id: id,
  staff_id: 'u-' + id,
  is_lifetime: false,
  status: 'active',
  certification_info: {
    certification_name: 'Cert ' + id,
    certification_type: 'professional',
    expiry_date: new Date('2026-05-01'),
    ...(over.certification_info || {}),
  },
  ...over,
});

describe('W1151 — staff-certification-expired', () => {
  test('fires on past-expiry certs; skips future/lifetime/revoked; severity per type', async () => {
    const now = new Date('2026-06-10');
    const StaffCertification = finder([
      cert('sc1', {
        certification_info: {
          certification_name: 'SCFHS License',
          certification_type: 'license',
          expiry_date: new Date('2026-05-01'),
        },
      }), // expired license → fires (critical)
      cert('sc2', { certification_info: { expiry_date: new Date('2026-12-01') } }), // future → skip
      cert('sc3', { is_lifetime: true }), // lifetime → skip even though expiry past
      cert('sc4', { status: 'revoked' }), // revoked → skip
    ]);
    const out = await expiredRule.evaluate({ models: { StaffCertification }, now });
    expect(out).toHaveLength(1);
    expect(out[0].subject.id).toBe('sc1');
    expect(out[0].subject.type).toBe('StaffCertification');
    expect(out[0].severity).toBe('critical'); // license
    expect(out[0].message).toContain('SCFHS License');
  });

  test('returns [] when the model is not injectable (graceful)', async () => {
    const out = await expiredRule.evaluate({ models: {}, now: new Date('2026-06-10') });
    expect(out).toEqual([]);
  });
});

describe('W1151 — staff-certification-expiry-30d', () => {
  test('fires only within the 30-day window; skips already-expired/far-future', async () => {
    const now = new Date('2026-06-10');
    const StaffCertification = finder([
      cert('sc1', { certification_info: { expiry_date: new Date('2026-06-20') } }), // ~10d → fires
      cert('sc2', { certification_info: { expiry_date: new Date('2026-09-01') } }), // >30d → skip
      cert('sc3', {
        status: 'expired',
        certification_info: { expiry_date: new Date('2026-06-20') },
      }), // already expired → skip
    ]);
    const out = await expiry30dRule.evaluate({ models: { StaffCertification }, now });
    expect(out).toHaveLength(1);
    expect(out[0].subject.id).toBe('sc1');
    expect(out[0].message).toContain('expires on');
  });
});

describe('W1151 — registration', () => {
  test('both rules are in the bundled registry with valid shape', () => {
    const found = rules.filter(r =>
      ['staff-certification-expired', 'staff-certification-expiry-30d'].includes(r.id)
    );
    expect(found).toHaveLength(2);
    for (const r of found) {
      expect(['info', 'warning', 'high', 'critical']).toContain(r.severity);
      expect(r.category).toBe('hr');
      expect(typeof r.evaluate).toBe('function');
    }
  });
});
