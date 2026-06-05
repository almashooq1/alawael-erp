/**
 * Wave 930 — guards for two web-admin→model save bridges:
 *   • crm/complaints  — normalizeComplaintInput middleware
 *   • therapy-groups  — createGroup service mapping (static source guard)
 *
 * Both were 500/400-ing because the web-admin form payload didn't match the live
 * model (UPPER source / no subject / no nameAr / no type). Same class as W926.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const complaints = require('../routes/complaints.routes');
const { normalizeComplaintInput } = complaints;

function run(body) {
  const req = { body };
  let called = false;
  normalizeComplaintInput(req, {}, () => {
    called = true;
  });
  return { req, called };
}

describe('W930 — complaints normalizeComplaintInput', () => {
  it('is exported', () => {
    expect(typeof normalizeComplaintInput).toBe('function');
  });

  it('maps UPPER form source codes to the model enum', () => {
    expect(run({ source: 'FAMILY' }).req.body.source).toBe('parent');
    expect(run({ source: 'STAFF' }).req.body.source).toBe('employee');
    expect(run({ source: 'EXTERNAL' }).req.body.source).toBe('customer');
    expect(run({ source: 'ANONYMOUS' }).req.body.source).toBe('other');
  });

  it('derives the required subject from the (Arabic) category when absent', () => {
    const { req } = run({ source: 'FAMILY', category: 'شكوى عامة', description: 'تفاصيل' });
    expect(req.body.subject).toBe('شكوى عامة');
  });

  it('falls back to description for subject when there is no category', () => {
    const { req } = run({ source: 'STAFF', description: 'المعالج تأخر عن الموعد المحدد' });
    expect(req.body.subject).toBe('المعالج تأخر عن الموعد المحدد');
  });

  it('drops a non-enum (free Arabic) category so the model default applies', () => {
    const { req } = run({ source: 'FAMILY', category: 'شكوى عامة', description: 'x' });
    expect(req.body.category).toBeUndefined();
  });

  it('keeps a valid English category slug', () => {
    const { req } = run({ source: 'STAFF', category: 'financial', description: 'x' });
    expect(req.body.category).toBe('financial');
  });

  it('always calls next()', () => {
    expect(run({ source: 'FAMILY', description: 'x' }).called).toBe(true);
  });
});

describe('W930 — therapy-groups createGroup mapping (source guard)', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'services', 'therapistPortal.service.js'),
    'utf8'
  );
  const body = src.slice(src.indexOf('async createGroup('), src.indexOf('async updateGroup('));

  it('maps name → nameAr', () => {
    expect(body).toMatch(/payload\.nameAr\s*=\s*payload\.name/);
  });

  it('derives a valid type (focus → enum, else mixed)', () => {
    expect(body).toMatch(/payload\.type\s*=/);
    expect(body).toMatch(/'mixed'/);
    expect(body).toMatch(/TYPE_ENUM/);
  });
});
