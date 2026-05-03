'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const mockSendOpsAlert = jest.fn().mockResolvedValue({ success: true });
jest.mock('../../services/ops-alerter', () => ({
  sendOpsAlert: (...args) => mockSendOpsAlert(...args),
}));

const {
  submitInvoiceToZatca,
  mapInvoiceToZatcaInput,
  mapZatcaStatus,
  autosubmitEnabled,
} = require('../../services/invoiceZatcaHook');

function makeInvoice(overrides = {}) {
  return {
    _id: 'inv-1',
    invoiceNumber: 'INV-2026-0001',
    issueDate: new Date('2026-04-30'),
    totalAmount: 230,
    vatAmount: 30,
    netAmount: 200,
    items: [{ description: 'PT Session', quantity: 1, unitPrice: 200 }],
    paymentMethod: 'CASH',
    branchId: 'branch-1',
    zatca: { zatcaStatus: 'NOT_SUBMITTED', invoiceType: 'SIMPLIFIED' },
    ...overrides,
  };
}

function makeInvoiceModel() {
  return { updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }) };
}

function makeZatcaService(impl = async () => ({ status: 'ACCEPTED', reference: 'ZTC-1' })) {
  return { processInvoice: jest.fn(impl) };
}

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIG_ENV };
  delete process.env.ZATCA_AUTOSUBMIT;
  mockSendOpsAlert.mockClear();
  mockSendOpsAlert.mockResolvedValue({ success: true });
});

afterAll(() => {
  process.env = ORIG_ENV;
});

describe('autosubmitEnabled', () => {
  test('returns false when env unset', () => {
    expect(autosubmitEnabled()).toBe(false);
  });

  test('returns true when ZATCA_AUTOSUBMIT=true (case-insensitive)', () => {
    process.env.ZATCA_AUTOSUBMIT = 'TRUE';
    expect(autosubmitEnabled()).toBe(true);
  });

  test('returns false on any other value', () => {
    for (const v of ['1', 'yes', 'on', '']) {
      process.env.ZATCA_AUTOSUBMIT = v;
      expect(autosubmitEnabled()).toBe(false);
    }
  });
});

describe('mapZatcaStatus', () => {
  test('maps known synonyms to canonical statuses', () => {
    expect(mapZatcaStatus('CLEARED')).toBe('ACCEPTED');
    expect(mapZatcaStatus('accepted')).toBe('ACCEPTED');
    expect(mapZatcaStatus('REJECTED')).toBe('REJECTED');
    expect(mapZatcaStatus('DENIED')).toBe('REJECTED');
    expect(mapZatcaStatus('ERROR')).toBe('REJECTED');
    expect(mapZatcaStatus('REPORTED')).toBe('SUBMITTED');
    expect(mapZatcaStatus('pending')).toBe('SUBMITTED');
  });

  test('falls back to SUBMITTED for unknown values', () => {
    expect(mapZatcaStatus('something-weird')).toBe('SUBMITTED');
    expect(mapZatcaStatus(null)).toBe('SUBMITTED');
  });
});

describe('mapInvoiceToZatcaInput', () => {
  test('translates Invoice schema into processInvoice input shape', () => {
    const inv = makeInvoice();
    const input = mapInvoiceToZatcaInput(inv);
    expect(input.invoiceNumber).toBe('INV-2026-0001');
    expect(input.totalAmount).toBe(230);
    expect(input.vatAmount).toBe(30);
    expect(input.netAmount).toBe(200);
    expect(input.invoiceType).toBe('simplified');
    expect(input.items).toHaveLength(1);
  });

  test('falls back to env vars for seller info', () => {
    process.env.ZATCA_SELLER_NAME = 'Al-Awael Centers';
    process.env.ZATCA_SELLER_VAT = '300000000000003';
    const inv = makeInvoice({ zatca: { invoiceType: 'STANDARD' } });
    const input = mapInvoiceToZatcaInput(inv);
    expect(input.sellerName).toBe('Al-Awael Centers');
    expect(input.sellerVatNumber).toBe('300000000000003');
  });

  test('computes netAmount when not present', () => {
    const inv = makeInvoice({ netAmount: undefined, totalAmount: 230, vatAmount: 30 });
    const input = mapInvoiceToZatcaInput(inv);
    expect(input.netAmount).toBe(200);
  });
});

