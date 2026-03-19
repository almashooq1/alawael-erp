/* eslint-disable no-unused-vars */
/**
 * Individualized Rehabilitation Plan Service
 * نظام خطط التأهيل الفردية المتقدمة
 *
 * يوفر هذا النظام إدارة شاملة لخطط التأهيل الفردية لذوي الإعاقة
 * بما يتوافق مع أفضل الممارسات العالمية والمعايير السعودية
 */

const { v4: uuidv4 } = require('crypto');

class IndividualizedRehabilitationPlanService {
  constructor() {
    this.plans = new Map();
    this.templates = this._initializeTemplates();
    this.goalBank = this._initializeGoalBank();
    this.interventionStrategies = this._initializeInterventionStrategies();
  }

  /**
   * تهيئة قوالب خطط التأهيل
   */
  _initializeTemplates() {
    return {
      // قالب خطة التأهيل الشاملة
      comprehensive: {
        name: 'خطة التأهيل الشاملة',
        nameEn: 'Comprehensive Rehabilitation Plan',
        sections: [
          'المعلومات الأساسية',
          'التقييم التشخيصي',
          'تحديد الأولويات',
          'الأهداف طويلة المدى',
          'الأهداف قصيرة المدى',
          'التدخلات والخدمات',
          'الجدول الزمني',
          'معايير النجاح',
          'خطة_transition',
          'الموارد المطلوبة',
          'متابعة وتقييم',
        ],
        duration: { default: 12, unit: 'months' },
        reviewFrequency: 'quarterly',
      },

      // قالب خطة التأهيل المهني
      vocational: {
        name: 'خطة التأهيل المهني',
        nameEn: 'Vocational Rehabilitation Plan',
        sections: [
          'تقييم المهارات المهنية',
          'تحديد الميول المهنية',
          'التدريب المطلوب',
          'الشهادات المستهدفة',
          'خطة البحث عن عمل',
          'التوظيف المدعوم',
          'متابعة ما بعد التوظيف',
        ],
        duration: { default: 6, unit: 'months' },
        reviewFrequency: 'monthly',
      },

      // قالب خطة التأهيل التعليمي
      educational: {
        name: 'خطة التربية الخاصة (IEP)',
        nameEn: 'Individualized Education Program',
        sections: [
          'المستوى الحالي للأداء',
          'الأهداف التعليمية',
          'التكييفات والتعديلات',
          'الخدمات الداعمة',
          'بيئة التعلم',
          'التقييم المستمر',
          'المشاركة الأسرية',
        ],
        duration: { default: 1, unit: 'academic_year' },
        reviewFrequency: 'quarterly',
      },

      // قالب خطة التدخل المبكر
      earlyIntervention: {
        name: 'خطة التدخل المبكر (IFSP)',
        nameEn: 'Individualized Family Service Plan',
        sections: [
          'تقييم النمو',
          'احتياجات الأسرة',
          'الأهداف الوظيفية',
          'الخدمات المطلوبة',
          'البيئة الطبيعية',
          'الانتقال للتعليم',
        ],
        duration: { default: 6, unit: 'months' },
        reviewFrequency: 'monthly',
      },

      // قالب خطة الحياة المستقلة
      independentLiving: {
        name: 'خطة الحياة المستقلة',
        nameEn: 'Independent Living Plan',
        sections: [
          'تقييم مهارات الحياة',
          'أهداف الاستقلالية',
          'السكن المستقل',
          'إدارة المال',
          'التنقل والمواصلات',
          'العلاقات الاجتماعية',
          'الصحة والسلامة',
        ],
        duration: { default: 18, unit: 'months' },
        reviewFrequency: 'quarterly',
      },
    };
  }

