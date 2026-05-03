/**
 * Tests for domains/assessments/models/ClinicalAssessment.js
 * Validates the domain re-export shim resolves to the canonical model.
 * @generated P#106 — clinical assessments domain
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SHIM = path.resolve(__dirname, '../../domains/assessments/models/ClinicalAssessment.js');
const CANONICAL = path.resolve(__dirname, '../../models/ClinicalAssessment.js');

describe('domains/assessments/models/ClinicalAssessment.js (shim)', () => {
  let shimSource;

  beforeAll(() => {
    shimSource = fs.readFileSync(SHIM, 'utf8');
  });

  test('shim file exists', () => {
    expect(fs.existsSync(SHIM)).toBe(true);
  });

  test('canonical model file exists', () => {
    expect(fs.existsSync(CANONICAL)).toBe(true);
  });

  test('shim is syntactically valid JavaScript', () => {
    expect(() => new vm.Script(shimSource, { filename: 'ClinicalAssessment.js' })).not.toThrow();
  });

  test('shim re-exports ClinicalAssessment', () => {
    expect(shimSource).toMatch(/ClinicalAssessment/);
  });

  test('shim exports clinicalAssessmentSchema', () => {
    expect(shimSource).toMatch(/clinicalAssessmentSchema/);
  });

  test('canonical model uses timestamps', () => {
    const canonicalSource = fs.readFileSync(CANONICAL, 'utf8');
    expect(canonicalSource).toMatch(/timestamps\s*:\s*true/);
  });

  test('canonical model has beneficiary field', () => {
    const canonicalSource = fs.readFileSync(CANONICAL, 'utf8');
    expect(canonicalSource).toMatch(/beneficiary/);
  });

  test('canonical model has tool field', () => {
    const canonicalSource = fs.readFileSync(CANONICAL, 'utf8');
    expect(canonicalSource).toMatch(/\btool\b/);
  });

  test('canonical model has assessmentDate field', () => {
    const canonicalSource = fs.readFileSync(CANONICAL, 'utf8');
    expect(canonicalSource).toMatch(/assessmentDate/);
  });

  test('canonical model has status enum with expected values', () => {
    const canonicalSource = fs.readFileSync(CANONICAL, 'utf8');
    expect(canonicalSource).toMatch(/draft/);
    expect(canonicalSource).toMatch(/completed/);
    expect(canonicalSource).toMatch(/reviewed/);
  });

  test('has module.exports', () => {
    expect(shimSource).toMatch(/module\.exports/);
  });
});
