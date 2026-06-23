/**
 * document-upload.service.test.js — Unit tests for document upload service.
 */

'use strict';

jest.mock('../models/Document', () => {
  return jest.fn().mockImplementation(() => ({
    _id: 'doc123',
    title: 'test.txt',
    save: jest.fn().mockResolvedValue(true),
  }));
});

const documentUploadService = require('../services/documents/documentUpload.service');

describe('documentUpload.service', () => {
  it('validates allowed file types', () => {
    const buffer = Buffer.from('hello');
    expect(() =>
      documentUploadService.validateBuffer(buffer, 'application/pdf', 'test.pdf', 'core')
    ).not.toThrow();
  });

  it('rejects oversized files', () => {
    const bigBuffer = Buffer.alloc(100 * 1024 * 1024 + 1);
    expect(() =>
      documentUploadService.validateBuffer(bigBuffer, 'application/pdf', 'big.pdf', 'core')
    ).toThrow('أكبر من الحد المسموح');
  });

  it('rejects blocked MIME types', () => {
    const buffer = Buffer.from('<html></html>');
    expect(() =>
      documentUploadService.validateBuffer(buffer, 'text/html', 'evil.html', 'core')
    ).toThrow('غير مسموح');
  });

  it('rejects MIME spoofing via magic bytes', () => {
    // A PNG magic header with a PDF extension
    const spoofBuffer = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.from('rest')]);
    expect(() =>
      documentUploadService.validateBuffer(spoofBuffer, 'application/pdf', 'spoof.pdf', 'core')
    ).toThrow('لا يتطابق');
  });

  it('returns size limits per module', () => {
    expect(documentUploadService.getSizeLimit('medical')).toBe(100 * 1024 * 1024);
    expect(documentUploadService.getSizeLimit('hr')).toBe(20 * 1024 * 1024);
    expect(documentUploadService.getSizeLimit('unknown')).toBe(50 * 1024 * 1024);
  });
});
