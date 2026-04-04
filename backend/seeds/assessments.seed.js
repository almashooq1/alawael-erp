/**
 * @file assessments.seed.js
 * @description بيانات تقييمات شاملة وواقعية - 10+ تقييم بأدوات قياس معتمدة
 * Comprehensive realistic assessments seed - Al-Awael ERP
 * DEV/STAGING only - NOT for production
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// أدوات التقييم المعتمدة
// ─────────────────────────────────────────────────────────────────────────────
const ASSESSMENT_TOOLS = [
  {
    toolCode: 'VABS-3',
    toolNameAr: 'مقياس فاينلاند للسلوك التكيفي - الإصدار الثالث',
    toolNameEn: 'Vineland Adaptive Behavior Scale - 3rd Edition',
    disabilityTypes: ['AUTISM', 'DOWN_SYNDROME', 'INTELLECTUAL_DISABILITY', 'DEVELOPMENTAL_DELAY'],
    domains: [
      { nameAr: 'التواصل', nameEn: 'Communication', maxScore: 100, weight: 25 },
      { nameAr: 'مهارات الحياة اليومية', nameEn: 'Daily Living Skills', maxScore: 100, weight: 25 },
      { nameAr: 'التنشئة الاجتماعية', nameEn: 'Socialization', maxScore: 100, weight: 25 },
      { nameAr: 'المهارات الحركية', nameEn: 'Motor Skills', maxScore: 100, weight: 25 },
    ],
  },
  {
    toolCode: 'CARS-2',
    toolNameAr: 'مقياس تقييم طيف التوحد في مرحلة الطفولة',
    toolNameEn: 'Childhood Autism Rating Scale - 2nd Edition',
    disabilityTypes: ['AUTISM'],
    domains: [
      { nameAr: 'العلاقة مع الآخرين', nameEn: 'Relating to People', maxScore: 4, weight: 20 },
      { nameAr: 'التقليد', nameEn: 'Imitation', maxScore: 4, weight: 15 },
      { nameAr: 'الاستجابة العاطفية', nameEn: 'Emotional Response', maxScore: 4, weight: 15 },
      { nameAr: 'التواصل اللفظي', nameEn: 'Verbal Communication', maxScore: 4, weight: 25 },
      { nameAr: 'التواصل غير اللفظي', nameEn: 'Non-verbal Communication', maxScore: 4, weight: 25 },
    ],
  },
  {
    toolCode: 'ALDT',
    toolNameAr: 'اختبار اللغة العربية التشخيصي',
    toolNameEn: 'Arabic Language Diagnostic Test',
    disabilityTypes: ['SPEECH_DELAY', 'AUTISM', 'HEARING_IMPAIRMENT'],
    domains: [
      { nameAr: 'الفهم السمعي', nameEn: 'Auditory Comprehension', maxScore: 50, weight: 30 },
      { nameAr: 'التعبير اللفظي', nameEn: 'Verbal Expression', maxScore: 50, weight: 30 },
      { nameAr: 'المفردات', nameEn: 'Vocabulary', maxScore: 50, weight: 20 },
      { nameAr: 'القواعد اللغوية', nameEn: 'Grammar', maxScore: 50, weight: 20 },
    ],
  },
  {
    toolCode: 'PDMS-2',
    toolNameAr: 'مقاييس بيبودي للنمو الحركي',
    toolNameEn: 'Peabody Developmental Motor Scales - 2nd Edition',
    disabilityTypes: ['CEREBRAL_PALSY', 'PHYSICAL_DISABILITY', 'DEVELOPMENTAL_DELAY'],
    domains: [
      { nameAr: 'الانعكاسات', nameEn: 'Reflexes', maxScore: 100, weight: 15 },
      { nameAr: 'التوازن الثابت', nameEn: 'Stationary', maxScore: 100, weight: 20 },
      { nameAr: 'الحركة والانتقال', nameEn: 'Locomotion', maxScore: 100, weight: 25 },
      { nameAr: 'الإمساك', nameEn: 'Grasping', maxScore: 100, weight: 20 },
      {
        nameAr: 'التآزر البصري اليدوي',
        nameEn: 'Visual-Motor Integration',
        maxScore: 100,
        weight: 20,
      },
    ],
  },
  {
    toolCode: 'BRIEF',
    toolNameAr: 'تقييم السلوك التنفيذي للدماغ',
    toolNameEn: 'Behavior Rating Inventory of Executive Function',
    disabilityTypes: ['ADHD', 'AUTISM', 'LEARNING_DISABILITY'],
    domains: [
      { nameAr: 'الكف السلوكي', nameEn: 'Inhibit', maxScore: 80, weight: 20 },
      { nameAr: 'التحول', nameEn: 'Shift', maxScore: 80, weight: 20 },
      { nameAr: 'ضبط الانفعال', nameEn: 'Emotional Control', maxScore: 80, weight: 20 },
      { nameAr: 'التخطيط والتنظيم', nameEn: 'Plan/Organize', maxScore: 80, weight: 20 },
      { nameAr: 'الذاكرة العاملة', nameEn: 'Working Memory', maxScore: 80, weight: 20 },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// تفسيرات الدرجات
// ─────────────────────────────────────────────────────────────────────────────
const SCORE_INTERPRETATIONS = {
  ar: [
    'ضمن المستوى الطبيعي',
    'أقل من المتوسط بشكل طفيف',
    'أقل من المتوسط',
    'أقل من المتوسط بشكل ملحوظ',
    'ضعيف جداً - يحتاج تدخلاً فورياً',
  ],
  en: [
    'Within normal range',
    'Slightly below average',
    'Below average',
    'Significantly below average',
    'Very low - Immediate intervention required',
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// الملخصات والتوصيات
// ─────────────────────────────────────────────────────────────────────────────
const SUMMARIES = [
  {
    summaryAr:
      'أظهرت نتائج التقييم وجود تأخر ملحوظ في مجالات التواصل والتفاعل الاجتماعي مع قدرات حركية في المستوى المتوسط. يُنصح ببدء برنامج تأهيلي مكثف يشمل جلسات النطق والعلاج الوظيفي.',
    summaryEn:
      'Assessment results show significant delays in communication and social interaction with average motor abilities. Intensive rehabilitation program including speech and OT sessions recommended.',
    recommendationsAr:
      '1. جلسات نطق ولغة 3 مرات أسبوعياً لمدة 45 دقيقة\n2. جلسات علاج وظيفي مرتين أسبوعياً\n3. برنامج تكامل حسي أسبوعياً\n4. إعادة التقييم بعد 6 أشهر\n5. إشراك ولي الأمر في جلسات التدريب المنزلي',
    recommendationsEn:
      '1. Speech therapy 3x/week for 45 minutes\n2. OT sessions twice weekly\n3. Sensory integration program weekly\n4. Re-assessment after 6 months\n5. Parent training in home exercises',
  },
  {
    summaryAr:
      'كشف التقييم عن تأخر في النمو اللغوي مع مهارات اجتماعية جيدة نسبياً. المستفيد يستجيب جيداً للتعزيز الإيجابي ويُظهر دافعية للتعلم.',
    summaryEn:
      'Assessment reveals language developmental delay with relatively good social skills. Beneficiary responds well to positive reinforcement and shows learning motivation.',
    recommendationsAr:
      '1. جلسات نطق ولغة مكثفة 4 مرات أسبوعياً\n2. تدريب الوالدين على استراتيجيات دعم اللغة\n3. مراجعة أخصائي السمع (ENT)\n4. إعادة تقييم بعد 3 أشهر',
    recommendationsEn:
      '1. Intensive speech therapy 4x/week\n2. Parent training on language support strategies\n3. ENT/audiologist referral\n4. Re-assessment in 3 months',
  },
  {
    summaryAr:
      'أظهر التقييم الشامل تحديات في الوظائف التنفيذية والانتباه مع ذكاء وسطي. يستفيد المستفيد من البيئة المنظمة والتعليمات الواضحة والموجزة.',
    summaryEn:
      'Comprehensive assessment shows executive function and attention challenges with average intelligence. Beneficiary benefits from structured environment and clear, concise instructions.',
    recommendationsAr:
      '1. برنامج تحليل سلوك تطبيقي مرتين أسبوعياً\n2. التنسيق مع المدرسة لتوفير بيئة تعليمية داعمة\n3. تقييم نفسي متخصص\n4. بروتوكول مكافآت منظم\n5. متابعة دورية كل شهرين',
    recommendationsEn:
      '1. ABA program twice weekly\n2. School coordination for supportive learning environment\n3. Specialized psychological evaluation\n4. Structured reward protocol\n5. Regular follow-up every 2 months',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────
function getToolForDisability(disabilityType) {
  const suitable = ASSESSMENT_TOOLS.filter(t => t.disabilityTypes.includes(disabilityType));
  if (suitable.length === 0) return ASSESSMENT_TOOLS[0];
  return suitable[Math.floor(Math.random() * suitable.length)];
}

function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomScore(maxScore, performanceLevel = 'below_average') {
  const levels = {
    very_low: [0.05, 0.25],
    below_average: [0.2, 0.5],
    average: [0.45, 0.7],
    above_average: [0.65, 0.9],
  };
  const [minPct, maxPct] = levels[performanceLevel] || levels.below_average;
  return Math.round(maxScore * (minPct + Math.random() * (maxPct - minPct)));
}

function getInterpretation(score, maxScore) {
  const pct = score / maxScore;
  if (pct >= 0.8) return { arIdx: 0, enIdx: 0 };
  if (pct >= 0.65) return { arIdx: 1, enIdx: 1 };
  if (pct >= 0.5) return { arIdx: 2, enIdx: 2 };
  if (pct >= 0.3) return { arIdx: 3, enIdx: 3 };
  return { arIdx: 4, enIdx: 4 };
}

function dateMonthsAgo(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed Function
// ─────────────────────────────────────────────────────────────────────────────
async function seed(connection) {
  const db = connection.db || (connection.connection && connection.connection.db) || connection;
  if (!db) throw new Error('No database connection');

  const benefCol = db.collection('beneficiaries');
  const employeeCol = db.collection('employees');
  const assessmentsCol = db.collection('assessments');
  const now = new Date();

  // جلب المستفيدين النشطين المُضافين بواسطة الـ seed الشامل
  const activeBeneficiaries = await benefCol
    .find({ caseStatus: 'active', 'metadata.isComprehensiveSeed': true })
    .limit(15)
    .toArray();

  if (activeBeneficiaries.length === 0) {
    console.log(
      '  ⚠️  No active seeded beneficiaries found - run comprehensive-beneficiaries seed first'
    );
    return { created: 0 };
  }

  // جلب الأخصائيين
  const therapists = await employeeCol
    .find({
      role: { $in: ['therapist', 'senior_therapist'] },
      status: 'active',
      'metadata.isComprehensiveSeed': true,
    })
    .toArray();

  if (therapists.length === 0) {
    console.log('  ⚠️  No therapists found - run comprehensive-employees seed first');
    return { created: 0 };
  }

  let created = 0;

  for (let i = 0; i < activeBeneficiaries.length; i++) {
    const ben = activeBeneficiaries[i];
    const tool = getToolForDisability(ben.primaryDisability || 'AUTISM');
    const therapist = therapists[i % therapists.length];
    const summaryData = SUMMARIES[i % SUMMARIES.length];
    const assessmentMonthsAgo = randomInRange(1, 5);
    const assessmentDate = dateMonthsAgo(assessmentMonthsAgo);

    // حساب درجات المجالات
    const domainResults = tool.domains.map(domain => {
      const score = randomScore(domain.maxScore, 'below_average');
      const interpretation = getInterpretation(score, domain.maxScore);
      const percentile = randomInRange(5, 55);
      const ageEquivalentMonths = randomInRange(12, 48);

      return {
        domainNameAr: domain.nameAr,
        domainNameEn: domain.nameEn,
        maxScore: domain.maxScore,
        score,
        percentile,
        ageEquivalentMonths,
        weight: domain.weight,
        interpretationAr: SCORE_INTERPRETATIONS.ar[interpretation.arIdx],
        interpretationEn: SCORE_INTERPRETATIONS.en[interpretation.enIdx],
      };
    });

    // حساب الدرجة الإجمالية الموزونة
    const totalScore = domainResults.reduce((sum, d) => {
      return sum + (d.score / d.maxScore) * d.weight;
    }, 0);
    const totalScorePercentage = Math.round(totalScore);

    const assessment = {
      assessmentNumber: `ASMT-${ben.branchCode}-${String(i + 1).padStart(3, '0')}-${assessmentDate.getFullYear()}`,
      beneficiaryId: ben._id,
      beneficiaryNumber: ben.beneficiaryNumber,
      beneficiaryNameAr: ben.name?.ar,
      therapistId: therapist._id,
      therapistName: therapist.name?.ar,
      branchCode: ben.branchCode,

      // أداة التقييم
      toolCode: tool.toolCode,
      toolNameAr: tool.toolNameAr,
      toolNameEn: tool.toolNameEn,

      // نوع التقييم
      assessmentType: i < 10 ? 'initial' : 'follow_up', // أول 10 أولية، الباقي متابعة
      assessmentPurpose: i < 10 ? 'التقييم الأولي عند الالتحاق' : 'إعادة التقييم الدورية',

      // التواريخ
      assessmentDate,
      completedAt: assessmentDate,
      reportIssuedAt: new Date(assessmentDate.getTime() + 3 * 24 * 60 * 60 * 1000), // +3 أيام

      // نتائج المجالات
      domainResults,

      // الدرجة الإجمالية
      totalScorePercentage,
      overallPerformanceLevel:
        totalScorePercentage >= 70
          ? 'average'
          : totalScorePercentage >= 50
            ? 'below_average'
            : 'significantly_below_average',

      // الملخص والتوصيات
      summaryAr: summaryData.summaryAr,
      summaryEn: summaryData.summaryEn,
      recommendationsAr: summaryData.recommendationsAr,
      recommendationsEn: summaryData.recommendationsEn,

      // الحالة
      status: 'completed',
      isApproved: true,
      approvedBy: therapist.employeeId,
      approvedAt: new Date(assessmentDate.getTime() + 2 * 24 * 60 * 60 * 1000),

      // معلومات إضافية
      sessionDuration: randomInRange(60, 120),
      location: 'عيادة التقييم',
      parentPresent: true,
      parentFeedbackAr:
        'ولي الأمر يلاحظ تحسناً تدريجياً في التواصل في البيت، ويُبدي التزاماً كاملاً بالجلسات.',
      parentFeedbackEn:
        'Parent notes gradual improvement in home communication, fully committed to sessions.',

      // بيانات meta
      metadata: {
        isComprehensiveSeed: true,
        seededAt: now,
        seedVersion: '2.0',
      },
      createdAt: assessmentDate,
      updatedAt: now,
    };

    await assessmentsCol.insertOne(assessment);
    created++;

    // إضافة تقييم متابعة لبعض المستفيدين (أول 5)
    if (i < 5) {
      const followUpDate = dateMonthsAgo(Math.max(1, assessmentMonthsAgo - 3));
      const followUpDomains = tool.domains.map(domain => {
        const baseScore = domainResults.find(d => d.domainNameEn === domain.nameEn)?.score || 0;
        const improvement = randomInRange(5, 20);
        const newScore = Math.min(domain.maxScore, baseScore + improvement);
        const interpretation = getInterpretation(newScore, domain.maxScore);

        return {
          domainNameAr: domain.nameAr,
          domainNameEn: domain.nameEn,
          maxScore: domain.maxScore,
          score: newScore,
          percentile: randomInRange(15, 65),
          ageEquivalentMonths: randomInRange(18, 54),
          weight: domain.weight,
          interpretationAr: SCORE_INTERPRETATIONS.ar[interpretation.arIdx],
          interpretationEn: SCORE_INTERPRETATIONS.en[interpretation.enIdx],
          improvementFromBaseline: improvement,
        };
      });

      const followUpTotalScore = followUpDomains.reduce((sum, d) => {
        return sum + (d.score / d.maxScore) * d.weight;
      }, 0);

      await assessmentsCol.insertOne({
        assessmentNumber: `ASMT-${ben.branchCode}-${String(i + 1).padStart(3, '0')}-FU-${followUpDate.getFullYear()}`,
        beneficiaryId: ben._id,
        beneficiaryNumber: ben.beneficiaryNumber,
        beneficiaryNameAr: ben.name?.ar,
        therapistId: therapist._id,
        therapistName: therapist.name?.ar,
        branchCode: ben.branchCode,
        toolCode: tool.toolCode,
        toolNameAr: tool.toolNameAr,
        toolNameEn: tool.toolNameEn,
        assessmentType: 'follow_up',
        assessmentPurpose: 'إعادة التقييم بعد 3 أشهر من الخطة العلاجية',
        assessmentDate: followUpDate,
        completedAt: followUpDate,
        reportIssuedAt: new Date(followUpDate.getTime() + 3 * 24 * 60 * 60 * 1000),
        domainResults: followUpDomains,
        totalScorePercentage: Math.round(followUpTotalScore),
        overallPerformanceLevel:
          followUpTotalScore >= 70
            ? 'average'
            : followUpTotalScore >= 50
              ? 'below_average'
              : 'significantly_below_average',
        summaryAr:
          'تُظهر نتائج إعادة التقييم تحسناً ملحوظاً في معظم المجالات مقارنةً بالتقييم الأولي. يُنصح بالاستمرار في البرنامج العلاجي الحالي مع تعديلات طفيفة.',
        summaryEn:
          'Follow-up assessment shows notable improvement in most domains compared to initial assessment. Recommend continuing current treatment program with minor adjustments.',
        recommendationsAr:
          '1. الاستمرار في برنامج النطق بنفس الكثافة\n2. زيادة جلسات العلاج الوظيفي إلى 3 مرات أسبوعياً\n3. إضافة مهارات جديدة للخطة\n4. تقييم الربعي القادم بعد 3 أشهر',
        recommendationsEn:
          '1. Continue speech program at same intensity\n2. Increase OT to 3x/week\n3. Add new skills to the plan\n4. Next quarterly assessment in 3 months',
        status: 'completed',
        isApproved: true,
        approvedBy: therapist.employeeId,
        approvedAt: new Date(followUpDate.getTime() + 2 * 24 * 60 * 60 * 1000),
        sessionDuration: randomInRange(60, 120),
        location: 'عيادة التقييم',
        parentPresent: true,
        previousAssessmentRef: assessment.assessmentNumber,
        metadata: {
          isComprehensiveSeed: true,
          seededAt: now,
          seedVersion: '2.0',
        },
        createdAt: followUpDate,
        updatedAt: now,
      });
      created++;
    }
  }

  console.log(
    `  ✅ Assessments: ${created} created (${activeBeneficiaries.length} initial + 5 follow-ups)`
  );
  return { created };
}

// ─────────────────────────────────────────────────────────────────────────────
// Down Function
// ─────────────────────────────────────────────────────────────────────────────
async function down(connection) {
  const db = connection.db || (connection.connection && connection.connection.db) || connection;
  if (!db) return;
  const result = await db
    .collection('assessments')
    .deleteMany({ 'metadata.isComprehensiveSeed': true });
  console.log(`  ✅ Assessments: deleted ${result.deletedCount}`);
}

module.exports = { seed, down, ASSESSMENT_TOOLS };
