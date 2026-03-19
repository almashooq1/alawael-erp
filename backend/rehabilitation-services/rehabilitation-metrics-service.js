/* eslint-disable no-unused-vars */
/**
 * Rehabilitation Metrics Service
 * خدمة مقاييس التأهيل المعيارية
 *
 * تتضمن المقاييس المعتمدة عالمياً والمحلية لتقييم ذوي الإعاقة
 */

class RehabilitationMetricsService {
  constructor() {
    this.metrics = this._initializeMetrics();
    this.normativeData = this._initializeNormativeData();
    this.scoringEngine = new ScoringEngine();
  }

  /**
   * تهيئة المقاييس المعتمدة
   */
  _initializeMetrics() {
    return {
      // ==================== مقاييس الوظائف الحركية ====================
      motorFunctions: {
        // مقياس فغنلتر للأداء الحركي
        finleyMotorScale: {
          id: 'FMS-2024',
          name: 'مقياس فغنلتر للأداء الحركي',
          nameEn: 'Finley Motor Scale',
          ageRange: { min: 0, max: 18 },
          domains: {
            grossMotor: {
              name: 'الحركة الكبرى',
              items: [
                'التحكم في الرأس',
                'الجلوس',
                'الحبو',
                'الوقوف',
                'المشي',
                'الجري',
                'القفز',
                'صعود الدرج',
              ],
              maxScore: 72,
              weights: [1, 1, 1, 1.2, 1.5, 1.5, 2, 2],
            },
            fineMotor: {
              name: 'الحركة الدقيقة',
              items: ['الإمساك', 'النقر', 'الكتابة', 'استخدام المقص', 'التزرير', 'استخدام الأدوات'],
              maxScore: 54,
            },
            balance: {
              name: 'التوازن',
              items: ['توازن الجلوس', 'توازن الوقوف', 'المشي على خط', 'الوقوف على قدم واحدة'],
              maxScore: 36,
            },
            coordination: {
              name: 'التنسيق',
              items: ['تنسيق اليد والعين', 'تنسيق الحركات المتتابعة', 'التنسيق الثنائي'],
              maxScore: 27,
            },
          },
          interpretation: {
            0: { level: 'شديد', description: 'يحتاج دعم كامل', color: '#dc3545' },
            25: { level: 'متوسط', description: 'يحتاج مساعدة كبيرة', color: '#fd7e14' },
            50: { level: 'معتدل', description: 'يحتاج مساعدة متوسطة', color: '#ffc107' },
            75: { level: 'طبيعي', description: 'أداء طبيعي', color: '#28a745' },
          },
          reliability: 0.92,
          validity: 0.89,
        },

        // مقياس جيلسون للوظائف الحركية
        guilfordMotorFunctionScale: {
          id: 'GMFS-2024',
          name: 'مقياس جيلسون للوظائف الحركية',
          nameEn: 'Guilford Motor Function Scale',
          ageRange: { min: 5, max: 65 },
          domains: {
            range: { name: 'مدى الحركة', maxScore: 100 },
            strength: { name: 'القوة العضلية', maxScore: 100 },
            endurance: { name: 'التحمل', maxScore: 100 },
            speed: { name: 'السرعة', maxScore: 100 },
            accuracy: { name: 'الدقة', maxScore: 100 },
          },
        },
      },

      // ==================== مقاييس الحياة اليومية ====================
      dailyLiving: {
        // مقياس Activities of Daily Living (ADL)
        adlScale: {
          id: 'ADL-2024',
          name: 'مقياس أنشطة الحياة اليومية',
          nameEn: 'Activities of Daily Living Scale',
          categories: {
            basicADL: {
              name: 'أنشطة الحياة اليومية الأساسية',
              activities: [
                { name: 'تناول الطعام', maxScore: 10, weight: 1 },
                { name: 'الاستحمام', maxScore: 10, weight: 1 },
                { name: 'ارتداء الملابس', maxScore: 10, weight: 1 },
                { name: 'التنقل', maxScore: 10, weight: 1.2 },
                { name: 'استخدام المرحاض', maxScore: 10, weight: 1 },
                { name: 'التحكم في البول والبراز', maxScore: 10, weight: 1 },
              ],
            },
            instrumentalADL: {
              name: 'أنشطة الحياة اليومية الأدائية',
              activities: [
                { name: 'استخدام الهاتف', maxScore: 10 },
                { name: 'التسوق', maxScore: 10 },
                { name: 'تحضير الطعام', maxScore: 10 },
                { name: 'إدارة المنزل', maxScore: 10 },
                { name: 'استخدام المواصلات', maxScore: 10 },
                { name: 'إدارة الأدوية', maxScore: 10 },
                { name: 'إدارة المال', maxScore: 10 },
              ],
            },
          },
          scoringLevels: {
            0: 'معتمد كلياً',
            2: 'يحتاج مساعدة كبيرة',
            4: 'يحتاج مساعدة متوسطة',
            6: 'يحتاج إشراف',
            8: 'يحتاج تذكير',
            10: 'مستقل تماماً',
          },
        },

        // مقياس Barthel
        barthelIndex: {
          id: 'BI-2024',
          name: 'مؤشر بارثل',
          nameEn: 'Barthel Index',
          items: [
            { name: 'تناول الطعام', maxScore: 10 },
            { name: 'التنقل من سرير لكرسي', maxScore: 15 },
            { name: 'العناية الشخصية', maxScore: 5 },
            { name: 'استخدام المرحاض', maxScore: 10 },
            { name: 'الاستحمام', maxScore: 5 },
            { name: 'المشي على سطح مستوٍ', maxScore: 15 },
            { name: 'صعود وهبوط الدرج', maxScore: 10 },
            { name: 'ارتداء الملابس', maxScore: 10 },
            { name: 'التحكم في البول', maxScore: 10 },
            { name: 'التحكم في البراز', maxScore: 10 },
          ],
          interpretation: {
            0: { level: 'معتمد كلياً', score: 0 },
            1: { level: 'معتمد بشدة', score: 20 },
            2: { level: 'معتمد بشكل متوسط', score: 60 },
            3: { level: 'معتمد بشكل خفيف', score: 85 },
            4: { level: 'مستقل', score: 100 },
          },
        },
      },

      // ==================== مقاييس التواصل واللغة ====================
      communication: {
        // مقياس التواصل اللفظي وغير اللفظي
        communicationScale: {
          id: 'CS-2024',
          name: 'مقياس التواصل الشامل',
          nameEn: 'Comprehensive Communication Scale',
          domains: {
            receptive: {
              name: 'الاستقبال والفهم',
              subdomains: [
                'فهم التعليمات البسيطة',
                'فهم التعليمات المعقدة',
                'فهم الأسئلة',
                'فهم القصص',
                'فهم المفاهيم المجردة',
              ],
              maxScore: 50,
            },
            expressive: {
              name: 'التعبير',
              subdomains: [
                'التعبير عن الاحتياجات',
                'التعبير عن المشاعر',
                'التعبير عن الأفكار',
                'سرد الأحداث',
                'المناقشة والحوار',
              ],
              maxScore: 50,
            },
            pragmatic: {
              name: 'الاستخدام الاجتماعي للغة',
              subdomains: [
                'المبادرة في التواصل',
                'الحفاظ على الموضوع',
                'تبادل الأدوار',
                'فهم الإشارات الاجتماعية',
                'التواصل البصري',
              ],
              maxScore: 25,
            },
            nonverbal: {
              name: 'التواصل غير اللفظي',
              subdomains: [
                'إشارات اليد',
                'تعبيرات الوجه',
                'لغة الجسد',
                'الإشارات المصورة',
                'استخدام أدوات التواصل البديل',
              ],
              maxScore: 25,
            },
          },
        },

        // مقياس تقييم الكلام
        speechAssessmentScale: {
          id: 'SAS-2024',
          name: 'مقياس تقييم الكلام',
          nameEn: 'Speech Assessment Scale',
          domains: {
            articulation: { name: 'مخارج الحروف', maxScore: 25 },
            fluency: { name: 'الطلاقة', maxScore: 25 },
            voice: { name: 'الصوت', maxScore: 25 },
            resonance: { name: 'الرنين', maxScore: 25 },
          },
        },
      },

      // ==================== مقاييس السلوك التكيفي ====================
      adaptiveBehavior: {
        // مقياس السلوك التكيفي - الجمعية الأمريكية للتخلف العقلي
        aamrAdaptiveBehaviorScale: {
          id: 'ABS-2024',
          name: 'مقياس السلوك التكيفي',
          nameEn: 'AAMR Adaptive Behavior Scale',
          domains: {
            conceptual: {
              name: 'المهارات المفاهيمية',
              skills: {
                communication: { name: 'التواصل', maxScore: 33 },
                selfDirection: { name: 'التوجيه الذاتي', maxScore: 24 },
                functionalAcademics: { name: 'الأكاديميات الوظيفية', maxScore: 25 },
              },
            },
            social: {
              name: 'المهارات الاجتماعية',
              skills: {
                leisure: { name: 'وقت الفراغ', maxScore: 19 },
                social: { name: 'العلاقات الاجتماعية', maxScore: 26 },
                selfEsteem: { name: 'احترام الذات', maxScore: 8 },
              },
            },
            practical: {
              name: 'المهارات العملية',
              skills: {
                selfCare: { name: 'العناية الذاتية', maxScore: 42 },
                homeLiving: { name: 'الحياة المنزلية', maxScore: 38 },
                community: { name: 'استخدام المجتمع', maxScore: 22 },
                health: { name: 'الصحة والأمان', maxScore: 16 },
                work: { name: 'العمل', maxScore: 22 },
              },
            },
          },
          maladaptiveBehavior: {
            domains: [
              'السلوك العدواني',
              'السلوك المعادي للمجتمع',
              'الطاعة',
              'الانتباه',
              'السلوك الانسحابي',
              'سلوكيات الاسترضاء',
              'سلوك الإيذاء الذاتي',
            ],
          },
        },

        // مقياس فينلاند للسلوك التكيفي
        vinelandAdaptiveBehaviorScales: {
          id: 'VABS-2024',
          name: 'مقاييس فينلاند للسلوك التكيفي',
          nameEn: 'Vineland Adaptive Behavior Scales',
          domains: {
            communication: {
              name: 'التواصل',
              subdomains: ['الاستقبالية', 'التعبيرية', 'الكتابية'],
              maxScore: 100,
            },
            dailyLiving: {
              name: 'المهارات اليومية',
              subdomains: ['الشخصية', 'المنزلية', 'المجتمعية'],
              maxScore: 100,
            },
            socialization: {
              name: 'التطبيع الاجتماعي',
              subdomains: ['العلاقات البينشخصية', 'اللعب والترفيه', 'المهارات الاجتماعية'],
              maxScore: 100,
            },
            motor: {
              name: 'المهارات الحركية',
              subdomains: ['الجسيمة', 'الدقيقة'],
              maxScore: 100,
            },
          },
        },
      },

      // ==================== مقاييس الذكاء والإدراك ====================
      cognition: {
        // مقياس ستانفورد بينيه للذكاء
        stanfordBinetIntelligenceScale: {
          id: 'SBIS-2024',
          name: 'مقياس ستانفورد بينيه للذكاء',
          nameEn: 'Stanford-Binet Intelligence Scale',
          ageRange: { min: 2, max: 85 },
          factors: {
            fluidReasoning: {
              name: 'الاستدلال السائل',
              description: 'القدرة على حل مشكلات جديدة',
              maxScore: 160,
            },
            knowledge: {
              name: 'المعرفة',
              description: 'المعرفة المكتسبة من الخبرة',
              maxScore: 160,
            },
            quantitativeReasoning: {
              name: 'الاستدلال الكمي',
              description: 'القدرة على التعامل مع الأرقام',
              maxScore: 160,
            },
            visualSpatialProcessing: {
              name: 'المعالجة البصرية المكانية',
              description: 'القدرة على إدراك العلاقات المكانية',
              maxScore: 160,
            },
            workingMemory: {
              name: 'الذاكرة العاملة',
              description: 'القدرة على الاحتفاظ بالمعلومات ومعالجتها',
              maxScore: 160,
            },
          },
          iqRanges: {
            extremely_low: { range: [0, 69], description: 'منخفض جداً', percentile: 2 },
            borderline: { range: [70, 79], description: 'حدي', percentile: 9 },
            low_average: { range: [80, 89], description: 'أقل من المتوسط', percentile: 23 },
            average: { range: [90, 109], description: 'متوسط', percentile: 50 },
            high_average: { range: [110, 119], description: 'أعلى من المتوسط', percentile: 75 },
            superior: { range: [120, 129], description: 'متفوق', percentile: 91 },
            very_superior: { range: [130, 160], description: 'متفوق جداً', percentile: 98 },
          },
        },

        // مقياس وكسلر للذكاء
        wechslerIntelligenceScale: {
          id: 'WISC-2024',
          name: 'مقياس وكسلر للذكاء',
          nameEn: 'Wechsler Intelligence Scale',
          versions: {
            wppsi: { name: 'للأطفال (2-7 سنوات)', ageRange: [2, 7] },
            wisc: { name: 'للأطفال (6-16 سنة)', ageRange: [6, 16] },
            wais: { name: 'للبالغين (16+ سنة)', ageRange: [16, 90] },
          },
          indexes: {
            verbalComprehension: {
              name: 'الفهم اللفظي',
              subtests: ['المتشابهات', 'المفردات', 'المعلومات', 'الفهم'],
            },
            perceptualReasoning: {
              name: 'الاستدلال الإدراكي',
              subtests: ['تصميم المكعبات', 'الرسوم المصورة', 'المصفوفات'],
            },
            workingMemory: {
              name: 'الذاكرة العاملة',
              subtests: ['الأرقام', 'الحروف والأرقام', 'الحساب الذهني'],
            },
            processingSpeed: {
              name: 'سرعة المعالجة',
              subtests: ['الترميز', 'البحث عن الرموز', 'الإلغاء'],
            },
          },
        },
      },

      // ==================== مقاييس الصحة النفسية ====================
      mentalHealth: {
        // مقياس الرفاهية النفسية
        psychologicalWellbeingScale: {
          id: 'PWB-2024',
          name: 'مقياس الرفاهية النفسية',
          nameEn: 'Psychological Wellbeing Scale',
          dimensions: {
            autonomy: {
              name: 'الاستقلالية',
              description: 'القدرة على اتخاذ القرارات المستقلة',
              items: 7,
              maxScore: 42,
            },
            environmentalMastery: {
              name: 'السيطرة على البيئة',
              description: 'القدرة على إدارة الحياة اليومية',
              items: 7,
              maxScore: 42,
            },
            personalGrowth: {
              name: 'النمو الشخصي',
              description: 'الشعور بالتطور والتحسن المستمر',
              items: 7,
              maxScore: 42,
            },
            positiveRelations: {
              name: 'العلاقات الإيجابية',
              description: 'جودة العلاقات الاجتماعية',
              items: 7,
              maxScore: 42,
            },
            purposeInLife: {
              name: 'الهدف في الحياة',
              description: 'الشعور بالمعنى والهدف',
              items: 7,
              maxScore: 42,
            },
            selfAcceptance: {
              name: 'تقبل الذات',
              description: 'القبول الإيجابي للذات',
              items: 7,
              maxScore: 42,
            },
          },
        },

        // مقياس الاكتئاب والقلق
        depressionAnxietyScale: {
          id: 'DAS-2024',
          name: 'مقياس الاكتئاب والقلق',
          nameEn: 'Depression Anxiety Stress Scales',
          subscales: {
            depression: {
              name: 'الاكتئاب',
              items: 14,
              maxScore: 42,
              severity: {
                normal: { range: [0, 9], description: 'طبيعي' },
                mild: { range: [10, 13], description: 'خفيف' },
                moderate: { range: [14, 20], description: 'متوسط' },
                severe: { range: [21, 27], description: 'شديد' },
                extremelySevere: { range: [28, 42], description: 'شديد جداً' },
              },
            },
            anxiety: {
              name: 'القلق',
              items: 14,
              maxScore: 42,
              severity: {
                normal: { range: [0, 7], description: 'طبيعي' },
                mild: { range: [8, 9], description: 'خفيف' },
                moderate: { range: [10, 14], description: 'متوسط' },
                severe: { range: [15, 19], description: 'شديد' },
                extremelySevere: { range: [20, 42], description: 'شديد جداً' },
              },
            },
            stress: {
              name: 'الضغط النفسي',
              items: 14,
              maxScore: 42,
              severity: {
                normal: { range: [0, 14], description: 'طبيعي' },
                mild: { range: [15, 18], description: 'خفيف' },
                moderate: { range: [19, 25], description: 'متوسط' },
                severe: { range: [26, 33], description: 'شديد' },
                extremelySevere: { range: [34, 42], description: 'شديد جداً' },
              },
            },
          },
        },
      },

      // ==================== مقاييس جودة الحياة ====================
      qualityOfLife: {
        // مقياس جودة الحياة WHOQOL
        whoqolBREF: {
          id: 'WHOQOL-2024',
          name: 'مقياس جودة الحياة المختصر',
          nameEn: 'WHOQOL-BREF',
          domains: {
            physical: {
              name: 'الصحة البدنية',
              facets: [
                'الألم وعدم الراحة',
                'الطاقة والإرهاق',
                'النوم والراحة',
                'الحركة',
                'الأنشطة اليومية',
                'العمل',
              ],
              maxScore: 100,
            },
            psychological: {
              name: 'الصحة النفسية',
              facets: [
                'المشاعر الإيجابية',
                'التفكير والتعلم',
                'تقدير الذات',
                'صورة الجسم',
                'المشاعر السلبية',
              ],
              maxScore: 100,
            },
            social: {
              name: 'العلاقات الاجتماعية',
              facets: ['العلاقات الشخصية', 'الدعم الاجتماعي', 'النشاط الجنسي'],
              maxScore: 100,
            },
            environmental: {
              name: 'البيئة المحيطة',
              facets: [
                'الأمان البدني',
                'البيئة المادية',
                'الموارد المالية',
                'فرص الحصول على المعلومات',
                'فرص الحصول على الرعاية الصحية',
                'وسائل النقل',
              ],
              maxScore: 100,
            },
          },
        },

        // مقياس جودة الحياة لذوي الإعاقة
        disabilityQualityOfLifeScale: {
          id: 'DQOLS-2024',
          name: 'مقياس جودة الحياة لذوي الإعاقة',
          nameEn: 'Disability Quality of Life Scale',
          domains: {
            independence: {
              name: 'الاستقلالية',
              items: ['القرارات اليومية', 'التنقل', 'العناية الذاتية'],
              maxScore: 75,
            },
            participation: {
              name: 'المشاركة',
              items: ['المشاركة الاجتماعية', 'المشاركة التعليمية', 'المشاركة المهنية'],
              maxScore: 75,
            },
            wellbeing: {
              name: 'الرفاهية',
              items: ['الصحة الجسدية', 'الصحة النفسية', 'الرضا العام'],
              maxScore: 75,
            },
            rights: {
              name: 'الحقوق',
              items: ['الاحترام', 'المساواة', 'الوصول للخدمات'],
              maxScore: 75,
            },
          },
        },
      },

      // ==================== مقاييس التأهيل المهني ====================
      vocationalRehabilitation: {
        // مقياس الاستعداد للعمل
        workReadinessScale: {
          id: 'WRS-2024',
          name: 'مقياس الاستعداد للعمل',
          nameEn: 'Work Readiness Scale',
          dimensions: {
            vocationalSkills: {
              name: 'المهارات المهنية',
              competencies: [
                'المهارات التقنية',
                'المهارات الحاسوبية',
                'المهارات الكتابية',
                'المهارات الحسابية',
              ],
              maxScore: 100,
            },
            socialSkills: {
              name: 'المهارات الاجتماعية',
              competencies: [
                'التواصل مع الزملاء',
                'التواصل مع المشرفين',
                'العمل الجماعي',
                'حل النزاعات',
              ],
              maxScore: 100,
            },
            selfManagement: {
              name: 'إدارة الذات',
              competencies: [
                'الالتزام بالمواعيد',
                'تنظيم الوقت',
                'النظافة والمظهر',
                'إدارة الضغوط',
              ],
              maxScore: 100,
            },
            workBehavior: {
              name: 'السلوك الوظيفي',
              competencies: ['الانتباه للتفاصيل', 'اتباع التعليمات', 'المبادرة', 'الاعتمادية'],
              maxScore: 100,
            },
          },
        },

        // مقياس تحليل الوظيفة
        jobAnalysisScale: {
          id: 'JAS-2024',
          name: 'مقياس تحليل الوظيفة',
          nameEn: 'Job Analysis Scale',
          factors: {
            physicalDemands: {
              name: 'المتطلبات البدنية',
              items: ['الوقوف', 'المشي', 'الرفع', 'الجلوس', 'الحركة اليدوية'],
            },
            cognitiveDemands: {
              name: 'المتطلبات الإدراكية',
              items: ['التركيز', 'الذاكرة', 'حل المشكلات', 'اتخاذ القرارات'],
            },
            socialDemands: {
              name: 'المتطلبات الاجتماعية',
              items: ['التواصل', 'العمل الجماعي', 'خدمة العملاء', 'الإشراف'],
            },
            environmentalFactors: {
              name: 'العوامل البيئية',
              items: ['الإضاءة', 'الضوضاء', 'درجة الحرارة', 'التهوية'],
            },
          },
        },
      },

      // ==================== مقاييس التأهيل التعليمي ====================
      educationalRehabilitation: {
        // مقياس المهارات الأكاديمية
        academicSkillsScale: {
          id: 'ASS-2024',
          name: 'مقياس المهارات الأكاديمية',
          nameEn: 'Academic Skills Scale',
          domains: {
            reading: {
              name: 'القراءة',
              skills: ['التعرف على الحروف', 'قراءة الكلمات', 'فهم المقروء', 'القراءة بطلاقة'],
              maxScore: 100,
            },
            writing: {
              name: 'الكتابة',
              skills: ['كتابة الحروف', 'كتابة الكلمات', 'تكوين الجمل', 'الكتابة التعبيرية'],
              maxScore: 100,
            },
            mathematics: {
              name: 'الرياضيات',
              skills: ['العد', 'العمليات الحسابية', 'حل المشكلات', 'المفاهيم الرياضية'],
              maxScore: 100,
            },
          },
        },

        // مقياس السلوك المدرسي
        schoolBehaviorScale: {
          id: 'SBS-2024',
          name: 'مقياس السلوك المدرسي',
          nameEn: 'School Behavior Scale',
          dimensions: {
            attention: { name: 'الانتباه في الصف', maxScore: 25 },
            participation: { name: 'المشاركة الصفية', maxScore: 25 },
            homework: { name: 'إنجاز الواجبات', maxScore: 25 },
            socialInteraction: { name: 'التفاعل الاجتماعي', maxScore: 25 },
            followingRules: { name: 'اتباع القواعد', maxScore: 25 },
          },
        },
      },
    };
  }

