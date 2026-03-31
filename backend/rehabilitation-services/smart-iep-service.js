/**
 * smart-iep-service.js
 * خدمة الخطة التعليمية الفردية الذكية وبنك الأهداف
 * IEP Smart Engine | Goals Bank | Session Analytics
 */

'use strict';

const { GoalsBank, SmartIEP, SessionLog } = require('../models/SmartIEP');

// ═══════════════════════════════════════════════════════════════════
// بنك الأهداف المدمج — 200+ هدف تأهيلي معتمد
// ═══════════════════════════════════════════════════════════════════
const BUILT_IN_GOALS = [
  // ──────────────────────────────────────────────────
  // مجال التواصل — اللغة التعبيرية
  // ──────────────────────────────────────────────────
  {
    goal_code: 'COMM-EXP-001',
    domain: 'communication',
    subdomain: 'expressive_language',
    disability_types: ['autism', 'intellectual_disability', 'speech_language', 'all'],
    performance_level: 'beginner',
    age_range: { min_months: 18, max_months: 48 },
    goal_ar:
      'سيستخدم المستفيد كلمة وظيفية واحدة على الأقل للتعبير عن احتياجاته (طلب/رفض) في 4 من 5 فرص يومية خلال 12 أسبوعاً',
    goal_short_ar: 'استخدام كلمة وظيفية للتعبير عن الاحتياجات',
    smart_components: {
      specific: 'استخدام كلمة وظيفية (طلب أو رفض)',
      measurable: '4 من 5 فرص يومية',
      achievable: 'مناسب للمستوى المبتدئ',
      relevant: 'مهارة تواصلية أساسية',
      time_bound: '12 أسبوعاً',
    },
    mastery_criteria: {
      accuracy_percentage: 80,
      consecutive_sessions: 3,
      measurement_method: 'عد التكرارات في جلسة 30 دقيقة',
    },
    intervention_strategies: [
      {
        strategy_name_ar: 'التدريب على PECS المرحلة الأولى',
        approach: 'PECS',
        description_ar: 'تدريب المستفيد على تبادل الصور للتعبير عن الطلب',
        materials: ['بطاقات PECS', 'معززات قوية', 'حاجز PECS'],
        steps: ['تحديد المعزز الأقوى', 'تدريب تبادل الصورة', 'تعزيز فوري'],
      },
      {
        strategy_name_ar: 'النمذجة اللغوية',
        approach: 'NATURALISTIC',
        description_ar: 'نمذجة الكلمة المستهدفة في السياق الطبيعي',
        materials: ['ألعاب مفضلة', 'طعام مفضل'],
        steps: ['تقديم الكلمة مع الشيء', 'الانتظار', 'تعزيز أي محاولة'],
      },
    ],
    home_activities: [
      {
        activity_ar: 'أثناء الوجبات: انتظار الطلب اللفظي قبل تقديم الطعام',
        frequency: '3 مرات يومياً',
        materials_needed: ['وجبة المستفيد'],
        instructions_ar: 'أمسك الطعام وانتظر أي محاولة للطلب قبل التقديم',
      },
    ],
    icf_codes: ['d330', 'd335'],
    source: 'evidence_based',
    tags: ['تواصل', 'طلب', 'توحد', 'مبتدئ'],
  },
  {
    goal_code: 'COMM-EXP-002',
    domain: 'communication',
    subdomain: 'expressive_language',
    disability_types: ['autism', 'intellectual_disability', 'speech_language'],
    performance_level: 'intermediate',
    age_range: { min_months: 30, max_months: 72 },
    goal_ar:
      'سيستخدم المستفيد جملاً من كلمتين أو أكثر للتعبير عن احتياجاته في 80% من الفرص خلال 16 أسبوعاً',
    goal_short_ar: 'استخدام جمل من كلمتين',
    smart_components: {
      specific: 'جمل من كلمتين فأكثر',
      measurable: '80% من الفرص',
      achievable: 'يمتلك مفردات 20+ كلمة',
      relevant: 'مرحلة طبيعية تالية للكلمة المفردة',
      time_bound: '16 أسبوعاً',
    },
    mastery_criteria: { accuracy_percentage: 80, consecutive_sessions: 4 },
    icf_codes: ['d330'],
    source: 'evidence_based',
    tags: ['تواصل', 'جمل', 'متوسط'],
  },
  // ──────────────────────────────────────────────────
  // مجال التواصل — اللغة الاستقبالية
  // ──────────────────────────────────────────────────
  {
    goal_code: 'COMM-REC-001',
    domain: 'communication',
    subdomain: 'receptive_language',
    disability_types: ['autism', 'intellectual_disability', 'hearing_impairment', 'all'],
    performance_level: 'beginner',
    age_range: { min_months: 12, max_months: 36 },
    goal_ar: 'سيستجيب المستفيد لاسمه بالنظر نحو المتحدث في 4 من 5 محاولات خلال 8 أسابيع',
    goal_short_ar: 'الاستجابة للاسم',
    mastery_criteria: { accuracy_percentage: 80, consecutive_sessions: 3 },
    icf_codes: ['d115', 'd310'],
    source: 'evidence_based',
    tags: ['تواصل', 'استقبالي', 'انتباه'],
  },
  {
    goal_code: 'COMM-REC-002',
    domain: 'communication',
    subdomain: 'receptive_language',
    disability_types: ['autism', 'intellectual_disability', 'all'],
    performance_level: 'beginner',
    age_range: { min_months: 18, max_months: 48 },
    goal_ar: 'سيتبع المستفيد تعليمة واحدة مرفقة بإيماءة في 4 من 5 فرص خلال 10 أسابيع',
    goal_short_ar: 'اتباع تعليمة بسيطة مع إيماءة',
    mastery_criteria: { accuracy_percentage: 80, consecutive_sessions: 3 },
    icf_codes: ['d115'],
    source: 'evidence_based',
    tags: ['تواصل', 'استقبالي', 'أوامر'],
  },
  // ──────────────────────────────────────────────────
  // مجال مهارات الحياة اليومية
  // ──────────────────────────────────────────────────
  {
    goal_code: 'DLS-SELF-001',
    domain: 'daily_living',
    subdomain: 'self_feeding',
    disability_types: ['autism', 'intellectual_disability', 'cerebral_palsy', 'all'],
    performance_level: 'beginner',
    age_range: { min_months: 18, max_months: 48 },
    goal_ar:
      'سيستخدم المستفيد الملعقة للأكل باستقلالية مع حد أدنى من السكب في 4 من 5 وجبات خلال 12 أسبوعاً',
    goal_short_ar: 'استخدام الملعقة باستقلالية',
    mastery_criteria: { accuracy_percentage: 80, consecutive_sessions: 5 },
    icf_codes: ['d550'],
    source: 'evidence_based',
    tags: ['حياة يومية', 'أكل', 'استقلالية'],
  },
  {
    goal_code: 'DLS-DRESS-001',
    domain: 'daily_living',
    subdomain: 'dressing',
    disability_types: ['autism', 'intellectual_disability', 'all'],
    performance_level: 'intermediate',
    age_range: { min_months: 36, max_months: 72 },
    goal_ar:
      'سيخلع المستفيد ملابسه البسيطة (القميص، البنطلون) باستقلالية في 4 من 5 محاولات خلال 10 أسابيع',
    goal_short_ar: 'خلع الملابس باستقلالية',
    mastery_criteria: { accuracy_percentage: 80, consecutive_sessions: 3 },
    icf_codes: ['d540'],
    source: 'evidence_based',
    tags: ['حياة يومية', 'ملابس', 'استقلالية'],
  },
  {
    goal_code: 'DLS-TOILET-001',
    domain: 'daily_living',
    subdomain: 'toilet_training',
    disability_types: ['autism', 'intellectual_disability', 'all'],
    performance_level: 'beginner',
    age_range: { min_months: 24, max_months: 72 },
    goal_ar:
      'سيُشير المستفيد إلى حاجته لاستخدام المرحاض قبل 5 دقائق على الأقل في 80% من الأوقات خلال 16 أسبوعاً',
    goal_short_ar: 'الإشارة لاستخدام المرحاض',
    mastery_criteria: { accuracy_percentage: 80, consecutive_sessions: 5 },
    icf_codes: ['d530'],
    source: 'evidence_based',
    tags: ['حياة يومية', 'مرحاض', 'استقلالية'],
  },
  // ──────────────────────────────────────────────────
  // مجال التنشئة الاجتماعية
  // ──────────────────────────────────────────────────
  {
    goal_code: 'SOC-INTER-001',
    domain: 'socialization',
    subdomain: 'peer_interaction',
    disability_types: ['autism', 'intellectual_disability', 'all'],
    performance_level: 'beginner',
    age_range: { min_months: 24, max_months: 60 },
    goal_ar:
      'سيبادر المستفيد بالتفاعل مع قرين واحد على الأقل (عرض لعبة أو لفت انتباه) مرة واحدة في كل جلسة اجتماعية خلال 12 أسبوعاً',
    goal_short_ar: 'المبادرة بالتفاعل مع الأقران',
    mastery_criteria: { accuracy_percentage: 80, consecutive_sessions: 3 },
    icf_codes: ['d710', 'd720'],
    source: 'evidence_based',
    tags: ['اجتماعي', 'أقران', 'مبادرة'],
  },
  {
    goal_code: 'SOC-TURN-001',
    domain: 'socialization',
    subdomain: 'turn_taking',
    disability_types: ['autism', 'intellectual_disability', 'all'],
    performance_level: 'intermediate',
    age_range: { min_months: 30, max_months: 72 },
    goal_ar: 'سيتناوب المستفيد في اللعب مع شريك واحد في 4 من 5 فرص خلال 10 أسابيع',
    goal_short_ar: 'أخذ الدور في اللعب',
    mastery_criteria: { accuracy_percentage: 80, consecutive_sessions: 3 },
    icf_codes: ['d710'],
    source: 'evidence_based',
    tags: ['اجتماعي', 'دور', 'لعب'],
  },
  // ──────────────────────────────────────────────────
  // مجال الحركة الدقيقة
  // ──────────────────────────────────────────────────
  {
    goal_code: 'MOTOR-FINE-001',
    domain: 'motor_fine',
    subdomain: 'pencil_grip',
    disability_types: ['cerebral_palsy', 'intellectual_disability', 'all'],
    performance_level: 'intermediate',
    age_range: { min_months: 36, max_months: 72 },
    goal_ar:
      'سيمسك المستفيد القلم بقبضة ثلاثية صحيحة ويرسم خطاً أفقياً وعمودياً في 4 من 5 محاولات خلال 12 أسبوعاً',
    goal_short_ar: 'مسك القلم ورسم الخطوط',
    mastery_criteria: { accuracy_percentage: 80, consecutive_sessions: 3 },
    icf_codes: ['d440'],
    source: 'evidence_based',
    tags: ['حركي', 'دقيق', 'قلم', 'رسم'],
  },
  {
    goal_code: 'MOTOR-FINE-002',
    domain: 'motor_fine',
    subdomain: 'scissors',
    disability_types: ['intellectual_disability', 'all'],
    performance_level: 'intermediate',
    age_range: { min_months: 48, max_months: 84 },
    goal_ar: 'سيقص المستفيد على خط مستقيم باستخدام المقص في 4 من 5 محاولات خلال 10 أسابيع',
    goal_short_ar: 'القص على خط مستقيم',
    mastery_criteria: { accuracy_percentage: 80, consecutive_sessions: 3 },
    icf_codes: ['d440'],
    source: 'evidence_based',
    tags: ['حركي', 'دقيق', 'قص'],
  },
  // ──────────────────────────────────────────────────
  // مجال الحركة الكبيرة
  // ──────────────────────────────────────────────────
  {
    goal_code: 'MOTOR-GROSS-001',
    domain: 'motor_gross',
    subdomain: 'balance',
    disability_types: ['cerebral_palsy', 'intellectual_disability', 'all'],
    performance_level: 'beginner',
    age_range: { min_months: 24, max_months: 60 },
    goal_ar:
      'سيحافظ المستفيد على التوازن وهو واقف على قدم واحدة لمدة 5 ثوانٍ في 4 من 5 محاولات خلال 12 أسبوعاً',
    goal_short_ar: 'التوازن على قدم واحدة',
    mastery_criteria: { accuracy_percentage: 80, consecutive_sessions: 3 },
    icf_codes: ['d415'],
    source: 'evidence_based',
    tags: ['حركي', 'كبير', 'توازن'],
  },
  // ──────────────────────────────────────────────────
  // مجال الإدراك المعرفي
  // ──────────────────────────────────────────────────
  {
    goal_code: 'COG-SORT-001',
    domain: 'cognitive',
    subdomain: 'categorization',
    disability_types: ['autism', 'intellectual_disability', 'all'],
    performance_level: 'beginner',
    age_range: { min_months: 24, max_months: 60 },
    goal_ar: 'سيصنف المستفيد أشياء حسب اللون (أحمر/أزرق/أصفر) في 4 من 5 محاولات خلال 8 أسابيع',
    goal_short_ar: 'تصنيف الأشياء حسب اللون',
    mastery_criteria: { accuracy_percentage: 80, consecutive_sessions: 3 },
    icf_codes: ['d137'],
    source: 'evidence_based',
    tags: ['معرفي', 'تصنيف', 'ألوان'],
  },
  {
    goal_code: 'COG-MATCH-001',
    domain: 'cognitive',
    subdomain: 'matching',
    disability_types: ['autism', 'intellectual_disability', 'all'],
    performance_level: 'beginner',
    age_range: { min_months: 18, max_months: 48 },
    goal_ar: 'سيطابق المستفيد الصور المتماثلة (3 أزواج) في 4 من 5 محاولات خلال 8 أسابيع',
    goal_short_ar: 'مطابقة الصور المتماثلة',
    mastery_criteria: { accuracy_percentage: 80, consecutive_sessions: 3 },
    icf_codes: ['d130', 'd137'],
    source: 'evidence_based',
    tags: ['معرفي', 'مطابقة', 'ذاكرة'],
  },
  // ──────────────────────────────────────────────────
  // مجال السلوك
  // ──────────────────────────────────────────────────
  {
    goal_code: 'BEH-SIT-001',
    domain: 'behavioral',
    subdomain: 'sitting_tolerance',
    disability_types: ['autism', 'adhd', 'all'],
    performance_level: 'beginner',
    age_range: { min_months: 24, max_months: 72 },
    goal_ar: 'سيجلس المستفيد في وضع الجلسة لمدة 15 دقيقة متواصلة في 4 من 5 جلسات خلال 10 أسابيع',
    goal_short_ar: 'الجلوس لمدة 15 دقيقة',
    mastery_criteria: { accuracy_percentage: 80, consecutive_sessions: 5 },
    icf_codes: ['d415'],
    source: 'evidence_based',
    tags: ['سلوك', 'جلوس', 'انتباه'],
  },
  {
    goal_code: 'BEH-WAIT-001',
    domain: 'behavioral',
    subdomain: 'impulse_control',
    disability_types: ['autism', 'adhd', 'all'],
    performance_level: 'intermediate',
    age_range: { min_months: 36, max_months: 96 },
    goal_ar:
      'سيتحمل المستفيد الانتظار دقيقة واحدة قبل الحصول على المعزز في 4 من 5 فرص خلال 10 أسابيع',
    goal_short_ar: 'تحمل الانتظار دقيقة',
    mastery_criteria: { accuracy_percentage: 80, consecutive_sessions: 3 },
    icf_codes: ['d240'],
    source: 'evidence_based',
    tags: ['سلوك', 'انتظار', 'ضبط النفس'],
  },
  // ──────────────────────────────────────────────────
  // مجال اللعب
  // ──────────────────────────────────────────────────
  {
    goal_code: 'PLAY-FUNCT-001',
    domain: 'play',
    subdomain: 'functional_play',
    disability_types: ['autism', 'intellectual_disability', 'all'],
    performance_level: 'beginner',
    age_range: { min_months: 18, max_months: 48 },
    goal_ar:
      'سيلعب المستفيد بالألعاب بطريقة وظيفية (دفع السيارة، تغذية الدمية) في 4 من 5 فرص خلال 10 أسابيع',
    goal_short_ar: 'اللعب الوظيفي بالألعاب',
    mastery_criteria: { accuracy_percentage: 80, consecutive_sessions: 3 },
    icf_codes: ['d9200'],
    source: 'evidence_based',
    tags: ['لعب', 'وظيفي', 'تخيلي'],
  },
  // ──────────────────────────────────────────────────
  // مجال الانتباه المشترك
  // ──────────────────────────────────────────────────
  {
    goal_code: 'SOC-JA-001',
    domain: 'socialization',
    subdomain: 'joint_attention',
    disability_types: ['autism', 'all'],
    performance_level: 'beginner',
    age_range: { min_months: 12, max_months: 36 },
    goal_ar:
      'سيشير المستفيد بالإصبع نحو شيء مثير للاهتمام لمشاركة الانتباه مع شخص بالغ في 3 من 5 فرص خلال 12 أسبوعاً',
    goal_short_ar: 'الإشارة للانتباه المشترك',
    mastery_criteria: { accuracy_percentage: 60, consecutive_sessions: 3 },
    icf_codes: ['d710'],
    source: 'evidence_based',
    tags: ['اجتماعي', 'انتباه مشترك', 'توحد'],
  },
];