  /**
   * تهيئة بنك الأهداف
   */
  _initializeGoalBank() {
    return {
      // أهداف المهارات الحركية
      motorSkills: {
        grossMotor: [
          {
            code: 'GM-01',
            description: 'يحافظ على وضعية الجلوس لمدة 5 دقائق',
            criteria: '80% من المحاولات',
          },
          {
            code: 'GM-02',
            description: 'يمشي لمسافة 10 أمتار بدون مساعدة',
            criteria: '3 من 4 محاولات',
          },
          { code: 'GM-03', description: 'يصعد وينزل الدرج بالتناوب', criteria: 'بإشراف خفيف' },
          { code: 'GM-04', description: 'يقفز بمقدار قدمين معاً', criteria: '5 قفزات متتالية' },
          { code: 'GM-05', description: 'يركض ويغير الاتجاه', criteria: 'دون سقوط' },
        ],
        fineMotor: [
          { code: 'FM-01', description: 'يمسك القلم بشكل صحيح', criteria: 'بشكل مستقل' },
          { code: 'FM-02', description: 'يكتب اسمه بشكل مقروء', criteria: '80% وضوح' },
          { code: 'FM-03', description: 'يستخدم المقص لقص الأشكال', criteria: 'دقة 70%' },
          { code: 'FM-04', description: 'يزر الأزرار ويفتحها', criteria: 'خلال دقيقتين' },
          { code: 'FM-05', description: 'يربط الحزام', criteria: 'بشكل مستقل' },
        ],
      },

      // أهداف التواصل
      communication: {
        receptive: [
          {
            code: 'CR-01',
            description: 'يفهم التعليمات البسيطة (خطوة واحدة)',
            criteria: '90% من المحاولات',
          },
          {
            code: 'CR-02',
            description: 'يفهم التعليمات المركبة (2-3 خطوات)',
            criteria: '80% من المحاولات',
          },
          { code: 'CR-03', description: 'يستجيب للأسئلة نعم/لا', criteria: 'بشكل صحيح' },
          { code: 'CR-04', description: 'يتبع قواعد السلامة اللفظية', criteria: 'في جميع الأوقات' },
        ],
        expressive: [
          { code: 'CE-01', description: 'يعبر عن احتياجاته الأساسية', criteria: 'بوضوح' },
          { code: 'CE-02', description: 'يكون جمل من 4-5 كلمات', criteria: 'بشكل متسق' },
          { code: 'CE-03', description: 'يروي أحداث بسيطة بتسلسل', criteria: '3 من 4 محاولات' },
          { code: 'CE-04', description: 'يشارك في محادثة بسيطة', criteria: '3 دورات على الأقل' },
          { code: 'CE-05', description: 'يطرح أسئلة مناسبة للموقف', criteria: 'بشكل تلقائي' },
        ],
        social: [
          { code: 'CS-01', description: 'يبدأ التحية بشكل مناسب', criteria: '4 من 5 فرص' },
          { code: 'CS-02', description: 'يحافظ على التواصل البصري', criteria: '3-5 ثواني' },
          { code: 'CS-03', description: 'يأخذ دور في المحادثة', criteria: 'بدون تذكير' },
          { code: 'CS-04', description: 'يظهر التعاطف مع الآخرين', criteria: 'عند الحاجة' },
        ],
      },

      // أهداف الحياة اليومية
      dailyLiving: {
        selfCare: [
          { code: 'SC-01', description: 'يستحم بشكل مستقل', criteria: 'بشكل آمن' },
          { code: 'SC-02', description: 'يرتدي ملابسه بشكل صحيح', criteria: 'خلال 10 دقائق' },
          { code: 'SC-03', description: 'يتناول الطعام باستخدام الأدوات', criteria: 'بشكل مناسب' },
          { code: 'SC-04', description: 'يستخدم المرحاض بشكل مستقل', criteria: 'في جميع الأوقات' },
          { code: 'SC-05', description: 'ينظف أسنانه', criteria: 'صباحاً ومساءً' },
        ],
        homeSkills: [
          { code: 'HS-01', description: 'يحضر وجبة بسيطة', criteria: 'بشكل آمن' },
          { code: 'HS-02', description: 'ينظف غرفته', criteria: 'مع تذكير بسيط' },
          { code: 'HS-03', description: 'يرتب سريره', criteria: 'يومياً' },
          { code: 'HS-04', description: 'يفرز الملابس للغسيل', criteria: 'بشكل صحيح' },
          {
            code: 'HS-05',
            description: 'يتعامل مع الأجهزة المنزلية البسيطة',
            criteria: 'بشكل آمن',
          },
        ],
        community: [
          { code: 'CM-01', description: 'يتسوق من المتجر', criteria: 'مع إشراف' },
          { code: 'CM-02', description: 'يستخدم المواصلات العامة', criteria: 'بأمان' },
          { code: 'CM-03', description: 'يتعامل مع المال', criteria: 'تغيير صحيح' },
          { code: 'CM-04', description: 'يطلب المساعدة عند الحاجة', criteria: 'بشكل مناسب' },
        ],
      },

      // أهداف السلوك التكيفي
      adaptiveBehavior: {
        social: [
          { code: 'AB-01', description: 'يتبع القواعد والروتين', criteria: '90% من الوقت' },
          { code: 'AB-02', description: 'يتحمل المسؤولية', criteria: 'بدون تذكير' },
          { code: 'AB-03', description: 'يحل المشكلات البسيطة', criteria: 'بشكل مستقل' },
          { code: 'AB-04', description: 'يتعامل مع الإحباط', criteria: 'بدون سلوكيات غير لائقة' },
        ],
        emotional: [
          { code: 'EM-01', description: 'يتعرف على مشاعره', criteria: 'بدقة 80%' },
          { code: 'EM-02', description: 'يعبر عن المشاعر بشكل مناسب', criteria: '4 من 5 مرات' },
          { code: 'EM-03', description: 'يستخدم استراتيجيات الهدوء', criteria: 'عند الحاجة' },
          { code: 'EM-04', description: 'يتعامل مع التغييرات', criteria: 'بتجاوب إيجابي' },
        ],
      },

      // أهداف التعليم
      academic: {
        reading: [
          { code: 'RD-01', description: 'يتعرف على الحروف الهجائية', criteria: 'جميع الحروف' },
          { code: 'RD-02', description: 'يقرأ كلمات من 3-4 حروف', criteria: '90% دقة' },
          { code: 'RD-03', description: 'يقرأ جمل بسيطة', criteria: 'بفهم' },
          { code: 'RD-04', description: 'يفهم النص المقروء', criteria: 'السؤال الأساسي' },
        ],
        writing: [
          { code: 'WR-01', description: 'يكتب الحروف بشكل واضح', criteria: 'جميع الحروف' },
          { code: 'WR-02', description: 'يكتب كلمات بالإملاء', criteria: '80% صحيح' },
          { code: 'WR-03', description: 'يكتب جمل كاملة', criteria: 'بتنسيق صحيح' },
          { code: 'WR-04', description: 'يكتب فقرة قصيرة', criteria: 'بتسلسل منطقي' },
        ],
        mathematics: [
          { code: 'MT-01', description: 'يعد من 1-100', criteria: 'بدون أخطاء' },
          { code: 'MT-02', description: 'يجري عمليات الجمع والطرح', criteria: 'دقة 85%' },
          { code: 'MT-03', description: 'يتعرف على الأشكال الهندسية', criteria: 'جميع الأشكال' },
          { code: 'MT-04', description: 'يحل مسائل كلامية بسيطة', criteria: '70% صحيح' },
        ],
      },

      // أهداف التأهيل المهني
      vocational: {
        workReadiness: [
          { code: 'VR-01', description: 'يحترم المواعيد', criteria: 'في جميع الأيام' },
          { code: 'VR-02', description: 'يتبع تعليمات العمل', criteria: 'بدون تذكير' },
          { code: 'VR-03', description: 'يعمل ضمن فريق', criteria: 'بتعاون' },
          { code: 'VR-04', description: 'يكمل المهام في الوقت المحدد', criteria: '90% من المهام' },
        ],
        jobSkills: [
          { code: 'JK-01', description: 'يستخدم الحاسوب بشكل أساسي', criteria: 'بشكل مستقل' },
          { code: 'JK-02', description: 'يتواصل هاتفياً بشكل مهني', criteria: 'بشكل مناسب' },
          { code: 'JK-03', description: 'ينظم ملفات العمل', criteria: 'بنظام' },
          { code: 'JK-04', description: 'يقدم خدمة عملاء أساسية', criteria: 'بشكل مهذب' },
        ],
      },
    };
  }

