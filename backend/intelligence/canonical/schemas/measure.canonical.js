'use strict';
/**
 * Canonical Measure — module: Measures Library.
 *
 * Definition of a clinical instrument / outcome measure (M-CHAT-R, CARS-2,
 * Vineland, etc.). NOT a single scored event — that's `Assessment`.
 */

const { z, ObjectIdLike, AuditEnvelope } = require('../_primitives');

const MeasureCategory = z.enum([
  'screening',
  'diagnostic',
  'outcome',
  'functional',
  'behavioral',
  'cognitive',
  'communication',
  'motor',
  'social',
  'quality_of_life',
]);

const ScoringMethod = z.enum([
  'sum',
  'weighted_sum',
  'average',
  'percentile',
  'algorithm',
  'manual',
]);

const Measure = z.object({
  _id: ObjectIdLike.optional(),

  // Stable code — canonical identifier (e.g. 'M-CHAT-R/F', 'CARS-2').
  code: z.string().min(1),
  name: z.string().min(1),
  name_ar: z.string().optional(),

  category: MeasureCategory,
  scoringMethod: ScoringMethod.optional(),

  minScore: z.number().optional(),
  maxScore: z.number().optional(),

  // Bands / cut-offs for interpretation.
  cutoffs: z
    .array(
      z.object({
        label: z.string(),
        label_ar: z.string().optional(),
        minScore: z.number().optional(),
        maxScore: z.number().optional(),
      })
    )
    .optional(),

  applicableAgeMinMonths: z.number().int().optional(),
  applicableAgeMaxMonths: z.number().int().optional(),

  isActive: z.boolean().optional(),

  ...AuditEnvelope.shape,
});

module.exports = {
  name: 'Measure',
  modulePath: 'Measures Library',
  mongooseModelName: 'Measure',
  schema: Measure,
};
