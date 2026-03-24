/**
 * AI Diagnostic Intelligence Service — ذكاء اصطناعي للتشخيص
 * Phase 17: تحليل تقدم المستفيد وتوصيات علاجية بالـ AI
 *
 * Features:
 *   🧠 Beneficiary Progress Analysis — تحليل تقدم المستفيد
 *   📊 Clinical Assessment Scoring — تقييم سريري
 *   💊 AI Treatment Recommendations — توصيات علاجية ذكية
 *   📈 Outcome Prediction — التنبؤ بالنتائج العلاجية
 *   🔬 Pattern Detection — اكتشاف الأنماط السلوكية
 *   🗂️ Session Analysis — تحليل الجلسات العلاجية
 *   📋 Goal Tracking — متابعة الأهداف العلاجية
 *   🏥 Risk Assessment — تقييم المخاطر
 *   📑 AI Reports — تقارير الذكاء الاصطناعي
 *   🔄 Treatment Plan Optimization — تحسين الخطة العلاجية
 */
const logger = require('../utils/logger');

class AIDiagnosticService {
  constructor() {
    // ═══ Data Stores ═══
    this.beneficiaries = new Map();
    this.assessments = new Map();
    this.sessions = new Map();
    this.goals = new Map();
    this.recommendations = new Map();
    this.predictions = new Map();
    this.patterns = new Map();
    this.riskAssessments = new Map();
    this.treatmentPlans = new Map();
    this.aiReports = new Map();
    this.progressSnapshots = new Map();
    this.behaviorLogs = new Map();
    this.milestones = new Map();
    this.alerts = new Map();

    // ═══ Auto-increment IDs ═══
    this._nextBeneficiaryId = 200;
    this._nextAssessmentId = 1000;
    this._nextSessionId = 2000;
    this._nextGoalId = 3000;
    this._nextRecommendationId = 4000;
    this._nextPredictionId = 5000;
    this._nextPatternId = 6000;
    this._nextRiskId = 7000;
    this._nextPlanId = 8000;
    this._nextReportId = 9000;
    this._nextSnapshotId = 10000;
    this._nextBehaviorLogId = 11000;
    this._nextMilestoneId = 12000;
    this._nextAlertId = 13000;

    // ═══ AI Model Configuration ═══
    this._aiModels = {
      progressAnalysis: { name: 'ProgressNet-v3', accuracy: 0.89, lastTrained: '2026-03-01' },
      outcomePredictor: { name: 'OutcomePredict-v2', accuracy: 0.85, lastTrained: '2026-02-15' },
      patternDetector: { name: 'BehaviorPattern-v4', accuracy: 0.91, lastTrained: '2026-03-10' },
      riskAssessor: { name: 'RiskScore-v2', accuracy: 0.87, lastTrained: '2026-02-28' },
      recommendationEngine: { name: 'TreatmentRec-v3', accuracy: 0.83, lastTrained: '2026-03-05' },
    };

    // ═══ Clinical Scales ═══
    this._clinicalScales = {
      icf: { name: 'ICF - التصنيف الدولي للوظائف', maxScore: 100 },
      gaf: { name: 'GAF - التقييم الوظيفي العام', maxScore: 100 },
      fim: { name: 'FIM - مقياس الاستقلالية الوظيفية', maxScore: 126 },
      barthel: { name: 'Barthel Index - مؤشر بارثل', maxScore: 100 },
      berg: { name: 'Berg Balance - مقياس بيرج للتوازن', maxScore: 56 },
      mmse: { name: 'MMSE - الفحص العقلي المصغر', maxScore: 30 },
      phq9: { name: 'PHQ-9 - استبيان صحة المريض', maxScore: 27 },
      gad7: { name: 'GAD-7 - مقياس القلق العام', maxScore: 21 },
    };

    // ═══ Disability Types ═══
    this._disabilityTypes = [
      'physical',
      'intellectual',
      'autism',
      'hearing',
      'visual',
      'speech',
      'learning',
      'multiple',
      'psychiatric',
      'neurological',
    ];

    // ═══ Therapy Types ═══
    this._therapyTypes = [
      'physiotherapy',
      'occupational',
      'speech_therapy',
      'behavioral',
      'cognitive',
      'psychotherapy',
      'art_therapy',
      'music_therapy',
      'play_therapy',
      'vocational',
      'social_skills',
      'sensory_integration',
    ];

    this._seed();
  }

