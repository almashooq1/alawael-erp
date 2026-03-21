/**
 * fileUtils.js — Unit Tests
 * اختبارات وحدة لأدوات التعامل مع الملفات
 */
import {
  formatFileSize,
  getFileExtension,
  getFileCategory,
  getMimeType,
  validateFile,
  getFileIcon,
  sanitizeFilename,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZES,
} from 'utils/fileUtils';

/* ═══════════════ formatFileSize ═══════════════ */
describe('formatFileSize', () => {
  test('formats 0 bytes', () => {
    expect(formatFileSize(0)).toContain('0');
  });

  test('formats bytes', () => {
    const result = formatFileSize(500);
    expect(result).toContain('500');
  });

  test('formats kilobytes', () => {
    const result = formatFileSize(2048);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  test('formats megabytes', () => {
    const result = formatFileSize(5 * 1024 * 1024);
    expect(result).toContain('5');
  });

  test('formats gigabytes', () => {
    const result = formatFileSize(2 * 1024 * 1024 * 1024);
    expect(result).toContain('2');
  });

  test('returns 0 for null/undefined', () => {
    expect(formatFileSize(null)).toContain('0');
    expect(formatFileSize(undefined)).toContain('0');
  });
});

/* ═══════════════ getFileExtension ═══════════════ */
describe('getFileExtension', () => {
  test('extracts .pdf extension', () => {
    expect(getFileExtension('report.pdf')).toBe('pdf');
  });

  test('extracts .docx extension', () => {
    expect(getFileExtension('document.docx')).toBe('docx');
  });

  test('handles multiple dots', () => {
    expect(getFileExtension('archive.tar.gz')).toBe('gz');
  });

  test('lowercases extension', () => {
    expect(getFileExtension('Image.PNG')).toBe('png');
  });

  test('returns empty for no extension', () => {
    expect(getFileExtension('Makefile')).toBe('');
  });

  test('returns empty for null', () => {
    expect(getFileExtension(null)).toBe('');
  });

  test('returns empty for empty string', () => {
    expect(getFileExtension('')).toBe('');
  });

  test('handles path-like filename', () => {
    expect(getFileExtension('uploads/docs/report.xlsx')).toBe('xlsx');
  });
});

/* ═══════════════ getMimeType ═══════════════ */
describe('getMimeType', () => {
  test('returns MIME for .jpg', () => {
    expect(getMimeType('photo.jpg')).toBe('image/jpeg');
  });

  test('returns MIME for .jpeg', () => {
    expect(getMimeType('photo.jpeg')).toBe('image/jpeg');
  });

  test('returns MIME for .png', () => {
    expect(getMimeType('image.png')).toBe('image/png');
  });

  test('returns MIME for .pdf', () => {
    expect(getMimeType('doc.pdf')).toBe('application/pdf');
  });

  test('returns MIME for .docx', () => {
    expect(getMimeType('report.docx')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  });

  test('returns MIME for .xlsx', () => {
    expect(getMimeType('data.xlsx')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  });

  test('returns MIME for .mp4', () => {
    expect(getMimeType('video.mp4')).toBe('video/mp4');
  });

  test('returns MIME for .mp3', () => {
    expect(getMimeType('audio.mp3')).toBe('audio/mpeg');
  });

  test('returns MIME for .csv', () => {
    expect(getMimeType('data.csv')).toBe('text/csv');
  });

  test('returns octet-stream for unknown extension', () => {
    expect(getMimeType('file.xyz')).toBe('application/octet-stream');
  });
});

/* ═══════════════ getFileCategory ═══════════════ */
describe('getFileCategory', () => {
  test('detects image from MIME', () => {
    expect(getFileCategory('image/jpeg')).toBe('image');
    expect(getFileCategory('image/png')).toBe('image');
  });

  test('detects document from MIME', () => {
    expect(getFileCategory('application/pdf')).toBe('document');
  });

  test('detects video from MIME', () => {
    expect(getFileCategory('video/mp4')).toBe('video');
  });

  test('detects audio from MIME', () => {
    expect(getFileCategory('audio/mpeg')).toBe('audio');
  });

  test('detects from filename (falls through to getMimeType)', () => {
    expect(getFileCategory('photo.jpg')).toBe('image');
    expect(getFileCategory('report.pdf')).toBe('document');
  });

  test('returns unknown for unrecognized type', () => {
    expect(getFileCategory('application/octet-stream')).toBe('unknown');
  });

  test('returns unknown for null', () => {
    expect(getFileCategory(null)).toBe('unknown');
  });
});

/* ═══════════════ validateFile ═══════════════ */
describe('validateFile', () => {
  const makeFile = (name, type, size) => ({ name, type, size });

  test('validates good PDF', () => {
    const file = makeFile('report.pdf', 'application/pdf', 1024);
    expect(validateFile(file)).toEqual({ valid: true });
  });

  test('validates good image', () => {
    const file = makeFile('photo.jpg', 'image/jpeg', 1024);
    expect(validateFile(file)).toEqual({ valid: true });
  });

  test('rejects null file', () => {
    const result = validateFile(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('rejects disallowed MIME type', () => {
    const file = makeFile('malware.exe', 'application/x-executable', 1024);
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('rejects file exceeding size limit', () => {
    const file = makeFile('big.pdf', 'application/pdf', 50 * 1024 * 1024); // 50 MB
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('respects custom maxSize option', () => {
    const file = makeFile('doc.pdf', 'application/pdf', 2000);
    const result = validateFile(file, { maxSize: 1000 });
    expect(result.valid).toBe(false);
  });

  test('respects custom allowedTypes option', () => {
    const file = makeFile('photo.jpg', 'image/jpeg', 1024);
    const result = validateFile(file, { allowedTypes: ['application/pdf'] });
    expect(result.valid).toBe(false);
  });
});

/* ═══════════════ getFileIcon ═══════════════ */
describe('getFileIcon', () => {
  test('returns Image icon for image MIME', () => {
    expect(getFileIcon('image/jpeg')).toBe('Image');
  });

  test('returns Description for document', () => {
    expect(getFileIcon('application/pdf')).toBe('Description');
  });

  test('returns VideoFile for video', () => {
    expect(getFileIcon('video/mp4')).toBe('VideoFile');
  });

  test('returns AudioFile for audio', () => {
    expect(getFileIcon('audio/mpeg')).toBe('AudioFile');
  });

  test('returns InsertDriveFile for unknown', () => {
    expect(getFileIcon('application/octet-stream')).toBe('InsertDriveFile');
  });

  test('works with filename input', () => {
    expect(getFileIcon('photo.png')).toBe('Image');
    expect(getFileIcon('report.pdf')).toBe('Description');
  });
});

/* ═══════════════ sanitizeFilename ═══════════════ */
describe('sanitizeFilename', () => {
  test('keeps normal filename', () => {
    expect(sanitizeFilename('report.pdf')).toBe('report.pdf');
  });

  test('preserves Arabic characters', () => {
    const result = sanitizeFilename('تقرير المبيعات.pdf');
    expect(result).toContain('.pdf');
    expect(result).toContain('تقرير');
  });

  test('removes special characters', () => {
    const result = sanitizeFilename('file<>name|*.pdf');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).not.toContain('|');
    expect(result).not.toContain('*');
    expect(result).toContain('.pdf');
  });

  test('returns "file" for null', () => {
    expect(sanitizeFilename(null)).toBe('file');
  });

  test('returns "file" for empty', () => {
    expect(sanitizeFilename('')).toBe('file');
  });

  test('preserves hyphens and underscores', () => {
    expect(sanitizeFilename('my_file-v2.docx')).toBe('my_file-v2.docx');
  });
});

/* ═══════════════ Constants ═══════════════ */
describe('Constants', () => {
  test('ALLOWED_MIME_TYPES has all categories', () => {
    expect(ALLOWED_MIME_TYPES).toHaveProperty('image');
    expect(ALLOWED_MIME_TYPES).toHaveProperty('document');
    expect(ALLOWED_MIME_TYPES).toHaveProperty('video');
    expect(ALLOWED_MIME_TYPES).toHaveProperty('audio');
  });

  test('MAX_FILE_SIZES has default', () => {
    expect(MAX_FILE_SIZES.default).toBeDefined();
    expect(MAX_FILE_SIZES.default).toBeGreaterThan(0);
  });

  test('image size limit is 5MB', () => {
    expect(MAX_FILE_SIZES.image).toBe(5 * 1024 * 1024);
  });
});
