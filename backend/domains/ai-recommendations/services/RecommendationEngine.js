/**
 * RecommendationEngine — محرك التوصيات القائم على القواعد
 *
 * يُحلل بيانات المستفيد ويولّد توصيات مفسّرة (Explainable)
 * بناءً على مكتبة قواعد قابلة للتوسع
 *
 * @module domains/ai-recommendations/services/RecommendationEngine
 */

const mongoose = require('mongoose');
const logger = require('../../../utils/logger');

// ═══════════════════════════════════════════════════════════════════════════════
// Rule Definitions — مكتبة القواعد
// ═══════════════════════════════════════════════════════════════════════════════

const RULES = [
  // ── Clinical Progress Rules ───────────────────────────────────────────────
  {
    code: 'RULE_NO_PROGRESS_3_SESSIONS',
    name: 'عدم تقدم لثلاث جلسات متتالية',
    category: 'clinical',
    type: 'progress_stall',
    priority: 'high',
    evaluate: ctx => {
      const { recentSessions } = ctx;
      if (!recentSessions || recentSessions.length < 3) return null;
      const last3 = recentSessions.slice(0, 3);
      const noProgress = last3.every(
        s => s.goalsProgress && s.goalsProgress.every(g => (g.progressDelta || 0) <= 0)
      );
      if (!noProgress) return null;
      return {
        title: 'لم يُسجّل تقدم في آخر 3 جلسات — مراجعة الخطة العلاجية',
        explanation: {
          summary:
            'المستفيد لم يُظهر تقدماً في آخر 3 جلسات متتالية. يُنصح بمراجعة أهداف الخطة أو تعديل التدخلات.',
          dataPoints: last3.map(s => ({
            label: 'جلسة',
            value: s.type,
            source: 'ClinicalSession',
            date: s.sessionDate,
          })),
          rules: ['RULE_NO_PROGRESS_3_SESSIONS'],
          confidence: 0.9,
        },
        suggestedActions: [
          { type: 'modify_care_plan', label: 'مراجعة وتعديل خطة الرعاية' },
          { type: 'mdt_review', label: 'طلب مراجعة فريق متعدد التخصصات' },
        ],
        riskFactor: { code: 'no_progress', category: 'clinical', weight: 3, score: 7 },
      };
    },
  },

  {
    code: 'RULE_REGRESSION_DETECTED',
    name: 'تراجع في الأداء',
    category: 'clinical',
    type: 'clinical_alert',
    priority: 'urgent',
    evaluate: ctx => {
      const { recentSessions } = ctx;
      if (!recentSessions || recentSessions.length < 2) return null;
      const last = recentSessions[0];
      const hasRegression =
        last.goalsProgress && last.goalsProgress.some(g => (g.progressDelta || 0) < -10);
      if (!hasRegression) return null;
      return {
        title: 'تراجع ملحوظ في أداء المستفيد — تدخل فوري مطلوب',
        explanation: {
          summary:
            'سُجّل تراجع بأكثر من 10% في أحد الأهداف. قد يشير إلى تغيّر في الحالة الصحية أو البيئية.',
          rules: ['RULE_REGRESSION_DETECTED'],
          confidence: 0.95,
        },
        suggestedActions: [
          { type: 'reassess', label: 'إعادة تقييم شاملة' },
          { type: 'contact_family', label: 'التواصل مع الأسرة للاستفسار' },
          { type: 'medical_referral', label: 'تحويل طبي إن لزم' },
        ],
        riskFactor: { code: 'regression', category: 'clinical', weight: 4, score: 9 },
      };
    },
  },

  // ── Attendance Rules ──────────────────────────────────────────────────────
  {
    code: 'RULE_HIGH_ABSENCE',
    name: 'نسبة غياب مرتفعة',
    category: 'clinical',
    type: 'attendance_concern',
    priority: 'high',
    evaluate: ctx => {
      const { recentSessions } = ctx;
      if (!recentSessions || recentSessions.length < 5) return null;
      const last10 = recentSessions.slice(0, 10);
      const absent = last10.filter(
        s =>
          s.attendance?.status === 'absent' ||
          s.attendance?.status === 'no_show' ||
          s.status === 'cancelled'
      );
      const rate = absent.length / last10.length;
      if (rate < 0.3) return null;
      return {
        title: `نسبة غياب ${Math.round(rate * 100)}% في آخر ${last10.length} جلسات`,
        explanation: {
          summary: `المستفيد تغيّب عن ${absent.length} من ${last10.length} جلسات. الغياب المتكرر يُضعف فعالية التأهيل.`,
          dataPoints: [
            {
              label: 'نسبة الغياب',
              value: `${Math.round(rate * 100)}%`,
              source: 'ClinicalSession',
            },
          ],
          rules: ['RULE_HIGH_ABSENCE'],
          confidence: 0.85,
        },
        suggestedActions: [
          { type: 'contact_family', label: 'التواصل مع الأسرة لفهم أسباب الغياب' },
          { type: 'adjust_frequency', label: 'تعديل جدول الجلسات' },
          { type: 'tele_session', label: 'اقتراح جلسات عن بعد' },
        ],
        riskFactor: {
          code: 'high_absence',
          category: 'attendance',
          weight: 3,
          score: Math.round(rate * 10),
        },
      };
    },
  },

  {
    code: 'RULE_CONSECUTIVE_ABSENCE',
    name: 'غياب متتالي',
    category: 'clinical',
    type: 'attendance_concern',
    priority: 'urgent',
    evaluate: ctx => {
      const { recentSessions } = ctx;
      if (!recentSessions || recentSessions.length < 3) return null;
      const last3 = recentSessions.slice(0, 3);
      const allAbsent = last3.every(
        s => s.attendance?.status === 'absent' || s.attendance?.status === 'no_show'
      );
      if (!allAbsent) return null;
      return {
        title: 'غياب 3 جلسات متتالية — خطر انقطاع',
        explanation: {
          summary: 'المستفيد تغيّب عن 3 جلسات متتالية. إن لم يتم التدخل قد ينقطع عن البرنامج.',
          rules: ['RULE_CONSECUTIVE_ABSENCE'],
          confidence: 0.92,
        },
        suggestedActions: [
          { type: 'contact_family', label: 'اتصال عاجل بالأسرة' },
          { type: 'home_visit', label: 'زيارة منزلية' },
          { type: 'escalate_to_supervisor', label: 'تصعيد لمشرف الحالة' },
        ],
        riskFactor: { code: 'consecutive_absence', category: 'attendance', weight: 4, score: 8 },
      };
    },
  },

  // ── Assessment / Documentation Rules ──────────────────────────────────────
  {
    code: 'RULE_OVERDUE_REASSESSMENT',
    name: 'تقييم دوري متأخر',
    category: 'quality',
    type: 'reassessment_due',
    priority: 'high',
    evaluate: ctx => {
      const { lastAssessment, episode } = ctx;
      if (!lastAssessment) {
        if (episode && episode.status === 'active_treatment') {
          return {
            title: 'لا يوجد تقييم مسجّل — يجب إجراء تقييم أولي',
            explanation: {
              summary: 'المستفيد في مرحلة العلاج الفعّال ولا يوجد أي تقييم مسجّل.',
              rules: ['RULE_OVERDUE_REASSESSMENT'],
              confidence: 1,
            },
            suggestedActions: [{ type: 'reassess', label: 'إجراء تقييم أولي فوري' }],
            riskFactor: {
              code: 'overdue_assessment',
              category: 'documentation',
              weight: 3,
              score: 8,
            },
          };
        }
        return null;
      }
      const daysSince = Math.floor(
        (Date.now() - new Date(lastAssessment.assessmentDate).getTime()) / 86400000
      );
      if (daysSince < 90) return null; // كل 90 يوماً
      return {
        title: `مرّ ${daysSince} يوماً على آخر تقييم — إعادة تقييم مستحقة`,
        explanation: {
          summary: `آخر تقييم كان بتاريخ ${new Date(lastAssessment.assessmentDate).toLocaleDateString('ar-SA')}. المعيار 90 يوماً.`,
          dataPoints: [
            { label: 'آخر تقييم', value: `${daysSince} يوم`, source: 'ClinicalAssessment' },
          ],
          rules: ['RULE_OVERDUE_REASSESSMENT'],
          confidence: 0.95,
        },
        suggestedActions: [
          { type: 'reassess', label: 'جدولة إعادة تقييم' },
          { type: 'add_measure', label: 'تطبيق مقياس معياري', parameters: { type: 'periodic' } },
        ],
        riskFactor: {
          code: 'overdue_reassessment',
          category: 'documentation',
          weight: 2,
          score: Math.min(10, Math.round(daysSince / 15)),
        },
      };
    },
  },

  {
    code: 'RULE_INCOMPLETE_CARE_PLAN',
    name: 'خطة رعاية غير مكتملة',
    category: 'quality',
    type: 'care_plan_revision',
    priority: 'medium',
    evaluate: ctx => {
      const { carePlan } = ctx;
      if (!carePlan) return null;
      const sections = ['educational', 'therapeutic', 'lifeSkills', 'behavioral'];
      const emptySections = sections.filter(
        s => !carePlan.sections?.[s]?.goals || carePlan.sections[s].goals.length === 0
      );
      if (emptySections.length === 0) return null;
      return {
        title: `خطة الرعاية تفتقر لأهداف في: ${emptySections.join('، ')}`,
        explanation: {
          summary: `${emptySections.length} أقسام في خطة الرعاية لا تحتوي على أهداف. الخطة الشاملة تزيد فعالية التأهيل.`,
          rules: ['RULE_INCOMPLETE_CARE_PLAN'],
          confidence: 0.8,
        },
        suggestedActions: [{ type: 'modify_care_plan', label: 'إكمال أقسام خطة الرعاية' }],
        riskFactor: {
          code: 'incomplete_care_plan',
          category: 'documentation',
          weight: 1,
          score: emptySections.length * 2,
        },
      };
    },
  },

  // ── Workflow / Phase Rules ────────────────────────────────────────────────
  {
    code: 'RULE_STALLED_PHASE',
    name: 'مرحلة متوقفة',
    category: 'operational',
    type: 'quality_escalation',
    priority: 'high',
    evaluate: ctx => {
      const { episode } = ctx;
      if (!episode || !episode.currentPhase) return null;
      const phaseStart = episode.phaseHistory?.[episode.phaseHistory.length - 1]?.enteredAt;
      if (!phaseStart) return null;
      const daysInPhase = Math.floor((Date.now() - new Date(phaseStart).getTime()) / 86400000);
      const phaseLimits = {
        referral: 7,
        intake: 14,
        triage: 7,
        initial_assessment: 21,
        mdt_review: 14,
        care_planning: 14,
        active_treatment: 180,
        reassessment: 14,
        transition: 30,
        discharge: 14,
      };
      const limit = phaseLimits[episode.currentPhase] || 30;
      if (daysInPhase <= limit) return null;
      return {
        title: `المستفيد في مرحلة "${episode.currentPhase}" منذ ${daysInPhase} يوماً (الحد: ${limit})`,
        explanation: {
          summary: `تجاوز الوقت المتوقع للمرحلة بـ ${daysInPhase - limit} يوماً. قد توجد عوائق تحتاج تدخلاً.`,
          rules: ['RULE_STALLED_PHASE'],
          confidence: 0.88,
        },
        suggestedActions: [
          { type: 'escalate_to_supervisor', label: 'تصعيد لإدارة الحالات' },
          { type: 'mdt_review', label: 'مراجعة فريق متعدد التخصصات' },
        ],
        riskFactor: {
          code: 'stalled_phase',
          category: 'workflow',
          weight: 3,
          score: Math.min(10, Math.round((daysInPhase - limit) / 7) + 5),
        },
      };
    },
  },

  // ── Family Engagement Rules ───────────────────────────────────────────────
  {
    code: 'RULE_LOW_FAMILY_ENGAGEMENT',
    name: 'تفاعل أسري منخفض',
    category: 'family',
    type: 'family_engagement',
    priority: 'medium',
    evaluate: ctx => {
      const { familyEvents } = ctx;
      if (!familyEvents) return null;
      const recent = familyEvents.filter(
        e => Date.now() - new Date(e.timestamp).getTime() < 30 * 86400000
      );
      if (recent.length >= 2) return null;
      return {
        title:
          recent.length === 0
            ? 'لا يوجد تواصل أسري خلال 30 يوماً'
            : 'تواصل أسري محدود — تفاعل واحد فقط خلال 30 يوماً',
        explanation: {
          summary: `سُجّل ${recent.length} تفاعل أسري فقط في آخر 30 يوماً. التواصل الأسري أساسي لنجاح التأهيل.`,
          rules: ['RULE_LOW_FAMILY_ENGAGEMENT'],
          confidence: 0.8,
        },
        suggestedActions: [
          { type: 'contact_family', label: 'جدولة اجتماع أسري' },
          { type: 'home_visit', label: 'زيارة منزلية' },
        ],
        riskFactor: {
          code: 'low_family_engagement',
          category: 'family',
          weight: 2,
          score: recent.length === 0 ? 7 : 4,
        },
      };
    },
  },

  // ── Goal Achievement Rule ─────────────────────────────────────────────────
  {
    code: 'RULE_GOAL_ACHIEVED',
    name: 'هدف محقق — اقتراح هدف جديد',
    category: 'clinical',
    type: 'goal_achievement',
    priority: 'low',
    evaluate: ctx => {
      const { goals } = ctx;
      if (!goals || goals.length === 0) return null;
      const achieved = goals.filter(g => g.status === 'achieved' && !g.nextGoalId);
      if (achieved.length === 0) return null;
      return {
        title: `${achieved.length} هدف/أهداف محققة بدون أهداف تالية`,
        explanation: {
          summary: `المستفيد حقّق ${achieved.length} هدف ولم تُحدد أهداف تالية. يُنصح بتحديث الخطة.`,
          dataPoints: achieved.map(g => ({
            label: g.title,
            value: 'محقق',
            source: 'TherapeuticGoal',
          })),
          rules: ['RULE_GOAL_ACHIEVED'],
          confidence: 0.75,
        },
        suggestedActions: [
          { type: 'modify_care_plan', label: 'تحديث خطة الرعاية بأهداف جديدة' },
          { type: 'discharge_review', label: 'تقييم جاهزية الخروج' },
        ],
        riskFactor: null,
      };
    },
  },

  // ── Behavior Escalation Rule ──────────────────────────────────────────────
  {
    code: 'RULE_BEHAVIOR_ESCALATION',
    name: 'تصاعد سلوكي',
    category: 'clinical',
    type: 'clinical_alert',
    priority: 'urgent',
    evaluate: ctx => {
      const { recentSessions } = ctx;
      if (!recentSessions || recentSessions.length < 2) return null;
      const behaviorSessions = recentSessions.filter(
        s => s.soapNote?.assessment && /تصاعد|عدوان|إيذاء|هروب|صراخ/i.test(s.soapNote.assessment)
      );
      if (behaviorSessions.length < 2) return null;
      return {
        title: 'تصاعد سلوكي في عدة جلسات — تدخل سلوكي مطلوب',
        explanation: {
          summary: `سُجّلت ملاحظات سلوكية مقلقة في ${behaviorSessions.length} جلسات. يُنصح بتدخل سلوكي متخصص.`,
          rules: ['RULE_BEHAVIOR_ESCALATION'],
          confidence: 0.85,
        },
        suggestedActions: [
          { type: 'behavior_intervention', label: 'وضع خطة تدخل سلوكي' },
          { type: 'reassess', label: 'تقييم سلوكي متخصص' },
          { type: 'contact_family', label: 'إرشاد أسري حول إدارة السلوك' },
        ],
        riskFactor: { code: 'behavior_escalation', category: 'safety', weight: 4, score: 8 },
      };
    },
  },

  // ── Documentation Gap Rule ────────────────────────────────────────────────
  {
    code: 'RULE_MISSING_SESSION_NOTES',
    name: 'جلسات بدون توثيق',
    category: 'quality',
    type: 'documentation_gap',
    priority: 'medium',
    evaluate: ctx => {
      const { recentSessions } = ctx;
      if (!recentSessions || recentSessions.length < 3) return null;
      const undocumented = recentSessions.filter(
        s =>
          s.status === 'completed' &&
          (!s.soapNote || (!s.soapNote.subjective && !s.soapNote.objective))
      );
      if (undocumented.length < 2) return null;
      return {
        title: `${undocumented.length} جلسات مكتملة بدون توثيق SOAP`,
        explanation: {
          summary: `${undocumented.length} جلسات لم تُوثّق بشكل كامل. التوثيق أساسي لمتابعة التقدم والجودة.`,
          rules: ['RULE_MISSING_SESSION_NOTES'],
          confidence: 0.9,
        },
        suggestedActions: [
          { type: 'documentation_followup', label: 'إكمال توثيق الجلسات المعلّقة' },
        ],
        riskFactor: {
          code: 'missing_session_notes',
          category: 'documentation',
          weight: 2,
          score: Math.min(10, undocumented.length * 2),
        },
      };
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Engine Class
// ═══════════════════════════════════════════════════════════════════════════════

class RecommendationEngine {
  constructor() {
    this.rules = RULES;
  }

  /**
   * جمع سياق المستفيد من قاعدة البيانات
   */
  async gatherContext(beneficiaryId) {
    const [
      ClinicalSession,
      ClinicalAssessment,
      TherapeuticGoal,
      UnifiedCarePlan,
      EpisodeOfCare,
      CareTimeline,
    ] = [
      mongoose.model('ClinicalSession'),
      mongoose.model('ClinicalAssessment'),
      mongoose.model('TherapeuticGoal'),
      mongoose.model('UnifiedCarePlan'),
      mongoose.model('EpisodeOfCare'),
      mongoose.model('CareTimeline'),
    ];

    const [recentSessions, lastAssessment, goals, carePlan, episode, familyEvents] =
      await Promise.all([
        ClinicalSession.find({ beneficiaryId, isDeleted: false })
          .sort({ sessionDate: -1 })
          .limit(15)
          .lean(),
        ClinicalAssessment.findOne({ beneficiaryId, isDeleted: false })
          .sort({ assessmentDate: -1 })
          .lean(),
        TherapeuticGoal.find({ beneficiaryId, isDeleted: false }).lean(),
        UnifiedCarePlan.findOne({ beneficiaryId, isDeleted: false }).sort({ createdAt: -1 }).lean(),
        EpisodeOfCare.findOne({
          beneficiaryId,
          status: { $in: ['active', 'in_progress'] },
          isDeleted: false,
        })
          .sort({ createdAt: -1 })
          .lean(),
        CareTimeline.find({
          beneficiaryId,
          eventType: { $in: ['family_meeting', 'family_contact', 'home_visit', 'family_feedback'] },
          isDeleted: false,
        })
          .sort({ timestamp: -1 })
          .limit(10)
          .lean(),
      ]);

    return { recentSessions, lastAssessment, goals, carePlan, episode, familyEvents };
  }

  /**
   * تنفيذ جميع القواعد على سياق مستفيد
   * @returns {Array} توصيات مفسّرة
   */
  async evaluate(beneficiaryId, episodeId) {
    const context = await this.gatherContext(beneficiaryId);
    context.episodeId = episodeId;

    const results = [];

    for (const rule of this.rules) {
      try {
        const result = rule.evaluate(context);
        if (result) {
          results.push({
            ...result,
            type: rule.type,
            category: rule.category,
            priority: rule.priority,
            ruleCode: rule.code,
          });
        }
      } catch (err) {
        logger.warn(`[RecommendationEngine] Rule ${rule.code} error: ${err.message}`);
      }
    }

    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    results.sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));

    return results;
  }

  /**
   * استرجاع قائمة القواعد المتاحة
   */
  listRules() {
    return this.rules.map(r => ({
      code: r.code,
      name: r.name,
      category: r.category,
      type: r.type,
      priority: r.priority,
    }));
  }
}

const recommendationEngine = new RecommendationEngine();

module.exports = { recommendationEngine, RecommendationEngine };
