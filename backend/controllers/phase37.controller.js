'use strict';
/**
 * Phase 37 Controller — Advanced Platform Enhancement
 * وحدة التحكم للمرحلة 37
 *
 * 8 أنظمة — كل نظام له CRUD + إحصائيات + عمليات متخصصة
 */

const {
  AccreditationStandard,
  AccreditationSurvey,
  FamilyTrainingProgram,
  FamilyTrainingEnrollment,
  ClinicalRuleEngine,
  ClinicalAlert,
  CompetencyFramework,
  StaffCompetencyAssessment,
  CpdRecordAdvanced,
  OutreachProgram,
  DigitalTherapeutic,
  OutcomeContract,
  ContentLibrary,
} = require('../models/phase37.model');

const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');
const { escapeRegex, stripUpdateMeta } = require('../utils/sanitize');

// ─── Response Helpers ────────────────────────────────────────────────────────
const ok = (res, data, msg = 'success', code = 200) =>
  res.status(code).json({ success: true, message: msg, data });
const created = (res, data, msg = 'created') => ok(res, data, msg, 201);
const fail = (res, err, code = 400) => {
  if (code >= 500) logger.error('[phase37]', { error: err?.message || err });
  return res.status(code).json({ success: false, message: safeError(err) });
};

// ─── Shared Utilities ────────────────────────────────────────────────────────
const paginate = req => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  return { skip: (page - 1) * limit, limit, page };
};
const userId = req => req.user?.userId || req.user?._id || req.user?.id;
const branchId = req => req.query.branchId || req.body.branchId || req.user?.branchId;

/**
 * Builds a generic CRUD controller for a Mongoose model.
 */
