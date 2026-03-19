/* eslint-disable no-unused-vars */
/**
 * Advanced Occupational Therapy Service for Disability Rehabilitation
 * خدمة العلاج الوظيفي المتقدمة لتأهيل ذوي الإعاقة
 */

class OccupationalTherapyService {
  constructor() {
    this.plans = new Map();
    this.activities = new Map();
    this.assessments = new Map();
    this.sessions = new Map();
    this.progressReports = new Map();
    this.adaptiveEquipment = new Map();
    this.workEnvironmentAnalysis = new Map();
  }

  /**
   * التقييم الشامل للمهارات الوظيفية
   */
  async assessFunctionalSkills(beneficiaryId, assessmentData) {
    const assessment = {
      id: Date.now().toString(),
      beneficiaryId,
      date: new Date(),
      assessorId: assessmentData.assessorId,

      // تقييم مهارات الحياة اليومية الأساسية (BADL)
      basicDailyLivingSkills: {
        selfCare: {
          score: assessmentData.selfCareScore || 0,
          maxScore: 100,
          components: {
            bathing: assessmentData.bathing || 0,
            grooming: assessmentData.grooming || 0,
            oralHygiene: assessmentData.oralHygiene || 0,
            hairCare: assessmentData.hairCare || 0,
          },
        },
        dressing: {
          score: assessmentData.dressingScore || 0,
          maxScore: 100,
          components: {
            upperBody: assessmentData.upperBodyDressing || 0,
            lowerBody: assessmentData.lowerBodyDressing || 0,
            fasteners: assessmentData.fasteners || 0,
            shoeSelection: assessmentData.shoeSelection || 0,
          },
        },
        eating: {
          score: assessmentData.eatingScore || 0,
          maxScore: 100,
          components: {
            utensilUse: assessmentData.utensilUse || 0,
            cupUse: assessmentData.cupUse || 0,
            swallowing: assessmentData.swallowing || 0,
            mealPreparation: assessmentData.mealPrep || 0,
          },
        },
        toileting: {
          score: assessmentData.toiletingScore || 0,
          maxScore: 100,
          components: {
            toiletTransfer: assessmentData.toiletTransfer || 0,
            clothingManagement: assessmentData.clothingManagement || 0,
            hygiene: assessmentData.hygiene || 0,
          },
        },
        mobility: {
          score: assessmentData.mobilityScore || 0,
          maxScore: 100,
          components: {
            bedMobility: assessmentData.bedMobility || 0,
            transfers: assessmentData.transfers || 0,
            ambulation: assessmentData.ambulation || 0,
            stairClimbing: assessmentData.stairClimbing || 0,
          },
        },
      },

      // تقييم مهارات الحياة اليومية الأدواتية (IADL)
      instrumentalDailyLivingSkills: {
        cooking: {
          score: assessmentData.cookingScore || 0,
          components: {
            mealPlanning: assessmentData.mealPlanning || 0,
            safeFoodPrep: assessmentData.safeFoodPrep || 0,
            applianceUse: assessmentData.applianceUse || 0,
            cleanup: assessmentData.cleanup || 0,
          },
        },
        cleaning: {
          score: assessmentData.cleaningScore || 0,
          components: {
            sweeping: assessmentData.sweeping || 0,
            dusting: assessmentData.dusting || 0,
            laundry: assessmentData.laundry || 0,
            dishwashing: assessmentData.dishwashing || 0,
          },
        },
        shopping: {
          score: assessmentData.shoppingScore || 0,
          components: {
            listMaking: assessmentData.listMaking || 0,
            storeNavigation: assessmentData.storeNavigation || 0,
            itemSelection: assessmentData.itemSelection || 0,
            payment: assessmentData.payment || 0,
          },
        },
        moneyManagement: {
          score: assessmentData.moneyScore || 0,
          components: {
            counting: assessmentData.counting || 0,
            budgeting: assessmentData.budgeting || 0,
            billPayment: assessmentData.billPayment || 0,
            banking: assessmentData.banking || 0,
          },
        },
        phoneUse: {
          score: assessmentData.phoneScore || 0,
          components: {
            dialing: assessmentData.dialing || 0,
            answering: assessmentData.answering || 0,
            messaging: assessmentData.messaging || 0,
            emergencyCalls: assessmentData.emergencyCalls || 0,
          },
        },
        transportation: {
          score: assessmentData.transportationScore || 0,
          components: {
            publicTransit: assessmentData.publicTransit || 0,
            driving: assessmentData.driving || 0,
            navigation: assessmentData.navigation || 0,
            safetyAwareness: assessmentData.safetyAwareness || 0,
          },
        },
      },

      // المهارات الحركية الدقيقة
      fineMotorSkills: {
        score: assessmentData.fineMotorScore || 0,
        components: {
          handDexterity: assessmentData.handDexterity || 0,
          fingerManipulation: assessmentData.fingerManipulation || 0,
          bilateralCoordination: assessmentData.bilateralCoordination || 0,
          handEyeCoordination: assessmentData.handEyeCoordination || 0,
          graspPatterns: assessmentData.graspPatterns || 0,
          release: assessmentData.release || 0,
          inHandManipulation: assessmentData.inHandManipulation || 0,
        },
      },

      // المهارات الحركية الكبيرة
      grossMotorSkills: {
        score: assessmentData.grossMotorScore || 0,
        components: {
          balance: assessmentData.balance || 0,
          coordination: assessmentData.coordination || 0,
          strength: assessmentData.strength || 0,
          endurance: assessmentData.endurance || 0,
          posturalControl: assessmentData.posturalControl || 0,
        },
      },

      // المهارات المعرفية الوظيفية
      cognitiveFunctionalSkills: {
        score: assessmentData.cognitiveScore || 0,
        components: {
          attention: assessmentData.attention || 0,
          memory: assessmentData.memory || 0,
          problemSolving: assessmentData.problemSolving || 0,
          executiveFunction: assessmentData.executiveFunction || 0,
          sequencing: assessmentData.sequencing || 0,
          timeManagement: assessmentData.timeManagement || 0,
        },
      },

      // المهارات الحسية
      sensoryProcessing: {
        score: assessmentData.sensoryScore || 0,
        components: {
          tactile: assessmentData.tactile || 0,
          visual: assessmentData.visual || 0,
          auditory: assessmentData.auditory || 0,
          vestibular: assessmentData.vestibular || 0,
          proprioceptive: assessmentData.proprioceptive || 0,
        },
      },

      // المهارات الاجتماعية والعاطفية
      socialEmotionalSkills: {
        score: assessmentData.socialScore || 0,
        components: {
          socialInteraction: assessmentData.socialInteraction || 0,
          emotionalRegulation: assessmentData.emotionalRegulation || 0,
          coping: assessmentData.coping || 0,
          selfAdvocacy: assessmentData.selfAdvocacy || 0,
          frustrationTolerance: assessmentData.frustrationTolerance || 0,
        },
      },

      // تقييم بيئة العمل (للتأهيل المهني)
      workEnvironment: assessmentData.workEnvironment || null,

      // التوصيات
      recommendations: [],
      priorityAreas: [],
      equipmentRecommendations: [],
      homeModifications: [],

      overallScore: 0,
      independenceLevel: '',
      nextAssessmentDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
    };

    // حساب النتائج
    assessment.overallScore = this._calculateOverallScore(assessment);
    assessment.independenceLevel = this._determineIndependenceLevel(assessment.overallScore);
    assessment.recommendations = this._generateRecommendations(assessment);
    assessment.priorityAreas = this._identifyPriorityAreas(assessment);

    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  /**
   * حساب النتيجة الإجمالية
   */
  _calculateOverallScore(assessment) {
    const scores = [
      assessment.basicDailyLivingSkills.selfCare.score,
      assessment.basicDailyLivingSkills.dressing.score,
      assessment.basicDailyLivingSkills.eating.score,
      assessment.basicDailyLivingSkills.toileting.score,
      assessment.basicDailyLivingSkills.mobility.score,
      assessment.instrumentalDailyLivingSkills.cooking.score,
      assessment.instrumentalDailyLivingSkills.cleaning.score,
      assessment.instrumentalDailyLivingSkills.shopping.score,
      assessment.instrumentalDailyLivingSkills.moneyManagement.score,
      assessment.instrumentalDailyLivingSkills.phoneUse.score,
      assessment.fineMotorSkills.score,
      assessment.grossMotorSkills.score,
      assessment.cognitiveFunctionalSkills.score,
    ];

    const validScores = scores.filter(s => s > 0);
    if (validScores.length === 0) return 0;
    return Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
  }

  /**
   * تحديد مستوى الاستقلالية
   */
  _determineIndependenceLevel(score) {
    if (score >= 90) return { level: 'مستقل تماماً', code: 'independent' };
    if (score >= 75) return { level: 'مستقل مع إشراف', code: 'supervised_independence' };
    if (score >= 50) return { level: 'يحتاج مساعدة جزئية', code: 'modified_independence' };
    if (score >= 25) return { level: 'يحتاج مساعدة كبيرة', code: 'moderate_dependence' };
    return { level: 'معتمد كلياً', code: 'total_dependence' };
  }

  /**
   * إنشاء خطة علاج وظيفي شاملة
   */
  async createOccupationalPlan(beneficiaryId, assessmentId, planData) {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) throw new Error('التقييم غير موجود');

    const plan = {
      id: Date.now().toString(),
      beneficiaryId,
      assessmentId,
      createdAt: new Date(),
      createdBy: planData.therapistId,

      // التشخيص والأهداف
      diagnosis: planData.diagnosis || '',
      primaryDiagnosis: planData.primaryDiagnosis,
      secondaryDiagnoses: planData.secondaryDiagnoses || [],

      // الأهداف طويلة المدى
      longTermGoals: this._createLongTermGoals(assessment, planData),

      // الأهداف قصيرة المدى
      shortTermGoals: this._createShortTermGoals(assessment, planData),

      // التدخلات العلاجية
      interventions: {
        dailyLivingSkills: this._planDLSTInterventions(assessment),
        fineMotor: this._planFineMotorInterventions(assessment),
        grossMotor: this._planGrossMotorInterventions(assessment),
        cognitive: this._planCognitiveInterventions(assessment),
        sensory: this._planSensoryInterventions(assessment),
        socialEmotional: this._planSocialEmotionalInterventions(assessment),
        vocational: planData.vocationalGoals
          ? this._planVocationalInterventions(assessment, planData)
          : [],
      },

      // الأنشطة العلاجية
      therapeuticActivities: this._recommendTherapeuticActivities(assessment),

      // المعدات التكيفية
      adaptiveEquipment: this._recommendAdaptiveEquipment(assessment),

      // تعديلات البيئة
      environmentalModifications: {
        home: this._assessHomeNeeds(assessment),
        work: assessment.workEnvironment ? this._assessWorkNeeds(assessment) : null,
        school: planData.schoolEnvironment ? this._assessSchoolNeeds(assessment) : null,
      },

      // جدول العلاج
      schedule: {
        frequency: planData.frequency || 2, // جلسات في الأسبوع
        duration: planData.duration || 45, // دقيقة
        totalWeeks: planData.totalWeeks || 12,
        sessions: [],
      },

      // فريق العلاج
      treatmentTeam: {
        primaryTherapist: planData.therapistId,
        supervisingTherapist: planData.supervisingTherapist,
        otherProviders: planData.otherProviders || [],
      },

      // معايير التقدم
      progressCriteria: this._defineProgressCriteria(assessment),

      status: 'active',
      reviewDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    };

    this.plans.set(plan.id, plan);
    return plan;
  }