  /**
   * تهيئة البيانات المعيارية (Norms)
   */
  _initializeNormativeData() {
    return {
      // بيانات معيارية سعودية وخليجية
      saudiNorms: {
        motorFunctions: {
          '3-5': { mean: 65, sd: 12 },
          '6-8': { mean: 72, sd: 10 },
          '9-12': { mean: 78, sd: 9 },
          '13-18': { mean: 82, sd: 8 },
        },
        adaptiveBehavior: {
          '3-5': { mean: 58, sd: 15 },
          '6-8': { mean: 68, sd: 14 },
          '9-12': { mean: 75, sd: 12 },
          '13-18': { mean: 82, sd: 10 },
        },
        communication: {
          '3-5': { mean: 55, sd: 14 },
          '6-8': { mean: 65, sd: 12 },
          '9-12': { mean: 72, sd: 11 },
          '13-18': { mean: 78, sd: 9 },
        },
      },
      // بيانات معيارية عالمية
      internationalNorms: {
        WHO: {
          qualityOfLife: { mean: 70, sd: 15 },
        },
        DSM5: {
          adaptiveBehavior: { mean: 100, sd: 15 },
        },
      },
    };
  }

  /**
   * إجراء تقييم باستخدام مقياس محدد
   * @param {string} metricId - معرف المقياس
   * @param {object} beneficiaryData - بيانات المستفيد
   * @param {object} responses - الإجابات
   */
  async administerMetric(metricId, beneficiaryData, responses) {
    const metric = this._findMetric(metricId);
    if (!metric) {
      throw new Error(`المقياس ${metricId} غير موجود`);
    }

    // التحقق من صلاحية المقياس للعمر
    if (!this._isAgeAppropriate(metric, beneficiaryData.age)) {
      throw new Error('المقياس غير مناسب للفئة العمرية');
    }

    // حساب الدرجات الخام
    const rawScores = this._calculateRawScores(metric, responses);

    // تحويل الدرجات إلى درجات معيارية
    const standardizedScores = this._standardizeScores(
      rawScores,
      beneficiaryData.age,
      beneficiaryData.region || 'saudi'
    );

    // تفسير النتائج
    const interpretation = this._interpretScores(metric, standardizedScores);

    // إنشاء تقرير التقييم
    const assessmentReport = {
      id: `ASSESS-${Date.now()}`,
      metricId,
      metricName: metric.name,
      beneficiaryId: beneficiaryData.id,
      date: new Date(),
      age: beneficiaryData.age,
      rawScores,
      standardizedScores,
      interpretation,
      recommendations: this._generateMetricRecommendations(metric, standardizedScores),
      percentileRank: this._calculatePercentile(standardizedScores, beneficiaryData.age),
      confidenceInterval: this._calculateConfidenceInterval(standardizedScores, metric.reliability),
    };

    return assessmentReport;
  }

