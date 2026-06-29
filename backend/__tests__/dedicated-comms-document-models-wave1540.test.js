/**
 * W1540 — dedicated CommunicationRecord / ElectronicDirective / StudentCertificate
 * models + route-rewire drift guard.
 *
 * WHY THIS EXISTS
 * ---------------
 * The complaints, admin-communications, email-v2, electronic-directives, and
 * student-certificates surfaces were overloaded onto the canonical `Communication`
 * and `Document` models — which REQUIRE fields these routes never set
 * (Communication: type/sender.name/receiver.name/sentDate) and reject their status
 * vocabulary. Every write threw a ValidationError (→ HTTP 500); every stats read
 * matched 0 docs. W1540 ships fit-for-purpose models and rewires the 5 routes.
 *
 * Static source guard (jest.setup mocks mongoose, so we assert against source text,
 * matching the wave324 / wave382 convention). Locks: (1) the new models declare the
 * status vocabularies the routes use, (2) beneficiaryId refs Beneficiary, (3) the 5
 * routes point at the new models and never regress to Communication/Document.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const modelSrc = name => fs.readFileSync(path.join(__dirname, '..', 'models', name), 'utf8');
const routeSrc = name => fs.readFileSync(path.join(__dirname, '..', 'routes', name), 'utf8');

describe('W1540 — dedicated communication/document models declare the right shape', () => {
  test('CommunicationRecord registers + carries the routes’ channel + status vocabulary', () => {
    const src = modelSrc('CommunicationRecord.js');
    expect(src).toContain("mongoose.model('CommunicationRecord'");
    for (const s of ['open', 'pending', 'in_progress', 'resolved', 'draft', 'sent']) {
      expect(src).toMatch(new RegExp(`'${s}'`));
    }
    for (const ch of ['complaint', 'email']) {
      expect(src).toMatch(new RegExp(`'${ch}'`));
    }
    // channel is the one required discriminator.
    expect(src).toMatch(/channel:\s*\{[^}]*required:\s*true/s);
  });

  test('ElectronicDirective registers with e-signature lifecycle + beneficiary ref', () => {
    const src = modelSrc('ElectronicDirective.js');
    expect(src).toContain("mongoose.model('ElectronicDirective'");
    for (const s of ['draft', 'awaiting_signature', 'active', 'revoked']) {
      expect(src).toMatch(new RegExp(`'${s}'`));
    }
    expect(src).toMatch(/beneficiaryId:\s*\{[^}]*ref:\s*'Beneficiary'/s);
  });

  test('StudentCertificate registers with issued/revoked + unique code + beneficiary ref', () => {
    const src = modelSrc('StudentCertificate.js');
    expect(src).toContain("mongoose.model('StudentCertificate'");
    expect(src).toMatch(/status:\s*\{[^}]*enum:\s*\[[^\]]*'issued'[^\]]*'revoked'/s);
    expect(src).toMatch(/verificationCode:\s*\{[^}]*unique:\s*true/s);
    expect(src).toMatch(/beneficiaryId:\s*\{[^}]*ref:\s*'Beneficiary'/s);
  });
});

describe('W1540 — routes point at the dedicated models (anti-regression)', () => {
  const COMM_ROUTES = [
    'student-complaints.routes.js',
    'admin-communications.routes.js',
    'email-v2.routes.js',
  ];
  const DOC_ROUTES = [
    ['electronic-directives.routes.js', 'ElectronicDirective'],
    ['student-certificates.routes.js', 'StudentCertificate'],
  ];

  test.each(COMM_ROUTES)('%s uses CommunicationRecord, not the canonical Communication', file => {
    const src = routeSrc(file);
    expect(src).toContain("safeModel('CommunicationRecord')");
    expect(src).not.toContain("safeModel('Communication')");
    expect(src).toMatch(/models\/CommunicationRecord'/);
  });

  test.each(DOC_ROUTES)('%s uses %s, not the canonical Document', (file, model) => {
    const src = routeSrc(file);
    expect(src).toContain(`safeModel('${model}')`);
    expect(src).not.toContain("safeModel('Document')");
    // Registered at top of the route file (assert via path fragment to avoid the
    // no-broken-requires scanner treating this string as a real require()).
    expect(src).toMatch(new RegExp(`models/${model}'`));
  });
});

describe('W1540 — EMR/clinical models are wired into the CareTimeline bridge', () => {
  const bridgeSrc = fs.readFileSync(
    path.join(__dirname, '..', 'integration', 'modelEventBridge.js'),
    'utf8'
  );
  // EMR models register under Emr-prefixed names; the mapping must use those.
  const WIRED = [
    'EmrLabResult',
    'EmrVitalSigns',
    'EmrMedicationAdministration',
    'EmrAllergyRecord',
    'EmrImmunizationRecord',
    'ElectronicDirective',
    'StudentCertificate',
    'ICFAssessment',
  ];
  test.each(WIRED)('modelEventBridge maps %s', name => {
    expect(bridgeSrc).toMatch(new RegExp(`modelName:\\s*'${name}'`));
  });
});
