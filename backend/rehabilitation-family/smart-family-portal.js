/**
 * Smart Family Portal - Priority 4
 * بوابة الأسرة الذكية - تقارير مبسطة، أنشطة منزلية، دفتر التواصل الرقمي
 * Al-Awael ERP System
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Models ────────────────────────────────────────────────────────────────────

// دفتر التواصل الرقمي بين المعالج والأسرة
const HomeSchoolNotebookSchema = new Schema(
  {
    beneficiary_id: {
      type: Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    iep_id: { type: Schema.Types.ObjectId, ref: 'SmartIEP' },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    date: { type: Date, default: Date.now },
    entry_type: {
      type: String,
      enum: ['therapist_to_family', 'family_to_therapist', 'observation', 'achievement', 'concern'],
      required: true,
    },
    author_role: {
      type: String,
      enum: ['therapist', 'parent', 'teacher', 'supervisor'],
      required: true,
    },
    author_id: { type: Schema.Types.ObjectId },
    author_name_ar: { type: String },
    // محتوى الرسالة
    content_ar: { type: String, required: true },
    content_simplified: { type: String }, // نسخة مبسطة للأهل
    // الأنشطة المقترحة
    home_activities: [
      {
        activity_ar: String,
        duration_minutes: Number,
        frequency: String,
        materials_needed: [String],
        video_url: String,
        completed: { type: Boolean, default: false },
        family_feedback: String,
      },
    ],
    // نتائج ووصول الجلسة (للأهل)
    session_highlights: {
      goals_worked_ar: [String],
      achievements_ar: [String],
      areas_to_practice: [String],
      mood_emoji: String, // 😊 😐 😔
    },
    // حالة القراءة
    read_by_family: { type: Boolean, default: false },
    read_at: Date,
    family_acknowledged: { type: Boolean, default: false },
    // مرفقات
    attachments: [{ name: String, url: String, type: String }],
    priority: { type: String, enum: ['normal', 'important', 'urgent'], default: 'normal' },
  },
  { timestamps: true }
);

// أنشطة منزلية
const HomeActivityPlanSchema = new Schema(
  {
    beneficiary_id: {
      type: Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    iep_id: { type: Schema.Types.ObjectId, ref: 'SmartIEP' },
    week_start: { type: Date, required: true },
    week_end: { type: Date, required: true },
    generated_by: { type: String, default: 'smart_system' }, // smart_system أو therapist
    therapist_id: { type: Schema.Types.ObjectId },
    activities: [
      {
        day: {
          type: String,
          enum: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
        },
        goal_ref: { type: Schema.Types.ObjectId }, // مرتبط بهدف IEP
        goal_code: String,
        domain: String,
        activity_title_ar: String,
        activity_description_ar: String,
        duration_minutes: { type: Number, default: 15 },
        materials: [String],
        steps_ar: [String], // خطوات واضحة للأهل
        tips_ar: [String], // نصائح للأهل
        difficulty_level: { type: String, enum: ['سهل', 'متوسط', 'صعب'], default: 'سهل' },
        // تتبع التنفيذ
        completed: { type: Boolean, default: false },
        family_rating: { type: Number, min: 1, max: 5 },
        family_notes: String,
        completed_at: Date,
        child_response: { type: String, enum: ['ممتاز', 'جيد', 'صعب', 'رفض'] },
      },
    ],
    completion_rate: { type: Number, default: 0 },
    family_engagement_score: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'completed', 'expired'], default: 'active' },
  },
  { timestamps: true }
);

// مؤشر تفاعل الأسرة
const FamilyEngagementSchema = new Schema(
  {
    beneficiary_id: {
      type: Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    branch_id: { type: Schema.Types.ObjectId, ref: 'Branch' },
    month: { type: String, required: true }, // YYYY-MM
    metrics: {
      notebook_read_rate: { type: Number, default: 0 }, // % رسائل مقروءة
      activities_completion_rate: { type: Number, default: 0 }, // % أنشطة منجزة
      messages_sent: { type: Number, default: 0 }, // رسائل أرسلتها الأسرة
      meetings_attended: { type: Number, default: 0 }, // اجتماعات حضرتها الأسرة
      portal_visits: { type: Number, default: 0 }, // زيارات البوابة
    },
    engagement_level: {
      type: String,
      enum: ['ممتاز', 'جيد', 'متوسط', 'يحتاج دعم'],
      default: 'متوسط',
    },
    engagement_score: { type: Number, default: 0 }, // 0-100
    recommendations_ar: [String], // توصيات لتعزيز المشاركة
  },
  { timestamps: true }
);

const HomeSchoolNotebook = mongoose.model('HomeSchoolNotebook', HomeSchoolNotebookSchema);
const HomeActivityPlan = mongoose.model('HomeActivityPlan', HomeActivityPlanSchema);
const FamilyEngagement = mongoose.model('FamilyEngagement', FamilyEngagementSchema);

// ─── Home Activities Generator ──────────────────────────────────────────────────

// بنك الأنشطة المنزلية حسب المجال
const HOME_ACTIVITIES_BANK = {
  communication: [
    {
      title_ar: 'نشاط الطلب بالإشارة أو الكلمة',
      description_ar: 'شجع طفلك على طلب ما يريد باستخدام كلمة أو إشارة أو صورة',
      steps_ar: [
        'ضع الشيء المفضل بعيداً عن متناول الطفل',
        'انتظر وانظر إلى عينيه',
        'إذا مد يده، وجّهه لقول "أريد" أو إشارة الطلب',
        'أعطه الشيء فوراً مع المدح',
      ],
      duration_minutes: 10,
      materials: ['طعام مفضل', 'لعبة مفضلة'],
      tips_ar: ['كرر 5-10 مرات في اليوم', 'لا تعطه الشيء قبل أن يطلبه'],
      difficulty_level: 'سهل',
    },
    {
      title_ar: 'نشاط تسمية الصور',
      description_ar: 'تدريب الطفل على تسمية الأشياء من خلال الصور',
      steps_ar: [
        'احضر 3-5 بطاقات صور',
        'أظهر البطاقة وقل اسم الصورة بوضوح',
        'اطلب من الطفل تكرار الاسم',
        'امدح المحاولة ولو كانت تقريبية',
      ],
      duration_minutes: 15,
      materials: ['بطاقات صور', 'مكافأة صغيرة'],
      tips_ar: ['ابدأ بصور الأشياء التي يحبها', 'لا تصحح بشكل مفرط'],
      difficulty_level: 'سهل',
    },
    {
      title_ar: 'نشاط التسلسل اللغوي',
      description_ar: 'تدريب الطفل على ترتيب الكلمات لتكوين جمل بسيطة',
      steps_ar: [
        'استخدم صور الفعل + الاسم (مثل: أكل + تفاحة)',
        'ضعها أمام الطفل بالترتيب الخاطئ',
        'اطلب منه ترتيبها',
        'ساعده بنمذجة الجملة الصحيحة',
      ],
      duration_minutes: 20,
      materials: ['بطاقات صور الأفعال', 'بطاقات صور الأسماء'],
      tips_ar: ['ابدأ بجملتين فقط', 'استخدم مواقف الحياة اليومية'],
      difficulty_level: 'متوسط',
    },
  ],
  daily_living: [
    {
      title_ar: 'نشاط غسل اليدين المستقل',
      description_ar: 'تعليم الطفل غسل يديه بشكل مستقل خطوة بخطوة',
      steps_ar: [
        'ضع صور الخطوات بجانب الحوض',
        'افتح الصنبور معه أول مرة',
        'وجّهه ليضع الصابون',
        'دلّل على كل خطوة بالصورة',
        'اتركه يجرب وحده في المرة التالية',
      ],
      duration_minutes: 5,
      materials: ['صور خطوات غسل اليدين', 'صابون سائل'],
      tips_ar: ['طبّق عند كل وجبة', 'امدح الجهد لا النتيجة فقط'],
      difficulty_level: 'سهل',
    },
    {
      title_ar: 'نشاط ارتداء الملابس',
      description_ar: 'تدريب الطفل على ارتداء قطعة ملابس بسيطة',
      steps_ar: [
        'ابدأ بقطعة واحدة فقط (مثل: الجوارب)',
        'اعرض له كيفية الارتداء أولاً',
        'ساعده بالتوجيه اليدوي',
        'تدريجياً قلل من المساعدة',
      ],
      duration_minutes: 10,
      materials: ['ملابس بسيطة واسعة'],
      tips_ar: ['اختر الوقت المناسب (غير المتسرع)', 'احتفل بكل تقدم'],
      difficulty_level: 'متوسط',
    },
  ],
  socialization: [
    {
      title_ar: 'نشاط التناوب مع الأشقاء',
      description_ar: 'تعليم الطفل مفهوم الدور والانتظار في اللعب',
      steps_ar: [
        'اختر لعبة يحبها (مثل: كرة، لعبة تجميع)',
        'العب أنت أولاً مع الإشارة "دوري"',
        'أعطه اللعبة مع قول "دورك"',
        'انتظر 30 ثانية ثم خذها بلطف "دوري"',
        'كرر 5 مرات',
      ],
      duration_minutes: 15,
      materials: ['لعبة مفضلة'],
      tips_ar: ['ابدأ بدورات قصيرة جداً', 'استخدم timer مرئي'],
      difficulty_level: 'متوسط',
    },
    {
      title_ar: 'نشاط مشاركة الطعام',
      description_ar: 'تعليم مهارة العطاء والمشاركة',
      steps_ar: [
        'ضع قطعة من الطعام أمامه',
        'مد يدك وقل "شاركني"',
        'إذا أعطاك، امدحه بحرارة',
        'أعطه في المقابل قطعة من طعامه المفضل',
      ],
      duration_minutes: 5,
      materials: ['وجبة خفيفة'],
      tips_ar: ['لا تجبره', 'ابدأ بشيء لا يحبه كثيراً'],
      difficulty_level: 'سهل',
    },
  ],
  motor_skills: [
    {
      title_ar: 'نشاط التقطيع بالمقص',
      description_ar: 'تطوير مهارة قص الورق لتعزيز المهارات الحركية الدقيقة',
      steps_ar: [
        'استخدم مقص آمن للأطفال',
        'ارسم خطاً غليظاً على الورق',
        'أمسك يده معاً أول مرة',
        'تدريجياً أمسك فقط الورق',
        'اتركه يقص وحده',
      ],
      duration_minutes: 15,
      materials: ['مقص آمن', 'ورق سميك', 'قلم'],
      tips_ar: ['تدرّج من الخط المستقيم للمنحنى', 'امدح المحاولة'],
      difficulty_level: 'متوسط',
    },
    {
      title_ar: 'نشاط الكرة الحركية',
      description_ar: 'تطوير التوازن والتنسيق من خلال ألعاب الكرة',
      steps_ar: [
        'اجلس على الأرض أمامه',
        'دحرج الكرة نحوه',
        'وجّهه لدحرجتها نحوك',
        'تدريجياً ابعد المسافة',
        'جرب الرمي من الوقوف',
      ],
      duration_minutes: 15,
      materials: ['كرة ناعمة متوسطة الحجم'],
      tips_ar: ['ابدأ بمسافة قريبة', 'انتبه لبيئة آمنة'],
      difficulty_level: 'سهل',
    },
  ],
  cognitive: [
    {
      title_ar: 'نشاط التصنيف واللون',
      description_ar: 'تطوير المهارات المعرفية من خلال تصنيف الأشياء',
      steps_ar: [
        'احضر أشياء بألوان مختلفة',
        'ضع وعاءين بلونين مختلفين',
        'أعطه شيئاً وقل "في الوعاء الأحمر"',
        'كرر مع تقليل التوجيه تدريجياً',
      ],
      duration_minutes: 15,
      materials: ['أشياء ملونة صغيرة', 'وعاءان بلونين مختلفين'],
      tips_ar: ['ابدأ بلونين فقط', 'استخدم أشياء يحبها الطفل'],
      difficulty_level: 'سهل',
    },
    {
      title_ar: 'نشاط المطابقة والتشابه',
      description_ar: 'تدريب الطفل على مطابقة الأشياء المتشابهة',
      steps_ar: [
        'احضر 3 أزواج من الأشياء المتشابهة',
        'ضع نسخة واحدة من كل زوج أمامه',
        'أعطه نسخة واحدة واطلب "مثله فين"',
        'وجّهه للمطابقة الصحيحة',
      ],
      duration_minutes: 15,
      materials: ['أزواج من الأشياء المتشابهة'],
      tips_ar: ['ابدأ بزوجين فقط', 'استخدم أشياء حياتية مألوفة'],
      difficulty_level: 'سهل',
    },
  ],
};

// ─── Services ───────────────────────────────────────────────────────────────────

class HomeActivityService {
  /**
   * توليد خطة نشاط أسبوعية ذكية بناءً على أهداف IEP
   */
  static async generateWeeklyPlan(beneficiaryId, iepGoals, weekStart) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
    const activities = [];

    // توزيع الأهداف على أيام الأسبوع
    const activeGoals = iepGoals.filter(g => !g.mastery_achieved).slice(0, 3); // أهم 3 أهداف

    if (activeGoals.length === 0) {
      // إذا لم تكن هناك أهداف نشطة، استخدم أنشطة عامة
      DAYS.forEach((day, idx) => {
        const domainKeys = Object.keys(HOME_ACTIVITIES_BANK);
        const domain = domainKeys[idx % domainKeys.length];
        const bankActivities = HOME_ACTIVITIES_BANK[domain];
        const activity = bankActivities[Math.floor(Math.random() * bankActivities.length)];
        activities.push({
          day,
          ...activity,
          domain,
          difficulty_level: activity.difficulty_level || 'سهل',
        });
      });
    } else {
      // توزيع الأهداف على أيام الأسبوع
      DAYS.forEach((day, idx) => {
        const goal = activeGoals[idx % activeGoals.length];
        const domain = goal.domain || 'communication';
        const bankActivities = HOME_ACTIVITIES_BANK[domain] || HOME_ACTIVITIES_BANK.communication;
        const activity = bankActivities[Math.floor(Math.random() * bankActivities.length)];

        activities.push({
          day,
          goal_ref: goal._id,
          goal_code: goal.goal_code || '',
          domain,
          activity_title_ar: activity.title_ar,
          activity_description_ar: activity.description_ar,
          steps_ar: activity.steps_ar,
          materials: activity.materials,
          tips_ar: activity.tips_ar,
          duration_minutes: activity.duration_minutes,
          difficulty_level: activity.difficulty_level,
        });
      });
    }

    const plan = new HomeActivityPlan({
      beneficiary_id: beneficiaryId,
      week_start: weekStart,
      week_end: weekEnd,
      activities,
      generated_by: 'smart_system',
    });

    await plan.save();
    return plan;
  }

  /**
   * حساب نسبة الإنجاز الأسبوعية
   */
  static async calculateCompletionRate(planId) {
    const plan = await HomeActivityPlan.findById(planId);
    if (!plan) return null;

    const total = plan.activities.length;
    const completed = plan.activities.filter(a => a.completed).length;
    plan.completion_rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // حساب درجة تفاعل الأسرة
    const ratings = plan.activities.filter(a => a.family_rating).map(a => a.family_rating);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b) / ratings.length : 0;
    plan.family_engagement_score = Math.round(plan.completion_rate * 0.7 + avgRating * 6);

    await plan.save();
    return {
      completion_rate: plan.completion_rate,
      engagement_score: plan.family_engagement_score,
    };
  }
}

