/**
 * AI Rehabilitation Recommendation Engine - Priority 5
 * محرك التوصيات التأهيلية بالذكاء الاصطناعي
 * ABA, PECS, TEACCH, DIR/Floortime, PRT, SI, Social Skills
 * Al-Awael ERP System
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Model ──────────────────────────────────────────────────────────────────────

const RecommendationReportSchema = new Schema(
  {
    beneficiary_id: {
      type: Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    generated_at: { type: Date, default: Date.now },
    input_data: {
      cars2_total: Number,
      cars2_classification: String,
      vabs_adaptive_composite: Number,
      vabs_communication_level: String,
      vabs_socialization_level: String,
      pep3_profile: Object,
      age_years: Number,
      current_goals: [String],
      behavior_challenges: [String],
      sensory_profile: String,
      communication_level: String, // nonverbal/minimal/emerging/functional
      family_engagement: String, // low/medium/high
    },
    primary_approach: { type: String },
    secondary_approaches: [String],
    goal_priorities: [
      {
        domain: String,
        priority_rank: Number,
        rationale_ar: String,
        suggested_goals: [String],
      },
    ],
    therapy_recommendations: [
      {
        approach: String,
        approach_ar: String,
        match_score: Number, // 0-100
        rationale_ar: String,
        implementation_tips_ar: [String],
        contraindications_ar: [String],
        evidence_level: String, // strong/moderate/emerging
      },
    ],
    environment_recommendations: [
      {
        setting: String,
        recommendation_ar: String,
      },
    ],
    family_training_recommendations: [String],
    red_flags: [{ flag_ar: String, severity: String, action_ar: String }],
    reviewed_by: { type: Schema.Types.ObjectId, ref: 'User' },
    review_notes: String,
  },
  { timestamps: true }
);

const RecommendationReport = mongoose.model('RecommendationReport', RecommendationReportSchema);

// ─── Knowledge Base ────────────────────────────────────────────────────────────

/**
 * قاعدة معرفة المناهج التأهيلية
 */