  /**
   * إنشاء الأهداف طويلة المدى
   */
  _createLongTermGoals(assessment, planData) {
    const goals = [];

    // هدف الاستقلالية في الحياة اليومية
    if (assessment.overallScore < 75) {
      goals.push({
        id: 'LTG-1',
        domain: 'daily_living',
        goal: 'تحقيق الاستقلالية في أنشطة الحياة اليومية الأساسية',
        targetDate: new Date(new Date().setMonth(new Date().getMonth() + 6)),
        measureOfSuccess: 'أداء مستقل بنسبة 80% في مهارات BADL',
        baseline: assessment.overallScore,
        target: 80,
        status: 'active',
      });
    }

    // هدف المهارات الدقيقة
    if (assessment.fineMotorSkills.score < 70) {
      goals.push({
        id: 'LTG-2',
        domain: 'fine_motor',
        goal: 'تحسين المهارات الحركية الدقيقة للأداء الوظيفي',
        targetDate: new Date(new Date().setMonth(new Date().getMonth() + 4)),
        measureOfSuccess: 'تحسين بنسبة 25% في تقييم المهارات الدقيقة',
        baseline: assessment.fineMotorSkills.score,
        target: assessment.fineMotorSkills.score + 25,
        status: 'active',
      });
    }

    // هدف التوظيف (إن وجد)
    if (planData.vocationalGoals) {
      goals.push({
        id: 'LTG-3',
        domain: 'vocational',
        goal: 'التحضير للتوظيف المستقل أو المدعوم',
        targetDate: new Date(new Date().setMonth(new Date().getMonth() + 12)),
        measureOfSuccess: 'إكمال برنامج التأهيل المهني',
        baseline: 'تحديد المهارات الوظيفية',
        target: 'جاهزية للعمل',
        status: 'active',
      });
    }

    return goals;
  }