describe('submitInvoiceToZatca — gating', () => {
  test('returns invalid_invoice when input is empty', async () => {
    const r = await submitInvoiceToZatca(null);
    expect(r).toEqual({ ok: false, error: 'invalid_invoice' });
  });

  test('skips when autosubmit flag is off', async () => {
    const zatcaService = makeZatcaService();
    const invoiceModel = makeInvoiceModel();
    const r = await submitInvoiceToZatca(makeInvoice(), { zatcaService, invoiceModel });
    expect(r).toEqual({ ok: false, skipped: 'autosubmit_disabled' });
    expect(zatcaService.processInvoice).not.toHaveBeenCalled();
  });

  test('skips already-accepted invoices (idempotent)', async () => {
    process.env.ZATCA_AUTOSUBMIT = 'true';
    const zatcaService = makeZatcaService();
    const invoiceModel = makeInvoiceModel();
    const r = await submitInvoiceToZatca(makeInvoice({ zatca: { zatcaStatus: 'ACCEPTED' } }), {
      zatcaService,
      invoiceModel,
    });
    expect(r).toEqual({ ok: false, skipped: 'already_accepted' });
    expect(zatcaService.processInvoice).not.toHaveBeenCalled();
  });

  test('force:true bypasses autosubmit + already-accepted guards', async () => {
    const zatcaService = makeZatcaService();
    const invoiceModel = makeInvoiceModel();
    const r = await submitInvoiceToZatca(makeInvoice({ zatca: { zatcaStatus: 'ACCEPTED' } }), {
      zatcaService,
      invoiceModel,
      force: true,
    });
    expect(r.ok).toBe(true);
    expect(zatcaService.processInvoice).toHaveBeenCalled();
  });
});

describe('submitInvoiceToZatca — happy path', () => {
  beforeEach(() => {
    process.env.ZATCA_AUTOSUBMIT = 'true';
  });

  test('persists ACCEPTED response back to Invoice', async () => {
    const zatcaService = makeZatcaService(async () => ({
      status: 'ACCEPTED',
      reference: 'ZTC-9001',
      uuid: 'uuid-9001',
      invoiceHash: 'h-9001',
      qrCode: 'qr-9001',
      icv: 42,
    }));
    const invoiceModel = makeInvoiceModel();

    const r = await submitInvoiceToZatca(makeInvoice(), { zatcaService, invoiceModel });

    expect(r.ok).toBe(true);
    expect(r.status).toBe('ACCEPTED');
    expect(invoiceModel.updateOne).toHaveBeenCalledTimes(1);
    const [filter, update] = invoiceModel.updateOne.mock.calls[0];
    expect(filter._id).toBe('inv-1');
    expect(update.$set['zatca.zatcaStatus']).toBe('ACCEPTED');
    expect(update.$set['zatca.zatcaReference']).toBe('ZTC-9001');
    expect(update.$set['zatca.uuid']).toBe('uuid-9001');
  });

  test('REJECTED response surfaces as ok:false but persists errors', async () => {
    const zatcaService = makeZatcaService(async () => ({
      status: 'REJECTED',
      reference: 'ZTC-9002',
      errors: ['VAT mismatch'],
    }));
    const invoiceModel = makeInvoiceModel();
    const r = await submitInvoiceToZatca(makeInvoice(), { zatcaService, invoiceModel });
    expect(r.ok).toBe(false);
    expect(r.status).toBe('REJECTED');
    const [, update] = invoiceModel.updateOne.mock.calls[0];
    expect(update.$set['zatca.zatcaStatus']).toBe('REJECTED');
    expect(update.$set['zatca.zatcaErrors']).toEqual(['VAT mismatch']);
  });

  test('CLEARED status (B2B clearance synonym) maps to ACCEPTED', async () => {
    const zatcaService = makeZatcaService(async () => ({ status: 'CLEARED' }));
    const invoiceModel = makeInvoiceModel();
    const r = await submitInvoiceToZatca(makeInvoice(), { zatcaService, invoiceModel });
    expect(r.status).toBe('ACCEPTED');
  });
});

