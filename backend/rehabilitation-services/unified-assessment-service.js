/* eslint-disable no-unused-vars */
/**
 * Unified Assessment Service for Disability Rehabilitation
 * خدمة التقييم الموحد لتأهيل ذوي الإعاقة
 */

class UnifiedAssessmentService {
  constructor() {
    this.assessments = new Map();
    this.scales = this._initializeScales();
  }

  /**
   * تهيئة مقاييس التقييم المعتمدة
   */
  _initializeScales() {
    return {
      // مقياس الوظائف الحركية
      motorFunction: {
        name: 'مقياس الوظائف الحركية',
        domains: ['الحركة الكبرى', 'الحركة الدقيقة', 'التوازن', 'التنسيق'],
        maxScore: 100,
        interpretation: {
          0: 'شديد',
          25: 'متوسط',
          50: 'معتدل',
          75: 'طبيعي',
        },
      },
      // مقياس نشاط الحياة اليومية
      dailyLiving: {
        name: 'مقياس نشاط الحياة اليومية',
        domains: ['تناول الطعام', 'الاستحمام', 'اللبس', 'التنقل', 'النظافة'],
        maxScore: 100,
      },
      // مقياس التواصل
      communication: {
        name: 'مقياس التواصل',
        domains: ['الفهم', 'التعبير', 'القراءة', 'الكتابة', 'التواصل غير اللفظي'],
        maxScore: 100,
      },
      // مقياس السلوك والتكيف
      adaptiveBehavior: {
        name: 'مقياس السلوك التكيفي',
        domains: ['المهارات الاجتماعية', 'المهارات الأكاديمية', 'المهارات العملية'],
        maxScore: 100,
      },
      // مقياس جودة الحياة
      qualityOfLife: {
        name: 'مقياس جودة الحياة',
        domains: ['الصحة البدنية', 'الصحة النفسية', 'العلاقات الاجتماعية', 'البيئة'],
        maxScore: 100,
      },
      // مقياس الملف الحسي
      sensoryProfile: {
        name: 'مقياس الملف الحسي',
        domains: [
          'المعالجة السمعية',
          'المعالجة البصرية',
          'المعالجة اللمسية',
          'الجهاز الدهليزي',
          'الحس العميق',
          'الحس الفموي',
        ],
        maxScore: 100,
      },
      // مقياس المهارات المعرفية
      cognitiveSkills: {
        name: 'مقياس المهارات المعرفية',
        domains: [
          'الانتباه والتركيز',
          'الذاكرة',
          'التفكير والاستدلال',
          'حل المشكلات',
          'الوظائف التنفيذية',
        ],
        maxScore: 100,
      },
      // مقياس التكامل النمائي
      developmentalIntegration: {
        name: 'مقياس التكامل النمائي',
        domains: [
          'النمو الحركي',
          'النمو اللغوي',
          'النمو المعرفي',
          'النمو الاجتماعي العاطفي',
          'مهارات المساعدة الذاتية',
        ],
        maxScore: 100,
      },
      // ── المقاييس الجديدة ──
      // مقياس الصحة النفسية والعاطفية
      emotionalWellbeing: {
        name: 'مقياس الصحة النفسية والعاطفية',
        domains: [
          'مستوى القلق',
          'مؤشرات الاكتئاب',
          'التنظيم الانفعالي',
          'مفهوم الذات',
          'استراتيجيات التكيف',
        ],
        maxScore: 100,
        interpretation: {
          0: 'حرج — يحتاج تدخل فوري',
          25: 'معرّض للخطر',
          50: 'مقبول',
          75: 'صحي',
        },
      },
      // مقياس المشاركة المجتمعية
      communityParticipation: {
        name: 'مقياس المشاركة المجتمعية',
        domains: [
          'الاندماج الاجتماعي',
          'الوصول للخدمات العامة',
          'الأنشطة الترفيهية',
          'المشاركة التعليمية',
          'الحقوق المدنية والمناصرة',
        ],
        maxScore: 100,
        interpretation: {
          0: 'عزلة شبه كاملة',
          25: 'مشاركة محدودة',
          50: 'مشاركة جزئية',
          75: 'مشاركة فعّالة',
        },
      },
      // مقياس التأهيل المهني
      vocationalRehabilitation: {
        name: 'مقياس التأهيل المهني',
        domains: [
          'الجاهزية للعمل',
          'المهارات المهنية',
          'السلوك المهني',
          'القدرة البدنية للعمل',
          'الاندماج في بيئة العمل',
        ],
        maxScore: 100,
        interpretation: {
          0: 'غير جاهز',
          25: 'يحتاج تأهيل مكثف',
          50: 'قيد التطوير',
          75: 'جاهز للتوظيف',
        },
      },
      // مقياس دعم الأسرة
      familySupport: {
        name: 'مقياس دعم الأسرة',
        domains: [
          'قدرة مقدّم الرعاية',
          'البيئة المنزلية',
          'مشاركة الأسرة في التأهيل',
          'الموارد المالية',
          'الدعم العاطفي الأسري',
        ],
        maxScore: 100,
        interpretation: {
          0: 'دعم ضعيف جداً',
          25: 'دعم غير كافٍ',
          50: 'دعم متوسط',
          75: 'دعم قوي',
        },
      },
      // مقياس التقنيات المساعدة
      assistiveTechnology: {
        name: 'مقياس التقنيات المساعدة',
        domains: [
          'أجهزة المساعدة الحركية',
          'أجهزة التواصل المعزز',
          'إمكانية الوصول الحاسوبي',
          'أدوات الحياة اليومية',
          'التحكم البيئي',
        ],
        maxScore: 100,
        interpretation: {
          0: 'حاجة عالية — لا يوجد دعم تقني',
          25: 'حاجة جزئية',
          50: 'تغطية كافية',
          75: 'تغطية مثالية',
        },
      },
      // مقياس الاستقلالية الوظيفية (FIM)
      functionalIndependence: {
        name: 'مقياس الاستقلالية الوظيفية (FIM)',
        domains: [
          'العناية الذاتية',
          'التحكم بالمصرّات',
          'الانتقال',
          'التنقل',
          'التواصل',
          'الإدراك الاجتماعي',
        ],
        maxScore: 126,
        interpretation: {
          0: 'مساعدة كاملة',
          36: 'مساعدة متوسطة',
          72: 'مساعدة بسيطة',
          108: 'مستقل',
        },
      },
      // مقياس التقييم السلوكي
      behavioralAssessment: {
        name: 'مقياس التقييم السلوكي',
        domains: [
          'السلوكيات التكيفية',
          'السلوكيات التحدّية',
          'التنظيم الذاتي',
          'السلوك الاجتماعي',
          'الوعي بالسلامة',
        ],
        maxScore: 100,
        interpretation: {
          0: 'سلوك يحتاج تدخل مكثف',
          25: 'سلوك يحتاج دعم متوسط',
          50: 'سلوك مقبول مع دعم خفيف',
          75: 'سلوك تكيفي',
        },
      },

      /* ─── مقاييس متخصصة إضافية ─────────────────────────────────────── */

      // مقياس المعالجة الحسية (SP-2)
      sensoryProcessing: {
        name: 'مقياس المعالجة الحسية',
        domains: [
          'البحث الحسي',
          'التجنب الحسي',
          'الحساسية الحسية',
          'التسجيل الحسي',
          'التكامل الحسي',
        ],
        maxScore: 100,
        interpretation: {
          0: 'صعوبة حسية شديدة',
          25: 'صعوبة حسية متوسطة',
          50: 'نمط حسي نموذجي',
          75: 'أداء حسي ممتاز',
        },
      },
      // مقياس السلوك التكيفي الشامل (VABS-3 / ABAS-3)
      adaptiveBehaviorAdvanced: {
        name: 'مقياس السلوك التكيفي الشامل',
        domains: [
          'المهارات المفاهيمية',
          'المهارات الاجتماعية',
          'المهارات العملية',
          'التواصل',
          'مهارات الحياة اليومية',
        ],
        maxScore: 100,
        interpretation: {
          0: 'منخفض للغاية — يحتاج دعم شامل',
          25: 'منخفض — يحتاج دعم مكثف',
          50: 'متوسط — دعم محدود',
          75: 'مناسب — دعم متقطع',
        },
      },
      // مقياس الجاهزية المهنية
      vocationalReadiness: {
        name: 'مقياس الجاهزية المهنية',
        domains: [
          'عادات العمل',
          'العلاقات المهنية',
          'المهارات المعرفية المهنية',
          'الأداء البدني',
          'تقرير المصير المهني',
        ],
        maxScore: 100,
        interpretation: {
          0: 'غير جاهز للعمل',
          25: 'يحتاج تأهيل مهني مكثف',
          50: 'عمل مدعوم',
          75: 'عمل تنافسي مستقل',
        },
      },
      // مقياس الصحة النفسية الشامل
      psychologicalWellbeing: {
        name: 'مقياس الصحة النفسية الشامل',
        domains: [
          'القلق',
          'الاكتئاب',
          'المشكلات السلوكية',
          'الضغط النفسي للأسرة',
          'التنظيم الانفعالي',
        ],
        maxScore: 100,
        interpretation: {
          0: 'أعراض سريرية شديدة',
          25: 'أعراض مرتفعة',
          50: 'أعراض متوسطة',
          75: 'طبيعي',
        },
      },

      /* ─── Phase 5: مقاييس متخصصة موسّعة ───────────────────────────── */

      // مقياس تقييم الألم
      painAssessment: {
        name: 'مقياس تقييم الألم',
        nameEn: 'Pain Assessment Scale',
        domains: [
          'شدّة الألم أثناء الراحة',
          'شدّة الألم أثناء الحركة',
          'تأثير الألم على النوم',
          'تأثير الألم على النشاط اليومي',
          'فعالية إدارة الألم',
        ],
        maxScore: 100,
        interpretation: {
          0: 'ألم شديد غير مسيطر عليه',
          25: 'ألم متوسط يعيق الأداء',
          50: 'ألم خفيف مُدار',
          75: 'ألم ضئيل أو منعدم',
        },
      },

      // مقياس النطق واللغة التفصيلي
      speechLanguageDetailed: {
        name: 'مقياس النطق واللغة التفصيلي',
        nameEn: 'Detailed Speech & Language Scale',
        domains: [
          'الوضوح النطقي (Articulation)',
          'الطلاقة اللفظية',
          'اللغة الاستقبالية',
          'اللغة التعبيرية',
          'البراغماتية (التواصل الاجتماعي)',
          'الصوت والرنين',
        ],
        maxScore: 120,
        interpretation: {
          0: 'اضطراب شديد — تواصل بديل مطلوب',
          30: 'اضطراب متوسط',
          60: 'اضطراب خفيف',
          90: 'ضمن الحدود الطبيعية',
        },
      },

      // مقياس التقييم النمائي للطفولة المبكرة
      earlyChildhoodDevelopment: {
        name: 'مقياس النمو للطفولة المبكرة (0-6 سنوات)',
        nameEn: 'Early Childhood Development Scale (0-6y)',
        domains: [
          'المهارات الحركية الكبرى',
          'المهارات الحركية الدقيقة',
          'اللغة والتواصل',
          'المعرفة والإدراك',
          'المهارات الاجتماعية والعاطفية',
          'مهارات الرعاية الذاتية',
          'اللعب والاستكشاف',
        ],
        maxScore: 140,
        interpretation: {
          0: 'تأخر نمائي شديد',
          35: 'تأخر نمائي متوسط',
          70: 'تأخر نمائي طفيف',
          105: 'نمو ضمن المعدل الطبيعي',
        },
      },

      // مقياس الاحتياجات التعليمية الخاصة
      specialEducationNeeds: {
        name: 'مقياس الاحتياجات التعليمية الخاصة',
        nameEn: 'Special Education Needs Scale',
        domains: [
          'القدرة على التعلم الأكاديمي',
          'الانتباه والتركيز في الفصل',
          'المهارات الاجتماعية المدرسية',
          'الاستقلالية في البيئة التعليمية',
          'الحاجة للتعديلات والتسهيلات',
          'الاستجابة للتدخلات التعليمية',
        ],
        maxScore: 120,
        interpretation: {
          0: 'يحتاج بيئة تعليمية متخصصة بالكامل',
          30: 'يحتاج دعم مكثف في الفصل',
          60: 'يحتاج تعديلات وتسهيلات',
          90: 'يتعلم باستقلالية مع دعم خفيف',
        },
      },

      // مقياس فعالية التقنيات المساعدة
      assistiveTechEffectiveness: {
        name: 'مقياس فعالية التقنيات المساعدة',
        nameEn: 'Assistive Technology Effectiveness Scale',
        domains: [
          'ملاءمة الجهاز/التقنية',
          'سهولة الاستخدام',
          'التأثير على الاستقلالية',
          'الرضا عن التقنية',
          'الاستمرارية في الاستخدام',
          'الحاجة للتدريب الإضافي',
        ],
        maxScore: 120,
        interpretation: {
          0: 'التقنية غير مناسبة — يلزم تغيير',
          30: 'فعالية منخفضة — يلزم تعديل',
          60: 'فعالية متوسطة — يلزم تحسين',
          90: 'فعالية عالية — مناسبة',
        },
      },

      // مقياس إرهاق مقدّم الرعاية
      caregiverBurden: {
        name: 'مقياس إرهاق مقدّم الرعاية',
        nameEn: 'Caregiver Burden Scale',
        domains: [
          'الإرهاق الجسدي',
          'الإرهاق النفسي',
          'العبء المالي',
          'الأثر على الحياة الاجتماعية',
          'جودة العلاقة مع المستفيد',
          'الوصول للدعم والخدمات',
        ],
        maxScore: 120,
        interpretation: {
          0: 'إرهاق شديد — خطر الاحتراق النفسي',
          30: 'إرهاق مرتفع',
          60: 'إرهاق معتدل — يمكن التعامل معه',
          90: 'إرهاق منخفض — مقدّم رعاية مدعوم',
        },
      },

      // مقياس الجاهزية للدمج الاجتماعي
      socialIntegrationReadiness: {
        name: 'مقياس الجاهزية للدمج الاجتماعي',
        nameEn: 'Social Integration Readiness Scale',
        domains: [
          'المهارات الاجتماعية الأساسية',
          'تقبّل المجتمع والعائلة',
          'الفرص المتاحة للمشاركة',
          'الدعم المؤسسي والقانوني',
          'الثقة بالنفس والتمكين',
          'التواصل الفعّال في المجتمع',
        ],
        maxScore: 120,
        interpretation: {
          0: 'غير مهيأ للدمج',
          30: 'يحتاج تهيئة مكثفة',
          60: 'جاهزية جزئية — يحتاج دعم',
          90: 'جاهز للدمج الكامل',
        },
      },
    };
  }