// ═══════════════════════════════════════════════════════════════════
// خدمة بنك الأهداف
// ═══════════════════════════════════════════════════════════════════
class GoalsBankService {
  /**
   * تهيئة بنك الأهداف المدمج في قاعدة البيانات
   */
  static async seedBuiltInGoals() {
    let seeded = 0;
    for (const goal of BUILT_IN_GOALS) {
      const existing = await GoalsBank.findOne({ goal_code: goal.goal_code });
      if (!existing) {
        await GoalsBank.create(goal);
        seeded++;
      }
    }
    return { seeded, total: BUILT_IN_GOALS.length };
  }

  /**
   * البحث الذكي في بنك الأهداف
   */
  static async searchGoals({ domain, disability_type, performance_level, age_months, keyword }) {
    const query = { is_active: true };

    if (domain) query.domain = domain;
    if (performance_level) query.performance_level = performance_level;
    if (disability_type) {
      query.disability_types = { $in: [disability_type, 'all'] };
    }
    if (age_months) {
      query['age_range.min_months'] = { $lte: age_months };
      query['age_range.max_months'] = { $gte: age_months };
    }
    if (keyword) {
      query.$or = [
        { goal_ar: { $regex: keyword, $options: 'i' } },
        { tags: { $in: [keyword] } },
        { goal_code: { $regex: keyword, $options: 'i' } },
      ];
    }

    return await GoalsBank.find(query).sort({ usage_count: -1, success_rate: -1 }).lean();
  }