  /**
   * البحث عن مقياس بالمعرف
   */
  _findMetric(metricId) {
    for (const category of Object.values(this.metrics)) {
      for (const metric of Object.values(category)) {
        if (metric.id === metricId) {
          return metric;
        }
      }
    }
    return null;
  }

  /**
   * التحقق من مناسبة المقياس للعمر
   */
  _isAgeAppropriate(metric, age) {
    if (!metric.ageRange) return true;
    return age >= metric.ageRange.min && age <= metric.ageRange.max;
  }

  /**
   * حساب الدرجات الخام
   */
  _calculateRawScores(metric, responses) {
    const scores = {};

    if (metric.domains) {
      for (const [domainKey, domain] of Object.entries(metric.domains)) {
        let domainScore = 0;

        if (domain.items) {
          for (const item of domain.items) {
            domainScore += responses[item] || 0;
          }
        } else if (domain.subdomains) {
          for (const subdomain of domain.subdomains) {
            domainScore += responses[subdomain] || 0;
          }
        } else if (domain.activities) {
          for (const activity of domain.activities) {
            domainScore += responses[activity.name] || 0;
          }
        }

        scores[domainKey] = {
          raw: domainScore,
          maxPossible: domain.maxScore || 100,
        };
      }
    }

    return scores;
  }