function buildCRUD(Model, labelEn, labelAr) {
  return {
    create: async (req, res) => {
      try {
        const doc = await Model.create({ ...stripUpdateMeta(req.body), createdBy: userId(req) });
        created(res, doc, `تم إنشاء ${labelAr} بنجاح`);
      } catch (e) {
        fail(res, e);
      }
    },

    getAll: async (req, res) => {
      try {
        const { skip, limit, page } = paginate(req);
        const filter = {};
        if (req.query.branchId) filter.branchId = req.query.branchId;
        if (req.query.status) filter.status = req.query.status;
        if (req.query.search) {
          const s = escapeRegex(String(req.query.search));
          filter.$or = [
            { title: { $regex: s, $options: 'i' } },
            { title_ar: { $regex: s, $options: 'i' } },
            { name: { $regex: s, $options: 'i' } },
          ];
        }
        const [data, total] = await Promise.all([
          Model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
          Model.countDocuments(filter),
        ]);
        ok(res, { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
      } catch (e) {
        fail(res, e, 500);
      }
    },

    getById: async (req, res) => {
      try {
        const doc = await Model.findById(req.params.id).lean();
        if (!doc) return res.status(404).json({ success: false, message: `${labelAr} غير موجود` });
        ok(res, doc);
      } catch (e) {
        fail(res, e, 500);
      }
    },

    update: async (req, res) => {
      try {
        const doc = await Model.findByIdAndUpdate(
          req.params.id,
          { ...stripUpdateMeta(req.body), updatedBy: userId(req) },
          { new: true, runValidators: true }
        );
        if (!doc) return res.status(404).json({ success: false, message: `${labelAr} غير موجود` });
        ok(res, doc, `تم تحديث ${labelAr} بنجاح`);
      } catch (e) {
        fail(res, e);
      }
    },

    remove: async (req, res) => {
      try {
        const doc = await Model.findByIdAndDelete(req.params.id);
        if (!doc) return res.status(404).json({ success: false, message: `${labelAr} غير موجود` });
        ok(res, null, `تم حذف ${labelAr} بنجاح`);
      } catch (e) {
        fail(res, e, 500);
      }
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 1. ACCREDITATION MANAGEMENT — إدارة الاعتماد
// ════════════════════════════════════════════════════════════════════════════

const accreditationStandards = {
  ...buildCRUD(AccreditationStandard, 'AccreditationStandard', 'معيار الاعتماد'),

  getByBody: async (req, res) => {
    try {
      const filter = { branchId: req.query.branchId };
      if (req.params.body) filter.body = req.params.body;
      if (req.query.domain) filter.domain = req.query.domain;
      if (req.query.status) filter.complianceStatus = req.query.status;
      const data = await AccreditationStandard.find(filter)
        .sort({ domain: 1, standardCode: 1 })
        .lean();
      ok(res, data);
    } catch (e) {
      fail(res, e, 500);
    }
  },

  getComplianceDashboard: async (req, res) => {
    try {
      const bId = req.query.branchId;
      const stats = await AccreditationStandard.aggregate([
        { $match: { branchId: new (require('mongoose').Types.ObjectId)(bId) } },
        {
          $group: {
            _id: { body: '$body', domain: '$domain', status: '$complianceStatus' },
            count: { $sum: 1 },
            avgScore: { $avg: '$complianceScore' },
          },
        },
      ]);
      ok(res, stats);
    } catch (e) {
      fail(res, e, 500);
    }
  },

  updateCompliance: async (req, res) => {
    try {
      const { complianceStatus, complianceScore, gapAnalysis, notes } = req.body;
      const doc = await AccreditationStandard.findByIdAndUpdate(
        req.params.id,
        {
          complianceStatus,
          complianceScore,
          gapAnalysis,
          notes,
          lastReviewDate: new Date(),
          reviewedBy: userId(req),
        },
        { new: true }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'المعيار غير موجود' });
      ok(res, doc, 'تم تحديث حالة الامتثال');
    } catch (e) {
      fail(res, e);
    }
  },

  addEvidence: async (req, res) => {
    try {
      const doc = await AccreditationStandard.findByIdAndUpdate(
        req.params.id,
        {
          $push: {
            evidenceItems: { ...req.body, uploadedBy: userId(req), uploadedAt: new Date() },
          },
        },
        { new: true }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'المعيار غير موجود' });
      ok(res, doc, 'تمت إضافة الدليل بنجاح');
    } catch (e) {
      fail(res, e);
    }
  },
};

const accreditationSurveys = {
  ...buildCRUD(AccreditationSurvey, 'AccreditationSurvey', 'مسح الاعتماد'),

  getUpcoming: async (req, res) => {
    try {
      const data = await AccreditationSurvey.find({
        branchId: req.query.branchId,
        status: { $in: ['scheduled', 'in_progress'] },
        surveyDate: { $gte: new Date() },
      })
        .sort({ surveyDate: 1 })
        .lean();
      ok(res, data);
    } catch (e) {
      fail(res, e, 500);
    }
  },

  recordOutcome: async (req, res) => {
    try {
      const { outcome, overallScore, accreditationPeriod, certificateNumber, findings } = req.body;
      const doc = await AccreditationSurvey.findByIdAndUpdate(
        req.params.id,
        {
          outcome,
          overallScore,
          accreditationPeriod,
          certificateNumber,
          findings,
          status: 'completed',
        },
        { new: true }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'مسح الاعتماد غير موجود' });
      ok(res, doc, 'تم تسجيل نتيجة المسح');
    } catch (e) {
      fail(res, e);
    }
  },
};

// ════════════════════════════════════════════════════════════════════════════
// 2. FAMILY TRAINING & EDUCATION — تدريب الأسرة
// ════════════════════════════════════════════════════════════════════════════

const familyTraining = {
  programs: {
    ...buildCRUD(FamilyTrainingProgram, 'FamilyTrainingProgram', 'برنامج تدريب الأسرة'),

    getByCategory: async (req, res) => {
      try {
        const data = await FamilyTrainingProgram.find({
          branchId: req.query.branchId,
          category: req.params.category,
          status: 'active',
        }).lean();
        ok(res, data);
      } catch (e) {
        fail(res, e, 500);
      }
    },

    getStatistics: async (req, res) => {
      try {
        const [programs, enrollments] = await Promise.all([
          FamilyTrainingProgram.countDocuments({ branchId: req.query.branchId }),
          FamilyTrainingEnrollment.aggregate([
            { $match: { branchId: new (require('mongoose').Types.ObjectId)(req.query.branchId) } },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                avgSatisfaction: { $avg: '$satisfactionRating' },
                avgImprovement: { $avg: '$improvementPercentage' },
              },
            },
          ]),
        ]);
        ok(res, { programs, enrollments });
      } catch (e) {
        fail(res, e, 500);
      }
    },
  },

  enrollments: {
    ...buildCRUD(FamilyTrainingEnrollment, 'FamilyTrainingEnrollment', 'تسجيل التدريب'),

    getByBeneficiary: async (req, res) => {
      try {
        const data = await FamilyTrainingEnrollment.find({
          beneficiaryId: req.params.beneficiaryId,
        })
          .populate('programId', 'title title_ar category')
          .sort({ createdAt: -1 })
          .lean();
        ok(res, data);
      } catch (e) {
        fail(res, e, 500);
      }
    },

    updateProgress: async (req, res) => {
      try {
        const {
          sessionAttendance,
          status,
          preAssessmentScore,
          postAssessmentScore,
          satisfactionRating,
          feedback,
        } = req.body;
        const update = { status };
        if (preAssessmentScore !== undefined) update.preAssessmentScore = preAssessmentScore;
        if (postAssessmentScore !== undefined) {
          update.postAssessmentScore = postAssessmentScore;
          if (req.body.preAssessmentScore) {
            update.improvementPercentage =
              ((postAssessmentScore - req.body.preAssessmentScore) / req.body.preAssessmentScore) *
              100;
          }
        }
        if (satisfactionRating !== undefined) update.satisfactionRating = satisfactionRating;
        if (feedback) update.feedback = feedback;
        if (status === 'completed') update.completedAt = new Date();
        if (sessionAttendance) update.$push = { sessionAttendance: { $each: sessionAttendance } };
        const doc = await FamilyTrainingEnrollment.findByIdAndUpdate(req.params.id, update, {
          new: true,
        });
        if (!doc) return res.status(404).json({ success: false, message: 'التسجيل غير موجود' });
        ok(res, doc, 'تم تحديث التقدم');
      } catch (e) {
        fail(res, e);
      }
    },
  },
};

