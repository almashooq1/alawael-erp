/**
 * خدمة ضمان الجودة
 * Quality Assurance Service
 * Phase 8 — مراقبة جودة الخدمات وتقييم الأداء والامتثال
 */

class QualityAssuranceService {
  constructor() {
    this.audits = new Map();
    this.standards = new Map();
    this.incidents = new Map();
    this.improvements = new Map();
    this.kpis = new Map();
    this._initStandards();
  }

  _initStandards() {
    const defaults = [
      {
        id: 'std-1',
        domain: 'تقييم المستفيد',
        standard: 'إجراء تقييم شامل خلال 48 ساعة من القبول',
        weight: 10,
      },
      { id: 'std-2', domain: 'خطة التأهيل', standard: 'وضع خطة فردية خلال 5 أيام عمل', weight: 10 },
      { id: 'std-3', domain: 'الجلسات', standard: 'توثيق كل جلسة خلال 24 ساعة', weight: 8 },
      { id: 'std-4', domain: 'المراجعة', standard: 'مراجعة الخطة كل 3 أشهر على الأقل', weight: 8 },
      {
        id: 'std-5',
        domain: 'الكوادر',
        standard: 'التدريب المستمر (40 ساعة/سنة لكل معالج)',
        weight: 8,
      },
      { id: 'std-6', domain: 'السلامة', standard: 'صفر حوادث يمكن تجنبها', weight: 10 },
      { id: 'std-7', domain: 'رضا المستفيدين', standard: 'نسبة رضا لا تقل عن 80%', weight: 10 },
      { id: 'std-8', domain: 'النتائج', standard: 'تحسن وظيفي في 70% من الحالات', weight: 12 },
      { id: 'std-9', domain: 'التوثيق', standard: 'اكتمال الملفات بنسبة 95%', weight: 8 },
      { id: 'std-10', domain: 'التواصل', standard: 'إبلاغ الأسرة بالتطورات أسبوعياً', weight: 8 },
      {
        id: 'std-11',
        domain: 'الخصوصية',
        standard: 'حماية بيانات المستفيدين وفق نظام حماية البيانات',
        weight: 10,
      },
      { id: 'std-12', domain: 'المتابعة', standard: 'متابعة بعد الخروج لمدة 6 أشهر', weight: 8 },
    ];
    defaults.forEach(s => this.standards.set(s.id, s));
  }

  /**
   * إجراء تدقيق جودة
   */
  async conductAudit(auditData) {
    const id = `qa-a-${Date.now()}`;
    const _standardsList = [...this.standards.values()];

    const audit = {
      id,
      date: new Date().toISOString(),
      auditType: auditData.type || 'دوري', // دوري | عشوائي | شكوى | تفقدي
      scope: auditData.scope || 'قسم كامل',
      department: auditData.department || '',
      auditor: auditData.auditorId || 'system',
      period: auditData.period || 'الربع الحالي',
      findings: (auditData.findings || []).map((f, i) => ({
        id: `qa-f-${id}-${i + 1}`,
        standardId: f.standardId || null,
        domain: f.domain || '',
        compliance: f.compliance || 'مطابق', // مطابق | جزئي | غير مطابق
        score: f.score ?? 0, // 0-10
        evidence: f.evidence || '',
        observation: f.observation || '',
        correctionNeeded: f.correctionNeeded || false,
        correctionDeadline: f.correctionDeadline || null,
        priority: f.priority || 'متوسطة', // حرجة | عالية | متوسطة | منخفضة
      })),
      overallScore: 0,
      overallCompliance: '',
      strengths: auditData.strengths || [],
      weaknesses: auditData.weaknesses || [],
      recommendations: auditData.recommendations || [],
      actionItems: (auditData.actionItems || []).map((a, i) => ({
        id: `qa-ai-${id}-${i + 1}`,
        action: a.action || '',
        responsible: a.responsible || '',
        deadline: a.deadline || null,
        status: 'معلّق',
      })),
      status: 'مكتمل',
    };

    // حساب النتيجة الكلية
    if (audit.findings.length > 0) {
      audit.overallScore = (
        audit.findings.reduce((s, f) => s + f.score, 0) / audit.findings.length
      ).toFixed(1);
      audit.overallCompliance =
        audit.overallScore >= 8
          ? 'ممتاز'
          : audit.overallScore >= 6
            ? 'جيد'
            : audit.overallScore >= 4
              ? 'يحتاج تحسين'
              : 'غير مقبول';
    }

    this.audits.set(id, audit);
    return audit;
  }

  /**
   * تسجيل حادثة جودة
   */
  async reportIncident(incidentData) {
    const id = `qa-i-${Date.now()}`;
    const incident = {
      id,
      date: new Date().toISOString(),
      incidentDate: incidentData.incidentDate || new Date().toISOString(),
      type: incidentData.type || 'خطأ إجرائي',
      // أنواع: خطأ إجرائي | خطأ طبي | سقوط | شكوى | خرق بيانات | تأخير خدمة | أخرى
      severity: incidentData.severity || 'متوسطة', // حرجة | عالية | متوسطة | منخفضة
      department: incidentData.department || '',
      beneficiaryId: incidentData.beneficiaryId || null,
      description: incidentData.description || '',
      immediateAction: incidentData.immediateAction || '',
      rootCause: incidentData.rootCause || '',
      contributingFactors: incidentData.contributingFactors || [],
      correctiveAction: incidentData.correctiveAction || '',
      preventiveAction: incidentData.preventiveAction || '',
      reportedBy: incidentData.reportedBy || 'system',
      investigator: incidentData.investigator || null,
      resolutionDate: null,
      lessonsLearned: incidentData.lessons || '',
      status: 'مفتوح',
    };
    this.incidents.set(id, incident);
    return incident;
  }

