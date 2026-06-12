'use strict';

/**
 * pathwayBundle.service.js — W1205 (Blueprint 43, R4: حزم المسارات حسب الإعاقة)
 *
 * Turns the static disability-pathway-bundles registry into live, beneficiary-
 * specific suggestions and — on explicit clinician selection — materialized
 * records. Two-step flow per design tenet 1.2.4 ("الذكاء يقترح، الإنسان يقرّر"):
 *
 *   1. suggestForBeneficiary(id)  — READ-ONLY. Resolves the registry bundle
 *      against the LIVE Measure + GoalBank libraries (refuse-to-fabricate:
 *      what doesn't resolve is reported, never invented).
 *   2. applyForBeneficiary(...)   — WRITE. Creates only what the caller
 *      explicitly selected: one ClinicalPathwayPlan (idempotent per
 *      beneficiary+pathwayType) + draft TherapeuticGoals from selected
 *      goal-bank templates, each pre-wired with a PRIMARY measureLink so the
 *      created goals are R3-compliant from birth (no goal without a measure).
 *
 * All models are looked up lazily via mongoose.model() so unit tests can
 * intercept, and so module load order never matters (W340 doctrine).
 */

const mongoose = require('mongoose');
const {
  BUNDLE_VERSION,
  bundleForDisabilityType,
  listBundles,
} = require('../intelligence/disability-pathway-bundles.registry');

const SUGGEST_LIMITS = Object.freeze({ measures: 25, goalTemplates: 25 });

/** GoalBank.domain → TherapeuticGoal.domain enum mapping. */
const GOALBANK_DOMAIN_TO_GOAL_DOMAIN = Object.freeze({
  SPEECH: 'speech',
  OCCUPATIONAL: 'motor_fine',
  PHYSICAL: 'motor_gross',
  BEHAVIORAL: 'behavioral',
  SPECIAL_EDU: 'academic',
  LIFE_SKILLS: 'self_care',
});

function ageInYears(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  return Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
}

function model(name) {
  return mongoose.model(name);
}

/**
 * Resolve the registry bundle for one beneficiary against the live libraries.
 * READ-ONLY. Returns { beneficiary, bundle, resolved, notes }.
 */
async function suggestForBeneficiary(beneficiaryId) {
  const Beneficiary = model('Beneficiary');
  const beneficiary = await Beneficiary.findById(beneficiaryId)
    .select('firstName lastName fullName disability category dateOfBirth branchId')
    .lean();
  if (!beneficiary) {
    const err = new Error('المستفيد غير موجود');
    err.statusCode = 404;
    throw err;
  }

  const disabilityType =
    (beneficiary.disability && beneficiary.disability.type) || beneficiary.category || 'other';
  const bundle = bundleForDisabilityType(disabilityType);
  const age = ageInYears(beneficiary.dateOfBirth);
  const notes = [];

  // ── Live measures (refuse-to-fabricate: query the library, report misses) ──
  let measures = [];
  try {
    const Measure = model('Measure');
    const query = { status: 'active', isDeleted: { $ne: true } };
    const or = [{ targetPopulation: 'all' }];
    if (bundle.measureTargetPopulations.length) {
      or.push({ targetPopulation: { $in: [...bundle.measureTargetPopulations] } });
    }
    query.$or = or;
    if (bundle.measureCategories.length) {
      query.category = { $in: [...bundle.measureCategories] };
    }
    measures = await Measure.find(query)
      .select('code name name_ar abbreviation category targetPopulation ageRange')
      .limit(SUGGEST_LIMITS.measures)
      .lean();
    if (measures.length === 0) {
      notes.push('لا توجد مقاييس مفعّلة مطابقة في المكتبة — شغّل seed:measures أو وسّع المكتبة');
    }
  } catch (err) {
    notes.push(`تعذّر الاستعلام عن مكتبة المقاييس: ${err.message}`);
  }

  // ── Live goal-bank templates (age-windowed when age is known) ─────────────
  let goalTemplates = [];
  try {
    const GoalBank = model('GoalBank');
    const query = { domain: { $in: [...bundle.goalBankDomains] } };
    if (age != null) {
      query.targetAgeMin = { $lte: age };
      query.targetAgeMax = { $gte: age };
    }
    goalTemplates = await GoalBank.find(query)
      .select(
        'domain category description difficulty measurementCriteria targetAgeMin targetAgeMax'
      )
      .limit(SUGGEST_LIMITS.goalTemplates)
      .lean();
    if (goalTemplates.length === 0) {
      notes.push('لا توجد أهداف مطابقة في بنك الأهداف لهذه الفئة/العمر');
    }
  } catch (err) {
    notes.push(`تعذّر الاستعلام عن بنك الأهداف: ${err.message}`);
  }

  // ── Existing pathway of this type (drives idempotency hint in the UI) ─────
  let existingPathwayId = null;
  try {
    const ClinicalPathwayPlan = model('ClinicalPathwayPlan');
    const existing = await ClinicalPathwayPlan.findOne({
      beneficiaryId,
      pathwayType: bundle.pathwayType,
      status: { $in: ['DRAFT', 'ACTIVE', 'PAUSED'] },
    })
      .select('_id status')
      .lean();
    if (existing) existingPathwayId = String(existing._id);
  } catch (_err) {
    /* model optional in some test boots */
  }

  return {
    bundleVersion: BUNDLE_VERSION,
    beneficiary: {
      id: String(beneficiary._id),
      disabilityType,
      age,
      branchId: beneficiary.branchId ? String(beneficiary.branchId) : null,
    },
    bundle: {
      key: bundle.key,
      titleAr: bundle.titleAr,
      titleEn: bundle.titleEn,
      pathwayType: bundle.pathwayType,
      guidanceAssessments: bundle.guidanceAssessments,
      interventionsAr: bundle.interventionsAr,
      defaultStages: bundle.defaultStages,
    },
    resolved: { measures, goalTemplates },
    existingPathwayId,
    notes,
  };
}