// ════════════════════════════════════════════════════════════════════════════
// 3. SMART CLINICAL DECISION SUPPORT — دعم القرار السريري
// ════════════════════════════════════════════════════════════════════════════

const clinicalDecisionSupport = {
  rules: {
    ...buildCRUD(ClinicalRuleEngine, 'ClinicalRuleEngine', 'قاعدة القرار السريري'),

    getActive: async (req, res) => {
      try {
        const data = await ClinicalRuleEngine.find({ isActive: true }).sort({ priority: 1 }).lean();
        ok(res, data);
      } catch (e) {
        fail(res, e, 500);
      }
    },

    toggleStatus: async (req, res) => {
      try {
        const doc = await ClinicalRuleEngine.findById(req.params.id);
        if (!doc) return res.status(404).json({ success: false, message: 'القاعدة غير موجودة' });
        doc.isActive = !doc.isActive;
        await doc.save();
        ok(res, doc, doc.isActive ? 'تم تفعيل القاعدة' : 'تم إيقاف القاعدة');
      } catch (e) {
        fail(res, e);
      }
    },
  },

  alerts: {
    ...buildCRUD(ClinicalAlert, 'ClinicalAlert', 'التنبيه السريري'),

    getActiveAlerts: async (req, res) => {
      try {
        const filter = { status: 'active' };
        if (req.query.branchId) filter.branchId = req.query.branchId;
        if (req.query.priority) filter.priority = req.query.priority;
        const data = await ClinicalAlert.find(filter)
          .populate('beneficiaryId', 'name arabicName')
          .populate('ruleId', 'ruleName_ar priority')
          .sort({ createdAt: -1 })
          .lean();
        ok(res, data);
      } catch (e) {
        fail(res, e, 500);
      }
    },

    acknowledge: async (req, res) => {
      try {
        const doc = await ClinicalAlert.findByIdAndUpdate(
          req.params.id,
          {
            status: 'acknowledged',
            acknowledgedBy: userId(req),
            acknowledgedAt: new Date(),
            resolutionAction: req.body.resolutionAction,
          },
          { new: true }
        );
        if (!doc) return res.status(404).json({ success: false, message: 'التنبيه غير موجود' });
        ok(res, doc, 'تم تأكيد استلام التنبيه');
      } catch (e) {
        fail(res, e);
      }
    },

    resolve: async (req, res) => {
      try {
        const doc = await ClinicalAlert.findByIdAndUpdate(
          req.params.id,
          {
            status: 'resolved',
            resolvedBy: userId(req),
            resolvedAt: new Date(),
            resolutionAction: req.body.resolutionAction,
          },
          { new: true }
        );
        if (!doc) return res.status(404).json({ success: false, message: 'التنبيه غير موجود' });
        ok(res, doc, 'تم حل التنبيه');
      } catch (e) {
        fail(res, e);
      }
    },

    getAlertSummary: async (req, res) => {
      try {
        const bId = req.query.branchId;
        const filter = bId ? { branchId: new (require('mongoose').Types.ObjectId)(bId) } : {};
        const summary = await ClinicalAlert.aggregate([
          { $match: filter },
          {
            $group: {
              _id: { priority: '$priority', status: '$status' },
              count: { $sum: 1 },
            },
          },
        ]);
        ok(res, summary);
      } catch (e) {
        fail(res, e, 500);
      }
    },
  },
};

