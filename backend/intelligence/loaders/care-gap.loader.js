'use strict';

/**
 * care-gap.loader.js — Wave 29.
 *
 * Real data loader for the `care-gap.v1` generator (Wave 18).
 * Queries the live data:
 *   • Beneficiary — status='active', limited to `maxBeneficiaries`
 *   • CarePlan (Wave 17) — active plan per beneficiary, looking for
 *     `status='ACTIVE' AND reviewDate IN PAST`
 *   • SmartGoal — open goals per beneficiary, looking for stalled ones
 *     (no `updatedAt` movement in `stalledDays` window)
 *   • Vaccination — scheduled vaccinations with `dueDate IN PAST` AND
 *     `administeredAt = null`
 *
 * Then assembles each beneficiary's shape into the ctx the generator
 * expects:
 *
 *   {
 *     beneficiaries: [{
 *       _id, branchId, fileNumber,
 *       lastAssessmentAt, tenureDays,
 *       activeCarePlan: { _id, reviewDate, planNumber? },
 *       activeGoals: [{ _id, status, lastProgressAt }],
 *       dueVaccinations: [{ _id, dueDate, vaccineName? }],
 *     }],
 *     now,
 *   }
 *
 * Pure factory: takes models + options, returns `async () => ctx`.
 * Mongo-free at this layer (Mongoose chainable-thenable mocks satisfy
 * the contract for tests).
 */

const DEFAULT_MAX_BENEFICIARIES = 500;
const DEFAULT_STALLED_DAYS = 30;

/**
 * @param {object} deps
 *   - Beneficiary, CarePlan, SmartGoal, Vaccination — Mongoose models
 *   - maxBeneficiaries — cap on N beneficiaries scanned per tick (perf)
 *   - stalledDays — what counts as "stalled" for goals (default 30)
 *   - now — clock injection
 *   - logger — console-compatible
 *
 * Returns `async () => ctx` OR null if Beneficiary model is missing
 * (loader registry will skip this generator).
 */
function createCareGapLoader({
  Beneficiary,
  CarePlan = null,
  SmartGoal = null,
  Vaccination = null,
  maxBeneficiaries = DEFAULT_MAX_BENEFICIARIES,
  stalledDays = DEFAULT_STALLED_DAYS,
  now = () => new Date(),
  logger = console,
} = {}) {
  if (!Beneficiary) {
    logger.warn && logger.warn('[care-gap.loader] Beneficiary model required — skipping');
    return null;
  }

  return async function load() {
    const tickAt = now();
    const _stalledCutoff = new Date(tickAt.getTime() - stalledDays * 86_400_000);

    // 1. Pull active beneficiaries (capped)
    let beneficiaryDocs;
    try {
      beneficiaryDocs = await Beneficiary.find({
        status: 'active',
        isArchived: { $ne: true },
      })
        .select(
          '_id branchId fileNumber firstName name lastAssessmentAt enrollmentDate registrationDate'
        )
        .limit(maxBeneficiaries)
        .lean();
    } catch (err) {
      logger.warn && logger.warn(`[care-gap.loader] beneficiary query failed: ${err.message}`);
      return { beneficiaries: [], now: tickAt };
    }

    const beneficiaryIds = beneficiaryDocs.map(b => b._id);
    if (beneficiaryIds.length === 0) return { beneficiaries: [], now: tickAt };

    // 2. Pull active care plans for these beneficiaries
    const carePlansByBen = new Map();
    if (CarePlan) {
      try {
        const plans = await CarePlan.find({
          beneficiary: { $in: beneficiaryIds },
          status: 'ACTIVE',
        })
          .select('_id beneficiary reviewDate startDate')
          .lean();
        for (const p of plans) {
          // Pick the latest active plan if there are duplicates
          const existing = carePlansByBen.get(String(p.beneficiary));
          if (!existing || (p.startDate && p.startDate > existing.startDate)) {
            carePlansByBen.set(String(p.beneficiary), p);
          }
        }
      } catch (err) {
        logger.warn && logger.warn(`[care-gap.loader] careplan query failed: ${err.message}`);
      }
    }

    // 3. Pull open SmartGoals grouped by beneficiary
    const goalsByBen = new Map();
    if (SmartGoal) {
      try {
        const goals = await SmartGoal.find({
          beneficiary: { $in: beneficiaryIds },
          status: { $in: ['active'] },
          deletedAt: null,
        })
          .select('_id beneficiary status updatedAt overallProgress')
          .lean();
        for (const g of goals) {
          const key = String(g.beneficiary);
          if (!goalsByBen.has(key)) goalsByBen.set(key, []);
          goalsByBen.get(key).push({
            _id: g._id,
            // Generator expects `status: 'in-progress'` for stalled
            // detection; map our `active` → `in-progress`.
            status: 'in-progress',
            // `lastProgressAt` proxy = `updatedAt` (every progress
            // log mutates the goal which bumps updatedAt).
            lastProgressAt: g.updatedAt,
          });
        }
      } catch (err) {
        logger.warn && logger.warn(`[care-gap.loader] smartgoal query failed: ${err.message}`);
      }
    }

    // 4. Pull overdue vaccinations grouped by beneficiary
    const vaxByBen = new Map();
    if (Vaccination) {
      try {
        const vax = await Vaccination.find({
          beneficiaryId: { $in: beneficiaryIds },
          status: 'scheduled',
          administeredAt: null,
        })
          .select('_id beneficiaryId dueDate vaccineName')
          .lean();
        for (const v of vax) {
          const key = String(v.beneficiaryId);
          if (!vaxByBen.has(key)) vaxByBen.set(key, []);
          vaxByBen.get(key).push({
            _id: v._id,
            dueDate: v.dueDate,
            vaccineName: v.vaccineName || null,
          });
        }
      } catch (err) {
        logger.warn && logger.warn(`[care-gap.loader] vaccination query failed: ${err.message}`);
      }
    }

    // 5. Assemble per-beneficiary shape
    const ctxBeneficiaries = beneficiaryDocs.map(b => {
      const key = String(b._id);
      const enrollDate = b.enrollmentDate || b.registrationDate || null;
      const tenureDays = enrollDate
        ? Math.floor((tickAt - new Date(enrollDate)) / 86_400_000)
        : null;
      return {
        _id: b._id,
        branchId: b.branchId || null,
        fileNumber: b.fileNumber || null,
        firstName: b.firstName || b.name || null,
        lastAssessmentAt: b.lastAssessmentAt || null,
        tenureDays,
        activeCarePlan: carePlansByBen.get(key) || null,
        activeGoals: goalsByBen.get(key) || [],
        dueVaccinations: vaxByBen.get(key) || [],
      };
    });

    return {
      beneficiaries: ctxBeneficiaries,
      now: tickAt,
      opts: { stalledDays },
    };
  };
}

module.exports = {
  createCareGapLoader,
  DEFAULT_MAX_BENEFICIARIES,
  DEFAULT_STALLED_DAYS,
};
