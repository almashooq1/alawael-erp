/**
 * DDD Domains — Comprehensive Seed Data
 * بذور بيانات شاملة لجميع 20 مجال DDD
 *
 * Pattern: exports seed(connection), down(connection)
 * Called by: scripts/seed-all.js registry OR standalone
 *
 * Seeds realistic Arabic data for:
 * 1.  core (Beneficiary)
 * 2.  episodes (EpisodeOfCare)
 * 3.  timeline (CareTimeline)
 * 4.  assessments (ClinicalAssessment)
 * 5.  care-plans (UnifiedCarePlan)
 * 6.  sessions (ClinicalSession)
 * 7.  goals (TherapeuticGoal, Measure, MeasureApplication)
 * 8.  workflow (WorkflowTask, WorkflowTransitionLog)
 * 9.  programs (Program, ProgramEnrollment)
 * 10. ai-recommendations (Recommendation, ClinicalRiskScore)
 * 11. quality (QualityAudit, CorrectiveAction)
 * 12. family (FamilyMember, FamilyCommunication)
 * 13. reports (ReportTemplate, GeneratedReport)
 * 14. group-therapy (TherapyGroup, GroupSession)
 * 15. tele-rehab (TeleSession)
 * 16. ar-vr (ARVRSession)
 * 17. behavior (BehaviorRecord, BehaviorPlan)
 * 18. research (ResearchStudy)
 * 19. field-training (TrainingProgram, TraineeRecord)
 * 20. dashboards (DashboardConfig, KPIDefinition, KPISnapshot, DecisionAlert)
 */

'use strict';

const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

/* ── Helper IDs ── */
const ids = {
  beneficiaries: Array.from({ length: 10 }, () => new ObjectId()),
  therapists: Array.from({ length: 5 }, () => new ObjectId()),
  episodes: Array.from({ length: 10 }, () => new ObjectId()),
  sessions: Array.from({ length: 20 }, () => new ObjectId()),
  assessments: Array.from({ length: 10 }, () => new ObjectId()),
  carePlans: Array.from({ length: 5 }, () => new ObjectId()),
  goals: Array.from({ length: 10 }, () => new ObjectId()),
  groups: Array.from({ length: 3 }, () => new ObjectId()),
  programs: Array.from({ length: 3 }, () => new ObjectId()),
  studies: Array.from({ length: 2 }, () => new ObjectId()),
  trainingPrograms: Array.from({ length: 2 }, () => new ObjectId()),
  kpis: Array.from({ length: 15 }, () => new ObjectId()),
};

