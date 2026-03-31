/**
 * CARF Accreditation Service - وحدة اعتماد CARF
 * Commission on Accreditation of Rehabilitation Facilities
 * تدير متطلبات الاعتماد الدولي لمرافق التأهيل
 */

const mongoose = require('mongoose');

// ============================================================
// CARF Standards Schema
// ============================================================
const CARFStandardSchema = new mongoose.Schema(
  {
    standardCode: { type: String, required: true, unique: true },
    section: {
      type: String,
      enum: [
        'A_leadership', // القيادة
        'B_strategic_planning', // التخطيط الاستراتيجي
        'C_input_from_persons_served', // مدخلات المستفيدين
        'D_human_resources', // الموارد البشرية
        'E_technology_resources', // الموارد التقنية
        'F_financial_planning', // التخطيط المالي
        'G_risk_management', // إدارة المخاطر
        'H_rights_of_persons_served', // حقوق المستفيدين
        'I_service_delivery', // تقديم الخدمة
        'J_outcomes', // النتائج
        'K_comprehensive_rehabilitation', // التأهيل الشامل
      ],
      required: true,
    },
    sectionTitle: { type: String },
    standardTitle: { type: String, required: true },
    standardTitleAr: { type: String },
    description: { type: String },
    descriptionAr: { type: String },
    evidenceRequired: [{ type: String }], // الأدلة المطلوبة
    scoringMethod: {
      type: String,
      enum: ['met_not_met', 'partial_credit', 'narrative'],
      default: 'met_not_met',
    },
    weight: { type: Number, default: 1 }, // الوزن في الحساب الإجمالي
    isMandatory: { type: Boolean, default: true },
    applicablePrograms: [{ type: String }], // برامج التطبيق
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ============================================================
// CARF Assessment Schema
// ============================================================
const CARFAssessmentSchema = new mongoose.Schema(
  {
    assessmentId: { type: String, required: true, unique: true },
    organizationId: { type: String },
    assessmentType: {
      type: String,
      enum: ['self_study', 'pre_survey', 'survey', 'follow_up', 'annual_review'],
      required: true,
    },
    assessmentYear: { type: Number, default: () => new Date().getFullYear() },
    programType: {
      type: String,
      enum: [
        'comprehensive_rehab', // التأهيل الشامل
        'medical_rehab', // التأهيل الطبي
        'vocational', // التأهيل المهني
        'behavioral_health', // الصحة النفسية والسلوكية
        'child_youth', // الأطفال والشباب
        'aging_services', // خدمات كبار السن
        'employment', // التوظيف
      ],
    },
    conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    standards: [
      {
        standardCode: { type: String },
        status: {
          type: String,
          enum: ['met', 'partial', 'not_met', 'not_applicable', 'not_reviewed'],
          default: 'not_reviewed',
        },
        score: { type: Number, min: 0, max: 100 },
        evidence: [{ type: String }], // الأدلة المقدمة
        notes: { type: String },
        actionRequired: { type: String },
        targetDate: { type: Date },
        responsiblePerson: { type: String },
        verifiedBy: { type: String },
        verificationDate: { type: Date },
      },
    ],
    overallCompliance: { type: Number, min: 0, max: 100, default: 0 },
    accreditationStatus: {
      type: String,
      enum: [
        'not_submitted',
        'under_review',
        'accredited',
        'provisional',
        'not_accredited',
        'expired',
      ],
      default: 'not_submitted',
    },
    accreditationDate: { type: Date },
    expiryDate: { type: Date },
    surveyorNotes: { type: String },
    correctionPlan: { type: String },
    strengths: [{ type: String }],
    areasForImprovement: [{ type: String }],
    conditions: [{ type: String }], // شروط الاعتماد
    status: {
      type: String,
      enum: ['draft', 'in_progress', 'submitted', 'completed'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

// ============================================================
// CARF Action Plan Schema
// ============================================================
const CARFActionPlanSchema = new mongoose.Schema(
  {
    planId: { type: String, required: true, unique: true },
    assessmentId: { type: String, required: true },
    standardCode: { type: String },
    issue: { type: String, required: true },
    rootCause: { type: String },
    action: { type: String, required: true },
    responsiblePerson: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    targetDate: { type: Date },
    completedDate: { type: Date },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'completed', 'overdue', 'cancelled'],
      default: 'open',
    },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    evidence: [{ type: String }],
    verificationNotes: { type: String },
  },
  { timestamps: true }
);

const CARFStandard = mongoose.model('CARFStandard', CARFStandardSchema);
const CARFAssessment = mongoose.model('CARFAssessment', CARFAssessmentSchema);
const CARFActionPlan = mongoose.model('CARFActionPlan', CARFActionPlanSchema);

// ============================================================
// معايير CARF الأساسية - Core Standards
// ============================================================
const CARF_CORE_STANDARDS = [
  // ===== Section A: Leadership =====
  {
    standardCode: 'A1.a',
    section: 'A_leadership',
    sectionTitle: 'القيادة',
    standardTitle: 'Governance',
    standardTitleAr: 'الحوكمة',
    descriptionAr: 'تمتلك المنظمة هيكل حوكمة واضح مع سياسات ومسؤوليات محددة',
    evidenceRequired: ['وثيقة هيكل الحوكمة', 'محاضر اجتماعات مجلس الإدارة', 'السياسات والإجراءات'],
    weight: 3,
    isMandatory: true,
  },
  {
    standardCode: 'A2.a',
    section: 'A_leadership',
    sectionTitle: 'القيادة',
    standardTitle: 'Ethical Practices',
    standardTitleAr: 'الممارسات الأخلاقية',
    descriptionAr: 'توجد سياسة واضحة للممارسات الأخلاقية وتتبعها المنظمة',
    evidenceRequired: [
      'ميثاق الأخلاقيات',
      'برامج التدريب على الأخلاقيات',
      'آلية الإبلاغ عن المخالفات',
    ],
    weight: 3,
    isMandatory: true,
  },
  {
    standardCode: 'A3.a',
    section: 'A_leadership',
    sectionTitle: 'القيادة',
    standardTitle: 'Leadership Direction',
    standardTitleAr: 'توجيه القيادة',
    descriptionAr: 'توفر القيادة رؤية واضحة وتوجيهاً لتحقيق الأهداف المؤسسية',
    evidenceRequired: ['الرؤية والرسالة', 'الخطة الاستراتيجية', 'تقارير الأداء'],
    weight: 2,
  },

  // ===== Section B: Strategic Planning =====
  {
    standardCode: 'B1.a',
    section: 'B_strategic_planning',
    sectionTitle: 'التخطيط الاستراتيجي',
    standardTitle: 'Strategic Plan',
    standardTitleAr: 'الخطة الاستراتيجية',
    descriptionAr: 'توجد خطة استراتيجية موثقة ومحدّثة تشمل أهدافاً قابلة للقياس',
    evidenceRequired: ['الخطة الاستراتيجية الحالية', 'تقارير متابعة التنفيذ', 'مؤشرات الأداء'],
    weight: 3,
    isMandatory: true,
  },
  {
    standardCode: 'B2.a',
    section: 'B_strategic_planning',
    sectionTitle: 'التخطيط الاستراتيجي',
    standardTitle: 'Performance Improvement',
    standardTitleAr: 'تحسين الأداء',
    descriptionAr: 'نظام شامل لتحسين الأداء مع آليات منتظمة للمراجعة والتحسين',
    evidenceRequired: ['خطة تحسين الأداء', 'بيانات مؤشرات الجودة', 'محاضر اجتماعات مراجعة الجودة'],
    weight: 3,
    isMandatory: true,
  },

  // ===== Section C: Input from Persons Served =====
  {
    standardCode: 'C1.a',
    section: 'C_input_from_persons_served',
    sectionTitle: 'مدخلات المستفيدين',
    standardTitle: 'Satisfaction Surveys',
    standardTitleAr: 'استطلاعات رضا المستفيدين',
    descriptionAr: 'تجري المنظمة استطلاعات رضا منتظمة وتوظف نتائجها في التحسين',
    evidenceRequired: ['نماذج الاستطلاع', 'نتائج الاستطلاعات', 'خطط التحسين المبنية على النتائج'],
    weight: 2,
    isMandatory: true,
  },
  {
    standardCode: 'C2.a',
    section: 'C_input_from_persons_served',
    sectionTitle: 'مدخلات المستفيدين',
    standardTitle: 'Grievance Procedures',
    standardTitleAr: 'إجراءات الشكاوى',
    descriptionAr: 'آلية واضحة وسهلة لتقديم الشكاوى والمقترحات ومتابعة الحل',
    evidenceRequired: ['نظام الشكاوى', 'سجلات الشكاوى', 'نسبة الحل والوقت المستغرق'],
    weight: 2,
    isMandatory: true,
  },

  // ===== Section D: Human Resources =====
  {
    standardCode: 'D1.a',
    section: 'D_human_resources',
    sectionTitle: 'الموارد البشرية',
    standardTitle: 'Personnel Qualifications',
    standardTitleAr: 'مؤهلات الموظفين',
    descriptionAr: 'يمتلك جميع الموظفين المؤهلات والتراخيص المطلوبة لمناصبهم',
    evidenceRequired: ['ملفات الموظفين', 'الشهادات والتراخيص', 'سجلات التطوير المهني المستمر'],
    weight: 4,
    isMandatory: true,
  },
  {
    standardCode: 'D2.a',
    section: 'D_human_resources',
    sectionTitle: 'الموارد البشرية',
    standardTitle: 'Staff Training',
    standardTitleAr: 'تدريب الموظفين',
    descriptionAr: 'برنامج تدريب منهجي للموظفين الجدد والمستمر للجميع',
    evidenceRequired: ['خطة التدريب السنوية', 'سجلات التدريب', 'تقييمات الكفاءة'],
    weight: 3,
    isMandatory: true,
  },
  {
    standardCode: 'D3.a',
    section: 'D_human_resources',
    sectionTitle: 'الموارد البشرية',
    standardTitle: 'Supervision',
    standardTitleAr: 'الإشراف',
    descriptionAr: 'نظام إشراف منتظم ومنظم لضمان جودة تقديم الخدمة',
    evidenceRequired: ['هيكل الإشراف', 'سجلات جلسات الإشراف', 'تقييمات الأداء'],
    weight: 3,
  },

  // ===== Section H: Rights of Persons Served =====
  {
    standardCode: 'H1.a',
    section: 'H_rights_of_persons_served',
    sectionTitle: 'حقوق المستفيدين',
    standardTitle: 'Rights and Responsibilities',
    standardTitleAr: 'الحقوق والمسؤوليات',
    descriptionAr: 'توثيق واضح لحقوق ومسؤوليات المستفيدين ويطّلع عليها',
    evidenceRequired: ['وثيقة حقوق المستفيد', 'آلية التبليغ عن الانتهاكات', 'محاضر مراجعة الحقوق'],
    weight: 4,
    isMandatory: true,
  },
  {
    standardCode: 'H2.a',
    section: 'H_rights_of_persons_served',
    sectionTitle: 'حقوق المستفيدين',
    standardTitle: 'Informed Consent',
    standardTitleAr: 'الموافقة المستنيرة',
    descriptionAr: 'الحصول على موافقة مستنيرة مكتوبة قبل تقديم أي خدمة',
    evidenceRequired: [
      'نماذج الموافقة المستنيرة',
      'توثيق الحصول على الموافقة',
      'سياسة المعلومات السرية',
    ],
    weight: 4,
    isMandatory: true,
  },
  {
    standardCode: 'H3.a',
    section: 'H_rights_of_persons_served',
    sectionTitle: 'حقوق المستفيدين',
    standardTitle: 'Confidentiality',
    standardTitleAr: 'السرية وخصوصية المعلومات',
    descriptionAr: 'سياسة شاملة لحماية سرية معلومات المستفيدين',
    evidenceRequired: ['سياسة السرية', 'اتفاقيات عدم الإفصاح', 'سجلات التدريب على السرية'],
    weight: 3,
    isMandatory: true,
  },

  // ===== Section I: Service Delivery =====
  {
    standardCode: 'I1.a',
    section: 'I_service_delivery',
    sectionTitle: 'تقديم الخدمة',
    standardTitle: 'Individualized Service Planning',
    standardTitleAr: 'التخطيط الفردي للخدمة',
    descriptionAr: 'كل مستفيد لديه خطة خدمة فردية موثقة ومبنية على التقييم الشامل',
    evidenceRequired: [
      'نماذج خطة الخدمة الفردية',
      'عينة من ملفات المستفيدين',
      'سجلات المراجعات الدورية',
    ],
    weight: 5,
    isMandatory: true,
  },
  {
    standardCode: 'I2.a',
    section: 'I_service_delivery',
    sectionTitle: 'تقديم الخدمة',
    standardTitle: 'Assessment',
    standardTitleAr: 'التقييم',
    descriptionAr: 'إجراء تقييم شامل ومنهجي لكل مستفيد قبل تقديم الخدمة وبشكل دوري',
    evidenceRequired: ['أدوات التقييم المعتمدة', 'تقارير التقييم', 'سجلات التقييم الدوري'],
    weight: 5,
    isMandatory: true,
  },
  {
    standardCode: 'I3.a',
    section: 'I_service_delivery',
    sectionTitle: 'تقديم الخدمة',
    standardTitle: 'Interdisciplinary Team',
    standardTitleAr: 'فريق متعدد التخصصات',
    descriptionAr: 'العمل بنهج الفريق متعدد التخصصات لتحقيق النتائج المثلى',
    evidenceRequired: ['هيكل الفريق', 'محاضر اجتماعات الفريق', 'توثيق القرارات المشتركة'],
    weight: 3,
  },
  {
    standardCode: 'I4.a',
    section: 'I_service_delivery',
    sectionTitle: 'تقديم الخدمة',
    standardTitle: 'Transition Planning',
    standardTitleAr: 'التخطيط الانتقالي',
    descriptionAr: 'تخطيط انتقالي منظم عند إنهاء الخدمة أو الانتقال لمستوى آخر',
    evidenceRequired: ['نماذج التخطيط الانتقالي', 'خطط الانتقال الموثقة', 'متابعة ما بعد الانتهاء'],
    weight: 3,
  },

  // ===== Section J: Outcomes =====
  {
    standardCode: 'J1.a',
    section: 'J_outcomes',
    sectionTitle: 'النتائج',
    standardTitle: 'Outcomes Measurement',
    standardTitleAr: 'قياس النتائج',
    descriptionAr: 'نظام شامل لقياس وتتبع نتائج الخدمة للمستفيدين',
    evidenceRequired: ['أدوات قياس النتائج', 'بيانات النتائج', 'تقارير التحليل'],
    weight: 4,
    isMandatory: true,
  },
  {
    standardCode: 'J2.a',
    section: 'J_outcomes',
    sectionTitle: 'النتائج',
    standardTitle: 'Goal Achievement',
    standardTitleAr: 'تحقيق الأهداف',
    descriptionAr: 'مراقبة ومتابعة تحقيق أهداف المستفيدين وتوظيف البيانات في التحسين',
    evidenceRequired: ['نسب تحقيق الأهداف', 'تقارير التقدم', 'خطط التعديل'],
    weight: 3,
    isMandatory: true,
  },

  // ===== Section K: Comprehensive Rehabilitation =====
  {
    standardCode: 'K1.a',
    section: 'K_comprehensive_rehabilitation',
    sectionTitle: 'التأهيل الشامل',
    standardTitle: 'Rehabilitation Programs',
    standardTitleAr: 'برامج التأهيل',
    descriptionAr: 'تقديم برامج تأهيل شاملة تلبي احتياجات المستفيدين المتنوعة',
    evidenceRequired: ['دليل البرامج', 'معايير التأهيل', 'نتائج البرامج'],
    weight: 4,
    isMandatory: true,
  },
  {
    standardCode: 'K2.a',
    section: 'K_comprehensive_rehabilitation',
    sectionTitle: 'التأهيل الشامل',
    standardTitle: 'Family and Caregiver Involvement',
    standardTitleAr: 'إشراك الأسرة ومقدمي الرعاية',
    descriptionAr: 'إشراك فعّال للأسرة في عملية التأهيل والتخطيط والتقييم',
    evidenceRequired: ['برامج تثقيف الأسرة', 'سجلات مشاركة الأسرة', 'تقييمات رضا الأسرة'],
    weight: 3,
    isMandatory: true,
  },
  {
    standardCode: 'K3.a',
    section: 'K_comprehensive_rehabilitation',
    sectionTitle: 'التأهيل الشامل',
    standardTitle: 'Community Integration',
    standardTitleAr: 'الاندماج المجتمعي',
    descriptionAr: 'برامج وجهود لتعزيز اندماج المستفيدين في المجتمع',
    evidenceRequired: ['برامج الاندماج المجتمعي', 'نتائج الاندماج', 'الشراكات المجتمعية'],
    weight: 2,
  },
];

// ============================================================
// CARFAccreditationService الخدمة الرئيسية
// ============================================================
class CARFAccreditationService {
  /**
   * تهيئة معايير CARF الافتراضية
   */
  async seedCARFStandards() {
    try {
      const count = await CARFStandard.countDocuments();
      if (count > 0) return { success: true, message: `المعايير موجودة مسبقاً (${count})`, count };
      await CARFStandard.insertMany(CARF_CORE_STANDARDS);
      const total = await CARFStandard.countDocuments();
      return {
        success: true,
        message: 'تم تهيئة معايير CARF',
        count: total,
        sections: [...new Set(CARF_CORE_STANDARDS.map(s => s.section))].length,
      };
    } catch (error) {
      throw new Error(`خطأ في تهيئة معايير CARF: ${error.message}`);
    }
  }

  /**
   * إنشاء تقييم CARF جديد
   */
  async createAssessment({ assessmentType, programType, conductedBy, organizationId }) {
    const assessmentId = `CARF-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const standards = await CARFStandard.find({ isActive: true });

    const standardsData = standards.map(s => ({
      standardCode: s.standardCode,
      status: 'not_reviewed',
      score: 0,
      evidence: [],
    }));

    const assessment = new CARFAssessment({
      assessmentId,
      assessmentType,
      programType,
      conductedBy,
      organizationId,
      standards: standardsData,
      assessmentYear: new Date().getFullYear(),
    });

    await assessment.save();
    return {
      success: true,
      data: assessment,
      message: 'تم إنشاء تقييم CARF بنجاح',
      totalStandards: standardsData.length,
    };
  }

  /**
   * تحديث حالة معيار محدد
   */
  async updateStandardStatus(
    assessmentId,
    standardCode,
    { status, score, evidence, notes, actionRequired, targetDate, responsiblePerson }
  ) {
    const assessment = await CARFAssessment.findOne({ assessmentId });
    if (!assessment) throw new Error('التقييم غير موجود');

    const stdIndex = assessment.standards.findIndex(s => s.standardCode === standardCode);
    if (stdIndex === -1) throw new Error(`المعيار ${standardCode} غير موجود في التقييم`);

    assessment.standards[stdIndex] = {
      ...assessment.standards[stdIndex],
      status,
      score: score || this._statusToScore(status),
      evidence: evidence || [],
      notes,
      actionRequired,
      targetDate,
      responsiblePerson,
    };

    // إعادة احتساب الامتثال الإجمالي
    assessment.overallCompliance = this._calculateOverallCompliance(assessment.standards);
    await assessment.save();

    return {
      success: true,
      standardCode,
      status,
      overallCompliance: assessment.overallCompliance,
    };
  }

  /**
   * احتساب ومراجعة الامتثال الإجمالي
   */
  async calculateCompliance(assessmentId) {
    const assessment = await CARFAssessment.findOne({ assessmentId });
    if (!assessment) throw new Error('التقييم غير موجود');

    const compliance = this._calculateOverallCompliance(assessment.standards);
    const sectionBreakdown = await this._getSectionBreakdown(assessment.standards);
    const accreditationStatus = this._determineAccreditationStatus(
      compliance,
      assessment.standards
    );

    assessment.overallCompliance = compliance;
    assessment.accreditationStatus = accreditationStatus;
    await assessment.save();

    return {
      success: true,
      overallCompliance: compliance,
      accreditationStatus,
      sectionBreakdown,
      mandatoryStandardsMet: this._checkMandatoryStandards(assessment.standards),
      recommendations: this._generateRecommendations(assessment.standards, compliance),
    };
  }

  /**
   * إنشاء خطة تصحيحية
   */
  async createActionPlan(assessmentId, actionItems) {
    const plans = [];
    for (const item of actionItems) {
      const planId = `AP-${assessmentId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const plan = new CARFActionPlan({ planId, assessmentId, ...item });
      await plan.save();
      plans.push(plan);
    }
    return { success: true, data: plans, count: plans.length };
  }

  /**
   * الحصول على تقرير امتثال شامل
   */
  async getComplianceReport(assessmentId) {
    const assessment = await CARFAssessment.findOne({ assessmentId }).populate(
      'conductedBy',
      'name'
    );
    if (!assessment) throw new Error('التقييم غير موجود');

    const actionPlans = await CARFActionPlan.find({
      assessmentId,
      status: { $ne: 'cancelled' },
    });
    const standards = await CARFStandard.find({ isActive: true });

    const enrichedStandards = assessment.standards.map(s => {
      const std = standards.find(st => st.standardCode === s.standardCode);
      return {
        ...s.toObject(),
        standardTitle: std?.standardTitle,
        standardTitleAr: std?.standardTitleAr,
        section: std?.section,
        sectionTitle: std?.sectionTitle,
        isMandatory: std?.isMandatory,
        evidenceRequired: std?.evidenceRequired,
        weight: std?.weight,
      };
    });

    const sectionBreakdown = await this._getSectionBreakdown(assessment.standards);

    return {
      success: true,
      data: {
        assessmentId,
        assessmentType: assessment.assessmentType,
        programType: assessment.programType,
        assessmentYear: assessment.assessmentYear,
        overallCompliance: assessment.overallCompliance,
        accreditationStatus: assessment.accreditationStatus,
        standards: enrichedStandards,
        sectionBreakdown,
        actionPlans: actionPlans.length,
        pendingActions: actionPlans.filter(ap => ap.status !== 'completed').length,
        strengths: assessment.strengths,
        areasForImprovement: assessment.areasForImprovement,
        conditions: assessment.conditions,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * الحصول على لوحة متابعة CARF
   */
  async getDashboard(year) {
    const targetYear = year || new Date().getFullYear();
    const assessments = await CARFAssessment.find({ assessmentYear: targetYear });

    const latest = assessments.sort((a, b) => b.createdAt - a.createdAt)[0];

    const sectionStats = {};
    if (latest) {
      const standards = await CARFStandard.find({ isActive: true });
      const sectionMap = {};
      standards.forEach(s => {
        if (!sectionMap[s.section]) sectionMap[s.section] = [];
        sectionMap[s.section].push(s.standardCode);
      });

      for (const [section, codes] of Object.entries(sectionMap)) {
        const sectionStandards = latest.standards.filter(s => codes.includes(s.standardCode));
        const met = sectionStandards.filter(s => s.status === 'met').length;
        sectionStats[section] = {
          total: sectionStandards.length,
          met,
          compliance:
            sectionStandards.length > 0 ? Math.round((met / sectionStandards.length) * 100) : 0,
        };
      }
    }

    const actionPlans = await CARFActionPlan.find({
      assessmentId: latest?.assessmentId,
      status: { $ne: 'cancelled' },
    });

    return {
      success: true,
      data: {
        year: targetYear,
        totalAssessments: assessments.length,
        latestAssessment: latest
          ? {
              assessmentId: latest.assessmentId,
              overallCompliance: latest.overallCompliance,
              accreditationStatus: latest.accreditationStatus,
              lastUpdated: latest.updatedAt,
            }
          : null,
        sectionStats,
        actionPlans: {
          total: actionPlans.length,
          open: actionPlans.filter(ap => ap.status === 'open').length,
          inProgress: actionPlans.filter(ap => ap.status === 'in_progress').length,
          completed: actionPlans.filter(ap => ap.status === 'completed').length,
          overdue: actionPlans.filter(ap => ap.status === 'overdue').length,
        },
        complianceTarget: 85,
        isAccredited: latest?.accreditationStatus === 'accredited',
      },
    };
  }

  /**
   * استرجاع معايير CARF
   */
  async getStandards({ section, isMandatory } = {}) {
    const query = { isActive: true };
    if (section) query.section = section;
    if (isMandatory !== undefined) query.isMandatory = isMandatory;
    const standards = await CARFStandard.find(query).sort({ section: 1, standardCode: 1 });
    return {
      success: true,
      data: standards,
      count: standards.length,
      sections: [...new Set(standards.map(s => s.section))],
    };
  }

  /**
   * تحديث خطة عمل
   */
  async updateActionPlan(planId, updates) {
    const plan = await CARFActionPlan.findOneAndUpdate({ planId }, updates, {
      new: true,
      runValidators: true,
    });
    if (!plan) throw new Error(`خطة العمل ${planId} غير موجودة`);
    return { success: true, data: plan };
  }

  // ============================================================
  // دوال مساعدة خاصة
  // ============================================================
  _statusToScore(status) {
    const scoreMap = { met: 100, partial: 50, not_met: 0, not_applicable: null, not_reviewed: 0 };
    return scoreMap[status] || 0;
  }

  _calculateOverallCompliance(standards) {
    const reviewed = standards.filter(
      s => s.status !== 'not_reviewed' && s.status !== 'not_applicable'
    );
    if (reviewed.length === 0) return 0;
    const met = reviewed.filter(s => s.status === 'met').length;
    const partial = reviewed.filter(s => s.status === 'partial').length;
    const score = (met * 100 + partial * 50) / reviewed.length;
    return Math.round(score);
  }

  async _getSectionBreakdown(standards) {
    const allStandards = await CARFStandard.find({ isActive: true });
    const sectionMap = {};

    allStandards.forEach(s => {
      if (!sectionMap[s.section]) {
        sectionMap[s.section] = { title: s.sectionTitle, total: 0, met: 0, partial: 0, notMet: 0 };
      }
      sectionMap[s.section].total++;
      const assessed = standards.find(as => as.standardCode === s.standardCode);
      if (assessed?.status === 'met') sectionMap[s.section].met++;
      else if (assessed?.status === 'partial') sectionMap[s.section].partial++;
      else if (assessed?.status === 'not_met') sectionMap[s.section].notMet++;
    });

    return Object.entries(sectionMap).map(([section, data]) => ({
      section,
      ...data,
      compliance:
        data.total > 0 ? Math.round((data.met * 100 + data.partial * 50) / data.total) : 0,
    }));
  }

  _checkMandatoryStandards(standards) {
    const mandatoryCodes = CARF_CORE_STANDARDS.filter(s => s.isMandatory).map(s => s.standardCode);
    const mandatoryAssessed = standards.filter(s => mandatoryCodes.includes(s.standardCode));
    const allMet = mandatoryAssessed.every(s => s.status === 'met');
    const notMet = mandatoryAssessed.filter(
      s => s.status === 'not_met' || s.status === 'not_reviewed'
    );
    return { allMet, notMetCount: notMet.length, notMetCodes: notMet.map(s => s.standardCode) };
  }

  _determineAccreditationStatus(compliance, standards) {
    const mandatoryCheck = this._checkMandatoryStandards(standards);
    if (!mandatoryCheck.allMet) return 'not_accredited';
    if (compliance >= 90) return 'accredited';
    if (compliance >= 75) return 'provisional';
    return 'not_accredited';
  }

  _generateRecommendations(standards, compliance) {
    const recs = [];
    const notMet = standards.filter(s => s.status === 'not_met');
    const partial = standards.filter(s => s.status === 'partial');

    if (compliance < 90)
      recs.push(`رفع نسبة الامتثال من ${compliance}% إلى 90%+ لنيل الاعتماد الكامل`);
    if (notMet.length > 0) recs.push(`معالجة ${notMet.length} معيار غير مستوفى بشكل عاجل`);
    if (partial.length > 0) recs.push(`استكمال ${partial.length} معيار مستوفى جزئياً`);

    const mandatoryCheck = this._checkMandatoryStandards(standards);
    if (!mandatoryCheck.allMet) {
      recs.push(`استيفاء المعايير الإلزامية بالكامل: ${mandatoryCheck.notMetCodes.join(', ')}`);
    }

    return recs;
  }
}

module.exports = new CARFAccreditationService();
module.exports.CARFAccreditationService = CARFAccreditationService;
module.exports.CARFStandard = CARFStandard;
module.exports.CARFAssessment = CARFAssessment;
module.exports.CARFActionPlan = CARFActionPlan;
module.exports.CARF_CORE_STANDARDS = CARF_CORE_STANDARDS;
