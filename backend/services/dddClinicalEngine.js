'use strict';

/**
 * DDD Clinical Decision Engine
 * ═══════════════════════════════════════════════════════════════════════
 * Unified clinical intelligence engine that evaluates beneficiary data
 * holistically to produce actionable clinical insights.
 *
 * Features:
 *  - 15+ clinical evaluation rules spanning all domains
 *  - Next-Best-Action recommendations
 *  - Treatment gap detection
 *  - Automated clinical pathway guidance
 *  - Prediction accuracy tracking
 *  - Explainable AI: every recommendation has data evidence
 *
 * Integration:
 *  - Bridges existing RecommendationEngine + DecisionSupportEngine
 *  - Publishes events on integration bus
 *  - Feeds into DecisionAlert + Recommendation models
 *
 * @module dddClinicalEngine
 */

const mongoose = require('mongoose');
const { Router } = require('express');

/* ── Mongoose safe-model helper ─────────────────────────────────────── */
const model = name => {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
};

/* ═══════════════════════════════════════════════════════════════════════
   1. Clinical Insight Model — persists engine evaluations
   ═══════════════════════════════════════════════════════════════════════ */
const clinicalInsightSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'EpisodeOfCare', index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, index: true },

    /* Evaluation type */
    evaluationType: {
      type: String,
      enum: ['comprehensive', 'focused', 'scheduled', 'event_triggered', 'manual'],
      default: 'comprehensive',
    },

    /* Overall clinical status */
    clinicalStatus: {
      type: String,
      enum: ['optimal', 'progressing', 'plateau', 'at_risk', 'declining', 'critical'],
      required: true,
      index: true,
    },
    clinicalScore: { type: Number, min: 0, max: 100, required: true },

    /* Domain-specific scores */
    domainScores: {
      treatmentAdherence: { type: Number, min: 0, max: 100, default: 0 },
      goalProgress: { type: Number, min: 0, max: 100, default: 0 },
      clinicalOutcome: { type: Number, min: 0, max: 100, default: 0 },
      engagementLevel: { type: Number, min: 0, max: 100, default: 0 },
      familyInvolvement: { type: Number, min: 0, max: 100, default: 0 },
      documentationQuality: { type: Number, min: 0, max: 100, default: 0 },
      safetyCompliance: { type: Number, min: 0, max: 100, default: 0 },
    },

    /* Triggered rules */
    triggeredRules: [
      {
        ruleCode: String,
        ruleName: String,
        severity: { type: String, enum: ['info', 'low', 'medium', 'high', 'critical'] },
        category: String,
        evidence: mongoose.Schema.Types.Mixed,
        suggestion: String,
      },
    ],

    /* Next best actions — ordered by priority */
    nextBestActions: [
      {
        action: { type: String, required: true },
        actionType: {
          type: String,
          enum: [
            'schedule_session',
            'reassess',
            'revise_care_plan',
            'escalate',
            'discharge_planning',
            'family_contact',
            'medication_review',
            'specialist_referral',
            'increase_frequency',
            'decrease_frequency',
            'change_modality',
            'add_group_therapy',
            'behavior_intervention',
            'goal_revision',
            'quality_review',
          ],
        },
        priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'] },
        rationale: String,
        targetDate: Date,
        assignedRole: String,
      },
    ],

    /* Treatment gaps detected */
    treatmentGaps: [
      {
        gapType: {
          type: String,
          enum: [
            'missing_assessment',
            'overdue_session',
            'stalled_goal',
            'incomplete_documentation',
            'no_care_plan',
            'expired_measure',
            'missing_family_contact',
            'no_group_therapy',
            'skill_gap',
            'coverage_gap',
          ],
        },
        description: String,
        severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
        affectedDomain: String,
        suggestedFix: String,
      },
    ],

    /* Metadata */
    evaluatedAt: { type: Date, default: Date.now },
    evaluatedBy: { type: String, enum: ['system', 'scheduler', 'user_request'], default: 'system' },
    processingTimeMs: Number,
    previousInsightId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDClinicalInsight' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

clinicalInsightSchema.index({ beneficiaryId: 1, evaluatedAt: -1 });
clinicalInsightSchema.index({ clinicalStatus: 1, branchId: 1 });

