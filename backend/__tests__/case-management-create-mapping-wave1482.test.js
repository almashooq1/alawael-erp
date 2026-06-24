'use strict';

/**
 * W1482 — case-management create/update flat→beneficiary mapping fix.
 *
 * BUG: routes/caseManagement.js whitelisted FLAT patient fields (CASE_FIELDS:
 * patientName, nationalId, gender, ...) and spread them straight into
 * `new CaseManagement({...})` / findByIdAndUpdate({...}). But the schema nests
 * them under `beneficiary: { name (REQUIRED), nationalId, ... }`. CASE_FIELDS does
 * not even include 'beneficiary', so beneficiary.name was NEVER set →
 *   - POST /case-management ALWAYS threw "beneficiary.name is required" (create broken)
 *   - PUT /case-management/:id silently no-op'd every patient field.
 *
 * FIX: mapCaseCreateBody / mapCaseUpdateBody map flat patient fields → the schema
 * shape (nested beneficiary on create; dot-notation on partial update).
 */

const fs = require('fs');
const path = require('path');
const { mapCaseCreateBody, mapCaseUpdateBody } = require('../routes/caseManagement');

describe('W1482 case-management create/update mapping', () => {
  test('mapCaseCreateBody sets the REQUIRED beneficiary.name from patientName', () => {
    const out = mapCaseCreateBody(
      { patientName: 'أحمد', nationalId: '1100000001', gender: 'ذكر', phone: '0500000000', status: 'جديدة', priority: 'عالية', caseType: 'X' },
      'uid1',
    );
    expect(out.beneficiary).toBeDefined();
    expect(out.beneficiary.name).toBe('أحمد');
    expect(out.beneficiary.nationalId).toBe('1100000001');
    expect(out.beneficiary.gender).toBe('ذكر');
    expect(out.beneficiary.phone).toBe('0500000000');
    expect(out.status).toBe('جديدة');
    expect(out.priority).toBe('عالية');
    expect(out.createdBy).toBe('uid1');
    expect(out.lastModifiedBy).toBe('uid1');
    // flat patient keys are NOT left at top level (where the schema would drop them)
    expect(out.patientName).toBeUndefined();
    // fields that are not real schema paths are dropped (same as before, but explicitly)
    expect(out.caseType).toBeUndefined();
  });

  test('omitted fields are not forced as undefined keys', () => {
    const out = mapCaseCreateBody({ patientName: 'سارة' }, 'u');
    expect(out.beneficiary.name).toBe('سارة');
    expect('nationalId' in out.beneficiary).toBe(false);
    expect('status' in out).toBe(false);
  });

  test('mapCaseUpdateBody uses dot-notation (partial), never replaces the whole beneficiary subdoc', () => {
    const out = mapCaseUpdateBody({ patientName: 'محمد', phone: '0511111111', status: 'نشطة' }, 'u2');
    expect(out['beneficiary.name']).toBe('محمد');
    expect(out['beneficiary.phone']).toBe('0511111111');
    expect(out.status).toBe('نشطة');
    expect(out.lastModifiedBy).toBe('u2');
    expect(out.lastUpdateDate).toBeInstanceOf(Date);
    expect(out.beneficiary).toBeUndefined();
  });

  test('route wires the mappers into POST + PUT (old raw flat-spread is gone)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'caseManagement.js'), 'utf8');
    expect(src).toMatch(/mapCaseCreateBody\(req\.body, req\.user\._id\)/);
    expect(src).toMatch(/mapCaseUpdateBody\(req\.body, req\.user\._id\)/);
    expect(src).not.toMatch(/const caseData = \{\s*\.\.\.pick\(req\.body, CASE_FIELDS\)/);
    expect(src).not.toMatch(/const updateData = \{\s*\.\.\.pick\(req\.body, CASE_FIELDS\)/);
  });
});
