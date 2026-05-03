'use strict';

const rule = require('../../alerts/rules/zatca-submission-rejected');

function makeCtx({ rows, now = new Date('2026-05-02T12:00:00Z') } = {}) {
  return {
    now,
    models: {
      Invoice: {
        find: jest.fn(async filter => {
          // Naive in-memory filter. Replicates the query the rule emits.
          return rows.filter(r => {
            if (
              filter['zatca.zatcaStatus'] &&
              r.zatca?.zatcaStatus !== filter['zatca.zatcaStatus']
            ) {
              return false;
            }
            const ts = filter['zatca.submittedToZatcaAt']?.$gte;
            if (ts && (!r.zatca?.submittedToZatcaAt || r.zatca.submittedToZatcaAt < ts)) {
              return false;
            }
            return true;
          });
        }),
      },
    },
  };
}

describe('alerts/rules/zatca-submission-rejected', () => {
  test('rule metadata is well-formed', () => {
    expect(rule.id).toBe('zatca-submission-rejected');
    expect(rule.severity).toBe('high');
    expect(rule.category).toBe('financial');
    expect(typeof rule.evaluate).toBe('function');
  });

  test('returns empty when no Invoice model in context', async () => {
    const r = await rule.evaluate({});
    expect(r).toEqual([]);
  });

  test('returns empty when no rejected invoices in window', async () => {
    const ctx = makeCtx({ rows: [] });
    const r = await rule.evaluate(ctx);
    expect(r).toEqual([]);
  });

  test('queries on the canonical zatca.zatcaStatus path (not the legacy one)', async () => {
    const ctx = makeCtx({ rows: [] });
    await rule.evaluate(ctx);
    const filter = ctx.models.Invoice.find.mock.calls[0][0];
    // Mongo accepts dotted keys as literal property names — toHaveProperty
    // would interpret the dot as a path, so we read the bracket form.
    expect(filter['zatca.zatcaStatus']).toBe('REJECTED');
    expect(filter['zatca.submittedToZatcaAt']).toBeDefined();
    expect(filter['zatcaSubmission.status']).toBeUndefined(); // the bug we fixed
  });

  test('emits one finding per rejected invoice in the last 24h', async () => {
    const recent = new Date('2026-05-02T11:00:00Z'); // 1h ago
    const old = new Date('2026-04-30T00:00:00Z'); // 60h ago — outside window
    const ctx = makeCtx({
      rows: [
        {
          _id: 'i-1',
          invoiceNumber: 'INV-1',
          branchId: 'b-1',
          zatca: {
            zatcaStatus: 'REJECTED',
            submittedToZatcaAt: recent,
            zatcaErrors: ['VAT mismatch'],
            zatcaReference: 'REF-1',
          },
        },
        {
          _id: 'i-2',
          invoiceNumber: 'INV-2',
          zatca: { zatcaStatus: 'ACCEPTED', submittedToZatcaAt: recent },
        },
        {
          _id: 'i-3',
          invoiceNumber: 'INV-3',
          zatca: { zatcaStatus: 'REJECTED', submittedToZatcaAt: old }, // outside window
        },
      ],
    });

    const findings = await rule.evaluate(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0].key).toBe('zatca-rejected:i-1');
    expect(findings[0].subject).toEqual({ type: 'Invoice', id: 'i-1' });
    expect(findings[0].branchId).toBe('b-1');
    expect(findings[0].message).toContain('INV-1');
    expect(findings[0].metadata.errors).toEqual(['VAT mismatch']);
    expect(findings[0].metadata.reference).toBe('REF-1');
  });

  test('uses the ctx.now override for window calculation', async () => {
    const customNow = new Date('2030-01-01T00:00:00Z');
    const ctx = makeCtx({ rows: [], now: customNow });
    await rule.evaluate(ctx);
    const since = ctx.models.Invoice.find.mock.calls[0][0]['zatca.submittedToZatcaAt'].$gte;
    // 24h before customNow
    expect(since.getTime()).toBe(customNow.getTime() - 24 * 60 * 60 * 1000);
  });
});