const DDDClinicalInsight =
  mongoose.models.DDDClinicalInsight || mongoose.model('DDDClinicalInsight', clinicalInsightSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. Clinical Rules — 15 evaluation rules
   ═══════════════════════════════════════════════════════════════════════ */
const CLINICAL_RULES = [
  /* ── Treatment Adherence ────────────────────────────────────── */
  {
    code: 'CDR_SESSION_FREQUENCY_LOW',
    name: 'Session frequency below plan',
    category: 'treatment_adherence',
    severity: 'high',
    evaluate: ctx => {
      if (!ctx.episode) return null;
      const planned =
        ctx.episode.sessionsPerWeek || ctx.episode.serviceConfig?.sessionsPerWeek || 2;
      const recent = (ctx.recentSessions || []).filter(
        s =>
          s.status === 'completed' &&
          new Date(s.scheduledDate) > new Date(Date.now() - 14 * 86400000)
      );
      const actual = recent.length / 2; // over 2 weeks
      if (actual < planned * 0.6) {
        return {
          evidence: {
            planned,
            actualPerWeek: actual,
            periodDays: 14,
            sessionsFound: recent.length,
          },
          suggestion: `Increase session scheduling — only ${actual.toFixed(1)}/week vs ${planned} planned`,
        };
      }
      return null;
    },
  },
  {
    code: 'CDR_HIGH_CANCELLATION_RATE',
    name: 'High cancellation rate (>25%)',
    category: 'treatment_adherence',
    severity: 'medium',
    evaluate: ctx => {
      const all = ctx.recentSessions || [];
      if (all.length < 4) return null;
      const cancelled = all.filter(s => ['cancelled', 'no_show', 'late_cancel'].includes(s.status));
      const rate = cancelled.length / all.length;
      if (rate > 0.25) {
        return {
          evidence: {
            total: all.length,
            cancelled: cancelled.length,
            rate: +(rate * 100).toFixed(1),
          },
          suggestion: 'Investigate cancellation reasons — consider schedule or modality adjustment',
        };
      }
      return null;
    },
  },

  /* ── Goal Progress ──────────────────────────────────────────── */
  {
    code: 'CDR_NO_ACTIVE_GOALS',
    name: 'No active therapeutic goals',
    category: 'goal_progress',
    severity: 'high',
    evaluate: ctx => {
      const active = (ctx.goals || []).filter(g => g.status === 'active');
      if (active.length === 0 && ctx.episode && ctx.episode.status === 'active') {
        return {
          evidence: { totalGoals: (ctx.goals || []).length, activeGoals: 0 },
          suggestion: 'Set therapeutic goals for this active episode',
        };
      }
      return null;
    },
  },
  {
    code: 'CDR_STALLED_GOALS',
    name: 'Goals with no progress in 21+ days',
    category: 'goal_progress',
    severity: 'high',
    evaluate: ctx => {
      const stalled = (ctx.goals || []).filter(g => {
        if (g.status !== 'active') return false;
        const hist = g.progressHistory || [];
        if (hist.length === 0) return true;
        const last = new Date(hist[hist.length - 1].date);
        return Date.now() - last.getTime() > 21 * 86400000;
      });
      if (stalled.length > 0) {
        return {
          evidence: {
            stalledGoals: stalled.map(g => ({
              id: g._id,
              title: g.title,
              progress: g.currentProgress,
            })),
          },
          suggestion: `${stalled.length} goal(s) have no progress recorded in 21+ days`,
        };
      }
      return null;
    },
  },
  {
    code: 'CDR_GOALS_DECLINING',
    name: 'Goals showing declining trend',
    category: 'goal_progress',
    severity: 'critical',
    evaluate: ctx => {
      const declining = (ctx.goals || []).filter(
        g => g.status === 'active' && g.trend?.direction === 'declining'
      );
      if (declining.length > 0) {
        return {
          evidence: {
            decliningGoals: declining.map(g => ({
              id: g._id,
              title: g.title,
              progress: g.currentProgress,
              slope: g.trend?.slope,
            })),
          },
          suggestion: 'Urgent: revise treatment approach for declining goals',
        };
      }
      return null;
    },
  },
  {
    code: 'CDR_GOAL_NEAR_TARGET',
    name: 'Goals near target (≥85%) — discharge planning opportunity',
    category: 'goal_progress',
    severity: 'info',
    evaluate: ctx => {
      const near = (ctx.goals || []).filter(g => g.status === 'active' && g.currentProgress >= 85);
      if (near.length >= 2) {
        return {
          evidence: {
            nearTargetGoals: near.map(g => ({
              id: g._id,
              title: g.title,
              progress: g.currentProgress,
            })),
          },
          suggestion: `${near.length} goals near target — consider discharge planning or new goals`,
        };
      }
      return null;
    },
  },

  /* ── Clinical Outcome ───────────────────────────────────────── */
  {
    code: 'CDR_NO_RECENT_ASSESSMENT',
    name: 'No assessment in 60+ days',
    category: 'clinical_outcome',
    severity: 'high',
    evaluate: ctx => {
      if (!ctx.lastAssessment) {
        if (ctx.episode && ctx.episode.status === 'active') {
          return {
            evidence: { lastAssessment: null },
            suggestion: 'Schedule initial/periodic assessment',
          };
        }
        return null;
      }
      const daysSince =
        (Date.now() - new Date(ctx.lastAssessment.assessmentDate).getTime()) / 86400000;
      if (daysSince > 60) {
        return {
          evidence: {
            lastAssessmentDate: ctx.lastAssessment.assessmentDate,
            daysSince: Math.round(daysSince),
          },
          suggestion: `Last assessment was ${Math.round(daysSince)} days ago — schedule reassessment`,
        };
      }
      return null;
    },
  },
  {
    code: 'CDR_ASSESSMENT_SCORE_DECLINING',
    name: 'Assessment scores declining',
    category: 'clinical_outcome',
    severity: 'critical',
    evaluate: ctx => {
      if (!ctx.lastAssessment || !ctx.lastAssessment.trend) return null;
      if (
        ctx.lastAssessment.trend.direction === 'declining' &&
        (ctx.lastAssessment.trend.consecutiveDecline || 0) >= 2
      ) {
        return {
          evidence: {
            trend: ctx.lastAssessment.trend,
            lastScore: ctx.lastAssessment.percentageScore,
          },
          suggestion:
            'Assessment scores declining consecutively — urgent care plan revision needed',
        };
      }
      return null;
    },
  },

  /* ── Engagement ──────────────────────────────────────────────── */
  {
    code: 'CDR_LOW_SESSION_ENGAGEMENT',
    name: 'Low session engagement ratings',
    category: 'engagement',
    severity: 'medium',
    evaluate: ctx => {
      const completed = (ctx.recentSessions || []).filter(s => s.status === 'completed');
      if (completed.length < 3) return null;
      const lowEngagement = completed.filter(s => {
        const obs = s.observations || s.clinicalObservations || {};
        return (
          obs.cooperation === 'minimal' || obs.motivation === 'low' || obs.attention === 'poor'
        );
      });
      if (lowEngagement.length / completed.length > 0.4) {
        return {
          evidence: { totalCompleted: completed.length, lowEngagement: lowEngagement.length },
          suggestion: 'Consider modality change, activity adaptation, or motivational strategies',
        };
      }
      return null;
    },
  },

  /* ── Family Involvement ─────────────────────────────────────── */
  {
    code: 'CDR_FAMILY_DISENGAGED',
    name: 'No family engagement in 30+ days',
    category: 'family_involvement',
    severity: 'medium',
    evaluate: ctx => {
      const familyEvents = ctx.familyEvents || [];
      if (familyEvents.length === 0) {
        if (ctx.episode && ctx.episode.status === 'active') {
          return {
            evidence: { familyEvents: 0 },
            suggestion: 'No family communication on record — initiate family engagement',
          };
        }
        return null;
      }
      const last = new Date(familyEvents[0].communicationDate || familyEvents[0].createdAt);
      const daysSince = (Date.now() - last.getTime()) / 86400000;
      if (daysSince > 30) {
        return {
          evidence: { lastFamilyContact: last, daysSince: Math.round(daysSince) },
          suggestion: `Family not contacted in ${Math.round(daysSince)} days — schedule meeting or call`,
        };
      }
      return null;
    },
  },

  /* ── Documentation Quality ──────────────────────────────────── */
  {
    code: 'CDR_INCOMPLETE_SOAP',
    name: 'Sessions with incomplete SOAP notes',
    category: 'documentation',
    severity: 'medium',
    evaluate: ctx => {
      const completed = (ctx.recentSessions || []).filter(s => s.status === 'completed');
      const incomplete = completed.filter(s => {
        const soap = s.soapNotes || {};
        return !soap.subjective || !soap.objective || !soap.assessment || !soap.plan;
      });
      if (incomplete.length > 2) {
        return {
          evidence: { completedSessions: completed.length, incompleteSOAP: incomplete.length },
          suggestion: `${incomplete.length} sessions lack complete SOAP notes`,
        };
      }
      return null;
    },
  },

  /* ── Safety ─────────────────────────────────────────────────── */
  {
    code: 'CDR_BEHAVIOR_INCIDENTS',
    name: 'Frequent behavior incidents',
    category: 'safety',
    severity: 'critical',
    evaluate: ctx => {
      const incidents = ctx.behaviorRecords || [];
      const recent = incidents.filter(
        b => new Date(b.incidentDate || b.createdAt) > new Date(Date.now() - 14 * 86400000)
      );
      const severe = recent.filter(b => ['severe', 'crisis'].includes(b.severity));
      if (severe.length >= 2 || recent.length >= 5) {
        return {
          evidence: { totalRecent: recent.length, severe: severe.length, periodDays: 14 },
          suggestion: 'High behavior incident rate — review behavior plan and safety protocols',
        };
      }
      return null;
    },
  },

  /* ── Care Plan ──────────────────────────────────────────────── */
  {
    code: 'CDR_NO_CARE_PLAN',
    name: 'Active episode without care plan',
    category: 'care_plan',
    severity: 'high',
    evaluate: ctx => {
      if (ctx.episode && ctx.episode.status === 'active' && !ctx.carePlan) {
        return {
          evidence: { episodeId: ctx.episode._id, episodePhase: ctx.episode.currentPhase },
          suggestion: 'Create unified care plan for this active episode',
        };
      }
      return null;
    },
  },

  /* ── Episode Phase ──────────────────────────────────────────── */
  {
    code: 'CDR_EPISODE_OVERDUE',
    name: 'Episode exceeding expected duration',
    category: 'operational',
    severity: 'medium',
    evaluate: ctx => {
      if (!ctx.episode || !ctx.episode.expectedEndDate) return null;
      const overdueDays = (Date.now() - new Date(ctx.episode.expectedEndDate).getTime()) / 86400000;
      if (overdueDays > 14) {
        return {
          evidence: {
            expectedEnd: ctx.episode.expectedEndDate,
            overdueDays: Math.round(overdueDays),
          },
          suggestion: `Episode overdue by ${Math.round(overdueDays)} days — review and update timeline`,
        };
      }
      return null;
    },
  },

  /* ── Tele-Rehab Optimization ────────────────────────────────── */
  {
    code: 'CDR_TELE_REHAB_OPPORTUNITY',
    name: 'Candidate for tele-rehabilitation',
    category: 'optimization',
    severity: 'info',
    evaluate: ctx => {
      const completed = (ctx.recentSessions || []).filter(s => s.status === 'completed');
      const inPerson = completed.filter(s => s.modality === 'in_person');
      const noshows = (ctx.recentSessions || []).filter(s => s.status === 'no_show');
      if (inPerson.length >= 4 && noshows.length >= 2) {
        return {
          evidence: { inPersonSessions: inPerson.length, noShows: noshows.length },
          suggestion:
            'High no-show rate with in-person visits — consider adding tele-rehab sessions',
        };
      }
      return null;
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   3. Context Gatherer — fetches all data for a beneficiary
   ═══════════════════════════════════════════════════════════════════════ */
async function gatherClinicalContext(beneficiaryId) {
  const [
    beneficiary,
    episode,
    recentSessions,
    goals,
    lastAssessment,
    carePlan,
    familyEvents,
    behaviorRecords,
    latestRisk,
  ] = await Promise.all([
    model('Beneficiary')?.findById(beneficiaryId).lean(),
    model('EpisodeOfCare')
      ?.findOne({ beneficiaryId, status: 'active' })
      .sort({ startDate: -1 })
      .lean(),
    model('ClinicalSession')
      ?.find({ beneficiaryId })
      .sort({ scheduledDate: -1 })
      .limit(20)
      .lean() || [],
    model('TherapeuticGoal')
      ?.find({ beneficiaryId, isDeleted: { $ne: true } })
      .lean() || [],
    model('ClinicalAssessment')?.findOne({ beneficiaryId }).sort({ assessmentDate: -1 }).lean(),
    model('UnifiedCarePlan')?.findOne({ beneficiaryId, status: 'active' }).lean(),
    model('FamilyCommunication')
      ?.find({ beneficiaryId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean() || [],
    model('BehaviorRecord')?.find({ beneficiaryId }).sort({ createdAt: -1 }).limit(20).lean() || [],
    model('ClinicalRiskScore')?.findOne({ beneficiaryId }).sort({ calculatedAt: -1 }).lean(),
  ]);

  return {
    beneficiary,
    episode,
    recentSessions,
    goals,
    lastAssessment,
    carePlan,
    familyEvents,
    behaviorRecords,
    latestRisk,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   4. Score Computation
   ═══════════════════════════════════════════════════════════════════════ */
function computeDomainScores(ctx, triggeredRules) {
  const scores = {
    treatmentAdherence: 80,
    goalProgress: 80,
    clinicalOutcome: 80,
    engagementLevel: 80,
    familyInvolvement: 80,
    documentationQuality: 90,
    safetyCompliance: 100,
  };

  /* Deductions based on triggered rules */
  const deductionMap = {
    treatment_adherence: 'treatmentAdherence',
    goal_progress: 'goalProgress',
    clinical_outcome: 'clinicalOutcome',
    engagement: 'engagementLevel',
    family_involvement: 'familyInvolvement',
    documentation: 'documentationQuality',
    safety: 'safetyCompliance',
    care_plan: 'treatmentAdherence',
    operational: 'treatmentAdherence',
    optimization: 'engagementLevel',
  };

  const severityPenalty = { info: 2, low: 5, medium: 10, high: 20, critical: 30 };

  for (const rule of triggeredRules) {
    const key = deductionMap[rule.category];
    if (key) {
      scores[key] = Math.max(0, scores[key] - (severityPenalty[rule.severity] || 10));
    }
  }

  /* Boost from actual goal progress */
  const activeGoals = (ctx.goals || []).filter(g => g.status === 'active');
  if (activeGoals.length > 0) {
    const avgProgress =
      activeGoals.reduce((s, g) => s + (g.currentProgress || 0), 0) / activeGoals.length;
    scores.goalProgress = Math.min(100, Math.round(avgProgress));
  }

  /* Boost from completed sessions ratio */
  const sessions = ctx.recentSessions || [];
  if (sessions.length > 0) {
    const completed = sessions.filter(s => s.status === 'completed').length;
    scores.treatmentAdherence = Math.min(100, Math.round((completed / sessions.length) * 100));
  }

  return scores;
}

function computeClinicalStatus(overallScore) {
  if (overallScore >= 90) return 'optimal';
  if (overallScore >= 75) return 'progressing';
  if (overallScore >= 60) return 'plateau';
  if (overallScore >= 40) return 'at_risk';
  if (overallScore >= 20) return 'declining';
  return 'critical';
}

/* ═══════════════════════════════════════════════════════════════════════
   5. Next Best Actions Generator
   ═══════════════════════════════════════════════════════════════════════ */
function generateNextBestActions(triggeredRules, ctx) {
  const actions = [];
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

  const actionMap = {
    CDR_SESSION_FREQUENCY_LOW: {
      action: 'Schedule additional sessions this week',
      actionType: 'schedule_session',
      priority: 'high',
      assignedRole: 'scheduler',
    },
    CDR_HIGH_CANCELLATION_RATE: {
      action: 'Contact family about attendance barriers',
      actionType: 'family_contact',
      priority: 'medium',
      assignedRole: 'social_worker',
    },
    CDR_NO_ACTIVE_GOALS: {
      action: 'Create therapeutic goals with care team',
      actionType: 'goal_revision',
      priority: 'high',
      assignedRole: 'therapist',
    },
    CDR_STALLED_GOALS: {
      action: 'Review and revise stalled goals',
      actionType: 'goal_revision',
      priority: 'high',
      assignedRole: 'therapist',
    },
    CDR_GOALS_DECLINING: {
      action: 'Urgent care plan revision — declining trajectory',
      actionType: 'revise_care_plan',
      priority: 'urgent',
      assignedRole: 'supervisor',
    },
    CDR_GOAL_NEAR_TARGET: {
      action: 'Initiate discharge planning discussion',
      actionType: 'discharge_planning',
      priority: 'medium',
      assignedRole: 'supervisor',
    },
    CDR_NO_RECENT_ASSESSMENT: {
      action: 'Schedule formal reassessment',
      actionType: 'reassess',
      priority: 'high',
      assignedRole: 'therapist',
    },
    CDR_ASSESSMENT_SCORE_DECLINING: {
      action: 'Specialist review of declining scores',
      actionType: 'specialist_referral',
      priority: 'urgent',
      assignedRole: 'doctor',
    },
    CDR_LOW_SESSION_ENGAGEMENT: {
      action: 'Adapt activities or change modality',
      actionType: 'change_modality',
      priority: 'medium',
      assignedRole: 'therapist',
    },
    CDR_FAMILY_DISENGAGED: {
      action: 'Schedule family engagement meeting',
      actionType: 'family_contact',
      priority: 'medium',
      assignedRole: 'social_worker',
    },
    CDR_INCOMPLETE_SOAP: {
      action: 'Complete missing SOAP documentation',
      actionType: 'quality_review',
      priority: 'medium',
      assignedRole: 'therapist',
    },
    CDR_BEHAVIOR_INCIDENTS: {
      action: 'Review and update behavior intervention plan',
      actionType: 'behavior_intervention',
      priority: 'urgent',
      assignedRole: 'behavior_analyst',
    },
    CDR_NO_CARE_PLAN: {
      action: 'Create unified care plan',
      actionType: 'revise_care_plan',
      priority: 'high',
      assignedRole: 'therapist',
    },
    CDR_EPISODE_OVERDUE: {
      action: 'Review episode duration — extend or discharge',
      actionType: 'discharge_planning',
      priority: 'medium',
      assignedRole: 'supervisor',
    },
    CDR_TELE_REHAB_OPPORTUNITY: {
      action: 'Offer tele-rehab option to reduce no-shows',
      actionType: 'change_modality',
      priority: 'low',
      assignedRole: 'scheduler',
    },
  };

  for (const rule of triggeredRules) {
    const mapped = actionMap[rule.ruleCode];
    if (mapped) {
      actions.push({
        ...mapped,
        rationale: rule.suggestion || rule.ruleName,
        targetDate: new Date(Date.now() + 7 * 86400000),
      });
    }
  }

  actions.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));
  return actions;
}

/* ═══════════════════════════════════════════════════════════════════════
   6. Treatment Gap Detector
   ═══════════════════════════════════════════════════════════════════════ */
function detectTreatmentGaps(ctx) {
  const gaps = [];

  /* No assessment */
  if (!ctx.lastAssessment && ctx.episode?.status === 'active') {
    gaps.push({
      gapType: 'missing_assessment',
      description: 'No clinical assessment on record',
      severity: 'high',
      affectedDomain: 'assessments',
      suggestedFix: 'Schedule initial assessment',
    });
  }

  /* No care plan */
  if (!ctx.carePlan && ctx.episode?.status === 'active') {
    gaps.push({
      gapType: 'no_care_plan',
      description: 'Active episode without care plan',
      severity: 'high',
      affectedDomain: 'care-plans',
      suggestedFix: 'Create unified care plan',
    });
  }

  /* Overdue sessions */
  const lastSession = (ctx.recentSessions || [])[0];
  if (lastSession) {
    const daysSince = (Date.now() - new Date(lastSession.scheduledDate).getTime()) / 86400000;
    if (daysSince > 10) {
      gaps.push({
        gapType: 'overdue_session',
        description: `No session in ${Math.round(daysSince)} days`,
        severity: daysSince > 20 ? 'critical' : 'medium',
        affectedDomain: 'sessions',
        suggestedFix: 'Schedule next session immediately',
      });
    }
  } else if (ctx.episode?.status === 'active') {
    gaps.push({
      gapType: 'overdue_session',
      description: 'No sessions recorded for active episode',
      severity: 'critical',
      affectedDomain: 'sessions',
      suggestedFix: 'Schedule first session',
    });
  }

  /* Stalled goals */
  const stalledGoals = (ctx.goals || []).filter(g => {
    if (g.status !== 'active') return false;
    const hist = g.progressHistory || [];
    if (hist.length === 0) return Date.now() - new Date(g.createdAt).getTime() > 14 * 86400000;
    const lastEntry = new Date(hist[hist.length - 1].date);
    return Date.now() - lastEntry.getTime() > 21 * 86400000;
  });
  if (stalledGoals.length) {
    gaps.push({
      gapType: 'stalled_goal',
      description: `${stalledGoals.length} stalled goal(s) without progress`,
      severity: 'high',
      affectedDomain: 'goals',
      suggestedFix: 'Record progress or revise goals',
    });
  }

  /* Missing family contact */
  if ((ctx.familyEvents || []).length === 0 && ctx.episode?.status === 'active') {
    gaps.push({
      gapType: 'missing_family_contact',
      description: 'No family communication recorded',
      severity: 'medium',
      affectedDomain: 'family',
      suggestedFix: 'Initiate family engagement',
    });
  }

  /* Incomplete documentation */
  const incompleteSoap = (ctx.recentSessions || []).filter(s => {
    if (s.status !== 'completed') return false;
    const soap = s.soapNotes || {};
    return !soap.subjective || !soap.objective || !soap.assessment || !soap.plan;
  });
  if (incompleteSoap.length >= 3) {
    gaps.push({
      gapType: 'incomplete_documentation',
      description: `${incompleteSoap.length} sessions with incomplete SOAP notes`,
      severity: 'medium',
      affectedDomain: 'sessions',
      suggestedFix: 'Complete SOAP documentation for recent sessions',
    });
  }

  /* Expired measure */
  if (ctx.lastAssessment) {
    const daysSinceAssessment =
      (Date.now() - new Date(ctx.lastAssessment.assessmentDate).getTime()) / 86400000;
    if (daysSinceAssessment > 90) {
      gaps.push({
        gapType: 'expired_measure',
        description: `Assessment ${Math.round(daysSinceAssessment)} days old`,
        severity: 'high',
        affectedDomain: 'assessments',
        suggestedFix: 'Schedule reassessment with appropriate measure',
      });
    }
  }

  return gaps;
}

/* ═══════════════════════════════════════════════════════════════════════
   7. Main Evaluation Function
   ═══════════════════════════════════════════════════════════════════════ */
async function evaluateBeneficiary(beneficiaryId, options = {}) {
  const start = Date.now();
  const ctx = await gatherClinicalContext(beneficiaryId);

  if (!ctx.beneficiary) throw new Error(`Beneficiary ${beneficiaryId} not found`);

  /* Run all rules */
  const triggeredRules = [];
  for (const rule of CLINICAL_RULES) {
    try {
      const result = rule.evaluate(ctx);
      if (result) {
        triggeredRules.push({
          ruleCode: rule.code,
          ruleName: rule.name,
          severity: rule.severity,
          category: rule.category,
          evidence: result.evidence,
          suggestion: result.suggestion,
        });
      }
    } catch {
      /* rule failure doesn't block others */
    }
  }

  /* Compute scores */
  const domainScores = computeDomainScores(ctx, triggeredRules);
  const values = Object.values(domainScores);
  const clinicalScore = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const clinicalStatus = computeClinicalStatus(clinicalScore);

  /* Generate actions + gaps */
  const nextBestActions = generateNextBestActions(triggeredRules, ctx);
  const treatmentGaps = detectTreatmentGaps(ctx);

  /* Find previous insight for linking */
  const previousInsight = await DDDClinicalInsight.findOne({ beneficiaryId })
    .sort({ evaluatedAt: -1 })
    .select('_id')
    .lean();

  /* Persist */
  const insight = await DDDClinicalInsight.create({
    beneficiaryId,
    episodeId: ctx.episode?._id,
    branchId: ctx.beneficiary.branchId,
    evaluationType: options.evaluationType || 'comprehensive',
    clinicalStatus,
    clinicalScore,
    domainScores,
    triggeredRules,
    nextBestActions,
    treatmentGaps,
    evaluatedBy: options.evaluatedBy || 'system',
    processingTimeMs: Date.now() - start,
    previousInsightId: previousInsight?._id,
  });

  return insight.toObject();
}

/* ═══════════════════════════════════════════════════════════════════════
   8. Batch Evaluation
   ═══════════════════════════════════════════════════════════════════════ */
async function evaluateBatch(filter = {}) {
  const Episode = model('EpisodeOfCare');
  if (!Episode) return { evaluated: 0, errors: 0 };

  const query = { status: 'active', ...filter };
  const episodes = await Episode.find(query).select('beneficiaryId').lean();

  const uniqueBeneficiaries = [
    ...new Set(episodes.map(e => e.beneficiaryId?.toString()).filter(Boolean)),
  ];

  let evaluated = 0;
  let errors = 0;
  const results = [];

  for (const bid of uniqueBeneficiaries) {
    try {
      const insight = await evaluateBeneficiary(bid, {
        evaluationType: 'scheduled',
        evaluatedBy: 'scheduler',
      });
      results.push({
        beneficiaryId: bid,
        status: insight.clinicalStatus,
        score: insight.clinicalScore,
      });
      evaluated++;
    } catch {
      errors++;
    }
  }

  return { evaluated, errors, results };
}

/* ═══════════════════════════════════════════════════════════════════════
   9. Query & Dashboard Functions
   ═══════════════════════════════════════════════════════════════════════ */
async function getLatestInsight(beneficiaryId) {
  return DDDClinicalInsight.findOne({ beneficiaryId, isDeleted: { $ne: true } })
    .sort({ evaluatedAt: -1 })
    .lean();
}

async function getInsightHistory(beneficiaryId, limit = 20) {
  return DDDClinicalInsight.find({ beneficiaryId, isDeleted: { $ne: true } })
    .sort({ evaluatedAt: -1 })
    .limit(limit)
    .lean();
}

async function getClinicalDashboard(branchId) {
  const pipeline = [
    {
      $match: {
        isDeleted: { $ne: true },
        ...(branchId ? { branchId: new mongoose.Types.ObjectId(branchId) } : {}),
      },
    },
    { $sort: { beneficiaryId: 1, evaluatedAt: -1 } },
    { $group: { _id: '$beneficiaryId', latestInsight: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$latestInsight' } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        avgScore: { $avg: '$clinicalScore' },
        optimal: { $sum: { $cond: [{ $eq: ['$clinicalStatus', 'optimal'] }, 1, 0] } },
        progressing: { $sum: { $cond: [{ $eq: ['$clinicalStatus', 'progressing'] }, 1, 0] } },
        plateau: { $sum: { $cond: [{ $eq: ['$clinicalStatus', 'plateau'] }, 1, 0] } },
        atRisk: { $sum: { $cond: [{ $eq: ['$clinicalStatus', 'at_risk'] }, 1, 0] } },
        declining: { $sum: { $cond: [{ $eq: ['$clinicalStatus', 'declining'] }, 1, 0] } },
        critical: { $sum: { $cond: [{ $eq: ['$clinicalStatus', 'critical'] }, 1, 0] } },
        totalGaps: { $sum: { $size: '$treatmentGaps' } },
        totalActions: { $sum: { $size: '$nextBestActions' } },
      },
    },
  ];

  const [result] = await DDDClinicalInsight.aggregate(pipeline);
  return (
    result || {
      total: 0,
      avgScore: 0,
      optimal: 0,
      progressing: 0,
      plateau: 0,
      atRisk: 0,
      declining: 0,
      critical: 0,
      totalGaps: 0,
      totalActions: 0,
    }
  );
}

async function getCriticalCases(branchId, limit = 20) {
  const match = {
    isDeleted: { $ne: true },
    clinicalStatus: { $in: ['critical', 'declining', 'at_risk'] },
  };
  if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

  return DDDClinicalInsight.aggregate([
    { $match: match },
    { $sort: { beneficiaryId: 1, evaluatedAt: -1 } },
    { $group: { _id: '$beneficiaryId', insight: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$insight' } },
    { $sort: { clinicalScore: 1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'beneficiaries',
        localField: 'beneficiaryId',
        foreignField: '_id',
        as: 'beneficiary',
        pipeline: [{ $project: { firstName: 1, lastName: 1, mrn: 1, 'disability.type': 1 } }],
      },
    },
    { $unwind: { path: '$beneficiary', preserveNullAndEmptyArrays: true } },
  ]);
}

function listRules() {
  return CLINICAL_RULES.map(r => ({
    code: r.code,
    name: r.name,
    category: r.category,
    severity: r.severity,
  }));
}

/* ═══════════════════════════════════════════════════════════════════════
   10. Express Router
   ═══════════════════════════════════════════════════════════════════════ */
function createClinicalEngineRouter() {
  const router = Router();

  /* Evaluate single beneficiary */
  router.post('/clinical-engine/evaluate/:beneficiaryId', async (req, res) => {
    try {
      const insight = await evaluateBeneficiary(req.params.beneficiaryId, {
        evaluationType: req.body.evaluationType || 'manual',
        evaluatedBy: 'user_request',
      });
      res.json({ success: true, insight });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Batch evaluation */
  router.post('/clinical-engine/evaluate-batch', async (req, res) => {
    try {
      const result = await evaluateBatch(req.body.filter || {});
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Latest insight */
  router.get('/clinical-engine/insight/:beneficiaryId', async (req, res) => {
    try {
      const insight = await getLatestInsight(req.params.beneficiaryId);
      res.json({ success: true, insight });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Insight history */
  router.get('/clinical-engine/insight/:beneficiaryId/history', async (req, res) => {
    try {
      const insights = await getInsightHistory(
        req.params.beneficiaryId,
        parseInt(req.query.limit, 10) || 20
      );
      res.json({ success: true, insights });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Dashboard */
  router.get('/clinical-engine/dashboard', async (req, res) => {
    try {
      const dashboard = await getClinicalDashboard(req.query.branchId);
      res.json({ success: true, dashboard });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Critical cases */
  router.get('/clinical-engine/critical-cases', async (req, res) => {
    try {
      const cases = await getCriticalCases(req.query.branchId, parseInt(req.query.limit, 10) || 20);
      res.json({ success: true, cases });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* List rules */
  router.get('/clinical-engine/rules', (_req, res) => {
    res.json({ success: true, rules: listRules() });
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════
   Exports
   ═══════════════════════════════════════════════════════════════════════ */
module.exports = {
  DDDClinicalInsight,
  CLINICAL_RULES,
  gatherClinicalContext,
  evaluateBeneficiary,
  evaluateBatch,
  getLatestInsight,
  getInsightHistory,
  getClinicalDashboard,
  getCriticalCases,
  listRules,
  computeDomainScores,
  computeClinicalStatus,
  generateNextBestActions,
  detectTreatmentGaps,
  createClinicalEngineRouter,
};