class FamilyEngagementService {
  /**
   * حساب مؤشر تفاعل الأسرة للشهر
   */
  static async calculateMonthlyEngagement(beneficiaryId, month) {
    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 0);

    // عدد الرسائل المقروءة
    const totalMessages = await HomeSchoolNotebook.countDocuments({
      beneficiary_id: beneficiaryId,
      entry_type: 'therapist_to_family',
      date: { $gte: startDate, $lte: endDate },
    });
    const readMessages = await HomeSchoolNotebook.countDocuments({
      beneficiary_id: beneficiaryId,
      entry_type: 'therapist_to_family',
      read_by_family: true,
      date: { $gte: startDate, $lte: endDate },
    });

    // عدد الأنشطة المنجزة
    const plans = await HomeActivityPlan.find({
      beneficiary_id: beneficiaryId,
      week_start: { $gte: startDate, $lte: endDate },
    });
    let totalActivities = 0;
    let completedActivities = 0;
    plans.forEach(p => {
      totalActivities += p.activities.length;
      completedActivities += p.activities.filter(a => a.completed).length;
    });

    // رسائل أرسلتها الأسرة
    const familyMessages = await HomeSchoolNotebook.countDocuments({
      beneficiary_id: beneficiaryId,
      author_role: 'parent',
      date: { $gte: startDate, $lte: endDate },
    });

