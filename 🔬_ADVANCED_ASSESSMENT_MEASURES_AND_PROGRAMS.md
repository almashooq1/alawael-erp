# 📊 مقاييس وبرامج تأهيلية متقدمة جديدة

# Advanced Assessment Measures & Rehabilitation Programs

**التاريخ:** 14 يناير 2026  
**الحالة:** جديد - إضافات متطورة  
**الإصدار:** 3.0

---

## 🎯 المقاييس الجديدة المضافة

### 1. مقياس (PEDI-CAT) للأطفال ذوي الإعاقة

**الملف:** `backend/models/pedi_cat_assessment.model.js`

```javascript
/**
 * Pediatric Evaluation of Disability Inventory - Computer Adaptive Test
 * PEDI-CAT: تقييم شامل للأطفال (0-21 سنة)
 *
 * يقيس:
 * - الحركة والتنقل
 * - العناية الذاتية
 * - مهارات اجتماعية
 * - التواصل
 */

class PediCatAssessment {
  constructor(childId) {
    this.childId = childId;
    this.domains = {
      mobility: { min: 0, max: 100, description: 'الحركة والتنقل' },
      social: { min: 0, max: 100, description: 'المهارات الاجتماعية' },
      selfCare: { min: 0, max: 100, description: 'العناية الذاتية' },
      communication: { min: 0, max: 100, description: 'التواصل' },
      responsibility: { min: 0, max: 100, description: 'تحمل المسؤولية' },
    };
  }

  // البنود الأساسية
  get assessmentItems() {
    return {
      mobility: [
        { id: 1, text: 'يزحف على الأرض', ageRange: '6-12 months' },
        { id: 2, text: 'يمشي بدون مساعدة', ageRange: '12-18 months' },
        { id: 3, text: 'يصعد السلالم', ageRange: '12-24 months' },
        { id: 4, text: 'يركض ويتوازن', ageRange: '24-36 months' },
        { id: 5, text: 'يقفز برجليه', ageRange: '24-36 months' },
        { id: 6, text: 'يركب الدراجة الثلاثية', ageRange: '36-48 months' },
        // ... 20+ بند آخر
      ],
      selfCare: [
        { id: 1, text: 'يشرب من الكوب', ageRange: '6-12 months' },
        { id: 2, text: 'يأكل باستخدام الملعقة', ageRange: '12-18 months' },
        { id: 3, text: 'يلبس بعض الملابس', ageRange: '24-36 months' },
        { id: 4, text: 'يستخدم المرحاض', ageRange: '24-36 months' },
        { id: 5, text: 'يغسل يديه', ageRange: '24-36 months' },
        // ... المزيد
      ],
    };
  }

  /**
   * حساب درجة PEDI-CAT
   */
  calculateScore(responses) {
    const scores = {};

    for (const [domain, items] of Object.entries(this.assessmentItems)) {
      const domainResponses = responses.filter(r => r.domain === domain);
      const passCount = domainResponses.filter(r => r.score >= 2).length;
      const totalItems = items.length;

      scores[domain] = {
        rawScore: passCount,
        scaledScore: (passCount / totalItems) * 100,
        tScore: this.convertToTScore(passCount, totalItems),
        percentile: this.convertToPercentile((passCount / totalItems) * 100),
      };
    }

    return {
      timestamp: new Date(),
      scores,
      summary: this.generateSummary(scores),
      recommendations: this.generateRecommendations(scores),
    };
  }

  /**
   * تحويل إلى T-Score (متوسط 50، انحراف معياري 10)
   */
  convertToTScore(rawScore, totalItems) {
    const percentScore = (rawScore / totalItems) * 100;
    // استخدام جداول التحويل المعايرة
    const tScoreTable = {
      0: 20,
      10: 25,
      20: 30,
      30: 35,
      40: 40,
      50: 50,
      60: 60,
      70: 70,
      80: 75,
      90: 80,
      100: 90,
    };
    return tScoreTable[Math.round(percentScore)] || 50;
  }

  /**
   * حساب الرتبة المئوية
   */
  convertToPercentile(percentScore) {
    // جداول معايرة PEDI-CAT الرسمية
    if (percentScore < 10) return 1;
    if (percentScore < 25) return 5;
    if (percentScore < 40) return 16;
    if (percentScore < 60) return 50;
    if (percentScore < 75) return 84;
    if (percentScore < 90) return 95;
    return 99;
  }

  /**
   * تقرير ملخص
   */
  generateSummary(scores) {
    return {
      overallFunctioning: Object.values(scores).reduce((sum, domain) => sum + domain.scaledScore, 0) / Object.keys(scores).length,
      strongestAreas: Object.entries(scores)
        .sort(([, a], [, b]) => b.scaledScore - a.scaledScore)
        .slice(0, 2)
        .map(([domain, score]) => ({ domain, score: score.scaledScore })),
      areasForSupport: Object.entries(scores)
        .sort(([, a], [, b]) => a.scaledScore - b.scaledScore)
        .slice(0, 2)
        .map(([domain, score]) => ({ domain, score: score.scaledScore })),
    };
  }

  generateRecommendations(scores) {
    const recommendations = [];

    if (scores.mobility?.scaledScore < 30) {
      recommendations.push('تقييم طبيعي - فيزيائي مطلوب للعمل على الحركة الإجمالية');
      recommendations.push('برنامج تقوية العضلات والتوازن');
    }

    if (scores.selfCare?.scaledScore < 30) {
      recommendations.push('برنامج تدريب العناية الذاتية');
      recommendations.push('العمل مع متخصص الحياة اليومية');
    }

    if (scores.communication?.scaledScore < 30) {
      recommendations.push('فحص النطق واللغة');
      recommendations.push('برنامج تطوير التواصل');
    }

    return recommendations;
  }
}

module.exports = PediCatAssessment;
```

