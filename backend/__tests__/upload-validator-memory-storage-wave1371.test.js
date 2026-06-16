/**
 * W1371 — behavioral guard for memory-storage (buffer) support in
 * utils/uploadValidator.js `validateUploadedFile`.
 *
 * WHY: the validator historically read magic bytes off `file.path` only, which
 * is set by multer's diskStorage but NOT by memoryStorage (which sets
 * `file.buffer`). Any memory-storage route wiring the validator would therefore
 * throw on `fs.createReadStream(undefined)` for every legitimate upload — a
 * latent bug that blocked reusing the canonical validator on the memory-storage
 * routes (uploads.routes.js / documents.routes.js). W1371 made the magic-bytes
 * read buffer-aware (purely additive: disk-storage callers with no `file.buffer`
 * keep the exact prior path). These tests lock that contract:
 *   1. BLOCKED_MIME (svg) on a memory file (buffer, no path) -> 400, no throw.
 *   2. A genuine PNG buffer passes (next() called).
 *   3. A spoofed file (declared image/png, JPEG magic bytes) -> 400 mismatch.
 *   4. Disk-storage path still works unchanged (regression).
 *   5. getMagicBytes prefers buffer, falls back to path.
 */
'use strict';

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
}));

const fs = require('fs');
const os = require('os');
const path = require('path');

const { validateUploadedFile, getMagicBytes } = require('../utils/uploadValidator');

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe('W1371 validateUploadedFile — memory-storage (buffer) support', () => {
  test('blocks a dangerous MIME (svg) supplied via memory buffer without throwing', async () => {
    const req = {
      file: { mimetype: 'image/svg+xml', buffer: Buffer.from('<svg/>'), originalname: 'x.svg' },
    };
    const res = mockRes();
    const next = jest.fn();

    await validateUploadedFile(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts a genuine PNG supplied via memory buffer (next called)', async () => {
    const req = { file: { mimetype: 'image/png', buffer: PNG_MAGIC, originalname: 'ok.png' } };
    const res = mockRes();
    const next = jest.fn();

    await validateUploadedFile(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeNull();
  });

  test('rejects a spoofed memory file (declared png, JPEG magic bytes) -> 400 mismatch', async () => {
    const req = { file: { mimetype: 'image/png', buffer: JPEG_MAGIC, originalname: 'spoof.png' } };
    const res = mockRes();
    const next = jest.fn();

    await validateUploadedFile(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  test('regression: disk-storage path (file.path, no buffer) still validates', async () => {
    const tmp = path.join(os.tmpdir(), `w1371-${Date.now()}.png`);
    fs.writeFileSync(tmp, PNG_MAGIC);
    try {
      const req = { file: { mimetype: 'image/png', path: tmp, originalname: 'disk.png' } };
      const res = mockRes();
      const next = jest.fn();

      await validateUploadedFile(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.statusCode).toBeNull();
    } finally {
      try {
        fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
    }
  });

  test('getMagicBytes prefers buffer head and falls back to path', async () => {
    const fromBuffer = await getMagicBytes({ buffer: PNG_MAGIC });
    expect(Buffer.isBuffer(fromBuffer)).toBe(true);
    expect(fromBuffer.slice(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(true);

    const tmp = path.join(os.tmpdir(), `w1371-mb-${Date.now()}.bin`);
    fs.writeFileSync(tmp, JPEG_MAGIC);
    try {
      const fromPath = await getMagicBytes({ path: tmp });
      expect(fromPath.slice(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))).toBe(true);
    } finally {
      try {
        fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
    }
  });
});
