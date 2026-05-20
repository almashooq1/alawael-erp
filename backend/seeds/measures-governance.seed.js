'use strict';

/**
 * measures-governance.seed.js — Wave 210
 *
 * Seed entries demonstrating the full governance schema. Two measures
 * are intentionally shipped:
 *
 *   1. GMFM-66 — gold-standard outcome measure for CP. Exercises every
 *      block: SemVer version, MCID with established status + citation,
 *      eligibility (icd10 + prereq GMFCS + certification), reassessment
 *      cadence with triggers, engine linkage to goal templates.
 *
 *   2. SCQ — the W206b regression case. Previously the static catalog
 *      shipped SCQ without a `scoringType` field, forcing the engine to
 *      fall back to band-index lookup. Here SCQ declares derivedType
 *      explicitly — the new pre-validate hook would reject a seed that
 *      forgot it.
 *
 * Run idempotently — re-running upserts by code+version.
 *
 * Usage:
 *   node backend/seeds/measures-governance.seed.js
 */

const path = require('path');
const mongoose = require('mongoose');

const MEASURES = [
  // ────────────────────────────────────────────────────────────────────
  // 1) GMFM-66 — Gross Motor Function Measure (CP outcome)
  // ────────────────────────────────────────────────────────────────────
  {
    code: 'GMFM-66',
    name: 'Gross Motor Function Measure — 66 items',
    name_ar: 'مقياس الوظيفة الحركية الإجمالية — 66 بنداً',
    abbreviation: 'GMFM-66',
    version: '1.0.0',
    description:
      'Rasch-converted criterion-referenced outcome measure for change ' +
      'in gross motor function in children with cerebral palsy.',
    description_ar:
      'مقياس مرجعي المحكّ معاير وفق نموذج راش لقياس التغيّر في الوظيفة ' +
      'الحركية الإجمالية لدى الأطفال ذوي الشلل الدماغي.',

    category: 'motor',
    type: 'criterion_referenced',
    targetPopulation: ['cerebral_palsy', 'children'],
    ageRange: { min: 5, max: 18, unit: 'years' },

    scoringType: 'composite',
    minScore: 0,
    maxScore: 100,
    scoringDirection: 'higher_better',

    // W210 governance ────────────────────────────────────────────────
    purpose: 'outcome',
    rawShape: 'items_array',
    derivedType: 'rasch',
    derivedRange: { min: 0, max: 100 },
    interpretationStyle: 'continuous',
    scoringAlgorithmRef: 'scoring/gmfm-66.js',
    scoringEngineVersion: '1.0.0',

    eligibility: {
      icd10Required: ['G80.*'],
      prerequisiteMeasures: ['GMFCS'],
      certificationRequired: 'GMFM-66-cert',
      minTrainingHours: 16,
      languages: ['ar', 'en'],
      culturalAdaptation: 'done',
    },

    reassessment: {
      standardIntervalDays: 180,
      minIntervalDays: 90,
      maxIntervalDays: 365,
      triggerOverrides: [
        'post_botox',
        'post_selective_dorsal_rhizotomy',
        'post_orthopedic_surgery',
      ],
      sameRaterPreferred: true,
    },

    interpretation: {
      mcid: {
        value: 1.5,
        type: 'absolute',
        status: 'established',
        source:
          'Oeffinger D, et al. (2008). Outcome tools used for ambulatory ' +
          'children with cerebral palsy: responsiveness and MCID. ' +
          'Dev Med Child Neurol 50(12):918-925.',
        ageSpecific: [{ ageMin: 5, ageMax: 18, ageUnit: 'years', value: 1.5 }],
      },
      sdc: {
        value: 1.58,
        ci: 0.95,
        source: "Russell DJ et al. (2002). GMFM User's Manual.",
      },
    },

    cautions: {
      contraindications: ['acute_post_op_within_2_weeks', 'uncontrolled_seizures'],
      precautions: ['monitor_fatigue', 'allow_rest_breaks'],
      risksDescription_ar: 'تنبيه: راقب علامات الإجهاد وتوفير فترات استراحة.',
    },

    engine: {
      feedsSmartEngine: true,
      goalTemplateRefs: ['gmfm66_tier1', 'gmfm66_tier2', 'gmfm66_tier3'],
      programLibraryHints: ['pgm.pt.gross_motor', 'pgm.pt.cp_intensive'],
      requiresHaikuPolish: false,
    },

    reporting: {
      showInFamilyReport: true,
      familyFriendlyLabel_ar: 'تقييم مهارات الحركة الإجمالية',
      familyFriendlyLabel: 'Gross motor skills evaluation',
      cbahiStandardRef: 'CBAHI-RH-7.3',
      mohrsdRequirement: false,
      ministryReportField: 'motor_outcome_score',
    },

    administrationTime: 45,
    administeredBy: ['physical_therapist'],
    trainingRequired: true,
    licenseRequired: false,

    publisher: 'CanChild Centre for Childhood Disability Research',
    referenceUrl: 'https://www.canchild.ca/en/resources/44-gmfm',
    citation:
      'Russell DJ, Rosenbaum PL, Avery LM, Lane M. (2002). Gross Motor ' +
      "Function Measure (GMFM-66 & GMFM-88) User's Manual.",
    evidenceLevel: 'level_1',

    status: 'active',
    effectiveFrom: new Date('2026-06-01'),
    sensitivityLevel: 'MEDIUM',

    psychometrics: {
      reliability: 0.99,
      validity: 0.95,
      sensitivityToChange: 'high',
      mcid: 1.5,
    },

    tags: ['cp', 'gross_motor', 'outcome', 'gmfcs_linked', 'rasch'],
  },

  // ────────────────────────────────────────────────────────────────────
  // 2) SCQ — Social Communication Questionnaire (W206b regression fix)
  // ────────────────────────────────────────────────────────────────────
  // In the legacy static catalog SCQ had no `scoringType` key, which
  // forced the Smart Engine into a band-index fallback. The new
  // pre-validate hook would reject this entry without an explicit
  // derivedType. The screening cutoff (15) is unambiguous here.
  {
    code: 'SCQ',
    name: 'Social Communication Questionnaire',
    name_ar: 'استبيان التواصل الاجتماعي',
    abbreviation: 'SCQ',
    version: '1.0.0',
    description:
      'Caregiver-completed screening questionnaire for autism spectrum ' +
      'disorders. 40 yes/no items; cutoff 15 triggers diagnostic referral.',
    description_ar:
      'استبيان فحص يجيب عليه مقدم الرعاية لاضطراب طيف التوحد. 40 بنداً ' +
      'بإجابات نعم/لا؛ نقطة القطع 15 تستوجب التحويل لتقييم تشخيصي شامل.',

    category: 'screening',
    type: 'rating_scale',
    targetPopulation: ['autism', 'children'],
    ageRange: { min: 4, max: 40, unit: 'years' },

    scoringType: 'binary',
    minScore: 0,
    maxScore: 39,
    scoringDirection: 'lower_better',

    // W210 governance — explicit derivedType (the W206b fix) ─────────
    purpose: 'screening',
    rawShape: 'items_array',
    derivedType: 'sum',
    derivedRange: { min: 0, max: 39 },
    interpretationStyle: 'cutoff',
    scoringAlgorithmRef: 'scoring/scq.js',
    scoringEngineVersion: '1.0.0',

    eligibility: {
      languages: ['ar', 'en'],
      culturalAdaptation: 'done',
    },

    reassessment: {
      standardIntervalDays: 365,
      minIntervalDays: 180,
      sameRaterPreferred: false,
    },

    // Screening cutoff — not an outcome measure, so MCID is N/A.
    interpretation: {
      mcid: {
        status: 'not_applicable',
      },
    },

    engine: {
      feedsSmartEngine: true,
      goalTemplateRefs: [],
      programLibraryHints: ['pgm.assess.autism_diagnostic_referral'],
    },

    reporting: {
      showInFamilyReport: false,
      cbahiStandardRef: 'CBAHI-RH-5.2',
    },

    administrationTime: 10,
    administeredBy: ['psychologist', 'special_educator', 'parent_caregiver'],
    trainingRequired: false,
    licenseRequired: true,

    publisher: 'Western Psychological Services',
    citation:
      'Rutter M, Bailey A, Lord C. (2003). Social Communication ' +
      'Questionnaire (SCQ). Los Angeles: WPS.',
    evidenceLevel: 'level_2',

    status: 'active',
    effectiveFrom: new Date('2026-06-01'),
    sensitivityLevel: 'HIGH',

    psychometrics: {
      reliability: 0.84,
      validity: 0.88,
      sensitivityToChange: 'low',
    },

    scoringRules: [
      {
        rangeLabel: 'Below screening cutoff',
        rangeLabel_ar: 'دون حد الفحص',
        minScore: 0,
        maxScore: 14,
        interpretation: 'Below SCQ cutoff — routine follow-up',
        interpretation_ar: 'أقل من حد القطع — متابعة روتينية',
        severity: 'normal',
        color: '#2e7d32',
      },
      {
        rangeLabel: 'At or above cutoff — refer for diagnostic eval',
        rangeLabel_ar: 'عند أو فوق حد القطع — تحويل لتقييم تشخيصي',
        minScore: 15,
        maxScore: 39,
        interpretation: 'Refer for ADOS-2 / ADI-R diagnostic assessment',
        interpretation_ar: 'تحويل لتقييم ADOS-2 / ADI-R',
        severity: 'moderate',
        color: '#b71c1c',
      },
    ],

    tags: ['autism', 'screening', 'caregiver_report', 'cutoff'],
  },
];

