'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const mockNotify = jest.fn();
jest.mock('../../services/unifiedNotifier', () => ({
  notify: (...args) => mockNotify(...args),
}));

// W733: durable OpsAlert sink. Mock the model so unit tests assert the
// persist-first behavior without a live mongoose connection.
const mockCreate = jest.fn();
const mockSave = jest.fn();
jest.mock('../../models/OpsAlert', () => ({
  create: (...args) => mockCreate(...args),
}));

describe('services/ops-alerter', () => {
  let sendOpsAlert;
  const origEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    mockNotify.mockReset();
    mockCreate.mockReset();
    mockSave.mockReset();
    mockSave.mockResolvedValue(undefined);
    mockCreate.mockResolvedValue({ _id: 'ops-1', save: mockSave });
    process.env = { ...origEnv };
    delete process.env.OPS_ALERT_EMAIL;
    delete process.env.OPS_ALERT_PHONE;
    delete process.env.OPS_ALERT_CHANNELS;
    ({ sendOpsAlert } = require('../../services/ops-alerter'));
  });

  afterAll(() => {
    process.env = origEnv;
  });

  test('persists durably + reports no_recipients when env unset (no silent drop)', async () => {
    const r = await sendOpsAlert({ kind: 'k', subject: 's', body: 'b' });
    expect(r.success).toBe(false);
    expect(r.reason).toBe('no_recipients');
    expect(r.persisted).toBe(true);
    expect(r.opsAlertId).toBe('ops-1');
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockNotify).not.toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalledTimes(1); // delivery outcome stamped back
  });

  test('persists the alert with normalized fields even with no external sink', async () => {
    await sendOpsAlert({ kind: 'backup_failed', severity: 'critical', subject: 's', body: 'b' });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const arg = mockCreate.mock.calls[0][0];
    expect(arg.kind).toBe('backup_failed');
    expect(arg.severity).toBe('critical');
    expect(arg.status).toBe('open');
  });

  test('never throws when the durable persist itself fails', async () => {
    mockCreate.mockRejectedValue(new Error('db-down'));
    process.env.OPS_ALERT_EMAIL = 'a@x.com';
    mockNotify.mockResolvedValue({ success: true, results: [] });
    const r = await sendOpsAlert({ kind: 'k', subject: 's', body: 'b' });
    expect(r.persisted).toBe(false);
    expect(r.success).toBe(true);
    expect(mockNotify).toHaveBeenCalledTimes(1);
  });

  test('dispatches to each configured email + phone', async () => {
    process.env.OPS_ALERT_EMAIL = 'a@x.com,b@x.com';
    process.env.OPS_ALERT_PHONE = '+966500000001';
    mockNotify.mockResolvedValue({ success: true, results: [] });

    const r = await sendOpsAlert({ kind: 'backup_failed', subject: 'oops', body: 'detail' });

    expect(mockNotify).toHaveBeenCalledTimes(3);
    expect(r.success).toBe(true);

    const subjects = mockNotify.mock.calls.map(c => c[0].subject);
    subjects.forEach(s => expect(s).toMatch(/\[HIGH\]\[backup_failed\]/));
  });

  test('uses urgent priority for critical severity', async () => {
    process.env.OPS_ALERT_EMAIL = 'a@x.com';
    mockNotify.mockResolvedValue({ success: true, results: [] });

    await sendOpsAlert({ kind: 'k', severity: 'critical', subject: 's', body: 'b' });

    expect(mockNotify.mock.calls[0][0].priority).toBe('urgent');
  });

  test('swallows notify errors and returns success:false', async () => {
    process.env.OPS_ALERT_EMAIL = 'a@x.com';
    mockNotify.mockRejectedValue(new Error('email-down'));

    const r = await sendOpsAlert({ kind: 'k', subject: 's', body: 'b' });
    expect(r.success).toBe(false);
    expect(r.results[0].error).toBe('email-down');
  });

  test('honors OPS_ALERT_CHANNELS override', async () => {
    process.env.OPS_ALERT_EMAIL = 'a@x.com';
    process.env.OPS_ALERT_CHANNELS = 'email';
    mockNotify.mockResolvedValue({ success: true, results: [] });

    await sendOpsAlert({ kind: 'k', subject: 's', body: 'b' });

    expect(mockNotify.mock.calls[0][0].channels).toBe('email');
  });
});
