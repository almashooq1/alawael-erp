/**
 * Priorities 6, 7, 8 - MDT System + Transition Planning + Quality KPIs
 * نظام الفريق متعدد التخصصات + خطط الانتقال + مؤشرات جودة CARF
 * Al-Awael ERP System
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Schema } = mongoose;

// ══════════════════════════════════════════════════════════════
// PRIORITY 6 - MDT (Multidisciplinary Team) System
// ══════════════════════════════════════════════════════════════

const MDTMeetingSchema = new Schema(
  {
    beneficiary_id: {
      type: Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    meeting_type: {
      type: String,
      enum: [
        'initial_assessment',
        'quarterly_review',
        'annual_review',
        'crisis',
        'transition',
        'discharge',
      ],
      required: true,
    },
    meeting_date: { type: Date, required: true },
    meeting_number: { type: String }, // رقم الاجتماع تلقائي
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'postponed'],
      default: 'scheduled',
    },
    // أعضاء الفريق الحاضرون
    team_members: [
      {
        role: {
          type: String,
          enum: [
            'speech_therapist',
            'occupational_therapist',
            'behavior_analyst',
            'special_educator',
            'psychologist',
            'social_worker',
            'physician',
            'physiotherapist',
            'supervisor',
            'other',
          ],
        },
        name: String,
        staff_id: { type: Schema.Types.ObjectId },
        attended: { type: Boolean, default: true },
        report_submitted: { type: Boolean, default: false },
        report_summary_ar: String,
      },
    ],
    // حضور الأسرة
    family_attendance: {
      attended: { type: Boolean, default: false },
      members_present: [String], // 'mother', 'father', 'guardian'
      family_concerns_ar: String,
      family_priorities_ar: String,
    },
    // جدول الأعمال
    agenda_items: [
      {
        item_ar: String,
        presenter_role: String,
        duration_minutes: Number,
        discussed: { type: Boolean, default: false },
      },
    ],
    // المناقشات والقرارات
    discussion_points: [
      {
        topic_ar: String,
        findings_ar: String,
        domain: String, // communication, behavior, motor, etc.
      },
    ],
    decisions: [
      {
        decision_ar: String,
        responsible_role: String,
        due_date: Date,
        status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
      },
    ],
    // الأهداف المقترحة للفترة القادمة
    recommended_goals: [String],
    // التقييم الشامل للفريق
    team_consensus: {
      overall_progress: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'limited', 'regression'],
      },
      strengths_ar: [String],
      challenges_ar: [String],
      priority_domains_next_period: [String],
    },
    // الاجتماع القادم
    next_meeting: {
      planned_date: Date,
      meeting_type: String,
      focus_areas: [String],
    },
    // التوقيعات
    signatures: [{ role: String, name: String, date: Date, signed: Boolean }],
    minutes_finalized: { type: Boolean, default: false },
    minutes_sent_to_family: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-generate meeting number
MDTMeetingSchema.pre('save', async function () {
  if (!this.meeting_number) {
    const count = await mongoose
      .model('MDTMeeting')
      .countDocuments({ beneficiary_id: this.beneficiary_id });
    this.meeting_number = `MDT-${this.beneficiary_id.toString().slice(-6)}-${String(count + 1).padStart(3, '0')}`;
  }
});

const MDTMeeting = mongoose.model('MDTMeeting', MDTMeetingSchema);

// ══════════════════════════════════════════════════════════════
// PRIORITY 7 - Transition Planning Protocol
// ══════════════════════════════════════════════════════════════

const TransitionPlanSchema = new Schema(
  {
    beneficiary_id: {
      type: Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch' },
    transition_type: {
      type: String,
      enum: [
        'center_to_kindergarten',
        'kindergarten_to_school',
        'child_to_adolescent',
        'adolescent_to_adult',
        'center_to_community',
        'between_programs',
        'discharge',
      ],
      required: true,
    },
    transition_type_ar: String,
    // الوضع الحالي والمستهدف
    current_setting: String,
    target_setting: String,
    expected_transition_date: Date,
    actual_transition_date: Date,
    status: {
      type: String,
      enum: ['planning', 'in_progress', 'completed', 'postponed'],
      default: 'planning',
    },
    // متطلبات الانتقال
    readiness_checklist: [
      {
        skill_ar: String,
        domain: String,
        required_level: String,
        current_level: String,
        ready: { type: Boolean, default: false },
        target_date: Date,
      },
    ],
    readiness_percentage: { type: Number, default: 0 },
    // التدخلات التحضيرية
    preparation_interventions: [
      {
        intervention_ar: String,
        responsible: String,
        start_date: Date,
        end_date: Date,
        status: { type: String, enum: ['planned', 'in_progress', 'completed'], default: 'planned' },
      },
    ],
    // تنسيق مع البيئة المستقبلة
    receiving_environment: {
      institution_name: String,
      contact_person: String,
      contact_info: String,
      visit_completed: { type: Boolean, default: false },
      visit_date: Date,
      information_shared: { type: Boolean, default: false },
      accommodations_arranged: [String],
    },
    // دعم ما بعد الانتقال
    post_transition_support: {
      follow_up_plan: String,
      follow_up_dates: [Date],
      support_duration_months: Number,
      emergency_contact: String,
    },
    // تقرير الانتقال النهائي
    transition_report: {
      strengths_ar: [String],
      needs_ar: [String],
      recommendations_ar: [String],
      completed: { type: Boolean, default: false },
      date: Date,
    },
    family_consent: { type: Boolean, default: false },
    notes_ar: String,
  },
  { timestamps: true }
);

// حساب نسبة الجاهزية
TransitionPlanSchema.methods.calculateReadiness = function () {
  if (!this.readiness_checklist.length) return 0;
  const ready = this.readiness_checklist.filter(item => item.ready).length;
  this.readiness_percentage = Math.round((ready / this.readiness_checklist.length) * 100);
  return this.readiness_percentage;
};

const TransitionPlan = mongoose.model('TransitionPlan', TransitionPlanSchema);

// ══════════════════════════════════════════════════════════════
// PRIORITY 8 - Quality KPIs (CARF Standards)
// ══════════════════════════════════════════════════════════════

const QualityKPISchema = new Schema(
  {
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    period: { type: String, required: true }, // YYYY-Q1/Q2/Q3/Q4 or YYYY for annual
    period_type: { type: String, enum: ['quarterly', 'annual'], default: 'quarterly' },
    calculated_at: { type: Date, default: Date.now },
    // مؤشرات الخدمة (CARF Standard 1)
    service_metrics: {
      active_beneficiaries: Number,
      new_admissions: Number,
      discharges: Number,
      avg_sessions_per_week: Number,
      session_completion_rate: Number, // % جلسات منجزة من مخططة
      average_wait_days: Number, // أيام انتظار للقبول
    },
    // مؤشرات التقدم (CARF Standard 2)
    progress_metrics: {
      iep_goals_mastered_rate: Number, // % أهداف أُتقنت
      beneficiaries_with_progress: Number, // عدد المستفيدين ذوو تقدم إيجابي
      beneficiaries_plateau: Number, // عدد حالات التوقف
      beneficiaries_regression: Number,
      avg_progress_score: Number, // متوسط نسبة التقدم
    },
    // مؤشرات رضا الأسرة (CARF Standard 3)
    family_satisfaction: {
      surveys_sent: Number,
      surveys_returned: Number,
      response_rate: Number,
      avg_satisfaction_score: Number, // 1-5
      would_recommend: Number, // % يوصون بالخدمة
      top_concerns: [String],
    },
    // مؤشرات الكوادر (CARF Standard 4)
    staff_metrics: {
      total_staff: Number,
      licensed_staff_percentage: Number,
      staff_turnover_rate: Number,
      training_hours_per_staff: Number,
      staff_satisfaction_score: Number,
      supervision_sessions_completed: Number,
    },
    // مؤشرات السلامة (CARF Standard 5)
    safety_metrics: {
      incident_reports: Number,
      near_miss_reports: Number,
      restraint_episodes: Number,
      emergency_evacuations: Number,
      medication_errors: Number,
    },
    // مؤشرات الجودة الإجمالية
    overall_quality_score: { type: Number, default: 0 }, // 0-100
    carf_compliance_level: {
      type: String,
      enum: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'non_compliant'],
    },
    improvement_areas: [String],
    action_plans: [
      {
        area_ar: String,
        target: String,
        responsible: String,
        deadline: Date,
        status: { type: String, enum: ['open', 'in_progress', 'closed'], default: 'open' },
      },
    ],
    benchmarks: {
      national_avg_progress: Number,
      branch_rank: Number, // ترتيب الفرع على مستوى النظام
    },
  },
  { timestamps: true }
);

const QualityKPI = mongoose.model('QualityKPI', QualityKPISchema);

// ─── KPI Calculator ─────────────────────────────────────────────────────────────

class KPICalculator {
  static async calculateBranchKPIs(branchId, period) {
    const { SmartIEP } = require('../models/SmartIEP');
    const { EarlyWarningAlert } = require('./early-warning-system');

    // جلب بيانات IEP للفرع
    const ieps = await SmartIEP.aggregate([
      {
        $lookup: {
          from: 'beneficiaries',
          localField: 'beneficiary_id',
          foreignField: '_id',
          as: 'beneficiary',
        },
      },
      { $unwind: '$beneficiary' },
      {
        $match: {
          'beneficiary.branch_id': mongoose.Types.ObjectId.isValid(branchId)
            ? new mongoose.Types.ObjectId(branchId)
            : branchId,
          status: 'active',
        },
      },
    ]);

    const totalGoals = ieps.reduce((acc, iep) => acc + (iep.annual_goals?.length || 0), 0);
    const masteredGoals = ieps.reduce(
      (acc, iep) => acc + (iep.annual_goals?.filter(g => g.mastery_achieved)?.length || 0),
      0
    );
    const avgProgress =
      ieps.length > 0
        ? ieps.reduce((acc, iep) => acc + (iep.overall_progress?.overall_percentage || 0), 0) /
          ieps.length
        : 0;

    // عدد حالات التوقف والتراجع
    let plateauCount = 0,
      regressionCount = 0;
    try {
      plateauCount = await EarlyWarningAlert.countDocuments({
        branch_id: branchId,
        alert_type: 'plateau',
        status: 'active',
      });
      regressionCount = await EarlyWarningAlert.countDocuments({
        branch_id: branchId,
        alert_type: 'regression',
        status: 'active',
      });
    } catch (e) {
      /* ignore if model not available */
    }

    const iepMasteryRate = totalGoals > 0 ? Math.round((masteredGoals / totalGoals) * 100) : 0;

    // حساب درجة الجودة الإجمالية
    let qualityScore = 0;
    qualityScore += Math.min(iepMasteryRate * 0.4, 40); // 40% وزن لنسبة إتقان الأهداف
    qualityScore += Math.min(avgProgress * 0.3, 30); // 30% متوسط التقدم
    qualityScore += ieps.length > 0 ? 20 : 0; // 20% وجود خطط نشطة
    qualityScore += plateauCount === 0 && regressionCount === 0 ? 10 : 5; // 10% لا تنبيهات

    let complianceLevel;
    if (qualityScore >= 85) complianceLevel = 'excellent';
    else if (qualityScore >= 70) complianceLevel = 'good';
    else if (qualityScore >= 55) complianceLevel = 'satisfactory';
    else if (qualityScore >= 40) complianceLevel = 'needs_improvement';
    else complianceLevel = 'non_compliant';

    const kpiData = {
      branch_id: branchId,
      period,
      progress_metrics: {
        iep_goals_mastered_rate: iepMasteryRate,
        beneficiaries_with_progress: ieps.filter(
          i => (i.overall_progress?.overall_percentage || 0) > 0
        ).length,
        beneficiaries_plateau: plateauCount,
        beneficiaries_regression: regressionCount,
        avg_progress_score: Math.round(avgProgress),
      },
      service_metrics: { active_beneficiaries: ieps.length },
      overall_quality_score: Math.round(qualityScore),
      carf_compliance_level: complianceLevel,
      improvement_areas: [],
    };

    if (iepMasteryRate < 30)
      kpiData.improvement_areas.push('تعزيز نسب إتقان الأهداف من خلال تكثيف الجلسات');
    if (plateauCount > 3)
      kpiData.improvement_areas.push('مراجعة برامج الحالات المتوقفة وتعديل التدخل');
    if (avgProgress < 40)
      kpiData.improvement_areas.push('رفع متوسط التقدم من خلال تدخلات أكثر تكثيفاً');

    const kpi = await QualityKPI.findOneAndUpdate({ branch_id: branchId, period }, kpiData, {
      upsert: true,
      new: true,
    });
    return kpi;
  }
}