  // ═══════════════════════════════════════════════════════════
  // SEED DATA — بيانات تجريبية
  // ═══════════════════════════════════════════════════════════
  _seed() {
    // ── Beneficiaries ──
    const beneficiaries = [
      {
        id: 'ben-101',
        name: 'أحمد محمد الغامدي',
        nationalId: '1098765432',
        dateOfBirth: '2012-05-15',
        gender: 'male',
        age: 13,
        disabilityType: 'autism',
        disabilitySeverity: 'moderate',
        enrollmentDate: '2025-06-01',
        status: 'active',
        guardian: { name: 'محمد الغامدي', phone: '0501234567', relation: 'father' },
        primaryTherapist: 'dr-01',
        team: ['dr-01', 'th-02', 'th-05'],
      },
      {
        id: 'ben-102',
        name: 'فاطمة عبدالله العتيبي',
        nationalId: '1087654321',
        dateOfBirth: '2015-09-20',
        gender: 'female',
        age: 10,
        disabilityType: 'intellectual',
        disabilitySeverity: 'mild',
        enrollmentDate: '2025-08-15',
        status: 'active',
        guardian: { name: 'عبدالله العتيبي', phone: '0559876543', relation: 'father' },
        primaryTherapist: 'dr-02',
        team: ['dr-02', 'th-03'],
      },
      {
        id: 'ben-103',
        name: 'خالد سعد القحطاني',
        nationalId: '1076543210',
        dateOfBirth: '2008-01-10',
        gender: 'male',
        age: 18,
        disabilityType: 'physical',
        disabilitySeverity: 'severe',
        enrollmentDate: '2024-11-01',
        status: 'active',
        guardian: { name: 'سعد القحطاني', phone: '0567891234', relation: 'father' },
        primaryTherapist: 'dr-03',
        team: ['dr-03', 'th-01', 'th-04'],
      },
      {
        id: 'ben-104',
        name: 'نورة إبراهيم الشمري',
        nationalId: '1065432109',
        dateOfBirth: '2016-12-05',
        gender: 'female',
        age: 9,
        disabilityType: 'speech',
        disabilitySeverity: 'moderate',
        enrollmentDate: '2025-10-01',
        status: 'active',
        guardian: { name: 'إبراهيم الشمري', phone: '0543216789', relation: 'father' },
        primaryTherapist: 'dr-01',
        team: ['dr-01', 'th-05'],
      },
      {
        id: 'ben-105',
        name: 'عمر يوسف المطيري',
        nationalId: '1054321098',
        dateOfBirth: '2010-07-25',
        gender: 'male',
        age: 15,
        disabilityType: 'multiple',
        disabilitySeverity: 'severe',
        enrollmentDate: '2024-06-15',
        status: 'active',
        guardian: { name: 'يوسف المطيري', phone: '0578901234', relation: 'father' },
        primaryTherapist: 'dr-02',
        team: ['dr-02', 'dr-03', 'th-01', 'th-02', 'th-03'],
      },
    ];
    beneficiaries.forEach(b => this.beneficiaries.set(b.id, b));

    // ── Assessments ──
    const assessments = [
      {
        id: 'asmt-101',
        beneficiaryId: 'ben-101',
        type: 'initial',
        scale: 'icf',
        score: 42,
        maxScore: 100,
        date: '2025-06-05',
        assessor: 'dr-01',
        domain: 'communication',
        details: { subScores: { expression: 35, comprehension: 48, interaction: 43 } },
        notes: 'صعوبات واضحة في التواصل اللفظي وغير اللفظي',
      },
      {
        id: 'asmt-102',
        beneficiaryId: 'ben-101',
        type: 'followup',
        scale: 'icf',
        score: 55,
        maxScore: 100,
        date: '2025-09-05',
        assessor: 'dr-01',
        domain: 'communication',
        details: { subScores: { expression: 48, comprehension: 60, interaction: 57 } },
        notes: 'تحسن ملحوظ في الفهم والتفاعل الاجتماعي',
      },
      {
        id: 'asmt-103',
        beneficiaryId: 'ben-101',
        type: 'followup',
        scale: 'icf',
        score: 67,
        maxScore: 100,
        date: '2025-12-05',
        assessor: 'dr-01',
        domain: 'communication',
        details: { subScores: { expression: 62, comprehension: 72, interaction: 67 } },
        notes: 'تقدم مستمر — يمكنه التعبير عن احتياجاته بشكل أفضل',
      },
      {
        id: 'asmt-104',
        beneficiaryId: 'ben-102',
        type: 'initial',
        scale: 'fim',
        score: 78,
        maxScore: 126,
        date: '2025-08-20',
        assessor: 'dr-02',
        domain: 'daily_living',
        details: { subScores: { selfCare: 30, mobility: 28, cognition: 20 } },
        notes: 'مستوى استقلالية جيد مع حاجة لدعم في المهام المعقدة',
      },
      {
        id: 'asmt-105',
        beneficiaryId: 'ben-102',
        type: 'followup',
        scale: 'fim',
        score: 92,
        maxScore: 126,
        date: '2026-01-20',
        assessor: 'dr-02',
        domain: 'daily_living',
        details: { subScores: { selfCare: 38, mobility: 30, cognition: 24 } },
        notes: 'تحسن واضح في الرعاية الذاتية والقدرات المعرفية',
      },
      {
        id: 'asmt-106',
        beneficiaryId: 'ben-103',
        type: 'initial',
        scale: 'barthel',
        score: 35,
        maxScore: 100,
        date: '2024-11-10',
        assessor: 'dr-03',
        domain: 'mobility',
        details: {
          subScores: {
            feeding: 5,
            bathing: 0,
            grooming: 5,
            dressing: 5,
            bowels: 10,
            bladder: 10,
            toilet: 0,
            transfer: 0,
            mobility: 0,
            stairs: 0,
          },
        },
        notes: 'إعاقة حركية شديدة تتطلب مساعدة في معظم الأنشطة',
      },
      {
        id: 'asmt-107',
        beneficiaryId: 'ben-103',
        type: 'followup',
        scale: 'barthel',
        score: 55,
        maxScore: 100,
        date: '2025-05-10',
        assessor: 'dr-03',
        domain: 'mobility',
        details: {
          subScores: {
            feeding: 10,
            bathing: 5,
            grooming: 5,
            dressing: 10,
            bowels: 10,
            bladder: 10,
            toilet: 5,
            transfer: 0,
            mobility: 0,
            stairs: 0,
          },
        },
        notes: 'تحسن في الرعاية الذاتية العلوية مع بقاء صعوبات في التنقل',
      },
      {
        id: 'asmt-108',
        beneficiaryId: 'ben-104',
        type: 'initial',
        scale: 'icf',
        score: 38,
        maxScore: 100,
        date: '2025-10-05',
        assessor: 'dr-01',
        domain: 'speech',
        details: { subScores: { articulation: 30, fluency: 35, voice: 50 } },
        notes: 'تأخر واضح في النطق مع صعوبات في المخارج',
      },
      {
        id: 'asmt-109',
        beneficiaryId: 'ben-105',
        type: 'initial',
        scale: 'gaf',
        score: 30,
        maxScore: 100,
        date: '2024-06-20',
        assessor: 'dr-02',
        domain: 'overall_function',
        details: { subScores: { social: 25, occupational: 20, selfCare: 40, cognitive: 35 } },
        notes: 'إعاقة متعددة تؤثر على معظم جوانب الحياة اليومية',
      },
      {
        id: 'asmt-110',
        beneficiaryId: 'ben-105',
        type: 'followup',
        scale: 'gaf',
        score: 45,
        maxScore: 100,
        date: '2025-06-20',
        assessor: 'dr-02',
        domain: 'overall_function',
        details: { subScores: { social: 40, occupational: 35, selfCare: 55, cognitive: 50 } },
        notes: 'تحسن تدريجي على مدار السنة — الأفضل في الرعاية الذاتية',
      },
    ];
    assessments.forEach(a => this.assessments.set(a.id, a));

    // ── Sessions ──
    const sessions = [
      {
        id: 'sess-101',
        beneficiaryId: 'ben-101',
        therapistId: 'dr-01',
        therapyType: 'behavioral',
        date: '2026-03-10',
        duration: 60,
        status: 'completed',
        goals: ['goal-101', 'goal-102'],
        notes: 'جلسة تطبيقية لتحسين مهارات التواصل — استجابة جيدة',
        outcomes: { engagement: 85, progressRating: 4, challenges: ['التركيز لفترات طويلة'] },
        aiAnalysis: {
          sentimentScore: 0.78,
          engagementLevel: 'high',
          suggestedFollowUp: 'تكرار تمارين التواصل البصري',
        },
      },
      {
        id: 'sess-102',
        beneficiaryId: 'ben-101',
        therapistId: 'th-02',
        therapyType: 'speech_therapy',
        date: '2026-03-12',
        duration: 45,
        status: 'completed',
        goals: ['goal-102'],
        notes: 'تمرينات المخارج — تحسن في حروف (ر، ل، ث)',
        outcomes: { engagement: 72, progressRating: 3, challenges: ['صعوبة بعض المخارج'] },
        aiAnalysis: {
          sentimentScore: 0.65,
          engagementLevel: 'medium',
          suggestedFollowUp: 'تكثيف تمارين حرف الراء',
        },
      },
      {
        id: 'sess-103',
        beneficiaryId: 'ben-102',
        therapistId: 'dr-02',
        therapyType: 'cognitive',
        date: '2026-03-11',
        duration: 50,
        status: 'completed',
        goals: ['goal-103'],
        notes: 'أنشطة التصنيف والتسلسل — أداء ممتاز',
        outcomes: { engagement: 90, progressRating: 5, challenges: [] },
        aiAnalysis: {
          sentimentScore: 0.92,
          engagementLevel: 'high',
          suggestedFollowUp: 'الانتقال لمستوى أعلى من المهام المعرفية',
        },
      },
      {
        id: 'sess-104',
        beneficiaryId: 'ben-103',
        therapistId: 'dr-03',
        therapyType: 'physiotherapy',
        date: '2026-03-13',
        duration: 60,
        status: 'completed',
        goals: ['goal-104'],
        notes: 'تمارين تقوية الأطراف السفلى — تحسن بسيط في نطاق الحركة',
        outcomes: {
          engagement: 65,
          progressRating: 3,
          challenges: ['ألم أثناء بعض التمارين', 'إرهاق سريع'],
        },
        aiAnalysis: {
          sentimentScore: 0.55,
          engagementLevel: 'medium',
          suggestedFollowUp: 'تعديل شدة التمارين وإضافة فترات راحة',
        },
      },
      {
        id: 'sess-105',
        beneficiaryId: 'ben-105',
        therapistId: 'th-01',
        therapyType: 'occupational',
        date: '2026-03-14',
        duration: 45,
        status: 'completed',
        goals: ['goal-106'],
        notes: 'تدريب على ارتداء الملابس والعناية الشخصية',
        outcomes: { engagement: 75, progressRating: 4, challenges: ['بطء في التنفيذ'] },
        aiAnalysis: {
          sentimentScore: 0.72,
          engagementLevel: 'medium',
          suggestedFollowUp: 'استمرار التدريب مع تقليل التوجيه تدريجياً',
        },
      },
    ];
    sessions.forEach(s => this.sessions.set(s.id, s));

    // ── Goals ──
    const goals = [
      {
        id: 'goal-101',
        beneficiaryId: 'ben-101',
        category: 'communication',
        title: 'التواصل البصري',
        description: 'الحفاظ على التواصل البصري لمدة 5 ثوان',
        targetDate: '2026-06-01',
        progress: 72,
        status: 'in_progress',
        milestones: [
          { label: '2 ثانية تواصل', achieved: true, date: '2025-09-15' },
          { label: '3 ثوان تواصل', achieved: true, date: '2025-12-01' },
          { label: '5 ثوان تواصل', achieved: false, date: null },
        ],
      },
      {
        id: 'goal-102',
        beneficiaryId: 'ben-101',
        category: 'speech',
        title: 'نطق الحروف',
        description: 'نطق جميع الحروف العربية بشكل واضح',
        targetDate: '2026-09-01',
        progress: 58,
        status: 'in_progress',
        milestones: [
          { label: '15 حرف صحيح', achieved: true, date: '2025-11-01' },
          { label: '22 حرف صحيح', achieved: true, date: '2026-02-01' },
          { label: '28 حرف صحيح', achieved: false, date: null },
        ],
      },
      {
        id: 'goal-103',
        beneficiaryId: 'ben-102',
        category: 'cognitive',
        title: 'المهارات المعرفية الأساسية',
        description: 'إتقان التصنيف والتسلسل والمقارنة',
        targetDate: '2026-04-01',
        progress: 88,
        status: 'in_progress',
        milestones: [
          { label: 'تصنيف بسيط', achieved: true, date: '2025-10-15' },
          { label: 'تسلسل رقمي', achieved: true, date: '2025-12-20' },
          { label: 'مقارنة متقدمة', achieved: true, date: '2026-02-10' },
          { label: 'حل مشكلات بسيطة', achieved: false, date: null },
        ],
      },
      {
        id: 'goal-104',
        beneficiaryId: 'ben-103',
        category: 'mobility',
        title: 'المشي المستقل',
        description: 'المشي بمساعدة مشاية لمسافة 50 متر',
        targetDate: '2026-08-01',
        progress: 40,
        status: 'in_progress',
        milestones: [
          { label: 'الوقوف بمساعدة', achieved: true, date: '2025-03-01' },
          { label: '10 أمتار بمشاية', achieved: true, date: '2025-08-15' },
          { label: '50 متر بمشاية', achieved: false, date: null },
        ],
      },
      {
        id: 'goal-105',
        beneficiaryId: 'ben-104',
        category: 'speech',
        title: 'وضوح النطق',
        description: 'تحسين وضوح النطق بنسبة 80%',
        targetDate: '2026-07-01',
        progress: 45,
        status: 'in_progress',
        milestones: [
          { label: '50% وضوح', achieved: true, date: '2026-01-15' },
          { label: '65% وضوح', achieved: false, date: null },
          { label: '80% وضوح', achieved: false, date: null },
        ],
      },
      {
        id: 'goal-106',
        beneficiaryId: 'ben-105',
        category: 'daily_living',
        title: 'الاستقلالية في الملبس',
        description: 'ارتداء الملابس بشكل مستقل',
        targetDate: '2026-12-01',
        progress: 55,
        status: 'in_progress',
        milestones: [
          { label: 'خلع الملابس', achieved: true, date: '2025-09-01' },
          { label: 'ارتداء بسيط', achieved: true, date: '2026-01-01' },
          { label: 'ارتداء كامل', achieved: false, date: null },
        ],
      },
    ];
    goals.forEach(g => this.goals.set(g.id, g));

    // ── Treatment Plans ──
    const plans = [
      {
        id: 'plan-101',
        beneficiaryId: 'ben-101',
        status: 'active',
        createdDate: '2025-06-05',
        updatedDate: '2026-03-01',
        diagnosis: 'اضطراب طيف التوحد — درجة متوسطة',
        primaryGoals: ['goal-101', 'goal-102'],
        therapies: [
          { type: 'behavioral', frequency: 'twice_weekly', duration: 60, therapist: 'dr-01' },
          { type: 'speech_therapy', frequency: 'twice_weekly', duration: 45, therapist: 'th-02' },
          { type: 'sensory_integration', frequency: 'weekly', duration: 45, therapist: 'th-05' },
        ],
        aiOptimization: {
          lastOptimized: '2026-03-01',
          suggestions: ['زيادة جلسات التواصل البصري', 'إضافة أنشطة جماعية'],
          confidence: 0.82,
        },
      },
      {
        id: 'plan-102',
        beneficiaryId: 'ben-102',
        status: 'active',
        createdDate: '2025-08-20',
        updatedDate: '2026-02-15',
        diagnosis: 'إعاقة ذهنية بسيطة',
        primaryGoals: ['goal-103'],
        therapies: [
          { type: 'cognitive', frequency: 'twice_weekly', duration: 50, therapist: 'dr-02' },
          { type: 'social_skills', frequency: 'weekly', duration: 45, therapist: 'th-03' },
        ],
        aiOptimization: {
          lastOptimized: '2026-02-15',
          suggestions: ['إضافة أنشطة حل المشكلات', 'الانتقال للمرحلة التالية'],
          confidence: 0.88,
        },
      },
      {
        id: 'plan-103',
        beneficiaryId: 'ben-103',
        status: 'active',
        createdDate: '2024-11-10',
        updatedDate: '2026-03-10',
        diagnosis: 'شلل نصفي سفلي بسبب إصابة نخاعية',
        primaryGoals: ['goal-104'],
        therapies: [
          { type: 'physiotherapy', frequency: 'three_weekly', duration: 60, therapist: 'dr-03' },
          { type: 'occupational', frequency: 'twice_weekly', duration: 45, therapist: 'th-01' },
        ],
        aiOptimization: {
          lastOptimized: '2026-03-10',
          suggestions: ['إضافة علاج مائي', 'تقييم إمكانية استخدام أجهزة مساعدة'],
          confidence: 0.75,
        },
      },
    ];
    plans.forEach(p => this.treatmentPlans.set(p.id, p));

    // ── Behavior Logs ──
    const behaviorLogs = [
      {
        id: 'beh-101',
        beneficiaryId: 'ben-101',
        date: '2026-03-10',
        type: 'positive',
        behavior: 'تفاعل اجتماعي تلقائي',
        context: 'وقت اللعب',
        intensity: 'moderate',
        duration: 15,
        observer: 'th-02',
      },
      {
        id: 'beh-102',
        beneficiaryId: 'ben-101',
        date: '2026-03-11',
        type: 'challenging',
        behavior: 'نوبة حسية',
        context: 'بيئة صاخبة',
        intensity: 'high',
        duration: 8,
        observer: 'dr-01',
        intervention: 'إزالة من المحفز + تقنية تهدئة',
      },
      {
        id: 'beh-103',
        beneficiaryId: 'ben-103',
        date: '2026-03-13',
        type: 'positive',
        behavior: 'محاولة الوقوف ذاتياً',
        context: 'جلسة علاج طبيعي',
        intensity: 'low',
        duration: 5,
        observer: 'dr-03',
      },
      {
        id: 'beh-104',
        beneficiaryId: 'ben-105',
        date: '2026-03-14',
        type: 'positive',
        behavior: 'إكمال مهمة مستقل',
        context: 'علاج وظيفي',
        intensity: 'moderate',
        duration: 20,
        observer: 'th-01',
      },
    ];
    behaviorLogs.forEach(b => this.behaviorLogs.set(b.id, b));

    // ── Alerts ──
    const alerts = [
      {
        id: 'alert-101',
        beneficiaryId: 'ben-103',
        type: 'plateau',
        severity: 'warning',
        message: 'لم يُلاحظ تقدم في هدف المشي خلال 6 أسابيع',
        createdDate: '2026-03-05',
        resolved: false,
      },
      {
        id: 'alert-102',
        beneficiaryId: 'ben-104',
        type: 'attendance',
        severity: 'info',
        message: 'تأخر في حضور 3 جلسات متتالية',
        createdDate: '2026-03-08',
        resolved: false,
      },
    ];
    alerts.forEach(a => this.alerts.set(a.id, a));

    logger.info(
      '[AIDiagnostic] Seed data loaded — 5 beneficiaries, 10 assessments, 5 sessions, 6 goals, 3 plans'
    );
  }