  /**
   * إنشاء الأهداف قصيرة المدى
   */
  _createShortTermGoals(assessment, planData) {
    const goals = [];
    let goalId = 1;

    // أهداف مهارات العناية الذاتية
    if (assessment.basicDailyLivingSkills.selfCare.score < 70) {
      goals.push({
        id: `STG-${goalId++}`,
        domain: 'self_care',
        goal: 'تحسين مهارات الاستحمام والنظافة الشخصية',
        targetDate: new Date(new Date().setMonth(new Date().getMonth() + 2)),
        objectives: [
          'القدرة على تنظيم مياه الاستحمام',
          'استخدام أدوات النظافة بشكل صحيح',
          'إكمال روتين الاستحمام بأقل مساعدة',
        ],
        methods: ['التدريب العملي', 'النمذجة', 'المهام المقيّمة'],
        baseline: assessment.basicDailyLivingSkills.selfCare.score,
        target: assessment.basicDailyLivingSkills.selfCare.score + 20,
        status: 'active',
      });
    }

    // أهداف ارتداء الملابس
    if (assessment.basicDailyLivingSkills.dressing.score < 70) {
      goals.push({
        id: `STG-${goalId++}`,
        domain: 'dressing',
        goal: 'تحسين القدرة على ارتداء الملابس بشكل مستقل',
        targetDate: new Date(new Date().setMonth(new Date().getMonth() + 2)),
        objectives: [
          'تمييز الأمام والخلف للملابس',
          'استخدام الأزرار والسحّابات',
          'ربط أحذية رياضية',
        ],
        methods: ['تدريب متسلسل', 'أدوات تكيفية', 'تكرار الممارسة'],
        baseline: assessment.basicDailyLivingSkills.dressing.score,
        target: assessment.basicDailyLivingSkills.dressing.score + 25,
        status: 'active',
      });
    }

    // أهداف المهارات الدقيقة
    if (assessment.fineMotorSkills.score < 70) {
      goals.push({
        id: `STG-${goalId++}`,
        domain: 'fine_motor',
        goal: 'تحسين التنسيق بين اليد والعين',
        targetDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        objectives: [
          'التقاط الأشياء الصغيرة بإصبعين',
          'نقل الأشياء بين اليدين',
          'استخدام الأدوات الكتابية',
        ],
        methods: ['تمارين الدقة', 'الأنشطة الحرفية', 'ألعاب التجميع'],
        baseline: assessment.fineMotorSkills.score,
        target: assessment.fineMotorSkills.score + 15,
        status: 'active',
      });
    }

    return goals;
  }

