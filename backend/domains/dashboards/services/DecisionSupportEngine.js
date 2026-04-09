/**
 * DecisionSupportEngine — محرك دعم القرار
 *
 * يُنفّذ قواعد ذكية بشكل دوري أو عند الطلب
 * لاكتشاف المخاطر السريرية، الفجوات، انتهاكات KPI
 * ويُنشئ تنبيهات قابلة للتنفيذ
 */

const mongoose = require('mongoose');
const { BaseService } = require('../../_base/BaseService');

/* ─────────────────────── BUILT-IN RULES ─────────────────────── */
const DECISION_RULES = [
  /* 1. لا يوجد جلسات منذ 14 يوم */
  {
    id: 'NO_SESSIONS_14D',
    name: 'No sessions in 14 days',
    category: 'treatment_gap',
    severity: 'high',
    async evaluate() {
      const Beneficiary = mongoose.model('Beneficiary');
      const ClinicalSession = mongoose.model('ClinicalSession');
      const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);

      const activeBeneficiaries = await Beneficiary.find({
        status: 'active',
        isDeleted: { $ne: true },
      })
        .select('_id firstName lastName fileNumber')
        .lean();
      const alerts = [];

      for (const b of activeBeneficiaries) {
        const lastSession = await ClinicalSession.findOne({
          beneficiaryId: b._id,
          isDeleted: { $ne: true },
        })
          .sort({ sessionDate: -1 })
          .select('sessionDate')
          .lean();
        if (!lastSession || lastSession.sessionDate < fourteenDaysAgo) {
          alerts.push({
            beneficiaryId: b._id,
            title: `No sessions for ${b.firstName} ${b.lastName} (${b.fileNumber}) in 14+ days`,
            titleAr: `لا توجد جلسات للمستفيد ${b.firstName} ${b.lastName} منذ أكثر من 14 يوماً`,
            description: `Last session: ${lastSession ? lastSession.sessionDate.toISOString().slice(0, 10) : 'Never'}. Active beneficiary may need intervention.`,
            category: 'treatment_gap',
            severity: 'high',
            suggestedActions: [
              { action: 'Schedule a session', actionType: 'schedule', priority: 1 },
              { action: 'Review care plan', actionType: 'navigate', priority: 2 },
            ],
          });
        }
      }
      return alerts;
    },
  },

  /* 2. حلقة علاجية تجاوزت المدة المقررة */
  {
    id: 'EPISODE_OVERDUE',
    name: 'Episode exceeded planned duration',
    category: 'deadline_approaching',
    severity: 'medium',
    async evaluate() {
      const EpisodeOfCare = mongoose.model('EpisodeOfCare');
      const overdue = await EpisodeOfCare.find({
        status: 'active',
        'period.plannedEnd': { $lt: new Date() },
        isDeleted: { $ne: true },
      })
        .populate('beneficiaryId', 'firstName lastName fileNumber')
        .lean();

      return overdue.map(ep => ({
        beneficiaryId: ep.beneficiaryId?._id,
        episodeId: ep._id,
        title: `Episode overdue: ${ep.beneficiaryId?.firstName} ${ep.beneficiaryId?.lastName}`,
        description: `Episode planned end was ${ep.period?.plannedEnd?.toISOString().slice(0, 10)}. Needs review or extension.`,
        category: 'deadline_approaching',
        severity: 'medium',
        suggestedActions: [
          { action: 'Review episode', actionType: 'navigate', priority: 1 },
          { action: 'Extend or discharge', actionType: 'review', priority: 2 },
        ],
      }));
    },
  },

  /* 3. تراجع في أهداف علاجية */
  {
    id: 'GOAL_DECLINE',
    name: 'Therapeutic goal declining',
    category: 'outcome_decline',
    severity: 'high',
    async evaluate() {
      const TherapeuticGoal = mongoose.model('TherapeuticGoal');
      const declining = await TherapeuticGoal.find({
        status: 'active',
        'progress.trend': 'declining',
        isDeleted: { $ne: true },
      })
        .populate('beneficiaryId', 'firstName lastName fileNumber')
        .lean();

      return declining.map(g => ({
        beneficiaryId: g.beneficiaryId?._id,
        title: `Goal declining: "${g.title}" — ${g.beneficiaryId?.firstName} ${g.beneficiaryId?.lastName}`,
        description: `Goal "${g.title}" shows declining trend. Current progress: ${g.progress?.current || 0}%.`,
        category: 'outcome_decline',
        severity: 'high',
        suggestedActions: [
          { action: 'Adjust intervention strategy', actionType: 'review', priority: 1 },
          { action: 'Schedule team meeting', actionType: 'schedule', priority: 2 },
        ],
      }));
    },
  },

  /* 4. مخاطر سريرية عالية */
  {
    id: 'HIGH_RISK_SCORE',
    name: 'High clinical risk score',
    category: 'clinical_risk',
    severity: 'critical',
    async evaluate() {
      const ClinicalRiskScore = mongoose.model('ClinicalRiskScore');
      const highRisk = await ClinicalRiskScore.find({
        'overallRisk.level': { $in: ['high', 'critical'] },
        isDeleted: { $ne: true },
        calculatedAt: { $gte: new Date(Date.now() - 30 * 86400000) },
      })
        .populate('beneficiaryId', 'firstName lastName fileNumber')
        .lean();

      return highRisk.map(r => ({
        beneficiaryId: r.beneficiaryId?._id,
        title: `High clinical risk: ${r.beneficiaryId?.firstName} ${r.beneficiaryId?.lastName} (${r.overallRisk?.level})`,
        description: `Overall risk score: ${r.overallRisk?.score}. Top factors: ${(
          r.overallRisk?.factors || []
        )
          .slice(0, 3)
          .map(f => f.name)
          .join(', ')}`,
        category: 'clinical_risk',
        severity: 'critical',
        suggestedActions: [
          { action: 'Immediate clinical review', actionType: 'review', priority: 1 },
          { action: 'Notify supervisor', actionType: 'send_message', priority: 2 },
        ],
      }));
    },
  },

  /* 5. انتهاك جودة */
  {
    id: 'QUALITY_VIOLATION',
    name: 'Unresolved quality audit findings',
    category: 'quality_concern',
    severity: 'high',
    async evaluate() {
      const CorrectiveAction = mongoose.model('CorrectiveAction');
      const overdue = await CorrectiveAction.find({
        status: { $in: ['open', 'in_progress'] },
        dueDate: { $lt: new Date() },
        isDeleted: { $ne: true },
      }).lean();

      return overdue.map(ca => ({
        title: `Overdue corrective action: ${ca.title}`,
        description: `Due ${ca.dueDate?.toISOString().slice(0, 10)}. Priority: ${ca.priority}. Assigned to: ${ca.assignedTo}`,
        category: 'quality_concern',
        severity: ca.priority === 'critical' ? 'critical' : 'high',
        suggestedActions: [
          { action: 'Follow up on corrective action', actionType: 'navigate', priority: 1 },
          { action: 'Escalate if needed', actionType: 'send_message', priority: 2 },
        ],
      }));
    },
  },

  /* 6. حالات سلوكية متكررة */
  {
    id: 'BEHAVIOR_ESCALATION',
    name: 'Behavior incident escalation',
    category: 'safety',
    severity: 'high',
    async evaluate() {
      const BehaviorRecord = mongoose.model('BehaviorRecord');
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

      const escalations = await BehaviorRecord.aggregate([
        {
          $match: {
            occurredAt: { $gte: sevenDaysAgo },
            'behavior.severity': { $in: ['severe', 'crisis'] },
            isDeleted: { $ne: true },
          },
        },
        { $group: { _id: '$beneficiaryId', count: { $sum: 1 }, latest: { $max: '$occurredAt' } } },
        { $match: { count: { $gte: 3 } } },
      ]);

      const Beneficiary = mongoose.model('Beneficiary');
      const alerts = [];
      for (const e of escalations) {
        const b = await Beneficiary.findById(e._id).select('firstName lastName fileNumber').lean();
        if (b) {
          alerts.push({
            beneficiaryId: e._id,
            title: `${e.count} severe behavior incidents in 7 days: ${b.firstName} ${b.lastName}`,
            description: `${e.count} severe/crisis incidents in the past week. Behavior plan review recommended.`,
            category: 'safety',
            severity: 'critical',
            suggestedActions: [
              { action: 'Review behavior plan', actionType: 'navigate', priority: 1 },
              { action: 'Schedule team conference', actionType: 'schedule', priority: 2 },
            ],
          });
        }
      }
      return alerts;
    },
  },

  /* 7. عدم تفاعل الأسرة */
  {
    id: 'FAMILY_DISENGAGED',
    name: 'Family disengagement',
    category: 'family_engagement',
    severity: 'medium',
    async evaluate() {
      const FamilyCommunication = mongoose.model('FamilyCommunication');
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

      const disengaged = await FamilyCommunication.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo }, isDeleted: { $ne: true } } },
        { $group: { _id: '$beneficiaryId', lastComm: { $max: '$createdAt' }, count: { $sum: 1 } } },
        { $match: { count: { $lte: 1 } } },
      ]);

      const Beneficiary = mongoose.model('Beneficiary');
      const alerts = [];
      for (const d of disengaged) {
        const b = await Beneficiary.findById(d._id).select('firstName lastName fileNumber').lean();
        if (b) {
          alerts.push({
            beneficiaryId: d._id,
            title: `Low family engagement: ${b.firstName} ${b.lastName}`,
            description: `Only ${d.count} family communication(s) in the past 30 days.`,
            category: 'family_engagement',
            severity: 'medium',
            suggestedActions: [
              { action: 'Schedule family meeting', actionType: 'schedule', priority: 1 },
              { action: 'Send progress update', actionType: 'send_message', priority: 2 },
            ],
          });
        }
      }
      return alerts;
    },
  },

  /* 8. KPI breach */
  {
    id: 'KPI_BREACH',
    name: 'KPI threshold breach',
    category: 'kpi_breach',
    severity: 'high',
    async evaluate() {
      const KPISnapshot = mongoose.model('KPISnapshot');
      const breached = await KPISnapshot.find({
        status: { $in: ['warning', 'critical'] },
        calculatedAt: { $gte: new Date(Date.now() - 7 * 86400000) },
      })
        .populate('kpiId', 'name code category')
        .lean();

      return breached.map(s => ({
        title: `KPI ${s.status}: ${s.kpiId?.name || s.kpiCode}`,
        description: `Value: ${s.value}, Target: ${s.target}. Variance: ${s.variancePercentage?.toFixed(1)}%`,
        category: 'kpi_breach',
        severity: s.status === 'critical' ? 'critical' : 'high',
        source: { type: 'kpi_monitor', kpiCode: s.kpiCode },
        suggestedActions: [
          { action: 'Review KPI details', actionType: 'navigate', priority: 1 },
          { action: 'Create corrective action', actionType: 'create_task', priority: 2 },
        ],
      }));
    },
  },
];