// ════════════════════════════════════════════════════════════════════════════
// 4. STAFF COMPETENCY & CPD — كفاءة الموظفين
// ════════════════════════════════════════════════════════════════════════════

const staffCompetency = {
  frameworks: {
    ...buildCRUD(CompetencyFramework, 'CompetencyFramework', 'إطار الكفاءات'),

    getByRole: async (req, res) => {
      try {
        const data = await CompetencyFramework.find({
          jobRole: req.params.role,
          isActive: true,
        }).lean();
        ok(res, data);
      } catch (e) {
        fail(res, e, 500);
      }
    },
  },

  assessments: {
    ...buildCRUD(StaffCompetencyAssessment, 'StaffCompetencyAssessment', 'تقييم الكفاءة'),

    getByEmployee: async (req, res) => {
      try {
        const data = await StaffCompetencyAssessment.find({ employeeId: req.params.employeeId })
          .populate('frameworkId', 'jobRole level')
          .sort({ assessmentDate: -1 })
          .lean();
        ok(res, data);
      } catch (e) {
        fail(res, e, 500);
      }
    },

    getOverdueSummary: async (req, res) => {
      try {
        const overdue = await StaffCompetencyAssessment.find({
          branchId: req.query.branchId,
          nextAssessmentDate: { $lt: new Date() },
          status: 'completed',
        })
          .populate('employeeId', 'name arabicName')
          .lean();
        ok(res, overdue);
      } catch (e) {
        fail(res, e, 500);
      }
    },

    sign: async (req, res) => {
      try {
        const { signedAs } = req.body; // 'employee' | 'supervisor'
        const update =
          signedAs === 'employee'
            ? { employeeSignedAt: new Date() }
            : { supervisorSignedAt: new Date(), status: 'completed' };
        const doc = await StaffCompetencyAssessment.findByIdAndUpdate(req.params.id, update, {
          new: true,
        });
        if (!doc) return res.status(404).json({ success: false, message: 'التقييم غير موجود' });
        ok(res, doc, 'تم التوقيع الرقمي');
      } catch (e) {
        fail(res, e);
      }
    },
  },

  cpd: {
    ...buildCRUD(CpdRecordAdvanced, 'CpdRecordAdvanced', 'سجل التطوير المهني'),

    getByEmployee: async (req, res) => {
      try {
        const data = await CpdRecordAdvanced.find({ employeeId: req.params.employeeId })
          .sort({ year: -1 })
          .lean();
        ok(res, data);
      } catch (e) {
        fail(res, e, 500);
      }
    },

    addActivity: async (req, res) => {
      try {
        const doc = await CpdRecordAdvanced.findByIdAndUpdate(
          req.params.id,
          {
            $push: { activities: req.body },
            $inc: {
              totalHoursEarned: req.body.hoursEarned || 0,
              totalCEUEarned: req.body.ceuCredits || 0,
            },
          },
          { new: true }
        );
        if (!doc) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
        ok(res, doc, 'تمت إضافة النشاط التطويري');
      } catch (e) {
        fail(res, e);
      }
    },

    getNonCompliant: async (req, res) => {
      try {
        const data = await CpdRecordAdvanced.find({
          branchId: req.query.branchId,
          complianceStatus: { $in: ['at_risk', 'non_compliant'] },
        })
          .populate('employeeId', 'name arabicName')
          .lean();
        ok(res, data);
      } catch (e) {
        fail(res, e, 500);
      }
    },
  },
};

