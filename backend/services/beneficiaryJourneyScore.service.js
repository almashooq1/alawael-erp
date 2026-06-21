/**
 * Beneficiary Journey Score Service — خدمة درجة جاهزية رحلة المستفيد
 *
 * W0-LifecycleAlign: computes a readiness score and recommendation for the
 * next lifecycle stage based on progress, sessions, goals, assessments,
 * risk flags, ICF and GAS signals.
 *
 * Pure + testable: all model dependencies are injected.
 */

'use strict';

const RECOMMENDATIONS = Object.freeze({
  CONTINUE: 'continue',
  DISCHARGE: 'discharge',
  SUSPEND: 'suspend',
  INTENSIVE_SUPPORT: 'intensive_support',
  REVIEW: 'review',
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function diffDays(from, to) {
  if (!from || !to) return null;
  return Math.floor((new Date(from) - new Date(to)) / MS_PER_DAY);
}

/**
 * Compute score + recommendation from raw signals.
 *
 * @param {object} signals
 * @returns {{ score: number, recommendation: string, confidence: number, confidenceDimensions: number, rationaleAr: string, rationaleEn: string }}
 */
function computeScoreFromSignals(signals = {}) {
  const {
    progress = 0,
    sessionsCount = 0,
    daysSinceLastAssessment = null,
    openGoalsCount = 0,
    achievedGoalsCount = 0,
    riskFlagsCount = 0,
    icfScore = null,
    gasTScore = null,
    _sessionAttendanceRate = null,
  } = signals;

  // Progress contributes up to 40 points.
  const progressScore = clamp(progress, 0, 100) * 0.4;

  // Sessions contribute up to 15 points (saturates at 50 sessions).
  const sessionsScore = Math.min(sessionsCount, 50) * 0.3;

  // Goal achievement ratio contributes up to 20 points.
  const totalGoals = openGoalsCount + achievedGoalsCount;
  const achievementRatio = totalGoals > 0 ? achievedGoalsCount / totalGoals : 0;
  const goalsScore = achievementRatio * 20;

  // Assessment freshness contributes up to 10 points.
  let assessmentScore = 0;
  if (daysSinceLastAssessment === null) {
    assessmentScore = 0;
  } else if (daysSinceLastAssessment <= 30) {
    assessmentScore = 10;
  } else if (daysSinceLastAssessment <= 90) {
    assessmentScore = 5;
  } else {
    assessmentScore = 0;
  }

  // ICF/GAS average contributes up to 10 points.
  let clinicalScore = 0;
  const clinicalInputs = [icfScore, gasTScore].filter(
    v => typeof v === 'number' && Number.isFinite(v)
  );
  if (clinicalInputs.length > 0) {
    const avg = clinicalInputs.reduce((a, b) => a + b, 0) / clinicalInputs.length;
    clinicalScore = clamp(avg, 0, 100) * 0.1;
  }

  // Risk flags penalty: -5 per flag, max -15.
  const riskPenalty = Math.min(riskFlagsCount * 5, 15);

  const rawScore =
    progressScore + sessionsScore + goalsScore + assessmentScore + clinicalScore - riskPenalty;
  const score = clamp(Math.round(rawScore), 0, 100);

  // Confidence reflects data completeness across the five historical dimensions
  // used by the scoring formula. We keep these five for backward compatibility.
  const hasProgress = typeof signals.progress === 'number';
  const hasSessions = typeof signals.sessionsCount === 'number';
  const hasGoals = totalGoals > 0;
  const hasAssessment = daysSinceLastAssessment !== null;
  const hasClinical = clinicalInputs.length > 0;
  const confidenceDimensions = [
    hasProgress,
    hasSessions,
    hasGoals,
    hasAssessment,
    hasClinical,
  ].filter(Boolean).length;
  const confidence = clamp(confidenceDimensions / 5, 0, 1);

  let recommendation = RECOMMENDATIONS.CONTINUE;
  if (riskFlagsCount >= 2) {
    recommendation = RECOMMENDATIONS.INTENSIVE_SUPPORT;
  } else if (score >= 85 && achievedGoalsCount >= openGoalsCount) {
    recommendation = RECOMMENDATIONS.DISCHARGE;
  } else if (score < 30 && sessionsCount > 10) {
    recommendation = RECOMMENDATIONS.REVIEW;
  } else if (daysSinceLastAssessment !== null && daysSinceLastAssessment > 180) {
    recommendation = RECOMMENDATIONS.SUSPEND;
  }

  const rationaleAr = buildRationaleAr(score, recommendation, signals);
  const rationaleEn = buildRationaleEn(score, recommendation, signals);

  return { score, recommendation, confidence, confidenceDimensions, rationaleAr, rationaleEn };
}

function buildRationaleAr(score, recommendation, signals) {
  const parts = [`درجة الجاهزية ${score}/100`];
  if (signals.progress != null) parts.push(`التقدم ${signals.progress}%`);
  if (signals.achievedGoalsCount != null && signals.openGoalsCount != null) {
    parts.push(
      `الأهداف المحققة ${signals.achievedGoalsCount} من ${signals.openGoalsCount + signals.achievedGoalsCount}`
    );
  }
  if (signals.daysSinceLastAssessment != null) {
    parts.push(`آخر تقييم منذ ${signals.daysSinceLastAssessment} يوم`);
  }
  if (signals.icfScore != null) parts.push(`درجة ICF ${signals.icfScore}`);
  if (signals.gasTScore != null) parts.push(`درجة GAS T ${signals.gasTScore}`);
  if (signals.sessionAttendanceRate != null) {
    parts.push(`نسبة الحضور ${Math.round(signals.sessionAttendanceRate)}%`);
  }
  if (signals.riskFlagsCount) parts.push(`${signals.riskFlagsCount} علامة مخاطر`);

  const recLabels = {
    continue: 'الاستمرار في الخطة الحالية',
    discharge: 'مراجعة جاهزية التخرج',
    suspend: 'مراجعة إمكانية التعليق لطول فترة التقييم',
    intensive_support: 'تفعيل دعم مكثف بسبب المخاطر',
    review: 'مراجعة الخطة العلاجية',
  };
  parts.push(`التوصية: ${recLabels[recommendation]}`);
  return parts.join(' • ');
}

function buildRationaleEn(score, recommendation, signals) {
  const parts = [`Readiness score ${score}/100`];
  if (signals.progress != null) parts.push(`progress ${signals.progress}%`);
  if (signals.achievedGoalsCount != null && signals.openGoalsCount != null) {
    parts.push(
      `achieved ${signals.achievedGoalsCount}/${signals.openGoalsCount + signals.achievedGoalsCount} goals`
    );
  }
  if (signals.daysSinceLastAssessment != null) {
    parts.push(`last assessment ${signals.daysSinceLastAssessment} days ago`);
  }
  if (signals.icfScore != null) parts.push(`ICF ${signals.icfScore}`);
  if (signals.gasTScore != null) parts.push(`GAS T-score ${signals.gasTScore}`);
  if (signals.sessionAttendanceRate != null) {
    parts.push(`attendance ${Math.round(signals.sessionAttendanceRate)}%`);
  }
  if (signals.riskFlagsCount) parts.push(`${signals.riskFlagsCount} risk flags`);
  parts.push(`recommendation: ${recommendation}`);
  return parts.join(' • ');
}

function baseSignalsFromBeneficiary(beneficiary) {
  return {
    progress: beneficiary.progress,
    sessionsCount: beneficiary.sessions,
    daysSinceLastAssessment: null,
    openGoalsCount: 0,
    achievedGoalsCount: 0,
    riskFlagsCount: Array.isArray(beneficiary.riskFlags) ? beneficiary.riskFlags.length : 0,
    icfScore: null,
    gasTScore: null,
    sessionAttendanceRate: null,
  };
}

async function latestAssessmentDate(deps) {
  const { clinicalAssessmentModel, assessmentModel } = deps;
  const candidates = [];

  if (clinicalAssessmentModel) {
    try {
      const doc = await clinicalAssessmentModel
        .findOne({ beneficiary: deps.beneficiaryId, status: { $in: ['completed', 'reviewed'] } })
        .sort({ assessmentDate: -1 })
        .select('assessmentDate')
        .lean();
      if (doc?.assessmentDate) candidates.push(new Date(doc.assessmentDate));
    } catch {
      // ignore optional model errors
    }
  }

  if (assessmentModel) {
    try {
      const doc = await assessmentModel
        .findOne({ beneficiaryId: deps.beneficiaryId, status: { $nin: ['archived', 'pending'] } })
        .sort({ assessmentDate: -1 })
        .select('assessmentDate')
        .lean();
      if (doc?.assessmentDate) candidates.push(new Date(doc.assessmentDate));
    } catch {
      // ignore optional model errors
    }
  }

  if (candidates.length === 0) return null;
  return new Date(Math.max(...candidates));
}

async function fetchGoalCounts(deps) {
  const { therapeuticGoalModel, goalModel, beneficiaryId } = deps;

  if (therapeuticGoalModel) {
    try {
      const achieved = await therapeuticGoalModel.countDocuments({
        beneficiaryId,
        status: 'achieved',
        isDeleted: { $ne: true },
      });
      const open = await therapeuticGoalModel.countDocuments({
        beneficiaryId,
        status: {
          $in: ['active', 'draft', 'in_progress', 'partially_achieved', 'deferred', 'modified'],
        },
        isDeleted: { $ne: true },
      });
      return { openGoalsCount: open, achievedGoalsCount: achieved };
    } catch {
      // fall through to legacy goal model
    }
  }

  if (goalModel) {
    try {
      const achieved = await goalModel.countDocuments({
        participantId: beneficiaryId,
        status: 'achieved',
      });
      const open = await goalModel.countDocuments({
        participantId: beneficiaryId,
        status: { $in: ['not-started', 'in-progress', 'on-hold'] },
      });
      return { openGoalsCount: open, achievedGoalsCount: achieved };
    } catch {
      // ignore
    }
  }

  return { openGoalsCount: 0, achievedGoalsCount: 0 };
}

async function fetchIcfScore(deps) {
  const { icfAssessmentModel, beneficiaryId, now } = deps;
  if (!icfAssessmentModel) return null;
  try {
    const doc = await icfAssessmentModel
      .findOne({
        beneficiaryId,
        status: { $in: ['completed', 'reviewed', 'approved'] },
        overallFunctioningScore: { $exists: true, $ne: null },
      })
      .sort({ assessmentDate: -1 })
      .select('overallFunctioningScore assessmentDate')
      .lean();
    if (!doc) return null;
    const ageDays = diffDays(now, doc.assessmentDate);
    // ICF scores older than 1 year are considered stale for scoring purposes.
    if (ageDays != null && ageDays > 365) return null;
    return typeof doc.overallFunctioningScore === 'number' ? doc.overallFunctioningScore : null;
  } catch {
    return null;
  }
}

async function fetchGasTScore(deps) {
  const { gasScoreSnapshotModel, beneficiaryId, now } = deps;
  if (!gasScoreSnapshotModel) return null;
  try {
    const doc = await gasScoreSnapshotModel
      .findOne({ beneficiaryId, tScore: { $exists: true, $ne: null } })
      .sort({ snapshotDate: -1 })
      .select('tScore snapshotDate')
      .lean();
    if (!doc) return null;
    const ageDays = diffDays(now, doc.snapshotDate);
    // GAS snapshots older than 90 days are considered stale for scoring.
    if (ageDays != null && ageDays > 90) return null;
    return typeof doc.tScore === 'number' ? doc.tScore : null;
  } catch {
    return null;
  }
}

async function fetchSessionAttendanceRate(deps) {
  const { episodeModel, beneficiaryId } = deps;
  if (!episodeModel) return null;
  try {
    const episode = await episodeModel
      .findOne({ beneficiaryId, status: 'active', isDeleted: { $ne: true } })
      .sort({ startDate: -1 })
      .select('completedSessions expectedTotalSessions')
      .lean();
    if (!episode || !episode.expectedTotalSessions) return null;
    return clamp((episode.completedSessions / episode.expectedTotalSessions) * 100, 0, 100);
  } catch {
    return null;
  }
}

async function extractSignals(beneficiary, deps, nowFn) {
  const signals = baseSignalsFromBeneficiary(beneficiary);
  const now = nowFn();
  const queryDeps = { ...deps, beneficiaryId: beneficiary._id, now };

  const [assessmentDate, goalCounts, icfScore, gasTScore, attendanceRate] = await Promise.all([
    latestAssessmentDate(queryDeps),
    fetchGoalCounts(queryDeps),
    fetchIcfScore(queryDeps),
    fetchGasTScore(queryDeps),
    fetchSessionAttendanceRate(queryDeps),
  ]);

  signals.daysSinceLastAssessment = assessmentDate ? diffDays(now, assessmentDate) : null;
  signals.openGoalsCount = goalCounts.openGoalsCount;
  signals.achievedGoalsCount = goalCounts.achievedGoalsCount;
  signals.icfScore = icfScore;
  signals.gasTScore = gasTScore;
  signals.sessionAttendanceRate = attendanceRate;

  return signals;
}

/**
 * @param {object} opts
 *   - beneficiaryId  ObjectId|string
 *   - deps           { beneficiaryModel, journeyScoreModel, goalModel?, assessmentModel?, clinicalAssessmentModel?, icfAssessmentModel?, gasScoreSnapshotModel?, episodeModel? }
 *   - computedBy     string
 *   - now            () => Date
 */
async function computeAndSaveJourneyScore({
  beneficiaryId,
  deps = {},
  computedBy = 'system',
  now = () => new Date(),
} = {}) {
  const { beneficiaryModel, journeyScoreModel } = deps;

  if (!beneficiaryModel || !journeyScoreModel) {
    throw new Error('beneficiaryModel and journeyScoreModel are required');
  }

  const beneficiary = await beneficiaryModel.findById(beneficiaryId).lean();
  if (!beneficiary) throw new Error(`Beneficiary not found: ${beneficiaryId}`);

  const signals = await extractSignals(beneficiary, deps, now);
  const result = computeScoreFromSignals(signals);

  const doc = await journeyScoreModel.findOneAndUpdate(
    { beneficiaryId },
    {
      beneficiaryId,
      branchId: beneficiary.branchId,
      score: result.score,
      recommendation: result.recommendation,
      confidence: result.confidence,
      confidenceDimensions: result.confidenceDimensions,
      rationaleAr: result.rationaleAr,
      rationaleEn: result.rationaleEn,
      signals,
      computedAt: now(),
      computedBy,
    },
    { upsert: true, new: true }
  );

  return doc;
}

/**
 * Compute score without persisting (for preview / dry-run).
 */
async function previewJourneyScore({ beneficiaryId, deps = {}, now = () => new Date() } = {}) {
  const { beneficiaryModel } = deps;
  if (!beneficiaryModel) throw new Error('beneficiaryModel is required');
  const beneficiary = await beneficiaryModel.findById(beneficiaryId).lean();
  if (!beneficiary) throw new Error(`Beneficiary not found: ${beneficiaryId}`);

  const signals = await extractSignals(beneficiary, deps, now);
  return computeScoreFromSignals(signals);
}

module.exports = {
  RECOMMENDATIONS,
  computeScoreFromSignals,
  computeAndSaveJourneyScore,
  previewJourneyScore,
};