    const readRate = totalMessages > 0 ? Math.round((readMessages / totalMessages) * 100) : 0;
    const activityRate =
      totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;

    // حساب الدرجة الإجمالية (0-100)
    const score = Math.round(
      readRate * 0.3 + activityRate * 0.5 + Math.min(familyMessages * 5, 20)
    );

    let engagementLevel;
    if (score >= 80) engagementLevel = 'ممتاز';
    else if (score >= 60) engagementLevel = 'جيد';
    else if (score >= 40) engagementLevel = 'متوسط';
    else engagementLevel = 'يحتاج دعم';

    // توصيات
    const recommendations = [];
    if (readRate < 60) recommendations.push('يُنصح بالاطلاع على رسائل المعالج يومياً عبر البوابة');
    if (activityRate < 50)
      recommendations.push('حاول إنجاز نشاط واحد يومياً مع طفلك لمدة 15 دقيقة');
    if (familyMessages === 0)
      recommendations.push('شارك ملاحظاتك وأسئلتك مع المعالج عبر دفتر التواصل');

    const engagement = await FamilyEngagement.findOneAndUpdate(
      { beneficiary_id: beneficiaryId, month },
      {
        metrics: {
          notebook_read_rate: readRate,
          activities_completion_rate: activityRate,
          messages_sent: familyMessages,
        },
        engagement_score: score,
        engagement_level: engagementLevel,
        recommendations_ar: recommendations,
      },
      { upsert: true, new: true }
    );

