'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const { sweep, DEFAULTS } = require('../../services/zatcaB2cSlaSweeper');

const NOW = new Date('2026-05-02T12:00:00Z');
const HOUR = 60 * 60 * 1000;

function inv({
  id = `inv-${Math.random().toString(36).slice(2, 8)}`,
  invoiceNumber = `INV-${id}`,
  issueDate,
  zatcaStatus = 'NOT_SUBMITTED',
  invoiceType = 'SIMPLIFIED',
} = {}) {
  return {
    _id: id,
    invoiceNumber,
    issueDate,
    zatca: { invoiceType, zatcaStatus },
  };
}

function makeInvoiceModel(rows) {
  return {
    find: jest.fn(filter => {
      let r = rows;
      if (filter['zatca.invoiceType']) {
        r = r.filter(x => x.zatca?.invoiceType === filter['zatca.invoiceType']);
      }
      if (filter['zatca.zatcaStatus']?.$in) {
        const allow = new Set(filter['zatca.zatcaStatus'].$in);
        r = r.filter(x => allow.has(x.zatca?.zatcaStatus));
      }
      if (filter.issueDate?.$lte) {
        r = r.filter(x => x.issueDate && new Date(x.issueDate) <= filter.issueDate.$lte);
      }
      let limit = Infinity;
      const chain = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn(n => {
          limit = n;
          return chain;
        }),
        lean: jest.fn(() => Promise.resolve(r.slice(0, limit))),
      };
      return chain;
    }),
  };
}

function makeHook(impl = async () => ({ ok: true, status: 'ACCEPTED' })) {
  return { submitInvoiceToZatca: jest.fn(impl) };
}

function makeAlerter(impl = async () => ({ success: true })) {
  return { sendOpsAlert: jest.fn(impl) };
}