const THERAPY_KNOWLEDGE_BASE = {
  ABA: {
    name_ar: 'تحليل السلوك التطبيقي (ABA)',
    description_ar: 'منهج مبني على مبادئ التعلم لتعليم المهارات وتقليل السلوكيات غير المرغوبة',
    evidence_level: 'strong',
    best_for: {
      age_range: [2, 18],
      communication_levels: ['nonverbal', 'minimal', 'emerging', 'functional'],
      cars2_range: [30, 60], // جميع مستويات التوحد
      strengths: ['skill_acquisition', 'behavior_reduction', 'generalization'],
    },
    techniques: [
      'DTT (التدريب التجريبي المنفصل)',
      'NET (التدريب في البيئة الطبيعية)',
      'PRT (التدريب على المحاور المحورية)',
      'EIBI (التدخل السلوكي المكثف المبكر)',
      'VB-MAPP (تقييم ووضع البرامج اللفظية)',
    ],
    implementation_tips_ar: [
      'استخدم التعزيز الإيجابي الفوري عند حدوث السلوك المطلوب',
      'قسّم المهارات الكبيرة إلى خطوات صغيرة قابلة للتدريب',
      'سجّل بيانات دقيقة لكل جلسة لتتبع التقدم',
      'طبّق التدريب في بيئات متعددة لتعميم المهارات',
      'ابدأ بتقييم VB-MAPP لتحديد مستوى المهارات اللفظية',
    ],
    contraindications_ar: [],
  },
  PECS: {
    name_ar: 'نظام التواصل بتبادل الصور (PECS)',
    description_ar: 'نظام تواصل بديل يعلم الأطفال التواصل باستخدام بطاقات الصور',
    evidence_level: 'strong',
    best_for: {
      age_range: [2, 12],
      communication_levels: ['nonverbal', 'minimal'],
      cars2_range: [35, 60],
      strengths: ['functional_communication', 'requesting', 'language_development'],
    },
    techniques: [
      'المرحلة 1: التبادل الجسدي',
      'المرحلة 2: المسافة والاستمرارية',
      'المرحلة 3: التمييز بين الصور',
      'المرحلة 4: بناء الجملة (أريد...)',
      'المرحلة 5: الرد على السؤال',
      'المرحلة 6: التعليق',
    ],
    implementation_tips_ar: [
      'ابدأ بصور الأشياء المحببة جداً للطفل',
      'تأكد من وجود شخصين أثناء التدريب في المراحل الأولى',
      'احتفظ بكتاب PECS معك في جميع الأوقات',
      'أضف صوراً جديدة تدريجياً بعد إتقان الصور الحالية',
      'شارك الأسرة في تطبيق PECS في المنزل',
    ],
    contraindications_ar: ['لا يُستخدم كبديل نهائي إذا كانت اللغة الشفهية تتطور'],
  },
  TEACCH: {
    name_ar: 'برنامج التعليم المنظم (TEACCH)',
    description_ar: 'منهج يركز على التنظيم البيئي والبصري لتعزيز الاستقلالية',
    evidence_level: 'strong',
    best_for: {
      age_range: [3, 25],
      communication_levels: ['nonverbal', 'minimal', 'emerging', 'functional'],
      cars2_range: [30, 60],
      strengths: ['independence', 'organization', 'visual_learning', 'transitions'],
    },
    techniques: [
      'الجدول البصري اليومي',
      'تنظيم بيئة العمل (Work System)',
      'بطاقات المهام المرئية',
      'أدوات الانتقال البصرية',
      'التنظيم المادي للفضاء',
    ],
    implementation_tips_ar: [
      'ابدأ بجدول مصور للروتين اليومي',
      'استخدم صناديق العمل المنظمة لمهام مستقلة',
      'ثبّت الجدول في مكان ثابت يراه الطفل دائماً',
      'استخدم رموز "انتهيت" و"التالي" لكل نشاط',
      'قلّل المشتتات البصرية في بيئة التعلم',
    ],
    contraindications_ar: [],
  },
  DIR_FLOORTIME: {
    name_ar: 'نموذج DIR / وقت الأرضية (Floortime)',
    description_ar: 'منهج تنموي يركز على بناء العلاقة والتفاعل العاطفي من خلال اللعب',
    evidence_level: 'moderate',
    best_for: {
      age_range: [2, 10],
      communication_levels: ['nonverbal', 'minimal', 'emerging'],
      cars2_range: [30, 50],
      strengths: ['social_engagement', 'emotional_regulation', 'play_skills', 'relationship'],
    },
    techniques: [
      'اتبع قيادة الطفل',
      'أدخل نفسك في لعبه',
      'وسّع دوائر التواصل',
      'تحدّ لطيف للتفاعل',
      'الضغط الآمن والتلاعب الحسي',
    ],
    implementation_tips_ar: [
      'خصص 6-8 جلسات يومياً من 20 دقيقة',
      'اتبع اهتمام الطفل ولا توجّهه',
      'احتفل بكل دائرة تواصل ينجزها',
      'كن على مستوى الطفل جسدياً (الأرضية)',
      'دمج الأهل في جلسات Floortime اليومية',
    ],
    contraindications_ar: ['قد لا يكفي وحده للحالات الشديدة'],
  },
  PRT: {
    name_ar: 'التدريب على المحاور المحورية (PRT)',
    description_ar: 'نهج ABA طبيعي يركز على مناطق محورية مثل الدوافع والاستجابة للإشارات',
    evidence_level: 'strong',
    best_for: {
      age_range: [2, 12],
      communication_levels: ['minimal', 'emerging', 'functional'],
      cars2_range: [30, 45],
      strengths: ['motivation', 'self_initiation', 'natural_language'],
    },
    techniques: [
      'التعزيز المباشر بالنتائج الطبيعية',
      'تناوب المهام القديمة والجديدة',
      'اختيار الطفل للمواد',
      'تعزيز المحاولات',
      'الانتباه المشترك',
    ],
    implementation_tips_ar: [
      'اجعل التعزيز طبيعياً ومرتبطاً بالنشاط',
      'أتح للطفل اختيار نشاطاته',
      'عزّز المحاولة حتى لو لم تكن صحيحة تماماً',
      'ادمج التدريب في الألعاب اليومية',
    ],
    contraindications_ar: [],
  },
  SI: {
    name_ar: 'التكامل الحسي (SI)',
    description_ar: 'تدخل علاجي يعالج صعوبات معالجة المعلومات الحسية',
    evidence_level: 'moderate',
    best_for: {
      age_range: [2, 12],
      sensory_profiles: ['hyper_sensitive', 'hypo_sensitive', 'mixed'],
      strengths: ['sensory_regulation', 'attention', 'behavior_regulation'],
    },
    techniques: [
      'نظام الضغط العميق',
      'أنشطة الاستثارة الدهليزية',
      'التحضير الحسي قبل الجلسة',
      'دمج الحركة في التعلم',
      'بروتوكول الفرشاة (Wilbarger)',
    ],
    implementation_tips_ar: [
      'ابدأ بتقييم حسي شامل (SPM أو Sensory Profile)',
      'صمّم "نظام حسي" يومي مخصص للطفل',
      'أشرك أخصائي علاج وظيفي في البرنامج الحسي',
      'راقب ردود فعل الطفل الحسية في الجلسة',
    ],
    contraindications_ar: ['تجنب الإدخال الحسي المفرط دفعة واحدة'],
  },
  SOCIAL_SKILLS: {
    name_ar: 'تدريب المهارات الاجتماعية',
    description_ar: 'برامج منظمة لتعليم التفاعل الاجتماعي والصداقات',
    evidence_level: 'strong',
    best_for: {
      age_range: [4, 18],
      communication_levels: ['emerging', 'functional'],
      cars2_range: [30, 40],
      strengths: ['peer_interaction', 'friendship', 'social_understanding'],
    },
    techniques: [
      'PEERS (برنامج التعليم والإثراء للعلاقات)',
      'Social Stories (قصص اجتماعية)',
      'Video Modeling (النمذجة بالفيديو)',
      'Social Scripting (النصوص الاجتماعية)',
      'مجموعات المهارات الاجتماعية',
    ],
    implementation_tips_ar: [
      'استخدم قصصاً اجتماعية مكتوبة بضمير المتكلم',
      'طبّق في مجموعات صغيرة (2-4 أطفال)',
      'استخدم نمذجة الفيديو للمواقف الاجتماعية',
      'عزّز التفاعل مع الأقران في البيئة الطبيعية',
    ],
    contraindications_ar: ['غير مناسب كتدخل أساسي للحالات اللفظية الشديدة'],
  },
};