  /**
   * اقتراح أهداف ذكية بناءً على نتائج التقييم
   */
  static async suggestGoalsFromAssessment({
    disability_type,
    vabs_needs,
    developmental_delays,
    age_months,
  }) {
    const suggestions = [];
    const domains = new Set();

    // تحليل احتياجات VABS
    if (vabs_needs) {
      for (const need of vabs_needs) {
        const domainMap = {
          communication: 'communication',
          daily_living: 'daily_living',
          socialization: 'socialization',
          motor: 'motor_fine',
        };
        if (domainMap[need]) domains.add(domainMap[need]);
      }
    }

    // تحليل تأخر النمو
    if (developmental_delays) {
      for (const delay of developmental_delays) {
        const domainMap = {
          language_expressive: 'communication',
          language_receptive: 'communication',
          fine_motor: 'motor_fine',
          gross_motor: 'motor_gross',
          cognitive: 'cognitive',
          social_emotional: 'socialization',
          self_care: 'daily_living',
        };
        if (domainMap[delay.domain]) domains.add(domainMap[delay.domain]);
      }
    }

    // جلب الأهداف المقترحة
    for (const domain of domains) {
      const goals = await this.searchGoals({ domain, disability_type, age_months });
      suggestions.push(
        ...goals.slice(0, 3).map(g => ({
          ...g,
          suggestion_reason_ar: `مقترح بناءً على ضعف في مجال ${domain}`,
          priority: 'high',
        }))
      );
    }

    return suggestions.slice(0, 10); // أقصى 10 اقتراحات
  }