  /**
   * تخطيط تدخلات مهارات الحياة اليومية
   */
  _planDLSTInterventions(assessment) {
    const interventions = [];

    if (assessment.basicDailyLivingSkills.selfCare.score < 70) {
      interventions.push({
        type: 'training',
        name: 'تدريب روتين العناية الذاتية',
        description: 'تدريب منظم على مهارات النظافة الشخصية',
        frequency: 'يومياً',
        duration: '30 دقيقة',
        techniques: ['التدريب المتسلسل', 'التلعيم', 'التكرار'],
      });
    }

    if (assessment.basicDailyLivingSkills.dressing.score < 70) {
      interventions.push({
        type: 'training',
        name: 'تدريب ارتداء الملابس',
        description: 'تدريب على تقنيات ارتداء مختلف الملابس',
        frequency: 'يومياً',
        duration: '20 دقيقة',
        techniques: ['النمذجة البصرية', 'التوجيه اليدوي', 'الأدوات التكيفية'],
      });
    }

    if (assessment.instrumentalDailyLivingSkills.cooking.score < 60) {
      interventions.push({
        type: 'training',
        name: 'تدريب مهارات المطبخ',
        description: 'إعداد وجبات بسيطة وآمنة',
        frequency: '3 مرات أسبوعياً',
        duration: '45 دقيقة',
        techniques: ['التعليم المتدرج', 'سلامة المطبخ', 'تخطيط الوجبات'],
      });
    }

    return interventions;
  }

  /**
   * تخطيط تدخلات المهارات الدقيقة
   */
  _planFineMotorInterventions(assessment) {
    const interventions = [];

    interventions.push({
      type: 'therapeutic_activity',
      name: 'تمارين المهارات الدقيقة',
      description: 'أنشطة متنوعة لتحسين حركة اليد والأصابع',
      activities: [
        'نقل الحبات بالملقط',
        'الرسم والتلوين',
        'قص الورق',
        'التركيب والفك',
        'العقد والفك',
      ],
      frequency: 'يومياً',
      duration: '15-20 دقيقة',
    });

    if (assessment.fineMotorSkills.components.graspPatterns < 50) {
      interventions.push({
        type: 'therapeutic_activity',
        name: 'تدريب أنماط القبض',
        description: 'تطوير أنماط القبض الوظيفية',
        activities: ['القبض الكفّي', 'القبض الكفي الجانبي', 'القبض بالإبهام والسبابة'],
        frequency: 'يومياً',
        duration: '10 دقائق',
      });
    }

    return interventions;
  }

  /**
   * تخطيط تدخلات المهارات الكبيرة
   */
  _planGrossMotorInterventions(assessment) {
    const interventions = [];

    if (assessment.grossMotorSkills.components.balance < 60) {
      interventions.push({
        type: 'therapeutic_activity',
        name: 'تدريب التوازن',
        description: 'تمارين لتحسين التوازن والثبات',
        activities: [
          'الوقوف على قدم واحدة',
          'المشي على خط',
          'تمارين اللوح المتوازن',
          'الوقوف من الجلوس',
        ],
        frequency: 'يومياً',
        duration: '15 دقيقة',
      });
    }

    if (assessment.grossMotorSkills.components.coordination < 60) {
      interventions.push({
        type: 'therapeutic_activity',
        name: 'تدريب التنسيق الحركي',
        description: 'تحسين التنسيق بين جانبي الجسم',
        activities: ['تمارين التناسق الثنائي', 'تمرير الكرة', 'ألعاب التنسيق'],
        frequency: '3 مرات أسبوعياً',
        duration: '20 دقيقة',
      });
    }

    return interventions;
  }

  /**
   * تخطيط التدخلات المعرفية
   */
  _planCognitiveInterventions(assessment) {
    const interventions = [];

    if (assessment.cognitiveFunctionalSkills.components.memory < 60) {
      interventions.push({
        type: 'cognitive_training',
        name: 'تدريب الذاكرة الوظيفية',
        description: 'استراتيجيات لتحسين الذاكرة اليومية',
        techniques: ['استخدام المذكرات', 'المنبهات المرئية', 'الروتين المنظم', 'تقنيات الترميز'],
        frequency: 'يومياً',
        duration: '20 دقيقة',
      });
    }

    if (assessment.cognitiveFunctionalSkills.components.executiveFunction < 60) {
      interventions.push({
        type: 'cognitive_training',
        name: 'تدريب الوظائف التنفيذية',
        description: 'تحسين التخطيط والتنظيم',
        techniques: ['تقسيم المهام', 'قوائم التحقق', 'إدارة الوقت', 'حل المشكلات'],
        frequency: '3 مرات أسبوعياً',
        duration: '30 دقيقة',
      });
    }

    return interventions;
  }

  /**
   * تخطيط التدخلات الحسية
   */
  _planSensoryInterventions(assessment) {
    const interventions = [];

    if (assessment.sensoryProcessing.score < 70) {
      interventions.push({
        type: 'sensory_integration',
        name: 'العلاج الحسي التكاملي',
        description: 'أنشطة لتحسين معالجة المعلومات الحسية',
        components: [],
        frequency: '2-3 مرات أسبوعياً',
        duration: '30-45 دقيقة',
      });

      if (assessment.sensoryProcessing.components.tactile < 60) {
        interventions[0].components.push({
          sense: 'tactile',
          activities: ['صندوق الرمل', 'العجين', 'الأقمشة المختلفة'],
        });
      }

      if (assessment.sensoryProcessing.components.vestibular < 60) {
        interventions[0].components.push({
          sense: 'vestibular',
          activities: ['التأرجح', 'الدوران', 'التوازن'],
        });
      }
    }

    return interventions;
  }

