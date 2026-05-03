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

describe('services/ops-alerter', () => {
  let sendOpsAlert;
  const origEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    mockNotify.mockReset();
    process.env = { ...origEnv };
    delete process.env.OPS_ALERT_EMAIL;
    delete process.env.OPS_ALERT_PHONE;
    delete process.env.OPS_ALERT_CHANNELS;
    ({ sendOpsAlert } = require('../../services/ops-alerter'));
  });

  afterAll(() => {
    process.env = origEnv;
  });

  test('drops alert with no_recipients reason when env unset', async () => {
    const r = await sendOpsAlert({ kind: 'k', subject: 's', body: 'b' });
    expect(r).toEqual({ success: false, reason: 'no_recipients' });
    expect(mockNotify).not.toHaveBeenCalled();
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