  /**
   * تحويل الدرجات إلى درجات معيارية
   */
  _standardizeScores(rawScores, age, region) {
    const norms =
      region === 'saudi' ? this.normativeData.saudiNorms : this.normativeData.internationalNorms;

    const standardized = {};

    for (const [domain, score] of Object.entries(rawScores)) {
      const ageGroup = this._getAgeGroup(age);
      const normData = norms[domain]?.[ageGroup] || { mean: 50, sd: 15 };

      // حساب الدرجة المعيارية (Z-score ثم T-score)
      const zScore = (score.raw - normData.mean) / normData.sd;
      const tScore = 50 + zScore * 10; // T-score with mean=50, SD=10

      standardized[domain] = {
        raw: score.raw,
        percentage: (score.raw / score.maxPossible) * 100,
        zScore: parseFloat(zScore.toFixed(2)),
        tScore: parseFloat(tScore.toFixed(1)),
        standardScore: Math.round(100 + zScore * 15), // Standard score mean=100, SD=15
      };
    }

    return standardized;
  }

  /**
   * تحديد الفئة العمرية
   */
  _getAgeGroup(age) {
    if (age <= 5) return '3-5';
    if (age <= 8) return '6-8';
    if (age <= 12) return '9-12';
    return '13-18';
  }

