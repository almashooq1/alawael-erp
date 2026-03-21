/**
 * uploadValidator.test.js — Tests for magic-bytes file validation.
 * اختبارات التحقق من الملفات بواسطة البايتات السحرية
 */
const { detectMimeFromMagic, BLOCKED_MIMES } = require('../utils/uploadValidator');

/* ====================================================================
 * BLOCKED_MIMES constant
 * ==================================================================== */
describe('BLOCKED_MIMES', () => {
  test('is an array with at least 4 entries', () => {
    expect(Array.isArray(BLOCKED_MIMES)).toBe(true);
    expect(BLOCKED_MIMES.length).toBeGreaterThanOrEqual(4);
  });

  test('blocks SVG (XSS risk)', () => {
    expect(BLOCKED_MIMES).toContain('image/svg+xml');
  });

  test('blocks text/html', () => {
    expect(BLOCKED_MIMES).toContain('text/html');
  });

  test('blocks JavaScript mimetypes', () => {
    expect(BLOCKED_MIMES).toContain('application/javascript');
    expect(BLOCKED_MIMES).toContain('text/javascript');
  });

  test('blocks XHTML', () => {
    expect(BLOCKED_MIMES).toContain('application/xhtml+xml');
  });
});

/* ====================================================================
 * detectMimeFromMagic — Pure function (Buffer → array|null)
 * ==================================================================== */
describe('detectMimeFromMagic', () => {
  test('detects JPEG (FF D8 FF)', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const result = detectMimeFromMagic(buf);
    expect(result).toContain('image/jpeg');
  });

  test('detects PNG (89 50 4E 47)', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const result = detectMimeFromMagic(buf);
    expect(result).toContain('image/png');
  });

  test('detects GIF87a', () => {
    const buf = Buffer.from('GIF87a' + '\x00'.repeat(10));
    const result = detectMimeFromMagic(buf);
    expect(result).toContain('image/gif');
  });

  test('detects GIF89a', () => {
    const buf = Buffer.from('GIF89a' + '\x00'.repeat(10));
    const result = detectMimeFromMagic(buf);
    expect(result).toContain('image/gif');
  });

  test('detects BMP (BM)', () => {
    const buf = Buffer.from('BM' + '\x00'.repeat(14));
    const result = detectMimeFromMagic(buf);
    expect(result).toContain('image/bmp');
  });

  test('detects PDF (%PDF)', () => {
    const buf = Buffer.from('%PDF-1.4' + '\x00'.repeat(8));
    const result = detectMimeFromMagic(buf);
    expect(result).toContain('application/pdf');
  });

  test('detects MP3 (ID3 tag)', () => {
    const buf = Buffer.from('ID3' + '\x00'.repeat(13));
    const result = detectMimeFromMagic(buf);
    expect(result).toContain('audio/mpeg');
  });

  test('detects MP3 (sync bytes FF FB)', () => {
    const buf = Buffer.from([0xff, 0xfb, 0x90, 0x00, 0x00, 0x00]);
    const result = detectMimeFromMagic(buf);
    expect(result).toContain('audio/mpeg');
  });

  test('detects FLAC (fLaC)', () => {
    const buf = Buffer.from('fLaC' + '\x00'.repeat(12));
    const result = detectMimeFromMagic(buf);
    expect(result).toContain('audio/flac');
  });

  test('detects OGG (OggS)', () => {
    const buf = Buffer.from('OggS' + '\x00'.repeat(12));
    const result = detectMimeFromMagic(buf);
    expect(result).toEqual(expect.arrayContaining(['audio/ogg']));
  });

  test('detects ZIP/Office (PK)', () => {
    const buf = Buffer.from('PK' + '\x03\x04' + '\x00'.repeat(12));
    const result = detectMimeFromMagic(buf);
    expect(result).toContain('application/zip');
  });

  test('detects RAR (Rar!)', () => {
    const buf = Buffer.from('Rar!' + '\x1a\x07' + '\x00'.repeat(10));
    const result = detectMimeFromMagic(buf);
    expect(result).toContain('application/x-rar-compressed');
  });

  test('detects 7z (37 7A BC AF)', () => {
    const buf = Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c, 0x00, 0x00]);
    const result = detectMimeFromMagic(buf);
    expect(result).toContain('application/x-7z-compressed');
  });

  test('detects WebM/Matroska (1A 45 DF A3)', () => {
    const buf = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00, 0x00, 0x00]);
    const result = detectMimeFromMagic(buf);
    expect(result).toEqual(expect.arrayContaining(['video/webm']));
  });

  test('detects RIFF (RIFF header — webp/wav)', () => {
    const buf = Buffer.from('RIFF' + '\x00'.repeat(12));
    const result = detectMimeFromMagic(buf);
    expect(result).toEqual(expect.arrayContaining(['image/webp']));
  });

  test('returns null for unknown magic bytes', () => {
    const buf = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
    const result = detectMimeFromMagic(buf);
    expect(result).toBeNull();
  });

  test('returns null for empty buffer', () => {
    const buf = Buffer.alloc(0);
    const result = detectMimeFromMagic(buf);
    expect(result).toBeNull();
  });

  test('handles buffer shorter than signature', () => {
    const buf = Buffer.from([0xff]); // JPEG needs 3 bytes
    const result = detectMimeFromMagic(buf);
    // Should not crash; may return null or a shorter match
    expect(result === null || Array.isArray(result)).toBe(true);
  });
});
