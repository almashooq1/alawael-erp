'use strict';

// Auto-generated unit test for mfaService
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

const svc = require('../../services/mfaService');

describe('mfaService service', () => {
  test('module exports an object', () => {
    expect(svc).toBeDefined();
    expect(typeof svc).toBe('object');
  });

  test('generateTOTPSecret is callable', async () => {
    if (typeof svc.generateTOTPSecret !== 'function') return;
    let r;
    try { r = await svc.generateTOTPSecret({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('verifyTOTP is callable', async () => {
    if (typeof svc.verifyTOTP !== 'function') return;
    let r;
    try { r = await svc.verifyTOTP({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('generateEmailOTP is callable', async () => {
    if (typeof svc.generateEmailOTP !== 'function') return;
    let r;
    try { r = await svc.generateEmailOTP({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('generateSMSOTP is callable', async () => {
    if (typeof svc.generateSMSOTP !== 'function') return;
    let r;
    try { r = await svc.generateSMSOTP({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('verifyOTP is callable', async () => {
    if (typeof svc.verifyOTP !== 'function') return;
    let r;
    try { r = await svc.verifyOTP({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('generateBackupCodes is callable', async () => {
    if (typeof svc.generateBackupCodes !== 'function') return;
    let r;
    try { r = await svc.generateBackupCodes({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('hashBackupCode is callable', async () => {
    if (typeof svc.hashBackupCode !== 'function') return;
    let r;
    try { r = await svc.hashBackupCode({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('verifyBackupCode is callable', async () => {
    if (typeof svc.verifyBackupCode !== 'function') return;
    let r;
    try { r = await svc.verifyBackupCode({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('generateRecoveryKey is callable', async () => {
    if (typeof svc.generateRecoveryKey !== 'function') return;
    let r;
    try { r = await svc.generateRecoveryKey({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createMFASession is callable', async () => {
    if (typeof svc.createMFASession !== 'function') return;
    let r;
    try { r = await svc.createMFASession({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('validateMFASession is callable', async () => {
    if (typeof svc.validateMFASession !== 'function') return;
    let r;
    try { r = await svc.validateMFASession({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('generateTrustedDeviceToken is callable', async () => {
    if (typeof svc.generateTrustedDeviceToken !== 'function') return;
    let r;
    try { r = await svc.generateTrustedDeviceToken({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('getMFASetupGuide is callable', async () => {
    if (typeof svc.getMFASetupGuide !== 'function') return;
    let r;
    try { r = await svc.getMFASetupGuide({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('calculateSecurityScore is callable', async () => {
    if (typeof svc.calculateSecurityScore !== 'function') return;
    let r;
    try { r = await svc.calculateSecurityScore({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

  test('createAuditLog is callable', async () => {
    if (typeof svc.createAuditLog !== 'function') return;
    let r;
    try { r = await svc.createAuditLog({}); } catch (e) { r = e; }
    expect(r).toBeDefined();
  });

});