// ════════════════════════════════════════════════════════════════════════════
// 5. COMMUNITY OUTREACH — التواصل المجتمعي
// ════════════════════════════════════════════════════════════════════════════

const communityOutreach = {
  ...buildCRUD(OutreachProgram, 'OutreachProgram', 'برنامج التواصل المجتمعي'),

  getUpcoming: async (req, res) => {
    try {
      const data = await OutreachProgram.find({
        branchId: req.query.branchId,
        scheduledDate: { $gte: new Date() },
        status: { $in: ['planning', 'approved', 'in_progress'] },
      })
        .sort({ scheduledDate: 1 })
        .lean();
      ok(res, data);
    } catch (e) {
      fail(res, e, 500);
    }
  },

  getImpactSummary: async (req, res) => {
    try {
      const summary = await OutreachProgram.aggregate([
        {
          $match: {
            branchId: new (require('mongoose').Types.ObjectId)(req.query.branchId),
            status: 'completed',
          },
        },
        {
          $group: {
            _id: '$type',
            totalEvents: { $sum: 1 },
            totalAttendees: { $sum: '$actualAttendees' },
            totalReferrals: { $sum: '$referralsGenerated' },
            totalCost: { $sum: '$actualCost' },
            avgSatisfaction: { $avg: '$satisfactionScore' },
          },
        },
      ]);
      ok(res, summary);
    } catch (e) {
      fail(res, e, 500);
    }
  },

  recordOutcome: async (req, res) => {
    try {
      const doc = await OutreachProgram.findByIdAndUpdate(
        req.params.id,
        { ...req.body, status: 'completed' },
        { new: true }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
      ok(res, doc, 'تم تسجيل نتائج البرنامج');
    } catch (e) {
      fail(res, e);
    }
  },
};

// ════════════════════════════════════════════════════════════════════════════
// 6. DIGITAL THERAPEUTICS — العلاجات الرقمية
// ════════════════════════════════════════════════════════════════════════════

const digitalTherapeutics = {
  ...buildCRUD(DigitalTherapeutic, 'DigitalTherapeutic', 'العلاج الرقمي'),

  getByBeneficiary: async (req, res) => {
    try {
      const data = await DigitalTherapeutic.find({ beneficiaryId: req.params.beneficiaryId })
        .sort({ createdAt: -1 })
        .lean();
      ok(res, data);
    } catch (e) {
      fail(res, e, 500);
    }
  },

  logSession: async (req, res) => {
    try {
      const sessionData = { ...req.body, date: new Date() };
      const doc = await DigitalTherapeutic.findByIdAndUpdate(
        req.params.id,
        { $push: { adherenceData: sessionData } },
        { new: true }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
      // Recalculate adherence rate
      const total = doc.adherenceData.length;
      const completed = doc.adherenceData.filter(s => s.sessionCompleted).length;
      doc.adherenceRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      await doc.save();
      ok(res, doc, 'تم تسجيل جلسة العلاج الرقمي');
    } catch (e) {
      fail(res, e);
    }
  },

  addProgressMetric: async (req, res) => {
    try {
      const doc = await DigitalTherapeutic.findByIdAndUpdate(
        req.params.id,
        { $push: { progressMetrics: { ...req.body, date: new Date() } } },
        { new: true }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'البرنامج غير موجود' });
      ok(res, doc, 'تمت إضافة مقياس التقدم');
    } catch (e) {
      fail(res, e);
    }
  },

  getAdherenceReport: async (req, res) => {
    try {
      const report = await DigitalTherapeutic.aggregate([
        {
          $match: {
            branchId: new (require('mongoose').Types.ObjectId)(req.query.branchId),
            status: 'active',
          },
        },
        {
          $group: {
            _id: '$programType',
            count: { $sum: 1 },
            avgAdherence: { $avg: '$adherenceRate' },
            avgProgress: { $avg: '$overallProgress' },
          },
        },
      ]);
      ok(res, report);
    } catch (e) {
      fail(res, e, 500);
    }
  },
};

// ════════════════════════════════════════════════════════════════════════════
// 7. OUTCOME-BASED CONTRACTING — التعاقد القائم على النتائج
// ════════════════════════════════════════════════════════════════════════════

const outcomeContracting = {
  ...buildCRUD(OutcomeContract, 'OutcomeContract', 'العقد القائم على النتائج'),

  getActive: async (req, res) => {
    try {
      const data = await OutcomeContract.find({
        branchId: req.query.branchId,
        status: 'active',
      }).lean();
      ok(res, data);
    } catch (e) {
      fail(res, e, 500);
    }
  },

  submitPerformanceReport: async (req, res) => {
    try {
      const report = {
        ...req.body,
        submittedDate: new Date(),
        submittedBy: userId(req),
      };
      const doc = await OutcomeContract.findByIdAndUpdate(
        req.params.id,
        { $push: { performanceReports: report }, $inc: { totalPaid: report.paymentEarned || 0 } },
        { new: true }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'العقد غير موجود' });
      ok(res, doc, 'تم تقديم تقرير الأداء');
    } catch (e) {
      fail(res, e);
    }
  },

  updateMetricValue: async (req, res) => {
    try {
      const { metricIndex, currentValue } = req.body;
      const doc = await OutcomeContract.findById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: 'العقد غير موجود' });
      if (doc.outcomeMetrics[metricIndex]) {
        doc.outcomeMetrics[metricIndex].currentValue = currentValue;
        const metric = doc.outcomeMetrics[metricIndex];
        if (metric.baselineValue !== undefined && metric.targetValue !== undefined) {
          const totalChange = metric.targetValue - metric.baselineValue;
          const actualChange = currentValue - metric.baselineValue;
          doc.outcomeMetrics[metricIndex].achievementPercentage =
            totalChange !== 0 ? Math.round((actualChange / totalChange) * 100) : 0;
        }
      }
      await doc.save();
      ok(res, doc, 'تم تحديث قيمة المقياس');
    } catch (e) {
      fail(res, e);
    }
  },
};

