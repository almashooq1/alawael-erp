'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const {
  encryptFile,
  decryptFile,
  generateKey,
  isEncryptedFile,
  HEADER_LEN,
  TAG_LEN,
  MAGIC,
} = require('../../utils/backup-crypto');

const tmp = (suffix = '') =>
  path.join(
    os.tmpdir(),
    `backup-crypto-test-${Date.now()}-${Math.random().toString(36).slice(2)}${suffix}`
  );

describe('utils/backup-crypto', () => {
  const tempPaths = [];
  const track = p => {
    tempPaths.push(p);
    return p;
  };

  afterEach(() => {
    while (tempPaths.length) {
      const p = tempPaths.pop();
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch {
        /* best-effort */
      }
    }
  });

  describe('generateKey', () => {
    test('returns 64-char hex (32 bytes)', () => {
      const k = generateKey();
      expect(k).toMatch(/^[0-9a-f]{64}$/);
      expect(Buffer.from(k, 'hex')).toHaveLength(32);
    });

    test('produces unique keys', () => {
      expect(generateKey()).not.toBe(generateKey());
    });
  });

  describe('round-trip', () => {
    test('encrypts and decrypts back to identical bytes', async () => {
      const keyHex = generateKey();
      const plain = track(tmp('.gz'));
      const enc = track(tmp('.gz.enc'));
      const out = track(tmp('.gz'));

      const payload = Buffer.from('the quick brown fox '.repeat(2048), 'utf8');
      fs.writeFileSync(plain, payload);

      const encMeta = await encryptFile({ inputPath: plain, outputPath: enc, keyHex });
      expect(encMeta.plaintextBytes).toBe(payload.length);
      expect(encMeta.ciphertextBytes).toBe(payload.length + HEADER_LEN + TAG_LEN);

      const decMeta = await decryptFile({ inputPath: enc, outputPath: out, keyHex });
      expect(decMeta.plaintextBytes).toBe(payload.length);

      expect(fs.readFileSync(out)).toEqual(payload);
    });

    test('handles a 1MB payload', async () => {
      const keyHex = generateKey();
      const plain = track(tmp());
      const enc = track(tmp('.enc'));
      const out = track(tmp('.dec'));

      const payload = crypto.randomBytes(1024 * 1024);
      fs.writeFileSync(plain, payload);

      await encryptFile({ inputPath: plain, outputPath: enc, keyHex });
      await decryptFile({ inputPath: enc, outputPath: out, keyHex });

      expect(fs.readFileSync(out)).toEqual(payload);
    });

    test('produces a different ciphertext on each run (random IV)', async () => {
      const keyHex = generateKey();
      const plain = track(tmp());
      fs.writeFileSync(plain, 'same plaintext');

      const e1 = track(tmp('.enc1'));
      const e2 = track(tmp('.enc2'));
      await encryptFile({ inputPath: plain, outputPath: e1, keyHex });
      await encryptFile({ inputPath: plain, outputPath: e2, keyHex });

      expect(fs.readFileSync(e1)).not.toEqual(fs.readFileSync(e2));
    });
  });

  describe('tamper detection', () => {
    test('decrypt fails on bit-flip in ciphertext', async () => {
      const keyHex = generateKey();
      const plain = track(tmp());
      const enc = track(tmp('.enc'));
      fs.writeFileSync(plain, 'sensitive data');

      await encryptFile({ inputPath: plain, outputPath: enc, keyHex });

      // Flip a byte in the middle of ciphertext (skip header + tag region)
      const buf = fs.readFileSync(enc);
      const targetIdx = HEADER_LEN + 2;
      buf[targetIdx] = buf[targetIdx] ^ 0xff;
      fs.writeFileSync(enc, buf);

      await expect(
        decryptFile({ inputPath: enc, outputPath: track(tmp('.dec')), keyHex })
      ).rejects.toThrow();
    });

    test('decrypt fails on truncated tag', async () => {
      const keyHex = generateKey();
      const plain = track(tmp());
      const enc = track(tmp('.enc'));
      fs.writeFileSync(plain, 'data');

      await encryptFile({ inputPath: plain, outputPath: enc, keyHex });

      // Drop last byte of auth tag
      const buf = fs.readFileSync(enc);
      fs.writeFileSync(enc, buf.subarray(0, buf.length - 1));

      await expect(
        decryptFile({ inputPath: enc, outputPath: track(tmp('.dec')), keyHex })
      ).rejects.toThrow();
    });

    test('decrypt fails with wrong key', async () => {
      const plain = track(tmp());
      const enc = track(tmp('.enc'));
      fs.writeFileSync(plain, 'data');

      await encryptFile({ inputPath: plain, outputPath: enc, keyHex: generateKey() });

      await expect(
        decryptFile({ inputPath: enc, outputPath: track(tmp('.dec')), keyHex: generateKey() })
      ).rejects.toThrow();
    });

    test('rejects file with bad magic', async () => {
      const fake = track(tmp('.enc'));
      fs.writeFileSync(fake, Buffer.alloc(HEADER_LEN + TAG_LEN + 8));

      await expect(
        decryptFile({ inputPath: fake, outputPath: track(tmp('.dec')), keyHex: generateKey() })
      ).rejects.toThrow(/bad magic/);
    });
  });

  describe('key validation', () => {
    test('rejects missing key', async () => {
      await expect(
        encryptFile({ inputPath: '/nope', outputPath: '/nope2', keyHex: undefined })
      ).rejects.toThrow(/not set/);
    });

    test('rejects non-hex key', async () => {
      await expect(
        encryptFile({ inputPath: '/nope', outputPath: '/nope2', keyHex: 'NOT-HEX!!' })
      ).rejects.toThrow(/hex/);
    });

    test('rejects key of wrong length', async () => {
      await expect(
        encryptFile({ inputPath: '/nope', outputPath: '/nope2', keyHex: 'abcd' })
      ).rejects.toThrow(/32 bytes/);
    });
  });

  describe('isEncryptedFile', () => {
    test('returns true for AWAE-prefixed files', async () => {
      const keyHex = generateKey();
      const plain = track(tmp());
      const enc = track(tmp('.enc'));
      fs.writeFileSync(plain, 'data');

      await encryptFile({ inputPath: plain, outputPath: enc, keyHex });
      expect(isEncryptedFile(enc)).toBe(true);
    });

    test('returns false for plain files', () => {
      const p = track(tmp());
      fs.writeFileSync(p, 'just some text');
      expect(isEncryptedFile(p)).toBe(false);
    });

    test('returns false for missing files', () => {
      expect(isEncryptedFile(tmp('.nope'))).toBe(false);
    });
  });

  describe('header format', () => {
    test('emits AWAE magic + version 1', async () => {
      const keyHex = generateKey();
      const plain = track(tmp());
      const enc = track(tmp('.enc'));
      fs.writeFileSync(plain, 'x');

      await encryptFile({ inputPath: plain, outputPath: enc, keyHex });

      const head = fs.readFileSync(enc).subarray(0, HEADER_LEN);
      expect(head.subarray(0, 4)).toEqual(MAGIC);
      expect(head[4]).toBe(1);
    });
  });
});