  /**
   * تفسير الدرجات
   */
  _interpretScores(metric, standardizedScores) {
    const interpretations = {};

    for (const [domain, scores] of Object.entries(standardizedScores)) {
      const percentage = scores.percentage;
      let level, description, color;

      if (metric.interpretation) {
        // استخدام جدول التفسير الخاص بالمقياس
        const thresholds = Object.keys(metric.interpretation)
          .map(Number)
          .sort((a, b) => b - a);
        for (const threshold of thresholds) {
          if (percentage >= threshold) {
            level = metric.interpretation[threshold].level;
            description = metric.interpretation[threshold].description;
            color = metric.interpretation[threshold].color;
            break;
          }
        }
      } else {
        // تفسير افتراضي
        if (percentage >= 90) {
          level = 'ممتاز';
          description = 'أداء فوق المتوقع';
          color = '#28a745';
        } else if (percentage >= 75) {
          level = 'جيد جداً';
          description = 'أداء أعلى من المتوسط';
          color = '#5cb85c';
        } else if (percentage >= 50) {
          level = 'متوسط';
          description = 'أداء ضمن المدى الطبيعي';
          color = '#ffc107';
        } else if (percentage >= 25) {
          level = 'أقل من المتوسط';
          description = 'يحتاج دعم معتدل';
          color = '#fd7e14';
        } else {
          level = 'ضعيف';
          description = 'يحتاج دعم مكثف';
          color = '#dc3545';
        }
      }

      interpretations[domain] = { level, description, color, percentage };
    }

    return interpretations;
  }