// ─── Recommendation Engine ──────────────────────────────────────────────────────

class RecommendationEngine {
  /**
   * الحساب الرئيسي للتوصيات
   */
  static async generateRecommendations(inputData) {
    const {
      cars2_total,
      cars2_classification,
      vabs_adaptive_composite,
      vabs_communication_level,
      age_years,
      communication_level,
      sensory_profile,
      behavior_challenges = [],
      family_engagement,
    } = inputData;

    const scores = this._scoreAllApproaches(inputData);
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

    const primaryApproach = sorted[0][0];
    const secondaryApproaches = sorted
      .slice(1, 3)
      .filter(([, s]) => s >= 40)
      .map(([a]) => a);

    const therapyRecommendations = sorted.map(([approach, score]) => {
      const kb = THERAPY_KNOWLEDGE_BASE[approach];
      return {
        approach,
        approach_ar: kb.name_ar,
        match_score: score,
        rationale_ar: this._buildRationale(approach, inputData, score),
        implementation_tips_ar: kb.implementation_tips_ar,
        contraindications_ar: kb.contraindications_ar,
        evidence_level: kb.evidence_level,
      };
    });

    // أولويات الأهداف
    const goalPriorities = this._prioritizeGoalDomains(inputData);

    // توصيات بيئية
    const environmentRecommendations = this._getEnvironmentRecommendations(inputData);

    // توصيات تدريب الأسرة
    const familyTraining = this._getFamilyTrainingRecommendations(inputData, primaryApproach);

    // علامات تحذيرية
    const redFlags = this._detectRedFlags(inputData);

    return {
      primary_approach: primaryApproach,
      primary_approach_ar: THERAPY_KNOWLEDGE_BASE[primaryApproach].name_ar,
      secondary_approaches: secondaryApproaches,
      therapy_recommendations: therapyRecommendations,
      goal_priorities: goalPriorities,
      environment_recommendations: environmentRecommendations,
      family_training_recommendations: familyTraining,
      red_flags: redFlags,
      summary_ar: this._buildSummary(primaryApproach, secondaryApproaches, inputData),
    };
  }