  /* ═══════════════════════════════════════════════════
   * Phase 5: خدمات تقييم موسّعة
   * ═══════════════════════════════════════════════════ */

  /**
   * تقييم مقياس محدد لمستفيد
   * @param {string} beneficiaryId
   * @param {string} scaleKey - مفتاح المقياس من _initializeScales
   * @param {Object} domainScores - درجات كل مجال
   * @param {Object} metadata - بيانات إضافية (assessorId, notes, etc.)
   */
  async performScaleAssessment(beneficiaryId, scaleKey, domainScores, metadata = {}) {
    const scale = this.scales[scaleKey];
    if (!scale) throw new Error(`المقياس "${scaleKey}" غير معرّف`);

    const totalScore = Object.values(domainScores).reduce((s, v) => s + (Number(v) || 0), 0);
    const percentage = Math.round((totalScore / scale.maxScore) * 100);

    // تحديد مستوى التفسير
    const thresholds = Object.keys(scale.interpretation)
      .map(Number)
      .sort((a, b) => b - a);
    let interpretationLabel = '';
    for (const threshold of thresholds) {
      if (percentage >= threshold) {
        interpretationLabel = scale.interpretation[threshold];
        break;
      }
    }

    const result = {
      id: `SA-${Date.now()}`,
      beneficiaryId,
      scaleKey,
      scaleName: scale.name,
      scaleNameEn: scale.nameEn || scaleKey,
      domainScores,
      totalScore,
      maxScore: scale.maxScore,
      percentage,
      level: interpretationLabel,
      assessorId: metadata.assessorId || null,
      assessorName: metadata.assessorName || 'غير محدد',
      notes: metadata.notes || '',
      date: new Date(),
      status: 'completed',
    };

    this.assessments.set(result.id, result);
    return result;
  }