// ═══════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════

// ── MDT Routes ──────────────────────────────────────────────────

router.post('/mdt/meetings', async (req, res) => {
  try {
    const meeting = new MDTMeeting(req.body);
    await meeting.save();
    res.status(201).json({ success: true, message: 'تم جدولة اجتماع الفريق', data: meeting });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/mdt/meetings/beneficiary/:id', async (req, res) => {
  try {
    const meetings = await MDTMeeting.find({ beneficiary_id: req.params.id }).sort({
      meeting_date: -1,
    });
    res.json({ success: true, count: meetings.length, data: meetings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/mdt/meetings/:id', async (req, res) => {
  try {
    const meeting = await MDTMeeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, error: 'الاجتماع غير موجود' });
    res.json({ success: true, data: meeting });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/mdt/meetings/:id', async (req, res) => {
  try {
    const meeting = await MDTMeeting.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!meeting) return res.status(404).json({ success: false, error: 'الاجتماع غير موجود' });
    res.json({ success: true, message: 'تم تحديث الاجتماع', data: meeting });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/mdt/meetings/:id/decisions/:decisionIndex/complete', async (req, res) => {
  try {
    const meeting = await MDTMeeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, error: 'الاجتماع غير موجود' });
    const idx = parseInt(req.params.decisionIndex);
    if (meeting.decisions[idx]) {
      meeting.decisions[idx].status = 'completed';
      await meeting.save();
    }
    res.json({ success: true, message: 'تم تسجيل إنجاز القرار' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/mdt/branch/:branchId/upcoming', async (req, res) => {
  try {
    const meetings = await MDTMeeting.find({
      branch_id: req.params.branchId,
      status: 'scheduled',
      meeting_date: { $gte: new Date() },
    })
      .sort({ meeting_date: 1 })
      .limit(20);
    res.json({ success: true, count: meetings.length, data: meetings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Transition Planning Routes ─────────────────────────────────

router.post('/transition/plans', async (req, res) => {
  try {
    const TRANSITION_LABELS = {
      center_to_kindergarten: 'الانتقال من المركز إلى الروضة',
      kindergarten_to_school: 'الانتقال من الروضة إلى المدرسة',
      child_to_adolescent: 'الانتقال من برنامج الأطفال إلى المراهقين',
      adolescent_to_adult: 'الانتقال من برنامج المراهقين إلى البالغين',
      center_to_community: 'الانتقال إلى خدمات المجتمع',
      between_programs: 'الانتقال بين البرامج',
      discharge: 'إنهاء الخدمة',
    };
    const planData = req.body;
    planData.transition_type_ar =
      TRANSITION_LABELS[planData.transition_type] || planData.transition_type;
    const plan = new TransitionPlan(planData);
    await plan.save();
    res.status(201).json({ success: true, message: 'تم إنشاء خطة الانتقال', data: plan });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/transition/plans/beneficiary/:id', async (req, res) => {
  try {
    const plans = await TransitionPlan.find({ beneficiary_id: req.params.id }).sort({
      createdAt: -1,
    });
    res.json({ success: true, count: plans.length, data: plans });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/transition/plans/:id', async (req, res) => {
  try {
    const plan = await TransitionPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, error: 'خطة الانتقال غير موجودة' });
    const readiness = plan.calculateReadiness();
    res.json({ success: true, readiness_percentage: readiness, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/transition/plans/:id', async (req, res) => {
  try {
    const plan = await TransitionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!plan) return res.status(404).json({ success: false, error: 'خطة الانتقال غير موجودة' });
    plan.calculateReadiness();
    await plan.save();
    res.json({ success: true, message: 'تم تحديث خطة الانتقال', data: plan });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/transition/plans/:id/readiness/:itemIndex', async (req, res) => {
  try {
    const plan = await TransitionPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, error: 'الخطة غير موجودة' });
    const idx = parseInt(req.params.itemIndex);
    if (plan.readiness_checklist[idx]) {
      plan.readiness_checklist[idx].ready = req.body.ready;
      plan.readiness_checklist[idx].current_level = req.body.current_level;
    }
    const readiness = plan.calculateReadiness();
    await plan.save();
    res.json({
      success: true,
      readiness_percentage: readiness,
      message: 'تم تحديث قائمة الجاهزية',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Quality KPI Routes ────────────────────────────────────────

router.get('/quality/kpis/:branchId', async (req, res) => {
  try {
    const { period } = req.query;
    const currentPeriod =
      period || `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
    const kpi = await KPICalculator.calculateBranchKPIs(req.params.branchId, currentPeriod);
    res.json({ success: true, data: kpi });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/quality/kpis/:branchId/history', async (req, res) => {
  try {
    const history = await QualityKPI.find({ branch_id: req.params.branchId })
      .sort({ createdAt: -1 })
      .limit(8);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/quality/dashboard/network', async (req, res) => {
  try {
    const currentPeriod = `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
    const allKPIs = await QualityKPI.find({ period: currentPeriod })
      .populate('branch_id', 'name city')
      .sort({ overall_quality_score: -1 });

    const avgScore =
      allKPIs.length > 0
        ? allKPIs.reduce((a, k) => a + k.overall_quality_score, 0) / allKPIs.length
        : 0;

    res.json({
      success: true,
      period: currentPeriod,
      network_average: Math.round(avgScore),
      branches_count: allKPIs.length,
      compliance_distribution: {
        excellent: allKPIs.filter(k => k.carf_compliance_level === 'excellent').length,
        good: allKPIs.filter(k => k.carf_compliance_level === 'good').length,
        satisfactory: allKPIs.filter(k => k.carf_compliance_level === 'satisfactory').length,
        needs_improvement: allKPIs.filter(k => k.carf_compliance_level === 'needs_improvement')
          .length,
        non_compliant: allKPIs.filter(k => k.carf_compliance_level === 'non_compliant').length,
      },
      data: allKPIs,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/quality/kpis/:branchId/action-plans', async (req, res) => {
  try {
    const { period } = req.body;
    const currentPeriod =
      period || `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
    const kpi = await QualityKPI.findOneAndUpdate(
      { branch_id: req.params.branchId, period: currentPeriod },
      { $push: { action_plans: req.body.action_plan } },
      { new: true, upsert: false }
    );
    if (!kpi)
      return res.status(404).json({ success: false, error: 'لا توجد بيانات جودة لهذه الفترة' });
    res.json({ success: true, message: 'تم إضافة خطة التحسين', data: kpi });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