    return engagement;
  }
}

// ─── Report Generator (للأهل بلغة مبسطة) ─────────────────────────────────────

class FamilyReportService {
  /**
   * توليد تقرير مبسط للأسرة باللغة العربية
   */
  static async generateSimplifiedReport(beneficiaryId, iepId) {
    const { SmartIEP } = require('../models/SmartIEP');

    const iep = await SmartIEP.findById(iepId)
      .populate('beneficiary_id', 'name birth_date disability_types')
      .populate('annual_goals.goal_bank_ref', 'goal_code goal_ar');

    if (!iep) throw new Error('الخطة غير موجودة');

    const beneficiary = iep.beneficiary_id;
    const goals = iep.annual_goals;

    // تصنيف الأهداف
    const masteredGoals = goals.filter(g => g.mastery_achieved);
    const inProgressGoals = goals.filter(g => !g.mastery_achieved && g.current_accuracy >= 50);
    const needsSupportGoals = goals.filter(g => !g.mastery_achieved && g.current_accuracy < 50);

    // بناء التقرير المبسط
    const report = {
      child_name: beneficiary.name,
      report_date: new Date().toLocaleDateString('ar-SA'),
      period: `${new Date(iep.plan_start).toLocaleDateString('ar-SA')} - ${new Date(iep.plan_end).toLocaleDateString('ar-SA')}`,
      overall_progress_percentage: iep.overall_progress?.overall_percentage || 0,
      overall_message: '',
      achievements: masteredGoals.map(g => ({
        goal: g.annual_goal_ar,
        achievement: `أتقن طفلك هذه المهارة بنسبة ${g.current_accuracy}% 🎉`,
        emoji: '✅',
      })),
      in_progress: inProgressGoals.map(g => ({
        goal: g.annual_goal_ar,
        progress: `يتقدم بشكل جيد - وصل إلى ${g.current_accuracy}%`,
        emoji: '📈',
      })),
      needs_support: needsSupportGoals.map(g => ({
        goal: g.annual_goal_ar,
        note: 'هذه المهارة تحتاج مزيداً من التدريب والممارسة المنزلية',
        emoji: '💪',
      })),
      motivation_message: '',
      next_steps: [],
    };

    // رسالة التشجيع
    const percentage = report.overall_progress_percentage;
    if (percentage >= 80) {
      report.overall_message = `ممتاز! طفلك يحقق تقدماً رائعاً بنسبة ${percentage}% 🌟`;
      report.motivation_message =
        'استمروا في الممارسة المنزلية المنتظمة، فهي السر في هذا التقدم المذهل!';
    } else if (percentage >= 50) {
      report.overall_message = `طفلك يتقدم بشكل جيد بنسبة ${percentage}% 👍`;
      report.motivation_message = 'التقدم يحتاج صبراً ومثابرة، وأنتم على الطريق الصحيح!';
    } else {
      report.overall_message = `طفلك في بداية رحلة التعلم - ${percentage}% تقدم حتى الآن 🌱`;
      report.motivation_message =
        'كل خطوة صغيرة هي إنجاز كبير. الممارسة اليومية ستحدث فرقاً كبيراً!';
    }

    // الخطوات القادمة
    if (needsSupportGoals.length > 0) {
      report.next_steps.push(
        `ركّزوا على ممارسة: "${needsSupportGoals[0].annual_goal_ar}" في المنزل`
      );
    }
    report.next_steps.push('تواصلوا مع المعالج إذا لاحظتم أي تغيير في سلوك طفلكم');
    report.next_steps.push('احضروا جلسة المراجعة القادمة لمناقشة التقدم معاً');

    return report;
  }
}

