/**
 * W1210 — SmartInsuranceClaim model + binding drift guard.
 * ════════════════════════════════════════════════════════════════════════
 * The System-40 smart-insurance family shipped WITHOUT its claims model:
 * smartInsurance.service bound the contract-based insuranceClaim.model.js
 * shim, whose required fields the service never set → submitClaim() threw
 * on every call since the system shipped. W1210 built the policy-based
 * sibling (ADR-021 Pattern D distinct name; W337 build-the-canonical
 * precedent) and rebound service + routes.
 *
 * Static analysis only (source text; no DB).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const B = p => path.join(__dirname, '..', p);
const read = p => fs.readFileSync(B(p), 'utf8');
const stripComments = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const modelSrc = read('models/SmartInsuranceClaim.js');
const serviceSrc = read('services/smartInsurance.service.js');
const routesSrc = read('routes/smart-insurance.routes.js');
const registrySrc = read('routes/registries/student-parent.registry.js');

describe('W1210 SmartInsuranceClaim model', () => {
  it('registers under the DISTINCT name (ADR-021 Pattern D — 3 other InsuranceClaim files exist)', () => {
    expect(modelSrc).toMatch(/mongoose\.model\(\s*'SmartInsuranceClaim'/);
    expect(modelSrc).not.toMatch(/mongoose\.model\(\s*'InsuranceClaim'/);
  });

  it.each([
    'claimNumber',
    'claimUuid',
    'policyId',
    'beneficiaryId',
    'insuranceCompanyId',
    'serviceSessionId',
    'priorAuthId',
    'claimType',
    'serviceDate',
    'billedAmount',
    'approvedAmount',
    'patientShare',
    'insuranceShare',
    'diagnosisCodes',
    'procedureCodes',
    'lineItems',
    'submittedAt',
    'submissionError',
    'nphiesClaimId',
    'rejectionReason',
    'rejectionCode',
    'adjudicatedAt',
    'deletedAt',
  ])('declares %s (exact union of service/route reads+writes)', key => {
    expect(modelSrc).toMatch(new RegExp(`^\\s+${key}:`, 'm'));
  });

  it('required identifiers carry defaults (the W1193 uuid lesson, applied at birth)', () => {
    expect(modelSrc).toMatch(
      /claimUuid:[\s\S]{0,200}?default:\s*\(\)\s*=>\s*require\('crypto'\)\.randomUUID\(\)/
    );
  });

  it('save hook is W978-canonical (async, NO next) and dual-writes halalas', () => {
    expect(modelSrc).toMatch(/pre\(\s*'save',\s*async function \(\)/);
    expect(modelSrc).not.toMatch(/async function \(next\)/);
    expect(modelSrc).toMatch(/deriveHalalas\(this, \['billedAmount', 'approvedAmount'\]\)/);
  });

  it('adjudication.denialReasons subdoc exists for rejection analytics', () => {
    expect(modelSrc).toMatch(/denialReasons:\s*\[/);
  });
});

describe('W1210 bindings', () => {
  it('service binds SmartInsuranceClaim (not the contract-model shim)', () => {
    const code = stripComments(serviceSrc);
    expect(code).toMatch(/require\('\.\.\/models\/SmartInsuranceClaim'\)/);
    expect(code).not.toMatch(/require\('\.\.\/models\/InsuranceClaim'\)/);
  });

  it('routes bind SmartInsuranceClaim', () => {
    const code = stripComments(routesSrc);
    expect(code).toMatch(/require\('\.\.\/models\/SmartInsuranceClaim'\)/);
    expect(code).not.toMatch(/require\('\.\.\/models\/InsuranceClaim'\)/);
  });

  it('rejection analytics matches the new vocabulary (submittedAt + branchId)', () => {
    expect(serviceSrc).toMatch(/submittedAt:\s*\{\s*\$gte/);
    expect(stripComments(serviceSrc)).not.toMatch(/submissionDate:\s*\{\s*\$gte/);
    expect(stripComments(serviceSrc)).not.toMatch(/match\.branch\s*=/);
  });
});

describe('W1211 guardian portal wiring', () => {
  it('guardianPortal is un-phantomed and mounted', () => {
    const code = stripComments(registrySrc);
    expect(code).toMatch(/safeRequire\('\.\.\/routes\/guardianPortal\.routes'\)/);
    expect(code).toMatch(/dualMount\(app,\s*'guardian',\s*guardianPortalRouter\)/);
  });
});
