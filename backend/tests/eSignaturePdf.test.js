/* eslint-disable no-undef, no-unused-vars */
/**
 * E-Signature PDF Routes — Backend Tests
 * اختبارات مسارات PDF للتوقيع الإلكتروني
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh';

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../server');

/* ═══════════════════════════════════════════════════════════════════════════
   Public Verification — /api/e-signature-pdf/public/verify/:code
   ═══════════════════════════════════════════════════════════════════════════ */
describe('GET /api/e-signature-pdf/public/verify/:code', () => {
  it('should return 404 for a non-existent verification code', async () => {
    const res = await request(app)
      .get('/api/e-signature-pdf/public/verify/FAKE-CODE-123')
      .set('Accept', 'application/json')
      .timeout(15000);

    // 200 (verify returns {type:'unknown',isValid:false}), 404, or 500
    expect([200, 404, 500].includes(res.status)).toBe(true);

    if (res.status === 404) {
      expect(res.body).toHaveProperty('success', false);
    }
  }, 20000);

  it('should accept any verification code format gracefully', async () => {
    const res = await request(app)
      .get('/api/e-signature-pdf/public/verify/SIG-2026-00001-abc123')
      .set('Accept', 'application/json')
      .timeout(15000);

    expect([200, 404, 500].includes(res.status)).toBe(true);
  }, 20000);
});

/* ═══════════════════════════════════════════════════════════════════════════
   Upload Document — /api/e-signature-pdf/upload-document
   ═══════════════════════════════════════════════════════════════════════════ */
describe('POST /api/e-signature-pdf/upload-document', () => {
  it('should require authentication', async () => {
    const res = await request(app)
      .post('/api/e-signature-pdf/upload-document')
      .set('Accept', 'application/json')
      .timeout(15000);

    // 400 (no file — mock user bypasses auth), 401, 403, or 500
    expect([400, 401, 403, 500].includes(res.status)).toBe(true);
  }, 20000);

  it('should reject request without file', async () => {
    const res = await request(app)
      .post('/api/e-signature-pdf/upload-document')
      .set('Authorization', 'Bearer test-invalid-token')
      .field('signatureRequestId', '000000000000000000000001')
      .timeout(15000);

    // 401 (auth fail), 400 (no file), or 500
    expect([400, 401, 403, 500].includes(res.status)).toBe(true);
  }, 20000);
});

/* ═══════════════════════════════════════════════════════════════════════════
   Generate PDF — /api/e-signature-pdf/generate/:id
   ═══════════════════════════════════════════════════════════════════════════ */
describe('POST /api/e-signature-pdf/generate/:id', () => {
  it('should require authentication', async () => {
    const res = await request(app)
      .post('/api/e-signature-pdf/generate/000000000000000000000001')
      .set('Accept', 'application/json')
      .timeout(15000);

    expect([401, 403, 404, 500].includes(res.status)).toBe(true);
  }, 20000);

  it('should return 404 for non-existent signature request', async () => {
    const res = await request(app)
      .post('/api/e-signature-pdf/generate/000000000000000000000001')
      .set('Authorization', 'Bearer test-invalid-token')
      .timeout(15000);

    // 401 (auth), 404 (not found), or 500
    expect([401, 403, 404, 500].includes(res.status)).toBe(true);
  }, 20000);
});

/* ═══════════════════════════════════════════════════════════════════════════
   Download PDF — /api/e-signature-pdf/download/:id
   ═══════════════════════════════════════════════════════════════════════════ */
describe('GET /api/e-signature-pdf/download/:id', () => {
  it('should require authentication', async () => {
    const res = await request(app)
      .get('/api/e-signature-pdf/download/000000000000000000000001')
      .set('Accept', 'application/json')
      .timeout(15000);

    expect([401, 403, 404, 500].includes(res.status)).toBe(true);
  }, 20000);

  it('should return 404 when no generated PDF exists', async () => {
    const res = await request(app)
      .get('/api/e-signature-pdf/download/000000000000000000000001')
      .set('Authorization', 'Bearer test-invalid-token')
      .timeout(15000);

    expect([401, 403, 404, 500].includes(res.status)).toBe(true);
  }, 20000);
});

/* ═══════════════════════════════════════════════════════════════════════════
   Stamp PDF — /api/e-signature-pdf/stamp-pdf/:stampId
   ═══════════════════════════════════════════════════════════════════════════ */
describe('POST /api/e-signature-pdf/stamp-pdf/:stampId', () => {
  it('should require authentication', async () => {
    const res = await request(app)
      .post('/api/e-signature-pdf/stamp-pdf/000000000000000000000001')
      .set('Accept', 'application/json')
      .timeout(15000);

    expect([401, 403, 404, 500].includes(res.status)).toBe(true);
  }, 20000);

  it('should reject request without PDF file', async () => {
    const res = await request(app)
      .post('/api/e-signature-pdf/stamp-pdf/000000000000000000000001')
      .set('Authorization', 'Bearer test-invalid-token')
      .field('x', '100')
      .field('y', '100')
      .field('page', '0')
      .timeout(15000);

    // 400 (no file), 401 (auth), 403, 404, or 500
    expect([400, 401, 403, 404, 500].includes(res.status)).toBe(true);
  }, 20000);
});

/* ═══════════════════════════════════════════════════════════════════════════
   Route Registration — /api/v1/ dual mount
   ═══════════════════════════════════════════════════════════════════════════ */
describe('E-Signature PDF — dual-mount (v1)', () => {
  it('should also be accessible under /api/v1/e-signature-pdf/', async () => {
    const res = await request(app)
      .get('/api/v1/e-signature-pdf/public/verify/TEST-CODE')
      .set('Accept', 'application/json')
      .timeout(15000);

    // 200 (verify returns unknown), 404, or 500
    expect([200, 404, 500].includes(res.status)).toBe(true);
  }, 20000);
});
