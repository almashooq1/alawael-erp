/**
 * ReportsEngine — محرك التقارير الموحد
 *
 * يولّد تقارير من القوالب باستخدام بيانات جميع الوحدات
 * مع ملخصات سردية ذكية ومؤشرات أداء رئيسية
 *
 * @module domains/reports/services/ReportsEngine
 */

const mongoose = require('mongoose');
const logger = require('../../../utils/logger');

// ═══════════════════════════════════════════════════════════════════════════════
// Built-in Report Generators — مولدات التقارير المدمجة
// ═══════════════════════════════════════════════════════════════════════════════

const BUILTIN_REPORTS = {
  // ── Beneficiary Progress Report ───────────────────────────────────────────
  BENEFICIARY_PROGRESS: {
    name: 'تقرير تقدم المستفيد',
    category: 'clinical',
    scope: 'beneficiary',
    generate: async params => {
      const { beneficiaryId, from, to } = params;
      const [
        Beneficiary,
        ClinicalSession,
        TherapeuticGoal,
        ClinicalAssessment,
        MeasureApplication,
        CareTimeline,
      ] = [
        mongoose.model('Beneficiary'),
        mongoose.model('ClinicalSession'),
        mongoose.model('TherapeuticGoal'),
        mongoose.model('ClinicalAssessment'),
        mongoose.model('MeasureApplication'),
        mongoose.model('CareTimeline'),
      ];

      const dateFilter = { $gte: new Date(from), $lte: new Date(to) };

      const [beneficiary, sessions, goals, assessments, measures, events] = await Promise.all([
        Beneficiary.findById(beneficiaryId).select('personalInfo disability fileNumber').lean(),
        ClinicalSession.find({ beneficiaryId, sessionDate: dateFilter, isDeleted: false })
          .sort({ sessionDate: 1 })
          .lean(),
        TherapeuticGoal.find({ beneficiaryId, isDeleted: false }).lean(),
        ClinicalAssessment.find({ beneficiaryId, assessmentDate: dateFilter, isDeleted: false })
          .sort({ assessmentDate: 1 })
          .lean(),
        MeasureApplication.find({ beneficiaryId, applicationDate: dateFilter, isDeleted: false })
          .sort({ applicationDate: 1 })
          .lean(),
        CareTimeline.find({ beneficiaryId, timestamp: dateFilter, isDeleted: false })
          .sort({ timestamp: 1 })
          .lean(),
      ]);

      // Sessions analysis
      const totalSessions = sessions.length;
      const attended = sessions.filter(
        s => s.attendance?.status === 'present' || s.status === 'completed'
      ).length;
      const attendanceRate = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;

      // Goals analysis
      const activeGoals = goals.filter(g => g.status === 'active' || g.status === 'in_progress');
      const achievedGoals = goals.filter(g => g.status === 'achieved');
      const goalProgress = activeGoals.map(g => ({
        title: g.title,
        domain: g.domain,
        currentProgress: g.currentProgress || 0,
        targetValue: g.targetValue || 100,
        trend: g.progressTrend || 'stable',
      }));

      // Narrative
      const narrative = _generateBeneficiaryNarrative({
        beneficiary,
        totalSessions,
        attended,
        attendanceRate,
        activeGoals: activeGoals.length,
        achievedGoals: achievedGoals.length,
        assessments: assessments.length,
        measures: measures.length,
      });

      return {
        sections: [
          {
            key: 'summary',
            title: 'ملخص عام',
            type: 'summary',
            data: {
              beneficiary,
              totalSessions,
              attended,
              attendanceRate,
              activeGoals: activeGoals.length,
              achievedGoals: achievedGoals.length,
            },
          },
          {
            key: 'goals',
            title: 'الأهداف العلاجية',
            type: 'table',
            data: goalProgress,
            rowCount: goalProgress.length,
          },
          {
            key: 'sessions',
            title: 'سجل الجلسات',
            type: 'chart',
            data: { total: totalSessions, attended, missed: totalSessions - attended },
            chartData: {
              chartType: 'bar',
              labels: ['حضر', 'غاب'],
              values: [attended, totalSessions - attended],
            },
          },
          {
            key: 'assessments',
            title: 'التقييمات',
            type: 'table',
            data: assessments.map(a => ({
              date: a.assessmentDate,
              type: a.type,
              score: a.totalScore,
            })),
            rowCount: assessments.length,
          },
          {
            key: 'measures',
            title: 'المقاييس',
            type: 'table',
            data: measures.map(m => ({
              date: m.applicationDate,
              measure: m.measureCode,
              score: m.totalScore,
              interpretation: m.interpretation,
            })),
            rowCount: measures.length,
          },
          {
            key: 'timeline',
            title: 'الخط الزمني',
            type: 'timeline',
            data: events
              .slice(0, 30)
              .map(e => ({ date: e.timestamp, type: e.eventType, title: e.title })),
            rowCount: events.length,
          },
        ],
        narrativeSummary: narrative,
        kpis: [
          {
            code: 'attendance_rate',
            name: 'نسبة الحضور',
            value: attendanceRate,
            target: 80,
            unit: '%',
          },
          { code: 'active_goals', name: 'أهداف نشطة', value: activeGoals.length, unit: '' },
          { code: 'achieved_goals', name: 'أهداف محققة', value: achievedGoals.length, unit: '' },
          { code: 'total_sessions', name: 'إجمالي الجلسات', value: totalSessions, unit: '' },
        ],
        dataPointsCount:
          totalSessions + goals.length + assessments.length + measures.length + events.length,
      };
    },
  },

  // ── Therapist Caseload Report ─────────────────────────────────────────────
  THERAPIST_CASELOAD: {
    name: 'تقرير حالات الأخصائي',
    category: 'operational',
    scope: 'therapist',
    generate: async params => {
      const { therapistId, from, to } = params;
      const ClinicalSession = mongoose.model('ClinicalSession');
      const dateFilter = { $gte: new Date(from), $lte: new Date(to) };

      const sessions = await ClinicalSession.find({
        therapistId,
        sessionDate: dateFilter,
        isDeleted: false,
      })
        .populate('beneficiaryId', 'personalInfo.firstName personalInfo.lastName fileNumber')
        .sort({ sessionDate: 1 })
        .lean();

      // Group by beneficiary
      const caseMap = {};
      sessions.forEach(s => {
        const bid = s.beneficiaryId?._id?.toString() || 'unknown';
        if (!caseMap[bid]) {
          caseMap[bid] = {
            beneficiary: s.beneficiaryId,
            sessions: 0,
            attended: 0,
            types: new Set(),
          };
        }
        caseMap[bid].sessions++;
        caseMap[bid].types.add(s.type);
        if (s.attendance?.status === 'present' || s.status === 'completed') caseMap[bid].attended++;
      });

      const cases = Object.values(caseMap).map(c => ({
        beneficiary: c.beneficiary
          ? `${c.beneficiary.personalInfo?.firstName} ${c.beneficiary.personalInfo?.lastName}`
          : 'غير معروف',
        fileNumber: c.beneficiary?.fileNumber,
        totalSessions: c.sessions,
        attended: c.attended,
        attendanceRate: c.sessions > 0 ? Math.round((c.attended / c.sessions) * 100) : 0,
        sessionTypes: [...c.types],
      }));

      return {
        sections: [
          {
            key: 'overview',
            title: 'نظرة عامة',
            type: 'kpi',
            data: {
              totalCases: cases.length,
              totalSessions: sessions.length,
              avgSessionsPerCase: cases.length > 0 ? Math.round(sessions.length / cases.length) : 0,
            },
          },
          {
            key: 'cases',
            title: 'قائمة الحالات',
            type: 'table',
            data: cases,
            rowCount: cases.length,
          },
          {
            key: 'session_types',
            title: 'أنواع الجلسات',
            type: 'chart',
            chartData: { chartType: 'pie' },
          },
        ],
        kpis: [
          { code: 'total_cases', name: 'عدد الحالات', value: cases.length, unit: '' },
          { code: 'total_sessions', name: 'إجمالي الجلسات', value: sessions.length, unit: '' },
        ],
        dataPointsCount: sessions.length,
      };
    },
  },

  // ── Branch Performance Report ─────────────────────────────────────────────
  BRANCH_PERFORMANCE: {
    name: 'تقرير أداء الفرع',
    category: 'executive',
    scope: 'branch',
    generate: async params => {
      const { branchId, from, to } = params;
      const dateFilter = { $gte: new Date(from), $lte: new Date(to) };
      const branchFilter = branchId ? { branchId: new mongoose.Types.ObjectId(branchId) } : {};

      const [sessionStats, goalStats, qualityStats, riskStats] = await Promise.all([
        mongoose
          .model('ClinicalSession')
          .aggregate([
            { $match: { sessionDate: dateFilter, isDeleted: false, ...branchFilter } },
            { $group: { _id: '$type', count: { $sum: 1 } } },
          ]),
        mongoose
          .model('TherapeuticGoal')
          .aggregate([
            { $match: { isDeleted: false, ...branchFilter } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ]),
        mongoose
          .model('QualityAudit')
          .aggregate([
            { $match: { auditedAt: dateFilter, isDeleted: false, ...branchFilter } },
            { $group: { _id: null, avgScore: { $avg: '$overallScore' }, count: { $sum: 1 } } },
          ]),
        mongoose
          .model('ClinicalRiskScore')
          .aggregate([
            { $match: { calculatedAt: dateFilter, isDeleted: false, ...branchFilter } },
            { $sort: { calculatedAt: -1 } },
            { $group: { _id: '$beneficiaryId', latest: { $first: '$riskLevel' } } },
            { $group: { _id: '$latest', count: { $sum: 1 } } },
          ]),
      ]);

      return {
        sections: [
          {
            key: 'sessions',
            title: 'الجلسات حسب النوع',
            type: 'chart',
            data: Object.fromEntries(sessionStats.map(s => [s._id, s.count])),
            chartData: { chartType: 'bar' },
          },
          {
            key: 'goals',
            title: 'حالة الأهداف',
            type: 'chart',
            data: Object.fromEntries(goalStats.map(g => [g._id, g.count])),
            chartData: { chartType: 'donut' },
          },
          {
            key: 'quality',
            title: 'مؤشرات الجودة',
            type: 'kpi',
            data: {
              avgScore: qualityStats[0]?.avgScore ? Math.round(qualityStats[0].avgScore) : null,
              auditsCount: qualityStats[0]?.count || 0,
            },
          },
          {
            key: 'risk',
            title: 'توزيع المخاطر',
            type: 'chart',
            data: Object.fromEntries(riskStats.map(r => [r._id, r.count])),
            chartData: { chartType: 'pie' },
          },
        ],
        kpis: [
          {
            code: 'avg_quality',
            name: 'متوسط الجودة',
            value: qualityStats[0]?.avgScore ? Math.round(qualityStats[0].avgScore) : 0,
            target: 80,
            unit: '%',
          },
          {
            code: 'total_sessions',
            name: 'إجمالي الجلسات',
            value: sessionStats.reduce((s, v) => s + v.count, 0),
            unit: '',
          },
        ],
        dataPointsCount:
          sessionStats.reduce((s, v) => s + v.count, 0) +
          goalStats.reduce((s, v) => s + v.count, 0),
      };
    },
  },

  // ── Quality Summary Report ────────────────────────────────────────────────
  QUALITY_SUMMARY: {
    name: 'ملخص الجودة والامتثال',
    category: 'quality',
    scope: 'branch',
    generate: async params => {
      const { branchId, from, to } = params;
      const [QualityAudit, CorrectiveAction] = [
        mongoose.model('QualityAudit'),
        mongoose.model('CorrectiveAction'),
      ];
      const dateFilter = { $gte: new Date(from), $lte: new Date(to) };
      const branchFilter = branchId ? { branchId: new mongoose.Types.ObjectId(branchId) } : {};

      const [complianceDist, kpiAverages, actionStats] = await Promise.all([
        QualityAudit.aggregate([
          { $match: { auditedAt: dateFilter, isDeleted: false, ...branchFilter } },
          {
            $group: {
              _id: '$complianceLevel',
              count: { $sum: 1 },
              avgScore: { $avg: '$overallScore' },
            },
          },
        ]),
        QualityAudit.aggregate([
          { $match: { auditedAt: dateFilter, isDeleted: false, ...branchFilter } },
          { $unwind: '$kpis' },
          {
            $group: {
              _id: '$kpis.code',
              avgValue: { $avg: '$kpis.value' },
              name: { $first: '$kpis.name' },
            },
          },
        ]),
        CorrectiveAction.aggregate([
          { $match: { createdAt: dateFilter, isDeleted: false, ...branchFilter } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
      ]);

      return {
        sections: [
          {
            key: 'compliance',
            title: 'توزيع الامتثال',
            type: 'chart',
            data: Object.fromEntries(
              complianceDist.map(c => [c._id, { count: c.count, avgScore: Math.round(c.avgScore) }])
            ),
            chartData: { chartType: 'bar' },
          },
          {
            key: 'kpis',
            title: 'متوسط مؤشرات الأداء',
            type: 'table',
            data: kpiAverages.map(k => ({
              code: k._id,
              name: k.name,
              average: Math.round(k.avgValue),
            })),
            rowCount: kpiAverages.length,
          },
          {
            key: 'actions',
            title: 'الإجراءات التصحيحية',
            type: 'kpi',
            data: Object.fromEntries(actionStats.map(a => [a._id, a.count])),
          },
        ],
        kpis: kpiAverages.map(k => ({
          code: k._id,
          name: k.name,
          value: Math.round(k.avgValue),
          target: 80,
          unit: '%',
        })),
        dataPointsCount: complianceDist.reduce((s, c) => s + c.count, 0),
      };
    },
  },

  // ── Program Outcomes Report ───────────────────────────────────────────────
  PROGRAM_OUTCOMES: {
    name: 'تقرير نتائج البرنامج',
    category: 'outcomes',
    scope: 'program',
    generate: async params => {
      const { programId, from, to } = params;
      const [Program, ProgramEnrollment] = [
        mongoose.model('Program'),
        mongoose.model('ProgramEnrollment'),
      ];

      const [program, enrollments] = await Promise.all([
        Program.findById(programId).lean(),
        ProgramEnrollment.find({ programId, isDeleted: false })
          .populate('beneficiaryId', 'personalInfo.firstName personalInfo.lastName')
          .lean(),
      ]);

      const active = enrollments.filter(e => e.status === 'active');
      const completed = enrollments.filter(e => e.status === 'completed');
      const withdrawn = enrollments.filter(e => e.status === 'withdrawn');
      const completionRate =
        enrollments.length > 0 ? Math.round((completed.length / enrollments.length) * 100) : 0;

      return {
        sections: [
          {
            key: 'overview',
            title: 'نظرة عامة',
            type: 'summary',
            data: {
              programName: program?.name,
              totalEnrollments: enrollments.length,
              active: active.length,
              completed: completed.length,
              withdrawn: withdrawn.length,
            },
          },
          {
            key: 'enrollments',
            title: 'التسجيلات',
            type: 'table',
            data: enrollments.map(e => ({
              name: e.beneficiaryId
                ? `${e.beneficiaryId.personalInfo?.firstName} ${e.beneficiaryId.personalInfo?.lastName}`
                : 'N/A',
              status: e.status,
              sessionsAttended: e.progress?.sessionsAttended || 0,
            })),
            rowCount: enrollments.length,
          },
          {
            key: 'status_dist',
            title: 'توزيع الحالات',
            type: 'chart',
            chartData: {
              chartType: 'donut',
              labels: ['نشط', 'مكتمل', 'منسحب'],
              values: [active.length, completed.length, withdrawn.length],
            },
          },
        ],
        kpis: [
          {
            code: 'completion_rate',
            name: 'نسبة الإكمال',
            value: completionRate,
            target: 70,
            unit: '%',
          },
          {
            code: 'total_enrollments',
            name: 'إجمالي التسجيلات',
            value: enrollments.length,
            unit: '',
          },
        ],
        dataPointsCount: enrollments.length,
      };
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Narrative Generator — مولد الملخصات السردية
// ═══════════════════════════════════════════════════════════════════════════════

function _generateBeneficiaryNarrative({
  beneficiary,
  totalSessions,
  attended,
  attendanceRate,
  activeGoals,
  achievedGoals,
  assessments,
  measures,
}) {
  const name = beneficiary
    ? `${beneficiary.personalInfo?.firstName} ${beneficiary.personalInfo?.lastName}`
    : 'المستفيد';
  const parts = [];

  parts.push(
    `خلال الفترة المحددة، شارك ${name} في ${totalSessions} جلسة علاجية، حضر منها ${attended} جلسة (نسبة حضور ${attendanceRate}%).`
  );

  if (attendanceRate >= 80) {
    parts.push('يُظهر التزاماً جيداً بالحضور.');
  } else if (attendanceRate >= 60) {
    parts.push('نسبة الحضور مقبولة لكن تحتاج تحسيناً.');
  } else {
    parts.push('نسبة الحضور منخفضة وتتطلب تدخلاً عاجلاً.');
  }

  if (activeGoals > 0) {
    parts.push(`لديه ${activeGoals} هدف علاجي نشط.`);
  }
  if (achievedGoals > 0) {
    parts.push(`حقّق ${achievedGoals} هدف خلال الفترة.`);
  }
  if (assessments > 0) {
    parts.push(`أُجري ${assessments} تقييم.`);
  }
  if (measures > 0) {
    parts.push(`طُبّق ${measures} مقياس معياري.`);
  }

  return parts.join(' ');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ReportsEngine Class
// ═══════════════════════════════════════════════════════════════════════════════

class ReportsEngine {
  constructor() {
    this.builtinReports = BUILTIN_REPORTS;
  }

  /**
   * توليد تقرير من قالب أو مولد مدمج
   */
  async generateReport(templateCodeOrId, params = {}) {
    const ReportTemplate = mongoose.model('ReportTemplate');
    const GeneratedReport = mongoose.model('GeneratedReport');

    const startTime = Date.now();

    // Find template
    let template = await ReportTemplate.findOne({
      code: templateCodeOrId,
      isDeleted: false,
    }).lean();
    if (!template) {
      template = await ReportTemplate.findById(templateCodeOrId).lean();
    }

    // Use builtin generator if available
    const builtin = this.builtinReports[templateCodeOrId];
    if (!builtin && !template) {
      throw new Error(`قالب التقرير غير موجود: ${templateCodeOrId}`);
    }

    const from = params.from || new Date(Date.now() - 30 * 86400000);
    const to = params.to || new Date();

    // Create report record
    const report = await GeneratedReport.create({
      templateId: template?._id,
      templateCode: templateCodeOrId,
      scope: template?.scope || builtin?.scope || 'system',
      beneficiaryId: params.beneficiaryId,
      therapistId: params.therapistId,
      programId: params.programId,
      branchId: params.branchId,
      organizationId: params.organizationId,
      period: { from, to, label: params.periodLabel },
      title: template?.nameAr || builtin?.name || templateCodeOrId,
      status: 'generating',
      generatedBy: params.userId,
      generationMethod: params.method || 'on_demand',
    });

    try {
      let result;

      if (builtin) {
        result = await builtin.generate({ ...params, from, to });
      } else {
        result = await this._generateFromTemplate(template, { ...params, from, to });
      }

      // Update report with results
      report.sections = result.sections || [];
      report.kpis = result.kpis || [];
      report.narrativeSummary = result.narrativeSummary || '';
      report.keyFindings = result.keyFindings || [];
      report.dataPointsCount = result.dataPointsCount || 0;
      report.generationDuration = Date.now() - startTime;
      report.status = 'completed';
      await report.save();

      logger.info(
        `[ReportsEngine] Report ${templateCodeOrId} generated in ${report.generationDuration}ms`
      );
      return report;
    } catch (err) {
      report.status = 'failed';
      report.errorMessage = err.message;
      await report.save();
      throw err;
    }
  }

  /**
   * توليد من قالب مخصص (generic)
   */
  async _generateFromTemplate(template, params) {
    const sections = [];

    for (const section of template.sections || []) {
      if (!section.visible) continue;

      try {
        const ds = section.dataSource;
        if (!ds || !ds.model) {
          sections.push({ key: section.key, title: section.title, type: section.type, data: null });
          continue;
        }

        const Model = mongoose.model(ds.model);
        const filter = { isDeleted: false, ...ds.filters };

        // Add scope filters
        if (params.beneficiaryId) filter.beneficiaryId = params.beneficiaryId;
        if (params.branchId) filter.branchId = params.branchId;

        let data;
        if (ds.aggregation === 'count') {
          data = await Model.countDocuments(filter);
        } else if (ds.aggregation === 'group') {
          data = await Model.aggregate([
            { $match: filter },
            { $group: { _id: `$${ds.groupBy}`, count: { $sum: 1 } } },
            ...(ds.sortBy ? [{ $sort: { [ds.sortBy]: -1 } }] : []),
            ...(ds.limit ? [{ $limit: ds.limit }] : []),
          ]);
        } else {
          const query = Model.find(filter);
          if (ds.fields && ds.fields.length) query.select(ds.fields.join(' '));
          if (ds.sortBy) query.sort(ds.sortBy);
          if (ds.limit) query.limit(ds.limit);
          data = await query.lean();
        }

        sections.push({
          key: section.key,
          title: section.title,
          type: section.type,
          data,
          chartData: section.chartConfig || null,
          rowCount: Array.isArray(data) ? data.length : 1,
        });
      } catch (err) {
        logger.warn(`[ReportsEngine] Section ${section.key} error: ${err.message}`);
        sections.push({
          key: section.key,
          title: section.title,
          type: section.type,
          data: null,
          narrative: `خطأ: ${err.message}`,
        });
      }
    }

    return { sections, dataPointsCount: sections.reduce((s, sec) => s + (sec.rowCount || 0), 0) };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Queries
  // ═══════════════════════════════════════════════════════════════════════════

  async getReport(reportId) {
    const GeneratedReport = mongoose.model('GeneratedReport');
    return GeneratedReport.findById(reportId)
      .populate('templateId', 'name nameAr code category')
      .lean();
  }

  async listReports({ beneficiaryId, branchId, templateCode, status, limit = 20, page = 1 } = {}) {
    const GeneratedReport = mongoose.model('GeneratedReport');
    const filter = { isDeleted: false };
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    if (branchId) filter.branchId = branchId;
    if (templateCode) filter.templateCode = templateCode;
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      GeneratedReport.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('templateCode title scope period status generationDuration createdAt')
        .lean(),
      GeneratedReport.countDocuments(filter),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async listTemplates({ category, scope, status = 'active' } = {}) {
    const ReportTemplate = mongoose.model('ReportTemplate');
    const filter = { isDeleted: false };
    if (category) filter.category = category;
    if (scope) filter.scope = scope;
    if (status) filter.status = status;
    return ReportTemplate.find(filter).sort({ category: 1, name: 1 }).lean();
  }

  async listBuiltinReports() {
    return Object.entries(this.builtinReports).map(([code, r]) => ({
      code,
      name: r.name,
      category: r.category,
      scope: r.scope,
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Dashboard
  // ═══════════════════════════════════════════════════════════════════════════

  async getDashboard(branchId) {
    const GeneratedReport = mongoose.model('GeneratedReport');
    const branchFilter = branchId ? { branchId: new mongoose.Types.ObjectId(branchId) } : {};

    const [recentReports, reportsByTemplate, reportsByStatus] = await Promise.all([
      GeneratedReport.find({ isDeleted: false, ...branchFilter })
        .sort({ createdAt: -1 })
        .limit(15)
        .select('templateCode title status period createdAt generationDuration')
        .lean(),

      GeneratedReport.aggregate([
        { $match: { isDeleted: false, ...branchFilter } },
        {
          $group: {
            _id: '$templateCode',
            count: { $sum: 1 },
            lastGenerated: { $max: '$createdAt' },
          },
        },
        { $sort: { count: -1 } },
      ]),

      GeneratedReport.aggregate([
        { $match: { isDeleted: false, ...branchFilter } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      recentReports,
      reportsByTemplate: Object.fromEntries(
        reportsByTemplate.map(r => [r._id, { count: r.count, lastGenerated: r.lastGenerated }])
      ),
      reportsByStatus: Object.fromEntries(reportsByStatus.map(r => [r._id, r.count])),
      availableBuiltinReports: await this.listBuiltinReports(),
    };
  }
}

const reportsEngine = new ReportsEngine();

module.exports = { reportsEngine, ReportsEngine };