  /**
   * تهيئة استراتيجيات التدخل
   */
  _initializeInterventionStrategies() {
    return {
      physicalTherapy: {
        name: 'العلاج الطبيعي',
        code: 'PT',
        frequency: { min: 1, max: 5, unit: 'sessions/week' },
        duration: { min: 30, max: 60, unit: 'minutes' },
        settings: ['مركز التأهيل', 'المنزل', 'المجتمع'],
        approaches: [
          'تمارين تقوية العضلات',
          'تمارين مدى الحركة',
          'تدريب التوازن',
          'تدريب المشي',
          'العلاج المائي',
          'الوظائف الحركية',
        ],
      },
      occupationalTherapy: {
        name: 'العلاج الوظيفي',
        code: 'OT',
        frequency: { min: 1, max: 5, unit: 'sessions/week' },
        duration: { min: 30, max: 60, unit: 'minutes' },
        settings: ['مركز التأهيل', 'المنزل', 'المدرسة', 'العمل'],
        approaches: [
          'تدريب المهارات الحركية الدقيقة',
          'تدريب الحياة اليومية',
          'التكامل الحسي',
          'التدريب المعرفي',
          'تكييف البيئة',
          'التقنيات المساعدة',
        ],
      },
      speechTherapy: {
        name: 'علاج التخاطب',
        code: 'ST',
        frequency: { min: 1, max: 3, unit: 'sessions/week' },
        duration: { min: 30, max: 45, unit: 'minutes' },
        settings: ['مركز التأهيل', 'المنزل', 'المدرسة'],
        approaches: [
          'تحسين النطق',
          'تطوير اللغة الاستقبالية',
          'تطوير اللغة التعبيرية',
          'التواصل البديل والمعزز (AAC)',
          'علاج البلع',
          'تدريب الطلاقة',
        ],
      },
      psychologicalSupport: {
        name: 'الدعم النفسي',
        code: 'PSY',
        frequency: { min: 1, max: 2, unit: 'sessions/week' },
        duration: { min: 45, max: 60, unit: 'minutes' },
        settings: ['مركز التأهيل', 'عن بعد'],
        approaches: [
          'العلاج السلوكي المعرفي',
          'الإرشاد النفسي',
          'العلاج باللعب',
          'مجموعات الدعم',
          'إدارة الضغوط',
          'بناء احترام الذات',
        ],
      },
      specialEducation: {
        name: 'التربية الخاصة',
        code: 'SE',
        frequency: { daily: true, unit: 'school_days' },
        duration: { min: 1, max: 6, unit: 'hours/day' },
        settings: ['مدرسة خاصة', 'فصل دامج', 'غرفة مصادر', 'تعليم منزلي'],
        approaches: [
          'التعليم الفردي',
          'التعليم في مجموعات صغيرة',
          'التعليم المتمايز',
          'التدريس المصحح',
          'استراتيجيات التعلم',
          'التكييفات الأكاديمية',
        ],
      },
      vocationalTraining: {
        name: 'التدريب المهني',
        code: 'VT',
        frequency: { min: 2, max: 5, unit: 'days/week' },
        duration: { min: 2, max: 8, unit: 'hours/day' },
        settings: ['مركز تدريب', 'بيئة عمل', 'عن بعد'],
        approaches: [
          'التدريب العملي',
          'التدريب على المهارات',
          'التدريب الوظيفي',
          'التوظيف المدعوم',
          'التدريب على المقابلات',
          'بناء السيرة الذاتية',
        ],
      },
    };
  }