/**
 * Materialize an explicit selection from the suggestion.
 *
 * @param {Object} args
 * @param {string} args.beneficiaryId
 * @param {string|null} args.branchId       — pinned by the route (W269)
 * @param {string|null} args.actorId        — req.user id for audit fields
 * @param {Object} args.selections          — { createPathway?: boolean,
 *                                             goalTemplateIds?: string[],
 *                                             primaryMeasureId?: string,
 *                                             startDate?: string }
 * @returns {{created: Object, skipped: Array<{item: string, reason: string}>}}
 */
async function applyForBeneficiary({ beneficiaryId, branchId, actorId, selections = {} }) {
  const Beneficiary = model('Beneficiary');
  const beneficiary = await Beneficiary.findById(beneficiaryId)
    .select('disability category branchId')
    .lean();
  if (!beneficiary) {
    const err = new Error('المستفيد غير موجود');
    err.statusCode = 404;
    throw err;
  }

  const disabilityType =
    (beneficiary.disability && beneficiary.disability.type) || beneficiary.category || 'other';
  const bundle = bundleForDisabilityType(disabilityType);
  const effectiveBranchId = branchId || beneficiary.branchId || null;
  const startDate = selections.startDate ? new Date(selections.startDate) : new Date();

  const created = { pathwayPlanId: null, goalIds: [] };
  const skipped = [];

  // ── 1. Pathway plan (idempotent per beneficiary + pathwayType) ────────────
  if (selections.createPathway !== false) {
    const ClinicalPathwayPlan = model('ClinicalPathwayPlan');
    const existing = await ClinicalPathwayPlan.findOne({
      beneficiaryId,
      pathwayType: bundle.pathwayType,
      status: { $in: ['DRAFT', 'ACTIVE', 'PAUSED'] },
    })
      .select('_id')
      .lean();
    if (existing) {
      skipped.push({
        item: `pathway:${bundle.pathwayType}`,
        reason: `يوجد مسار نشط من النوع نفسه (${existing._id}) — لا يُنشأ مكرر`,
      });
    } else if (!effectiveBranchId) {
      skipped.push({
        item: `pathway:${bundle.pathwayType}`,
        reason: 'branchId غير متوفر — لا يمكن إنشاء المسار بدون فرع',
      });
    } else {
      const plan = await ClinicalPathwayPlan.create({
        beneficiaryId,
        branchId: effectiveBranchId,
        pathwayType: bundle.pathwayType,
        status: 'DRAFT',
        startDate,
        currentStageCode: bundle.defaultStages[0].code,
        stages: bundle.defaultStages.map(s => ({ ...s })),
        ...(actorId ? { createdBy: actorId } : {}),
      });
      created.pathwayPlanId = String(plan._id);
    }
  }

  // ── 2. Draft goals from explicitly selected goal-bank templates ───────────
  const goalTemplateIds = Array.isArray(selections.goalTemplateIds)
    ? selections.goalTemplateIds.filter(id => mongoose.isValidObjectId(id))
    : [];

  if (goalTemplateIds.length) {
    // R3 from birth: bundle-created goals MUST carry a PRIMARY measure link.
    const primaryMeasureId = selections.primaryMeasureId;
    let measure = null;
    if (primaryMeasureId && mongoose.isValidObjectId(primaryMeasureId)) {
      measure = await model('Measure')
        .findById(primaryMeasureId)
        .select('code name abbreviation')
        .lean();
    }

    // TherapeuticGoal.episodeId is REQUIRED (W1212 behavioral finding — the
    // static guards passed while every create would have thrown at runtime).
    // Resolution order: explicit selections.episodeId → the beneficiary's
    // active EpisodeOfCare → refuse to fabricate (skip with reason).
    let episodeId = null;
    if (selections.episodeId && mongoose.isValidObjectId(selections.episodeId)) {
      episodeId = selections.episodeId;
    } else {
      try {
        const episode = await model('EpisodeOfCare')
          .findOne({ beneficiaryId, status: 'active' })
          .select('_id')
          .sort({ createdAt: -1 })
          .lean();
        if (episode) episodeId = episode._id;
      } catch (_err) {
        /* model unregistered in this context — falls through to skip */
      }
    }

    if (!measure) {
      skipped.push({
        item: `goals:${goalTemplateIds.length}`,
        reason: 'لا هدف بلا مقياس — اختر primaryMeasureId صالحاً من المكتبة قبل إنشاء الأهداف (R3)',
      });
    } else if (!episodeId) {
      skipped.push({
        item: `goals:${goalTemplateIds.length}`,
        reason:
          'لا حلقة رعاية نشطة لهذا المستفيد — افتح حلقة (EpisodeOfCare) أو مرّر episodeId صراحة',
      });
    } else {
      const GoalBank = model('GoalBank');
      const templates = await GoalBank.find({ _id: { $in: goalTemplateIds } }).lean();
      const foundIds = new Set(templates.map(t => String(t._id)));
      for (const requestedId of goalTemplateIds) {
        if (!foundIds.has(String(requestedId))) {
          skipped.push({ item: `goalTemplate:${requestedId}`, reason: 'غير موجود في بنك الأهداف' });
        }
      }

      const { TherapeuticGoal } = require('../domains/goals/models/TherapeuticGoal');
      for (const tpl of templates) {
        const goal = await TherapeuticGoal.create({
          beneficiaryId,
          episodeId,
          ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
          title: `${tpl.category}: ${String(tpl.description).slice(0, 140)}`,
          description: tpl.description,
          type: 'short_term',
          domain: GOALBANK_DOMAIN_TO_GOAL_DOMAIN[tpl.domain] || 'other',
          status: 'draft',
          startDate,
          target: {
            value: 100,
            criteria: tpl.measurementCriteria || 'حسب معيار بنك الأهداف',
          },
          objectives: [
            {
              title: String(tpl.description).slice(0, 140),
              criteria: tpl.measurementCriteria,
              measureLinks: [
                {
                  measureId: measure._id,
                  measureCode: measure.code,
                  linkType: 'PRIMARY',
                  weight: 1,
                  linkRationale: `حزمة مسار ${bundle.titleAr} (W1205) — مقياس ${measure.abbreviation || measure.name}`,
                  interventionRefs: [`pathway-bundle:${bundle.key}`],
                  ...(actorId ? { linkedBy: actorId } : {}),
                },
              ],
            },
          ],
          tags: ['pathway-bundle', bundle.key],
          ...(actorId ? { createdBy: actorId } : {}),
        });
        created.goalIds.push(String(goal._id));
      }
    }
  }

  // ── 3. One unified-core timeline event (never blocks the write) ───────────
  if (created.pathwayPlanId || created.goalIds.length) {
    try {
      const CareTimeline = model('CareTimeline');
      await CareTimeline.create({
        beneficiaryId,
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
        eventType: 'care_plan_created',
        category: 'clinical',
        severity: 'info',
        title: `تفعيل حزمة مسار: ${bundle.titleAr}`,
        description: `pathway=${created.pathwayPlanId || 'skipped'} · goals=${created.goalIds.length}`,
        occurredAt: new Date(),
        ...(actorId ? { performedBy: actorId } : {}),
        metadata: { source: 'pathway-bundle', bundleKey: bundle.key, wave: 'W1205' },
      });
    } catch (_err) {
      /* timeline optional — never block the apply */
    }
  }

  return { bundleKey: bundle.key, pathwayType: bundle.pathwayType, created, skipped };
}

module.exports = {
  suggestForBeneficiary,
  applyForBeneficiary,
  listBundles,
  GOALBANK_DOMAIN_TO_GOAL_DOMAIN,
  SUGGEST_LIMITS,
};