  /**
   * تسجيل درجات المطابقة لكل منهج
   */
  static _scoreAllApproaches(data) {
    const scores = {};
    const {
      cars2_total,
      age_years,
      communication_level,
      sensory_profile,
      vabs_adaptive_composite,
    } = data;

    // ABA - مناسب لجميع الحالات
    scores.ABA = 60;
    if (communication_level === 'nonverbal' || communication_level === 'minimal') scores.ABA += 20;
    if (cars2_total && cars2_total >= 37) scores.ABA += 10;
    if (age_years && age_years <= 6) scores.ABA += 10;

    // PECS - للحالات غير اللفظية
    scores.PECS = 20;
    if (communication_level === 'nonverbal') scores.PECS += 50;
    else if (communication_level === 'minimal') scores.PECS += 35;
    else if (communication_level === 'emerging') scores.PECS += 15;
    if (age_years && age_years <= 8) scores.PECS += 10;

    // TEACCH - للتنظيم والاستقلالية
    scores.TEACCH = 40;
    if (vabs_adaptive_composite && vabs_adaptive_composite < 70) scores.TEACCH += 20;
    if (cars2_total && cars2_total >= 35) scores.TEACCH += 15;
    scores.TEACCH += 5; // إضافي دائماً مفيد

    // DIR/Floortime - للتفاعل الاجتماعي
    scores.DIR_FLOORTIME = 20;
    if (communication_level === 'nonverbal' || communication_level === 'minimal')
      scores.DIR_FLOORTIME += 25;
    if (age_years && age_years <= 7) scores.DIR_FLOORTIME += 15;
    if (cars2_total && cars2_total < 40) scores.DIR_FLOORTIME += 10;

    // PRT - للحالات المتوسطة
    scores.PRT = 30;
    if (communication_level === 'emerging' || communication_level === 'functional')
      scores.PRT += 25;
    if (age_years && age_years >= 3 && age_years <= 10) scores.PRT += 10;

    // SI - للمشكلات الحسية
    scores.SI = 15;
    if (sensory_profile === 'hyper_sensitive') scores.SI += 40;
    else if (sensory_profile === 'hypo_sensitive') scores.SI += 35;
    else if (sensory_profile === 'mixed') scores.SI += 30;
    else if (sensory_profile === 'typical') scores.SI += 5;

    // Social Skills - للحالات الأخف
    scores.SOCIAL_SKILLS = 10;
    if (communication_level === 'functional') scores.SOCIAL_SKILLS += 40;
    else if (communication_level === 'emerging') scores.SOCIAL_SKILLS += 20;
    if (age_years && age_years >= 5) scores.SOCIAL_SKILLS += 10;
    if (cars2_total && cars2_total < 38) scores.SOCIAL_SKILLS += 15;

    // تطبيع الدرجات (0-100)
    Object.keys(scores).forEach(k => {
      scores[k] = Math.min(100, Math.max(0, scores[k]));
    });

    return scores;
  }