  /**
   * تخطيط التدخلات الاجتماعية والعاطفية
   */
  _planSocialEmotionalInterventions(assessment) {
    const interventions = [];

    if (assessment.socialEmotionalSkills.components.emotionalRegulation < 60) {
      interventions.push({
        type: 'emotional_regulation',
        name: 'تدريب التنظيم العاطفي',
        description: 'استراتيجيات للتحكم في المشاعر',
        techniques: ['التنفس العميق', 'تقنيات الاسترخاء', 'تحديد المحفزات', 'استراتيجيات المواجهة'],
        frequency: 'حسب الحاجة',
        duration: '15-20 دقيقة',
      });
    }

    if (assessment.socialEmotionalSkills.components.socialInteraction < 60) {
      interventions.push({
        type: 'social_skills_training',
        name: 'تدريب المهارات الاجتماعية',
        description: 'تطوير مهارات التواصل والتفاعل',
        techniques: ['لعب الأدوار', 'النمذجة', 'التغذية الراجعة', 'الممارسة المجتمعية'],
        frequency: '2 مرات أسبوعياً',
        duration: '30 دقيقة',
      });
    }

    return interventions;
  }

  /**
   * تخطيط التدخلات المهنية
   */
  _planVocationalInterventions(assessment, planData) {
    const interventions = [];

    interventions.push({
      type: 'vocational_training',
      name: 'تقييم وتدريب مهني',
      description: 'التحضير للتوظيف',
      components: [
        'تقييم الاهتمامات والقدرات',
        'تطوير المهارات الوظيفية',
        'السلوكيات المهنية',
        'سلامة العمل',
      ],
      frequency: '3 مرات أسبوعياً',
      duration: '60 دقيقة',
    });

    return interventions;
  }

  /**
   * توصية الأنشطة العلاجية
   */
  _recommendTherapeuticActivities(assessment) {
    return {
      dailyLiving: [
        { name: 'تدريب الاستحمام', description: 'تدريب عملي على روتين الاستحمام', level: 'basic' },
        {
          name: 'تدريب ارتداء الملابس',
          description: 'تقنيات ارتداء الملابس بأنواعها',
          level: 'basic',
        },
        { name: 'تدريب الأكل', description: 'استخدام الأدوات وآداب الطعام', level: 'basic' },
      ],
      fineMotor: [
        { name: 'تمارين الإصبع', description: 'أنشطة لتقوية عضلات الأصابع', level: 'basic' },
        { name: 'الرسم والكتابة', description: 'تحسين السيطرة على القلم', level: 'intermediate' },
        { name: 'الأعمال الحرفية', description: 'أنشطة التجميع والتركيب', level: 'advanced' },
      ],
      sensoryIntegration: [
        { name: 'الاندماج الحسي', description: 'أنشطة متعددة الحواس', level: 'basic' },
        { name: 'فرش المقاومة', description: 'تقنيات الوايلبرغر', level: 'intermediate' },
      ],
      cognitive: [
        { name: 'ألعاب الذاكرة', description: 'تدريب الذاكرة العاملة', level: 'basic' },
        { name: 'حل المشكلات', description: 'أنشطة التفكير المنطقي', level: 'intermediate' },
        { name: 'التخطيط والتنظيم', description: 'مهارات الوظائف التنفيذية', level: 'advanced' },
      ],
    };
  }

  /**
   * توصية المعدات التكيفية
   */
  _recommendAdaptiveEquipment(assessment) {
    const equipment = [];

    // معدات الأكل
    if (assessment.basicDailyLivingSkills.eating.score < 60) {
      equipment.push({
        category: 'eating',
        items: [
          { name: 'ملاعق بمقابض عريضة', priority: 'high', estimatedCost: 50 },
          { name: 'أطباق بحواف عالية', priority: 'medium', estimatedCost: 30 },
          { name: 'أكواب بمقبضين', priority: 'medium', estimatedCost: 25 },
        ],
      });
    }

    // معدات ارتداء الملابس
    if (assessment.basicDailyLivingSkills.dressing.score < 60) {
      equipment.push({
        category: 'dressing',
        items: [
          { name: 'مرتجع للأحذية (شريط طويل)', priority: 'high', estimatedCost: 20 },
          { name: 'جراب للأزرار', priority: 'medium', estimatedCost: 15 },
          { name: 'جورب طويل للارتداء', priority: 'medium', estimatedCost: 25 },
        ],
      });
    }

    // معدات الحمام
    if (assessment.basicDailyLivingSkills.toileting.score < 60) {
      equipment.push({
        category: 'bathroom',
        items: [
          { name: 'مقعد مرحاض مرتفع', priority: 'high', estimatedCost: 150 },
          { name: 'مقابض أمان', priority: 'high', estimatedCost: 100 },
          { name: 'مقعد دش', priority: 'medium', estimatedCost: 200 },
        ],
      });
    }

    // معدات الكتابة
    if (assessment.fineMotorSkills.score < 60) {
      equipment.push({
        category: 'writing',
        items: [
          { name: 'أقلام بمقابض مكيفة', priority: 'medium', estimatedCost: 20 },
          { name: 'لوحة كتابة مائلة', priority: 'low', estimatedCost: 50 },
        ],
      });
    }

    return equipment;
  }

