'use strict';

jest.mock('../../models/DddEncryptionService', () => ({
  DDDEncryptionKey: {},
  ENCRYPTION_DEFAULTS: ['item1'],
  DATA_CLASSIFICATIONS: ['item1'],
  PII_FIELDS: ['item1'],
  PII_FIELD_NAMES: ['item1'],

}));

const svc = require('../../services/dddEncryptionService');

describe('dddEncryptionService service', () => {
  test('ENCRYPTION_DEFAULTS is an array', () => { expect(Array.isArray(svc.ENCRYPTION_DEFAULTS)).toBe(true); });
  test('DATA_CLASSIFICATIONS is an array', () => { expect(Array.isArray(svc.DATA_CLASSIFICATIONS)).toBe(true); });
  test('PII_FIELDS is an array', () => { expect(Array.isArray(svc.PII_FIELDS)).toBe(true); });
  test('PII_FIELD_NAMES is an array', () => { expect(Array.isArray(svc.PII_FIELD_NAMES)).toBe(true); });
  test('encrypt resolves', async () => { await expect(svc.encrypt()).resolves.not.toThrow(); });
  test('decrypt resolves', async () => { await expect(svc.decrypt()).resolves.not.toThrow(); });
  test('encryptObject resolves', async () => { await expect(svc.encryptObject()).resolves.not.toThrow(); });
  test('decryptObject resolves', async () => { await expect(svc.decryptObject()).resolves.not.toThrow(); });
  test('maskValue resolves', async () => { await expect(svc.maskValue()).resolves.not.toThrow(); });
  test('maskObject resolves', async () => { await expect(svc.maskObject()).resolves.not.toThrow(); });
  test('detectPII resolves', async () => { await expect(svc.detectPII()).resolves.not.toThrow(); });
  test('tokenize resolves', async () => { await expect(svc.tokenize()).resolves.not.toThrow(); });
  test('detokenize resolves', async () => { await expect(svc.detokenize()).resolves.not.toThrow(); });
  test('generateKey resolves', async () => { await expect(svc.generateKey()).resolves.not.toThrow(); });
  test('rotateKey resolves', async () => { await expect(svc.rotateKey()).resolves.not.toThrow(); });
  test('listKeys resolves', async () => { await expect(svc.listKeys()).resolves.not.toThrow(); });
  test('getEncryptionDashboard returns health object', async () => {
    const d = await svc.getEncryptionDashboard();
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});
