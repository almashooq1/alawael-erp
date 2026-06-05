/**
 * Wave 926 — beneficiary registration fix.
 *
 * Reported bug: "registering a beneficiary doesn't save the data"
 * (عند تسجيل مستفيد لا يحفظ المعلومات). Root cause: the web-admin form sends
 * Arabic disability-type labels (e.g. 'اضطراب طيف التوحد') as `category`, but
 * the Beneficiary model constrains `category` + `disability.type` to a coarse
 * English enum. The Arabic value failed enum validation → .save() threw → the
 * API returned 500. Secondary: the form's {primaryType, types, level} disability
 * shape + top-level disabilityLevel didn't match the model (type/severity), so
 * the clinical detail was silently dropped.
 *
 * Fix: `normalizeBeneficiaryInput()` bridges the taxonomy — maps the Arabic
 * label to a valid slug, derives severity, and preserves the precise values in
 * additive optional model fields. Also stamps the creator's branchId (W269).
 *
 * This suite unit-tests the exported bridge directly (pure, no DB) + a static
 * guard that the create handler still injects branchId.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const routeModule = require('../routes/beneficiaries');
const { normalizeBeneficiaryInput } = routeModule;

describe('W926 — normalizeBeneficiaryInput (disability taxonomy bridge)', () => {
  it('is exported as a function', () => {
    expect(typeof normalizeBeneficiaryInput).toBe('function');
  });

  it('maps an Arabic disability label to a valid model slug on category + disability.type', () => {
    const out = normalizeBeneficiaryInput({
      disability: {
        primaryType: 'اضطراب طيف التوحد',
        types: ['اضطراب طيف التوحد'],
        level: 'moderate',
      },
      category: 'اضطراب طيف التوحد',
    });
    const VALID = ['physical', 'mental', 'sensory', 'multiple', 'learning', 'speech', 'other'];
    expect(VALID).toContain(out.category);
    expect(VALID).toContain(out.disability.type);
  });

  it('maps each Arabic label to its expected slug', () => {
    const cases = {
      'إعاقة حركية': 'physical',
      'إعاقة ذهنية': 'mental',
      'إعاقة سمعية': 'sensory',
      'إعاقة بصرية': 'sensory',
      'اضطراب النطق والكلام': 'speech',
      'صعوبات التعلم': 'learning',
      'إعاقات متعددة': 'multiple',
    };
    for (const [label, slug] of Object.entries(cases)) {
      const out = normalizeBeneficiaryInput({ disability: { types: [label] } });
      expect(out.disability.type).toBe(slug);
      expect(out.category).toBe(slug);
    }
  });

  it('preserves the precise (Arabic) value(s) for the UI round-trip', () => {
    const out = normalizeBeneficiaryInput({
      disability: { primaryType: 'اضطراب طيف التوحد', types: ['اضطراب طيف التوحد'] },
    });
    expect(out.disability.primaryType).toBe('اضطراب طيف التوحد');
    expect(out.disability.types).toEqual(['اضطراب طيف التوحد']);
  });

  it('treats more than one selected disability as multiple', () => {
    const out = normalizeBeneficiaryInput({
      disability: { types: ['إعاقة حركية', 'إعاقة سمعية'] },
    });
    expect(out.disability.type).toBe('multiple');
    expect(out.category).toBe('multiple');
  });

  it('derives lowercase enum severity from level / disabilityLevel + mirrors disabilityLevel', () => {
    const out = normalizeBeneficiaryInput({
      disability: { types: ['إعاقة حركية'], level: 'MODERATE' },
      disabilityLevel: 'MODERATE',
    });
    expect(out.disability.severity).toBe('moderate');
    expect(out.disabilityLevel).toBe('MODERATE');
  });

  it('is idempotent — English slugs pass through unchanged', () => {
    const out = normalizeBeneficiaryInput({
      disability: { type: 'physical', severity: 'mild', types: ['physical'] },
      category: 'physical',
    });
    expect(out.category).toBe('physical');
    expect(out.disability.type).toBe('physical');
    expect(out.disability.severity).toBe('mild');
  });

  it('never emits an out-of-enum category, even for an unknown label', () => {
    const out = normalizeBeneficiaryInput({ disability: { types: ['شيء غير معروف'] } });
    const VALID = ['physical', 'mental', 'sensory', 'multiple', 'learning', 'speech', 'other'];
    expect(VALID).toContain(out.category);
    expect(out.category).toBe('other');
  });

  it('leaves a payload with no disability info untouched (no crash)', () => {
    const out = normalizeBeneficiaryInput({ firstName_ar: 'محمد' });
    expect(out.firstName_ar).toBe('محمد');
    expect(out.category).toBeUndefined();
  });
});

describe('W926 — create handler stamps branchId (W269 isolation)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'beneficiaries.js'), 'utf8');

  it('the POST create handler injects branchId from req.branchScope', () => {
    const postIdx = src.indexOf("router.post('/'");
    const putIdx = src.indexOf("router.put('/:id'", postIdx);
    const createBody = src.slice(postIdx, putIdx > -1 ? putIdx : undefined);
    expect(createBody).toMatch(/new Beneficiary\s*\(/);
    expect(createBody).toMatch(/branchId\s*:\s*req\.branchScope\?\.branchId/);
  });
});