  /**
   * حساب الترتيب المئيني
   */
  _calculatePercentile(standardizedScores, age) {
    const percentiles = {};

    for (const [domain, scores] of Object.entries(standardizedScores)) {
      // تحويل Z-score إلى ترتيب مئيني
      const zScore = scores.zScore;
      const percentile = this._zToPercentile(zScore);
      percentiles[domain] = percentile;
    }

    return percentiles;
  }

  /**
   * تحويل Z-score إلى ترتيب مئيني
   */
  _zToPercentile(z) {
    // تقريب دالة التوزيع التراكمي الطبيعي
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * z);
    const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

    return Math.round(0.5 * (1.0 + sign * y) * 100);
  }

  /**
   * حساب فترة الثقة
   */
  _calculateConfidenceInterval(scores, reliability) {
    const standardError = 15 * Math.sqrt(1 - (reliability || 0.9));

    const intervals = {};
    for (const [domain, score] of Object.entries(scores)) {
      const ss = score.standardScore || score.tScore;
      intervals[domain] = {
        lower: Math.round(ss - 1.96 * standardError),
        upper: Math.round(ss + 1.96 * standardError),
        confidenceLevel: '95%',
      };
    }

    return intervals;
  }

  /**
   * توليد التوصيات بناءً على النتائج
   */
  _generateMetricRecommendations(metric, standardizedScores) {
    const recommendations = [];

    for (const [domain, scores] of Object.entries(standardizedScores)) {
      if (scores.percentage < 50) {
        recommendations.push({
          domain,
          priority: scores.percentage < 25 ? 'عالية' : 'متوسطة',
          recommendation: `يحتاج برنامج تدخلي مكثف في مجال ${domain}`,
          suggestedInterventions: this._getSuggestedInterventions(domain, scores.percentage),
        });
      } else if (scores.percentage < 75) {
        recommendations.push({
          domain,
          priority: 'منخفضة',
          recommendation: `يستفيد من أنشطة تعزيزية في مجال ${domain}`,
          suggestedInterventions: this._getSuggestedInterventions(domain, scores.percentage),
        });
      }
    }

    return recommendations;
  }

  /**
   * الحصول على التدخلات المقترحة
   */
  _getSuggestedInterventions(domain, score) {
    const interventions = {
      motorFunctions: [
        'جلسات علاج طبيعي منتظمة',
        'تمارين منزلية مكثفة',
        'أنشطة حركية تفاعلية',
        'تكييفات بيئية',
      ],
      dailyLiving: [
        'برنامج تدريب على المهارات اليومية',
        'تكييف الأدوات والأجهزة',
        'تدريب الأسرة على الدعم',
        'تقنيات الاستقلالية',
      ],
      communication: [
        'جلسات علاج التخاطب',
        'استخدام أدوات تواصل بديلة',
        'تدريب على المهارات الاجتماعية',
        'برنامج تواصل مع الأسرة',
      ],
      adaptiveBehavior: [
        'برنامج مهارات حياتية',
        'تدريب على المهارات الاجتماعية',
        'برنامج استقلالية',
        'دمج مجتمعي',
      ],
      cognition: ['أنشطة تحفيز إدراكي', 'تكييفات تعليمية', 'استراتيجيات التعلم', 'أدوات مساعدة'],
      mentalHealth: ['دعم نفسي متخصص', 'مجموعات دعم', 'تقنيات التعامل مع الضغوط', 'إرشاد أسري'],
      qualityOfLife: [
        'تحسين البيئة المحيطة',
        'زيادة فرص المشاركة',
        'دعم الشبكة الاجتماعية',
        'أنشطة ترفيهية مناسبة',
      ],
      vocationalRehabilitation: [
        'تقييم مهني متعمق',
        'تدريب على مهارات العمل',
        'تأهيل مهني متخصص',
        'توظيف مدعوم',
      ],
      educationalRehabilitation: [
        'خطة تعليمية فردية',
        'تكييفات صفية',
        'دعم تعليمي إضافي',
        'تقنيات تعليمية مساعدة',
      ],
    };

    const domainInterventions = interventions[domain] || [];

    // إرجاع التدخلات المناسبة لمستوى الأداء
    if (score < 25) {
      return domainInterventions.slice(0, 4);
    } else if (score < 50) {
      return domainInterventions.slice(0, 3);
    } else {
      return domainInterventions.slice(0, 2);
    }
  }

  /**
   * الحصول على قائمة المقاييس المتاحة
   */
  getAvailableMetrics(category = null) {
    if (category && this.metrics[category]) {
      return Object.values(this.metrics[category]).map(m => ({
        id: m.id,
        name: m.name,
        nameEn: m.nameEn,
        ageRange: m.ageRange,
      }));
    }

    const allMetrics = [];
    for (const [cat, metrics] of Object.entries(this.metrics)) {
      for (const metric of Object.values(metrics)) {
        allMetrics.push({
          category: cat,
          id: metric.id,
          name: metric.name,
          nameEn: metric.nameEn,
          ageRange: metric.ageRange,
        });
      }
    }
    return allMetrics;
  }

  /**
   * مقارنة نتائج تقييمين
   */
  compareAssessments(assessment1, assessment2) {
    const comparison = {
      firstAssessment: {
        id: assessment1.id,
        date: assessment1.date,
      },
      secondAssessment: {
        id: assessment2.id,
        date: assessment2.date,
      },
      domainComparisons: {},
      overallProgress: null,
      significantChanges: [],
    };

    for (const domain of Object.keys(assessment1.standardizedScores)) {
      if (assessment2.standardizedScores[domain]) {
        const score1 = assessment1.standardizedScores[domain].percentage;
        const score2 = assessment2.standardizedScores[domain].percentage;
        const change = score2 - score1;

        comparison.domainComparisons[domain] = {
          firstScore: score1,
          secondScore: score2,
          change: change,
          changePercent: ((change / score1) * 100).toFixed(1),
          direction: change > 5 ? 'improved' : change < -5 ? 'declined' : 'stable',
        };

        // تحديد التغييرات المهمة
        if (Math.abs(change) >= 10) {
          comparison.significantChanges.push({
            domain,
            change,
            interpretation: change > 0 ? 'تحسن ملحوظ' : 'تراجع يحتاج متابعة',
          });
        }
      }
    }

    // حساب التقدم العام
    const totalChanges = Object.values(comparison.domainComparisons).reduce(
      (sum, d) => sum + d.change,
      0
    );
    comparison.overallProgress = {
      averageChange: totalChanges / Object.keys(comparison.domainComparisons).length,
      direction: totalChanges > 0 ? 'positive' : totalChanges < 0 ? 'negative' : 'neutral',
    };

    return comparison;
  }

  /**
   * إنشاء ملف قياس شامل للمستفيد
   */
  createAssessmentProfile(beneficiaryId, assessments) {
    return {
      beneficiaryId,
      createdAt: new Date(),
      summary: {
        totalAssessments: assessments.length,
        domainsAssessed: [...new Set(assessments.flatMap(a => Object.keys(a.standardizedScores)))],
        dateRange: {
          first: assessments[0]?.date,
          last: assessments[assessments.length - 1]?.date,
        },
      },
      strengths: this._identifyStrengths(assessments),
      needs: this._identifyNeeds(assessments),
      progress: this._analyzeProgress(assessments),
      recommendations: this._generateProfileRecommendations(assessments),
    };
  }

  /**
   * تحديد نقاط القوة
   */
  _identifyStrengths(assessments) {
    const strengths = [];
    const latestAssessment = assessments[assessments.length - 1];

    for (const [domain, scores] of Object.entries(latestAssessment.standardizedScores)) {
      if (scores.percentage >= 75) {
        strengths.push({
          domain,
          score: scores.percentage,
          interpretation: latestAssessment.interpretation[domain],
        });
      }
    }

    return strengths.sort((a, b) => b.score - a.score);
  }

  /**
   * تحديد الاحتياجات
   */
  _identifyNeeds(assessments) {
    const needs = [];
    const latestAssessment = assessments[assessments.length - 1];

    for (const [domain, scores] of Object.entries(latestAssessment.standardizedScores)) {
      if (scores.percentage < 50) {
        needs.push({
          domain,
          score: scores.percentage,
          priority: scores.percentage < 25 ? 'عالية' : 'متوسطة',
          interpretation: latestAssessment.interpretation[domain],
        });
      }
    }

    return needs.sort((a, b) => a.score - b.score);
  }

  /**
   * تحليل التقدم
   */
  _analyzeProgress(assessments) {
    if (assessments.length < 2) {
      return { status: 'insufficient_data', message: 'تحتاج تقييمين على الأقل لتحليل التقدم' };
    }

    const progress = {
      byDomain: {},
      overall: { improved: 0, declined: 0, stable: 0 },
    };

    for (let i = 1; i < assessments.length; i++) {
      const comparison = this.compareAssessments(assessments[i - 1], assessments[i]);

      for (const [domain, comp] of Object.entries(comparison.domainComparisons)) {
        if (!progress.byDomain[domain]) {
          progress.byDomain[domain] = { changes: [], trend: null };
        }
        progress.byDomain[domain].changes.push(comp.change);
      }
    }

    // تحديد الاتجاه لكل مجال
    for (const [domain, data] of Object.entries(progress.byDomain)) {
      const avgChange = data.changes.reduce((a, b) => a + b, 0) / data.changes.length;
      data.trend = avgChange > 2 ? 'improving' : avgChange < -2 ? 'declining' : 'stable';
      data.averageChange = avgChange;

      progress.overall[
        data.trend === 'stable' ? 'stable' : data.trend === 'improving' ? 'improved' : 'declined'
      ]++;
    }

    return progress;
  }

  /**
   * توليد توصيات الملف
   */
  _generateProfileRecommendations(assessments) {
    const recommendations = [];
    const latest = assessments[assessments.length - 1];

    // توصيات بناءً على الاحتياجات
    for (const rec of latest.recommendations) {
      recommendations.push({
        type: 'intervention',
        ...rec,
        timeframe: rec.priority === 'عالية' ? 'فوري' : 'خلال 3 أشهر',
      });
    }

    // توصيات بناءً على التقدم
    if (assessments.length >= 2) {
      const progress = this._analyzeProgress(assessments);

      for (const [domain, data] of Object.entries(progress.byDomain)) {
        if (data.trend === 'declining') {
          recommendations.push({
            type: 'review',
            domain,
            recommendation: `مراجعة خطة التدخل في ${domain} لتباطؤ التقدم`,
            priority: 'عالية',
            timeframe: 'فوري',
          });
        }
      }
    }

    return recommendations;
  }
}

/**
 * محرك التسجيل المتقدم
 */
class ScoringEngine {
  constructor() {
    this.scoringMethods = {
      sum: (responses, items) => items.reduce((sum, item) => sum + (responses[item] || 0), 0),
      average: (responses, items) => this.scoringMethods.sum(responses, items) / items.length,
      weighted: (responses, items, weights) =>
        items.reduce((sum, item, i) => sum + (responses[item] || 0) * (weights[i] || 1), 0),
      max: (responses, items) => Math.max(...items.map(item => responses[item] || 0)),
      min: (responses, items) => Math.min(...items.map(item => responses[item] || 0)),
    };
  }

  calculate(method, responses, items, options = {}) {
    const scoringMethod = this.scoringMethods[method] || this.scoringMethods.sum;
    return scoringMethod(responses, items, options.weights);
  }
}

module.exports = { RehabilitationMetricsService, ScoringEngine };
