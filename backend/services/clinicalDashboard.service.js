/**
 * Clinical Dashboard Aggregation Service
 * خدمة تجميع لوحة المعلومات السريرية
 *
 * Aggregates clinical data from ALL modules for a single beneficiary
 * into a unified JSON response for the clinical dashboard.
 *
 * @module services/clinicalDashboard.service
 */

'use strict';

// ─── Models ───────────────────────────────────────────────────────────────

// DDD models (preferred)
let ICFAssessment;
try {
  ICFAssessment = require('../models/assessment/ICFAssessment');
  console.log('[ClinicalDashboard] Loaded ICFAssessment from DDD path');
} catch (err) {
  console.warn('[ClinicalDashboard] ICFAssessment DDD model not found, will attempt fallback');
}

let CarePlanVersion;
try {
  CarePlanVersion = require('../models/CarePlanVersion');
  console.log('[ClinicalDashboard] Loaded CarePlanVersion');
} catch (err) {
  console.warn('[ClinicalDashboard] CarePlanVersion model not found:', err.message);
}

let ClinicalSession;
try {
  ClinicalSession = require('../domains/sessions/models/ClinicalSession');
  console.log('[ClinicalDashboard] Loaded ClinicalSession from DDD path');
} catch (err) {
  console.warn('[ClinicalDashboard] ClinicalSession DDD model not found, will attempt fallback');
}

// Fallback: legacy TherapySession
let TherapySession;
try {
  TherapySession = require('../models/TherapySession');
  console.log('[ClinicalDashboard] Loaded fallback TherapySession');
} catch (err) {
  console.warn('[ClinicalDashboard] TherapySession fallback not found:', err.message);
}

let TherapeuticGoal;
try {
  TherapeuticGoal = require('../domains/goals/models/TherapeuticGoal');
  console.log('[ClinicalDashboard] Loaded TherapeuticGoal from DDD path');
} catch (err) {
  console.warn('[ClinicalDashboard] TherapeuticGoal DDD model not found, will attempt fallback');
}

// Fallback: legacy Goal
let Goal;
try {
  Goal = require('../models/Goal');
  console.log('[ClinicalDashboard] Loaded fallback Goal');
} catch (err) {
  console.warn('[ClinicalDashboard] Goal fallback not found:', err.message);
}

let MDTMeeting;
try {
  MDTMeeting = require('../models/MDTCoordination');
  console.log('[ClinicalDashboard] Loaded MDTMeeting');
} catch (err) {
  console.warn('[ClinicalDashboard] MDTMeeting model not found:', err.message);
}