// ─── Idempotent upsert ──────────────────────────────────────────────

async function seedGovernanceMeasures({ models } = {}) {
  const Measure =
    (models && models.Measure) ||
    mongoose.models.Measure ||
    require(path.join(__dirname, '..', 'domains', 'goals', 'models', 'Measure')).Measure;

  const results = { created: 0, updated: 0, skipped: 0 };

  for (const data of MEASURES) {
    const existing = await Measure.findOne({ code: data.code });
    if (existing) {
      // Re-running the seed updates governance metadata in place but does
      // not bump version (a real version bump is a deliberate publish flow).
      Object.assign(existing, data);
      try {
        await existing.save();
        results.updated++;
      } catch (err) {
        console.error(`[seed] failed to update ${data.code}: ${err.message}`);
        results.skipped++;
      }
    } else {
      try {
        await Measure.create(data);
        results.created++;
      } catch (err) {
        console.error(`[seed] failed to create ${data.code}: ${err.message}`);
        results.skipped++;
      }
    }
  }
  return results;
}

module.exports = { seedGovernanceMeasures, MEASURES };

// CLI entrypoint
if (require.main === module) {
  (async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/alawael';
    await mongoose.connect(uri);
    try {
      const r = await seedGovernanceMeasures();

      console.log('[seed] measures-governance:', r);
    } finally {
      await mongoose.disconnect();
    }
  })().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