  /**
   * تقييم احتياجات تعديل المنزل
   */
  _assessHomeNeeds(assessment) {
    const modifications = {
      required: [],
      recommended: [],
      estimatedCost: 0,
    };

    // مدخل المنزل
    if (assessment.basicDailyLivingSkills.mobility.score < 50) {
      modifications.required.push({
        area: 'entrance',
        modifications: ['منحدر للكرسي المتحرك', 'درابزين على الدرج'],
        priority: 'high',
        estimatedCost: 2000,
      });
    }

    // الحمام
    if (assessment.basicDailyLivingSkills.toileting.score < 60) {
      modifications.required.push({
        area: 'bathroom',
        modifications: [
          'مقابض أمان بجانب المرحاض',
          'مقعد دش',
          'حصيرة مانعة للانزلاق',
          'باب عريض للكرسي المتحرك',
        ],
        priority: 'high',
        estimatedCost: 1500,
      });
    }

    // غرفة النوم
    if (assessment.basicDailyLivingSkills.mobility.components.bedMobility < 50) {
      modifications.recommended.push({
        area: 'bedroom',
        modifications: [
          'سرير بارتفاع مناسب',
          'درابزين للسرير',
          'إضاءة ليلية',
          'مساحة كافية للحركة',
        ],
        priority: 'medium',
        estimatedCost: 800,
      });
    }

    // المطبخ
    if (
      assessment.instrumentalDailyLivingSkills.cooking.score > 0 &&
      assessment.instrumentalDailyLivingSkills.cooking.score < 50
    ) {
      modifications.recommended.push({
        area: 'kitchen',
        modifications: ['خزائن في متناول اليد', 'مقابض سهلة الفتح', 'مساحة للمناورة'],
        priority: 'low',
        estimatedCost: 1000,
      });
    }

    modifications.estimatedCost = [...modifications.required, ...modifications.recommended].reduce(
      (sum, m) => sum + m.estimatedCost,
      0
    );

    return modifications;
  }

  /**
   * تقييم احتياجات بيئة العمل
   */
  _assessWorkNeeds(assessment) {
    return {
      ergonomicAdjustments: [
        'مكتب بارتفاع قابل للتعديل',
        'كرسي مريح مع دعم قطني',
        'لوحة مفاتيح وماوس مريحة',
      ],
      accessibilityFeatures: [
        'إمكانية الوصول للكرسي المتحرك',
        'مرافق صحية متاحة',
        'موقف سيارات مخصص',
      ],
      assistiveTechnology: ['برامج تكبير الشاشة', 'التعرف الصوتي على النص'],
    };
  }

  /**
   * تقييم احتياجات بيئة المدرسة
   */
  _assessSchoolNeeds(assessment) {
    return {
      classroomModifications: ['مقعد مريح', 'طاولة بارتفاع مناسب', 'مساحة كافية للحركة'],
      assistiveTechnology: ['جهاز لوحي للكتابة', 'برامج تعليمية مخصصة'],
      supportServices: ['ممرضة مدرسية', 'أخصائي علاج وظيفي'],
    };
  }

  /**
   * تحديد معايير التقدم
   */
  _defineProgressCriteria(assessment) {
    return {
      frequency: 'أسبوعياً',
      measures: [
        { name: 'درجة الاستقلالية', tool: 'مقياس FIM', target: '+10 نقاط' },
        { name: 'المهارات الدقيقة', tool: 'مقياس Jebsen-Taylor', target: '+15%' },
        { name: 'القدرة الوظيفية', tool: 'تقييم ACIS', target: '+20%' },
      ],
      reportingSchedule: {
        weekly: ['ملاحظات الجلسة', 'تسجيل الأداء'],
        monthly: ['تقرير التقدم', 'مراجعة الأهداف'],
        quarterly: ['إعادة التقييم', 'تعديل الخطة'],
      },
    };
  }

  /**
   * إنشاء جلسة علاج
   */
  async createSession(planId, sessionData) {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error('الخطة غير موجودة');

    const session = {
      id: Date.now().toString(),
      planId,
      beneficiaryId: plan.beneficiaryId,
      sessionNumber: plan.schedule.sessions.length + 1,
      date: sessionData.date || new Date(),
      therapistId: sessionData.therapistId,

      // أهداف الجلسة
      sessionGoals: sessionData.goals || [],

      // الأنشطة المخططة
      plannedActivities: sessionData.activities || [],

      // التدخلات المستخدمة
      interventions: sessionData.interventions || [],

      // تقدم المستفيد
      performance: {
        attention: 0,
        cooperation: 0,
        effort: 0,
        independence: 0,
        overallPerformance: 0,
      },

      // الملاحظات
      observations: '',
      therapistNotes: '',

      // الواجب المنزلي
      homework: [],

      // التوصيات للجلسة القادمة
      recommendations: [],

      status: 'scheduled',
      createdAt: new Date(),
    };

    plan.schedule.sessions.push(session);
    this.sessions.set(session.id, session);

    return session;
  }

  /**
   * تسجيل نتائج الجلسة
   */
  async recordSessionResults(sessionId, results) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('الجلسة غير موجودة');

    session.status = 'completed';
    session.actualDuration = results.actualDuration;

    // تسجيل الأداء
    session.performance = {
      attention: results.attention || 0,
      cooperation: results.cooperation || 0,
      effort: results.effort || 0,
      independence: results.independence || 0,
      overallPerformance: this._calculateOverallPerformance(results),
    };

    // الأنشطة المنجزة
    session.completedActivities = results.completedActivities || [];

    // الملاحظات
    session.observations = results.observations || '';
    session.therapistNotes = results.therapistNotes || '';

    // الواجب المنزلي
    session.homework = results.homework || [];

    // التوصيات
    session.recommendations = results.recommendations || [];

    // صعوبات التقدم
    session.progressDifficulties = results.progressDifficulties || [];

    // التعديلات المقترحة
    session.suggestedModifications = results.suggestedModifications || [];

