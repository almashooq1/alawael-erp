'use strict';
/**
 * Canonical Beneficiary — module: Beneficiary Core.
 *
 * The longitudinal beneficiary identity contract. Every module that
 * references a beneficiary (Episodes, Assessments, Sessions, Family,
 * Quality, Reports, ...) MUST agree on these fields.
 *
 * Extensions (medical history, portal auth, attachments, etc.) live in
 * the Mongoose model; they are NOT part of the contract.
 */

const {
  z,
  ObjectIdLike,
  SaudiNationalId,
  MRN,
  IsoDateLoose,
  Gender,
  DisabilityType,
  DisabilitySeverity,
  AuditEnvelope,
} = require('../_primitives');

const Beneficiary = z
  .object({
    // ── Identity ─────────────────────────────────────────────
    _id: ObjectIdLike.optional(),

    // Bilingual names — at least one localised pair required.
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    firstName_ar: z.string().optional(),
    lastName_ar: z.string().optional(),
    firstName_en: z.string().optional(),
    lastName_en: z.string().optional(),

    // Government identifiers — at least nationalId OR mrn must exist.
    nationalId: SaudiNationalId.optional(),
    mrn: MRN.optional(),

    // ── Demographics ─────────────────────────────────────────
    dateOfBirth: IsoDateLoose.optional(),
    gender: Gender.optional(),
    nationality: z.string().optional(),

    // ── Disability (canonical classification) ────────────────
    disability: z
      .object({
        type: DisabilityType,
        severity: DisabilitySeverity.optional(),
        diagnosisDate: IsoDateLoose.optional(),
      })
      .optional(),

    // ── Consent gate (PDPL / CBAHI) ──────────────────────────
    consentTrackingEnabled: z.boolean().optional(),

    // ── Lifecycle status (managed by beneficiary-lifecycle module) ──
    status: z.enum(['draft', 'active', 'on_hold', 'discharged', 'archived', 'deceased']).optional(),

    // ── Audit envelope ───────────────────────────────────────
    ...AuditEnvelope.shape,
  })
  .refine(b => Boolean(b.nationalId || b.mrn), {
    message: 'Beneficiary requires either nationalId or mrn',
    path: ['nationalId'],
  });

module.exports = {
  name: 'Beneficiary',
  modulePath: 'Beneficiary Core',
  mongooseModelName: 'Beneficiary',
  schema: Beneficiary,
  // canonical field → mongoose path (only when names differ)
  mongooseFieldMap: {
    // status: 'lifecycleStatus',   // example for future drift mapping
  },
};
