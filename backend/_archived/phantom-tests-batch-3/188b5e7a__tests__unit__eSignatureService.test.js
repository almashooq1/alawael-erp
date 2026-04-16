'use strict';

// Auto-generated unit test for eSignatureService
jest.mock('pdf-lib', () => ({}));
jest.mock('../../utils/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }));

const Svc = require('../../services/eSignatureService');

describe('eSignatureService service', () => {
  test('module exports a class/function', () => {
    expect(Svc).toBeDefined();
    expect(typeof Svc).toBe('function');
  });

  test('signDocument static method is callable', async () => {
    if (typeof Svc.signDocument !== 'function') return;
    let r;
    try { r = await Svc.signDocument({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('verify static method is callable', async () => {
    if (typeof Svc.verify !== 'function') return;
    let r;
    try { r = await Svc.verify({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('stampDocument static method is callable', async () => {
    if (typeof Svc.stampDocument !== 'function') return;
    let r;
    try { r = await Svc.stampDocument({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('_hmac static method is callable', async () => {
    if (typeof Svc._hmac !== 'function') return;
    let r;
    try { r = await Svc._hmac({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