  /**
   * بناء مبرر التوصية
   */
  static _buildRationale(approach, data, score) {
    const { communication_level, age_years, sensory_profile, cars2_total } = data;
    const reasons = [];

    if (approach === 'ABA') {
      if (score >= 80)
        reasons.push('يُعدّ ABA المنهج الأول لهذه الحالة بناءً على قوة الأدلة العلمية');
      if (communication_level === 'nonverbal')
        reasons.push('التوحد مع غياب اللغة يستجيب جيداً لـ ABA');
      if (age_years && age_years <= 6) reasons.push('التدخل المبكر بـ ABA يحقق أفضل النتائج');
    }
    if (approach === 'PECS') {
      if (communication_level === 'nonverbal')
        reasons.push('الطفل غير اللفظي يستفيد كثيراً من PECS لبناء التواصل الوظيفي');
      reasons.push('يبني أساساً قوياً للغة حتى مع تطور اللغة الشفهية لاحقاً');
    }
    if (approach === 'TEACCH') {
      reasons.push('التنظيم البصري يقلل القلق ويزيد الاستقلالية');
      if (data.vabs_adaptive_composite && data.vabs_adaptive_composite < 70)
        reasons.push('ضعف الأداء التكيفي يستفيد من هيكلة TEACCH');
    }
    if (approach === 'DIR_FLOORTIME') {
      if (age_years && age_years <= 7)
        reasons.push('الأطفال الصغار يستجيبون جيداً للتدخل التنموي القائم على العلاقة');
    }
    if (approach === 'SI') {
      if (sensory_profile === 'hyper_sensitive')
        reasons.push('الحساسية الحسية الزائدة تتطلب تدخلاً متخصصاً بالتكامل الحسي');
      else if (sensory_profile === 'hypo_sensitive')
        reasons.push('ضعف الاستجابة الحسية يحتاج تحفيزاً حسياً منظماً');
    }
    if (approach === 'SOCIAL_SKILLS') {
      if (communication_level === 'functional')
        reasons.push('مستوى التواصل الوظيفي يتيح الاستفادة من برامج المهارات الاجتماعية');
    }

    return reasons.join(' | ') || `درجة المطابقة ${score}% بناءً على الملف التشخيصي`;
  }

  /**
   * تحديد أولويات مجالات الأهداف
   */
  static _prioritizeGoalDomains(data) {
    const { communication_level, cars2_total, vabs_adaptive_composite, age_years } = data;
    const domains = [];

    // التواصل - دائماً أولوية عالية لغير اللفظيين
    if (communication_level === 'nonverbal' || communication_level === 'minimal') {
      domains.push({
        domain: 'communication',
        priority_rank: 1,
        rationale_ar: 'التواصل الوظيفي هو الأولوية القصوى لبناء استقلالية الطفل',
        suggested_goals: ['طلب الاحتياجات بالإشارة أو الصورة', 'الاستجابة للاسم', 'التواصل البصري'],
      });
    } else {
      domains.push({
        domain: 'communication',
        priority_rank: 2,
        rationale_ar: 'تطوير اللغة التعبيرية والاستقبالية',
        suggested_goals: ['تكوين جمل من 3 كلمات', 'طرح الأسئلة', 'سرد الأحداث'],
      });
    }

    // المهارات الاجتماعية
    domains.push({
      domain: 'socialization',
      priority_rank: communication_level === 'functional' ? 1 : 3,
      rationale_ar: 'المهارات الاجتماعية أساسية للاندماج في المجتمع',
      suggested_goals: ['التناوب في اللعب', 'مشاركة الأشياء', 'الانضمام للمجموعة'],
    });

    // مهارات الحياة اليومية
    if (vabs_adaptive_composite && vabs_adaptive_composite < 70) {
      domains.push({
        domain: 'daily_living',
        priority_rank: 2,
        rationale_ar: 'ضعف الأداء التكيفي يستلزم التركيز على مهارات الاستقلالية',
        suggested_goals: ['العناية الشخصية', 'تناول الطعام المستقل', 'استخدام الحمام'],
      });
    }

    // السلوك
    if (data.behavior_challenges && data.behavior_challenges.length > 0) {
      domains.push({
        domain: 'behavior',
        priority_rank: 2,
        rationale_ar: 'التحديات السلوكية تعيق التعلم وتحتاج معالجة أولوية',
        suggested_goals: ['تقليل السلوك النمطي المعيق', 'إدارة الانتقالات', 'الانتظار بهدوء'],
      });
    }

    return domains.sort((a, b) => a.priority_rank - b.priority_rank);
  }