  // ═══════════════════════════════════════════════════════════
  // DASHBOARD — لوحة التحكم
  // ═══════════════════════════════════════════════════════════
  getDashboard() {
    const allBeneficiaries = [...this.beneficiaries.values()];
    const allAssessments = [...this.assessments.values()];
    const allSessions = [...this.sessions.values()];
    const allGoals = [...this.goals.values()];
    const allPlans = [...this.treatmentPlans.values()];
    const allAlerts = [...this.alerts.values()];

    const avgProgress = allGoals.length
      ? Math.round(allGoals.reduce((s, g) => s + g.progress, 0) / allGoals.length)
      : 0;

    const avgEngagement = allSessions.length
      ? Math.round(
          allSessions.reduce((s, ses) => s + (ses.outcomes?.engagement || 0), 0) /
            allSessions.length
        )
      : 0;

    const improvingCount = allBeneficiaries.filter(b => {
      const bAssessments = allAssessments
        .filter(a => a.beneficiaryId === b.id)
        .sort((a, b2) => a.date.localeCompare(b2.date));
      if (bAssessments.length < 2) return false;
      return (
        bAssessments[bAssessments.length - 1].score > bAssessments[bAssessments.length - 2].score
      );
    }).length;

    return {
      totalBeneficiaries: allBeneficiaries.filter(b => b.status === 'active').length,
      totalSessions: allSessions.length,
      totalGoals: allGoals.length,
      activeAlerts: allAlerts.filter(a => !a.resolved).length,
      averageProgress: avgProgress,
      averageEngagement: avgEngagement,
      improvingBeneficiaries: improvingCount,
      activePlans: allPlans.filter(p => p.status === 'active').length,
      aiModelsActive: Object.keys(this._aiModels).length,
      recentSessions: allSessions.slice(-5).reverse(),
      alertsSummary: {
        critical: allAlerts.filter(a => a.severity === 'critical' && !a.resolved).length,
        warning: allAlerts.filter(a => a.severity === 'warning' && !a.resolved).length,
        info: allAlerts.filter(a => a.severity === 'info' && !a.resolved).length,
      },
      disabilityDistribution: this._disabilityTypes.reduce((acc, type) => {
        const count = allBeneficiaries.filter(b => b.disabilityType === type).length;
        if (count > 0) acc[type] = count;
        return acc;
      }, {}),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // BENEFICIARIES — المستفيدون
  // ═══════════════════════════════════════════════════════════
  listBeneficiaries({ page = 1, limit = 20, status, disabilityType, search } = {}) {
    let items = [...this.beneficiaries.values()];
    if (status) items = items.filter(b => b.status === status);
    if (disabilityType) items = items.filter(b => b.disabilityType === disabilityType);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(b => b.name.toLowerCase().includes(q) || b.nationalId.includes(q));
    }
    const total = items.length;
    const start = (page - 1) * limit;
    return { data: items.slice(start, start + limit), total, page, limit };
  }

  getBeneficiary(id) {
    const b = this.beneficiaries.get(id);
    if (!b) throw Object.assign(new Error('المستفيد غير موجود'), { statusCode: 404 });
    return b;
  }

  createBeneficiary(data) {
    const id = `ben-${this._nextBeneficiaryId++}`;
    const entry = {
      id,
      name: data.name,
      nationalId: data.nationalId,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender || 'male',
      age: data.age || this._calcAge(data.dateOfBirth),
      disabilityType: data.disabilityType,
      disabilitySeverity: data.disabilitySeverity || 'moderate',
      enrollmentDate: data.enrollmentDate || new Date().toISOString().slice(0, 10),
      status: 'active',
      guardian: data.guardian || null,
      primaryTherapist: data.primaryTherapist || null,
      team: data.team || [],
      createdAt: new Date().toISOString(),
    };
    this.beneficiaries.set(id, entry);
    return entry;
  }

  updateBeneficiary(id, data) {
    const b = this.getBeneficiary(id);
    const updated = { ...b, ...data, id, updatedAt: new Date().toISOString() };
    this.beneficiaries.set(id, updated);
    return updated;
  }

  // ═══════════════════════════════════════════════════════════
  // ASSESSMENTS — التقييمات السريرية
  // ═══════════════════════════════════════════════════════════
  listAssessments(beneficiaryId, { scale, domain } = {}) {
    let items = [...this.assessments.values()].filter(a => a.beneficiaryId === beneficiaryId);
    if (scale) items = items.filter(a => a.scale === scale);
    if (domain) items = items.filter(a => a.domain === domain);
    return items.sort((a, b) => a.date.localeCompare(b.date));
  }

  getAssessment(id) {
    const a = this.assessments.get(id);
    if (!a) throw Object.assign(new Error('التقييم غير موجود'), { statusCode: 404 });
    return a;
  }

  createAssessment(data) {
    this.getBeneficiary(data.beneficiaryId);
    const id = `asmt-${this._nextAssessmentId++}`;
    const entry = {
      id,
      beneficiaryId: data.beneficiaryId,
      type: data.type || 'followup',
      scale: data.scale,
      score: data.score,
      maxScore: data.maxScore || this._clinicalScales[data.scale]?.maxScore || 100,
      date: data.date || new Date().toISOString().slice(0, 10),
      assessor: data.assessor,
      domain: data.domain,
      details: data.details || {},
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
    };
    this.assessments.set(id, entry);
    // Auto-generate AI analysis after new assessment
    this._checkForAlerts(entry);
    return entry;
  }

  // ═══════════════════════════════════════════════════════════
  // SESSIONS — الجلسات العلاجية
  // ═══════════════════════════════════════════════════════════
  listSessions(beneficiaryId, { therapyType, status } = {}) {
    let items = [...this.sessions.values()].filter(s => s.beneficiaryId === beneficiaryId);
    if (therapyType) items = items.filter(s => s.therapyType === therapyType);
    if (status) items = items.filter(s => s.status === status);
    return items.sort((a, b) => a.date.localeCompare(b.date));
  }

  getSession(id) {
    const s = this.sessions.get(id);
    if (!s) throw Object.assign(new Error('الجلسة غير موجودة'), { statusCode: 404 });
    return s;
  }

  createSession(data) {
    this.getBeneficiary(data.beneficiaryId);
    const id = `sess-${this._nextSessionId++}`;
    const entry = {
      id,
      beneficiaryId: data.beneficiaryId,
      therapistId: data.therapistId,
      therapyType: data.therapyType,
      date: data.date || new Date().toISOString().slice(0, 10),
      duration: data.duration || 45,
      status: data.status || 'scheduled',
      goals: data.goals || [],
      notes: data.notes || '',
      outcomes: data.outcomes || null,
      aiAnalysis: null,
      createdAt: new Date().toISOString(),
    };
    // Auto-generate AI analysis if session is completed with outcomes
    if (entry.status === 'completed' && entry.outcomes) {
      entry.aiAnalysis = this._generateSessionAIAnalysis(entry);
    }
    this.sessions.set(id, entry);
    return entry;
  }

  completeSession(id, outcomes) {
    const s = this.getSession(id);
    s.status = 'completed';
    s.outcomes = outcomes;
    s.aiAnalysis = this._generateSessionAIAnalysis(s);
    s.completedAt = new Date().toISOString();
    this.sessions.set(id, s);
    return s;
  }

  // ═══════════════════════════════════════════════════════════
  // GOALS — الأهداف العلاجية
  // ═══════════════════════════════════════════════════════════
  listGoals(beneficiaryId, { category, status } = {}) {
    let items = [...this.goals.values()].filter(g => g.beneficiaryId === beneficiaryId);
    if (category) items = items.filter(g => g.category === category);
    if (status) items = items.filter(g => g.status === status);
    return items;
  }

  getGoal(id) {
    const g = this.goals.get(id);
    if (!g) throw Object.assign(new Error('الهدف غير موجود'), { statusCode: 404 });
    return g;
  }

  createGoal(data) {
    this.getBeneficiary(data.beneficiaryId);
    const id = `goal-${this._nextGoalId++}`;
    const entry = {
      id,
      beneficiaryId: data.beneficiaryId,
      category: data.category,
      title: data.title,
      description: data.description || '',
      targetDate: data.targetDate,
      progress: 0,
      status: 'in_progress',
      milestones: data.milestones || [],
      createdAt: new Date().toISOString(),
    };
    this.goals.set(id, entry);
    return entry;
  }

  updateGoalProgress(id, progress, milestoneIndex) {
    const g = this.getGoal(id);
    g.progress = Math.max(0, Math.min(100, progress));
    if (milestoneIndex !== undefined && g.milestones[milestoneIndex]) {
      g.milestones[milestoneIndex].achieved = true;
      g.milestones[milestoneIndex].date = new Date().toISOString().slice(0, 10);
    }
    if (g.progress >= 100) {
      g.status = 'achieved';
      g.achievedDate = new Date().toISOString().slice(0, 10);
    }
    g.updatedAt = new Date().toISOString();
    this.goals.set(id, g);
    return g;
  }

  // ═══════════════════════════════════════════════════════════
  // TREATMENT PLANS — الخطط العلاجية
  // ═══════════════════════════════════════════════════════════
  listTreatmentPlans({ beneficiaryId, status } = {}) {
    let items = [...this.treatmentPlans.values()];
    if (beneficiaryId) items = items.filter(p => p.beneficiaryId === beneficiaryId);
    if (status) items = items.filter(p => p.status === status);
    return items;
  }

  getTreatmentPlan(id) {
    const p = this.treatmentPlans.get(id);
    if (!p) throw Object.assign(new Error('الخطة العلاجية غير موجودة'), { statusCode: 404 });
    return p;
  }

  createTreatmentPlan(data) {
    this.getBeneficiary(data.beneficiaryId);
    const id = `plan-${this._nextPlanId++}`;
    const entry = {
      id,
      beneficiaryId: data.beneficiaryId,
      status: 'active',
      createdDate: new Date().toISOString().slice(0, 10),
      updatedDate: new Date().toISOString().slice(0, 10),
      diagnosis: data.diagnosis,
      primaryGoals: data.primaryGoals || [],
      therapies: data.therapies || [],
      aiOptimization: null,
      createdAt: new Date().toISOString(),
    };
    this.treatmentPlans.set(id, entry);
    return entry;
  }

  updateTreatmentPlan(id, data) {
    const p = this.getTreatmentPlan(id);
    const updated = { ...p, ...data, id, updatedDate: new Date().toISOString().slice(0, 10) };
    this.treatmentPlans.set(id, updated);
    return updated;
  }

  // ═══════════════════════════════════════════════════════════
  // AI PROGRESS ANALYSIS — تحليل التقدم بالذكاء الاصطناعي
  // ═══════════════════════════════════════════════════════════
  analyzeProgress(beneficiaryId) {
    const b = this.getBeneficiary(beneficiaryId);
    const assessments = this.listAssessments(beneficiaryId);
    const sessions = this.listSessions(beneficiaryId);
    const goals = this.listGoals(beneficiaryId);
    const behaviors = [...this.behaviorLogs.values()].filter(
      bl => bl.beneficiaryId === beneficiaryId
    );

    // Calculate progress trajectory
    const trajectory = this._calculateTrajectory(assessments);

    // Calculate engagement trend
    const engagementTrend = this._calculateEngagementTrend(sessions);

    // Calculate goal completion rate
    const goalStats = {
      total: goals.length,
      achieved: goals.filter(g => g.status === 'achieved').length,
      inProgress: goals.filter(g => g.status === 'in_progress').length,
      avgProgress: goals.length
        ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
        : 0,
    };

    // Behavior analysis
    const behaviorAnalysis = {
      totalLogs: behaviors.length,
      positive: behaviors.filter(bl => bl.type === 'positive').length,
      challenging: behaviors.filter(bl => bl.type === 'challenging').length,
      positiveRatio: behaviors.length
        ? Math.round(
            (behaviors.filter(bl => bl.type === 'positive').length / behaviors.length) * 100
          )
        : 0,
    };

    // AI score
    const aiProgressScore = this._computeAIScore(
      trajectory,
      engagementTrend,
      goalStats,
      behaviorAnalysis
    );

    const analysis = {
      beneficiaryId,
      beneficiaryName: b.name,
      analysisDate: new Date().toISOString(),
      model: this._aiModels.progressAnalysis,
      overallScore: aiProgressScore,
      trajectory,
      engagementTrend,
      goalStats,
      behaviorAnalysis,
      strengths: this._identifyStrengths(assessments, sessions, goals),
      areasForImprovement: this._identifyWeaknesses(assessments, sessions, goals),
      riskLevel: aiProgressScore < 30 ? 'high' : aiProgressScore < 60 ? 'medium' : 'low',
    };

    // Store analysis
    const snapId = `snap-${this._nextSnapshotId++}`;
    this.progressSnapshots.set(snapId, { id: snapId, ...analysis });
    return analysis;
  }

  // ═══════════════════════════════════════════════════════════
  // AI RECOMMENDATIONS — التوصيات العلاجية الذكية
  // ═══════════════════════════════════════════════════════════
  generateRecommendations(beneficiaryId) {
    const b = this.getBeneficiary(beneficiaryId);
    const analysis = this.analyzeProgress(beneficiaryId);
    const plan = [...this.treatmentPlans.values()].find(
      p => p.beneficiaryId === beneficiaryId && p.status === 'active'
    );
    const sessions = this.listSessions(beneficiaryId);

    const recommendations = [];

    // Therapy frequency recommendations
    if (analysis.engagementTrend.direction === 'declining') {
      recommendations.push({
        type: 'therapy_adjustment',
        priority: 'high',
        title: 'تعديل وتيرة الجلسات',
        description: 'يُلاحظ انخفاض في مستوى المشاركة. يُوصى بمراجعة أنواع العلاج وتغيير النهج.',
        rationale: `انخفاض المشاركة من ${analysis.engagementTrend.start}% إلى ${analysis.engagementTrend.end}%`,
        confidence: 0.85,
      });
    }

    // Goal-specific recommendations
    analysis.areasForImprovement.forEach(area => {
      recommendations.push({
        type: 'goal_modification',
        priority: 'medium',
        title: `تعديل هدف: ${area}`,
        description: `يحتاج إلى مراجعة وتعديل الأهداف المتعلقة بـ ${area}`,
        rationale: 'تقدم أبطأ من المتوقع في هذا المجال',
        confidence: 0.78,
      });
    });

    // Therapy type suggestions
    if (b.disabilityType === 'autism' && !sessions.find(s => s.therapyType === 'social_skills')) {
      recommendations.push({
        type: 'new_therapy',
        priority: 'medium',
        title: 'إضافة علاج المهارات الاجتماعية',
        description: 'بناءً على نوع الإعاقة، يُوصى بإضافة جلسات مهارات اجتماعية',
        rationale: 'أطفال التوحد يستفيدون بشكل كبير من تدريب المهارات الاجتماعية',
        confidence: 0.9,
      });
    }

    // Progress-based recommendations
    if (analysis.overallScore >= 70) {
      recommendations.push({
        type: 'advancement',
        priority: 'low',
        title: 'الانتقال للمرحلة التالية',
        description: 'التقدم ممتاز — يمكن البدء في أهداف أعلى مستوى',
        rationale: `نسبة التقدم الكلية: ${analysis.overallScore}%`,
        confidence: 0.82,
      });
    }

    // Behavioral recommendations
    if (analysis.behaviorAnalysis.challenging > 0) {
      recommendations.push({
        type: 'behavioral_support',
        priority: analysis.behaviorAnalysis.positiveRatio < 50 ? 'high' : 'medium',
        title: 'تعزيز الدعم السلوكي',
        description: 'تم رصد سلوكيات تحتاج متابعة — يُوصى بتعزيز خطة الدعم السلوكي',
        rationale: `نسبة السلوكيات الإيجابية: ${analysis.behaviorAnalysis.positiveRatio}%`,
        confidence: 0.8,
      });
    }

    // Default positive recommendation
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'maintenance',
        priority: 'low',
        title: 'الاستمرار في الخطة الحالية',
        description: 'الأداء جيد — يُوصى بالاستمرار في الخطة العلاجية الحالية',
        rationale: 'جميع المؤشرات ضمن المعدل الطبيعي',
        confidence: 0.75,
      });
    }

    const recId = `rec-${this._nextRecommendationId++}`;
    const result = {
      id: recId,
      beneficiaryId,
      beneficiaryName: b.name,
      generatedAt: new Date().toISOString(),
      model: this._aiModels.recommendationEngine,
      recommendations,
      currentPlanId: plan?.id || null,
      analysisScore: analysis.overallScore,
    };
    this.recommendations.set(recId, result);
    return result;
  }

  // ═══════════════════════════════════════════════════════════
  // OUTCOME PREDICTION — التنبؤ بالنتائج
  // ═══════════════════════════════════════════════════════════
  predictOutcome(beneficiaryId, goalId) {
    const b = this.getBeneficiary(beneficiaryId);
    const goal = this.getGoal(goalId);
    const assessments = this.listAssessments(beneficiaryId);
    const sessions = this.listSessions(beneficiaryId);

    const trajectory = this._calculateTrajectory(assessments);
    const sessionsPerWeek =
      sessions.length > 0
        ? Math.min(
            sessions.length /
              Math.max(1, this._weeksBetween(sessions[0].date, sessions[sessions.length - 1].date)),
            5
          )
        : 0;

    // Predict goal achievement probability
    const factors = {
      currentProgress: goal.progress,
      trajectoryRate: trajectory.rateOfChange,
      engagement:
        sessions.length > 0
          ? sessions.reduce((s, ses) => s + (ses.outcomes?.engagement || 50), 0) / sessions.length
          : 50,
      sessionFrequency: sessionsPerWeek,
      milestonesAchieved: goal.milestones.filter(m => m.achieved).length,
      totalMilestones: goal.milestones.length,
    };

    const probability = this._computePredictionProbability(factors);

    const prediction = {
      id: `pred-${this._nextPredictionId++}`,
      beneficiaryId,
      goalId,
      beneficiaryName: b.name,
      goalTitle: goal.title,
      predictedAt: new Date().toISOString(),
      model: this._aiModels.outcomePredictor,
      probability: Math.round(probability * 100) / 100,
      estimatedCompletionDate: this._estimateCompletionDate(goal, trajectory.rateOfChange),
      factors,
      confidence: this._aiModels.outcomePredictor.accuracy,
      riskFactors: this._identifyRiskFactors(factors),
      protectiveFactors: this._identifyProtectiveFactors(factors),
    };

    this.predictions.set(prediction.id, prediction);
    return prediction;
  }

  // ═══════════════════════════════════════════════════════════
  // PATTERN DETECTION — اكتشاف الأنماط
  // ═══════════════════════════════════════════════════════════
  detectPatterns(beneficiaryId) {
    const b = this.getBeneficiary(beneficiaryId);
    const sessions = this.listSessions(beneficiaryId);
    const behaviors = [...this.behaviorLogs.values()].filter(
      bl => bl.beneficiaryId === beneficiaryId
    );
    const assessments = this.listAssessments(beneficiaryId);

    const patterns = [];

    // Session engagement patterns
    if (sessions.length >= 2) {
      const engagements = sessions.filter(s => s.outcomes).map(s => s.outcomes.engagement);
      if (engagements.length >= 2) {
        const trend = this._detectTrend(engagements);
        patterns.push({
          type: 'engagement_trend',
          direction: trend,
          description:
            trend === 'increasing'
              ? 'مستوى المشاركة في الجلسات في ارتفاع مستمر'
              : trend === 'decreasing'
                ? 'مستوى المشاركة في الجلسات في انخفاض — يحتاج متابعة'
                : 'مستوى المشاركة مستقر',
          dataPoints: engagements,
          significance:
            Math.abs(engagements[engagements.length - 1] - engagements[0]) > 15
              ? 'significant'
              : 'minor',
        });
      }
    }

    // Behavioral patterns
    if (behaviors.length >= 2) {
      const positiveCount = behaviors.filter(bl => bl.type === 'positive').length;
      const challengingCount = behaviors.filter(bl => bl.type === 'challenging').length;
      patterns.push({
        type: 'behavior_ratio',
        positiveCount,
        challengingCount,
        ratio: positiveCount / Math.max(1, challengingCount),
        description:
          positiveCount > challengingCount
            ? 'غالبية السلوكيات المرصودة إيجابية — مؤشر جيد'
            : 'السلوكيات التحدية أعلى من الإيجابية — يحتاج تدخل',
        significance: Math.abs(positiveCount - challengingCount) > 2 ? 'significant' : 'minor',
      });
    }

    // Assessment score patterns
    if (assessments.length >= 2) {
      const scores = assessments.map(a => ({ date: a.date, score: a.score, scale: a.scale }));
      const latestTwo = scores.slice(-2);
      const change = latestTwo[1].score - latestTwo[0].score;
      patterns.push({
        type: 'assessment_trend',
        direction: change > 0 ? 'improving' : change < 0 ? 'declining' : 'stable',
        change,
        description:
          change > 0
            ? `تحسن في نتائج التقييم بمقدار ${change} نقطة`
            : change < 0
              ? `انخفاض في نتائج التقييم بمقدار ${Math.abs(change)} نقطة`
              : 'نتائج التقييم مستقرة',
        dataPoints: scores,
        significance: Math.abs(change) > 10 ? 'significant' : 'minor',
      });
    }

    // Session frequency pattern
    if (sessions.length >= 3) {
      const gaps = [];
      for (let i = 1; i < sessions.length; i++) {
        gaps.push(this._daysBetween(sessions[i - 1].date, sessions[i].date));
      }
      const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
      patterns.push({
        type: 'session_frequency',
        averageGapDays: Math.round(avgGap * 10) / 10,
        description:
          avgGap <= 4
            ? 'تردد جلسات ممتاز'
            : avgGap <= 7
              ? 'تردد جلسات جيد'
              : 'تردد جلسات يحتاج تحسين',
        significance: avgGap > 10 ? 'significant' : 'minor',
      });
    }

    const patternId = `pat-${this._nextPatternId++}`;
    const result = {
      id: patternId,
      beneficiaryId,
      beneficiaryName: b.name,
      detectedAt: new Date().toISOString(),
      model: this._aiModels.patternDetector,
      patterns,
      totalPatternsFound: patterns.length,
    };
    this.patterns.set(patternId, result);
    return result;
  }

  // ═══════════════════════════════════════════════════════════
  // RISK ASSESSMENT — تقييم المخاطر
  // ═══════════════════════════════════════════════════════════
  assessRisk(beneficiaryId) {
    const b = this.getBeneficiary(beneficiaryId);
    const analysis = this.analyzeProgress(beneficiaryId);
    const goals = this.listGoals(beneficiaryId);
    const sessions = this.listSessions(beneficiaryId);
    const alerts = [...this.alerts.values()].filter(
      a => a.beneficiaryId === beneficiaryId && !a.resolved
    );

    const riskFactors = [];
    let riskScore = 0;

    // Stagnation risk
    const stagnatingGoals = goals.filter(g => g.status === 'in_progress' && g.progress < 30);
    if (stagnatingGoals.length > 0) {
      riskScore += 20;
      riskFactors.push({
        factor: 'goal_stagnation',
        severity: 'high',
        description: `${stagnatingGoals.length} هدف(أهداف) بتقدم أقل من 30%`,
      });
    }

    // Low engagement
    if (analysis.engagementTrend.avgEngagement < 50) {
      riskScore += 25;
      riskFactors.push({
        factor: 'low_engagement',
        severity: 'high',
        description: `متوسط المشاركة ${analysis.engagementTrend.avgEngagement}% — أقل من المطلوب`,
      });
    }

    // No recent sessions
    if (sessions.length > 0) {
      const lastSession = sessions[sessions.length - 1];
      const daysSince = this._daysBetween(lastSession.date, new Date().toISOString().slice(0, 10));
      if (daysSince > 14) {
        riskScore += 15;
        riskFactors.push({
          factor: 'session_gap',
          severity: 'medium',
          description: `آخر جلسة منذ ${daysSince} يوم`,
        });
      }
    }

    // Active alerts
    if (alerts.length > 0) {
      riskScore += alerts.length * 10;
      riskFactors.push({
        factor: 'active_alerts',
        severity: alerts.some(a => a.severity === 'critical') ? 'critical' : 'medium',
        description: `${alerts.length} تنبيه(ات) نشطة`,
      });
    }

    // Behavioral concerns
    if (analysis.behaviorAnalysis.positiveRatio < 40) {
      riskScore += 15;
      riskFactors.push({
        factor: 'behavioral_concerns',
        severity: 'medium',
        description: `نسبة السلوكيات الإيجابية ${analysis.behaviorAnalysis.positiveRatio}% فقط`,
      });
    }

    riskScore = Math.min(100, riskScore);

    const riskId = `risk-${this._nextRiskId++}`;
    const result = {
      id: riskId,
      beneficiaryId,
      beneficiaryName: b.name,
      assessedAt: new Date().toISOString(),
      model: this._aiModels.riskAssessor,
      riskScore,
      riskLevel:
        riskScore >= 70
          ? 'critical'
          : riskScore >= 40
            ? 'high'
            : riskScore >= 20
              ? 'medium'
              : 'low',
      riskFactors,
      mitigationSuggestions: this._generateMitigations(riskFactors),
      activeAlerts: alerts,
    };
    this.riskAssessments.set(riskId, result);
    return result;
  }

  // ═══════════════════════════════════════════════════════════
  // TREATMENT PLAN OPTIMIZATION — تحسين الخطة العلاجية
  // ═══════════════════════════════════════════════════════════
  optimizeTreatmentPlan(planId) {
    const plan = this.getTreatmentPlan(planId);
    const b = this.getBeneficiary(plan.beneficiaryId);
    const analysis = this.analyzeProgress(plan.beneficiaryId);
    const sessions = this.listSessions(plan.beneficiaryId);

    const optimizations = [];

    // Check if therapy types are effective
    const therapyEffectiveness = {};
    sessions.forEach(s => {
      if (!therapyEffectiveness[s.therapyType]) {
        therapyEffectiveness[s.therapyType] = { total: 0, totalEngagement: 0, count: 0 };
      }
      const te = therapyEffectiveness[s.therapyType];
      te.count++;
      te.totalEngagement += s.outcomes?.engagement || 0;
    });

    Object.entries(therapyEffectiveness).forEach(([type, data]) => {
      const avg = data.count > 0 ? Math.round(data.totalEngagement / data.count) : 0;
      if (avg < 50 && data.count >= 2) {
        optimizations.push({
          type: 'reduce_or_modify',
          therapy: type,
          currentEffectiveness: avg,
          suggestion: `جلسات ${type} بمشاركة منخفضة (${avg}%) — يُقترح تعديل النهج أو تقليل التكرار`,
        });
      } else if (avg >= 80) {
        optimizations.push({
          type: 'increase',
          therapy: type,
          currentEffectiveness: avg,
          suggestion: `جلسات ${type} فعّالة جداً (${avg}%) — يُقترح زيادة التكرار`,
        });
      }
    });

    // Suggest new therapies based on gaps
    const currentTherapies = plan.therapies.map(t => t.type);
    const suggestedNew = this._suggestNewTherapies(b.disabilityType, currentTherapies);
    suggestedNew.forEach(therapy => {
      optimizations.push({
        type: 'add_new',
        therapy,
        suggestion: `إضافة ${therapy} بناءً على نوع الإعاقة واحتياجات المستفيد`,
      });
    });

    // Update plan with optimization
    plan.aiOptimization = {
      lastOptimized: new Date().toISOString().slice(0, 10),
      suggestions: optimizations.map(o => o.suggestion),
      confidence: this._aiModels.recommendationEngine.accuracy,
      details: optimizations,
    };
    this.treatmentPlans.set(planId, plan);

    return {
      planId,
      beneficiaryName: b.name,
      optimizedAt: new Date().toISOString(),
      model: this._aiModels.recommendationEngine,
      optimizations,
      therapyEffectiveness,
      analysisScore: analysis.overallScore,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // BEHAVIOR LOGS — سجل السلوكيات
  // ═══════════════════════════════════════════════════════════
  listBehaviorLogs(beneficiaryId, { type } = {}) {
    let items = [...this.behaviorLogs.values()].filter(bl => bl.beneficiaryId === beneficiaryId);
    if (type) items = items.filter(bl => bl.type === type);
    return items.sort((a, b) => a.date.localeCompare(b.date));
  }

  createBehaviorLog(data) {
    this.getBeneficiary(data.beneficiaryId);
    const id = `beh-${this._nextBehaviorLogId++}`;
    const entry = {
      id,
      beneficiaryId: data.beneficiaryId,
      date: data.date || new Date().toISOString().slice(0, 10),
      type: data.type,
      behavior: data.behavior,
      context: data.context || '',
      intensity: data.intensity || 'moderate',
      duration: data.duration || 0,
      observer: data.observer,
      intervention: data.intervention || null,
      createdAt: new Date().toISOString(),
    };
    this.behaviorLogs.set(id, entry);
    return entry;
  }

  // ═══════════════════════════════════════════════════════════
  // ALERTS — التنبيهات
  // ═══════════════════════════════════════════════════════════
  listAlerts({ beneficiaryId, resolved, severity } = {}) {
    let items = [...this.alerts.values()];
    if (beneficiaryId) items = items.filter(a => a.beneficiaryId === beneficiaryId);
    if (resolved !== undefined) items = items.filter(a => a.resolved === resolved);
    if (severity) items = items.filter(a => a.severity === severity);
    return items.sort((a, b) => b.createdDate.localeCompare(a.createdDate));
  }

  resolveAlert(id) {
    const a = this.alerts.get(id);
    if (!a) throw Object.assign(new Error('التنبيه غير موجود'), { statusCode: 404 });
    a.resolved = true;
    a.resolvedDate = new Date().toISOString();
    this.alerts.set(id, a);
    return a;
  }

  // ═══════════════════════════════════════════════════════════
  // AI REPORTS — تقارير الذكاء الاصطناعي
  // ═══════════════════════════════════════════════════════════
  generateAIReport(beneficiaryId) {
    const b = this.getBeneficiary(beneficiaryId);
    const analysis = this.analyzeProgress(beneficiaryId);
    const recommendations = this.generateRecommendations(beneficiaryId);
    const patterns = this.detectPatterns(beneficiaryId);
    const risk = this.assessRisk(beneficiaryId);
    const goals = this.listGoals(beneficiaryId);
    const assessments = this.listAssessments(beneficiaryId);

    const reportId = `rpt-${this._nextReportId++}`;
    const report = {
      id: reportId,
      beneficiaryId,
      beneficiaryName: b.name,
      disabilityType: b.disabilityType,
      generatedAt: new Date().toISOString(),
      summary: {
        overallScore: analysis.overallScore,
        riskLevel: risk.riskLevel,
        totalGoals: goals.length,
        achievedGoals: goals.filter(g => g.status === 'achieved').length,
        avgProgress: analysis.goalStats.avgProgress,
        totalAssessments: assessments.length,
        totalSessions: analysis.engagementTrend.totalSessions,
      },
      progressAnalysis: analysis,
      recommendations: recommendations.recommendations,
      detectedPatterns: patterns.patterns,
      riskAssessment: risk,
      conclusion: this._generateConclusion(analysis, risk, goals),
      nextSteps: this._generateNextSteps(recommendations.recommendations, risk),
    };

    this.aiReports.set(reportId, report);
    return report;
  }

  // ═══════════════════════════════════════════════════════════
  // CLINICAL SCALES — المقاييس السريرية
  // ═══════════════════════════════════════════════════════════
  getClinicalScales() {
    return this._clinicalScales;
  }

  getDisabilityTypes() {
    return this._disabilityTypes;
  }

  getTherapyTypes() {
    return this._therapyTypes;
  }

  getAIModels() {
    return this._aiModels;
  }

  // ═══════════════════════════════════════════════════════════
  // COMPARE — مقارنة التقييمات
  // ═══════════════════════════════════════════════════════════
  compareAssessments(beneficiaryId, assessmentId1, assessmentId2) {
    const a1 = this.getAssessment(assessmentId1);
    const a2 = this.getAssessment(assessmentId2);
    if (a1.beneficiaryId !== beneficiaryId || a2.beneficiaryId !== beneficiaryId) {
      throw Object.assign(new Error('التقييمات لا تنتمي لنفس المستفيد'), { statusCode: 400 });
    }

    const scoreDiff = a2.score - a1.score;
    const percentChange = a1.score > 0 ? Math.round((scoreDiff / a1.score) * 100) : 0;

    return {
      beneficiaryId,
      assessment1: a1,
      assessment2: a2,
      scoreDifference: scoreDiff,
      percentChange,
      direction: scoreDiff > 0 ? 'improved' : scoreDiff < 0 ? 'declined' : 'stable',
      subScoreComparison: this._compareSubScores(a1.details?.subScores, a2.details?.subScores),
      timeBetween: `${this._daysBetween(a1.date, a2.date)} يوم`,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // INTERNAL AI HELPERS
  // ═══════════════════════════════════════════════════════════
  _calculateTrajectory(assessments) {
    if (assessments.length < 2) {
      return { direction: 'insufficient_data', rateOfChange: 0, dataPoints: assessments.length };
    }
    const first = assessments[0];
    const last = assessments[assessments.length - 1];
    const change = last.score - first.score;
    const days = Math.max(1, this._daysBetween(first.date, last.date));
    const ratePerMonth = (change / days) * 30;

    return {
      direction: change > 0 ? 'improving' : change < 0 ? 'declining' : 'stable',
      totalChange: change,
      rateOfChange: Math.round(ratePerMonth * 100) / 100,
      ratePerMonth: Math.round(ratePerMonth * 100) / 100,
      startScore: first.score,
      endScore: last.score,
      daysObserved: days,
      dataPoints: assessments.length,
    };
  }

  _calculateEngagementTrend(sessions) {
    const completed = sessions.filter(s => s.outcomes);
    if (completed.length === 0) {
      return { direction: 'no_data', avgEngagement: 0, totalSessions: sessions.length };
    }
    const engagements = completed.map(s => s.outcomes.engagement);
    const avg = Math.round(engagements.reduce((s, e) => s + e, 0) / engagements.length);
    const first = engagements[0];
    const last = engagements[engagements.length - 1];

    return {
      direction: last > first + 5 ? 'improving' : last < first - 5 ? 'declining' : 'stable',
      avgEngagement: avg,
      start: first,
      end: last,
      totalSessions: sessions.length,
      completedSessions: completed.length,
    };
  }

  _computeAIScore(trajectory, engagement, goalStats, behavior) {
    let score = 50; // baseline
    // Trajectory weight: 30%
    if (trajectory.direction === 'improving') score += Math.min(30, trajectory.rateOfChange * 3);
    else if (trajectory.direction === 'declining') score -= 15;
    // Engagement weight: 25%
    score += ((engagement.avgEngagement || 50) - 50) * 0.5;
    // Goal progress weight: 25%
    score += (goalStats.avgProgress - 50) * 0.5;
    // Behavior weight: 20%
    score += ((behavior.positiveRatio || 50) - 50) * 0.4;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  _identifyStrengths(assessments, sessions, goals) {
    const strengths = [];
    const highProgressGoals = goals.filter(g => g.progress >= 70);
    if (highProgressGoals.length > 0) strengths.push(...highProgressGoals.map(g => g.category));
    const highEngagement = sessions.filter(s => s.outcomes?.engagement >= 80);
    if (highEngagement.length > 0) strengths.push('engagement');
    return [...new Set(strengths)];
  }

  _identifyWeaknesses(assessments, sessions, goals) {
    const weaknesses = [];
    const lowProgressGoals = goals.filter(g => g.progress < 40 && g.status === 'in_progress');
    if (lowProgressGoals.length > 0) weaknesses.push(...lowProgressGoals.map(g => g.category));
    const lowEngagement = sessions.filter(s => s.outcomes?.engagement < 50);
    if (lowEngagement.length > sessions.length * 0.5 && sessions.length > 0)
      weaknesses.push('engagement');
    return [...new Set(weaknesses)];
  }

  _computePredictionProbability(factors) {
    // weighted probability
    let prob = 0;
    prob += (factors.currentProgress / 100) * 0.35;
    prob += Math.max(0, Math.min(1, factors.trajectoryRate / 10)) * 0.25;
    prob += (factors.engagement / 100) * 0.2;
    prob += Math.min(1, factors.sessionFrequency / 3) * 0.1;
    prob +=
      (factors.totalMilestones > 0 ? factors.milestonesAchieved / factors.totalMilestones : 0.5) *
      0.1;
    return Math.max(0, Math.min(1, prob));
  }

  _estimateCompletionDate(goal, rateOfChange) {
    if (goal.progress >= 100) return goal.achievedDate || new Date().toISOString().slice(0, 10);
    if (rateOfChange <= 0) return 'غير محدد — بحاجة لتسريع التقدم';
    const remaining = 100 - goal.progress;
    const monthsNeeded = remaining / Math.max(0.1, rateOfChange);
    const estDate = new Date();
    estDate.setMonth(estDate.getMonth() + Math.ceil(monthsNeeded));
    return estDate.toISOString().slice(0, 10);
  }

  _identifyRiskFactors(factors) {
    const risks = [];
    if (factors.currentProgress < 30) risks.push('تقدم منخفض في الهدف الحالي');
    if (factors.engagement < 50) risks.push('مشاركة منخفضة في الجلسات');
    if (factors.sessionFrequency < 1) risks.push('تكرار جلسات منخفض');
    return risks;
  }

  _identifyProtectiveFactors(factors) {
    const protective = [];
    if (factors.engagement >= 70) protective.push('مشاركة عالية في الجلسات');
    if (factors.sessionFrequency >= 2) protective.push('تكرار جلسات جيد');
    if (factors.milestonesAchieved > 0) protective.push('تحقيق معالم بارزة');
    return protective;
  }

  _generateMitigations(riskFactors) {
    const mitigations = [];
    riskFactors.forEach(rf => {
      switch (rf.factor) {
        case 'goal_stagnation':
          mitigations.push('مراجعة الأهداف وتقسيمها لأهداف فرعية أصغر');
          break;
        case 'low_engagement':
          mitigations.push('تعديل أساليب العلاج وإضافة أنشطة تحفيزية');
          break;
        case 'session_gap':
          mitigations.push('جدولة جلسات منتظمة والتواصل مع الأسرة');
          break;
        case 'active_alerts':
          mitigations.push('مراجعة التنبيهات النشطة واتخاذ إجراء فوري');
          break;
        case 'behavioral_concerns':
          mitigations.push('تعزيز خطة الدعم السلوكي وتدريب الفريق');
          break;
        default:
          mitigations.push('متابعة مستمرة وتقييم دوري');
      }
    });
    return mitigations;
  }

  _suggestNewTherapies(disabilityType, currentTherapies) {
    const suggestions = {
      autism: [
        'behavioral',
        'speech_therapy',
        'social_skills',
        'sensory_integration',
        'play_therapy',
      ],
      intellectual: ['cognitive', 'social_skills', 'vocational', 'speech_therapy'],
      physical: ['physiotherapy', 'occupational', 'vocational'],
      speech: ['speech_therapy', 'play_therapy', 'art_therapy'],
      hearing: ['speech_therapy', 'social_skills'],
      visual: ['occupational', 'social_skills'],
      learning: ['cognitive', 'behavioral', 'art_therapy'],
      multiple: ['physiotherapy', 'occupational', 'speech_therapy', 'cognitive', 'social_skills'],
      psychiatric: ['psychotherapy', 'cognitive', 'art_therapy', 'music_therapy'],
      neurological: ['physiotherapy', 'occupational', 'cognitive', 'speech_therapy'],
    };
    const recommended = suggestions[disabilityType] || [];
    return recommended.filter(t => !currentTherapies.includes(t)).slice(0, 2);
  }

  _generateConclusion(analysis, _risk, _goals) {
    const score = analysis.overallScore;
    if (score >= 70)
      return 'تقدم ممتاز — المستفيد يحرز تحسناً ملحوظاً في معظم المجالات. يُوصى بالاستمرار ورفع مستوى الأهداف.';
    if (score >= 50)
      return 'تقدم جيد — المستفيد يتحسن بشكل مستقر. يحتاج لمتابعة بعض المجالات المتأخرة.';
    if (score >= 30)
      return 'تقدم محدود — يحتاج المستفيد لمراجعة شاملة للخطة العلاجية وتعديل الأساليب.';
    return 'تقدم ضعيف — يُوصى بإعادة تقييم شاملة وتعديل جذري في الخطة العلاجية.';
  }

  _generateNextSteps(recommendations, risk) {
    const steps = [];
    const highPriority = recommendations.filter(r => r.priority === 'high');
    if (highPriority.length > 0) {
      steps.push(...highPriority.map(r => r.title));
    }
    if (risk.riskLevel === 'critical' || risk.riskLevel === 'high') {
      steps.push('اجتماع فريق عاجل لمراجعة الحالة');
    }
    steps.push('جدولة تقييم متابعة خلال 30 يوم');
    return steps;
  }

  _generateSessionAIAnalysis(session) {
    const engagement = session.outcomes?.engagement || 50;
    const rating = session.outcomes?.progressRating || 3;
    const sentimentScore = (engagement / 100) * 0.6 + (rating / 5) * 0.4;
    return {
      sentimentScore: Math.round(sentimentScore * 100) / 100,
      engagementLevel: engagement >= 75 ? 'high' : engagement >= 50 ? 'medium' : 'low',
      suggestedFollowUp:
        engagement >= 75
          ? 'الاستمرار في نفس النهج مع رفع التحدي تدريجياً'
          : engagement >= 50
            ? 'مراجعة أنشطة الجلسة وتنويع الأساليب'
            : 'تغيير النهج العلاجي واستخدام أنشطة أكثر تحفيزاً',
    };
  }

  _checkForAlerts(assessment) {
    // Check for declining scores
    const prevAssessments = [...this.assessments.values()]
      .filter(
        a =>
          a.beneficiaryId === assessment.beneficiaryId &&
          a.id !== assessment.id &&
          a.scale === assessment.scale
      )
      .sort((a, b) => a.date.localeCompare(b.date));

    if (prevAssessments.length > 0) {
      const lastScore = prevAssessments[prevAssessments.length - 1].score;
      if (assessment.score < lastScore - 10) {
        const alertId = `alert-${this._nextAlertId++}`;
        this.alerts.set(alertId, {
          id: alertId,
          beneficiaryId: assessment.beneficiaryId,
          type: 'score_decline',
          severity: 'warning',
          message: `انخفاض في نتيجة ${assessment.scale}: من ${lastScore} إلى ${assessment.score}`,
          createdDate: new Date().toISOString().slice(0, 10),
          resolved: false,
        });
      }
    }
  }

  _detectTrend(values) {
    if (values.length < 2) return 'stable';
    const first = values[0];
    const last = values[values.length - 1];
    const diff = last - first;
    if (diff > 5) return 'increasing';
    if (diff < -5) return 'decreasing';
    return 'stable';
  }

  _compareSubScores(sub1, sub2) {
    if (!sub1 || !sub2) return null;
    const comparison = {};
    Object.keys(sub2).forEach(key => {
      const v1 = sub1[key] || 0;
      const v2 = sub2[key] || 0;
      comparison[key] = {
        before: v1,
        after: v2,
        change: v2 - v1,
        direction: v2 > v1 ? 'improved' : v2 < v1 ? 'declined' : 'stable',
      };
    });
    return comparison;
  }

  _calcAge(dob) {
    if (!dob) return 0;
    const d = new Date(dob);
    const diff = Date.now() - d.getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  }

  _daysBetween(d1, d2) {
    const a = new Date(d1);
    const b = new Date(d2);
    return Math.round(Math.abs(b - a) / (1000 * 60 * 60 * 24));
  }

  _weeksBetween(d1, d2) {
    return Math.max(1, Math.round(this._daysBetween(d1, d2) / 7));
  }
}

module.exports = new AIDiagnosticService();