  /**
   * مقارنة نتائج مقياس عبر الزمن لمستفيد واحد
   */
  getScaleProgressOverTime(beneficiaryId, scaleKey) {
    const results = [...this.assessments.values()]
      .filter(a => a.beneficiaryId === beneficiaryId && a.scaleKey === scaleKey)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (results.length < 2) {
      return { trend: 'insufficient_data', results, message: 'تحتاج تقييمَين على الأقل للمقارنة' };
    }

    const first = results[0];
    const last = results[results.length - 1];
    const changePercent = last.percentage - first.percentage;

    const domainChanges = {};
    const scale = this.scales[scaleKey];
    if (scale) {
      scale.domains.forEach((domainName, idx) => {
        const key = Object.keys(first.domainScores || {})[idx];
        if (key) {
          domainChanges[domainName] = {
            first: first.domainScores[key] || 0,
            last: last.domainScores[key] || 0,
            change: (last.domainScores[key] || 0) - (first.domainScores[key] || 0),
          };
        }
      });
    }

    return {
      trend: changePercent > 5 ? 'improving' : changePercent < -5 ? 'declining' : 'stable',
      overallChange: changePercent,
      firstAssessment: { date: first.date, score: first.percentage },
      lastAssessment: { date: last.date, score: last.percentage },
      domainChanges,
      totalAssessments: results.length,
      results,
    };
  }