// ════════════════════════════════════════════════════════════════════════════
// 8. MULTI-LANGUAGE CONTENT — إدارة المحتوى
// ════════════════════════════════════════════════════════════════════════════

const contentManagement = {
  ...buildCRUD(ContentLibrary, 'ContentLibrary', 'محتوى المكتبة'),

  getPublished: async (req, res) => {
    try {
      const filter = { status: 'published' };
      if (req.query.type) filter.contentType = req.query.type;
      if (req.query.category) filter.category = req.query.category;
      if (req.query.audience) filter.targetAudience = { $in: [req.query.audience] };
      if (req.query.lang) {
        filter['versions'] = { $elemMatch: { language: req.query.lang, isActive: true } };
      }
      const { skip, limit, page } = paginate(req);
      const [data, total] = await Promise.all([
        ContentLibrary.find(filter)
          .sort({ viewCount: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ContentLibrary.countDocuments(filter),
      ]);
      ok(res, { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (e) {
      fail(res, e, 500);
    }
  },

  addVersion: async (req, res) => {
    try {
      const doc = await ContentLibrary.findByIdAndUpdate(
        req.params.id,
        {
          $push: {
            versions: {
              ...req.body,
              translatedBy: userId(req),
              publishedAt: req.body.isActive ? new Date() : undefined,
            },
          },
        },
        { new: true }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'المحتوى غير موجود' });
      ok(res, doc, 'تمت إضافة النسخة');
    } catch (e) {
      fail(res, e);
    }
  },

  recordView: async (req, res) => {
    try {
      await ContentLibrary.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });
      res.status(204).end();
    } catch (e) {
      fail(res, e, 500);
    }
  },

  search: async (req, res) => {
    try {
      const s = escapeRegex(String(req.query.q || ''));
      const { skip, limit, page } = paginate(req);
      const filter = {
        status: 'published',
        $or: [
          { 'versions.title': { $regex: s, $options: 'i' } },
          { tags: { $regex: s, $options: 'i' } },
          { 'versions.summary': { $regex: s, $options: 'i' } },
        ],
      };
      const [data, total] = await Promise.all([
        ContentLibrary.find(filter).skip(skip).limit(limit).lean(),
        ContentLibrary.countDocuments(filter),
      ]);
      ok(res, { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (e) {
      fail(res, e, 500);
    }
  },
};

module.exports = {
  accreditationStandards,
  accreditationSurveys,
  familyTraining,
  clinicalDecisionSupport,
  staffCompetency,
  communityOutreach,
  digitalTherapeutics,
  outcomeContracting,
  contentManagement,
};
