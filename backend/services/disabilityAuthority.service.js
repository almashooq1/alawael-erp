/**
 * خدمة تقارير هيئة رعاية ذوي الإعاقة + معايير CBAHI
 * Disability Authority Reports & CBAHI Standards Service
 */

const {
  DisabilityAuthorityReport,
  CBAHIStandard,
  CBAHICompliance,
} = require('../models/disabilityAuthority.models');

class DisabilityAuthorityService {
  // ============================================================
  // تقارير هيئة رعاية ذوي الإعاقة
  // ============================================================

  /**
   * إنشاء تقرير جديد
   */
  static async createReport(data, userId) {
    const reportNumber = await this._generateReportNumber(data.reportType);
    const report = new DisabilityAuthorityReport({
      ...data,
      reportNumber,
      createdBy: userId,
    });
    return report.save();
  }

  /**
   * جلب جميع التقارير مع التصفية
   */
  static async getReports(filters = {}) {
    const query = { isDeleted: false };
    if (filters.reportType) query.reportType = filters.reportType;
    if (filters.status) query.status = filters.status;
    if (filters.branch) query['centerInfo.branch'] = filters.branch;
    if (filters.startDate && filters.endDate) {
      query['reportPeriod.startDate'] = { $gte: new Date(filters.startDate) };
      query['reportPeriod.endDate'] = { $lte: new Date(filters.endDate) };
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;

    const [reports, total] = await Promise.all([
      DisabilityAuthorityReport.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('createdBy', 'name')
        .populate('centerInfo.branch', 'name'),
      DisabilityAuthorityReport.countDocuments(query),
    ]);

    return { reports, total, page, pages: Math.ceil(total / limit) };
  }

  /**
   * جلب تقرير واحد
   */
  static async getReportById(id) {
    return DisabilityAuthorityReport.findOne({ _id: id, isDeleted: false })
      .populate('createdBy reviewedBy approvedBy', 'name email')
      .populate('centerInfo.branch', 'name');
  }

  /**
   * تحديث تقرير
   */
  static async updateReport(id, data, userId) {
    const report = await DisabilityAuthorityReport.findOne({ _id: id, isDeleted: false });
    if (!report) throw new Error('التقرير غير موجود');
    if (['submitted', 'acknowledged'].includes(report.status)) {
      throw new Error('لا يمكن تعديل تقرير تم تقديمه بالفعل');
    }
    Object.assign(report, data);
    return report.save();
  }

  /**
   * مراجعة واعتماد التقرير
   */
  static async reviewReport(id, action, userId, feedback) {
    const report = await DisabilityAuthorityReport.findById(id);
    if (!report) throw new Error('التقرير غير موجود');

    if (action === 'approve') {
      report.status = 'approved';
      report.approvedBy = userId;
    } else if (action === 'return') {
      report.status = 'returned';
      report.authorityFeedback = feedback;
    } else if (action === 'submit') {
      report.status = 'submitted';
      report.submittedAt = new Date();
    }
    report.reviewedBy = userId;
    return report.save();
  }

  /**
   * توليد التقرير تلقائياً من بيانات النظام
   */
  static async generateReportData(reportType, branch, startDate, endDate) {
    // جمع الإحصائيات من النظام
    const beneficiaryStats = await this._collectBeneficiaryStats(branch, startDate, endDate);
    const serviceStats = await this._collectServiceStats(branch, startDate, endDate);
    const staffStats = await this._collectStaffStats(branch);
    const qualityIndicators = await this._collectQualityIndicators(branch, startDate, endDate);
    const outcomeIndicators = await this._collectOutcomeIndicators(branch, startDate, endDate);

    return {
      reportType,
      reportPeriod: { startDate, endDate },
      beneficiaryStats,
      serviceStats,
      staffStats,
      qualityIndicators,
      outcomeIndicators,
    };
  }

  /**
   * لوحة معلومات التقارير
   */
  static async getDashboard(branch) {
    const query = { isDeleted: false };
    if (branch) query['centerInfo.branch'] = branch;

    const [totalReports, pendingReports, submittedReports, recentReports] = await Promise.all([
      DisabilityAuthorityReport.countDocuments(query),
      DisabilityAuthorityReport.countDocuments({ ...query, status: { $in: ['draft', 'review'] } }),
      DisabilityAuthorityReport.countDocuments({ ...query, status: 'submitted' }),
      DisabilityAuthorityReport.find(query).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    // التقارير المطلوبة القادمة
    const upcomingDeadlines = this._getUpcomingReportDeadlines();

    return {
      summary: { totalReports, pendingReports, submittedReports },
      recentReports,
      upcomingDeadlines,
    };
  }

  // ============================================================
  // معايير CBAHI
  // ============================================================

  /**
   * إضافة / تحديث معايير CBAHI
   */
  static async upsertStandard(data) {
    return CBAHIStandard.findOneAndUpdate({ standardCode: data.standardCode }, data, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
  }

  /**
   * جلب جميع المعايير
   */
  static async getStandards(filters = {}) {
    const query = { isActive: true };
    if (filters.chapter) query.chapter = filters.chapter;
    if (filters.priority) query.priority = filters.priority;
    return CBAHIStandard.find(query).sort({ standardCode: 1 }).lean();
  }

  /**
   * تهيئة المعايير الأساسية
   */
  static async seedDefaultStandards() {
    const defaults = this._getDefaultCBAHIStandards();
    const ops = defaults.map(std => ({
      updateOne: {
        filter: { standardCode: std.standardCode },
        update: { $setOnInsert: std },
        upsert: true,
      },
    }));
    return CBAHIStandard.bulkWrite(ops);
  }

  // ============================================================
  // تقييمات الامتثال CBAHI
  // ============================================================

  /**
   * إنشاء تقييم جديد
   */
  static async createAssessment(data, userId) {
    const assessmentNumber = `CBAHI-${Date.now().toString(36).toUpperCase()}`;

    // جلب المعايير المطلوبة
    const standards = await CBAHIStandard.find({ isActive: true }).lean();

    // تهيئة نتائج المعايير
    const standardResults = standards.map(std => ({
      standard: std._id,
      standardCode: std.standardCode,
      chapter: std.chapter,
      complianceLevel: 'non_compliant',
      score: 0,
      evidenceProvided: [],
      findings: '',
    }));

    const assessment = new CBAHICompliance({
      ...data,
      assessmentNumber,
      standardResults,
      overallResults: {
        totalStandards: standards.length,
        fullyCompliant: 0,
        partiallyCompliant: 0,
        nonCompliant: standards.length,
        notApplicable: 0,
        overallScore: 0,
        overallComplianceRate: 0,
      },
      assessedBy: userId,
    });

    return assessment.save();
  }

  /**
   * جلب التقييمات
   */
  static async getAssessments(filters = {}) {
    const query = { isDeleted: false };
    if (filters.branch) query.branch = filters.branch;
    if (filters.assessmentType) query.assessmentType = filters.assessmentType;
    if (filters.status) query.status = filters.status;

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;

    const [assessments, total] = await Promise.all([
      CBAHICompliance.find(query)
        .sort({ assessmentDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('assessedBy', 'name')
        .select('-standardResults'),
      CBAHICompliance.countDocuments(query),
    ]);

    return { assessments, total, page, pages: Math.ceil(total / limit) };
  }

  /**
   * جلب تقييم واحد مفصل
   */
  static async getAssessmentById(id) {
    return CBAHICompliance.findOne({ _id: id, isDeleted: false })
      .populate('assessedBy reviewedBy', 'name email')
      .populate('standardResults.standard');
  }

  /**
   * تحديث نتيجة معيار واحد في التقييم
   */
  static async updateStandardResult(assessmentId, standardCode, resultData) {
    const assessment = await CBAHICompliance.findById(assessmentId);
    if (!assessment) throw new Error('التقييم غير موجود');

    const idx = assessment.standardResults.findIndex(r => r.standardCode === standardCode);
    if (idx === -1) throw new Error('المعيار غير موجود في التقييم');

    Object.assign(assessment.standardResults[idx], resultData);
    this._recalculateOverallResults(assessment);
    return assessment.save();
  }

  /**
   * إتمام التقييم وحساب النتائج النهائية
   */
  static async completeAssessment(assessmentId, userId) {
    const assessment = await CBAHICompliance.findById(assessmentId);
    if (!assessment) throw new Error('التقييم غير موجود');

    this._recalculateOverallResults(assessment);
    this._calculateChapterResults(assessment);
    assessment.readinessLevel = this._determineReadiness(
      assessment.overallResults.overallComplianceRate
    );
    assessment.status = 'completed';
    assessment.reviewedBy = userId;

    return assessment.save();
  }

  /**
   * لوحة معلومات CBAHI
   */
  static async getCBAHIDashboard(branch) {
    const query = { isDeleted: false };
    if (branch) query.branch = branch;

    // آخر تقييم مكتمل
    const latestAssessment = await CBAHICompliance.findOne({
      ...query,
      status: { $in: ['completed', 'submitted', 'approved'] },
    })
      .sort({ assessmentDate: -1 })
      .lean();

    // عدد التقييمات
    const totalAssessments = await CBAHICompliance.countDocuments(query);

    // الإجراءات التصحيحية المعلقة
    let pendingActions = 0;
    let overdueActions = 0;
    if (latestAssessment) {
      latestAssessment.standardResults.forEach(r => {
        if (r.correctiveAction) {
          if (
            r.correctiveAction.status === 'pending' ||
            r.correctiveAction.status === 'in_progress'
          )
            pendingActions++;
          if (r.correctiveAction.status === 'overdue') overdueActions++;
        }
      });
    }

    // تطور نسبة الامتثال عبر الزمن
    const complianceTrend = await CBAHICompliance.find({
      ...query,
      status: { $in: ['completed', 'submitted', 'approved'] },
    })
      .sort({ assessmentDate: 1 })
      .select('assessmentDate overallResults.overallComplianceRate assessmentType')
      .lean();

    return {
      latestAssessment: latestAssessment
        ? {
            date: latestAssessment.assessmentDate,
            overallScore: latestAssessment.overallResults?.overallScore || 0,
            complianceRate: latestAssessment.overallResults?.overallComplianceRate || 0,
            readinessLevel: latestAssessment.readinessLevel,
          }
        : null,
      totalAssessments,
      pendingActions,
      overdueActions,
      complianceTrend: complianceTrend.map(a => ({
        date: a.assessmentDate,
        rate: a.overallResults?.overallComplianceRate || 0,
        type: a.assessmentType,
      })),
    };
  }

  // ============================================================
  // Private Helpers
  // ============================================================

  static async _generateReportNumber(type) {
    const prefix = {
      monthly_service: 'MSR',
      quarterly_progress: 'QPR',
      annual_comprehensive: 'ACR',
      incident_report: 'INC',
      complaint_response: 'CMP',
      inspection_response: 'INS',
      statistical: 'STA',
      quality_assurance: 'QAR',
    };
    const year = new Date().getFullYear();
    const count = await DisabilityAuthorityReport.countDocuments({
      reportType: type,
      createdAt: { $gte: new Date(`${year}-01-01`) },
    });
    return `${prefix[type] || 'RPT'}-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  static async _collectBeneficiaryStats(branch, startDate, endDate) {
    // Collect from Beneficiary model when available
    try {
      const Beneficiary = require('mongoose').model('Beneficiary');
      const query = {};
      if (branch) query.branch = branch;

      const total = await Beneficiary.countDocuments({ ...query, isDeleted: false });
      const active = await Beneficiary.countDocuments({
        ...query,
        isDeleted: false,
        status: 'active',
      });
      const newEnrollments = await Beneficiary.countDocuments({
        ...query,
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
      });

      return {
        totalRegistered: total,
        activeBeneficiaries: active,
        newEnrollments,
        discharged: 0,
        waitlisted: 0,
        byDisabilityType: [],
        byAgeGroup: [],
        byGender: { male: 0, female: 0 },
        byDisabilityDegree: { mild: 0, moderate: 0, severe: 0, profound: 0 },
      };
    } catch {
      return {
        totalRegistered: 0,
        activeBeneficiaries: 0,
        newEnrollments: 0,
        discharged: 0,
        waitlisted: 0,
        byDisabilityType: [],
        byAgeGroup: [],
        byGender: { male: 0, female: 0 },
        byDisabilityDegree: { mild: 0, moderate: 0, severe: 0, profound: 0 },
      };
    }
  }

  static async _collectServiceStats(branch, startDate, endDate) {
    return {
      totalSessions: 0,
      totalHours: 0,
      byServiceType: [],
      activePlans: 0,
      completedPlans: 0,
      averagePlanDuration: 0,
      assessmentsCompleted: 0,
      averageProgressRate: 0,
    };
  }

  static async _collectStaffStats(branch) {
    return {
      totalStaff: 0,
      bySpecialization: [],
      staffToBeneficiaryRatio: 'N/A',
      trainingHoursTotal: 0,
      turnoverRate: 0,
    };
  }

  static async _collectQualityIndicators(branch, startDate, endDate) {
    return {
      overallSatisfactionRate: 0,
      familySatisfactionRate: 0,
      incidentCount: 0,
      complaintCount: 0,
      complaintResolutionRate: 0,
      safetyComplianceRate: 0,
      documentationComplianceRate: 0,
    };
  }

  static async _collectOutcomeIndicators(branch, startDate, endDate) {
    return {
      goalAchievementRate: 0,
      independenceLevelImprovement: 0,
      communityIntegrationRate: 0,
      employmentPlacementRate: 0,
      academicProgressRate: 0,
      behavioralImprovementRate: 0,
    };
  }

  static _getUpcomingReportDeadlines() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const deadlines = [];

    // شهري – نهاية الشهر الحالي
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);
    deadlines.push({
      type: 'monthly_service',
      label: 'التقرير الشهري',
      deadline: monthEnd,
      daysRemaining: Math.ceil((monthEnd - now) / (1000 * 60 * 60 * 24)),
    });

    // ربع سنوي
    const quarterEnd = new Date(currentYear, Math.ceil((currentMonth + 1) / 3) * 3, 0);
    if (quarterEnd - now < 45 * 24 * 60 * 60 * 1000) {
      deadlines.push({
        type: 'quarterly_progress',
        label: 'التقرير الربع سنوي',
        deadline: quarterEnd,
        daysRemaining: Math.ceil((quarterEnd - now) / (1000 * 60 * 60 * 24)),
      });
    }

    return deadlines;
  }

  static _recalculateOverallResults(assessment) {
    const results = assessment.standardResults;
    let fully = 0,
      partially = 0,
      non = 0,
      na = 0,
      totalScore = 0;
    const applicable = [];

    results.forEach(r => {
      if (r.complianceLevel === 'fully_compliant') {
        fully++;
        applicable.push(r);
      } else if (r.complianceLevel === 'partially_compliant') {
        partially++;
        applicable.push(r);
      } else if (r.complianceLevel === 'non_compliant') {
        non++;
        applicable.push(r);
      } else {
        na++;
      }
      totalScore += r.score || 0;
    });

    const applicableCount = applicable.length || 1;
    assessment.overallResults = {
      totalStandards: results.length,
      fullyCompliant: fully,
      partiallyCompliant: partially,
      nonCompliant: non,
      notApplicable: na,
      overallScore: Math.round(totalScore / applicableCount),
      overallComplianceRate: Math.round((fully / applicableCount) * 100),
    };
  }

  static _calculateChapterResults(assessment) {
    const chapters = {};
    assessment.standardResults.forEach(r => {
      if (!chapters[r.chapter]) {
        chapters[r.chapter] = { total: 0, compliant: 0, scoreSum: 0 };
      }
      chapters[r.chapter].total++;
      if (r.complianceLevel === 'fully_compliant') chapters[r.chapter].compliant++;
      chapters[r.chapter].scoreSum += r.score || 0;
    });

    const chapterNames = {
      leadership_governance: { ar: 'القيادة والحوكمة', en: 'Leadership & Governance' },
      patient_care: { ar: 'رعاية المستفيدين', en: 'Patient Care' },
      safety_management: { ar: 'إدارة السلامة', en: 'Safety Management' },
      infection_control: { ar: 'مكافحة العدوى', en: 'Infection Control' },
      human_resources: { ar: 'الموارد البشرية', en: 'Human Resources' },
      information_management: { ar: 'إدارة المعلومات', en: 'Information Management' },
      quality_improvement: { ar: 'تحسين الجودة', en: 'Quality Improvement' },
      facility_management: { ar: 'إدارة المرافق', en: 'Facility Management' },
      medication_management: { ar: 'إدارة الأدوية', en: 'Medication Management' },
      patient_rights: { ar: 'حقوق المستفيدين', en: 'Patient Rights' },
      education_training: { ar: 'التعليم والتدريب', en: 'Education & Training' },
      rehabilitation_services: { ar: 'خدمات التأهيل', en: 'Rehabilitation Services' },
      support_services: { ar: 'الخدمات المساندة', en: 'Support Services' },
    };

    assessment.chapterResults = Object.entries(chapters).map(([ch, d]) => ({
      chapter: ch,
      chapterName: chapterNames[ch] || { ar: ch, en: ch },
      totalStandards: d.total,
      compliant: d.compliant,
      score: Math.round(d.scoreSum / (d.total || 1)),
    }));
  }

  static _determineReadiness(rate) {
    if (rate >= 90) return 'excellent';
    if (rate >= 75) return 'ready';
    if (rate >= 60) return 'nearly_ready';
    if (rate >= 40) return 'needs_improvement';
    return 'not_ready';
  }

  /**
   * المعايير الافتراضية لـ CBAHI لمراكز التأهيل
   */
  static _getDefaultCBAHIStandards() {
    return [
      // القيادة والحوكمة
      {
        standardCode: 'LG-01',
        chapter: 'leadership_governance',
        title: { ar: 'خطة استراتيجية موثقة', en: 'Documented Strategic Plan' },
        priority: 'essential',
        evidenceRequired: ['الخطة الاستراتيجية', 'محاضر اجتماعات مجلس الإدارة'],
      },
      {
        standardCode: 'LG-02',
        chapter: 'leadership_governance',
        title: { ar: 'هيكل تنظيمي واضح', en: 'Clear Organizational Structure' },
        priority: 'essential',
        evidenceRequired: ['الهيكل التنظيمي', 'الوصف الوظيفي'],
      },
      {
        standardCode: 'LG-03',
        chapter: 'leadership_governance',
        title: { ar: 'سياسات وإجراءات معتمدة', en: 'Approved Policies & Procedures' },
        priority: 'essential',
        evidenceRequired: ['دليل السياسات', 'سجل التحديثات'],
      },
      {
        standardCode: 'LG-04',
        chapter: 'leadership_governance',
        title: { ar: 'برنامج إدارة المخاطر', en: 'Risk Management Program' },
        priority: 'important',
        evidenceRequired: ['سجل المخاطر', 'خطط التخفيف'],
      },

      // رعاية المستفيدين
      {
        standardCode: 'PC-01',
        chapter: 'patient_care',
        title: { ar: 'تقييم شامل عند القبول', en: 'Comprehensive Assessment at Admission' },
        priority: 'essential',
        evidenceRequired: ['نموذج التقييم', 'عينة ملفات'],
      },
      {
        standardCode: 'PC-02',
        chapter: 'patient_care',
        title: { ar: 'خطة تأهيلية فردية', en: 'Individual Rehabilitation Plan' },
        priority: 'essential',
        evidenceRequired: ['نماذج IRP', 'مراجعات دورية'],
      },
      {
        standardCode: 'PC-03',
        chapter: 'patient_care',
        title: { ar: 'فريق متعدد التخصصات', en: 'Multidisciplinary Team' },
        priority: 'essential',
        evidenceRequired: ['محاضر اجتماعات الفريق', 'قائمة الأعضاء'],
      },
      {
        standardCode: 'PC-04',
        chapter: 'patient_care',
        title: { ar: 'الموافقة المستنيرة', en: 'Informed Consent' },
        priority: 'essential',
        evidenceRequired: ['نماذج الموافقة', 'سجل التوقيعات'],
      },
      {
        standardCode: 'PC-05',
        chapter: 'patient_care',
        title: { ar: 'متابعة التقدم الدورية', en: 'Regular Progress Monitoring' },
        priority: 'important',
        evidenceRequired: ['تقارير التقدم', 'مقاييس الأداء'],
      },

      // إدارة السلامة
      {
        standardCode: 'SM-01',
        chapter: 'safety_management',
        title: { ar: 'برنامج السلامة والأمان', en: 'Safety & Security Program' },
        priority: 'essential',
        evidenceRequired: ['خطة السلامة', 'تقارير الحوادث'],
      },
      {
        standardCode: 'SM-02',
        chapter: 'safety_management',
        title: { ar: 'خطة الإخلاء والطوارئ', en: 'Emergency & Evacuation Plan' },
        priority: 'essential',
        evidenceRequired: ['خطة الإخلاء', 'سجل التدريبات'],
      },
      {
        standardCode: 'SM-03',
        chapter: 'safety_management',
        title: { ar: 'معدات السلامة والتجهيزات', en: 'Safety Equipment' },
        priority: 'essential',
        evidenceRequired: ['قائمة المعدات', 'سجل الصيانة'],
      },

      // مكافحة العدوى
      {
        standardCode: 'IC-01',
        chapter: 'infection_control',
        title: { ar: 'برنامج مكافحة العدوى', en: 'Infection Control Program' },
        priority: 'essential',
        evidenceRequired: ['السياسة', 'سجل الرصد'],
      },
      {
        standardCode: 'IC-02',
        chapter: 'infection_control',
        title: { ar: 'نظافة الأيدي', en: 'Hand Hygiene' },
        priority: 'essential',
        evidenceRequired: ['بروتوكول نظافة الأيدي', 'نتائج المراقبة'],
      },

      // الموارد البشرية
      {
        standardCode: 'HR-01',
        chapter: 'human_resources',
        title: { ar: 'ملفات الموظفين مكتملة', en: 'Complete Staff Files' },
        priority: 'essential',
        evidenceRequired: ['قائمة الملفات', 'عينة ملفات'],
      },
      {
        standardCode: 'HR-02',
        chapter: 'human_resources',
        title: { ar: 'برنامج التدريب والتطوير', en: 'Training & Development Program' },
        priority: 'important',
        evidenceRequired: ['خطة التدريب', 'سجل الحضور'],
      },
      {
        standardCode: 'HR-03',
        chapter: 'human_resources',
        title: { ar: 'تقييم الأداء الدوري', en: 'Regular Performance Evaluation' },
        priority: 'important',
        evidenceRequired: ['نماذج التقييم', 'جدول التقييم'],
      },

      // إدارة المعلومات
      {
        standardCode: 'IM-01',
        chapter: 'information_management',
        title: { ar: 'نظام السجلات الإلكترونية', en: 'Electronic Records System' },
        priority: 'important',
        evidenceRequired: ['وصف النظام', 'خطة الأمن'],
      },
      {
        standardCode: 'IM-02',
        chapter: 'information_management',
        title: { ar: 'سرية المعلومات', en: 'Information Confidentiality' },
        priority: 'essential',
        evidenceRequired: ['سياسة السرية', 'تعهدات الموظفين'],
      },

      // تحسين الجودة
      {
        standardCode: 'QI-01',
        chapter: 'quality_improvement',
        title: { ar: 'برنامج تحسين الجودة', en: 'Quality Improvement Program' },
        priority: 'essential',
        evidenceRequired: ['خطة الجودة', 'مؤشرات الأداء'],
      },
      {
        standardCode: 'QI-02',
        chapter: 'quality_improvement',
        title: { ar: 'رضا المستفيدين والأسر', en: 'Beneficiary & Family Satisfaction' },
        priority: 'important',
        evidenceRequired: ['نتائج الاستبيانات', 'خطط التحسين'],
      },

      // حقوق المستفيدين
      {
        standardCode: 'PR-01',
        chapter: 'patient_rights',
        title: { ar: 'ميثاق حقوق المستفيدين', en: 'Patient Rights Charter' },
        priority: 'essential',
        evidenceRequired: ['الميثاق المعلق', 'آلية الشكاوى'],
      },
      {
        standardCode: 'PR-02',
        chapter: 'patient_rights',
        title: { ar: 'الخصوصية والكرامة', en: 'Privacy & Dignity' },
        priority: 'essential',
        evidenceRequired: ['سياسة الخصوصية', 'تقارير المراقبة'],
      },

      // خدمات التأهيل
      {
        standardCode: 'RS-01',
        chapter: 'rehabilitation_services',
        title: { ar: 'برامج التأهيل المتخصصة', en: 'Specialized Rehabilitation Programs' },
        priority: 'essential',
        evidenceRequired: ['وصف البرامج', 'نتائج التقييم'],
      },
      {
        standardCode: 'RS-02',
        chapter: 'rehabilitation_services',
        title: { ar: 'التقنيات المساعدة', en: 'Assistive Technology' },
        priority: 'important',
        evidenceRequired: ['قائمة المعدات', 'سجل الاستخدام'],
      },
      {
        standardCode: 'RS-03',
        chapter: 'rehabilitation_services',
        title: { ar: 'إشراك الأسرة', en: 'Family Involvement' },
        priority: 'important',
        evidenceRequired: ['سجل المشاركة', 'برامج التوعية'],
      },

      // إدارة المرافق
      {
        standardCode: 'FM-01',
        chapter: 'facility_management',
        title: { ar: 'إمكانية الوصول لذوي الإعاقة', en: 'Disability Accessibility' },
        priority: 'essential',
        evidenceRequired: ['تقرير إمكانية الوصول', 'خطة التحسين'],
      },
      {
        standardCode: 'FM-02',
        chapter: 'facility_management',
        title: { ar: 'الصيانة الوقائية', en: 'Preventive Maintenance' },
        priority: 'important',
        evidenceRequired: ['جدول الصيانة', 'سجل التنفيذ'],
      },
    ];
  }
}

module.exports = DisabilityAuthorityService;