  /**
   * توصيات البيئة التعليمية
   */
  static _getEnvironmentRecommendations(data) {
    const { sensory_profile, communication_level, cars2_total } = data;
    const recs = [];

    recs.push({
      setting: 'الفصل الدراسي',
      recommendation_ar: 'مقعد في مقدمة الفصل بعيداً عن المشتتات البصرية والصوتية',
    });
    recs.push({
      setting: 'غرفة العلاج',
      recommendation_ar: 'غرفة هادئة بإضاءة منتظمة وزخرفة بصرية بسيطة',
    });

    if (sensory_profile === 'hyper_sensitive') {
      recs.push({
        setting: 'البيئة العامة',
        recommendation_ar:
          'تقليل الإضاءة القوية والأصوات العالية، استخدام سماعات تقليل الضوضاء عند الحاجة',
      });
      recs.push({ setting: 'غرفة النوم', recommendation_ar: 'بيئة نوم هادئة ومنظمة بلون محايد' });
    }

    if (communication_level === 'nonverbal' || communication_level === 'minimal') {
      recs.push({
        setting: 'جميع البيئات',
        recommendation_ar: 'تثبيت جداول مصورة في كل بيئة: المنزل، الفصل، العيادة',
      });
      recs.push({
        setting: 'المنزل',
        recommendation_ar: 'وضع لوحة طلبات مصورة في غرفة المعيشة والمطبخ',
      });
    }

    recs.push({
      setting: 'الانتقالات',
      recommendation_ar: 'استخدام تنبيه مسبق (5 دقائق قبل انتهاء النشاط) لتقليل مقاومة الانتقالات',
    });

    return recs;
  }

  /**
   * توصيات تدريب الأسرة
   */
  static _getFamilyTrainingRecommendations(data, primaryApproach) {
    const recs = [
      'تدريب الأسرة على مبادئ التعزيز الإيجابي وتطبيقه في المنزل',
      'توعية الأسرة بخصائص اضطراب طيف التوحد والتوقعات الواقعية',
      'تعليم الأسرة كيفية تسجيل السلوكيات والتقدم في المنزل',
    ];

    if (primaryApproach === 'PECS') {
      recs.push('تدريب عملي على مراحل PECS الستة للتطبيق المنزلي');
      recs.push('توفير كتاب PECS منزلي بالصور المناسبة للطفل');
    }
    if (primaryApproach === 'TEACCH') {
      recs.push('مساعدة الأسرة في إعداد جدول مصور منزلي');
      recs.push('تدريب على استخدام صناديق العمل المستقل في المنزل');
    }
    if (primaryApproach === 'DIR_FLOORTIME') {
      recs.push('تدريب الأهل على جلسات Floortime اليومية (6-8 جلسات × 20 دقيقة)');
    }
    if (primaryApproach === 'ABA') {
      recs.push('تدريب الأسرة على DTT وNET بشكل عملي');
      recs.push('توضيح كيفية تنفيذ برامج الواجب المنزلي');
    }

    if (data.family_engagement === 'low') {
      recs.push(
        '🔴 الأولوية: برنامج دعم الأسرة لرفع مستوى المشاركة - يُنصح بجلسات توجيه أسرية أسبوعية'
      );
    }

    return recs;
  }

  /**
   * كشف العلامات التحذيرية
   */
  static _detectRedFlags(data) {
    const flags = [];
    const { cars2_total, age_years, communication_level, behavior_challenges } = data;

    if (cars2_total && cars2_total >= 45) {
      flags.push({
        flag_ar: 'شدة التوحد مرتفعة جداً (CARS-2 ≥ 45)',
        severity: 'critical',
        action_ar: 'يتطلب تدخلاً مكثفاً (25-40 ساعة/أسبوع) وتقييماً طبياً شاملاً',
      });
    }

    if (age_years && age_years >= 7 && communication_level === 'nonverbal') {
      flags.push({
        flag_ar: 'عمر 7+ سنوات مع غياب اللغة التام',
        severity: 'high',
        action_ar: 'مراجعة فعالية التدخل التواصلي الحالي وتكثيفه، النظر في AAC متطور',
      });
    }

    if (behavior_challenges && behavior_challenges.includes('self_injury')) {
      flags.push({
        flag_ar: 'وجود سلوك إيذاء الذات',
        severity: 'critical',
        action_ar: 'تقييم وظيفي للسلوك فوراً (FBA) وبروتوكول آمن للتدخل',
      });
    }

    if (behavior_challenges && behavior_challenges.includes('aggression')) {
      flags.push({
        flag_ar: 'سلوك عدواني نحو الآخرين',
        severity: 'high',
        action_ar: 'تحليل وظيفي للسلوك وخطة تدخل سلوكي محددة',
      });
    }

    return flags;
  }