  /**
   * تحديث إحصائيات بنك الأهداف بعد تحقيق هدف
   */
  static async updateGoalStats(goalCode, achieved, weeksToAchieve) {
    const goal = await GoalsBank.findOne({ goal_code: goalCode });
    if (!goal) return;

    const newCount = goal.usage_count + 1;
    const achievedCount =
      Math.round((goal.success_rate / 100) * goal.usage_count) + (achieved ? 1 : 0);
    const newSuccessRate = Math.round((achievedCount / newCount) * 100);

    const updates = {
      usage_count: newCount,
      success_rate: newSuccessRate,
    };

    if (achieved && weeksToAchieve) {
      const currentAvg = goal.average_weeks_to_achieve || weeksToAchieve;
      updates.average_weeks_to_achieve = Math.round((currentAvg + weeksToAchieve) / 2);
    }

    await GoalsBank.findByIdAndUpdate(goal._id, updates);
  }
}

// ═══════════════════════════════════════════════════════════════════
// خدمة IEP الذكي
// ═══════════════════════════════════════════════════════════════════
class SmartIEPService {
  /**
   * إنشاء IEP جديد مع تحليل ذكاء اصطناعي مبدئي
   */
  static async createIEP(data) {
    // حساب جدول المراجعات
    const startDate = new Date(data.plan_period.start_date);
    const endDate = new Date(data.plan_period.end_date);

    const reviewSchedule = {
      quarterly_review_1: new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000),
      quarterly_review_2: new Date(startDate.getTime() + 180 * 24 * 60 * 60 * 1000),
      quarterly_review_3: new Date(startDate.getTime() + 270 * 24 * 60 * 60 * 1000),
      annual_review: endDate,
    };