describe('submitInvoiceToZatca — real-time alerting', () => {
  beforeEach(() => {
    process.env.ZATCA_AUTOSUBMIT = 'true';
  });

  test('fires ops-alerter on REJECTED status', async () => {
    const zatcaService = makeZatcaService(async () => ({
      status: 'REJECTED',
      reference: 'ZTC-9002',
      errors: ['VAT mismatch'],
    }));
    const invoiceModel = makeInvoiceModel();
    await submitInvoiceToZatca(makeInvoice(), { zatcaService, invoiceModel });
    expect(mockSendOpsAlert).toHaveBeenCalledTimes(1);
    const call = mockSendOpsAlert.mock.calls[0][0];
    expect(call.kind).toBe('zatca_invoice_rejected');
    expect(call.severity).toBe('high');
    expect(call.body).toContain('VAT mismatch');
    expect(call.metadata.invoiceNumber).toBe('INV-2026-0001');
  });

  test('does NOT fire ops-alerter on ACCEPTED', async () => {
    const zatcaService = makeZatcaService(async () => ({ status: 'ACCEPTED' }));
    const invoiceModel = makeInvoiceModel();
    await submitInvoiceToZatca(makeInvoice(), { zatcaService, invoiceModel });
    expect(mockSendOpsAlert).not.toHaveBeenCalled();
  });

  test('fires ops-alerter when zatcaService throws (failure path)', async () => {
    const zatcaService = {
      processInvoice: jest.fn(async () => {
        throw new Error('zatca-down');
      }),
    };
    const invoiceModel = makeInvoiceModel();
    await submitInvoiceToZatca(makeInvoice(), { zatcaService, invoiceModel });
    expect(mockSendOpsAlert).toHaveBeenCalledTimes(1);
    const call = mockSendOpsAlert.mock.calls[0][0];
    expect(call.body).toContain('zatca-down');
    expect(call.metadata.error).toBe('zatca-down');
  });

  test('ops-alerter dispatch failure does not break the bridge', async () => {
    mockSendOpsAlert.mockRejectedValueOnce(new Error('alerter-down'));
    const zatcaService = makeZatcaService(async () => ({ status: 'REJECTED' }));
    const invoiceModel = makeInvoiceModel();
    const r = await submitInvoiceToZatca(makeInvoice(), { zatcaService, invoiceModel });
    // Status still mapped + persisted — alerting is decoupled.
    expect(r.status).toBe('REJECTED');
    expect(invoiceModel.updateOne).toHaveBeenCalled();
  });
});

describe('submitInvoiceToZatca — failure modes', () => {
  beforeEach(() => {
    process.env.ZATCA_AUTOSUBMIT = 'true';
  });

  test('zatcaService throw → catches, persists REJECTED marker, returns error', async () => {
    const zatcaService = {
      processInvoice: jest.fn(async () => {
        throw new Error('zatca-down');
      }),
    };
    const invoiceModel = makeInvoiceModel();
    const r = await submitInvoiceToZatca(makeInvoice(), { zatcaService, invoiceModel });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('zatca-down');
    const [, update] = invoiceModel.updateOne.mock.calls[0];
    expect(update.$set['zatca.zatcaStatus']).toBe('REJECTED');
    expect(update.$set['zatca.zatcaErrors']).toEqual(['zatca-down']);
  });

  test('updateOne throw does not break the bridge return value', async () => {
    const zatcaService = makeZatcaService();
    const invoiceModel = {
      updateOne: jest.fn(async () => {
        throw new Error('mongo-down');
      }),
    };
    const r = await submitInvoiceToZatca(makeInvoice(), { zatcaService, invoiceModel });
    // Even when persistence fails, we report the upstream success.
    expect(r.status).toBe('ACCEPTED');
  });
});