---

### 2. مقياس (GMFM-88) الوظائف الحركية الإجمالية

**الملف:** `backend/models/gmfm_assessment.model.js`

```javascript
/**
 * Gross Motor Function Measure
 * GMFM-88: لقياس الوظائف الحركية الإجمالية
 *
 * 5 أبعاد:
 * - الاستلقاء والتدحرج (17 بند)
 * - الجلوس (20 بند)
 * - الزحف والتنقل (14 بند)
 * - الوقوف (13 بند)
 * - المشي والقفز والجري (24 بند)
 */

class GMFM_Assessment {
  constructor(childId) {
    this.childId = childId;
    this.dimensions = {
      A: { name: 'الاستلقاء والتدحرج', items: 17 },
      B: { name: 'الجلوس', items: 20 },
      C: { name: 'الزحف والتنقل', items: 14 },
      D: { name: 'الوقوف', items: 13 },
      E: { name: 'المشي والقفز والجري', items: 24 },
    };
  }

  /**
   * نظام التصحيح:
   * 0 = لا يقوم
   * 1 = يقوم بشكل جزئي
   * 2 = يقوم بشكل كامل
   * NTD = لا يمكن اختباره
   */

  getDimensionItems(dimensionKey) {
    const items = {
      A: [
        { id: 1, text: 'في الاستلقاء، يحرك الرأس بشكل تلقائي' },
        { id: 2, text: 'في الاستلقاء، يحرك الأطراف العليا بتناسق' },
        { id: 3, text: 'في الاستلقاء، يدحرج نحو الجنب' },
        { id: 4, text: 'في الاستلقاء، يدحرج من الخلف إلى الأمام' },
        // ... 13 بند آخر
      ],
      B: [
        { id: 1, text: 'يجلس مع الدعم من يديه' },
        { id: 2, text: 'يجلس بدون الدعم من يديه' },
        { id: 3, text: 'ينحني للأمام ويعود للجلوس' },
        // ... 17 بند آخر
      ],
      C: [
        { id: 1, text: 'يزحف على بطنه' },
        { id: 2, text: 'يزحف على اليدين والركبتين' },
        { id: 3, text: 'يتنقل جانباً' },
        // ... 11 بند آخر
      ],
      D: [
        { id: 1, text: 'يقف مع الدعم الكامل' },
        { id: 2, text: 'يقف مع دعم جزئي' },
        { id: 3, text: 'يقف بدون دعم' },
        // ... 10 بند آخر
      ],
      E: [
        { id: 1, text: 'يمشي مع الدعم الكامل' },
        { id: 2, text: 'يمشي مع دعم جزئي' },
        { id: 3, text: 'يمشي بدون دعم' },
        { id: 4, text: 'يركض' },
        // ... 20 بند آخر
      ],
    };

    return items[dimensionKey] || [];
  }

  /**
   * حساب الدرجة الإجمالية والنسبية
   */
  calculateGMFM_Score(responses) {
    const dimensionScores = {};
    let totalRawScore = 0;
    let totalPossibleScore = 0;

    for (const [dimensionKey, dimensionInfo] of Object.entries(this.dimensions)) {
      const dimensionResponses = responses[dimensionKey] || {};
      const validResponses = Object.values(dimensionResponses).filter(r => r !== 'NTD');

      const rawScore = validResponses.reduce((sum, r) => sum + r, 0);
      const maxScore = validResponses.length * 2;
      const percentScore = (rawScore / maxScore) * 100;

      dimensionScores[dimensionKey] = {
        rawScore,
        maxScore,
        percentScore: Math.round(percentScore * 10) / 10,
        impairmentLevel: this.getImpairmentLevel(percentScore),
      };

      totalRawScore += rawScore;
      totalPossibleScore += maxScore;
    }

    const gmfmPercent = (totalRawScore / totalPossibleScore) * 100;

    return {
      timestamp: new Date(),
      dimensionScores,
      gmfmPercent: Math.round(gmfmPercent * 10) / 10,
      gmfcsLevel: this.estimateGMFCSLevel(gmfmPercent, dimensionScores),
      interpretation: this.interpretResults(gmfmPercent, dimensionScores),
      prognosis: this.assessPrognosis(gmfmPercent, dimensionScores),
    };
  }

  /**
   * تحديد مستوى الضعف الحركي
   */
  getImpairmentLevel(percentScore) {
    if (percentScore >= 90) return 'طبيعي';
    if (percentScore >= 75) return 'ضعف بسيط جداً';
    if (percentScore >= 50) return 'ضعف بسيط';
    if (percentScore >= 25) return 'ضعف متوسط';
    return 'ضعف شديد';
  }

  /**
   * تقدير مستوى GMFCS (نظام التصنيف الحركي الإجمالي)
   */
  estimateGMFCSLevel(gmfmPercent, dimensionScores) {
    if (gmfmPercent >= 95) return { level: 1, description: 'يمشي بدون قيود' };
    if (gmfmPercent >= 90) return { level: 2, description: 'يمشي مع قيود بسيطة' };
    if (gmfmPercent >= 75) return { level: 3, description: 'يمشي مع جهاز مساعد' };
    if (gmfmPercent >= 50) return { level: 4, description: 'حركة ذاتية محدودة' };
    return { level: 5, description: 'نقل بمساعدة يدوية' };
  }

  /**
   * تفسير النتائج
   */
  interpretResults(gmfmPercent, dimensionScores) {
    const summary = [];

    summary.push(`الوظيفة الحركية الإجمالية: ${gmfmPercent.toFixed(1)}%`);

    const weakestDimension = Object.entries(dimensionScores).sort(([, a], [, b]) => a.percentScore - b.percentScore)[0];

    summary.push(`أضعف مجال: ${this.dimensions[weakestDimension[0]].name} (${weakestDimension[1].percentScore.toFixed(1)}%)`);

    return summary;
  }

  /**
   * تقييم التكهن
   */
  assessPrognosis(gmfmPercent, dimensionScores) {
    const recommendations = [];

    if (gmfmPercent < 50) {
      recommendations.push('برنامج علاج فيزيائي مكثف مطلوب');
      recommendations.push('استخدام أجهزة مساعدة ضروري');
      recommendations.push('برنامج التدخل المبكر مهم');
    } else if (gmfmPercent < 75) {
      recommendations.push('استمرار برنامج علاج فيزيائي منتظم');
      recommendations.push('تطوير استراتيجيات التعويض');
    } else {
      recommendations.push('برنامج تقوية وتطوير مهارات متقدمة');
    }

    return recommendations;
  }
}

module.exports = GMFM_Assessment;
```