  /**
   * إنشاء خطة تأهيل فردية جديدة
   */
  async createPlan(planData) {
    const planId = `IRP-${Date.now()}-${uuidv4().substring(0, 8)}`;

    const template = this.templates[planData.templateType] || this.templates.comprehensive;

    const plan = {
      // المعلومات الأساسية
      id: planId,
      type: planData.templateType || 'comprehensive',
      template: template.name,

      // معلومات المستفيد
      beneficiary: {
        id: planData.beneficiaryId,
        name: planData.beneficiaryName,
        dateOfBirth: planData.dateOfBirth,
        disabilityType: planData.disabilityType,
        disabilitySeverity: planData.disabilitySeverity,
        currentStatus: planData.currentStatus,
      },

      // معلومات الخطة
      dates: {
        created: new Date(),
        effective: planData.effectiveDate || new Date(),
        review: this._calculateReviewDate(
          planData.effectiveDate || new Date(),
          template.reviewFrequency
        ),
        expiration: this._calculateExpirationDate(
          planData.effectiveDate || new Date(),
          template.duration
        ),
      },

      // الفريق المتعدد التخصصات
      team: {
        coordinator: planData.coordinator || null,
        members: planData.teamMembers || [],
        primaryTherapist: planData.primaryTherapist || null,
        familyContact: planData.familyContact || null,
      },

      // التقييم والتشخيص
      assessment: {
        summary: planData.assessmentSummary || '',
        strengths: planData.strengths || [],
        needs: planData.needs || [],
        priorityNeeds: planData.priorityNeeds || [],
        recommendations: planData.recommendations || [],
      },

      // الأهداف
      goals: {
        longTerm: [],
        shortTerm: [],
        objectives: [],
      },

      // التدخلات والخدمات
      services: {
        primary: [],
        supplementary: [],
        related: [],
        accommodations: [],
      },

      // الجدول الزمني
      schedule: {
        weekly: {},
        milestones: [],
        reviewDates: [],
      },

      // معايير النجاح
      successCriteria: {
        measurable: [],
        functional: [],
        qualitative: [],
      },

      // الموارد
      resources: {
        equipment: [],
        materials: [],
        community: [],
        financial: [],
      },

      // التقدم والمتابعة
      progress: {
        measurements: [],
        notes: [],
        adjustments: [],
      },

      // الموافقات
      approvals: {
        beneficiary: { signed: false, date: null },
        guardian: { signed: false, date: null },
        coordinator: { signed: false, date: null },
      },

      // الحالة
      status: 'draft',
      version: 1,
      history: [],
    };

    // إضافة الأهداف الأولية إن وجدت
    if (planData.initialGoals) {
      plan.goals = this._processGoals(planData.initialGoals);
    }

    // إضافة الخدمات الأولية إن وجدت
    if (planData.initialServices) {
      plan.services = this._processServices(planData.initialServices);
    }

    // حفظ الخطة
    this.plans.set(planId, plan);

    return {
      success: true,
      planId,
      plan,
      message: 'تم إنشاء خطة التأهيل بنجاح',
    };
  }

  /**
   * إضافة هدف للخطة
   */
  addGoal(planId, goalData) {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error('الخطة غير موجودة');
    }

    const goal = {
      id: `G-${Date.now()}`,
      code: goalData.code || this._generateGoalCode(goalData.domain),
      domain: goalData.domain,
      area: goalData.area,

      // نص الهدف
      description: goalData.description,
      measurable: goalData.measurable || true,

      // معايير الأداء
      criteria: {
        accuracy: goalData.accuracy || 80,
        frequency: goalData.frequency || '4 من 5 محاولات',
        conditions: goalData.conditions || [],
        independence: goalData.independence || 'بشكل مستقل',
      },

      // الجدول الزمني
      timeline: {
        startDate: goalData.startDate || new Date(),
        targetDate: goalData.targetDate,
        reviewDate: this._addMonths(new Date(), 1),
      },

      // الأولوية
      priority: goalData.priority || 'medium', // high, medium, low

      // نوع الهدف
      type: goalData.type || 'short-term', // long-term, short-term, objective

      // الهدف المرتبط (للأهداف قصيرة المدى والأهداف التفصيلية)
      parentGoal: goalData.parentGoal || null,

      // التقدم
      progress: {
        baseline: goalData.baseline || 0,
        current: goalData.baseline || 0,
        target: goalData.target || 100,
        measurements: [],
        lastUpdated: new Date(),
      },

      // التدخلات المرتبطة
      interventions: goalData.interventions || [],

      // المسؤول
      responsible: goalData.responsible || null,

      // الحالة
      status: 'active', // active, achieved, modified, discontinued

      // الملاحظات
      notes: [],
    };

    // تصنيف الهدف وإضافته للقسم المناسب
    if (goal.type === 'long-term') {
      plan.goals.longTerm.push(goal);
    } else if (goal.type === 'short-term') {
      plan.goals.shortTerm.push(goal);
    } else {
      plan.goals.objectives.push(goal);
    }

    // تحديث تاريخ التعديل
    this._recordChange(plan, 'goal_added', { goalId: goal.id });