let Beneficiary;
try {
  Beneficiary = require('../models/Beneficiary');
  console.log('[ClinicalDashboard] Loaded Beneficiary');
} catch (err) {
  console.warn('[ClinicalDashboard] Beneficiary model not found:', err.message);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Safely extract value from a Promise.allSettled result.
 * Logs error and returns fallback on rejection.
 */
function settle(result, fallback, sectionName) {
  if (result.status === 'fulfilled') {
    return result.value;
  }
  console.error(`[ClinicalDashboard] ${sectionName} query failed:`, result.reason?.message || result.reason);
  return fallback;
}

/**
 * Calculate age from date of birth.
 */
function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

/**
 * Get start and end of current month.
 */
function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

// ─── Main Service ───────────────────────────────────────────────────────────

/**
 * Get clinical dashboard data for a beneficiary.
 *
 * @param {string} beneficiaryId - MongoDB ObjectId of the beneficiary
 * @returns {Promise<Object>} Unified clinical dashboard payload
 */
async function getClinicalDashboard(beneficiaryId) {
  console.log(`[ClinicalDashboard] Starting aggregation for beneficiary: ${beneficiaryId}`);

  // ── Step 1: Validate beneficiaryId and fetch basic info ──────────────────
  if (!beneficiaryId) {
    console.error('[ClinicalDashboard] beneficiaryId is required');
    return {
      success: false,
      message: 'beneficiaryId is required',
      beneficiary: null,
      icf: { latestAssessment: null, trend: { direction: 'stable', change: 0 }, history: [] },
      carePlan: { planId: null, status: null, versionNumber: null, goals: [], overallGoalProgress: 0 },
      sessions: { upcoming: [], recent: [], stats: { completedThisMonth: 0, totalThisMonth: 0, attendanceRate: 0 } },
      mdt: { meetings: [], hasOpenReferrals: false },
      alerts: [],
    };
  }

  let beneficiary = null;
  try {
    if (Beneficiary) {
      beneficiary = await Beneficiary.findById(beneficiaryId)
        .select('firstName lastName firstName_ar lastName_ar dateOfBirth disability medicalInfo')
        .lean();
    }
  } catch (err) {
    console.error('[ClinicalDashboard] Failed to fetch beneficiary:', err.message);
  }

  if (!beneficiary) {
    console.warn(`[ClinicalDashboard] Beneficiary not found: ${beneficiaryId}`);
    return {
      success: false,
      message: `Beneficiary not found: ${beneficiaryId}`,
      beneficiary: null,
      icf: { latestAssessment: null, trend: { direction: 'stable', change: 0 }, history: [] },
      carePlan: { planId: null, status: null, versionNumber: null, goals: [], overallGoalProgress: 0 },
      sessions: { upcoming: [], recent: [], stats: { completedThisMonth: 0, totalThisMonth: 0, attendanceRate: 0 } },
      mdt: { meetings: [], hasOpenReferrals: false },
      alerts: [],
    };
  }

  const beneficiaryName = beneficiary.firstName_ar && beneficiary.lastName_ar
    ? `${beneficiary.firstName_ar} ${beneficiary.lastName_ar}`
    : `${beneficiary.firstName || ''} ${beneficiary.lastName || ''}`.trim();

  const diagnosis = beneficiary.disability?.description
    || (beneficiary.medicalInfo?.conditions || []).join(', ')
    || beneficiary.disability?.primaryType
    || beneficiary.disability?.type
    || null;

  const beneficiaryInfo = {
    id: beneficiary._id.toString(),
    name: beneficiaryName || 'Unknown',
    age: calculateAge(beneficiary.dateOfBirth),
    diagnosis,
    photo: null, // No photo field in current Beneficiary schema
  };

  console.log(`[ClinicalDashboard] Beneficiary resolved: ${beneficiaryInfo.name} (age ${beneficiaryInfo.age})`);

  // ── Step 2–8: Parallel aggregation queries ───────────────────────────

  const now = new Date();
  const sevenDaysLater = new Date(now);
  sevenDaysLater.setDate(now.getDate() + 7);

  const { start: monthStart, end: monthEnd } = getCurrentMonthRange();

  // Build query promises using allSettled
  const queries = [];

  // 2. Latest completed ICF assessment
  queries.push(
    (async () => {
      if (!ICFAssessment || !ICFAssessment.findLatestByPatient) return null;
      const assessment = await ICFAssessment.findLatestByPatient(beneficiaryId);
      return assessment || null;
    })()
  );

  // ICF history (last 6 assessments)
  queries.push(
    (async () => {
      if (!ICFAssessment) return [];
      const history = await ICFAssessment.find({ beneficiary: beneficiaryId, status: 'completed' })
        .sort({ assessmentDate: -1 })
        .limit(6)
        .select('assessmentDate overallScore')
        .lean();
      return history || [];
    })()
  );

  // 3. Active care plan
  queries.push(
    (async () => {
      if (!CarePlanVersion) return null;
      const plan = await CarePlanVersion.findOne({
        beneficiaryId,
        status: { $nin: ['superseded', 'archived'] },
      })
        .sort({ createdAt: -1 })
        .lean();
      return plan || null;
    })()
  );

  // 4. Upcoming sessions (next 7 days)
  queries.push(
    (async () => {
      const SessionModel = ClinicalSession || TherapySession;
      if (!SessionModel) return [];
      const dateField = ClinicalSession ? 'scheduledDate' : 'date';
      const upcoming = await SessionModel.find({
        beneficiaryId,
        [dateField]: { $gte: now, $lte: sevenDaysLater },
        status: 'scheduled',
      })
        .limit(5)
        .sort({ [dateField]: 1 })
        .lean();
      return upcoming || [];
    })()
  );

  // 5. Recent completed sessions (last 5)
  queries.push(
    (async () => {
      const SessionModel = ClinicalSession || TherapySession;
      if (!SessionModel) return [];
      const dateField = ClinicalSession ? 'scheduledDate' : 'date';
      const recent = await SessionModel.find({
        beneficiaryId,
        status: 'completed',
      })
        .limit(5)
        .sort({ [dateField]: -1 })
        .lean();
      return recent || [];
    })()
  );

  // 6. Active goals
  queries.push(
    (async () => {
      const GoalModel = TherapeuticGoal || Goal;
      if (!GoalModel) return [];
      const idField = TherapeuticGoal ? 'beneficiaryId' : 'participantId';
      const goals = await GoalModel.find({
        [idField]: beneficiaryId,
        status: 'active',
      })
        .limit(10)
        .lean();
      return goals || [];
    })()
  );

  // 7. Recent MDT meetings
  queries.push(
    (async () => {
      if (!MDTMeeting) return [];
      const meetings = await MDTMeeting.find({ 'cases.beneficiary': beneficiaryId })
        .limit(3)
        .sort({ date: -1 })
        .lean();
      return meetings || [];
    })()
  );

  // 8a. Sessions completed this month (for stats)
  queries.push(
    (async () => {
      const SessionModel = ClinicalSession || TherapySession;
      if (!SessionModel) return 0;
      const dateField = ClinicalSession ? 'scheduledDate' : 'date';
      const count = await SessionModel.countDocuments({
        beneficiaryId,
        status: 'completed',
        [dateField]: { $gte: monthStart, $lt: monthEnd },
      });
      return count;
    })()
  );

  // 8b. Total sessions this month (scheduled + completed + cancelled)
  queries.push(
    (async () => {
      const SessionModel = ClinicalSession || TherapySession;
      if (!SessionModel) return 0;
      const dateField = ClinicalSession ? 'scheduledDate' : 'date';
      const count = await SessionModel.countDocuments({
        beneficiaryId,
        [dateField]: { $gte: monthStart, $lt: monthEnd },
      });
      return count;
    })()
  );

  // 8c. Attended sessions this month (for rate)
  queries.push(
    (async () => {
      const SessionModel = ClinicalSession || TherapySession;
      if (!SessionModel) return 0;
      const dateField = ClinicalSession ? 'scheduledDate' : 'date';
      const count = await SessionModel.countDocuments({
        beneficiaryId,
        status: { $in: ['completed', 'attended'] },
        [dateField]: { $gte: monthStart, $lt: monthEnd },
      });
      return count;
    })()
  );

  console.log('[ClinicalDashboard] Executing parallel queries...');
  const results = await Promise.allSettled(queries);
  console.log(`[ClinicalDashboard] Parallel queries completed: ${results.length} results`);

  // ── Extract results safely ─────────────────────────────────────────────

  const latestIcfAssessment = settle(results[0], null, 'ICF latest assessment');
  const icfHistoryRaw = settle(results[1], [], 'ICF history');
  const activeCarePlan = settle(results[2], null, 'Active care plan');
  const upcomingSessionsRaw = settle(results[3], [], 'Upcoming sessions');
  const recentSessionsRaw = settle(results[4], [], 'Recent sessions');
  const activeGoalsRaw = settle(results[5], [], 'Active goals');
  const recentMdtMeetings = settle(results[6], [], 'MDT meetings');
  const completedThisMonth = settle(results[7], 0, 'Sessions completed this month');
  const totalThisMonth = settle(results[8], 0, 'Total sessions this month');
  const attendedThisMonth = settle(results[9], 0, 'Attended sessions this month');

  // ── Build ICF section ──────────────────────────────────────────────────

  let icfTrend = { direction: 'stable', change: 0 };
  const icfHistory = (icfHistoryRaw || [])
    .map((a) => ({
      date: a.assessmentDate || a.createdAt || null,
      overallScore: typeof a.overallScore === 'number' ? a.overallScore : null,
    }))
    .filter((h) => h.overallScore !== null)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (icfHistory.length >= 2) {
    const latest = icfHistory[icfHistory.length - 1].overallScore;
    const previous = icfHistory[icfHistory.length - 2].overallScore;
    const change = latest - previous;
    let direction = 'stable';
    if (change > 0.5) direction = 'improving';
    else if (change < -0.5) direction = 'worsening';
    icfTrend = { direction, change: Math.round(change * 100) / 100 };
  }

  const icfSection = {
    latestAssessment: latestIcfAssessment
      ? {
          overallScore: latestIcfAssessment.overallScore ?? null,
          domainScores: latestIcfAssessment.domainScores || {},
          assessmentDate: latestIcfAssessment.assessmentDate || null,
          coreSetType: latestIcfAssessment.coreSetType || null,
        }
      : null,
    trend: icfTrend,
    history: icfHistory.slice(-6), // last 6 assessments
  };

  // ── Build Care Plan section ────────────────────────────────────────────

  let carePlanGoals = [];
  let overallGoalProgress = 0;

  if (activeCarePlan && Array.isArray(activeCarePlan.goals)) {
    carePlanGoals = activeCarePlan.goals.map((g) => ({
      goalId: g.goalId || g._id || null,
      statement: g.statement || g.title || g.description || '',
      domain: g.domain || 'general',
      progressPercentage: g.progressPercentage ?? g.progress ?? 0,
      status: g.status || 'unknown',
      icfMapping: Array.isArray(g.icfMapping)
        ? g.icfMapping.map((m) => ({
            icfCode: m.icfCode || null,
            isPrimary: m.isPrimary || false,
            targetQualifier: m.targetQualifier || null,
            baselineQualifier: m.baselineQualifier || null,
          }))
        : [],
    }));

    const progressSum = carePlanGoals.reduce((sum, g) => sum + (g.progressPercentage || 0), 0);
    overallGoalProgress = carePlanGoals.length > 0
      ? Math.round((progressSum / carePlanGoals.length) * 100) / 100
      : 0;
  }

  const carePlanSection = {
    planId: activeCarePlan?.planId || activeCarePlan?._id?.toString() || null,
    status: activeCarePlan?.status || null,
    versionNumber: activeCarePlan?.versionNumber || null,
    goals: carePlanGoals,
    overallGoalProgress,
  };

  // ── Build Sessions section ─────────────────────────────────────────────

  const formatSession = (session, isRecent) => {
    const dateField = session.scheduledDate || session.date || null;
    const therapist = session.therapistId || session.therapist || session.therapistName || null;
    const base = {
      id: session._id?.toString() || null,
      date: dateField,
      therapist: typeof therapist === 'object' && therapist?.name
        ? therapist.name
        : therapist?.toString() || null,
      type: session.type || session.sessionType || session.modality || 'unknown',
    };
    if (isRecent) {
      return {
        ...base,
        summary: session.summary || session.sessionSummary || session.notes || null,
      };
    }
    return {
      ...base,
      status: session.status || 'unknown',
    };
  };

  const upcomingSessions = upcomingSessionsRaw.map((s) => formatSession(s, false));
  const recentSessions = recentSessionsRaw.map((s) => formatSession(s, true));

  const attendanceRate = totalThisMonth > 0
    ? Math.round((attendedThisMonth / totalThisMonth) * 100)
    : 0;

  const sessionsSection = {
    upcoming: upcomingSessions,
    recent: recentSessions,
    stats: {
      completedThisMonth,
      totalThisMonth,
      attendanceRate,
    },
  };

  // ── Build MDT section ──────────────────────────────────────────────────

  const mdtMeetings = recentMdtMeetings.map((m) => ({
    id: m._id?.toString() || null,
    date: m.date || m.scheduledAt || m.createdAt || null,
    attendees: Array.isArray(m.attendees)
      ? m.attendees.map((a) => a.name || a.user?.toString() || 'Unknown')
      : [],
    decisions: Array.isArray(m.decisions)
      ? m.decisions.map((d) => ({
          title: d.title || 'Untitled',
          description: d.description || '',
          status: d.status || 'PROPOSED',
          category: d.category || 'OTHER',
        }))
      : [],
  }));

  // Check for open referrals (if the MDT model has a referral ticket sub-model)
  let hasOpenReferrals = false;
  try {
    if (MDTMeeting) {
      const openReferralCount = await MDTMeeting.countDocuments({
        'cases.beneficiary': beneficiaryId,
        status: { $in: ['PENDING', 'IN_PROGRESS', 'OPEN'] },
      });
      hasOpenReferrals = openReferralCount > 0;
    }
  } catch (err) {
    console.warn('[ClinicalDashboard] Open referral check failed:', err.message);
    hasOpenReferrals = false;
  }

  const mdtSection = {
    meetings: mdtMeetings,
    hasOpenReferrals,
  };

  // ── Build Alerts ───────────────────────────────────────────────────────

  const alerts = [];

  // Alert: overdue goals
  const overdueGoals = (activeGoalsRaw || []).filter((g) => {
    const targetDate = g.targetDate || g.deadline;
    return targetDate && new Date(targetDate) < now && g.status === 'active';
  });
  if (overdueGoals.length > 0) {
    alerts.push({
      type: 'goal_overdue',
      message: `${overdueGoals.length} active goal(s) have passed their target date`,
      severity: overdueGoals.length > 3 ? 'high' : 'medium',
    });
  }

  // Alert: ICF reassessment due (if last assessment > 6 months ago)
  if (icfSection.latestAssessment?.assessmentDate) {
    const lastAssessmentDate = new Date(icfSection.latestAssessment.assessmentDate);
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    if (lastAssessmentDate < sixMonthsAgo) {
      alerts.push({
        type: 'icf_reassessment_due',
        message: 'ICF reassessment is overdue (last assessment > 6 months ago)',
        severity: 'medium',
      });
    }
  } else if (!icfSection.latestAssessment) {
    alerts.push({
      type: 'icf_reassessment_due',
      message: 'No completed ICF assessment found for this beneficiary',
      severity: 'high',
    });
  }

  // Alert: plan review due
  if (activeCarePlan?.reviewSchedule?.nextReviewAt) {
    const nextReview = new Date(activeCarePlan.reviewSchedule.nextReviewAt);
    if (nextReview < now) {
      alerts.push({
        type: 'plan_review',
        message: 'Care plan review is overdue',
        severity: 'medium',
      });
    } else if (nextReview < sevenDaysLater) {
      alerts.push({
        type: 'plan_review',
        message: 'Care plan review is due within the next 7 days',
        severity: 'low',
      });
    }
  }

  // ── Assemble final response ────────────────────────────────────────────

  const dashboard = {
    success: true,
    beneficiary: beneficiaryInfo,
    icf: icfSection,
    carePlan: carePlanSection,
    sessions: sessionsSection,
    mdt: mdtSection,
    alerts,
  };

  console.log(`[ClinicalDashboard] Aggregation complete for ${beneficiaryId}. Alerts: ${alerts.length}`);
  return dashboard;
}

// ─── Exports ───────────────────────────────────────────────────────────────

module.exports = {
  getClinicalDashboard,
};
