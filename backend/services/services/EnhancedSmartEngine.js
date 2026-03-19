/**
 * محرك الربط الذكي المحسّن
 * Enhanced Intelligent Linking Engine
 * ====================================
 * 
 * قواعس ربط احترافية ومتقدمة تدعم:
 * - تحليل MULTI-FACTOR
 * - ربط بناءً على التاريخ والسياق
 * - توصيات تنبؤية
 * - ترتيب ديناميكي للبرامج
 */

class EnhancedSmartMeasurementEngine {
  constructor() {
    this.weights = {
      directMatch: 0.35,        // التطابق المباشر
      severity: 0.25,           // درجة الشدة
      demographics: 0.15,       // العوامل الديموغرافية
      evidence: 0.15,           // الأدلة العلمية
      urgency: 0.10            // درجة الاستعجالية
    };

    this.severityScores = {
      PROFOUND: 5,
      SEVERE: 4,
      MODERATE: 3,
      MILD: 2,
      BORDERLINE: 1
    };

    this.programPriorities = {
      CRITICAL: 1.5,
      HIGH: 1.25,
      MEDIUM: 1.0,
      LOW: 0.75
    };
  }

  /**
   * تحليل شامل ومتقدم للمقياس
   */
  async analyzeAndLinkMeasurement(measurementResult, beneficiary) {
    try {
      // الخطوة 1: الحصول على البيانات الأساسية
      const measurementType = await this.getMeasurementType(measurementResult.measurementTypeCode);
      const availablePrograms = await this.getAvailablePrograms();

      // الخطوة 2: حساب درجات التطابق المتعددة
      const scoredPrograms = availablePrograms.map(program => {
        const scores = {
          directMatch: this.calculateDirectMatch(measurementType, program),
          severityMatch: this.calculateSeverityMatch(measurementResult, program),
          demographicMatch: this.calculateDemographicMatch(beneficiary, program),
          evidenceScore: this.calculateEvidenceScore(measurementType, program),
          urgencyScore: this.calculateUrgencyScore(measurementResult)
        };

        const totalScore = this.calculateWeightedScore(scores);
        
        return {
          program,
          scores,
          totalScore,
          recommendationLevel: this.getRecommendationLevel(totalScore),
          reasoning: this.generateReasoning(scores, measurementType, program)
        };
      });

      // الخطوة 3: ترتيب البرامج حسب الأولوية
      const rankedPrograms = scoredPrograms
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 8); // أفضل 8 برامج

      return {
        measurement: measurementResult,
        analyzedAt: new Date(),
        programs: rankedPrograms,
        recommendations: this.generateComprehensiveRecommendations(rankedPrograms, beneficiary),
        insights: this.generateInsights(scoredPrograms, beneficiary)
      };

    } catch (error) {
      console.error('❌ خطأ في التحليل:', error);
      throw error;
    }
  }

  /**
   * حساب التطابق المباشر
   */
  calculateDirectMatch(measurementType, program) {
    let score = 0;

    // التحقق من توافق الإعاقات المستهدفة
    const targetMatches = (measurementType.targetDisabilities || []).filter(disability =>
      (program.targetDisabilities || []).includes(disability)
    ).length;

    if (targetMatches > 0) {
      score += targetMatches * 15;
    }

    // التحقق من الربط المباشر
    const linkedMeasurement = program.linkedMeasurements?.find(
      lm => lm.measurementTypeId === measurementType._id
    );

    if (linkedMeasurement) {
      score += 30;
      if (linkedMeasurement.strength === 'CRITICAL') score += 20;
      else if (linkedMeasurement.strength === 'HIGH') score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * حساب التطابق بناءً على درجة الشدة
   */
  calculateSeverityMatch(measurementResult, program) {
    const interpretationLevel = measurementResult.interpretationLevel;
    const severityScore = this.severityScores[interpretationLevel] || 2;
    
    // برامج مكثفة للحالات الشديدة
    const intensityMultiplier = (program.intensity || 'STANDARD') === 'INTENSIVE' 
      ? severityScore >= 4 ? 1.5 : 0.8
      : severityScore <= 2 ? 1.2 : 0.7;

    return severityScore * 20 * intensityMultiplier;
  }

  /**
   * حساب التطابق الديموغرافي
   */
  calculateDemographicMatch(beneficiary, program) {
    let score = 50;

    // التحقق من نطاق العمر
    if (program.ageRange) {
      const age = this.calculateAge(beneficiary.dateOfBirth);
      if (age >= program.ageRange.minAge && age <= program.ageRange.maxAge) {
        score += 20;
      } else if (Math.abs(age - program.ageRange.minAge) < 5 || 
                 Math.abs(age - program.ageRange.maxAge) < 5) {
        score += 10;
      }
    }

    // التحقق من النوع (للبرامج المتخصصة)
    if (program.gender && beneficiary.gender === program.gender) {
      score += 5;
    }

    return Math.min(score, 100);
  }

  /**
   * حساب درجة الدليل العلمي
   */
  calculateEvidenceScore(measurementType, program) {
    let score = 30;

    // معايير معترف بها دولياً
    if (measurementType.isStandardized && 
        measurementType.normSource && 
        program.evidenceBase) {
      score += 40;
    }

    // برامج مدعومة بأبحاث
    if (program.researchBacked) {
      score += 20;
    }

    // معدلات نجاح معروفة
    if (program.successRate && program.successRate > 0.7) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * حساب درجة الاستعجالية
   */
  calculateUrgencyScore(measurementResult) {
    let score = 50;

    const interpretationLevel = measurementResult.interpretationLevel;

    if (interpretationLevel === 'PROFOUND' || interpretationLevel === 'SEVERE') {
      score += 40;
    } else if (interpretationLevel === 'MODERATE') {
      score += 20;
    }

    // تاريخ آخر قياس
    const daysSinceLastMeasure = this.daysSinceDate(measurementResult.createdAt);
    if (daysSinceLastMeasure > 365) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * حساب الدرجة الموزونة النهائية
   */
  calculateWeightedScore(scores) {
    return (
      (scores.directMatch * 0.35) +
      (scores.severityMatch * 0.25) +
      (scores.demographicMatch * 0.15) +
      (scores.evidenceScore * 0.15) +
      (scores.urgencyScore * 0.10)
    );
  }

  /**
   * تحديد مستوى التوصية
   */
  getRecommendationLevel(score) {
    if (score >= 85) return 'CRITICAL';
    if (score >= 75) return 'HIGH';
    if (score >= 60) return 'MEDIUM';
    if (score >= 40) return 'LOW';
    return 'OPTIONAL';
  }

  /**
   * توليد التفكير والمنطق
   */
  generateReasoning(scores, measurementType, program) {
    const reasons = [];

    if (scores.directMatch > 70) {
      reasons.push('تطابق مباشر قوي جداً مع احتياجات البرنامج');
    }
    if (scores.severityMatch > 75) {
      reasons.push('مستوى الشدة يتطلب برنامج متقدم');
    }
    if (scores.demographicMatch > 75) {
      reasons.push('البرنامج مناسب تماماً للفئة العمرية/الجنسية');
    }
    if (scores.evidenceScore > 70) {
      reasons.push('البرنامج مدعوم بأدلة علمية قوية');
    }

    return reasons;
  }

  /**
   * توليد التوصيات الشاملة
   */
  generateComprehensiveRecommendations(rankedPrograms, beneficiary) {
    return {
      immediate: rankedPrograms
        .filter(p => p.recommendationLevel === 'CRITICAL')
        .slice(0, 3)
        .map(p => ({
          program: p.program,
          startDate: new Date(),
          duration: p.program.duration,
          frequency: p.program.frequency
        })),
      
      shortTerm: rankedPrograms
        .filter(p => p.recommendationLevel === 'HIGH')
        .slice(0, 3),
      
      longTerm: rankedPrograms
        .filter(p => p.recommendationLevel === 'MEDIUM'),
      
      educationalSupport: this.generateEducationalRecommendations(rankedPrograms),
      familyInvolvement: this.generateFamilyRecommendations(rankedPrograms),
      homeActivities: this.generateHomeActivities(rankedPrograms)
    };
  }

  /**
   * توليد التوصيات التعليمية
   */
  generateEducationalRecommendations(programs) {
    return {
      focusAreas: programs
        .filter(p => p.program.categoryCode === 'ACADEMIC')
        .map(p => p.program.nameAr)
        .slice(0, 3),
      
      materials: [
        'مواد تعليمية مناسبة للسن والمستوى',
        'بطاقات فلاش ورسومات توضيحية',
        'تطبيقات تعليمية تفاعلية'
      ],
      
      frequency: '5 أيام أسبوعياً',
      duration: '30-45 دقيقة يومياً'
    };
  }

  /**
   * توليد التوصيات الأسرية
   */
  generateFamilyRecommendations(programs) {
    return {
      parentParticipation: true,
      guidanceTopics: [
        'كيفية دعم برامج التأهيل في المنزل',
        'استراتيجيات التعامل والتحفيز',
        'المراقبة والتقييم المنزلي'
      ],
      weeklyMeetings: true,
      resources: [
        'كتيبات إرشادية',
        'فيديوهات تدريبية',
        'اجتماعات استشارية'
      ]
    };
  }

 /**
   * توليد الأنشطة المنزلية
   */
  generateHomeActivities(programs) {
    return {
      dailyActivities: [
        'تمارين كلامية وتواصلية 15 دقيقة',
        'تمارين حركية 20 دقيقة',
        'أنشطة تعليمية 30 دقيقة',
        'أنشطة اجتماعية وتفاعلية 15 دقيقة'
      ],
      weeklyGoals: [
        'إتقان مهارة جديدة واحدة',
        'تحسن ملحوظ في مجال مختار',
        'زيادة التفاعل الاجتماعي'
      ],
      progressTracking: true,
      reportingCycle: 'أسبوعي'
    };
  }

  /**
   * توليد الرؤى والإحصائيات
   */
  generateInsights(allPrograms, beneficiary) {
    const criticalCount = allPrograms.filter(p => p.recommendationLevel === 'CRITICAL').length;
    const highCount = allPrograms.filter(p => p.recommendationLevel === 'HIGH').length;
    const mediumCount = allPrograms.filter(p => p.recommendationLevel === 'MEDIUM').length;

    return {
      summary: `تم تحديد ${criticalCount} برامج حرجة و ${highCount} برامج عالية الأولوية`,
      strengths: this.identifyStrengths(allPrograms),
      areasForDevelopment: this.identifyAreas(allPrograms),
      estimatedProgressTimeline: this.estimateTimeline(allPrograms),
      successPrediction: this.calculateSuccessPrediction(allPrograms)
    };
  }

  /**
   * تحديد نقاط القوة
   */
  identifyStrengths(programs) {
    return [
      'مؤشرات إيجابية في المجالات التي تحقق درجات عالية',
      'إمكانية بناء على نقاط القوة الحالية',
      'فرص للتقدم السريع في المجالات المناسبة'
    ];
  }

  /**
   * تحديد مجالات التطور
   */
  identifyAreas(programs) {
    return [
      'مجالات تحتاج تركيز مكثف',
      'مهارات أساسية تحتاج تطوير',
      'سلوكيات تحتاج تعديل'
    ];
  }

  /**
   * تقدير الجدول الزمني
   */
  estimateTimeline(programs) {
    return {
      shortTerm: '3-6 أشهر',
      mediumTerm: '6-12 شهراً',
      longTerm: '12-24 شهراً',
      expectations: 'تقدم تدريجي ومستمر'
    };
  }

  /**
   * حساب توقع النجاح
   */
  calculateSuccessPrediction(programs) {
    const avgScore = programs.reduce((sum, p) => sum + p.totalScore, 0) / programs.length;
    const successRate = Math.min(100, avgScore * 1.2);
    
    return {
      percentage: Math.round(successRate),
      factors: [
        'توافق قوي بين الاحتياجات والبرامج',
        'دعم عائلي والتزام المستفيد',
        'خطة شاملة وواضحة'
      ],
      recommendations: [
        'المتابعة الدورية المنتظمة',
        'تعديل البرامج حسب التقدم',
        'التعاون بين جميع الجهات'
      ]
    };
  }

  // ============================
  // دوال مساعدة
  // ============================

  async getMeasurementType(code) {
    // سيتم استدعاؤه من قاعدة البيانات
    return null;
  }

  async getAvailablePrograms() {
    // سيتم استدعاؤه من قاعدة البيانات
    return [];
  }

  calculateAge(dateOfBirth) {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    
    return age;
  }

  daysSinceDate(date) {
    const today = new Date();
    const diffTime = Math.abs(today - new Date(date));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

module.exports = EnhancedSmartMeasurementEngine;