    return {
      success: true,
      goal,
      message: 'تم إضافة الهدف بنجاح',
    };
  }

  /**
   * تحديث تقدم الهدف
   */
  updateGoalProgress(planId, goalId, progressData) {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error('الخطة غير موجودة');
    }

    // البحث عن الهدف
    const goal = this._findGoal(plan, goalId);
    if (!goal) {
      throw new Error('الهدف غير موجود');
    }

    // تسجيل القياس الجديد
    const measurement = {
      date: new Date(),
      value: progressData.value,
      method: progressData.method,
      observer: progressData.observer,
      context: progressData.context || null,
      notes: progressData.notes || null,
    };

    goal.progress.measurements.push(measurement);
    goal.progress.current = progressData.value;
    goal.progress.lastUpdated = new Date();

    // تحديث حالة الهدف
    const progressPercent =
      ((progressData.value - goal.progress.baseline) /
        (goal.progress.target - goal.progress.baseline)) *
      100;

    if (progressPercent >= 100 && progressData.value >= goal.progress.target) {
      goal.status = 'achieved';
    } else if (progressPercent >= 80) {
      goal.status = 'on_track';
    } else if (progressPercent >= 50) {
      goal.status = 'making_progress';
    } else {
      goal.status = 'needs_attention';
    }

    // تسجيل التغيير
    this._recordChange(plan, 'goal_progress_updated', {
      goalId,
      progress: progressData.value,
      status: goal.status,
    });

    return {
      success: true,
      goal,
      progressPercent,
      status: goal.status,
      message: 'تم تحديث التقدم بنجاح',
    };
  }

  /**
   * إضافة خدمة للخطة
   */
  addService(planId, serviceData) {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error('الخطة غير موجودة');
    }

    const strategy = this.interventionStrategies[serviceData.type];
    if (!strategy) {
      throw new Error('نوع الخدمة غير معروف');
    }

    const service = {
      id: `S-${Date.now()}`,
      type: serviceData.type,
      name: strategy.name,
      code: strategy.code,

      // التفاصيل
      description: serviceData.description,
      goals: serviceData.relatedGoals || [],

      // التكرار والمدة
      frequency: {
        sessions: serviceData.sessionsPerWeek || 2,
        perWeek: serviceData.sessionsPerWeek || 2,
        duration: serviceData.sessionDuration || 45,
        durationUnit: 'minutes',
      },

      // المكان
      setting: serviceData.setting || 'مركز التأهيل',

      // المقدم
      provider: {
        name: serviceData.providerName || null,
        qualification: serviceData.providerQualification || null,
        contact: serviceData.providerContact || null,
      },

      // الجدول
      schedule: serviceData.schedule || null,

      // التكلفة
      cost: {
        perSession: serviceData.costPerSession || null,
        coveredBy: serviceData.coveredBy || null,
        priorAuthorization: serviceData.priorAuthorization || false,
      },

      // التقدم
      progress: {
        sessionsCompleted: 0,
        sessionsPlanned: 0,
        attendance: [],
        outcomes: [],
      },

      // الحالة
      status: 'planned', // planned, active, suspended, completed

      // الملاحظات
      notes: [],
    };

    // إضافة الخدمة للقسم المناسب
    if (serviceData.category === 'primary') {
      plan.services.primary.push(service);
    } else if (serviceData.category === 'supplementary') {
      plan.services.supplementary.push(service);
    } else if (serviceData.category === 'related') {
      plan.services.related.push(service);
    } else {
      plan.services.primary.push(service);
    }

    this._recordChange(plan, 'service_added', { serviceId: service.id });

    return {
      success: true,
      service,
      message: 'تم إضافة الخدمة بنجاح',
    };
  }

  /**
   * تسجيل جلسة خدمة
   */
  recordServiceSession(planId, serviceId, sessionData) {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error('الخطة غير موجودة');
    }

    const service = this._findService(plan, serviceId);
    if (!service) {
      throw new Error('الخدمة غير موجودة');
    }

    const session = {
      id: `SESSION-${Date.now()}`,
      date: sessionData.date || new Date(),
      duration: sessionData.duration || service.frequency.duration,
      therapist: sessionData.therapist || service.provider.name,

      // الحضور
      attendance: {
        present: sessionData.present !== false,
        late: sessionData.late || false,
        lateMinutes: sessionData.lateMinutes || 0,
        cancelled: sessionData.cancelled || false,
        cancellationReason: sessionData.cancellationReason || null,
      },

      // المحتوى
      content: {
        activities: sessionData.activities || [],
        skillsAddressed: sessionData.skillsAddressed || [],
        materialsUsed: sessionData.materialsUsed || [],
      },

      // الملاحظات
      observations: {
        participantResponse: sessionData.participantResponse || null,
        behavior: sessionData.behavior || null,
        engagement: sessionData.engagement || null, // high, medium, low
        challenges: sessionData.challenges || [],
        successes: sessionData.successes || [],
      },

      // التقدم نحو الأهداف
      goalProgress: sessionData.goalProgress || [],

      // التوصيات
      recommendations: {
        homeActivities: sessionData.homeActivities || [],
        nextSessionFocus: sessionData.nextSessionFocus || null,
        modifications: sessionData.modifications || [],
      },

      // التوقيعات
      signatures: {
        therapist: { signed: false, date: null },
        supervisor: { signed: false, date: null },
      },
    };

    // تحديث عداد الجلسات
    service.progress.sessionsCompleted++;
    service.progress.attendance.push(session);

    // تحديث حالة الخدمة
    if (service.status === 'planned') {
      service.status = 'active';
    }

    this._recordChange(plan, 'session_recorded', { serviceId, sessionId: session.id });

    return {
      success: true,
      session,
      totalSessions: service.progress.sessionsCompleted,
      message: 'تم تسجيل الجلسة بنجاح',
    };
  }

  /**
   * إنشاء تقرير تقدم شامل
   */
  generateProgressReport(planId, reportOptions = {}) {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error('الخطة غير موجودة');
    }

    const report = {
      // معلومات التقرير
      reportInfo: {
        id: `RPT-${Date.now()}`,
        generatedAt: new Date(),
        period: {
          start: reportOptions.startDate || plan.dates.effective,
          end: reportOptions.endDate || new Date(),
        },
        type: reportOptions.type || 'quarterly', // weekly, monthly, quarterly, annual
      },

      // معلومات المستفيد والخطة
      beneficiary: plan.beneficiary,
      planInfo: {
        id: plan.id,
        type: plan.template,
        status: plan.status,
        duration: this._calculateDuration(plan.dates.effective, new Date()),
      },

      // ملخص تنفيذي
      executiveSummary: this._generateExecutiveSummary(plan),

      // تقدم الأهداف
      goalsProgress: this._analyzeGoalsProgress(plan),

      // تقدم الخدمات
      servicesSummary: this._summarizeServices(plan),

      // الحضور والالتزام
      attendance: this._analyzeAttendance(plan),

      // الإنجازات
      achievements: this._identifyAchievements(plan),

      // التحديات
      challenges: this._identifyChallenges(plan),

      // التوصيات
      recommendations: this._generateRecommendations(plan),

      // الخطوات التالية
      nextSteps: this._generateNextSteps(plan),

      // الرسوم البيانية (بيانات)
      charts: {
        goalsProgressChart: this._prepareGoalsChartData(plan),
        attendanceChart: this._prepareAttendanceChartData(plan),
        servicesChart: this._prepareServicesChartData(plan),
      },
    };

    return report;
  }

  /**
   * مراجعة وتحديث الخطة
   */
  reviewPlan(planId, reviewData) {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error('الخطة غير موجودة');
    }

    const review = {
      id: `REVIEW-${Date.now()}`,
      date: new Date(),
      type: reviewData.type || 'quarterly', // monthly, quarterly, annual, special

      // المشاركون
      participants: reviewData.participants || [],

      // مراجعة الأهداف
      goalsReview: {
        achieved: [],
        onTrack: [],
        needsModification: [],
        discontinued: [],
      },

      // مراجعة الخدمات
      servicesReview: {
        effective: [],
        needsAdjustment: [],
        toBeAdded: [],
        toBeDiscontinued: [],
      },

      // القرارات
      decisions: reviewData.decisions || [],

      // التعديلات المقترحة
      modifications: [],

      // التوقيعات
      signatures: [],

      // تاريخ المراجعة القادمة
      nextReviewDate: null,
    };

    // تحليل الأهداف
    for (const goal of [
      ...plan.goals.longTerm,
      ...plan.goals.shortTerm,
      ...plan.goals.objectives,
    ]) {
      const progressPercent = this._calculateGoalProgressPercent(goal);

      if (goal.status === 'achieved') {
        review.goalsReview.achieved.push({ goal, progressPercent });
      } else if (progressPercent >= 75) {
        review.goalsReview.onTrack.push({ goal, progressPercent });
      } else if (progressPercent >= 25) {
        review.goalsReview.needsModification.push({ goal, progressPercent });
      } else {
        review.goalsReview.needsModification.push({ goal, progressPercent });
      }
    }

    // تحليل الخدمات
    for (const service of [...plan.services.primary, ...plan.services.supplementary]) {
      const effectiveness = this._assessServiceEffectiveness(service);
      review.servicesReview[effectiveness.category].push({ service, effectiveness });
    }

    // تحديد تاريخ المراجعة القادمة
    review.nextReviewDate = this._calculateReviewDate(
      new Date(),
      this.templates[plan.type].reviewFrequency
    );

    // إضافة المراجعة للخطة
    plan.progress.adjustments.push(review);
    plan.schedule.reviewDates.push({
      planned: review.nextReviewDate,
      completed: review.date,
    });

    // تحديث رقم الإصدار
    plan.version++;
    this._recordChange(plan, 'plan_reviewed', { reviewId: review.id });

    return {
      success: true,
      review,
      nextReviewDate: review.nextReviewDate,
      message: 'تمت المراجعة بنجاح',
    };
  }

  /**
   * الحصول على أهداف من البنك
   */
  getGoalsFromBank(domain, area = null) {
    if (!this.goalBank[domain]) {
      return { success: false, message: 'المجال غير موجود' };
    }

    if (area && this.goalBank[domain][area]) {
      return {
        success: true,
        domain,
        area,
        goals: this.goalBank[domain][area],
      };
    }

    return {
      success: true,
      domain,
      goals: this.goalBank[domain],
    };
  }

  /**
   * تخصيص هدف من البنك
   */
  customizeGoalFromBank(planId, goalCode, customizations) {
    // البحث عن الهدف في البنك
    let bankGoal = null;
    for (const domain of Object.values(this.goalBank)) {
      for (const area of Object.values(domain)) {
        const found = area.find(g => g.code === goalCode);
        if (found) {
          bankGoal = found;
          break;
        }
      }
      if (bankGoal) break;
    }

    if (!bankGoal) {
      throw new Error('الهدف غير موجود في البنك');
    }

    // إنشاء هدف مخصص
    const customizedGoal = {
      code: bankGoal.code,
      description: customizations.description || bankGoal.description,
      domain: customizations.domain,
      area: customizations.area,
      criteria: {
        accuracy: customizations.accuracy || 80,
        frequency: customizations.frequency || bankGoal.criteria,
        conditions: customizations.conditions || [],
        independence: customizations.independence || 'بشكل مستقل',
      },
      targetDate: customizations.targetDate,
      priority: customizations.priority || 'medium',
      type: customizations.type || 'short-term',
      baseline: customizations.baseline || 0,
      target: customizations.target || 100,
    };

    return this.addGoal(planId, customizedGoal);
  }

  // ==================== الدوال المساعدة ====================

  /**
   * حساب تاريخ المراجعة
   */
  _calculateReviewDate(startDate, frequency) {
    const date = new Date(startDate);
    switch (frequency) {
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      default:
        date.setMonth(date.getMonth() + 3);
    }
    return date;
  }

  /**
   * حساب تاريخ الانتهاء
   */
  _calculateExpirationDate(startDate, duration) {
    const date = new Date(startDate);
    if (duration.unit === 'months') {
      date.setMonth(date.getMonth() + duration.default);
    } else if (duration.unit === 'academic_year') {
      date.setMonth(date.getMonth() + 10);
    }
    return date;
  }

  /**
   * إضافة أشهر للتاريخ
   */
  _addMonths(date, months) {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  /**
   * توليد رمز الهدف
   */
  _generateGoalCode(domain) {
    const prefix = domain.substring(0, 2).toUpperCase();
    return `${prefix}-${Date.now().toString(36)}`;
  }

  /**
   * معالجة الأهداف الأولية
   */
  _processGoals(goals) {
    return {
      longTerm: goals.longTerm || [],
      shortTerm: goals.shortTerm || [],
      objectives: goals.objectives || [],
    };
  }

  /**
   * معالجة الخدمات الأولية
   */
  _processServices(services) {
    return {
      primary: services.primary || [],
      supplementary: services.supplementary || [],
      related: services.related || [],
      accommodations: services.accommodations || [],
    };
  }

  /**
   * البحث عن هدف في الخطة
   */
  _findGoal(plan, goalId) {
    return [...plan.goals.longTerm, ...plan.goals.shortTerm, ...plan.goals.objectives].find(
      g => g.id === goalId
    );
  }

  /**
   * البحث عن خدمة في الخطة
   */
  _findService(plan, serviceId) {
    return [
      ...plan.services.primary,
      ...plan.services.supplementary,
      ...plan.services.related,
    ].find(s => s.id === serviceId);
  }

  /**
   * تسجيل التغيير
   */
  _recordChange(plan, changeType, changeData) {
    plan.history.push({
      timestamp: new Date(),
      type: changeType,
      data: changeData,
    });
  }

  /**
   * حساب المدة
   */
  _calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return {
      months,
      days: Math.floor((end - start) / (1000 * 60 * 60 * 24)),
    };
  }

  /**
   * حساب نسبة تقدم الهدف
   */
  _calculateGoalProgressPercent(goal) {
    if (goal.progress.target === goal.progress.baseline) return 0;
    return (
      ((goal.progress.current - goal.progress.baseline) /
        (goal.progress.target - goal.progress.baseline)) *
      100
    );
  }

  /**
   * تقييم فعالية الخدمة
   */
  _assessServiceEffectiveness(service) {
    const totalSessions = service.progress.attendance.length;
    const presentSessions = service.progress.attendance.filter(s => s.attendance.present).length;
    const attendanceRate = totalSessions > 0 ? (presentSessions / totalSessions) * 100 : 0;

    if (attendanceRate >= 80) {
      return { category: 'effective', attendanceRate, score: 90 };
    } else if (attendanceRate >= 60) {
      return { category: 'needsAdjustment', attendanceRate, score: 70 };
    } else {
      return { category: 'toBeDiscontinued', attendanceRate, score: 30 };
    }
  }

  /**
   * توليد الملخص التنفيذي
   */
  _generateExecutiveSummary(plan) {
    const totalGoals =
      plan.goals.longTerm.length + plan.goals.shortTerm.length + plan.goals.objectives.length;
    const achievedGoals = [
      ...plan.goals.longTerm,
      ...plan.goals.shortTerm,
      ...plan.goals.objectives,
    ].filter(g => g.status === 'achieved').length;

    return {
      totalGoals,
      achievedGoals,
      achievementRate: totalGoals > 0 ? ((achievedGoals / totalGoals) * 100).toFixed(1) : 0,
      overallStatus: plan.status,
      keyAchievements: [],
      areasOfConcern: [],
      planOnTrack: achievedGoals / totalGoals >= 0.5,
    };
  }

  /**
   * تحليل تقدم الأهداف
   */
  _analyzeGoalsProgress(plan) {
    const analysis = {
      byDomain: {},
      byPriority: { high: [], medium: [], low: [] },
      overallProgress: 0,
    };

    const allGoals = [...plan.goals.longTerm, ...plan.goals.shortTerm, ...plan.goals.objectives];

    for (const goal of allGoals) {
      const progress = this._calculateGoalProgressPercent(goal);

      if (!analysis.byDomain[goal.domain]) {
        analysis.byDomain[goal.domain] = [];
      }
      analysis.byDomain[goal.domain].push({ goal, progress });

      if (goal.priority) {
        analysis.byPriority[goal.priority].push({ goal, progress });
      }
    }

    // حساب التقدم العام
    const totalProgress = allGoals.reduce(
      (sum, g) => sum + this._calculateGoalProgressPercent(g),
      0
    );
    analysis.overallProgress = allGoals.length > 0 ? totalProgress / allGoals.length : 0;

    return analysis;
  }

  /**
   * تلخيص الخدمات
   */
  _summarizeServices(plan) {
    const services = [
      ...plan.services.primary,
      ...plan.services.supplementary,
      ...plan.services.related,
    ];

    return {
      total: services.length,
      active: services.filter(s => s.status === 'active').length,
      completed: services.filter(s => s.status === 'completed').length,
      byType: services.reduce((acc, s) => {
        acc[s.type] = (acc[s.type] || 0) + 1;
        return acc;
      }, {}),
      sessionsSummary: services.map(s => ({
        type: s.type,
        name: s.name,
        completed: s.progress.sessionsCompleted,
        planned: s.progress.sessionsPlanned,
      })),
    };
  }

  /**
   * تحليل الحضور
   */
  _analyzeAttendance(plan) {
    const services = [...plan.services.primary, ...plan.services.supplementary];
    let totalSessions = 0;
    let presentSessions = 0;
    let cancelledSessions = 0;
    let lateSessions = 0;

    for (const service of services) {
      for (const session of service.progress.attendance) {
        totalSessions++;
        if (session.attendance.present) presentSessions++;
        if (session.attendance.cancelled) cancelledSessions++;
        if (session.attendance.late) lateSessions++;
      }
    }

    return {
      totalSessions,
      presentSessions,
      cancelledSessions,
      lateSessions,
      attendanceRate: totalSessions > 0 ? ((presentSessions / totalSessions) * 100).toFixed(1) : 0,
      punctualityRate:
        presentSessions > 0
          ? (((presentSessions - lateSessions) / presentSessions) * 100).toFixed(1)
          : 0,
    };
  }

  /**
   * تحديد الإنجازات
   */
  _identifyAchievements(plan) {
    const achievements = [];
    const allGoals = [...plan.goals.longTerm, ...plan.goals.shortTerm, ...plan.goals.objectives];

    for (const goal of allGoals) {
      if (goal.status === 'achieved') {
        achievements.push({
          type: 'goal_achieved',
          description: goal.description,
          date: goal.progress.lastUpdated,
          domain: goal.domain,
        });
      }
    }

    return achievements;
  }

  /**
   * تحديد التحديات
   */
  _identifyChallenges(plan) {
    const challenges = [];
    const allGoals = [...plan.goals.longTerm, ...plan.goals.shortTerm, ...plan.goals.objectives];

    for (const goal of allGoals) {
      if (goal.status === 'needs_attention') {
        challenges.push({
          type: 'goal_behind',
          description: goal.description,
          progress: this._calculateGoalProgressPercent(goal),
          domain: goal.domain,
        });
      }
    }

    return challenges;
  }

  /**
   * توليد التوصيات
   */
  _generateRecommendations(plan) {
    const recommendations = [];
    const progress = this._analyzeGoalsProgress(plan);

    if (progress.overallProgress < 50) {
      recommendations.push({
        priority: 'high',
        recommendation: 'مراجعة شاملة للخطة وتعديل الأهداف والتدخلات',
        reason: 'التقدم العام أقل من 50%',
      });
    }

    return recommendations;
  }

  /**
   * توليد الخطوات التالية
   */
  _generateNextSteps(plan) {
    return [
      'متابعة تنفيذ الأهداف النشطة',
      'تسجيل جلسات الخدمات المنتظمة',
      'التحضير للمراجعة القادمة',
      'تحديث بيانات التقدم',
    ];
  }

  /**
   * تجهيز بيانات رسم الأهداف
   */
  _prepareGoalsChartData(plan) {
    const domains = {};
    const allGoals = [...plan.goals.longTerm, ...plan.goals.shortTerm, ...plan.goals.objectives];

    for (const goal of allGoals) {
      if (!domains[goal.domain]) {
        domains[goal.domain] = { achieved: 0, inProgress: 0, notStarted: 0 };
      }

      const progress = this._calculateGoalProgressPercent(goal);
      if (progress >= 100) {
        domains[goal.domain].achieved++;
      } else if (progress > 0) {
        domains[goal.domain].inProgress++;
      } else {
        domains[goal.domain].notStarted++;
      }
    }

    return domains;
  }

  /**
   * تجهيز بيانات رسم الحضور
   */
  _prepareAttendanceChartData(plan) {
    const months = {};
    const services = [...plan.services.primary, ...plan.services.supplementary];

    for (const service of services) {
      for (const session of service.progress.attendance) {
        const month = new Date(session.date).toISOString().substring(0, 7);
        if (!months[month]) {
          months[month] = { present: 0, absent: 0 };
        }
        if (session.attendance.present) {
          months[month].present++;
        } else {
          months[month].absent++;
        }
      }
    }

    return months;
  }

  /**
   * تجهيز بيانات رسم الخدمات
   */
  _prepareServicesChartData(plan) {
    const services = [
      ...plan.services.primary,
      ...plan.services.supplementary,
      ...plan.services.related,
    ];

    return services.map(s => ({
      type: s.type,
      name: s.name,
      sessionsCompleted: s.progress.sessionsCompleted,
    }));
  }

  /**
   * الحصول على خطة
   */
  getPlan(planId) {
    return this.plans.get(planId);
  }

  /**
   * الحصول على جميع خطط مستفيد
   */
  getBeneficiaryPlans(beneficiaryId) {
    return Array.from(this.plans.values()).filter(p => p.beneficiary.id === beneficiaryId);
  }

  /**
   * الحصول على القوالب المتاحة
   */
  getAvailableTemplates() {
    return Object.entries(this.templates).map(([key, value]) => ({
      id: key,
      name: value.name,
      nameEn: value.nameEn,
      sections: value.sections,
      duration: value.duration,
      reviewFrequency: value.reviewFrequency,
    }));
  }
}

module.exports = { IndividualizedRehabilitationPlanService };