// ─── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /notebook
 * إضافة مدخل في دفتر التواصل
 */
router.post('/notebook', async (req, res) => {
  try {
    const {
      beneficiary_id,
      iep_id,
      branch_id,
      entry_type,
      author_role,
      author_name_ar,
      content_ar,
      home_activities,
      session_highlights,
      priority,
    } = req.body;

    if (!beneficiary_id || !branch_id || !content_ar || !entry_type || !author_role) {
      return res
        .status(400)
        .json({
          success: false,
          error: 'الحقول المطلوبة: beneficiary_id, branch_id, content_ar, entry_type, author_role',
        });
    }

    const entry = new HomeSchoolNotebook({
      beneficiary_id,
      iep_id,
      branch_id,
      entry_type,
      author_role,
      author_name_ar,
      content_ar,
      home_activities,
      session_highlights,
      priority,
    });

    await entry.save();
    res.status(201).json({
      success: true,
      message:
        entry_type === 'therapist_to_family'
          ? 'تم إرسال الرسالة للأسرة بنجاح'
          : 'تم تسجيل ملاحظة الأسرة بنجاح',
      data: entry,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /notebook/:beneficiaryId
 * جلب دفتر التواصل للمستفيد
 * Query: limit, entry_type
 */
router.get('/notebook/:beneficiaryId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const filter = { beneficiary_id: req.params.beneficiaryId };
    if (req.query.entry_type) filter.entry_type = req.query.entry_type;

    const entries = await HomeSchoolNotebook.find(filter).sort({ date: -1 }).limit(limit);

    const unreadCount = await HomeSchoolNotebook.countDocuments({
      beneficiary_id: req.params.beneficiaryId,
      entry_type: 'therapist_to_family',
      read_by_family: false,
    });

    res.json({
      success: true,
      unread_count: unreadCount,
      count: entries.length,
      data: entries,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /notebook/:entryId/read
 * تسجيل قراءة رسالة من قبل الأسرة
 */
router.patch('/notebook/:entryId/read', async (req, res) => {
  try {
    const entry = await HomeSchoolNotebook.findByIdAndUpdate(
      req.params.entryId,
      {
        read_by_family: true,
        read_at: new Date(),
        family_acknowledged: req.body.acknowledged || false,
      },
      { new: true }
    );
    if (!entry) return res.status(404).json({ success: false, error: 'المدخل غير موجود' });

    res.json({ success: true, message: 'تم تسجيل القراءة', data: entry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /activities/generate/:beneficiaryId
 * توليد خطة أنشطة منزلية أسبوعية
 * Body: { iep_id, week_start }
 */
router.post('/activities/generate/:beneficiaryId', async (req, res) => {
  try {
    const { iep_id, week_start } = req.body;

    let iepGoals = [];
    if (iep_id) {
      const { SmartIEP } = require('../models/SmartIEP');
      const iep = await SmartIEP.findById(iep_id).select('annual_goals');
      if (iep) iepGoals = iep.annual_goals;
    }

    const weekStartDate = week_start ? new Date(week_start) : new Date();
    // اجعلها تبدأ من السبت
    const day = weekStartDate.getDay();
    const diff = day === 6 ? 0 : (6 - day + 7) % 7;
    weekStartDate.setDate(weekStartDate.getDate() - diff);

    const plan = await HomeActivityService.generateWeeklyPlan(
      req.params.beneficiaryId,
      iepGoals,
      weekStartDate
    );

    res.status(201).json({
      success: true,
      message: 'تم توليد خطة الأنشطة الأسبوعية بنجاح',
      data: plan,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /activities/:beneficiaryId/current
 * جلب خطة الأنشطة الأسبوعية الحالية
 */
router.get('/activities/:beneficiaryId/current', async (req, res) => {
  try {
    const now = new Date();
    const plan = await HomeActivityPlan.findOne({
      beneficiary_id: req.params.beneficiaryId,
      week_start: { $lte: now },
      week_end: { $gte: now },
    }).sort({ createdAt: -1 });

    if (!plan) {
      return res.json({ success: true, data: null, message: 'لا توجد خطة أنشطة لهذا الأسبوع' });
    }

    const completedCount = plan.activities.filter(a => a.completed).length;
    res.json({
      success: true,
      completion_rate: plan.completion_rate,
      completed: completedCount,
      total: plan.activities.length,
      data: plan,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /activities/:planId/activity/:activityIndex/complete
 * تسجيل إنجاز نشاط
 * Body: { family_rating, child_response, family_notes }
 */
router.patch('/activities/:planId/activity/:activityIndex/complete', async (req, res) => {
  try {
    const plan = await HomeActivityPlan.findById(req.params.planId);
    if (!plan) return res.status(404).json({ success: false, error: 'الخطة غير موجودة' });

    const idx = parseInt(req.params.activityIndex);
    if (idx < 0 || idx >= plan.activities.length) {
      return res.status(400).json({ success: false, error: 'رقم النشاط غير صحيح' });
    }

    plan.activities[idx].completed = true;
    plan.activities[idx].completed_at = new Date();
    plan.activities[idx].family_rating = req.body.family_rating;
    plan.activities[idx].child_response = req.body.child_response;
    plan.activities[idx].family_notes = req.body.family_notes;

    await plan.save();
    await HomeActivityService.calculateCompletionRate(plan._id);

    res.json({
      success: true,
      message: 'أحسنت! تم تسجيل النشاط بنجاح 🎉',
      completion_rate: plan.completion_rate,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /report/:beneficiaryId/:iepId
 * تقرير تقدم مبسط للأسرة
 */
router.get('/report/:beneficiaryId/:iepId', async (req, res) => {
  try {
    const report = await FamilyReportService.generateSimplifiedReport(
      req.params.beneficiaryId,
      req.params.iepId
    );
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /engagement/:beneficiaryId
 * مؤشر تفاعل الأسرة
 * Query: month (YYYY-MM)
 */
router.get('/engagement/:beneficiaryId', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().substring(0, 7);
    const engagement = await FamilyEngagementService.calculateMonthlyEngagement(
      req.params.beneficiaryId,
      month
    );
    res.json({ success: true, data: engagement });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /dashboard/:beneficiaryId
 * لوحة تحكم الأسرة الشاملة
 */
router.get('/dashboard/:beneficiaryId', async (req, res) => {
  try {
    const beneficiaryId = req.params.beneficiaryId;
    const month = new Date().toISOString().substring(0, 7);
    const now = new Date();

    // جلب البيانات بالتوازي
    const [unreadMessages, currentPlan, engagement, recentEntries] = await Promise.all([
      HomeSchoolNotebook.countDocuments({
        beneficiary_id: beneficiaryId,
        entry_type: 'therapist_to_family',
        read_by_family: false,
      }),
      HomeActivityPlan.findOne({
        beneficiary_id: beneficiaryId,
        week_start: { $lte: now },
        week_end: { $gte: now },
      }),
      FamilyEngagementService.calculateMonthlyEngagement(beneficiaryId, month),
      HomeSchoolNotebook.find({ beneficiary_id: beneficiaryId })
        .sort({ date: -1 })
        .limit(3)
        .select('entry_type content_ar date author_role priority read_by_family'),
    ]);

    const weeklyProgress = currentPlan
      ? {
          completion_rate: currentPlan.completion_rate,
          completed: currentPlan.activities.filter(a => a.completed).length,
          total: currentPlan.activities.length,
          today_activity: currentPlan.activities.find(a => {
            const DAYS_AR = [
              'الأحد',
              'الاثنين',
              'الثلاثاء',
              'الأربعاء',
              'الخميس',
              'الجمعة',
              'السبت',
            ];
            return a.day === DAYS_AR[now.getDay()];
          }),
        }
      : null;

    res.json({
      success: true,
      data: {
        unread_messages: unreadMessages,
        weekly_activities: weeklyProgress,
        engagement_this_month: {
          level: engagement.engagement_level,
          score: engagement.engagement_score,
          recommendations: engagement.recommendations_ar,
        },
        recent_communications: recentEntries,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /branch/:branchId/engagement-summary
 * ملخص تفاعل الأسر للفرع (للإدارة)
 */
router.get('/branch/:branchId/engagement-summary', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().substring(0, 7);

    const summary = await FamilyEngagement.aggregate([
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
          'beneficiary.branch_id': mongoose.Types.ObjectId.isValid(req.params.branchId)
            ? new mongoose.Types.ObjectId(req.params.branchId)
            : req.params.branchId,
          month,
        },
      },
      {
        $group: {
          _id: '$engagement_level',
          count: { $sum: 1 },
          avg_score: { $avg: '$engagement_score' },
        },
      },
    ]);

    const total = summary.reduce((acc, s) => acc + s.count, 0);
    res.json({
      success: true,
      month,
      total_families: total,
      distribution: summary,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