    return session;
  }

  /**
   * حساب الأداء العام
   */
  _calculateOverallPerformance(results) {
    const scores = [
      results.attention || 0,
      results.cooperation || 0,
      results.effort || 0,
      results.independence || 0,
    ];
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  /**
   * تسجيل نشاط يومي
   */
  async recordActivity(beneficiaryId, activityData) {
    const activity = {
      id: Date.now().toString(),
      beneficiaryId,
      date: activityData.date || new Date(),

      // تفاصيل النشاط
      activityType: activityData.type,
      activityName: activityData.name,
      description: activityData.description,

      // مستوى الأداء
      performance: {
        independence: activityData.independence || 0,
        quality: activityData.quality || 0,
        safety: activityData.safety || 0,
        efficiency: activityData.efficiency || 0,
      },

      // المساعدة المطلوبة
      assistanceRequired: {
        level: activityData.assistanceLevel || 'none',
        type: activityData.assistanceType || [],
        duration: activityData.assistanceDuration || 0,
      },

      // المعدات المستخدمة
      equipmentUsed: activityData.equipmentUsed || [],

      // الملاحظات
      notes: activityData.notes || '',
      improvements: activityData.improvements || [],
      challenges: activityData.challenges || [],

      // التسجيل
      recordedBy: activityData.recordedBy,
      recordedAt: new Date(),
    };

    this.activities.set(activity.id, activity);
    return activity;
  }

  /**
   * تقرير الأداء الشامل
   */
  async getPerformanceReport(beneficiaryId, period = 'month') {
    const activities = Array.from(this.activities.values()).filter(
      a => a.beneficiaryId === beneficiaryId
    );

    const sessions = Array.from(this.sessions.values()).filter(
      s => s.beneficiaryId === beneficiaryId && s.status === 'completed'
    );

    const plan = Array.from(this.plans.values()).find(
      p => p.beneficiaryId === beneficiaryId && p.status === 'active'
    );

    const report = {
      beneficiaryId,
      generatedAt: new Date(),
      period,

      // ملخص الجلسات
      sessionsSummary: {
        totalSessions: sessions.length,
        completedSessions: sessions.filter(s => s.status === 'completed').length,
        averagePerformance: this._calculateAverageSessionPerformance(sessions),
        attendanceRate: this._calculateAttendanceRate(sessions),
      },

      // ملخص الأنشطة
      activitiesSummary: {
        totalActivities: activities.length,
        byType: this._groupActivitiesByType(activities),
        averageIndependence: this._calculateAverageIndependence(activities),
        progressTrend: this._analyzeProgressTrend(activities),
      },

      // تقدم الأهداف
      goalsProgress: plan ? this._evaluateGoalsProgress(plan, sessions, activities) : [],

      // المهارات المحسّنة
      improvedAreas: this._identifyImprovedAreas(activities),

      // المجالات التي تحتاج عمل
      areasNeedingWork: this._identifyAreasNeedingWork(activities),

      // التوصيات
      recommendations: this._generateTreatmentRecommendations(sessions, activities),

      // الخطوة التالية
      nextSteps: [],
    };

    this.progressReports.set(Date.now().toString(), report);
    return report;
  }

  _calculateAverageSessionPerformance(sessions) {
    if (sessions.length === 0) return 0;
    const completed = sessions.filter(s => s.performance?.overallPerformance);
    if (completed.length === 0) return 0;
    return Math.round(
      completed.reduce((sum, s) => sum + s.performance.overallPerformance, 0) / completed.length
    );
  }

  _calculateAttendanceRate(sessions) {
    if (sessions.length === 0) return 0;
    const completed = sessions.filter(s => s.status === 'completed').length;
    return Math.round((completed / sessions.length) * 100);
  }

  _groupActivitiesByType(activities) {
    return activities.reduce((groups, activity) => {
      const type = activity.activityType || 'other';
      groups[type] = (groups[type] || 0) + 1;
      return groups;
    }, {});
  }

  _calculateAverageIndependence(activities) {
    if (activities.length === 0) return 0;
    return Math.round(
      activities.reduce((sum, a) => sum + (a.performance?.independence || 0), 0) / activities.length
    );
  }

  _analyzeProgressTrend(activities) {
    if (activities.length < 2) return 'insufficient_data';
    const recent = activities.slice(-5);
    const earlier = activities.slice(0, -5);
    if (earlier.length === 0) return 'new';

    const recentAvg = this._calculateAverageIndependence(recent);
    const earlierAvg = this._calculateAverageIndependence(earlier);

    if (recentAvg > earlierAvg + 5) return 'improving';
    if (recentAvg < earlierAvg - 5) return 'declining';
    return 'stable';
  }

  _evaluateGoalsProgress(plan, sessions, activities) {
    return plan.shortTermGoals.map(goal => ({
      goalId: goal.id,
      goal: goal.goal,
      baseline: goal.baseline,
      target: goal.target,
      currentProgress: this._estimateCurrentProgress(goal, activities),
      status: 'in_progress',
    }));
  }

  _estimateCurrentProgress(goal, activities) {
    const relevantActivities = activities.filter(a =>
      a.activityType?.toLowerCase().includes(goal.domain?.toLowerCase())
    );
    if (relevantActivities.length === 0) return goal.baseline;
    return this._calculateAverageIndependence(relevantActivities);
  }

  _identifyImprovedAreas(activities) {
    const areas = [];
    const typePerformance = {};

    activities.forEach(a => {
      if (!typePerformance[a.activityType]) {
        typePerformance[a.activityType] = [];
      }
      typePerformance[a.activityType].push(a.performance?.independence || 0);
    });

    Object.entries(typePerformance).forEach(([type, scores]) => {
      if (scores.length >= 2) {
        const recent = scores.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, scores.length);
        const earlier =
          scores.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, scores.length - 3);
        if (recent > earlier + 10) {
          areas.push({ area: type, improvement: Math.round(recent - earlier) });
        }
      }
    });

    return areas;
  }

  _identifyAreasNeedingWork(activities) {
    const areas = [];
    const typePerformance = {};

    activities.forEach(a => {
      if (!typePerformance[a.activityType]) {
        typePerformance[a.activityType] = [];
      }
      typePerformance[a.activityType].push(a.performance?.independence || 0);
    });

    Object.entries(typePerformance).forEach(([type, scores]) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg < 50) {
        areas.push({ area: type, averageScore: Math.round(avg), priority: 'high' });
      } else if (avg < 70) {
        areas.push({ area: type, averageScore: Math.round(avg), priority: 'medium' });
      }
    });

    return areas.sort((a, b) => a.averageScore - b.averageScore);
  }

  _generateTreatmentRecommendations(sessions, activities) {
    const recommendations = [];

    const avgIndependence = this._calculateAverageIndependence(activities);

    if (avgIndependence < 50) {
      recommendations.push({
        type: 'intensity',
        recommendation: 'زيادة شدة التدخل العلاجي',
        reason: 'مستوى الاستقلالية منخفض',
      });
    }

    const trend = this._analyzeProgressTrend(activities);
    if (trend === 'declining') {
      recommendations.push({
        type: 'reassessment',
        recommendation: 'إعادة تقييم الخطة العلاجية',
        reason: 'تراجع في التقدم',
      });
    }

    return recommendations;
  }

  /**
   * توليد التوصيات من التقييم
   */
  _generateRecommendations(assessment) {
    const recommendations = [];

    if (assessment.basicDailyLivingSkills.selfCare.score < 50) {
      recommendations.push({
        priority: 'high',
        area: 'self_care',
        recommendation: 'برنامج مكثف لتدريب مهارات العناية الذاتية',
        timeline: 'فوري',
      });
    }

    if (assessment.fineMotorSkills.score < 50) {
      recommendations.push({
        priority: 'high',
        area: 'fine_motor',
        recommendation: 'تمارين يومية للمهارات الدقيقة',
        timeline: 'أسبوعي',
      });
    }

    if (assessment.cognitiveFunctionalSkills.score < 50) {
      recommendations.push({
        priority: 'medium',
        area: 'cognitive',
        recommendation: 'استراتيجيات دعم معرفي',
        timeline: 'مستمر',
      });
    }

    return recommendations;
  }

  /**
   * تحديد المجالات ذات الأولوية
   */
  _identifyPriorityAreas(assessment) {
    const areas = [];

    const allScores = [
      { area: 'العناية الذاتية', score: assessment.basicDailyLivingSkills.selfCare.score },
      { area: 'ارتداء الملابس', score: assessment.basicDailyLivingSkills.dressing.score },
      { area: 'الأكل', score: assessment.basicDailyLivingSkills.eating.score },
      { area: 'المهارات الدقيقة', score: assessment.fineMotorSkills.score },
      { area: 'المهارات الكبيرة', score: assessment.grossMotorSkills.score },
      { area: 'المهارات المعرفية', score: assessment.cognitiveFunctionalSkills.score },
    ];

    return allScores
      .filter(a => a.score < 70)
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);
  }

  /**
   * تقرير شهري للعلاج الوظيفي
   */
  async generateMonthlyReport(beneficiaryId, month, year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const activities = Array.from(this.activities.values()).filter(a => {
      const date = new Date(a.date);
      return a.beneficiaryId === beneficiaryId && date >= startDate && date <= endDate;
    });

    const sessions = Array.from(this.sessions.values()).filter(s => {
      const date = new Date(s.date);
      return (
        s.beneficiaryId === beneficiaryId &&
        s.status === 'completed' &&
        date >= startDate &&
        date <= endDate
      );
    });

    return {
      period: { month, year },
      beneficiaryId,
      generatedAt: new Date(),

      attendance: {
        scheduledSessions: sessions.length,
        completedSessions: sessions.filter(s => s.status === 'completed').length,
        attendanceRate:
          sessions.length > 0
            ? Math.round(
                (sessions.filter(s => s.status === 'completed').length / sessions.length) * 100
              )
            : 0,
      },

      performance: {
        averageSessionPerformance: this._calculateAverageSessionPerformance(sessions),
        activitiesCompleted: activities.length,
        independenceProgress: this._calculateIndependenceProgress(activities),
      },

      goalsAchieved: [],
      areasImproved: this._identifyImprovedAreas(activities),
      challenges: [],
      nextMonthPlan: [],

      therapistSignature: null,
      supervisorSignature: null,
      date: new Date(),
    };
  }

  _calculateIndependenceProgress(activities) {
    if (activities.length < 2) return 0;
    const sorted = activities.sort((a, b) => new Date(a.date) - new Date(b.date));
    const first = sorted.slice(0, Math.ceil(sorted.length / 3));
    const last = sorted.slice(-Math.ceil(sorted.length / 3));

    const firstAvg = this._calculateAverageIndependence(first);
    const lastAvg = this._calculateAverageIndependence(last);

    return lastAvg - firstAvg;
  }
}

module.exports = { OccupationalTherapyService };