  /**
   * ملخص التوصيات
   */
  static _buildSummary(primary, secondary, data) {
    const kb = THERAPY_KNOWLEDGE_BASE[primary];
    const secNames = secondary
      .map(s => THERAPY_KNOWLEDGE_BASE[s]?.name_ar)
      .filter(Boolean)
      .join(' و');
    let summary = `بناءً على الملف التشخيصي للطفل، يُوصى بـ **${kb.name_ar}** كمنهج أساسي`;
    if (secNames) summary += `، مدعوماً بـ ${secNames}`;
    summary += `. يجب تطبيق البرنامج بشكل منظم ومكثف مع مشاركة فعّالة من الأسرة لتحقيق أفضل النتائج.`;
    return summary;
  }
}

// ─── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /recommendations/generate
 * توليد توصيات تأهيلية ذكية
 */
router.post('/recommendations/generate', async (req, res) => {
  try {
    const inputData = req.body;
    const { beneficiary_id } = inputData;

    if (!beneficiary_id) {
      return res.status(400).json({ success: false, error: 'beneficiary_id مطلوب' });
    }

    const result = await RecommendationEngine.generateRecommendations(inputData);

    // حفظ التقرير
    const report = new RecommendationReport({
      beneficiary_id,
      input_data: inputData,
      primary_approach: result.primary_approach,
      secondary_approaches: result.secondary_approaches,
      therapy_recommendations: result.therapy_recommendations,
      goal_priorities: result.goal_priorities,
      environment_recommendations: result.environment_recommendations,
      family_training_recommendations: result.family_training_recommendations,
      red_flags: result.red_flags,
    });
    await report.save();

    res.json({
      success: true,
      report_id: report._id,
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /recommendations/:beneficiaryId/latest
 * آخر تقرير توصيات للمستفيد
 */
router.get('/recommendations/:beneficiaryId/latest', async (req, res) => {
  try {
    const report = await RecommendationReport.findOne({
      beneficiary_id: req.params.beneficiaryId,
    }).sort({ createdAt: -1 });
    if (!report) return res.status(404).json({ success: false, error: 'لا توجد توصيات محفوظة' });
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /recommendations/:beneficiaryId/history
 * تاريخ التوصيات للمستفيد
 */
router.get('/recommendations/:beneficiaryId/history', async (req, res) => {
  try {
    const reports = await RecommendationReport.find({ beneficiary_id: req.params.beneficiaryId })
      .select('generated_at primary_approach secondary_approaches red_flags')
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({ success: true, count: reports.length, data: reports });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /approaches
 * قائمة المناهج التأهيلية المتاحة
 */
router.get('/approaches', (req, res) => {
  const approaches = Object.entries(THERAPY_KNOWLEDGE_BASE).map(([key, val]) => ({
    key,
    name_ar: val.name_ar,
    description_ar: val.description_ar,
    evidence_level: val.evidence_level,
    best_for_ages: val.best_for?.age_range,
    techniques_count: val.techniques?.length,
  }));
  res.json({ success: true, count: approaches.length, data: approaches });
});

/**
 * GET /approaches/:approach
 * تفاصيل منهج تأهيلي محدد
 */
router.get('/approaches/:approach', (req, res) => {
  const kb = THERAPY_KNOWLEDGE_BASE[req.params.approach.toUpperCase()];
  if (!kb) return res.status(404).json({ success: false, error: 'المنهج غير موجود' });
  res.json({ success: true, data: { key: req.params.approach, ...kb } });
});

module.exports = router;