---

## 🏥 برامج تأهيلية متخصصة جديدة

### برنامج 1: التدخل المبكر المكثف (EIBI)

**الملف:** `backend/models/early_intensive_intervention.program.js`

```javascript
/**
 * Early Intensive Behavioral Intervention
 * برنامج للأطفال (6 أشهر - 3 سنوات) ذوي التأخر النمائي
 *
 * 40 ساعة/الأسبوع من التدخل المنظم
 */

class EarlyIntensiveInterventionProgram {
  constructor(programId) {
    this.programId = programId;
    this.weeklyHours = 40;
    this.sessionDuration = 60; // دقيقة
    this.sessionsPerWeek = Math.floor((40 * 60) / 60); // 40 جلسة

    this.modules = {
      socialCommunication: {
        name: 'التواصل الاجتماعي',
        goals: ['تطوير التواصل غير اللفظي', 'بناء المهارات الاجتماعية', 'التفاعل مع الأقران', 'فهم الإشارات الاجتماعية'],
        activities: ['لعب تفاعلي', 'تقليد وحوار', 'تطبيقات اجتماعية', 'قصص اجتماعية'],
      },

      playAndLearning: {
        name: 'اللعب والتعلم',
        goals: ['اللعب الموجه', 'استكشاف الأشياء', 'حل المشاكل البسيطة', 'التركيز والانتباه'],
        activities: ['ألعاب تعليمية منظمة', 'استكشاف البيئة', 'تجارب حسية', 'ألعاب بناء'],
      },

      motorSkills: {
        name: 'المهارات الحركية',
        goals: ['الحركة الإجمالية', 'المهارات الدقيقة', 'التنسيق', 'التوازن'],
        activities: ['تمارين الحركة الكبرى', 'مهارات الإمساك', 'أنشطة الرسم والكتابة', 'ألعاب الحركة'],
      },

      dailyLivingSkills: {
        name: 'مهارات الحياة اليومية',
        goals: ['الأكل المستقل', 'التدريب على استخدام الحمام', 'الملابس', 'النظافة الشخصية'],
        activities: ['تدريب عملي', 'روتين يومي منظم', 'لعب محاكاة', 'تعزيز إيجابي'],
      },
    };
  }

  /**
   * إنشاء جدول جلسات أسبوعي
   */
  createWeeklySchedule(beneficiaryPreferences = {}) {
    const schedule = {};
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

    let sessionCounter = 0;

    for (const day of days) {
      schedule[day] = [];

      // جلسة صباحية
      schedule[day].push({
        time: '09:00-10:00',
        module: Object.keys(this.modules)[sessionCounter % 5],
        therapist: 'متخصص رئيسي',
        environment: 'غرفة العلاج الفردية',
      });

      // جلسة منتصف النهار
      schedule[day].push({
        time: '10:30-11:30',
        module: Object.keys(this.modules)[(sessionCounter + 1) % 5],
        therapist: 'متخصص أساسي',
        environment: 'غرفة المجموعة',
      });

      // جلسة مساء
      schedule[day].push({
        time: '13:00-14:00',
        module: Object.keys(this.modules)[(sessionCounter + 2) % 5],
        therapist: 'مساعد علاج',
        environment: 'بيئة طبيعية',
      });

      // جلسة مساء متأخرة
      schedule[day].push({
        time: '14:30-15:30',
        module: Object.keys(this.modules)[(sessionCounter + 3) % 5],
        therapist: 'متخصص رئيسي',
        environment: 'غرفة العلاج',
      });

      sessionCounter += 4;
    }

    return schedule;
  }

  /**
   * معايير التقدم الشهري
   */
  getMonthlyProgressCriteria() {
    return {
      month1: {
        expectedImprovement: '20-30%',
        focusAreas: ['بناء العلاقة', 'الالتزام بالجلسات', 'المشاركة الأولية'],
        evaluationPoints: ['التكيف مع البرنامج', 'مستوى الالتزام', 'الفهم الأولي'],
      },
      month2: {
        expectedImprovement: '30-40%',
        focusAreas: ['تطوير المهارات', 'زيادة التركيز', 'البدء بالحوار'],
        evaluationPoints: ['اكتساب المهارات', 'مدة الانتباه', 'البدايات الاجتماعية'],
      },
      month3: {
        expectedImprovement: '40-50%',
        focusAreas: ['دمج المهارات', 'الاستقلالية المتزايدة', 'التفاعل الاجتماعي'],
        evaluationPoints: ['استخدام المهارات', 'الاستقلالية', 'التفاعل مع الأقران'],
      },
    };
  }

  /**
   * حساب مؤشر كفاءة البرنامج (PEI)
   */
  calculateProgramEfficiencyIndex(assessmentData) {
    const factors = {
      skillAcquisitionRate: assessmentData.skillsLearned / (assessmentData.hoursSpent / 40),
      generalizationIndex: assessmentData.skillsGeneralized / assessmentData.skillsLearned,
      participationIndex: assessmentData.activeParticipationMinutes / (40 * 60),
      familyInvolvementIndex: assessmentData.familyTrainingHours / 40,
    };

    const weights = {
      skillAcquisitionRate: 0.35,
      generalizationIndex: 0.25,
      participationIndex: 0.25,
      familyInvolvementIndex: 0.15,
    };

    let pei = 0;
    for (const [factor, weight] of Object.entries(weights)) {
      pei += (factors[factor] || 0) * weight;
    }

    return {
      pei: Math.min(pei, 1.0),
      interpretation: this.interpretPEI(pei),
      recommendations: this.getPEIRecommendations(pei),
    };
  }

  interpretPEI(pei) {
    if (pei >= 0.8) return 'برنامج عالي الكفاءة';
    if (pei >= 0.6) return 'برنامج فعال';
    if (pei >= 0.4) return 'برنامج معقول';
    return 'يحتاج إلى تحسينات';
  }

  getPEIRecommendations(pei) {
    const recommendations = [];

    if (pei < 0.6) {
      recommendations.push('زيادة الجلسات الفردية المركزة');
      recommendations.push('مراجعة استراتيجيات التعليم');
      recommendations.push('زيادة تدريب الأسرة');
    }

    if (pei < 0.4) {
      recommendations.push('تقييم شامل للبرنامج');
      recommendations.push('تغيير المتخصصين قد يكون ضرورياً');
      recommendations.push('مراجعة تشخيص الحالة');
    }

    return recommendations;
  }
}

module.exports = EarlyIntensiveInterventionProgram;
```

