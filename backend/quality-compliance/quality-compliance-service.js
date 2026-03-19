/* eslint-disable no-unused-vars */
/**
 * نظام الجودة والامتثال
 * Quality & Compliance Service
 *
 * يتضمن:
 * - إدارة معايير الاعتماد (CBAHI, JCI, ISO)
 * - مؤشرات الجودة
 * - إدارة التدقيقات
 * - إدارة الحوادث
 * - الامتثال للسياسات والإجراءات
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const logger = require('../utils/logger');

// ============================================
// النماذج (Models)
// ============================================

// نموذج معيار الجودة
const qualityIndicatorSchema = new Schema(
  {
    code: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    nameAr: { type: String, required: true },

    category: {
      type: {
        type: String,
        enum: ['clinical', 'administrative', 'safety', 'satisfaction', 'operational'],
      },
      required: true,
    },

    description: String,
    descriptionAr: String,

    // القياس
    measurement: {
      type: { type: String, enum: ['percentage', 'count', 'ratio', 'score', 'time'] },
      unit: String,
      frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annually'] },
    },

    // الأهداف
    targets: {
      minimum: Number,
      target: Number,
      excellent: Number,
      benchmarkSource: String,
    },

    // صيغة الحساب
    formula: {
      numerator: String,
      denominator: String,
      calculation: String,
    },

    // مصدر البيانات
    dataSource: {
      system: String,
      report: String,
      collection: String,
    },

    // الحالة
    status: { type: String, enum: ['active', 'inactive', 'under_review'], default: 'active' },

    // الربط بمعايير الاعتماد
    accreditationMapping: [
      {
        standard: { type: String, enum: ['CBAHI', 'JCI', 'ISO', 'MOH'] },
        chapter: String,
        standardNumber: String,
        requirement: String,
      },
    ],

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// نموذج قياس المؤشر
const indicatorMeasurementSchema = new Schema(
  {
    indicatorId: { type: Schema.Types.ObjectId, ref: 'QualityIndicator', required: true },

    period: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      frequency: String,
    },

    // القيم
    values: {
      numerator: Number,
      denominator: Number,
      rawValue: Number,
      normalizedValue: Number,
      percentageValue: Number,
    },

    // التحليل
    analysis: {
      trend: { type: String, enum: ['improving', 'declining', 'stable'] },
      variance: Number, // الفرق عن الهدف
      variancePercentage: Number,
      comparisonToBenchmark: Number,
      comparisonToPrevious: Number,
    },

    // التقييم
    assessment: {
      performance: {
        type: String,
        enum: ['excellent', 'good', 'acceptable', 'needs_improvement', 'critical'],
      },
      meetsTarget: Boolean,
      meetsMinimum: Boolean,
      riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    },

    // الإجراءات
    actions: [
      {
        type: { type: String, enum: ['corrective', 'preventive', 'improvement'] },
        description: String,
        assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
        dueDate: Date,
        status: { type: String, enum: ['pending', 'in_progress', 'completed', 'overdue'] },
      },
    ],

    notes: String,
    evidence: [String], // روابط الوثائق

    collectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// نموذج التدقيق
const auditSchema = new Schema(
  {
    auditNumber: { type: String, unique: true, required: true },

    // معلومات التدقيق
    auditInfo: {
      type: {
        type: String,
        enum: ['internal', 'external', 'peer_review', 'self_assessment', 'surveillance'],
      },
      scope: String,
      objectives: [String],
      criteria: [String],
    },

    // المعايير المرتبطة
    standards: [
      {
        name: { type: String, enum: ['CBAHI', 'JCI', 'ISO 9001', 'MOH', 'Internal'] },
        version: String,
        chapters: [String],
      },
    ],

    // الجدول الزمني
    schedule: {
      plannedDate: Date,
      actualDate: Date,
      duration: Number, // بالأيام
      status: {
        type: String,
        enum: ['planned', 'in_progress', 'completed', 'cancelled', 'postponed'],
      },
    },

    // الفريق
    team: {
      leadAuditor: { type: Schema.Types.ObjectId, ref: 'User' },
      auditors: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      externalAuditors: [
        {
          name: String,
          organization: String,
          role: String,
        },
      ],
    },

    // المناطق المدققة
    areas: [
      {
        name: String,
        responsible: { type: Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['pending', 'audited', 'reviewed'] },
      },
    ],

    // النتائج
    findings: {
      compliant: [
        {
          standard: String,
          requirement: String,
          evidence: String,
          notes: String,
        },
      ],
      nonCompliant: [
        {
          standard: String,
          requirement: String,
          finding: String,
          severity: { type: String, enum: ['minor', 'major', 'critical'] },
          rootCause: String,
          evidence: String,
        },
      ],
      observations: [
        {
          area: String,
          observation: String,
          recommendation: String,
        },
      ],
      bestPractices: [
        {
          area: String,
          practice: String,
          description: String,
        },
      ],
    },

    // الإجراءات التصحيحية
    correctiveActions: [
      {
        finding: { type: Schema.Types.ObjectId },
        action: String,
        responsible: { type: Schema.Types.ObjectId, ref: 'User' },
        dueDate: Date,
        status: { type: String, enum: ['pending', 'in_progress', 'completed', 'verified'] },
        completionDate: Date,
        verificationDate: Date,
        verificationNotes: String,
      },
    ],

    // النتيجة النهائية
    outcome: {
      overallScore: Number,
      compliancePercentage: Number,
      grade: { type: String, enum: ['A', 'B', 'C', 'D', 'F'] },
      recommendation: {
        type: String,
        enum: ['accredited', 'conditional', 'not_accredited', 'surveillance_required'],
      },
      validUntil: Date,
      certificateNumber: String,
    },

    // التقرير
    report: {
      documentUrl: String,
      distributedAt: Date,
      distributedTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// نموذج الحادث/القرب حادث
const incidentSchema = new Schema(
  {
    incidentNumber: { type: String, unique: true, required: true },

    // معلومات الحادث
    incidentInfo: {
      type: {
        type: String,
        enum: ['incident', 'near_miss', 'hazard', 'complaint', 'sentinel_event'],
      },
      category: {
        type: String,
        enum: ['clinical', 'safety', 'security', 'environmental', 'administrative', 'equipment'],
      },
      subCategory: String,
      severity: { type: String, enum: ['low', 'moderate', 'high', 'severe', 'catastrophic'] },
    },

    // التواريخ
    dates: {
      occurred: { type: Date, required: true },
      discovered: Date,
      reported: { type: Date, default: Date.now },
      closed: Date,
    },

    // الموقع
    location: {
      building: String,
      floor: String,
      department: String,
      specificArea: String,
    },

    // الأشخاص المعنيون
    peopleInvolved: {
      beneficiaries: [{ type: Schema.Types.ObjectId, ref: 'Beneficiary' }],
      staff: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      visitors: [String],
      others: [String],
    },

    // الوصف
    description: {
      whatHappened: { type: String, required: true },
      circumstances: String,
      immediateActions: String,
      witnesses: [String],
    },

    // التأثير
    impact: {
      harmLevel: { type: String, enum: ['none', 'mild', 'moderate', 'severe', 'death'] },
      harmDescription: String,
      serviceDisruption: { type: Boolean, default: false },
      disruptionDuration: Number, // بالدقائق
      propertyDamage: { type: Boolean, default: false },
      damageDescription: String,
    },

    // الأسباب الجذرية
    rootCauseAnalysis: {
      method: { type: String, enum: ['5_whys', 'fishbone', 'fault_tree', 'other'] },
      contributingFactors: [
        {
          category: {
            type: String,
            enum: ['human', 'process', 'equipment', 'environment', 'communication', 'training'],
          },
          factor: String,
          contribution: String,
        },
      ],
      rootCauses: [String],
      analysisDate: Date,
      analyzedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },

    // الإجراءات
    actions: {
      immediate: [
        {
          action: String,
          takenBy: { type: Schema.Types.ObjectId, ref: 'User' },
          takenAt: Date,
        },
      ],
      corrective: [
        {
          action: String,
          responsible: { type: Schema.Types.ObjectId, ref: 'User' },
          dueDate: Date,
          status: { type: String, enum: ['pending', 'in_progress', 'completed'] },
          completedAt: Date,
        },
      ],
      preventive: [
        {
          action: String,
          responsible: { type: Schema.Types.ObjectId, ref: 'User' },
          dueDate: Date,
          status: { type: String, enum: ['pending', 'in_progress', 'completed'] },
          completedAt: Date,
        },
      ],
    },

    // الحالة
    status: {
      type: String,
      enum: [
        'reported',
        'under_investigation',
        'analysis_completed',
        'actions_implemented',
        'verified',
        'closed',
      ],
      default: 'reported',
    },

    // التصنيف
    classification: {
      preventability: {
        type: String,
        enum: ['preventable', 'potentially_preventable', 'not_preventable'],
      },
      reportability: { type: String, enum: ['internal', 'external', 'regulatory'] },
      externalReporting: {
        required: { type: Boolean, default: false },
        authority: String,
        reportedAt: Date,
        referenceNumber: String,
      },
    },

    // الدروس المستفادة
    lessonsLearned: {
      summary: String,
      recommendations: [String],
      sharedWith: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      sharedAt: Date,
    },

    // المرفقات
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        uploadedAt: Date,
      },
    ],

    reportedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// نموذج السياسة
const policySchema = new Schema(
  {
    policyNumber: { type: String, unique: true, required: true },

    // معلومات السياسة
    policyInfo: {
      title: { type: String, required: true },
      titleAr: { type: String },
      type: { type: String, enum: ['policy', 'procedure', 'guideline', 'protocol', 'standard'] },
      category: String,
      scope: String,
      purpose: String,
    },

    // المحتوى
    content: {
      sections: [
        {
          title: String,
          content: String,
          order: Number,
        },
      ],
      references: [String],
      definitions: [
        {
          term: String,
          definition: String,
        },
      ],
    },

    // الموافقات
    approvals: {
      draft: {
        preparedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        preparedAt: Date,
      },
      review: {
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        reviewedAt: Date,
        comments: String,
      },
      approval: {
        approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        approvedAt: Date,
        approvedVersion: Number,
      },
    },

    // الإصدار
    version: {
      number: { type: Number, default: 1 },
      effectiveDate: Date,
      expiryDate: Date,
      status: {
        type: String,
        enum: ['draft', 'under_review', 'approved', 'active', 'archived', 'superseded'],
      },
    },

    // المراجعات
    reviewSchedule: {
      frequency: { type: String, enum: ['annual', 'biennial', 'triennial', 'as_needed'] },
      nextReviewDate: Date,
      lastReviewDate: Date,
    },

    // التدريب
    training: {
      required: { type: Boolean, default: false },
      targetAudience: [String],
      trainingMethod: { type: String, enum: ['online', 'classroom', 'on_job', 'reading'] },
      competencyRequired: { type: Boolean, default: false },
    },

    // التوزيع
    distribution: {
      departments: [{ type: Schema.Types.ObjectId, ref: 'Department' }],
      roles: [String],
      externalParties: [String],
      distributedAt: Date,
    },

    // الربط بالمعايير
    complianceMapping: [
      {
        standard: String,
        requirement: String,
        reference: String,
      },
    ],

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// إنشاء النماذج
const QualityIndicator = mongoose.model('QualityIndicator', qualityIndicatorSchema);
const IndicatorMeasurement = mongoose.model('IndicatorMeasurement', indicatorMeasurementSchema);
const Audit = mongoose.model('Audit', auditSchema);
const Incident = mongoose.model('Incident', incidentSchema);
const Policy = mongoose.model('Policy', policySchema);

// ============================================
// خدمة الجودة والامتثال
// ============================================

class QualityComplianceService {
  // ====================
  // مؤشرات الجودة
  // ====================

  /**
   * إنشاء مؤشر جودة جديد
   */
  async createQualityIndicator(indicatorData) {
    try {
      const code = await this.generateIndicatorCode(indicatorData.category);

      const indicator = new QualityIndicator({
        ...indicatorData,
        code,
      });

      await indicator.save();
      return indicator;
    } catch (error) {
      throw new Error(`خطأ في إنشاء مؤشر الجودة: ${error.message}`);
    }
  }

  /**
   * توليد كود المؤشر
   */
  async generateIndicatorCode(category) {
    const prefixes = {
      clinical: 'QI-CL',
      administrative: 'QI-AD',
      safety: 'QI-SF',
      satisfaction: 'QI-ST',
      operational: 'QI-OP',
    };

    const count = await QualityIndicator.countDocuments({ category });
    return `${prefixes[category] || 'QI'}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * تسجيل قياس مؤشر
   */
  async recordMeasurement(indicatorId, measurementData) {
    try {
      const indicator = await QualityIndicator.findById(indicatorId);
      if (!indicator) {
        throw new Error('المؤشر غير موجود');
      }

      // حساب القيمة
      const values = this.calculateIndicatorValue(indicator, measurementData);

      // تحليل البيانات
      const analysis = await this.analyzeIndicator(indicator, values);

      // التقييم
      const assessment = this.assessIndicatorPerformance(indicator, values, analysis);

      const measurement = new IndicatorMeasurement({
        indicatorId,
        ...measurementData,
        values,
        analysis,
        assessment,
      });

      await measurement.save();

      // التحقق من الحاجة لإجراءات
      if (assessment.riskLevel === 'high' || assessment.riskLevel === 'critical') {
        await this.triggerQualityAlert(indicator, measurement);
      }

      return measurement;
    } catch (error) {
      throw new Error(`خطأ في تسجيل القياس: ${error.message}`);
    }
  }

  /**
   * حساب قيمة المؤشر
   */
  calculateIndicatorValue(indicator, data) {
    const { numerator, denominator } = data;

    let rawValue = numerator;
    let normalizedValue = numerator;
    let percentageValue = null;

    if (indicator.measurement.type === 'percentage' && denominator > 0) {
      percentageValue = (numerator / denominator) * 100;
      rawValue = percentageValue;
      normalizedValue = percentageValue;
    } else if (indicator.measurement.type === 'ratio' && denominator > 0) {
      rawValue = numerator / denominator;
      normalizedValue = rawValue;
    }

    return {
      numerator,
      denominator,
      rawValue,
      normalizedValue,
      percentageValue,
    };
  }

  /**
   * تحليل المؤشر
   */
  async analyzeIndicator(indicator, values) {
    // الحصول على القياسات السابقة
    const previousMeasurements = await IndicatorMeasurement.find({
      indicatorId: indicator._id,
    })
      .sort({ createdAt: -1 })
      .limit(12);

    // تحديد الاتجاه
    let trend = 'stable';
    if (previousMeasurements.length >= 2) {
      const recent = previousMeasurements[0].values.normalizedValue;
      const older = previousMeasurements[previousMeasurements.length - 1].values.normalizedValue;
      const change = ((values.normalizedValue - older) / older) * 100;

      if (change > 5) trend = 'improving';
      else if (change < -5) trend = 'declining';
    }

    // حساب الفرق عن الهدف
    const variance = values.normalizedValue - indicator.targets.target;
    const variancePercentage = (variance / indicator.targets.target) * 100;

    return {
      trend,
      variance,
      variancePercentage,
      comparisonToBenchmark: values.normalizedValue - indicator.targets.target,
      comparisonToPrevious:
        previousMeasurements.length > 0
          ? values.normalizedValue - previousMeasurements[0].values.normalizedValue
          : 0,
    };
  }

  /**
   * تقييم أداء المؤشر
   */
  assessIndicatorPerformance(indicator, values, analysis) {
    const value = values.normalizedValue;
    const targets = indicator.targets;

    let performance;
    let meetsTarget = false;
    let meetsMinimum = false;
    let riskLevel = 'low';

    // تقييم الأداء
    if (value >= targets.excellent) {
      performance = 'excellent';
      meetsTarget = true;
    } else if (value >= targets.target) {
      performance = 'good';
      meetsTarget = true;
    } else if (value >= targets.minimum) {
      performance = 'acceptable';
      meetsMinimum = true;
      riskLevel = 'medium';
    } else if (value >= targets.minimum * 0.8) {
      performance = 'needs_improvement';
      riskLevel = 'high';
    } else {
      performance = 'critical';
      riskLevel = 'critical';
    }

    return {
      performance,
      meetsTarget,
      meetsMinimum,
      riskLevel,
    };
  }

  /**
   * تقرير مؤشرات الجودة
   */
  async getQualityDashboard(filters = {}) {
    const indicators = await QualityIndicator.find({ status: 'active', ...filters });

    const dashboard = await Promise.all(
      indicators.map(async indicator => {
        const latestMeasurement = await IndicatorMeasurement.findOne({
          indicatorId: indicator._id,
        }).sort({ createdAt: -1 });

        return {
          indicator: {
            code: indicator.code,
            name: indicator.nameAr,
            category: indicator.category,
          },
          current: latestMeasurement
            ? {
                value: latestMeasurement.values.normalizedValue,
                performance: latestMeasurement.assessment.performance,
                trend: latestMeasurement.analysis.trend,
                riskLevel: latestMeasurement.assessment.riskLevel,
              }
            : null,
          targets: indicator.targets,
        };
      })
    );

    // ملخص
    const summary = {
      totalIndicators: dashboard.length,
      excellent: dashboard.filter(d => d.current?.performance === 'excellent').length,
      good: dashboard.filter(d => d.current?.performance === 'good').length,
      acceptable: dashboard.filter(d => d.current?.performance === 'acceptable').length,
      needsImprovement: dashboard.filter(d => d.current?.performance === 'needs_improvement')
        .length,
      critical: dashboard.filter(d => d.current?.performance === 'critical').length,
    };

    return { dashboard, summary };
  }

  // ====================
  // التدقيقات
  // ====================

  /**
   * إنشاء تدقيق جديد
   */
  async createAudit(auditData) {
    try {
      const auditNumber = await this.generateAuditNumber(auditData.auditInfo.type);

      const audit = new Audit({
        ...auditData,
        auditNumber,
        'schedule.status': 'planned',
      });

      await audit.save();
      return audit;
    } catch (error) {
      throw new Error(`خطأ في إنشاء التدقيق: ${error.message}`);
    }
  }

  /**
   * توليد رقم التدقيق
   */
  async generateAuditNumber(type) {
    const prefixes = {
      internal: 'AUD-INT',
      external: 'AUD-EXT',
      peer_review: 'AUD-PR',
      self_assessment: 'AUD-SA',
      surveillance: 'AUD-SV',
    };

    const year = new Date().getFullYear();
    const count = await Audit.countDocuments({
      'auditInfo.type': type,
      createdAt: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) },
    });

    return `${prefixes[type]}-${year}-${String(count + 1).padStart(3, '0')}`;
  }

  /**
   * إضافة نتيجة تدقيق
   */
  async addAuditFinding(auditId, findingType, findingData) {
    try {
      const audit = await Audit.findById(auditId);
      if (!audit) {
        throw new Error('التدقيق غير موجود');
      }

      audit.findings[findingType].push(findingData);
      await audit.save();

      // إذا كان عدم امتثال، إنشاء إجراء تصحيحي
      if (findingType === 'nonCompliant') {
        await this.createCorrectiveAction(audit, findingData);
      }

      return audit;
    } catch (error) {
      throw new Error(`خطأ في إضافة النتيجة: ${error.message}`);
    }
  }

  /**
   * إكمال التدقيق وحساب النتيجة
   */
  async completeAudit(auditId) {
    try {
      const audit = await Audit.findById(auditId);
      if (!audit) {
        throw new Error('التدقيق غير موجود');
      }

      // حساب النتيجة
      const totalRequirements =
        audit.findings.compliant.length + audit.findings.nonCompliant.length;

      const compliantCount = audit.findings.compliant.length;
      const compliancePercentage =
        totalRequirements > 0 ? (compliantCount / totalRequirements) * 100 : 0;

      // تحديد الدرجة
      let grade;
      if (compliancePercentage >= 90) grade = 'A';
      else if (compliancePercentage >= 80) grade = 'B';
      else if (compliancePercentage >= 70) grade = 'C';
      else if (compliancePercentage >= 60) grade = 'D';
      else grade = 'F';

      // تحديد التوصية
      let recommendation;
      if (compliancePercentage >= 80) {
        recommendation = 'accredited';
      } else if (compliancePercentage >= 70) {
        recommendation = 'conditional';
      } else {
        recommendation = 'not_accredited';
      }

      audit.outcome = {
        overallScore: compliantCount,
        compliancePercentage,
        grade,
        recommendation,
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // سنة
      };

      audit.schedule.status = 'completed';
      audit.schedule.actualDate = new Date();

      await audit.save();
      return audit;
    } catch (error) {
      throw new Error(`خطأ في إكمال التدقيق: ${error.message}`);
    }
  }

  // ====================
  // الحوادث
  // ====================

  /**
   * الإبلاغ عن حادث
   */
  async reportIncident(incidentData) {
    try {
      const incidentNumber = await this.generateIncidentNumber();

      const incident = new Incident({
        ...incidentData,
        incidentNumber,
        status: 'reported',
      });

      await incident.save();

      // إرسال إشعار
      await this.sendIncidentNotification(incident);

      // إذا كان حادث جسيم، إبلاغ الجهات المختصة
      if (
        incident.incidentInfo.severity === 'severe' ||
        incident.incidentInfo.severity === 'catastrophic'
      ) {
        await this.escalateIncident(incident);
      }

      return incident;
    } catch (error) {
      throw new Error(`خطأ في الإبلاغ عن الحادث: ${error.message}`);
    }
  }

  /**
   * توليد رقم الحادث
   */
  async generateIncidentNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = await Incident.countDocuments({
      createdAt: {
        $gte: new Date(year, date.getMonth(), 1),
        $lt: new Date(year, date.getMonth() + 1, 1),
      },
    });

    return `INC-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * تحليل السبب الجذري
   */
  async conductRootCauseAnalysis(incidentId, analysisData) {
    try {
      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new Error('الحادث غير موجود');
      }

      incident.rootCauseAnalysis = {
        ...analysisData,
        analysisDate: new Date(),
      };

      incident.status = 'analysis_completed';
      await incident.save();

      return incident;
    } catch (error) {
      throw new Error(`خطأ في تحليل السبب الجذري: ${error.message}`);
    }
  }

  /**
   * إحصائيات الحوادث
   */
  async getIncidentStatistics(filters = {}) {
    const incidents = await Incident.find(filters);

    const stats = {
      total: incidents.length,
      byType: {},
      bySeverity: {},
      byCategory: {},
      byStatus: {},
      averageResolutionTime: 0,
    };

    // تجميع حسب النوع
    incidents.forEach(incident => {
      const type = incident.incidentInfo.type;
      const severity = incident.incidentInfo.severity;
      const category = incident.incidentInfo.category;
      const status = incident.status;

      stats.byType[type] = (stats.byType[type] || 0) + 1;
      stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
    });

    // حساب متوسط وقت الحل
    const closedIncidents = incidents.filter(i => i.dates.closed);
    if (closedIncidents.length > 0) {
      const totalResolutionTime = closedIncidents.reduce((sum, i) => {
        return sum + (i.dates.closed - i.dates.reported);
      }, 0);
      stats.averageResolutionTime = Math.round(
        totalResolutionTime / closedIncidents.length / (1000 * 60 * 60 * 24)
      ); // بالأيام
    }

    return stats;
  }

  // ====================
  // السياسات
  // ====================

  /**
   * إنشاء سياسة جديدة
   */
  async createPolicy(policyData) {
    try {
      const policyNumber = await this.generatePolicyNumber(policyData.policyInfo.type);

      const policy = new Policy({
        ...policyData,
        policyNumber,
        'version.status': 'draft',
      });

      await policy.save();
      return policy;
    } catch (error) {
      throw new Error(`خطأ في إنشاء السياسة: ${error.message}`);
    }
  }

  /**
   * توليد رقم السياسة
   */
  async generatePolicyNumber(type) {
    const prefixes = {
      policy: 'POL',
      procedure: 'PRC',
      guideline: 'GLD',
      protocol: 'PRT',
      standard: 'STD',
    };

    const year = new Date().getFullYear();
    const count = await Policy.countDocuments({
      'policyInfo.type': type,
      createdAt: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) },
    });

    return `${prefixes[type]}-${year}-${String(count + 1).padStart(3, '0')}`;
  }

  /**
   * الموافقة على سياسة
   */
  async approvePolicy(policyId, approverId) {
    try {
      const policy = await Policy.findById(policyId);
      if (!policy) {
        throw new Error('السياسة غير موجودة');
      }

      policy.approvals.approval = {
        approvedBy: approverId,
        approvedAt: new Date(),
        approvedVersion: policy.version.number,
      };

      policy.version.status = 'active';
      policy.version.effectiveDate = new Date();
      policy.reviewSchedule.lastReviewDate = new Date();

      // حساب موعد المراجعة القادم
      const nextReview = this.calculateNextReviewDate(policy.reviewSchedule.frequency);
      policy.reviewSchedule.nextReviewDate = nextReview;

      await policy.save();
      return policy;
    } catch (error) {
      throw new Error(`خطأ في الموافقة على السياسة: ${error.message}`);
    }
  }

  /**
   * حساب موعد المراجعة القادم
   */
  calculateNextReviewDate(frequency) {
    const now = new Date();
    switch (frequency) {
      case 'annual':
        return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      case 'biennial':
        return new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
      case 'triennial':
        return new Date(now.getFullYear() + 3, now.getMonth(), now.getDate());
      default:
        return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    }
  }

  /**
   * تقرير الامتثال للسياسات
   */
  async getComplianceReport() {
    const policies = await Policy.find({ 'version.status': 'active' });

    const report = {
      totalPolicies: policies.length,
      byType: {},
      byStatus: {},
      overdue: [],
      upcomingReviews: [],
    };

    const now = new Date();

    policies.forEach(policy => {
      // حسب النوع
      const type = policy.policyInfo.type;
      report.byType[type] = (report.byType[type] || 0) + 1;

      // المراجعات المتأخرة
      if (policy.reviewSchedule.nextReviewDate && policy.reviewSchedule.nextReviewDate < now) {
        report.overdue.push({
          policyNumber: policy.policyNumber,
          title: policy.policyInfo.title,
          dueDate: policy.reviewSchedule.nextReviewDate,
        });
      }

      // المراجعات القادمة (خلال 30 يوم)
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (
        policy.reviewSchedule.nextReviewDate &&
        policy.reviewSchedule.nextReviewDate >= now &&
        policy.reviewSchedule.nextReviewDate <= thirtyDaysFromNow
      ) {
        report.upcomingReviews.push({
          policyNumber: policy.policyNumber,
          title: policy.policyInfo.title,
          dueDate: policy.reviewSchedule.nextReviewDate,
        });
      }
    });

    return report;
  }

  // ====================
  // دوال مساعدة
  // ====================

  async createCorrectiveAction(audit, finding) {
    // إنشاء إجراء تصحيحي تلقائي
    logger.info(`إنشاء إجراء تصحيحي للنتيجة: ${finding.finding}`);
  }

  async triggerQualityAlert(indicator, measurement) {
    // إرسال تنبيه جودة
    logger.info(
      `تنبيه جودة: المؤشر ${indicator.code} - مستوى الخطر ${measurement.assessment.riskLevel}`
    );
  }

  async sendIncidentNotification(incident) {
    // إرسال إشعار بالحادث
    logger.info(`إرسال إشعار بالحادث: ${incident.incidentNumber}`);
  }

  async escalateIncident(incident) {
    // تصعيد الحادث
    logger.info(`تصعيد الحادث الجسيم: ${incident.incidentNumber}`);
  }
}

// تصدير
module.exports = {
  QualityComplianceService,
  QualityIndicator,
  IndicatorMeasurement,
  Audit,
  Incident,
  Policy,
};
