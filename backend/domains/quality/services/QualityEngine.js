/**
 * QualityEngine — محرك التدقيق الآلي للجودة
 *
 * ينفذ قواعد تدقيق على ملفات المستفيدين ويولد:
 *  - Audit reports مع findings + KPIs
 *  - Corrective actions تلقائية
 *  - Dashboard data لفريق الجودة
 *
 * @module domains/quality/services/QualityEngine
 */

const mongoose = require('mongoose');
const logger = require('../../../utils/logger');

// ═══════════════════════════════════════════════════════════════════════════════
// Compliance Level Thresholds
// ═══════════════════════════════════════════════════════════════════════════════
function complianceLevelFromScore(score) {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'acceptable';
  if (score >= 40) return 'needs_improvement';
  return 'non_compliant';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Audit Rules — مكتبة قواعد التدقيق
// ═══════════════════════════════════════════════════════════════════════════════
const AUDIT_RULES = [
  // ── Completeness ──────────────────────────────────────────────────────────
  {
    code: 'QA_CARE_PLAN_EXISTS',
    name: 'وجود خطة رعاية',
    category: 'completeness',
    severity: 'non_conformity',
    check: ctx => {
      if (!ctx.carePlan) {
        return { passed: false, description: 'لا توجد خطة رعاية مسجلة' };
      }
      return { passed: true, score: 100 };
    },
  },
  {
    code: 'QA_INITIAL_ASSESSMENT',
    name: 'وجود تقييم أولي',
    category: 'completeness',
    severity: 'non_conformity',
    check: ctx => {
      if (!ctx.assessments || ctx.assessments.length === 0) {
        return { passed: false, description: 'لا يوجد أي تقييم مسجل' };
      }
      const initial = ctx.assessments.find(a => a.type === 'initial');
      if (!initial) {
        return { passed: false, description: 'لا يوجد تقييم أولي (initial)' };
      }
      return { passed: true, score: 100 };
    },
  },
  {
    code: 'QA_GOALS_DEFINED',
    name: 'أهداف علاجية محددة',
    category: 'completeness',
    severity: 'warning',
    check: ctx => {
      if (!ctx.goals || ctx.goals.length === 0) {
        return { passed: false, description: 'لا توجد أهداف علاجية محددة' };
      }
      const active = ctx.goals.filter(g => g.status === 'active' || g.status === 'in_progress');
      if (active.length === 0) {
        return { passed: false, description: 'لا توجد أهداف نشطة حالياً', score: 40 };
      }
      return { passed: true, score: 100 };
    },
  },
  {
    code: 'QA_BENEFICIARY_PROFILE_COMPLETE',
    name: 'اكتمال بيانات المستفيد',
    category: 'completeness',
    severity: 'warning',
    check: ctx => {
      const b = ctx.beneficiary;
      if (!b) return { passed: false, description: 'بيانات المستفيد غير موجودة' };
      const required = [
        'personalInfo.firstName',
        'personalInfo.lastName',
        'personalInfo.dateOfBirth',
      ];
      const missing = required.filter(f => {
        const parts = f.split('.');
        let val = b;
        for (const p of parts) {
          val = val?.[p];
        }
        return !val;
      });
      if (missing.length > 0) {
        return {
          passed: false,
          description: `حقول ناقصة: ${missing.join(', ')}`,
          score: Math.round(((required.length - missing.length) / required.length) * 100),
        };
      }
      return { passed: true, score: 100 };
    },
  },

  // ── Timeliness ────────────────────────────────────────────────────────────
  {
    code: 'QA_SESSION_DOC_TIMELINESS',
    name: 'توثيق الجلسات في وقتها',
    category: 'timeliness',
    severity: 'warning',
    check: ctx => {
      if (!ctx.sessions || ctx.sessions.length === 0) return { passed: true, score: 100 };
      const completed = ctx.sessions.filter(s => s.status === 'completed');
      if (completed.length === 0) return { passed: true, score: 100 };
      const lateDoc = completed.filter(s => {
        if (!s.updatedAt || !s.sessionDate) return false;
        const diff = new Date(s.updatedAt) - new Date(s.sessionDate);
        return diff > 48 * 3600 * 1000; // > 48 hours
      });
      const rate = Math.round(((completed.length - lateDoc.length) / completed.length) * 100);
      if (lateDoc.length > 0) {
        return {
          passed: rate >= 80,
          description: `${lateDoc.length} جلسات وُثّقت بعد 48 ساعة (${rate}% في الوقت)`,
          score: rate,
        };
      }
      return { passed: true, score: 100 };
    },
  },
  {
    code: 'QA_REASSESSMENT_ON_TIME',
    name: 'إعادة التقييم في موعدها',
    category: 'reassessment',
    severity: 'non_conformity',
    check: ctx => {
      if (!ctx.assessments || ctx.assessments.length === 0) return { passed: true, score: 50 };
      const latest = ctx.assessments[0]; // sorted desc
      const daysSince = Math.floor(
        (Date.now() - new Date(latest.assessmentDate).getTime()) / 86400000
      );
      if (daysSince > 90) {
        return {
          passed: false,
          description: `آخر تقييم منذ ${daysSince} يوماً (المعيار: 90 يوماً)`,
          score: Math.max(0, 100 - Math.round((daysSince - 90) * 2)),
          evidence: {
            sourceModel: 'ClinicalAssessment',
            sourceId: latest._id,
            field: 'assessmentDate',
          },
        };
      }
      return { passed: true, score: 100 };
    },
  },

  // ── Care Plan Adherence ───────────────────────────────────────────────────
  {
    code: 'QA_SESSION_FREQUENCY',
    name: 'الالتزام بتكرار الجلسات',
    category: 'care_plan_adherence',
    severity: 'warning',
    check: ctx => {
      if (!ctx.sessions || ctx.sessions.length < 4) return { passed: true, score: 80 };
      const last30Days = ctx.sessions.filter(
        s => Date.now() - new Date(s.sessionDate).getTime() < 30 * 86400000
      );
      // Expect at least 4 sessions/month
      if (last30Days.length < 4) {
        return {
          passed: false,
          description: `${last30Days.length} جلسات في آخر 30 يوماً (المتوقع: 4+)`,
          score: Math.round((last30Days.length / 4) * 100),
        };
      }
      return { passed: true, score: 100 };
    },
  },

  // ── Documentation Quality ─────────────────────────────────────────────────
  {
    code: 'QA_SOAP_COMPLETENESS',
    name: 'اكتمال ملاحظات SOAP',
    category: 'documentation',
    severity: 'warning',
    check: ctx => {
      if (!ctx.sessions || ctx.sessions.length === 0) return { passed: true, score: 100 };
      const completed = ctx.sessions.filter(s => s.status === 'completed');
      if (completed.length === 0) return { passed: true, score: 100 };
      const complete = completed.filter(
        s =>
          s.soapNote &&
          s.soapNote.subjective &&
          s.soapNote.objective &&
          s.soapNote.assessment &&
          s.soapNote.plan
      );
      const rate = Math.round((complete.length / completed.length) * 100);
      if (rate < 80) {
        return {
          passed: false,
          description: `${rate}% من الجلسات لديها SOAP مكتمل (المعيار: 80%)`,
          score: rate,
        };
      }
      return { passed: true, score: rate };
    },
  },

  // ── Family Engagement ─────────────────────────────────────────────────────
  {
    code: 'QA_FAMILY_CONTACT',
    name: 'تواصل أسري منتظم',
    category: 'family_engagement',
    severity: 'info',
    check: ctx => {
      if (!ctx.familyEvents) return { passed: true, score: 50 };
      const recent = ctx.familyEvents.filter(
        e => Date.now() - new Date(e.timestamp).getTime() < 30 * 86400000
      );
      if (recent.length === 0) {
        return { passed: false, description: 'لا يوجد تواصل أسري في آخر 30 يوماً', score: 0 };
      }
      if (recent.length < 2) {
        return { passed: false, description: 'تواصل أسري محدود (واحد فقط في 30 يوم)', score: 40 };
      }
      return { passed: true, score: 100 };
    },
  },

  // ── Attendance ────────────────────────────────────────────────────────────
  {
    code: 'QA_ATTENDANCE_RATE',
    name: 'معدل الحضور',
    category: 'attendance',
    severity: 'warning',
    check: ctx => {
      if (!ctx.sessions || ctx.sessions.length < 5) return { passed: true, score: 80 };
      const total = ctx.sessions.length;
      const attended = ctx.sessions.filter(
        s => s.attendance?.status === 'present' || s.status === 'completed'
      ).length;
      const rate = Math.round((attended / total) * 100);
      if (rate < 70) {
        return { passed: false, description: `معدل الحضور ${rate}% (المعيار: 70%)`, score: rate };
      }
      return { passed: true, score: rate };
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// QualityEngine Class
// ═══════════════════════════════════════════════════════════════════════════════

class QualityEngine {
  constructor() {
    this.rules = AUDIT_RULES;
  }

  /**
   * جمع سياق المستفيد للتدقيق
   */
  async gatherContext(beneficiaryId) {
    const [
      Beneficiary,
      ClinicalAssessment,
      TherapeuticGoal,
      UnifiedCarePlan,
      ClinicalSession,
      CareTimeline,
    ] = [
      mongoose.model('Beneficiary'),
      mongoose.model('ClinicalAssessment'),
      mongoose.model('TherapeuticGoal'),
      mongoose.model('UnifiedCarePlan'),
      mongoose.model('ClinicalSession'),
      mongoose.model('CareTimeline'),
    ];

    const [beneficiary, assessments, goals, carePlan, sessions, familyEvents] = await Promise.all([
      Beneficiary.findById(beneficiaryId).lean(),
      ClinicalAssessment.find({ beneficiaryId, isDeleted: false })
        .sort({ assessmentDate: -1 })
        .limit(10)
        .lean(),
      TherapeuticGoal.find({ beneficiaryId, isDeleted: false }).lean(),
      UnifiedCarePlan.findOne({ beneficiaryId, isDeleted: false }).sort({ createdAt: -1 }).lean(),
      ClinicalSession.find({ beneficiaryId, isDeleted: false })
        .sort({ sessionDate: -1 })
        .limit(30)
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

    return { beneficiary, assessments, goals, carePlan, sessions, familyEvents };
  }

  /**
   * تدقيق ملف مستفيد واحد
   */
  async auditBeneficiary(beneficiaryId, { episodeId, auditedBy, auditType } = {}) {
    const QualityAudit = mongoose.model('QualityAudit');
    const CorrectiveAction = mongoose.model('CorrectiveAction');

    const context = await this.gatherContext(beneficiaryId);
    const findings = [];
    const kpis = [];
    let totalScore = 0;
    let totalChecks = 0;
    let passed = 0;
    let warnings = 0;
    let nonConformities = 0;
    let critical = 0;

    for (const rule of this.rules) {
      try {
        const result = rule.check(context);
        totalChecks++;

        if (result.passed) {
          passed++;
          totalScore += result.score || 100;
        } else {
          const finding = {
            ruleCode: rule.code,
            ruleName: rule.name,
            category: rule.category,
            severity: rule.severity,
            description: result.description || rule.name,
            score: result.score || 0,
            evidence: result.evidence,
          };
          findings.push(finding);
          totalScore += result.score || 0;

          if (rule.severity === 'warning') warnings++;
          if (rule.severity === 'non_conformity') nonConformities++;
          if (rule.severity === 'critical') critical++;
        }

        kpis.push({
          code: this._ruleToKpi(rule.code),
          name: rule.name,
          value: result.score || (result.passed ? 100 : 0),
          target: 80,
          unit: '%',
          status: this._kpiStatus(result.score || (result.passed ? 100 : 0), 80),
        });
      } catch (err) {
        logger.warn(`[QualityEngine] Rule ${rule.code} error: ${err.message}`);
      }
    }

    const overallScore = totalChecks > 0 ? Math.round(totalScore / totalChecks) : 0;

    // Save audit
    const audit = await QualityAudit.create({
      scope: 'beneficiary',
      beneficiaryId,
      episodeId,
      overallScore,
      complianceLevel: complianceLevelFromScore(overallScore),
      findings,
      kpis,
      summary: { totalChecks, passed, warnings, nonConformities, critical },
      auditType: auditType || 'automated_scheduled',
      auditedBy,
      branchId: context.beneficiary?.branchId,
      organizationId: context.beneficiary?.organizationId,
    });

    // Auto-create corrective actions for non-conformities and critical
    const actionFindings = findings.filter(
      f => f.severity === 'non_conformity' || f.severity === 'critical'
    );
    const actions = [];
    for (const finding of actionFindings) {
      const action = await CorrectiveAction.create({
        auditId: audit._id,
        findingId: finding._id,
        beneficiaryId,
        episodeId,
        type: this._findingToActionType(finding),
        severity: finding.severity === 'critical' ? 'critical' : 'high',
        title: `إجراء تصحيحي: ${finding.ruleName}`,
        description: finding.description,
        requiredAction: this._findingToRequiredAction(finding),
        dueDate: new Date(Date.now() + 7 * 86400000), // 7 days
        status: 'open',
        branchId: context.beneficiary?.branchId,
        organizationId: context.beneficiary?.organizationId,
      });
      actions.push(action);
    }

    // Link actions to audit
    audit.correctiveActionIds = actions.map(a => a._id);
    await audit.save();

    return { audit, correctiveActions: actions };
  }

  /**
   * تدقيق دفعة لجميع المستفيدين النشطين
   */
  async auditBatch(branchId) {
    const EpisodeOfCare = mongoose.model('EpisodeOfCare');
    const episodes = await EpisodeOfCare.find({
      status: { $in: ['active', 'in_progress'] },
      isDeleted: false,
      ...(branchId ? { branchId } : {}),
    })
      .select('beneficiaryId _id')
      .lean();

    const results = { processed: 0, errors: 0, nonCompliant: 0 };

    for (const ep of episodes) {
      try {
        const { audit } = await this.auditBeneficiary(ep.beneficiaryId, {
          episodeId: ep._id,
          auditType: 'automated_scheduled',
        });
        results.processed++;
        if (
          audit.complianceLevel === 'non_compliant' ||
          audit.complianceLevel === 'needs_improvement'
        ) {
          results.nonCompliant++;
        }
      } catch (err) {
        results.errors++;
        logger.warn(`[QualityEngine] Batch audit error for ${ep.beneficiaryId}: ${err.message}`);
      }
    }

    return results;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Queries & Dashboard
  // ═══════════════════════════════════════════════════════════════════════════

  async getLatestAudit(beneficiaryId) {
    const QualityAudit = mongoose.model('QualityAudit');
    return QualityAudit.findOne({ beneficiaryId, isDeleted: false }).sort({ auditedAt: -1 }).lean();
  }

  async getAuditHistory(beneficiaryId, limit = 10) {
    const QualityAudit = mongoose.model('QualityAudit');
    return QualityAudit.find({ beneficiaryId, isDeleted: false })
      .sort({ auditedAt: -1 })
      .limit(limit)
      .lean();
  }

  async getOpenActions(filters = {}) {
    const CorrectiveAction = mongoose.model('CorrectiveAction');
    const query = { status: { $in: ['open', 'in_progress', 'overdue'] }, isDeleted: false };
    if (filters.assignedTo) query.assignedTo = filters.assignedTo;
    if (filters.branchId) query.branchId = filters.branchId;
    if (filters.severity) query.severity = filters.severity;
    return CorrectiveAction.find(query)
      .sort({ dueDate: 1 })
      .limit(filters.limit || 50)
      .lean();
  }

  async resolveAction(actionId, userId, note) {
    const CorrectiveAction = mongoose.model('CorrectiveAction');
    return CorrectiveAction.findByIdAndUpdate(
      actionId,
      { status: 'resolved', resolvedAt: new Date(), resolvedBy: userId, resolutionNote: note },
      { new: true }
    ).lean();
  }

  async getDashboard(branchId) {
    const QualityAudit = mongoose.model('QualityAudit');
    const CorrectiveAction = mongoose.model('CorrectiveAction');

    const branchFilter = branchId ? { branchId: new mongoose.Types.ObjectId(branchId) } : {};

    const [complianceDist, avgScore, actionStats, recentAudits, overdueActions] = await Promise.all(
      [
        // Compliance distribution (latest per beneficiary)
        QualityAudit.aggregate([
          { $match: { scope: 'beneficiary', isDeleted: false, ...branchFilter } },
          { $sort: { auditedAt: -1 } },
          { $group: { _id: '$beneficiaryId', latest: { $first: '$$ROOT' } } },
          { $group: { _id: '$latest.complianceLevel', count: { $sum: 1 } } },
        ]),

        // Average compliance score
        QualityAudit.aggregate([
          { $match: { scope: 'beneficiary', isDeleted: false, ...branchFilter } },
          { $sort: { auditedAt: -1 } },
          { $group: { _id: '$beneficiaryId', latest: { $first: '$overallScore' } } },
          { $group: { _id: null, avg: { $avg: '$latest' } } },
        ]),

        // Corrective action stats
        CorrectiveAction.aggregate([
          { $match: { isDeleted: false, ...branchFilter } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),

        // Recent audits with low scores
        QualityAudit.find({
          scope: 'beneficiary',
          isDeleted: false,
          overallScore: { $lt: 60 },
          ...branchFilter,
        })
          .sort({ auditedAt: -1 })
          .limit(15)
          .populate('beneficiaryId', 'personalInfo.firstName personalInfo.lastName fileNumber')
          .lean(),

        // Overdue corrective actions
        CorrectiveAction.find({
          status: { $in: ['open', 'in_progress'] },
          dueDate: { $lt: new Date() },
          isDeleted: false,
          ...branchFilter,
        })
          .sort({ dueDate: 1 })
          .limit(20)
          .lean(),
      ]
    );

    return {
      complianceDistribution: Object.fromEntries(complianceDist.map(c => [c._id, c.count])),
      averageScore: avgScore[0]?.avg ? Math.round(avgScore[0].avg) : null,
      correctiveActions: Object.fromEntries(actionStats.map(a => [a._id, a.count])),
      lowScoreAudits: recentAudits,
      overdueActions,
    };
  }

  /**
   * مقارنة الأداء بين الفرق/الفروع
   */
  async compareBranches() {
    const QualityAudit = mongoose.model('QualityAudit');
    return QualityAudit.aggregate([
      { $match: { scope: 'beneficiary', isDeleted: false, branchId: { $ne: null } } },
      { $sort: { auditedAt: -1 } },
      {
        $group: {
          _id: { beneficiary: '$beneficiaryId', branch: '$branchId' },
          latest: { $first: '$overallScore' },
        },
      },
      { $group: { _id: '$_id.branch', avgScore: { $avg: '$latest' }, count: { $sum: 1 } } },
      { $sort: { avgScore: -1 } },
    ]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  _ruleToKpi(ruleCode) {
    const map = {
      QA_CARE_PLAN_EXISTS: 'documentation_completeness',
      QA_INITIAL_ASSESSMENT: 'documentation_completeness',
      QA_GOALS_DEFINED: 'documentation_completeness',
      QA_BENEFICIARY_PROFILE_COMPLETE: 'documentation_completeness',
      QA_SESSION_DOC_TIMELINESS: 'documentation_timeliness',
      QA_REASSESSMENT_ON_TIME: 'reassessment_compliance',
      QA_SESSION_FREQUENCY: 'care_plan_adherence',
      QA_SOAP_COMPLETENESS: 'session_documentation_rate',
      QA_FAMILY_CONTACT: 'family_engagement_rate',
      QA_ATTENDANCE_RATE: 'attendance_rate',
    };
    return map[ruleCode] || 'documentation_completeness';
  }

  _kpiStatus(value, target) {
    if (value >= target) return 'met';
    if (value >= target * 0.8) return 'near_target';
    if (value >= target * 0.5) return 'below_target';
    return 'critical';
  }

  _findingToActionType(finding) {
    const map = {
      QA_CARE_PLAN_EXISTS: 'update_care_plan',
      QA_INITIAL_ASSESSMENT: 'schedule_reassessment',
      QA_REASSESSMENT_ON_TIME: 'schedule_reassessment',
      QA_GOALS_DEFINED: 'update_care_plan',
      QA_SOAP_COMPLETENESS: 'complete_documentation',
      QA_SESSION_DOC_TIMELINESS: 'complete_documentation',
      QA_FAMILY_CONTACT: 'contact_family',
    };
    return map[finding.ruleCode] || 'complete_documentation';
  }

  _findingToRequiredAction(finding) {
    const map = {
      QA_CARE_PLAN_EXISTS: 'إنشاء خطة رعاية للمستفيد',
      QA_INITIAL_ASSESSMENT: 'إجراء تقييم أولي للمستفيد',
      QA_REASSESSMENT_ON_TIME: 'جدولة إعادة تقييم دوري',
      QA_GOALS_DEFINED: 'تحديد أهداف علاجية للمستفيد',
      QA_SOAP_COMPLETENESS: 'إكمال توثيق الجلسات بنظام SOAP',
      QA_SESSION_DOC_TIMELINESS: 'توثيق الجلسات خلال 48 ساعة',
      QA_FAMILY_CONTACT: 'التواصل مع أسرة المستفيد',
    };
    return map[finding.ruleCode] || `معالجة: ${finding.description}`;
  }

  listRules() {
    return this.rules.map(r => ({
      code: r.code,
      name: r.name,
      category: r.category,
      severity: r.severity,
    }));
  }
}

const qualityEngine = new QualityEngine();

module.exports = { qualityEngine, QualityEngine };