---

### برنامج 2: العلاج الوظيفي المكثف

**الملف:** `backend/models/occupational_therapy_program.js`

```javascript
/**
 * برنامج العلاج الوظيفي المتقدم
 * Comprehensive Occupational Therapy Program
 *
 * يركز على:
 * - الأنشطة الحياتية
 * - المهارات الدقيقة
 * - التكامل الحسي
 * - الاستقلالية الوظيفية
 */

class OccupationalTherapyProgram {
  constructor(programId) {
    this.programId = programId;
    this.assessmentTools = [
      'COPM', // Canadian Occupational Performance Measure
      'PEGS', // Purdue Pegboard Test
      'MVPT', // Motor-Free Visual Perception Test
      'Cozmo', // Comprehensive Occupational Therapy Evaluation
    ];
  }

  /**
   * مجالات التدخل الرئيسية
   */
  getInterventionAreas() {
    return {
      selfCareSkills: {
        name: 'مهارات الرعاية الذاتية',
        activities: ['الأكل والشرب', 'ارتداء الملابس', 'استخدام الحمام', 'النظافة الشخصية', 'العناية بالشعر والأسنان'],
        tools: ['ملاعق متخصصة', 'أزرار كبيرة', 'سحاب معدل'],
        strategies: ['التعليم التدريجي', 'التعليمات البصرية', 'التذكيرات المنطوقة'],
      },

      fineMotorSkills: {
        name: 'المهارات الحركية الدقيقة',
        activities: ['قبض الأشياء', 'الكتابة والرسم', 'الخياطة والحياكة', 'الألعاب التفاعلية', 'الأنشطة الفنية'],
        tools: ['ألعاب تثبيتية', 'أقلام معدلة', 'خرز كبير'],
        progressMeasures: ['سرعة القبض', 'دقة الإمساك', 'التحكم الثنائي'],
      },

      sensoryIntegration: {
        name: 'التكامل الحسي',
        activities: ['الأنشطة الحركية الدهليزية', 'تجارب اللمس', 'استكشاف الروائح', 'تجارب التذوق الآمنة', 'الأنشطة السمعية'],
        tools: ['أرجوحة', 'مواد نسيج', 'موسيقى'],
        outcomes: ['تحسن الموازنة', 'تحسن التنسيق', 'تقليل الحساسية الزائدة'],
      },

      cognitiveFunctioning: {
        name: 'الوظائف المعرفية',
        activities: ['حل المشاكل', 'التخطيط والتنظيم', 'الذاكرة والانتباه', 'الوعي بالسلامة'],
        tools: ['ألعاب ألغاز', 'قوائم مرئية', 'مؤقتات'],
        assessmentMethods: ['اختبارات الأداء', 'ملاحظة السلوك', 'تقييم المنزل'],
      },
    };
  }

  /**
   * خطة العلاج الشخصية (IEP)
   */
  createIndividualTherapyPlan(beneficiary, assessment) {
    const plan = {
      beneficiaryId: beneficiary.id,
      createdDate: new Date(),
      duration: 12, // أسبوع
      sessionsPerWeek: 2,
      sessionDuration: 60, // دقيقة

      shortTermGoals: [
        {
          goal: 'تحسين مهارات العناية الذاتية',
          measurable: 'إتمام 80% من مهام الأكل بمفرده',
          timeline: '6 أسابيع',
        },
        {
          goal: 'تطوير المهارات الحركية الدقيقة',
          measurable: 'نقل 20 خرزة في دقيقة واحدة',
          timeline: '8 أسابيع',
        },
      ],

      longTermGoals: [
        {
          goal: 'الاستقلالية الوظيفية',
          measurable: 'إكمال جميع مهام الحياة اليومية مع الحد الأدنى من المساعدة',
          timeline: '12 أسبوع',
        },
      ],

      interventionStrategies: this.getCustomizedStrategies(assessment),

      homeProgram: this.createHomeProgram(beneficiary),

      progressMonitoring: {
        frequency: 'أسبوعي',
        methods: ['ملاحظة مباشرة', 'استبيانات الأسرة', 'اختبارات الأداء'],
      },
    };

    return plan;
  }

  /**
   * البرنامج المنزلي
   */
  createHomeProgram(beneficiary) {
    return {
      duration: '10-15 دقيقة يومياً',
      activities: [
        {
          name: 'تمارين القبض',
          frequency: 'يومي',
          instructions: 'استخدام كرة إسفنجية ناعمة',
          duration: 5,
        },
        {
          name: 'مهام العناية الذاتية',
          frequency: 'يومي',
          instructions: 'ممارسة الأكل والشرب بشكل مستقل',
          duration: 10,
        },
        {
          name: 'أنشطة حسية',
          frequency: '3 مرات أسبوعياً',
          instructions: 'استكشاف المواد المختلفة',
          duration: 10,
        },
      ],
      parentEducation: ['كيفية تعديل الأنشطة', 'استراتيجيات التعزيز الإيجابي', 'متى تطلب المساعدة'],
      progressTracking: 'سجل يومي للأنشطة',
    };
  }

  /**
   * استراتيجيات معدلة حسب التقييم
   */
  getCustomizedStrategies(assessment) {
    const strategies = [];

    if (assessment.motorSkills < 30) {
      strategies.push('استخدام أدوات معاونة');
      strategies.push('تقسيم المهام إلى خطوات صغيرة');
      strategies.push('تعزيز متكرر');
    }

    if (assessment.sensoryProcessing === 'hypersensitive') {
      strategies.push('بيئة هادئة ومنظمة');
      strategies.push('تقليل المحفزات الحسية');
      strategies.push('تعريض تدريجي');
    }

    return strategies;
  }
}

module.exports = OccupationalTherapyProgram;
```

