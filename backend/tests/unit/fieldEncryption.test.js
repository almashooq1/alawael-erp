const { encrypt, decrypt, isEncrypted } = require('../../utils/fieldEncryption');

describe('fieldEncryption', () => {
  const originalKey = process.env.DATA_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.DATA_ENCRYPTION_KEY = 'unit-test-key';
  });

  afterEach(() => {
    process.env.DATA_ENCRYPTION_KEY = originalKey;
  });

  it('encrypts and decrypts values', () => {
    const value = 'sensitive-value';
    const encrypted = encrypt(value);

    expect(encrypted).not.toBe(value);
    expect(isEncrypted(encrypted)).toBe(true);
    expect(decrypt(encrypted)).toBe(value);
  });

  it('returns original when key is missing', () => {
    process.env.DATA_ENCRYPTION_KEY = '';
    const value = 'plain';
    expect(encrypt(value)).toBe(value);
  });
});
