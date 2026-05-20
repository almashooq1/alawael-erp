'use strict';

/**
 * measureSelectionStrategist.service.js — Wave 218
 * ════════════════════════════════════════════════════════════════════
 * Clinical Measure Selection Strategist
 *
 * Answers: "Which Measure should this beneficiary take, now, and why?"
 *
 * Sits one layer above:
 *   • W210 Measure governance (eligibility, purpose, cooldown, MCID,
 *     sensitivity, language)
 *   • W211b MeasureApplication history (cooldown, baseline continuity)
 *   • W212 scoring engine (MCID metadata)
 *   • W214 reassessment scheduler (cadence)
 *
 * Where W210 `measure.isEligibleFor()` answers "is this measure valid for
 * this beneficiary?" (yes/no), the strategist ranks the valid measures by
 * domain match, discipline toolkit, longitudinal continuity, Arabic
 * validation, MCID availability, sensitivity grade, and recent history.
 *
 * Pure ranking logic lives in `backend/measures/selection/rules.js` and
 * is unit-testable without Mongo. This service does the DB I/O glue:
 * loading candidate measures + the beneficiary's prior administrations,
 * then calling into the pure layer.
 * ════════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const {
  REASON_CODES,
  WEIGHTS,
  filterCandidate,
  scoreCandidate,
} = require('../measures/selection/rules');

// ─── Lazy model loaders (W210 service pattern) ────────────────────────
const M = {
  Measure: () => {
    try {
      return mongoose.model('Measure');
    } catch {
      try {
        require('../domains/goals/models/Measure');
        return mongoose.model('Measure');
      } catch {
        return null;
      }
    }
  },
  MeasureApplication: () => {
    try {
      return mongoose.model('MeasureApplication');
    } catch {
      try {
        require('../domains/goals/models/MeasureApplication');
        return mongoose.model('MeasureApplication');
      } catch {
        return null;
      }
    }
  },
};

const MAX_RECOMMENDED = 5;
const MAX_EXCLUDED_RETURN = 50;

class MeasureSelectionStrategist {
  /**
   * Main entry. Returns ranked recommendations + exclusion reasons.
   *
   * @param {object} args
   * @param {object} args.beneficiary           — { _id?, ageMonths?, ageYears?, dob?, icd10[], language? }
   * @param {string} [args.discipline]          — speech_therapist | physical_therapist | ...
   * @param {string} [args.clinicalQuestion]    — screening | baseline | progress | discharge | reassessment | referral
   * @param {string} [args.phase]               — intake | baseline | mid | reassessment | discharge | follow-up
   * @param {string} [args.domain]              — motor | communication | cognitive | adaptive | ...
   * @param {number} [args.availableMinutes]
   * @param {string[]} [args.respondents]       — ['parent','clinician','teacher']
   * @param {string} [args.setting]             — clinic | home | school | tele
   * @param {string[]} [args.raterCertifications]
   * @param {string[]} [args.administeredMeasureCodes] — codes admin'd this episode
   * @param {string} [args.baselineMeasureCode] — measure.code of episode baseline (drives continuity)
   * @param {object} [args.candidatePool]       — optional pre-filtered list (used in tests + drilldowns)
   * @param {number} [args.maxRecommended]      — default 5
   * @returns {Promise<{
   *   recommended: Array<{
   *     measureId, code, name, score, reasonCodes[], estimatedMinutes,
   *     requiresRespondent, purpose, sensitivityLevel
   *   }>,
   *   excluded: Array<{ measureId, code, reasonCodes[] }>,
   *   noViableMeasure: boolean,
   *   fallbackUsed: boolean,
   *   flagForClinicalReview: boolean,
   *   generatedAt: string,
   * }>}
   */
  async recommend(args = {}) {
    const now = args.now || new Date();
    const maxRec = args.maxRecommended || MAX_RECOMMENDED;

    if (!args.beneficiary) {
      throw new Error('measureSelectionStrategist.recommend: beneficiary required');
    }

    // 1. Candidate pool
    let candidates;
    if (Array.isArray(args.candidatePool)) {
      candidates = args.candidatePool;
    } else {
      candidates = await this._loadCandidates({
        discipline: args.discipline,
        domain: args.domain,
        beneficiary: args.beneficiary,
      });
    }

    // 2. Prior administration history (cooldown + continuity)
    const historyByMeasureId = await this._loadHistoryFor(args.beneficiary._id);

    // 3. Build ctx for pure layer
    const ctx = {
      beneficiary: args.beneficiary,
      discipline: args.discipline,
      clinicalQuestion: args.clinicalQuestion,
      phase: args.phase,
      domain: args.domain,
      availableMinutes: args.availableMinutes,
      respondents: args.respondents || [],
      setting: args.setting,
      raterCertifications: args.raterCertifications || [],
      administeredMeasureCodes: args.administeredMeasureCodes || [],
      baselineMeasureCode: args.baselineMeasureCode,
      historyByMeasureId,
      now,
    };

    // 4. Filter + score
    const recommended = [];
    const excluded = [];

    for (const m of candidates) {
      const f = filterCandidate(m, ctx);
      if (!f.eligible) {
        if (excluded.length < MAX_EXCLUDED_RETURN) {
          excluded.push({
            measureId: m._id || m.id || null,
            code: m.code,
            reasonCodes: f.reasonCodes,
          });
        }
        continue;
      }
      const s = scoreCandidate(m, ctx);
      recommended.push({
        measureId: m._id || m.id || null,
        code: m.code,
        name: m.name,
        name_ar: m.name_ar,
        score: s.score,
        reasonCodes: s.reasonCodes,
        estimatedMinutes: m.administrationTime || null,
        requiresRespondent: this._inferRespondent(m),
        purpose: m.purpose,
        sensitivityLevel: m.sensitivityLevel,
      });
    }

    // 5. Rank (score desc, then shorter burden, then alphabetical for stability)
    recommended.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const am = a.estimatedMinutes || 999;
      const bm = b.estimatedMinutes || 999;
      if (am !== bm) return am - bm;
      return String(a.code).localeCompare(String(b.code));
    });

    const top = recommended.slice(0, maxRec);

    // 6. Output flags
    const noViableMeasure = top.length === 0;
    const fallbackUsed = top.length > 0 && top[0].score <= 0;
    const flagForClinicalReview = noViableMeasure || fallbackUsed;

    return {
      recommended: top,
      excluded,
      noViableMeasure,
      fallbackUsed,
      flagForClinicalReview,
      generatedAt: now.toISOString(),
    };
  }

  /**
   * Returns the discipline's primary toolkit codes (for UI hints).
   */
  toolkitFor(discipline) {
    const { DISCIPLINE_PRIMARY_TOOLKIT } = require('../measures/selection/rules');
    return [...(DISCIPLINE_PRIMARY_TOOLKIT[discipline] || [])];
  }

  // ── Internals ──────────────────────────────────────────────────────

  async _loadCandidates({ discipline, domain }) {
    const Measure = M.Measure();
    if (!Measure) {
      logger.warn('[MeasureSelectionStrategist] Measure model not loaded');
      return [];
    }
    const filter = { status: 'active', isDeleted: { $ne: true } };
    // Domain hint narrows the pool but we don't HARD-filter on category
    // — a measure with category=motor but targetPopulation includes the
    // requested cohort should still be considered. The scorer handles
    // primary vs secondary domain match.
    if (discipline) filter.administeredBy = discipline;
    if (domain) {
      filter.$or = [{ category: domain }, { targetPopulation: domain }];
    }
    try {
      return await Measure.find(filter).lean();
    } catch (err) {
      logger.warn('[MeasureSelectionStrategist] candidate load failed: %s', err.message);
      return [];
    }
  }

  async _loadHistoryFor(beneficiaryId) {
    const map = new Map();
    if (!beneficiaryId) return map;
    const MeasureApplication = M.MeasureApplication();
    if (!MeasureApplication) return map;
    try {
      // Latest 2 per measure — top one for cooldown + lastTotalRawScore,
      // second for the prior delta the RECENT_NO_MCID_CHANGE soft penalty
      // needs.
      const docs = await MeasureApplication.aggregate([
        {
          $match: {
            beneficiaryId: new mongoose.Types.ObjectId(beneficiaryId),
            status: { $in: ['completed', 'locked'] },
          },
        },
        { $sort: { measureId: 1, applicationDate: -1 } },
        {
          $group: {
            _id: '$measureId',
            recent: { $push: '$$ROOT' },
          },
        },
      ]);
      for (const grp of docs) {
        const recent = grp.recent.slice(0, 2);
        const [last, prev] = recent;
        if (!last) continue;
        map.set(String(grp._id), {
          lastDate: last.applicationDate,
          lastTotalRawScore: last.totalRawScore,
          lastIsBaseline: !!last.isBaseline,
          priorTotalRawScore: prev ? prev.totalRawScore : null,
        });
      }
    } catch (err) {
      logger.warn('[MeasureSelectionStrategist] history load failed: %s', err.message);
    }
    return map;
  }

  _inferRespondent(measure) {
    const admBy = measure.administeredBy || [];
    if (admBy.includes('parent_caregiver') && admBy.length === 1) return 'parent';
    if (admBy.includes('parent_caregiver')) return 'parent_or_clinician';
    if (admBy.length) return 'clinician';
    return null;
  }
}

const singleton = new MeasureSelectionStrategist();

module.exports = singleton;
module.exports.REASON_CODES = REASON_CODES;
module.exports.WEIGHTS = WEIGHTS;
// Pure helpers re-exported so tests can hit them without the service.
module.exports._rules = require('../measures/selection/rules');