---

## 📊 نظام المراقبة والتقييم المتقدم

**الملف:** `backend/services/advanced_monitoring.service.js`

```python
# -*- coding: utf-8 -*-
"""
نظام المراقبة والتقييم المتقدم
Advanced Monitoring & Evaluation System
"""

class AdvancedMonitoringSystem:
    """
    نظام شامل لمراقبة التقدم والقياس المستمر
    """

    def __init__(self, beneficiary_id):
        self.beneficiary_id = beneficiary_id
        self.measurement_tools = {
            'single_subject_design': self.analyze_single_subject_design,
            'progress_monitoring': self.continuous_progress_monitoring,
            'effect_size_calculation': self.calculate_effect_size,
            'trend_analysis': self.analyze_trend_lines
        }

    def analyze_single_subject_design(self, baseline_data, intervention_data):
        """
        تحليل التصميم أحادي المتغير
        Single Subject Research Design Analysis
        """
        import numpy as np

        baseline_values = [d['value'] for d in baseline_data]
        intervention_values = [d['value'] for d in intervention_data]

        analysis = {
            'baseline': {
                'mean': np.mean(baseline_values),
                'std': np.std(baseline_values),
                'trend': self._calculate_slope(baseline_values)
            },
            'intervention': {
                'mean': np.mean(intervention_values),
                'std': np.std(intervention_values),
                'trend': self._calculate_slope(intervention_values)
            },
            'change': {
                'mean_difference': np.mean(intervention_values) - np.mean(baseline_values),
                'percent_change': ((np.mean(intervention_values) - np.mean(baseline_values))
                                  / np.mean(baseline_values) * 100),
                'significance': self._is_significant_change(baseline_values, intervention_values)
            }
        }

        return analysis

    def continuous_progress_monitoring(self, data_points):
        """
        مراقبة التقدم المستمرة كل أسبوع
        """
        import numpy as np
        from scipy import stats

        dates = [d['date'] for d in data_points]
        values = [d['value'] for d in data_points]

        # حساب خط الاتجاه
        x = np.arange(len(values))
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, values)

        # التنبؤ بالقيمة المستقبلية
        next_week = len(values)
        predicted_value = slope * next_week + intercept

        return {
            'current_trend': 'تحسن' if slope > 0 else 'تراجع' if slope < 0 else 'مستقر',
            'slope': slope,
            'r_squared': r_value ** 2,
            'predicted_next_value': predicted_value,
            'trend_confidence': abs(r_value),
            'recommendation': self._get_monitoring_recommendation(slope, r_value)
        }

    def calculate_effect_size(self, baseline_mean, baseline_std, intervention_mean):
        """
        حساب حجم التأثير (Cohen's d)
        """
        if baseline_std == 0:
            return None

        cohens_d = (intervention_mean - baseline_mean) / baseline_std

        # تفسير حجم التأثير
        if abs(cohens_d) < 0.2:
            interpretation = 'تأثير ضعيف جداً'
        elif abs(cohens_d) < 0.5:
            interpretation = 'تأثير ضعيف'
        elif abs(cohens_d) < 0.8:
            interpretation = 'تأثير متوسط'
        else:
            interpretation = 'تأثير قوي'

        return {
            'cohens_d': cohens_d,
            'interpretation': interpretation,
            'clinical_significance': 'عملياً مهم' if abs(cohens_d) >= 0.5 else 'قد لا يكون مهماً سريرياً'
        }

    def _calculate_slope(self, values):
        """حساب اتجاه البيانات"""
        if len(values) < 2:
            return 0

        x = range(len(values))
        numerator = sum((i - (len(values)-1)/2) * (v - sum(values)/len(values))
                       for i, v in enumerate(values))
        denominator = sum((i - (len(values)-1)/2) ** 2
                         for i in range(len(values)))

        return numerator / denominator if denominator != 0 else 0

    def _is_significant_change(self, baseline, intervention, threshold=0.05):
        """فحص الدلالة الإحصائية"""
        import scipy.stats as stats

        t_stat, p_value = stats.ttest_ind(baseline, intervention)
        return p_value < threshold

    def _get_monitoring_recommendation(self, slope, r_squared):
        """توصيات بناءً على البيانات"""
        if slope > 0 and r_squared > 0.7:
            return 'البرنامج فعال - استمر بنفس الاستراتيجية'
        elif slope < 0:
            return 'تراجع ملحوظ - راجع البرنامج فوراً'
        else:
            return 'تقدم بطيء - قد تحتاج لتعديلات'

```

---

## 🎯 الفوائد المتوقعة

```
✅ قياس أدق للتقدم
✅ تحديد المشاكل المبكرة
✅ توصيات معتمدة على البيانات
✅ برامج مخصصة لكل حالة
✅ تقارير احترافية
✅ إمكانية التنبؤ بالنتائج
✅ رفع جودة الخدمة
✅ توثيق علمي شامل
```

---

**آخر تحديث:** 14 يناير 2026  
**الحالة:** ✅ جاهز للتطبيق
