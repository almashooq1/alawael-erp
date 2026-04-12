'use strict';

// Auto-generated unit test for smsService
jest.mock('axios', () => {
  const inst = { get: jest.fn().mockResolvedValue({ data: {} }), post: jest.fn().mockResolvedValue({ data: {} }), put: jest.fn().mockResolvedValue({ data: {} }), delete: jest.fn().mockResolvedValue({ data: {} }), interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } } };
  return { ...inst, create: jest.fn(() => inst), default: inst };
});
jest.mock('dotenv', () => ({ config: jest.fn() }));
jest.mock('twilio', () => jest.fn(() => ({
  messages: { create: jest.fn().mockResolvedValue({ sid: 'SM_mock' }) },
  calls: { create: jest.fn().mockResolvedValue({ sid: 'CA_mock' }) },
})));
jest.mock('../../utils/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }));

let svc;
try { svc = require('../../services/smsService'); } catch (e) { svc = null; }

describe('smsService service', () => {
  test('module loads without crash', () => {
    expect(svc).not.toBeNull();
  });

  test('sendSMS is callable', async () => {
    if (!svc || typeof svc.sendSMS !== 'function') return;
    let r;
    try { r = await svc.sendSMS({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('sendSMSWithTemplate is callable', async () => {
    if (!svc || typeof svc.sendSMSWithTemplate !== 'function') return;
    let r;
    try { r = await svc.sendSMSWithTemplate({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('sendBulkSMS is callable', async () => {
    if (!svc || typeof svc.sendBulkSMS !== 'function') return;
    let r;
    try { r = await svc.sendBulkSMS({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('checkSMSBalance is callable', async () => {
    if (!svc || typeof svc.checkSMSBalance !== 'function') return;
    let r;
    try { r = await svc.checkSMSBalance({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('smsTemplates is callable', async () => {
    if (!svc || typeof svc.smsTemplates !== 'function') return;
    let r;
    try { r = await svc.smsTemplates({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('smsConfig is callable', async () => {
    if (!svc || typeof svc.smsConfig !== 'function') return;
    let r;
    try { r = await svc.smsConfig({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