  /**
   * توصيات مقاييس بناءً على نوع الإعاقة
   */
  getRecommendedScales(disabilityType) {
    const mapping = {
      physical: [
        'motorFunction',
        'dailyLiving',
        'functionalIndependence',
        'painAssessment',
        'assistiveTechnology',
      ],
      visual: [
        'dailyLiving',
        'communication',
        'assistiveTechnology',
        'assistiveTechEffectiveness',
        'communityParticipation',
      ],
      hearing: [
        'communication',
        'speechLanguageDetailed',
        'socialIntegrationReadiness',
        'communityParticipation',
      ],
      intellectual: [
        'cognitiveSkills',
        'adaptiveBehavior',
        'adaptiveBehaviorAdvanced',
        'dailyLiving',
        'specialEducationNeeds',
      ],
      autism_spectrum: [
        'sensoryProfile',
        'sensoryProcessing',
        'behavioralAssessment',
        'communication',
        'socialIntegrationReadiness',
      ],
      mental_health: [
        'emotionalWellbeing',
        'psychologicalWellbeing',
        'qualityOfLife',
        'communityParticipation',
      ],
      developmental: [
        'developmentalIntegration',
        'earlyChildhoodDevelopment',
        'cognitiveSkills',
        'communication',
      ],
      multiple: [
        'functionalIndependence',
        'dailyLiving',
        'qualityOfLife',
        'assistiveTechnology',
        'caregiverBurden',
        'familySupport',
      ],
      neurological: [
        'motorFunction',
        'cognitiveSkills',
        'painAssessment',
        'functionalIndependence',
        'dailyLiving',
      ],
      speech: ['speechLanguageDetailed', 'communication', 'socialIntegrationReadiness'],
      cerebral_palsy: [
        'motorFunction',
        'functionalIndependence',
        'painAssessment',
        'speechLanguageDetailed',
        'assistiveTechnology',
      ],
      down_syndrome: [
        'developmentalIntegration',
        'adaptiveBehavior',
        'communication',
        'socialIntegrationReadiness',
        'earlyChildhoodDevelopment',
      ],
      adhd: [
        'behavioralAssessment',
        'cognitiveSkills',
        'specialEducationNeeds',
        'emotionalWellbeing',
      ],
      learning: [
        'cognitiveSkills',
        'specialEducationNeeds',
        'adaptiveBehavior',
        'emotionalWellbeing',
      ],
    };

    const keys = mapping[disabilityType] || Object.keys(this.scales).slice(0, 5);
    return keys.map(k => ({ key: k, ...this.scales[k] })).filter(Boolean);
  }