  /**
   * إنشاء خطة تحسين
   */
  async createImprovement(improvementData) {
    const id = `qa-imp-${Date.now()}`;
    const improvement = {
      id,
      createdAt: new Date().toISOString(),
      title: improvementData.title || '',
      type: improvementData.type || 'تحسين مستمر', // تحسين مستمر | تصحيحي | وقائي
      relatedAuditId: improvementData.auditId || null,
      relatedIncidentId: improvementData.incidentId || null,
      domain: improvementData.domain || '',
      currentState: improvementData.currentState || '',
      targetState: improvementData.targetState || '',
      actions: (improvementData.actions || []).map((a, i) => ({
        id: `qa-ia-${id}-${i + 1}`,
        action: a.action || '',
        responsible: a.responsible || '',
        startDate: a.startDate || null,
        deadline: a.deadline || null,
        resources: a.resources || '',
        status: 'قيد الإنجاز',
        completionDate: null,
      })),
      kpiTarget: improvementData.kpiTarget || '',
      kpiBaseline: improvementData.kpiBaseline || '',
      expectedOutcome: improvementData.expectedOutcome || '',
      owner: improvementData.owner || 'system',
      reviewDate: improvementData.reviewDate || null,
      status: 'نشطة',
    };
    this.improvements.set(id, improvement);
    return improvement;
  }

  /**
   * تسجيل مؤشرات الأداء الرئيسية (KPIs)
   */
  async recordKPI(kpiData) {
    const id = `qa-k-${Date.now()}`;
    const kpi = {
      id,
      date: new Date().toISOString(),
      period: kpiData.period || 'شهري',
      department: kpiData.department || 'الكل',
      indicators: {
        beneficiarySatisfaction: kpiData.satisfaction ?? null,
        sessionCompletionRate: kpiData.sessionCompletion ?? null,
        documentationCompleteness: kpiData.documentation ?? null,
        treatmentPlanCompliance: kpiData.planCompliance ?? null,
        functionalImprovement: kpiData.improvement ?? null,
        averageWaitTime: kpiData.waitTime ?? null, // بالأيام
        therapistUtilization: kpiData.utilization ?? null, // %
        incidentRate: kpiData.incidentRate ?? null,
        familyEngagement: kpiData.familyEngagement ?? null,
        followUpCompliance: kpiData.followUp ?? null,
        staffTrainingHours: kpiData.trainingHours ?? null,
        costPerBeneficiary: kpiData.costPerBeneficiary ?? null,
      },
      targets: kpiData.targets || {},
      variances: {},
      overallPerformance: '',
      recordedBy: kpiData.recordedBy || 'system',
    };

    // حساب الانحرافات
    for (const [key, value] of Object.entries(kpi.indicators)) {
      if (value !== null && kpi.targets[key] !== undefined) {
        kpi.variances[key] = (value - kpi.targets[key]).toFixed(1);
      }
    }
    const validIndicators = Object.values(kpi.indicators).filter(v => v !== null);
    const avg =
      validIndicators.length > 0
        ? validIndicators.reduce((a, b) => a + b, 0) / validIndicators.length
        : 0;
    kpi.overallPerformance =
      avg >= 80 ? 'ممتاز' : avg >= 60 ? 'جيد' : avg >= 40 ? 'مقبول' : 'يحتاج تحسين';

    this.kpis.set(id, kpi);
    return kpi;
  }

  /**
   * الحصول على المعايير
   */
  async getStandards() {
    return {
      total: this.standards.size,
      standards: [...this.standards.values()],
    };
  }

  /**
   * تقرير الجودة الشامل
   */
  async getQualityReport(params = {}) {
    const audits = [...this.audits.values()];
    const incidents = [...this.incidents.values()];
    const improvements = [...this.improvements.values()];
    const kpis = [...this.kpis.values()];

    return {
      generatedAt: new Date().toISOString(),
      period: params.period || 'الكل',
      summary: {
        totalAudits: audits.length,
        averageAuditScore:
          audits.length > 0
            ? (audits.reduce((s, a) => s + Number(a.overallScore), 0) / audits.length).toFixed(1)
            : null,
        openIncidents: incidents.filter(i => i.status === 'مفتوح').length,
        totalIncidents: incidents.length,
        criticalIncidents: incidents.filter(i => i.severity === 'حرجة').length,
        activeImprovements: improvements.filter(i => i.status === 'نشطة').length,
        completedImprovements: improvements.filter(i => i.status === 'مكتملة').length,
        latestKPI: kpis.length > 0 ? kpis[kpis.length - 1] : null,
      },
      recentAudits: audits.slice(-5),
      openIncidents: incidents.filter(i => i.status === 'مفتوح').slice(-10),
      activeImprovements: improvements.filter(i => i.status === 'نشطة'),
      standards: [...this.standards.values()],
    };
  }
}

module.exports = { QualityAssuranceService };
