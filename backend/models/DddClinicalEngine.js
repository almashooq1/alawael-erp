'use strict';
/**
 * DddClinicalEngine Model
 * Auto-extracted from services/dddClinicalEngine.js
 */
const mongoose = require('mongoose');

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
    mongoose.model('Beneficiary')?.findById(beneficiaryId).lean(),
    mongoose.model('EpisodeOfCare')
      ?.findOne({ beneficiaryId, status: 'active' })
      .sort({ startDate: -1 })
      .lean(),
    mongoose.model('ClinicalSession')
      ?.find({ beneficiaryId })
      .sort({ scheduledDate: -1 })
      .limit(20)
      .lean() || [],
    mongoose.model('TherapeuticGoal')
      ?.find({ beneficiaryId, isDeleted: { $ne: true } })
      .lean() || [],
    mongoose.model('ClinicalAssessment')?.findOne({ beneficiaryId }).sort({ assessmentDate: -1 }).lean(),
    mongoose.model('UnifiedCarePlan')?.findOne({ beneficiaryId, status: 'active' }).lean(),
    mongoose.model('FamilyCommunication')
      ?.find({ beneficiaryId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean() || [],
    mongoose.model('BehaviorRecord')?.find({ beneficiaryId }).sort({ createdAt: -1 }).limit(20).lean() || [],
    mongoose.model('ClinicalRiskScore')?.findOne({ beneficiaryId }).sort({ calculatedAt: -1 }).lean(),
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

module.exports = {
  DDDClinicalInsight,
};