  /**
   * تقييم شامل متعدد المقاييس (Batch)
   */
  async performBatchAssessment(beneficiaryId, scaleAssessments, metadata = {}) {
    const results = [];
    for (const { scaleKey, domainScores } of scaleAssessments) {
      const result = await this.performScaleAssessment(
        beneficiaryId,
        scaleKey,
        domainScores,
        metadata
      );
      results.push(result);
    }

    const avgPercentage = results.length
      ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length)
      : 0;

    return {
      beneficiaryId,
      batchId: `BATCH-${Date.now()}`,
      date: new Date(),
      assessments: results,
      summary: {
        totalScales: results.length,
        averagePercentage: avgPercentage,
        lowestScale: results.reduce(
          (min, r) => (r.percentage < min.percentage ? r : min),
          results[0]
        ),
        highestScale: results.reduce(
          (max, r) => (r.percentage > max.percentage ? r : max),
          results[0]
        ),
      },
    };
  }

  /**
   * ملف التقييم الشامل للمستفيد
   */
  getBeneficiaryAssessmentProfile(beneficiaryId) {
    const allAssessments = [...this.assessments.values()]
      .filter(a => a.beneficiaryId === beneficiaryId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // آخر تقييم لكل مقياس
    const latestByScale = {};
    allAssessments.forEach(a => {
      if (a.scaleKey && !latestByScale[a.scaleKey]) {
        latestByScale[a.scaleKey] = a;
      }
    });

    const scalesSummary = Object.entries(latestByScale).map(([key, assessment]) => ({
      scaleKey: key,
      scaleName: assessment.scaleName,
      lastScore: assessment.percentage,
      lastLevel: assessment.level,
      lastDate: assessment.date,
    }));

    const avgScore = scalesSummary.length
      ? Math.round(scalesSummary.reduce((s, sc) => s + sc.lastScore, 0) / scalesSummary.length)
      : 0;

    return {
      beneficiaryId,
      totalAssessments: allAssessments.length,
      uniqueScales: Object.keys(latestByScale).length,
      averageScore: avgScore,
      scalesSummary,
      recentAssessments: allAssessments.slice(0, 10),
      areasOfStrength: scalesSummary.filter(s => s.lastScore >= 75).map(s => s.scaleName),
      areasNeedingSupport: scalesSummary.filter(s => s.lastScore < 50).map(s => s.scaleName),
    };
  }

  /**
   * تقييم شامل أولي
   */
  async performInitialAssessment(beneficiaryId, assessmentData) {
    const assessment = {
      id: Date.now().toString(),
      beneficiaryId,
      type: 'initial',
      date: new Date(),
      demographics: assessmentData.demographics,
      medicalHistory: assessmentData.medicalHistory,
      disabilityInfo: {
        type: assessmentData.disabilityType,
        cause: assessmentData.disabilityCause,
        onsetDate: assessmentData.onsetDate,
        severity: assessmentData.severity,
      },
      functionalAssessment: await this._assessFunctionality(assessmentData),
      needsAssessment: await this._assessNeeds(assessmentData),
      strengthsAssessment: await this._assessStrengths(assessmentData),
      riskAssessment: await this._assessRisks(assessmentData),
      recommendations: [],
      priority: null,
      status: 'completed',
    };

    // توليد التوصيات
    assessment.recommendations = this._generateRecommendations(assessment);

    // تحديد الأولوية
    assessment.priority = this._determinePriority(assessment);

    this.assessments.set(assessment.id, assessment);
    return assessment;
  }

  /**
   * تقييم الوظائف
   */
  async _assessFunctionality(data) {
    return {
      physical: {
        mobility: data.mobilityScore || 0,
        selfCare: data.selfCareScore || 0,
        dexterity: data.dexterityScore || 0,
        vision: data.visionScore || 0,
        hearing: data.hearingScore || 0,
        speech: data.speechScore || 0,
      },
      cognitive: {
        memory: data.memoryScore || 0,
        attention: data.attentionScore || 0,
        problemSolving: data.problemSolvingScore || 0,
        comprehension: data.comprehensionScore || 0,
      },
      social: {
        interaction: data.interactionScore || 0,
        communication: data.communicationScore || 0,
        relationships: data.relationshipsScore || 0,
      },
      emotional: {
        regulation: data.emotionalRegulationScore || 0,
        coping: data.copingScore || 0,
        selfEsteem: data.selfEsteemScore || 0,
      },
    };
  }

  /**
   * تقييم الاحتياجات
   */
  async _assessNeeds(data) {
    return {
      therapeutic: this._identifyTherapeuticNeeds(data),
      educational: this._identifyEducationalNeeds(data),
      social: this._identifySocialNeeds(data),
      vocational: this._identifyVocationalNeeds(data),
      environmental: this._identifyEnvironmentalNeeds(data),
    };
  }

  /**
   * تحديد الاحتياجات العلاجية
   */
  _identifyTherapeuticNeeds(data) {
    const needs = [];

    if (data.mobilityScore < 50) needs.push('العلاج الطبيعي');
    if (data.selfCareScore < 50) needs.push('العلاج الوظيفي');
    if (data.speechScore < 50) needs.push('علاج التخاطب');
    if (data.emotionalRegulationScore < 50) needs.push('الدعم النفسي');

    return needs;
  }

  /**
   * تحديد الاحتياجات التعليمية
   */
  _identifyEducationalNeeds(data) {
    const needs = [];

    if (data.comprehensionScore < 50) needs.push('دعم تعليمي متخصص');
    if (data.attentionScore < 50) needs.push('بيئة تعليمية معدلة');
    if (data.visionScore < 30) needs.push('وسائل بديلة للقراءة');
    if (data.hearingScore < 30) needs.push('وسائل بديلة للتواصل');

    return needs;
  }

  /**
   * تحديد الاحتياجات الاجتماعية
   */
  _identifySocialNeeds(data) {
    const needs = [];

    if (data.interactionScore < 50) needs.push('مهارات اجتماعية');
    if (data.relationshipsScore < 50) needs.push('دعم العلاقات الأسرية');

    return needs;
  }

  /**
   * تحديد الاحتياجات المهنية
   */
  _identifyVocationalNeeds(data) {
    const needs = [];

    if (data.dexterityScore >= 50) needs.push('التأهيل المهني');
    if (data.problemSolvingScore >= 50) needs.push('التدريب المهني');

    return needs;
  }

  /**
   * تحديد الاحتياجات البيئية
   */
  _identifyEnvironmentalNeeds(data) {
    const needs = [];

    if (data.mobilityScore < 50) needs.push('تعديلات بيئية للوصول');
    if (data.visionScore < 30) needs.push('علامات بارزة');
    if (data.hearingScore < 30) needs.push('إشارات بصرية');

    return needs;
  }

  /**
   * تقييم نقاط القوة
   */
  async _assessStrengths(data) {
    const strengths = [];

    // فحص جميع الدرجات وإضافة نقاط القوة
    const scores = {
      الحركة: data.mobilityScore,
      'الاعتماد على النفس': data.selfCareScore,
      'المهارات اليدوية': data.dexterityScore,
      الرؤية: data.visionScore,
      السمع: data.hearingScore,
      الكلام: data.speechScore,
      الذاكرة: data.memoryScore,
      الانتباه: data.attentionScore,
      'حل المشكلات': data.problemSolvingScore,
      الفهم: data.comprehensionScore,
      'التفاعل الاجتماعي': data.interactionScore,
      التواصل: data.communicationScore,
      'التنظيم العاطفي': data.emotionalRegulationScore,
    };

    for (const [skill, score] of Object.entries(scores)) {
      if (score >= 70) {
        strengths.push(skill);
      }
    }

    return strengths;
  }

  /**
   * تقييم المخاطر
   */
  async _assessRisks(data) {
    return {
      fallRisk: data.mobilityScore < 30 ? 'عالي' : data.mobilityScore < 60 ? 'متوسط' : 'منخفض',
      isolationRisk: data.interactionScore < 30 ? 'عالي' : 'منخفض',
      depressionRisk: data.emotionalRegulationScore < 30 ? 'عالي' : 'منخفض',
      mobilityRisk: data.mobilityScore < 30 ? 'عالي' : 'منخفض',
    };
  }

  /**
   * توليد التوصيات
   */
  _generateRecommendations(assessment) {
    const recommendations = [];

    // توصيات بناءً على الاحتياجات
    if (assessment.needsAssessment.therapeutic.length > 0) {
      recommendations.push({
        category: 'علاجي',
        priority: 'عالية',
        services: assessment.needsAssessment.therapeutic,
      });
    }

    if (assessment.needsAssessment.educational.length > 0) {
      recommendations.push({
        category: 'تعليمي',
        priority: 'عالية',
        services: assessment.needsAssessment.educational,
      });
    }

    if (assessment.needsAssessment.social.length > 0) {
      recommendations.push({
        category: 'اجتماعي',
        priority: 'متوسطة',
        services: assessment.needsAssessment.social,
      });
    }

    if (assessment.needsAssessment.vocational.length > 0) {
      recommendations.push({
        category: 'مهني',
        priority: 'متوسطة',
        services: assessment.needsAssessment.vocational,
      });
    }

    if (assessment.needsAssessment.environmental.length > 0) {
      recommendations.push({
        category: 'بيئي',
        priority: 'عالية',
        services: assessment.needsAssessment.environmental,
      });
    }

    return recommendations;
  }

  /**
   * تحديد الأولوية
   */
  _determinePriority(assessment) {
    const highRiskCount = Object.values(assessment.riskAssessment).filter(r => r === 'عالي').length;

    if (highRiskCount >= 3) return 'حرج';
    if (highRiskCount >= 2) return 'عالي';
    if (highRiskCount >= 1) return 'متوسط';
    return 'منخفض';
  }

  /**
   * تقييم متابعة
   */
  async performFollowUpAssessment(beneficiaryId, previousAssessmentId, newData) {
    const previous = this.assessments.get(previousAssessmentId);
    if (!previous) throw new Error('التقييم السابق غير موجود');

    const followUp = {
      id: Date.now().toString(),
      beneficiaryId,
      type: 'follow-up',
      date: new Date(),
      previousAssessmentId,
      functionalAssessment: await this._assessFunctionality(newData),
      progressComparison: this._compareProgress(previous.functionalAssessment, newData),
      newRecommendations: [],
      status: 'completed',
    };

    // تحديد التوصيات الجديدة
    followUp.newRecommendations = this._generateRecommendations(followUp);

    this.assessments.set(followUp.id, followUp);
    return followUp;
  }

  /**
   * مقارنة التقدم
   */
  _compareProgress(previous, current) {
    return {
      physical: {
        mobility: (current.mobilityScore || 0) - (previous.physical?.mobility || 0),
        selfCare: (current.selfCareScore || 0) - (previous.physical?.selfCare || 0),
        dexterity: (current.dexterityScore || 0) - (previous.physical?.dexterity || 0),
      },
      cognitive: {
        memory: (current.memoryScore || 0) - (previous.cognitive?.memory || 0),
        attention: (current.attentionScore || 0) - (previous.cognitive?.attention || 0),
      },
      overallTrend: 'improving', // يمكن حسابه بناءً على المتوسط
    };
  }

  /**
   * تقرير التقييم
   */
  async getAssessmentReport(assessmentId) {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) throw new Error('التقييم غير موجود');

    return {
      summary: {
        id: assessment.id,
        date: assessment.date,
        type: assessment.type,
        priority: assessment.priority,
      },
      disabilityProfile: assessment.disabilityInfo,
      functionalProfile: assessment.functionalAssessment,
      needs: assessment.needsAssessment,
      strengths: assessment.strengthsAssessment,
      risks: assessment.riskAssessment,
      recommendations: assessment.recommendations,
      nextSteps: this._generateNextSteps(assessment),
    };
  }

  /**
   * توليد الخطوات التالية
   */
  _generateNextSteps(assessment) {
    const steps = [];

    if (assessment.priority === 'حرج' || assessment.priority === 'عالي') {
      steps.push('تحويل فوري للخدمات المتخصصة');
    }

    steps.push('إعداد خطة تأهيل فردية');
    steps.push('تحديد فريق متعدد التخصصات');
    steps.push('جدولة جلسات التقييم التفصيلي');

    return steps;
  }
}

module.exports = { UnifiedAssessmentService };