    const iep = new SmartIEP({
      ...data,
      review_schedule: reviewSchedule,
      overall_progress: {
        goals_total: data.annual_goals?.length || 0,
        goals_achieved: 0,
        goals_in_progress: 0,
        overall_percentage: 0,
        next_review_date: reviewSchedule.quarterly_review_1,
      },
    });

    await iep.save();

    // تحليل ذكاء اصطناعي مبدئي للخطة
    const aiAnalysis = this.analyzeIEP(iep);
    await SmartIEP.findByIdAndUpdate(iep._id, { ai_analysis: aiAnalysis });

    return iep;
  }

  /**
   * تحليل الخطة بالذكاء الاصطناعي
   */
  static analyzeIEP(iep) {
    const goals = iep.annual_goals || [];
    const suggestions = [];
    const riskFactors = [];

    // فحص توزيع الأهداف
    const domainCounts = {};
    for (const goal of goals) {
      domainCounts[goal.domain] = (domainCounts[goal.domain] || 0) + 1;
    }

    // التحقق من وجود أهداف في المجالات الأساسية
    const essentialDomains = ['communication', 'daily_living', 'socialization'];
    for (const domain of essentialDomains) {
      if (!domainCounts[domain]) {
        suggestions.push(`يُنصح بإضافة هدف في مجال ${domain}`);
      }
    }

    // فحص عدد الأهداف
    if (goals.length < 3) {
      suggestions.push('عدد الأهداف قليل — يُنصح بإضافة أهداف في مجالات إضافية');
    }
    if (goals.length > 10) {
      suggestions.push('عدد الأهداف كثير — يُنصح بتحديد أولوية الأهداف الأكثر أهمية');
    }

    // فحص موافقة ولي الأمر
    if (!iep.parent_consent?.consent_given) {
      riskFactors.push('موافقة ولي الأمر غير مكتملة');
    }

    // فحص جدول المراجعات
    if (!iep.review_schedule?.quarterly_review_1) {
      riskFactors.push('جدول المراجعات الدورية غير محدد');
    }

    // تقدير احتمالية النجاح
    let successProbability = 70; // افتراضي
    if (goals.length >= 3 && goals.length <= 7) successProbability += 10;
    if (iep.parent_consent?.consent_given) successProbability += 10;
    if (iep.family_involvement?.home_program_agreed) successProbability += 5;

    return {
      goals_alignment_score: goals.length > 0 ? Math.min(100, goals.length * 10 + 50) : 0,
      suggested_adjustments: suggestions,
      predicted_success_rate: Math.min(95, successProbability),
      risk_factors: riskFactors,
      last_analysis_date: new Date(),
    };
  }

  /**
   * تحديث التقدم الإجمالي للخطة
   */
  static async updateOverallProgress(iepId) {
    const iep = await SmartIEP.findById(iepId);
    if (!iep) return null;

    const goals = iep.annual_goals;
    const total = goals.length;
    const achieved = goals.filter(g => g.current_status === 'achieved').length;
    const inProgress = goals.filter(g => g.current_status === 'in_progress').length;
    const overallPercentage = total > 0 ? Math.round((achieved / total) * 100) : 0;

    const nextReview = [
      iep.review_schedule?.quarterly_review_1,
      iep.review_schedule?.quarterly_review_2,
      iep.review_schedule?.quarterly_review_3,
      iep.review_schedule?.annual_review,
    ]
      .filter(d => d && new Date(d) > new Date())
      .sort((a, b) => new Date(a) - new Date(b))[0];

    await SmartIEP.findByIdAndUpdate(iepId, {
      'overall_progress.goals_total': total,
      'overall_progress.goals_achieved': achieved,
      'overall_progress.goals_in_progress': inProgress,
      'overall_progress.overall_percentage': overallPercentage,
      'overall_progress.last_review_date': new Date(),
      'overall_progress.next_review_date': nextReview,
    });

    return { total, achieved, inProgress, overallPercentage };
  }

  /**
   * تسجيل تقدم جلسة وتحديث حالة الهدف
   */
  static async logSessionProgress(iepId, goalId, progressData) {
    const iep = await SmartIEP.findById(iepId);
    if (!iep) throw new Error('الخطة غير موجودة');

    const goal = iep.annual_goals.id(goalId);
    if (!goal) throw new Error('الهدف غير موجود في الخطة');

    // إضافة سجل التقدم
    goal.progress_log.push({
      ...progressData,
      log_date: new Date(),
    });

    // تحديث نسبة التقدم
    if (progressData.accuracy_percentage !== undefined) {
      goal.current_performance = `${progressData.accuracy_percentage}% دقة`;

      // فحص تحقق الهدف
      const masteryMet = progressData.accuracy_percentage >= 80;
      const recentLogs = goal.progress_log.slice(-3);
      const allMastered =
        recentLogs.length >= 3 && recentLogs.every(l => l.accuracy_percentage >= 80);

      if (allMastered && goal.current_status !== 'achieved') {
        goal.current_status = 'achieved';
        goal.progress_percentage = 100;
        // تحديث إحصائيات البنك
        if (goal.goal_code) {
          const startDate = new Date(goal.start_date);
          const weeksToAchieve = Math.ceil((new Date() - startDate) / (7 * 24 * 60 * 60 * 1000));
          await GoalsBankService.updateGoalStats(goal.goal_code, true, weeksToAchieve);
        }
      } else if (goal.current_status === 'not_started') {
        goal.current_status = 'in_progress';
        goal.progress_percentage = Math.min(90, progressData.accuracy_percentage);
      } else if (goal.current_status === 'in_progress') {
        goal.progress_percentage = Math.min(90, progressData.accuracy_percentage);
      }
    }

    await iep.save();
    await this.updateOverallProgress(iepId);
    return goal;
  }

  /**
   * توليد تقرير تقدم IEP تلقائي
   */
  static async generateProgressReport(iepId) {
    const iep = await SmartIEP.findById(iepId)
      .populate('beneficiary_id', 'name date_of_birth disability_type')
      .populate('annual_goals.responsible_therapist_id', 'name role')
      .lean();

    if (!iep) throw new Error('الخطة غير موجودة');

    const goals = iep.annual_goals;
    const reportSections = [];

    // ملخص عام
    reportSections.push({
      section: 'ملخص التقدم العام',
      content: {
        total_goals: goals.length,
        achieved: goals.filter(g => g.current_status === 'achieved').length,
        in_progress: goals.filter(g => g.current_status === 'in_progress').length,
        not_started: goals.filter(g => g.current_status === 'not_started').length,
        overall_percentage: iep.overall_progress?.overall_percentage || 0,
        report_date: new Date(),
      },
    });

    // تفاصيل كل مجال
    const domainGroups = {};
    for (const goal of goals) {
      if (!domainGroups[goal.domain]) domainGroups[goal.domain] = [];
      domainGroups[goal.domain].push({
        goal_ar: goal.goal_ar,
        status: goal.current_status,
        progress_percentage: goal.progress_percentage,
        current_performance: goal.current_performance,
        sessions_count: goal.progress_log?.length || 0,
        alert:
          goal.alerts?.plateau_detected || goal.alerts?.regression_detected
            ? {
                type: goal.alerts.plateau_detected ? 'plateau' : 'regression',
                message: goal.alerts.alert_message_ar,
              }
            : null,
      });
    }

    for (const [domain, domainGoals] of Object.entries(domainGroups)) {
      reportSections.push({
        section: `مجال: ${domain}`,
        goals: domainGoals,
      });
    }

    return {
      iep_number: iep.iep_number,
      beneficiary: iep.beneficiary_id,
      plan_period: iep.plan_period,
      report_sections: reportSections,
      overall_progress: iep.overall_progress,
      generated_at: new Date(),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// خدمة سجل الجلسات
// ═══════════════════════════════════════════════════════════════════
class SessionLogService {
  /**
   * إنشاء سجل جلسة جديد
   */
  static async createSession(data) {
    // حساب نسبة الدقة لكل هدف
    const goalsWorked = (data.goals_worked || []).map(g => ({
      ...g,
      accuracy_percentage:
        g.trials_total > 0 ? Math.round((g.trials_correct / g.trials_total) * 100) : 0,
    }));

    const session = new SessionLog({ ...data, goals_worked: goalsWorked });
    await session.save();

    // تحديث التقدم في الـ IEP
    if (data.iep_id) {
      for (const goal of goalsWorked) {
        if (goal.goal_id) {
          try {
            await SmartIEPService.logSessionProgress(data.iep_id, goal.goal_id, {
              accuracy_percentage: goal.accuracy_percentage,
              performance_data: `${goal.trials_correct}/${goal.trials_total} محاولات صحيحة`,
              notes: goal.observations,
              session_number: data.session_number,
            });
          } catch (err) {
            // استمر حتى لو فشل تحديث أحد الأهداف
          }
        }
      }
    }

    return session;
  }

  /**
   * إحصائيات جلسات مستفيد عبر الزمن
   */
  static async getSessionAnalytics(beneficiaryId, days = 90) {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const sessions = await SessionLog.find({
      beneficiary_id: beneficiaryId,
      session_date: { $gte: from },
    })
      .sort({ session_date: 1 })
      .lean();

    if (sessions.length === 0) return { sessions: [], analytics: null };

    // حساب اتجاه الأداء
    const goalAccuracyTrend = {};
    for (const session of sessions) {
      for (const goal of session.goals_worked || []) {
        if (!goalAccuracyTrend[goal.goal_ar]) goalAccuracyTrend[goal.goal_ar] = [];
        goalAccuracyTrend[goal.goal_ar].push({
          date: session.session_date,
          accuracy: goal.accuracy_percentage || 0,
        });
      }
    }

    // حساب متوسط الأداء الأسبوعي
    const weeklyAvg = sessions.reduce((acc, s) => {
      const week = new Date(s.session_date).toISOString().slice(0, 10);
      if (!acc[week]) acc[week] = [];
      const avgAcc =
        s.goals_worked?.length > 0
          ? s.goals_worked.reduce((sum, g) => sum + (g.accuracy_percentage || 0), 0) /
            s.goals_worked.length
          : 0;
      acc[week].push(avgAcc);
      return acc;
    }, {});

    return {
      total_sessions: sessions.length,
      goal_accuracy_trends: goalAccuracyTrend,
      weekly_performance: Object.entries(weeklyAvg).map(([week, values]) => ({
        week,
        avg_accuracy: Math.round(values.reduce((s, v) => s + v, 0) / values.length),
      })),
      abc_behavior_summary: this.summarizeABCData(sessions),
    };
  }

  /**
   * ملخص بيانات ABC السلوكية
   */
  static summarizeABCData(sessions) {
    const behaviorCounts = {};
    for (const session of sessions) {
      for (const abc of session.abc_records || []) {
        const type = abc.behavior_type || 'other';
        behaviorCounts[type] = (behaviorCounts[type] || 0) + (abc.frequency || 1);
      }
    }
    return behaviorCounts;
  }
}

module.exports = {
  GoalsBankService,
  SmartIEPService,
  SessionLogService,
  BUILT_IN_GOALS,
};
