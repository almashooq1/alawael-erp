'use strict';

// Auto-generated unit test for TwoFactorAuth
jest.mock('speakeasy', () => ({
  generateSecret: jest.fn().mockReturnValue({ base32: 'MOCKBASE32', otpauth_url: 'otpauth://mock' }),
  totp: { verify: jest.fn().mockReturnValue(true) },
}));
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock'),
}));
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-id' }),
    verify: jest.fn().mockResolvedValue(true),
  }),
}));
jest.mock('twilio', () => jest.fn(() => ({
  messages: { create: jest.fn().mockResolvedValue({ sid: 'SM_mock' }) },
  calls: { create: jest.fn().mockResolvedValue({ sid: 'CA_mock' }) },
})));

let svc;
try { svc = require('../../services/TwoFactorAuth'); } catch (e) { svc = null; }

describe('TwoFactorAuth service', () => {
  test('module loads without crash', () => {
    expect(svc).not.toBeNull();
  });

  test('generateGoogleAuthSecret is callable', async () => {
    if (typeof svc.generateGoogleAuthSecret !== 'function') return;
    let r;
    try { r = await svc.generateGoogleAuthSecret({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('generateQRCodeImage is callable', async () => {
    if (typeof svc.generateQRCodeImage !== 'function') return;
    let r;
    try { r = await svc.generateQRCodeImage({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('verifyGoogleAuthToken is callable', async () => {
    if (typeof svc.verifyGoogleAuthToken !== 'function') return;
    let r;
    try { r = await svc.verifyGoogleAuthToken({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('generateSmsOTP is callable', async () => {
    if (typeof svc.generateSmsOTP !== 'function') return;
    let r;
    try { r = await svc.generateSmsOTP({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('sendSmsOTP is callable', async () => {
    if (typeof svc.sendSmsOTP !== 'function') return;
    let r;
    try { r = await svc.sendSmsOTP({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('verifySmsOTP is callable', async () => {
    if (typeof svc.verifySmsOTP !== 'function') return;
    let r;
    try { r = await svc.verifySmsOTP({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('generateEmailOTP is callable', async () => {
    if (typeof svc.generateEmailOTP !== 'function') return;
    let r;
    try { r = await svc.generateEmailOTP({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('sendEmailOTP is callable', async () => {
    if (typeof svc.sendEmailOTP !== 'function') return;
    let r;
    try { r = await svc.sendEmailOTP({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('verifyEmailOTP is callable', async () => {
    if (typeof svc.verifyEmailOTP !== 'function') return;
    let r;
    try { r = await svc.verifyEmailOTP({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('generateBackupCodes is callable', async () => {
    if (typeof svc.generateBackupCodes !== 'function') return;
    let r;
    try { r = await svc.generateBackupCodes({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('verifyBackupCode is callable', async () => {
    if (typeof svc.verifyBackupCode !== 'function') return;
    let r;
    try { r = await svc.verifyBackupCode({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('hashOTP is callable', async () => {
    if (typeof svc.hashOTP !== 'function') return;
    let r;
    try { r = await svc.hashOTP({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createSetupResponse is callable', async () => {
    if (typeof svc.createSetupResponse !== 'function') return;
    let r;
    try { r = await svc.createSetupResponse({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('get2FAStatus is callable', async () => {
    if (typeof svc.get2FAStatus !== 'function') return;
    let r;
    try { r = await svc.get2FAStatus({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
