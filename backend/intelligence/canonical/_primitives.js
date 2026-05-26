'use strict';
/**
 * Canonical primitives — Zod building blocks reused by every entity schema.
 *
 * Keep this file dependency-free except for `zod`. No Mongoose, no DB.
 */

const { z } = require('zod');

// ── Identifiers ─────────────────────────────────────────────────────────────

/** 24-char hex string (Mongo ObjectId serialised) OR a real ObjectId instance. */
const ObjectIdLike = z.union([
  z.string().regex(/^[0-9a-fA-F]{24}$/, 'invalid ObjectId hex'),
  z.any().refine(v => v && typeof v === 'object' && typeof v.toHexString === 'function', {
    message: 'expected ObjectId-like (.toHexString())',
  }),
]);

/** Saudi National ID / Iqama (10 digits, starts with 1 or 2). */
const SaudiNationalId = z
  .string()
  .regex(/^[12]\d{9}$/, 'Saudi national ID must be 10 digits starting with 1 or 2');

/** MRN — center-issued medical record number. */
const MRN = z.string().min(3).max(32);

// ── Localised text ──────────────────────────────────────────────────────────

const ArabicText = z
  .string()
  .min(1)
  .refine(s => /[\u0600-\u06FF]/.test(s), {
    message: 'expected Arabic characters',
  });

const Bilingual = z.object({
  ar: z.string().min(1),
  en: z.string().min(1),
});

// ── Time / date ─────────────────────────────────────────────────────────────

const IsoDate = z.union([z.date(), z.string().datetime({ offset: true })]);
const IsoDateLoose = z.union([
  z.date(),
  z.string().refine(s => !Number.isNaN(Date.parse(s)), 'invalid date string'),
]);

// ── Common enums (reused across schemas) ───────────────────────────────────

const Gender = z.enum(['male', 'female']);

const DisabilityType = z.enum([
  'physical',
  'mental',
  'sensory',
  'multiple',
  'learning',
  'speech',
  'other',
]);

const DisabilitySeverity = z.enum(['mild', 'moderate', 'severe', 'profound']);

/** Episode status — single source of truth, mirrors EpisodeOfCare.js enum. */
const EpisodeStatus = z.enum([
  'planned',
  'active',
  'on_hold',
  'suspended',
  'completed',
  'cancelled',
  'transferred',
]);

const Priority = z.enum(['routine', 'urgent', 'emergency']);

/** Session status used by clinical, group, tele, AR/VR variants. */
const SessionStatus = z.enum([
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled',
]);

const ConsentState = z.enum(['not_required', 'pending', 'granted', 'revoked', 'expired']);

// ── Sensitivity grade (cross-cuts every entity for PDPL) ───────────────────

const SensitivityGrade = z.enum(['public', 'internal', 'confidential', 'restricted']);

// ── Audit envelope (every persisted entity carries this) ───────────────────

const AuditEnvelope = z
  .object({
    createdAt: IsoDateLoose.optional(),
    updatedAt: IsoDateLoose.optional(),
    createdBy: ObjectIdLike.optional(),
    updatedBy: ObjectIdLike.optional(),
    deletedAt: IsoDateLoose.nullable().optional(),
    schemaVersion: z.number().int().positive().optional(),
  })
  .partial();

module.exports = {
  z,
  ObjectIdLike,
  SaudiNationalId,
  MRN,
  ArabicText,
  Bilingual,
  IsoDate,
  IsoDateLoose,
  Gender,
  DisabilityType,
  DisabilitySeverity,
  EpisodeStatus,
  Priority,
  SessionStatus,
  ConsentState,
  SensitivityGrade,
  AuditEnvelope,
};