/* ─────────────────────── SERVICE ─────────────────────── */

class DecisionSupportEngine extends BaseService {
  constructor() {
    super({ serviceName: 'DecisionSupportEngine', cachePrefix: 'decision' });
    this.rules = [...DECISION_RULES];
  }

  /**
   * Run all rules and create alerts for new findings
   */
  async runAllRules(branchId) {
    const DecisionAlert = mongoose.model('DecisionAlert');
    const results = { processed: 0, alertsCreated: 0, errors: [] };

    for (const rule of this.rules) {
      try {
        const findings = await rule.evaluate();
        for (const finding of findings) {
          // Deduplicate: skip if similar active alert exists
          const existing = await DecisionAlert.findOne({
            title: finding.title,
            status: { $in: ['new', 'acknowledged', 'in_progress'] },
            beneficiaryId: finding.beneficiaryId || null,
          });
          if (!existing) {
            await DecisionAlert.create({
              ...finding,
              branchId: finding.branchId || branchId,
              source: finding.source || {
                type: 'rule_engine',
                ruleId: rule.id,
                domain: 'cross-domain',
              },
            });
            results.alertsCreated++;
          }
        }
        results.processed++;
      } catch (err) {
        results.errors.push({ ruleId: rule.id, error: err.message });
      }
    }

    this.emit('decision:rules:executed', results);
    return results;
  }

  /**
   * Run a single rule by ID
   */
  async runRule(ruleId, branchId) {
    const rule = this.rules.find(r => r.id === ruleId);
    if (!rule) throw new Error(`Rule "${ruleId}" not found`);
    const findings = await rule.evaluate();
    const DecisionAlert = mongoose.model('DecisionAlert');
    const created = [];
    for (const f of findings) {
      const alert = await DecisionAlert.create({
        ...f,
        branchId: f.branchId || branchId,
        source: f.source || { type: 'rule_engine', ruleId: rule.id, domain: 'cross-domain' },
      });
      created.push(alert);
    }
    return { rule: ruleId, findings: findings.length, alertsCreated: created.length };
  }

  /**
   * List available rules
   */
  listRules() {
    return this.rules.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      severity: r.severity,
    }));
  }
}

const decisionSupportEngine = new DecisionSupportEngine();
module.exports = { decisionSupportEngine, DECISION_RULES };
