/**
 * @file paginate.test.js
 * اختبارات وحدة لأداة ترقيم الصفحات
 */
const { paginateMeta, DEFAULT_LIMIT, MAX_LIMIT } = require('../utils/paginate');

/* ================================================================
 *  Constants
 * ================================================================ */
describe('pagination constants', () => {
  test('DEFAULT_LIMIT is 50', () => {
    expect(DEFAULT_LIMIT).toBe(50);
  });

  test('MAX_LIMIT is 200', () => {
    expect(MAX_LIMIT).toBe(200);
  });
});

/* ================================================================
 *  paginateMeta (pure function — no Mongoose needed)
 * ================================================================ */
describe('paginateMeta', () => {
  test('returns correct meta for basic case', () => {
    const meta = paginateMeta(100, { page: 1, limit: 10 });
    expect(meta).toEqual({
      page: 1,
      limit: 10,
      total: 100,
      totalPages: 10,
    });
  });

  test('calculates totalPages with remainder', () => {
    const meta = paginateMeta(101, { page: 1, limit: 10 });
    expect(meta.totalPages).toBe(11);
  });

  test('uses default page=1 and limit=50 when no params', () => {
    const meta = paginateMeta(200);
    expect(meta.page).toBe(1);
    expect(meta.limit).toBe(50);
    expect(meta.totalPages).toBe(4);
  });

  test('clamps page to minimum 1', () => {
    const meta = paginateMeta(50, { page: -5, limit: 10 });
    expect(meta.page).toBe(1);
  });

  test('clamps page to minimum 1 for zero', () => {
    const meta = paginateMeta(50, { page: 0, limit: 10 });
    expect(meta.page).toBe(1);
  });

  test('clamps limit to minimum 1', () => {
    const meta = paginateMeta(50, { page: 1, limit: 0 });
    expect(meta.limit).toBe(1);
    expect(meta.totalPages).toBe(50);
  });

  test('clamps limit to MAX_LIMIT', () => {
    const meta = paginateMeta(1000, { page: 1, limit: 999 });
    expect(meta.limit).toBe(MAX_LIMIT);
    expect(meta.totalPages).toBe(5);
  });

  test('handles zero total', () => {
    const meta = paginateMeta(0, { page: 1, limit: 10 });
    expect(meta.total).toBe(0);
    expect(meta.totalPages).toBe(1); // ceil(0/10) || 1
  });

  test('handles string params (from req.query)', () => {
    const meta = paginateMeta(75, { page: '3', limit: '25' });
    expect(meta.page).toBe(3);
    expect(meta.limit).toBe(25);
    expect(meta.totalPages).toBe(3);
  });

  test('handles NaN page (returns NaN — caller should validate)', () => {
    const meta = paginateMeta(50, { page: 'abc', limit: 10 });
    // Math.max(1, NaN) = NaN — function does not guard against non-numeric strings
    expect(meta.page).toBeNaN();
  });

  test('handles NaN limit (returns NaN — caller should validate)', () => {
    const meta = paginateMeta(50, { page: 1, limit: 'xyz' });
    // Math.min(Math.max(1, NaN), 200) = NaN
    expect(meta.limit).toBeNaN();
  });

  test('handles large total correctly', () => {
    const meta = paginateMeta(100000, { page: 500, limit: 200 });
    expect(meta.page).toBe(500);
    expect(meta.limit).toBe(200);
    expect(meta.totalPages).toBe(500);
  });

  test('handles negative limit by clamping to 1', () => {
    const meta = paginateMeta(50, { page: 1, limit: -10 });
    expect(meta.limit).toBe(1);
  });
});

/* ================================================================
 *  detectMimeFromMagic (from uploadValidator — pure Buffer function)
 * ================================================================ */
const { detectMimeFromMagic, BLOCKED_MIMES } = require('../utils/uploadValidator');

describe('detectMimeFromMagic', () => {
  test('detects JPEG', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const result = detectMimeFromMagic(buf);
    expect(result).toContain('image/jpeg');
  });

  test('detects PNG', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    const result = detectMimeFromMagic(buf);
    expect(result).toContain('image/png');
  });

  test('detects GIF89a', () => {
    const buf = Buffer.from('GIF89a....');
    const result = detectMimeFromMagic(buf);
    expect(result).toContain('image/gif');
  });

  test('detects GIF87a', () => {
    const buf = Buffer.from('GIF87a....');
    const result = detectMimeFromMagic(buf);
    expect(result).toContain('image/gif');
  });

  test('detects PDF', () => {
    const buf = Buffer.from('%PDF-1.4 some content');
    const result = detectMimeFromMagic(buf);
    expect(result).toContain('application/pdf');
  });

  test('detects ZIP (PK header)', () => {
    const buf = Buffer.from('PK\x03\x04extra');
    const result = detectMimeFromMagic(buf);
    expect(result).toContain('application/zip');
  });

  test('detects MP3 with ID3 tag', () => {
    const buf = Buffer.from('ID3\x04\x00\x00');
    const result = detectMimeFromMagic(buf);
    expect(result).toContain('audio/mpeg');
  });

  test('detects OGG', () => {
    const buf = Buffer.from('OggS\x00\x02');
    const result = detectMimeFromMagic(buf);
    expect(result).toContain('audio/ogg');
  });

  test('detects FLAC', () => {
    const buf = Buffer.from('fLaC\x00\x00');
    const result = detectMimeFromMagic(buf);
    expect(result).toContain('audio/flac');
  });

  test('detects RAR', () => {
    const buf = Buffer.from('Rar!\x1a\x07');
    const result = detectMimeFromMagic(buf);
    expect(result).toContain('application/x-rar-compressed');
  });

  test('returns null for unknown bytes', () => {
    const buf = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f]);
    expect(detectMimeFromMagic(buf)).toBeNull();
  });

  test('returns null for empty buffer', () => {
    expect(detectMimeFromMagic(Buffer.alloc(0))).toBeNull();
  });

  test('returns null for buffer too short for any signature', () => {
    expect(detectMimeFromMagic(Buffer.from([0xff]))).toBeNull();
  });
});

/* ================================================================
 *  BLOCKED_MIMES
 * ================================================================ */
describe('BLOCKED_MIMES', () => {
  test('blocks SVG (XSS risk)', () => {
    expect(BLOCKED_MIMES).toContain('image/svg+xml');
  });

  test('blocks HTML', () => {
    expect(BLOCKED_MIMES).toContain('text/html');
  });

  test('blocks JavaScript', () => {
    expect(BLOCKED_MIMES).toContain('application/javascript');
    expect(BLOCKED_MIMES).toContain('text/javascript');
  });

  test('blocks XHTML', () => {
    expect(BLOCKED_MIMES).toContain('application/xhtml+xml');
  });
});