describe('services/zatcaB2cSlaSweeper.sweep', () => {
  describe('input validation', () => {
    test('returns zeroResult when Invoice model unavailable', async () => {
      const r = await sweep({ models: { Invoice: null }, now: NOW });
      expect(r.scanned).toBe(0);
      expect(r.skippedReason).toBe('invoice_model_unavailable');
    });

    test('rejects warn >= breach thresholds', async () => {
      const r = await sweep({
        models: { Invoice: makeInvoiceModel([]) },
        warnThresholdMs: 23 * HOUR,
        breachThresholdMs: 18 * HOUR,
        now: NOW,
      });
      expect(r.skippedReason).toBe('invalid_thresholds');
    });
  });

  describe('candidate selection', () => {
    test('skips STANDARD (B2B) invoices — sweep is B2C-only', async () => {
      const rows = [
        inv({
          id: 'b2b',
          invoiceType: 'STANDARD',
          issueDate: new Date(NOW.getTime() - 20 * HOUR),
        }),
        inv({
          id: 'b2c',
          invoiceType: 'SIMPLIFIED',
          issueDate: new Date(NOW.getTime() - 20 * HOUR),
        }),
      ];
      const Invoice = makeInvoiceModel(rows);
      const hook = makeHook();
      const r = await sweep({ models: { Invoice }, now: NOW, hook, alerter: makeAlerter() });
      expect(r.scanned).toBe(1);
      expect(hook.submitInvoiceToZatca).toHaveBeenCalledTimes(1);
      expect(hook.submitInvoiceToZatca.mock.calls[0][0]._id).toBe('b2c');
    });

    test('skips ACCEPTED invoices', async () => {
      const rows = [
        inv({
          id: 'a',
          zatcaStatus: 'ACCEPTED',
          issueDate: new Date(NOW.getTime() - 20 * HOUR),
        }),
        inv({
          id: 'b',
          zatcaStatus: 'NOT_SUBMITTED',
          issueDate: new Date(NOW.getTime() - 20 * HOUR),
        }),
      ];
      const Invoice = makeInvoiceModel(rows);
      const hook = makeHook();
      const r = await sweep({ models: { Invoice }, now: NOW, hook, alerter: makeAlerter() });
      expect(r.scanned).toBe(1);
    });

    test('includes REJECTED rows so transient errors get retried', async () => {
      const rows = [
        inv({
          id: 'r',
          zatcaStatus: 'REJECTED',
          issueDate: new Date(NOW.getTime() - 19 * HOUR),
        }),
      ];
      const Invoice = makeInvoiceModel(rows);
      const hook = makeHook();
      await sweep({ models: { Invoice }, now: NOW, hook, alerter: makeAlerter() });
      expect(hook.submitInvoiceToZatca).toHaveBeenCalledTimes(1);
    });

    test('skips invoices issued before the warn threshold', async () => {
      const rows = [
        inv({ id: 'fresh', issueDate: new Date(NOW.getTime() - 1 * HOUR) }), // 1h old
      ];
      const Invoice = makeInvoiceModel(rows);
      const hook = makeHook();
      const r = await sweep({ models: { Invoice }, now: NOW, hook, alerter: makeAlerter() });
      expect(r.scanned).toBe(0);
    });
  });

  describe('retry behavior', () => {
    test('counts retry success vs failure independently', async () => {
      const rows = [
        inv({ id: '1', issueDate: new Date(NOW.getTime() - 19 * HOUR) }),
        inv({ id: '2', issueDate: new Date(NOW.getTime() - 19.5 * HOUR) }),
        inv({ id: '3', issueDate: new Date(NOW.getTime() - 20 * HOUR) }),
      ];
      const Invoice = makeInvoiceModel(rows);
      const hook = {
        submitInvoiceToZatca: jest.fn(async invObj => {
          if (invObj._id === '2') return { ok: false, status: 'REJECTED' };
          return { ok: true, status: 'ACCEPTED' };
        }),
      };
      const r = await sweep({ models: { Invoice }, now: NOW, hook, alerter: makeAlerter() });
      expect(r.retried).toBe(3);
      expect(r.retrySucceeded).toBe(2);
      expect(r.retryFailed).toBe(1);
    });

    test('hook throw counts as retryFailed without breaking the batch', async () => {
      const rows = [
        inv({ id: '1', issueDate: new Date(NOW.getTime() - 19 * HOUR) }),
        inv({ id: '2', issueDate: new Date(NOW.getTime() - 19 * HOUR) }),
      ];
      const Invoice = makeInvoiceModel(rows);
      const hook = {
        submitInvoiceToZatca: jest.fn(async invObj => {
          if (invObj._id === '1') throw new Error('zatca-down');
          return { ok: true, status: 'ACCEPTED' };
        }),
      };
      const r = await sweep({ models: { Invoice }, now: NOW, hook, alerter: makeAlerter() });
      expect(r.retried).toBe(2);
      expect(r.retryFailed).toBe(1);
      expect(r.retrySucceeded).toBe(1);
    });
  });

  describe('breach alerting', () => {
    test('does NOT alert when no row crosses the breach threshold', async () => {
      const rows = [
        inv({ id: '1', issueDate: new Date(NOW.getTime() - 19 * HOUR) }), // warn but not breach
      ];
      const Invoice = makeInvoiceModel(rows);
      const alerter = makeAlerter();
      const r = await sweep({ models: { Invoice }, now: NOW, hook: makeHook(), alerter });
      expect(r.breached).toBe(0);
      expect(r.breachAlerted).toBe(false);
      expect(alerter.sendOpsAlert).not.toHaveBeenCalled();
    });

    test('fires ONE aggregated alert when 1+ rows breach', async () => {
      const rows = [
        inv({ id: 'b1', issueDate: new Date(NOW.getTime() - 23.5 * HOUR) }),
        inv({ id: 'b2', issueDate: new Date(NOW.getTime() - 24 * HOUR) }),
      ];
      const Invoice = makeInvoiceModel(rows);
      const alerter = makeAlerter();
      const r = await sweep({ models: { Invoice }, now: NOW, hook: makeHook(), alerter });
      expect(r.breached).toBe(2);
      expect(r.breachAlerted).toBe(true);
      expect(alerter.sendOpsAlert).toHaveBeenCalledTimes(1);
      const call = alerter.sendOpsAlert.mock.calls[0][0];
      expect(call.kind).toBe('zatca_b2c_sla_breach');
      expect(call.severity).toBe('critical');
      expect(call.metadata.breachIds).toEqual(['b1', 'b2']);
    });

    test('alerter throw does not break the sweep', async () => {
      const rows = [inv({ id: 'b1', issueDate: new Date(NOW.getTime() - 23.5 * HOUR) })];
      const Invoice = makeInvoiceModel(rows);
      const alerter = {
        sendOpsAlert: jest.fn(async () => {
          throw new Error('alerter-down');
        }),
      };
      const r = await sweep({ models: { Invoice }, now: NOW, hook: makeHook(), alerter });
      expect(r.breached).toBe(1);
      expect(r.breachAlerted).toBe(false); // alert failed
      expect(r.scanned).toBe(1); // sweep still completed
    });

    test('caps the alert body to 25 invoice lines (no spam on giant outages)', async () => {
      const rows = Array.from({ length: 40 }, (_, i) =>
        inv({ id: `b-${i}`, issueDate: new Date(NOW.getTime() - 24 * HOUR) })
      );
      const Invoice = makeInvoiceModel(rows);
      const alerter = makeAlerter();
      const r = await sweep({
        models: { Invoice },
        now: NOW,
        hook: makeHook(),
        alerter,
        batchSize: 100,
      });
      expect(r.breached).toBe(40);
      const body = alerter.sendOpsAlert.mock.calls[0][0].body;
      const lineCount = body.split('\n').filter(l => l.trim().startsWith('•')).length;
      expect(lineCount).toBeLessThanOrEqual(25);
      expect(body).toContain('15 فاتورة إضافية');
      // metadata still carries every breach id
      expect(alerter.sendOpsAlert.mock.calls[0][0].metadata.breachIds).toHaveLength(40);
    });
  });

  describe('default thresholds', () => {
    test('exports sensible defaults', () => {
      expect(DEFAULTS.warnThresholdMs).toBe(18 * HOUR);
      expect(DEFAULTS.breachThresholdMs).toBe(23 * HOUR);
      expect(DEFAULTS.warnThresholdMs).toBeLessThan(DEFAULTS.breachThresholdMs);
      expect(DEFAULTS.breachThresholdMs).toBeLessThan(24 * HOUR);
    });
  });
});