/* ── Arabic names ── */
const firstNames = ['أحمد', 'محمد', 'عبدالله', 'فهد', 'سعود', 'نورة', 'سارة', 'هند', 'ريم', 'لمى'];
const lastNames = [
  'العتيبي',
  'القحطاني',
  'الشمري',
  'الحربي',
  'الدوسري',
  'المطيري',
  'الغامدي',
  'الزهراني',
  'السبيعي',
  'العنزي',
];
const therapistNames = [
  'د. خالد المالكي',
  'أ. منى الراشد',
  'أ. عمر السعيد',
  'د. فاطمة الأحمد',
  'أ. ياسر الحسن',
];
const branches = ['الرياض', 'جدة', 'الدمام'];
const disabilityTypes = [
  'physical',
  'intellectual',
  'visual',
  'hearing',
  'speech',
  'autism',
  'multiple',
];
const phases = [
  'referral',
  'screening',
  'intake',
  'initial_assessment',
  'planning',
  'active_treatment',
  'review',
  'transition',
  'discharge_planning',
  'discharged',
  'follow_up',
  'closed',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function daysAgo(n) {
  return new Date(Date.now() - n * 86400000);
}

/* ══════════════════════════════════════════════════════════════
 *  SEED FUNCTION
 * ══════════════════════════════════════════════════════════════ */
async function seed(connection) {
  const db = connection || mongoose.connection;
  console.log('🌱 [DDD-Seed] Starting comprehensive seed for 20 DDD domains...');

  /* ── 1. Beneficiaries (core) ── */
  const beneficiaries = ids.beneficiaries.map((id, i) => ({
    _id: id,
    fileNumber: `BEN-${String(1001 + i).padStart(6, '0')}`,
    name: {
      first: firstNames[i],
      last: lastNames[i],
      full: `${firstNames[i]} ${lastNames[i]}`,
    },
    fullName: `${firstNames[i]} ${lastNames[i]}`,
    dateOfBirth: new Date(2010 - randInt(0, 30), randInt(0, 11), randInt(1, 28)),
    gender: i < 5 ? 'male' : 'female',
    nationalId: `1${String(100000000 + i * 11111111).slice(0, 9)}`,
    phone: `05${randInt(10000000, 99999999)}`,
    primaryDiagnosis: pick([
      'شلل دماغي',
      'توحد',
      'صعوبات تعلم',
      'تأخر نمائي',
      'إعاقة سمعية',
      'إعاقة بصرية',
    ]),
    disabilityType: disabilityTypes[i % disabilityTypes.length],
    disabilitySeverity: pick(['mild', 'moderate', 'severe', 'profound']),
    branch: branches[i % 3],
    status: i < 8 ? 'active' : pick(['inactive', 'discharged']),
    address: { city: branches[i % 3], country: 'SA' },
    emergencyContact: {
      name: `ولي أمر ${firstNames[i]}`,
      phone: `05${randInt(10000000, 99999999)}`,
      relationship: 'parent',
    },
    createdAt: daysAgo(365 + randInt(0, 200)),
    updatedAt: daysAgo(randInt(0, 30)),
  }));
  await db.collection('beneficiaries').insertMany(beneficiaries);
  console.log(`  ✅ core: ${beneficiaries.length} beneficiaries`);

  /* ── 2. Episodes of Care ── */
  const episodes = ids.episodes.map((id, i) => ({
    _id: id,
    beneficiaryId: ids.beneficiaries[i],
    beneficiary: ids.beneficiaries[i],
    beneficiaryName: beneficiaries[i].fullName,
    type: pick(['comprehensive', 'specialized', 'intensive', 'maintenance']),
    currentPhase: phases[randInt(0, i < 5 ? 5 : 11)],
    status: i < 7 ? 'active' : pick(['completed', 'on_hold']),
    startDate: daysAgo(300 - i * 20),
    endDate: i >= 8 ? daysAgo(randInt(1, 30)) : null,
    primaryTherapist: { _id: ids.therapists[i % 5], name: therapistNames[i % 5] },
    leadTherapist: therapistNames[i % 5],
    progressPercent: randInt(10, i < 5 ? 60 : 100),
    phaseHistory: [
      { phase: 'referral', enteredAt: daysAgo(300 - i * 20), exitedAt: daysAgo(295 - i * 20) },
      { phase: 'screening', enteredAt: daysAgo(295 - i * 20), exitedAt: daysAgo(288 - i * 20) },
    ],
    notes: `حلقة رعاية ${pick(['شاملة', 'متخصصة', 'مكثفة'])} للمستفيد ${beneficiaries[i].fullName}`,
    createdAt: daysAgo(300 - i * 20),
    updatedAt: daysAgo(randInt(0, 10)),
  }));
  await db.collection('episodesofcares').insertMany(episodes);
  console.log(`  ✅ episodes: ${episodes.length} episodes`);

  /* ── 3. Timeline events ── */
  const timelineEvents = [];
  for (let i = 0; i < 50; i++) {
    const bIdx = i % 10;
    timelineEvents.push({
      _id: new ObjectId(),
      beneficiaryId: ids.beneficiaries[bIdx],
      episodeId: ids.episodes[bIdx],
      eventType: pick([
        'phase_transition',
        'assessment_completed',
        'session_completed',
        'goal_achieved',
        'plan_updated',
        'note_added',
        'alert_raised',
        'family_contact',
      ]),
      domain: pick(['episodes', 'assessments', 'sessions', 'goals', 'care-plans', 'family']),
      description: pick([
        'انتقال إلى مرحلة العلاج النشط',
        'اكتمال تقييم فاينلاند',
        'جلسة علاج طبيعي مكتملة',
        'تحقيق هدف المهارات الحركية الدقيقة',
        'تحديث خطة الرعاية',
        'تواصل مع ولي الأمر',
      ]),
      summary: `حدث ${i + 1} في ملف المستفيد`,
      actor: { _id: ids.therapists[i % 5], name: therapistNames[i % 5], role: 'therapist' },
      timestamp: daysAgo(randInt(0, 200)),
      metadata: { source: 'system', importance: pick(['low', 'medium', 'high']) },
      createdAt: daysAgo(randInt(0, 200)),
    });
  }
  await db.collection('caretimelines').insertMany(timelineEvents);
  console.log(`  ✅ timeline: ${timelineEvents.length} events`);

  /* ── 4. Clinical Assessments ── */
  const assessmentTypes = [
    { type: 'functional', instrument: 'WeeFIM', maxScore: 126 },
    { type: 'developmental', instrument: 'Vineland-3', maxScore: 100 },
    { type: 'behavioral', instrument: 'CBCL', maxScore: 240 },
    { type: 'cognitive', instrument: 'WISC-V', maxScore: 160 },
    { type: 'speech', instrument: 'CELF-5', maxScore: 120 },
  ];
  const assessments = ids.assessments.map((id, i) => {
    const at = assessmentTypes[i % assessmentTypes.length];
    const score = randInt(Math.floor(at.maxScore * 0.2), at.maxScore);
    return {
      _id: id,
      beneficiaryId: ids.beneficiaries[i],
      episodeId: ids.episodes[i],
      type: at.type,
      assessmentType: at.type,
      instrument: at.instrument,
      tool: at.instrument,
      totalScore: score,
      score,
      maxScore: at.maxScore,
      percentile: Math.round((score / at.maxScore) * 100),
      date: daysAgo(randInt(10, 150)),
      assessor: { _id: ids.therapists[i % 5], name: therapistNames[i % 5] },
      status: pick(['completed', 'completed', 'completed', 'draft']),
      sections: [
        { name: 'القسم الأول', score: randInt(10, 40), maxScore: 50 },
        { name: 'القسم الثاني', score: randInt(10, 40), maxScore: 50 },
      ],
      interpretation: pick([
        'ضمن المعدل الطبيعي',
        'أقل من المعدل',
        'يحتاج تدخل فوري',
        'تحسن ملحوظ',
      ]),
      recommendations: [
        pick(['زيادة جلسات العلاج', 'إعادة التقييم بعد 3 أشهر', 'تحويل لتخصص آخر']),
      ],
      createdAt: daysAgo(randInt(10, 150)),
    };
  });
  await db.collection('clinicalassessments').insertMany(assessments);
  console.log(`  ✅ assessments: ${assessments.length} assessments`);

  /* ── 5. Unified Care Plans ── */
  const carePlans = ids.carePlans.map((id, i) => ({
    _id: id,
    beneficiaryId: ids.beneficiaries[i],
    episodeId: ids.episodes[i],
    title: `خطة رعاية ${pick(['شاملة', 'تأهيلية', 'علاجية'])} — ${beneficiaries[i].fullName}`,
    description: `خطة رعاية متكاملة تشمل العلاج الطبيعي والوظيفي والنطقي`,
    status: pick(['active', 'active', 'active', 'draft', 'completed']),
    startDate: daysAgo(randInt(60, 200)),
    reviewDate: daysAgo(-randInt(10, 60)),
    endDate: null,
    author: { _id: ids.therapists[i % 5], name: therapistNames[i % 5] },
    objectives: [
      {
        domain: 'حركي',
        description: 'تحسين المهارات الحركية الكبرى',
        priority: 'high',
        status: 'in_progress',
      },
      {
        domain: 'تواصلي',
        description: 'تطوير مهارات التواصل اللفظي',
        priority: 'high',
        status: 'in_progress',
      },
      {
        domain: 'معرفي',
        description: 'تعزيز المهارات المعرفية',
        priority: 'medium',
        status: 'not_started',
      },
    ],
    team: ids.therapists
      .slice(0, 3)
      .map((tid, ti) => ({ _id: tid, name: therapistNames[ti], role: pick(['lead', 'member']) })),
    notes: 'خطة معتمدة من الفريق متعدد التخصصات',
    createdAt: daysAgo(randInt(60, 200)),
    updatedAt: daysAgo(randInt(0, 20)),
  }));
  await db.collection('unifiedcareplans').insertMany(carePlans);
  console.log(`  ✅ care-plans: ${carePlans.length} plans`);

  /* ── 6. Clinical Sessions ── */
  const sessionTypes = ['individual', 'group', 'assessment', 'telerehab', 'family', 'consultation'];
  const clinicalSessions = ids.sessions.map((id, i) => {
    const bIdx = i % 10;
    const scheduled = daysAgo(randInt(-30, 180));
    return {
      _id: id,
      beneficiaryId: ids.beneficiaries[bIdx],
      beneficiary: { _id: ids.beneficiaries[bIdx], name: { full: beneficiaries[bIdx].fullName } },
      beneficiaryName: beneficiaries[bIdx].fullName,
      episodeId: ids.episodes[bIdx],
      sessionType: sessionTypes[i % sessionTypes.length],
      type: sessionTypes[i % sessionTypes.length],
      scheduledDate: scheduled,
      date: scheduled,
      duration: pick([30, 45, 60, 90]),
      therapist: { _id: ids.therapists[i % 5], name: therapistNames[i % 5] },
      status: i < 14 ? 'completed' : pick(['scheduled', 'in_progress', 'cancelled', 'no_show']),
      location: pick([
        'غرفة العلاج 1',
        'غرفة العلاج 2',
        'صالة التأهيل',
        'عيادة النطق',
        'عبر الإنترنت',
      ]),
      objectives: [
        {
          description: pick(['تحسين التوازن', 'تقوية العضلات', 'تطوير النطق', 'تدريب المهارات']),
          achieved: i < 12,
        },
      ],
      notes: `جلسة ${sessionTypes[i % sessionTypes.length]} مع ${beneficiaries[bIdx].fullName}`,
      attendance: i < 16 ? 'present' : pick(['absent', 'late']),
      createdAt: scheduled,
      updatedAt: daysAgo(randInt(0, 5)),
    };
  });
  await db.collection('clinicalsessions').insertMany(clinicalSessions);
  console.log(`  ✅ sessions: ${clinicalSessions.length} sessions`);

  /* ── 7. Goals & Measures ── */
  const goalDomains = [
    'حركي',
    'تواصلي',
    'معرفي',
    'اجتماعي',
    'سلوكي',
    'استقلالية',
    'أكاديمي',
    'مهني',
    'نفسي',
    'حسي',
  ];
  const therapeuticGoals = ids.goals.map((id, i) => ({
    _id: id,
    beneficiaryId: ids.beneficiaries[i],
    episodeId: ids.episodes[i],
    title: `هدف ${goalDomains[i]} — ${beneficiaries[i].fullName}`,
    description: `تحسين مهارات المجال ${goalDomains[i]} إلى المستوى المستهدف`,
    domain: goalDomains[i],
    targetLevel: pick(['independent', 'minimal_assist', 'moderate_assist']),
    baselineLevel: pick(['dependent', 'maximal_assist', 'moderate_assist']),
    status: pick(['in_progress', 'in_progress', 'achieved', 'not_started']),
    progressPercent: randInt(0, 100),
    startDate: daysAgo(randInt(30, 200)),
    targetDate: daysAgo(-randInt(30, 120)),
    progressHistory: Array.from({ length: randInt(2, 6) }, (_, pi) => ({
      date: daysAgo(randInt(0, 100)),
      value: randInt(10 + pi * 10, 30 + pi * 15),
      note: `تسجيل تقدم ${pi + 1}`,
      recordedBy: ids.therapists[0],
    })),
    createdAt: daysAgo(randInt(30, 200)),
  }));
  await db.collection('therapeuticgoals').insertMany(therapeuticGoals);
  console.log(`  ✅ goals: ${therapeuticGoals.length} goals`);

  /* ── 8. Workflow Tasks ── */
  const taskTypes = [
    'assessment_review',
    'plan_approval',
    'session_scheduling',
    'report_generation',
    'family_contact',
    'discharge_review',
  ];
  const workflowTasks = Array.from({ length: 15 }, (_, i) => ({
    _id: new ObjectId(),
    beneficiaryId: ids.beneficiaries[i % 10],
    episodeId: ids.episodes[i % 10],
    taskType: taskTypes[i % taskTypes.length],
    title: `${pick(['مراجعة', 'اعتماد', 'جدولة', 'إعداد', 'متابعة'])} — ${beneficiaries[i % 10].fullName}`,
    description: `مهمة ${taskTypes[i % taskTypes.length]} للمستفيد`,
    status: pick(['pending', 'in_progress', 'in_progress', 'review', 'completed', 'blocked']),
    priority: pick(['critical', 'high', 'medium', 'low']),
    assignedTo: { _id: ids.therapists[i % 5], name: therapistNames[i % 5] },
    dueDate: daysAgo(-randInt(-10, 30)),
    createdAt: daysAgo(randInt(5, 60)),
    updatedAt: daysAgo(randInt(0, 5)),
  }));
  await db.collection('workflowtasks').insertMany(workflowTasks);
  console.log(`  ✅ workflow: ${workflowTasks.length} tasks`);

  /* ── 9. Programs ── */
  const programData = [
    { name: 'برنامج التأهيل الحركي المكثف', type: 'intensive', capacity: 20, duration: '12 أسبوع' },
    {
      name: 'برنامج تطوير مهارات التواصل',
      type: 'specialized',
      capacity: 15,
      duration: '16 أسبوع',
    },
    { name: 'برنامج الدمج المجتمعي', type: 'community', capacity: 25, duration: '24 أسبوع' },
  ];
  const programs = ids.programs.map((id, i) => ({
    _id: id,
    name: programData[i].name,
    title: programData[i].name,
    type: programData[i].type,
    description: `${programData[i].name} — مدة ${programData[i].duration}`,
    capacity: programData[i].capacity,
    currentEnrollment: randInt(5, programData[i].capacity),
    enrolledCount: randInt(5, programData[i].capacity),
    status: 'active',
    startDate: daysAgo(randInt(30, 120)),
    endDate: daysAgo(-randInt(30, 90)),
    coordinator: { _id: ids.therapists[i], name: therapistNames[i] },
    createdAt: daysAgo(randInt(30, 120)),
  }));
  await db.collection('programs').insertMany(programs);
  console.log(`  ✅ programs: ${programs.length} programs`);

  /* ── 10. AI Recommendations ── */
  const recommendations = Array.from({ length: 12 }, (_, i) => ({
    _id: new ObjectId(),
    beneficiaryId: ids.beneficiaries[i % 10],
    type: pick(['clinical', 'scheduling', 'risk_alert', 'goal_adjustment', 'program_suggestion']),
    ruleId: pick([
      'missed_sessions',
      'plateau_detection',
      'risk_escalation',
      'goal_alignment',
      'family_engagement',
    ]),
    title: pick([
      'توصية بزيادة تكرار الجلسات',
      'كشف ثبات في التقدم',
      'تنبيه مخاطر سريرية',
      'اقتراح تعديل الأهداف',
      'توصية بإشراك الأسرة',
    ]),
    text: 'بناءً على تحليل بيانات المستفيد، يُوصى باتخاذ إجراء مناسب',
    description: 'توصية مولّدة من محرك التوصيات الذكي',
    priority: pick(['high', 'medium', 'low']),
    status: pick(['pending', 'accepted', 'dismissed']),
    confidence: randInt(65, 98) / 100,
    rationale: 'تحليل أنماط البيانات يشير إلى حاجة للتدخل',
    explanation: 'استناداً إلى 3 أشهر من البيانات السريرية',
    createdAt: daysAgo(randInt(0, 60)),
  }));
  await db.collection('recommendations').insertMany(recommendations);
  console.log(`  ✅ ai-recommendations: ${recommendations.length} recommendations`);

  /* ── 11. Quality Audits ── */
  const audits = Array.from({ length: 8 }, (_, i) => ({
    _id: new ObjectId(),
    auditType: pick(['documentation', 'clinical_practice', 'safety', 'compliance', 'outcome']),
    type: pick(['internal', 'external']),
    domain: pick(['sessions', 'assessments', 'care-plans', 'episodes']),
    area: pick(['التوثيق', 'السلامة', 'الجودة السريرية', 'حقوق المستفيد']),
    date: daysAgo(randInt(5, 120)),
    result: pick(['pass', 'pass', 'pass', 'fail', 'partial']),
    status: pick(['compliant', 'compliant', 'non_compliant']),
    score: randInt(60, 100),
    auditor: { _id: ids.therapists[i % 5], name: therapistNames[i % 5] },
    findings: [pick(['توثيق ممتاز', 'بحاجة لتحسين الترميز', 'التزام كامل بالمعايير'])],
    createdAt: daysAgo(randInt(5, 120)),
  }));
  await db.collection('qualityaudits').insertMany(audits);

  const correctiveActions = Array.from({ length: 4 }, (_, i) => ({
    _id: new ObjectId(),
    auditId: audits[i]._id,
    title: pick([
      'تحسين توثيق الجلسات',
      'تحديث بروتوكولات السلامة',
      'تدريب الكوادر على المعايير',
      'مراجعة إجراءات القبول',
    ]),
    description: 'إجراء تصحيحي بناءً على نتائج المراجعة',
    priority: pick(['high', 'medium', 'low']),
    status: pick(['open', 'in_progress', 'completed']),
    assignedTo: { _id: ids.therapists[i % 5], name: therapistNames[i % 5] },
    dueDate: daysAgo(-randInt(10, 60)),
    createdAt: daysAgo(randInt(5, 60)),
  }));
  await db.collection('correctiveactions').insertMany(correctiveActions);
  console.log(`  ✅ quality: ${audits.length} audits + ${correctiveActions.length} actions`);

  /* ── 12. Family ── */
  const familyMembers = Array.from({ length: 15 }, (_, i) => ({
    _id: new ObjectId(),
    beneficiaryId: ids.beneficiaries[i % 10],
    name: `${pick(['أبو', 'أم', 'أخ', 'أخت'])} ${firstNames[i % 10]}`,
    fullName: `${pick(firstNames)} ${pick(lastNames)}`,
    relationship: pick(['father', 'mother', 'sibling', 'guardian']),
    role: pick(['primary_caregiver', 'caregiver', 'family_member']),
    phone: `05${randInt(10000000, 99999999)}`,
    email: `family${i}@example.com`,
    isPrimaryContact: i % 3 === 0,
    notes: '',
    createdAt: daysAgo(randInt(30, 300)),
  }));
  await db.collection('familymembers').insertMany(familyMembers);

  const communications = Array.from({ length: 10 }, (_, i) => ({
    _id: new ObjectId(),
    beneficiaryId: ids.beneficiaries[i % 10],
    familyMemberId: familyMembers[i % 15]._id,
    type: pick(['phone', 'meeting', 'message', 'email', 'home_visit']),
    direction: pick(['outgoing', 'incoming']),
    subject: pick(['متابعة تقدم المستفيد', 'مناقشة خطة العلاج', 'تقرير شهري', 'استفسار عائلي']),
    content: 'محتوى التواصل مع الأسرة',
    date: daysAgo(randInt(0, 90)),
    status: 'completed',
    createdAt: daysAgo(randInt(0, 90)),
  }));
  await db.collection('familycommunications').insertMany(communications);
  console.log(
    `  ✅ family: ${familyMembers.length} members + ${communications.length} communications`
  );

  /* ── 13. Reports ── */
  const reportTemplates = [
    { name: 'تقرير تقدم المستفيد', category: 'clinical', frequency: 'monthly' },
    { name: 'تقرير الأداء التشغيلي', category: 'operational', frequency: 'weekly' },
    { name: 'تقرير جودة الخدمات', category: 'quality', frequency: 'quarterly' },
    { name: 'تقرير حالات الخروج', category: 'clinical', frequency: 'monthly' },
    { name: 'لوحة المؤشرات التنفيذية', category: 'operational', frequency: 'daily' },
  ];
  const templates = reportTemplates.map((t, i) => ({
    _id: new ObjectId(),
    name: t.name,
    title: t.name,
    category: t.category,
    frequency: t.frequency,
    description: `قالب ${t.name}`,
    status: 'active',
    createdAt: daysAgo(200),
  }));
  await db.collection('reporttemplates').insertMany(templates);

  const generatedReports = Array.from({ length: 6 }, (_, i) => ({
    _id: new ObjectId(),
    templateId: templates[i % templates.length]._id,
    title: `${templates[i % templates.length].name} — ${new Date().toLocaleDateString('ar-SA')}`,
    name: templates[i % templates.length].name,
    status: pick(['ready', 'completed', 'generating']),
    summary: 'ملخص التقرير المُنشأ',
    generatedAt: daysAgo(randInt(0, 30)),
    generatedBy: { _id: ids.therapists[0], name: therapistNames[0] },
    createdAt: daysAgo(randInt(0, 30)),
  }));
  await db.collection('generatedreports').insertMany(generatedReports);
  console.log(`  ✅ reports: ${templates.length} templates + ${generatedReports.length} generated`);

  /* ── 14. Group Therapy ── */
  const groups = ids.groups.map((id, i) => ({
    _id: id,
    name: pick(['مجموعة المهارات الاجتماعية', 'مجموعة العلاج الحركي', 'مجموعة التواصل']),
    groupName: pick(['الرواد', 'النجوم', 'الأبطال']),
    type: pick(['social_skills', 'motor', 'communication', 'behavioral']),
    description: 'مجموعة علاجية لتطوير المهارات',
    maxSize: pick([6, 8, 10]),
    currentSize: randInt(3, 8),
    members: ids.beneficiaries
      .slice(i * 3, i * 3 + 3)
      .map(bid => ({ beneficiaryId: bid, joinDate: daysAgo(60) })),
    facilitator: { _id: ids.therapists[i], name: therapistNames[i] },
    status: 'active',
    schedule: {
      day: pick(['Sunday', 'Tuesday', 'Thursday']),
      time: pick(['09:00', '11:00', '14:00']),
    },
    createdAt: daysAgo(90),
  }));
  await db.collection('therapygroups').insertMany(groups);

  const groupSessions = Array.from({ length: 9 }, (_, i) => ({
    _id: new ObjectId(),
    groupId: ids.groups[i % 3],
    sessionNumber: i + 1,
    date: daysAgo(randInt(0, 60)),
    duration: pick([45, 60, 90]),
    facilitator: { _id: ids.therapists[i % 3], name: therapistNames[i % 3] },
    status: pick(['completed', 'completed', 'scheduled']),
    attendees: ids.beneficiaries.slice(0, 3).map(bid => ({ beneficiaryId: bid, attended: true })),
    theme: pick(['مهارات التعاون', 'حل المشكلات', 'التواصل غير اللفظي', 'إدارة المشاعر']),
    notes: 'ملاحظات الجلسة الجماعية',
    createdAt: daysAgo(randInt(0, 60)),
  }));
  await db.collection('groupsessions').insertMany(groupSessions);
  console.log(`  ✅ group-therapy: ${groups.length} groups + ${groupSessions.length} sessions`);

  /* ── 15. Tele-Rehab ── */
  const teleSessions = Array.from({ length: 8 }, (_, i) => ({
    _id: new ObjectId(),
    beneficiaryId: ids.beneficiaries[i % 10],
    beneficiary: { _id: ids.beneficiaries[i % 10], name: { full: beneficiaries[i % 10].fullName } },
    beneficiaryName: beneficiaries[i % 10].fullName,
    sessionType: pick(['video_call', 'guided_exercise', 'monitoring', 'consultation']),
    type: 'telerehab',
    platform: pick(['zoom', 'teams', 'custom_platform']),
    scheduledDate: daysAgo(randInt(-10, 60)),
    date: daysAgo(randInt(0, 60)),
    duration: pick([30, 45, 60]),
    therapist: { _id: ids.therapists[i % 5], name: therapistNames[i % 5] },
    status: pick(['completed', 'completed', 'scheduled', 'cancelled']),
    connectionQuality: pick(['excellent', 'good', 'fair']),
    satisfaction: randInt(3, 5),
    createdAt: daysAgo(randInt(0, 60)),
  }));
  await db.collection('telesessions').insertMany(teleSessions);
  console.log(`  ✅ tele-rehab: ${teleSessions.length} sessions`);

  /* ── 16. AR/VR ── */
  const arvrSessions = Array.from({ length: 6 }, (_, i) => ({
    _id: new ObjectId(),
    beneficiaryId: ids.beneficiaries[i % 10],
    beneficiary: { _id: ids.beneficiaries[i % 10], name: { full: beneficiaries[i % 10].fullName } },
    beneficiaryName: beneficiaries[i % 10].fullName,
    scenario: pick([
      'balance_training',
      'hand_coordination',
      'social_scenario',
      'cognitive_task',
      'exploration',
    ]),
    programName: pick(['تدريب التوازن VR', 'التنسيق الحركي AR', 'السيناريو الاجتماعي VR']),
    type: pick(['VR', 'AR', 'MR']),
    modality: pick(['VR', 'AR', 'MR']),
    device: pick(['Meta Quest 3', 'HoloLens 2', 'Custom VR Headset']),
    date: daysAgo(randInt(0, 90)),
    duration: pick([15, 20, 30]),
    status: pick(['completed', 'completed', 'scheduled']),
    performanceScore: randInt(40, 100),
    safetyNoted: false,
    createdAt: daysAgo(randInt(0, 90)),
  }));
  await db.collection('arvrsessions').insertMany(arvrSessions);
  console.log(`  ✅ ar-vr: ${arvrSessions.length} sessions`);

  /* ── 17. Behavior ── */
  const behaviorRecords = Array.from({ length: 10 }, (_, i) => ({
    _id: new ObjectId(),
    beneficiaryId: ids.beneficiaries[i % 10],
    beneficiary: { _id: ids.beneficiaries[i % 10], name: { full: beneficiaries[i % 10].fullName } },
    beneficiaryName: beneficiaries[i % 10].fullName,
    behaviorType: pick([
      'aggression',
      'self_injury',
      'elopement',
      'non_compliance',
      'stereotypy',
      'tantrum',
    ]),
    type: pick(['incident', 'observation']),
    severity: pick(['low', 'medium', 'high']),
    date: daysAgo(randInt(0, 90)),
    antecedent: pick(['مطالب أكاديمية', 'تغيير روتين', 'رفض طلب', 'بيئة صاخبة']),
    trigger: pick(['تغيير مفاجئ', 'حرمان من نشاط', 'وجود محفز حسي']),
    consequence: pick(['تجاهل مخطط', 'إعادة توجيه', 'تعزيز بديل', 'انتظار الهدوء']),
    intervention: pick(['ABA', 'تعديل البيئة', 'تعزيز إيجابي', 'تدريب الاستبدال']),
    outcome: pick(['هدأ خلال 5 دقائق', 'استمر 15 دقيقة', 'استجاب للتوجيه', 'تكرار بعد 30 دقيقة']),
    status: pick(['documented', 'reviewed', 'resolved']),
    observer: { _id: ids.therapists[i % 5], name: therapistNames[i % 5] },
    createdAt: daysAgo(randInt(0, 90)),
  }));
  await db.collection('behaviorrecords').insertMany(behaviorRecords);

  const behaviorPlans = Array.from({ length: 3 }, (_, i) => ({
    _id: new ObjectId(),
    beneficiaryId: ids.beneficiaries[i],
    title: `خطة إدارة السلوك — ${beneficiaries[i].fullName}`,
    targetBehaviors: [pick(['aggression', 'self_injury', 'elopement'])],
    strategies: [
      { type: 'prevention', description: 'تعديل البيئة لتقليل المحفزات' },
      { type: 'intervention', description: 'استخدام التعزيز التفاضلي' },
      { type: 'crisis', description: 'بروتوكول الطوارئ السلوكية' },
    ],
    status: pick(['active', 'active', 'draft']),
    approvedBy: therapistNames[0],
    createdAt: daysAgo(60),
  }));
  await db.collection('behaviorplans').insertMany(behaviorPlans);
  console.log(`  ✅ behavior: ${behaviorRecords.length} records + ${behaviorPlans.length} plans`);

  /* ── 18. Research ── */
  const studies = ids.studies.map((id, i) => ({
    _id: id,
    title: pick([
      'فعالية التأهيل الافتراضي على المهارات الحركية',
      'تأثير العلاج الجماعي على التواصل الاجتماعي',
    ]),
    name: pick(['دراسة VR-Motor', 'دراسة Group-Social']),
    description: 'دراسة بحثية سريرية في مجال التأهيل',
    studyType: pick(['randomized_controlled', 'cohort', 'case_series']),
    status: pick(['active', 'recruiting']),
    principalInvestigator: { _id: ids.therapists[i], name: therapistNames[i] },
    researcher: therapistNames[i],
    participantCount: randInt(10, 40),
    targetSampleSize: 50,
    startDate: daysAgo(randInt(60, 200)),
    ethics: {
      approved: true,
      committeeRef: `IRB-2025-${100 + i}`,
      approvalDate: daysAgo(randInt(90, 250)),
    },
    createdAt: daysAgo(randInt(60, 200)),
  }));
  await db.collection('researchstudies').insertMany(studies);
  console.log(`  ✅ research: ${studies.length} studies`);

  /* ── 19. Field Training ── */
  const trainingPrograms = ids.trainingPrograms.map((id, i) => ({
    _id: id,
    name: pick([
      'برنامج التدريب المهني للعلاج الطبيعي',
      'برنامج التدريب على تحليل السلوك التطبيقي',
    ]),
    title: pick(['تدريب PT', 'تدريب ABA']),
    description: 'برنامج تدريب ميداني للأخصائيين الجدد',
    status: 'active',
    supervisor: { _id: ids.therapists[i], name: therapistNames[i] },
    traineeCount: randInt(3, 8),
    startDate: daysAgo(randInt(30, 120)),
    endDate: daysAgo(-randInt(30, 90)),
    competencies: [
      'clinical_assessment',
      'documentation',
      'communication',
      'ethics',
      'intervention',
    ],
    createdAt: daysAgo(randInt(30, 120)),
  }));
  await db.collection('trainingprograms').insertMany(trainingPrograms);

  const traineeRecords = Array.from({ length: 5 }, (_, i) => ({
    _id: new ObjectId(),
    programId: ids.trainingPrograms[i % 2],
    name: `متدرب ${i + 1}`,
    university: pick(['جامعة الملك سعود', 'جامعة الملك عبدالعزيز', 'جامعة الملك فيصل']),
    status: pick(['active', 'active', 'completed']),
    totalHours: randInt(50, 300),
    requiredHours: 480,
    evaluations: [{ date: daysAgo(30), score: randInt(60, 95), evaluator: therapistNames[0] }],
    competencies: {
      clinical_assessment: randInt(50, 100),
      documentation: randInt(50, 100),
      communication: randInt(50, 100),
    },
    createdAt: daysAgo(randInt(30, 120)),
  }));
  await db.collection('traineerecords').insertMany(traineeRecords);
  console.log(
    `  ✅ field-training: ${trainingPrograms.length} programs + ${traineeRecords.length} trainees`
  );

  /* ── 20. Dashboards & Decision Support ── */
  const kpiCategories = ['clinical', 'operational', 'financial', 'quality', 'satisfaction'];
  const kpiDefinitions = [
    { code: 'AVG_SESSION_ATTENDANCE', name: 'معدل حضور الجلسات', unit: '%', target: 85 },
    { code: 'GOAL_ACHIEVEMENT_RATE', name: 'نسبة تحقيق الأهداف', unit: '%', target: 70 },
    { code: 'ASSESSMENT_COMPLETION', name: 'إنجاز التقييمات', unit: '%', target: 90 },
    { code: 'PLAN_ADHERENCE', name: 'الالتزام بخطط الرعاية', unit: '%', target: 80 },
    { code: 'EPISODE_CYCLE_TIME', name: 'مدة حلقة الرعاية', unit: 'يوم', target: 180 },
    { code: 'FAMILY_SATISFACTION', name: 'رضا الأسرة', unit: '/5', target: 4.0 },
    { code: 'DISCHARGE_READINESS', name: 'جاهزية الخروج', unit: '%', target: 75 },
    { code: 'STAFF_UTILIZATION', name: 'استغلال الكوادر', unit: '%', target: 80 },
    { code: 'DOCUMENTATION_QUALITY', name: 'جودة التوثيق', unit: '%', target: 90 },
    { code: 'WAIT_TIME', name: 'وقت الانتظار', unit: 'يوم', target: 7 },
    { code: 'READMISSION_RATE', name: 'معدل إعادة القبول', unit: '%', target: 5 },
    { code: 'COST_PER_EPISODE', name: 'تكلفة حلقة الرعاية', unit: 'ر.س', target: 15000 },
    { code: 'TELEREHAB_ADOPTION', name: 'تبني التأهيل عن بُعد', unit: '%', target: 30 },
    { code: 'RECOMMENDATION_ACCEPTANCE', name: 'قبول التوصيات الذكية', unit: '%', target: 60 },
    { code: 'QUALITY_COMPLIANCE', name: 'الامتثال للجودة', unit: '%', target: 85 },
  ];
  const kpis = ids.kpis.map((id, i) => ({
    _id: id,
    ...kpiDefinitions[i],
    nameAr: kpiDefinitions[i].name,
    category: kpiCategories[i % kpiCategories.length],
    domain: pick([
      'core',
      'episodes',
      'sessions',
      'goals',
      'quality',
      'tele-rehab',
      'ai-recommendations',
    ]),
    isActive: true,
    collectFrequency: pick(['daily', 'weekly', 'monthly']),
    createdAt: daysAgo(200),
  }));
  await db.collection('kpidefinitions').insertMany(kpis);

  // KPI Snapshots (last 30 days)
  const snapshots = [];
  for (const kpi of kpis) {
    for (let d = 0; d < 30; d++) {
      snapshots.push({
        _id: new ObjectId(),
        kpiId: kpi._id,
        value:
          kpi.unit === '/5'
            ? (3 + Math.random() * 2).toFixed(1)
            : randInt(Math.floor(kpi.target * 0.6), Math.ceil(kpi.target * 1.2)),
        date: daysAgo(d),
        branch: pick(branches),
        createdAt: daysAgo(d),
      });
    }
  }
  await db.collection('kpisnapshots').insertMany(snapshots);

  // Dashboard Config
  const dashboardConfig = {
    _id: new ObjectId(),
    name: 'لوحة المعلومات التنفيذية',
    type: 'executive',
    owner: ids.therapists[0],
    isDefault: true,
    widgets: kpis.slice(0, 6).map((kpi, i) => ({
      widgetId: `widget-${i + 1}`,
      type: pick(['kpi_card', 'line_chart', 'bar_chart', 'gauge']),
      kpiId: kpi._id,
      position: { x: (i % 3) * 4, y: Math.floor(i / 3) * 3, w: 4, h: 3 },
    })),
    status: 'active',
    createdAt: daysAgo(100),
  };
  await db.collection('dashboardconfigs').insertMany([dashboardConfig]);

  // Decision Alerts
  const alerts = Array.from({ length: 5 }, (_, i) => ({
    _id: new ObjectId(),
    type: pick(['threshold_breach', 'trend_decline', 'risk_escalation', 'compliance_gap']),
    severity: pick(['critical', 'high', 'medium', 'low']),
    title: pick([
      'انخفاض حاد في حضور الجلسات',
      'ثبات في تقدم المستفيدين',
      'تجاوز وقت الانتظار المعياري',
      'انخفاض نسبة الامتثال',
      'ارتفاع معدل إعادة القبول',
    ]),
    description: 'تنبيه مُنشأ من محرك دعم القرار',
    status: pick(['active', 'active', 'acknowledged', 'resolved']),
    kpiId: ids.kpis[i % 15],
    ruleId: pick(['threshold_monitor', 'trend_analyzer', 'compliance_checker']),
    triggeredAt: daysAgo(randInt(0, 14)),
    createdAt: daysAgo(randInt(0, 14)),
  }));
  await db.collection('decisionalerts').insertMany(alerts);
  console.log(
    `  ✅ dashboards: ${kpis.length} KPIs + ${snapshots.length} snapshots + ${alerts.length} alerts`
  );

  /* ── Summary ── */
  const totalDocs =
    beneficiaries.length +
    episodes.length +
    timelineEvents.length +
    assessments.length +
    carePlans.length +
    clinicalSessions.length +
    therapeuticGoals.length +
    workflowTasks.length +
    programs.length +
    recommendations.length +
    audits.length +
    correctiveActions.length +
    familyMembers.length +
    communications.length +
    templates.length +
    generatedReports.length +
    groups.length +
    groupSessions.length +
    teleSessions.length +
    arvrSessions.length +
    behaviorRecords.length +
    behaviorPlans.length +
    studies.length +
    trainingPrograms.length +
    traineeRecords.length +
    kpis.length +
    snapshots.length +
    1 +
    alerts.length;

  console.log(`\n🎉 [DDD-Seed] Complete! ${totalDocs} documents across 20 domains.\n`);
  return { success: true, totalDocuments: totalDocs };
}

/* ══════════════════════════════════════════════════════════════
 *  DOWN / CLEANUP
 * ══════════════════════════════════════════════════════════════ */
async function down(connection) {
  const db = connection || mongoose.connection;
  console.log('🗑️  [DDD-Seed] Removing all DDD seed data...');

  const collections = [
    'beneficiaries',
    'episodesofcares',
    'caretimelines',
    'clinicalassessments',
    'unifiedcareplans',
    'clinicalsessions',
    'therapeuticgoals',
    'workflowtasks',
    'programs',
    'recommendations',
    'clinicalriskscores',
    'qualityaudits',
    'correctiveactions',
    'familymembers',
    'familycommunications',
    'reporttemplates',
    'generatedreports',
    'therapygroups',
    'groupsessions',
    'telesessions',
    'arvrsessions',
    'behaviorrecords',
    'behaviorplans',
    'researchstudies',
    'trainingprograms',
    'traineerecords',
    'dashboardconfigs',
    'kpidefinitions',
    'kpisnapshots',
    'decisionalerts',
  ];

  for (const col of collections) {
    try {
      await db.collection(col).deleteMany({});
    } catch {
      // Collection may not exist
    }
  }

  console.log('🗑️  [DDD-Seed] Cleanup complete.\n');
}

/* ── Standalone runner ── */
if (require.main === module) {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp';

  (async () => {
    try {
      await mongoose.connect(uri);
      console.log(`📦 Connected to ${uri}`);

      if (process.argv.includes('--down')) {
        await down(mongoose.connection);
      } else {
        if (process.argv.includes('--force')) await down(mongoose.connection);
        await seed(mongoose.connection);
      }
    } catch (err) {
      console.error('❌ Seed failed:', err.message);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
    }
  })();
}

module.exports = { seed, down, up: seed };
