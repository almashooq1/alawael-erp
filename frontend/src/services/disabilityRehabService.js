/**
 * ♿ خدمة تأهيل ذوي الإعاقة — Disability Rehabilitation Service
 * AlAwael ERP — Comprehensive Disability Rehab Management
 * Covers: Programs, Sessions, Assessments, Goals, Assistive Devices, Specialized Programs, Reports
 */
import apiClient from './api.client';
import logger from 'utils/logger';

const safe =
  fn =>
  async (...args) => {
    try {
      return await fn(...args);
    } catch (e) {
      logger.warn('disabilityRehabService fallback:', e.message);
      return null;
    }
  };

// ═══════════════════════════════════════════
// 1. REHABILITATION PROGRAMS — برامج التأهيل
// ═══════════════════════════════════════════
export const rehabProgramService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/disability-rehab/programs', { params });
    return r.data;
  }),
  getById: safe(async id => {
    const r = await apiClient.get(`/disability-rehab/programs/${id}`);
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post('/disability-rehab/programs', data);
    return r.data;
  }),
  update: safe(async (id, data) => {
    const r = await apiClient.put(`/disability-rehab/programs/${id}`, data);
    return r.data;
  }),
  remove: safe(async id => {
    const r = await apiClient.delete(`/disability-rehab/programs/${id}`);
    return r.data;
  }),
  complete: safe(async id => {
    const r = await apiClient.put(`/disability-rehab/programs/${id}/complete`);
    return r.data;
  }),
  getReport: safe(async id => {
    const r = await apiClient.get(`/disability-rehab/programs/${id}/report`);
    return r.data;
  }),

  // Sessions within a program
  addSession: safe(async (programId, data) => {
    const r = await apiClient.post(`/disability-rehab/programs/${programId}/sessions`, data);
    return r.data;
  }),

  // Goals within a program
  updateGoal: safe(async (programId, goalId, data) => {
    const r = await apiClient.put(`/disability-rehab/programs/${programId}/goals/${goalId}`, data);
    return r.data;
  }),

  // Assessments within a program
  addAssessment: safe(async (programId, data) => {
    const r = await apiClient.post(`/disability-rehab/programs/${programId}/assessments`, data);
    return r.data;
  }),

  getMockPrograms: () => MOCK_PROGRAMS,
  getMockStats: () => MOCK_PROGRAM_STATS,
};

// ═══════════════════════════════════════════
// 2. THERAPY SESSIONS — الجلسات العلاجية
// ═══════════════════════════════════════════
export const therapySessionService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/therapist/sessions', { params });
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post('/therapist/sessions', data);
    return r.data;
  }),
  getSchedule: safe(async (params = {}) => {
    const r = await apiClient.get('/therapist/schedule', { params });
    return r.data;
  }),
  createSchedule: safe(async data => {
    const r = await apiClient.post('/therapist/schedule', data);
    return r.data;
  }),

  getMockSessions: () => MOCK_SESSIONS,
  getMockSchedule: () => MOCK_SCHEDULE,
  getMockStats: () => MOCK_SESSION_STATS,
};

// ═══════════════════════════════════════════
// 3. SPECIALIZED PROGRAMS — البرامج المتخصصة
// ═══════════════════════════════════════════
export const specializedProgramService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/specialized-programs', { params });
    return r.data;
  }),
  getById: safe(async id => {
    const r = await apiClient.get(`/specialized-programs/${id}`);
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post('/specialized-programs', data);
    return r.data;
  }),
  update: safe(async (id, data) => {
    const r = await apiClient.put(`/specialized-programs/${id}`, data);
    return r.data;
  }),
  remove: safe(async id => {
    const r = await apiClient.delete(`/specialized-programs/${id}`);
    return r.data;
  }),
  activate: safe(async id => {
    const r = await apiClient.post(`/specialized-programs/${id}/activate`);
    return r.data;
  }),
  getByDisability: safe(async type => {
    const r = await apiClient.get(`/specialized-programs/by-disability/${type}`);
    return r.data;
  }),
  getDisabilityTypes: safe(async () => {
    const r = await apiClient.get('/specialized-programs/disability-types');
    return r.data;
  }),
  getStatistics: safe(async id => {
    const r = await apiClient.get(`/specialized-programs/${id}/statistics`);
    return r.data;
  }),

  getMockSpecialized: () => MOCK_SPECIALIZED_PROGRAMS,
};

// ═══════════════════════════════════════════
// 4. ASSISTIVE DEVICES — الأجهزة المساعدة
// ═══════════════════════════════════════════
export const assistiveDeviceService = {
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/rehab-equipment', { params });
    return r.data;
  }),
  getById: safe(async id => {
    const r = await apiClient.get(`/rehab-equipment/${id}`);
    return r.data;
  }),
  create: safe(async data => {
    const r = await apiClient.post('/rehab-equipment', data);
    return r.data;
  }),
  update: safe(async (id, data) => {
    const r = await apiClient.put(`/rehab-equipment/${id}`, data);
    return r.data;
  }),
  assign: safe(async (id, data) => {
    const r = await apiClient.post(`/rehab-equipment/${id}/assign`, data);
    return r.data;
  }),
  returnDevice: safe(async id => {
    const r = await apiClient.post(`/rehab-equipment/${id}/return`);
    return r.data;
  }),
  maintenance: safe(async (id, data) => {
    const r = await apiClient.post(`/rehab-equipment/${id}/maintenance`, data);
    return r.data;
  }),

  getMockDevices: () => MOCK_DEVICES,
  getMockStats: () => MOCK_DEVICE_STATS,
};

// ═══════════════════════════════════════════
// 5. STATISTICS & REPORTS — الإحصائيات والتقارير
// ═══════════════════════════════════════════
export const rehabReportService = {
  getStatistics: safe(async () => {
    const r = await apiClient.get('/disability-rehab/statistics');
    return r.data;
  }),
  getPerformance: safe(async (year, month) => {
    const r = await apiClient.get(`/disability-rehab/performance/${year}/${month}`);
    return r.data;
  }),
  getInfo: safe(async () => {
    const r = await apiClient.get('/disability-rehab/info');
    return r.data;
  }),

  getMockDashboard: () => MOCK_DASHBOARD_STATS,
  getMockPerformance: () => MOCK_PERFORMANCE,
};

// ═══════════════════════════════════════════════════════
// MOCK DATA — البيانات التجريبية
// ═══════════════════════════════════════════════════════

const MOCK_PROGRAMS = [
  {
    _id: 'rp1',
    programNumber: 'RP-2026-001',
    name: 'برنامج تأهيل حركي شامل',
    type: 'physical',
    disabilityType: 'حركية',
    beneficiary: { name: 'محمد أحمد العلي', age: 12, id: 'B001', disabilityLevel: 'متوسطة' },
    therapist: 'د. سارة المالكي',
    startDate: '2026-01-15',
    endDate: '2026-06-15',
    status: 'active',
    totalSessions: 48,
    completedSessions: 22,
    progress: 68,
    goals: [
      { id: 'g1', title: 'تحسين المشي المستقل', target: 100, current: 65, status: 'in_progress' },
      {
        id: 'g2',
        title: 'تقوية عضلات الأطراف السفلية',
        target: 100,
        current: 80,
        status: 'in_progress',
      },
    ],
    latestAssessment: { date: '2026-03-01', score: 72, improvement: 15 },
  },
  {
    _id: 'rp2',
    programNumber: 'RP-2026-002',
    name: 'برنامج تطوير النطق واللغة',
    type: 'speech',
    disabilityType: 'نطقية',
    beneficiary: { name: 'فاطمة خالد الشمري', age: 8, id: 'B002', disabilityLevel: 'خفيفة' },
    therapist: 'أ. نورة العتيبي',
    startDate: '2026-02-01',
    endDate: '2026-07-31',
    status: 'active',
    totalSessions: 36,
    completedSessions: 15,
    progress: 55,
    goals: [
      { id: 'g3', title: 'نطق 50 كلمة بوضوح', target: 50, current: 32, status: 'in_progress' },
      { id: 'g4', title: 'تكوين جمل من 3 كلمات', target: 100, current: 40, status: 'in_progress' },
    ],
    latestAssessment: { date: '2026-03-05', score: 58, improvement: 20 },
  },
  {
    _id: 'rp3',
    programNumber: 'RP-2026-003',
    name: 'برنامج العلاج الوظيفي',
    type: 'occupational',
    disabilityType: 'ذهنية',
    beneficiary: { name: 'عبدالله سعد الدوسري', age: 15, id: 'B003', disabilityLevel: 'متوسطة' },
    therapist: 'د. أحمد الغامدي',
    startDate: '2025-11-01',
    endDate: '2026-04-30',
    status: 'active',
    totalSessions: 52,
    completedSessions: 40,
    progress: 82,
    goals: [
      {
        id: 'g5',
        title: 'الاعتماد على النفس في الأكل',
        target: 100,
        current: 90,
        status: 'in_progress',
      },
      {
        id: 'g6',
        title: 'ارتداء الملابس بشكل مستقل',
        target: 100,
        current: 75,
        status: 'in_progress',
      },
    ],
    latestAssessment: { date: '2026-03-10', score: 81, improvement: 25 },
  },
  {
    _id: 'rp4',
    programNumber: 'RP-2026-004',
    name: 'برنامج التأهيل السمعي',
    type: 'auditory',
    disabilityType: 'سمعية',
    beneficiary: { name: 'ريم محمد القرني', age: 6, id: 'B004', disabilityLevel: 'شديدة' },
    therapist: 'أ. منى الحربي',
    startDate: '2026-01-10',
    endDate: '2026-12-31',
    status: 'active',
    totalSessions: 96,
    completedSessions: 18,
    progress: 30,
    goals: [
      { id: 'g7', title: 'التعرف على 20 صوت بيئي', target: 20, current: 8, status: 'in_progress' },
      {
        id: 'g8',
        title: 'الاستجابة للنداء بالاسم',
        target: 100,
        current: 45,
        status: 'in_progress',
      },
    ],
    latestAssessment: { date: '2026-03-08', score: 35, improvement: 10 },
  },
  {
    _id: 'rp5',
    programNumber: 'RP-2025-012',
    name: 'برنامج تطوير المهارات الاجتماعية',
    type: 'social',
    disabilityType: 'توحد',
    beneficiary: { name: 'سلطان فهد المطيري', age: 10, id: 'B005', disabilityLevel: 'متوسطة' },
    therapist: 'د. هند السالم',
    startDate: '2025-09-01',
    endDate: '2026-02-28',
    status: 'completed',
    totalSessions: 44,
    completedSessions: 44,
    progress: 100,
    goals: [
      {
        id: 'g9',
        title: 'التواصل البصري لمدة 5 ثوان',
        target: 100,
        current: 100,
        status: 'achieved',
      },
      { id: 'g10', title: 'المشاركة في لعب جماعي', target: 100, current: 85, status: 'achieved' },
    ],
    latestAssessment: { date: '2026-02-25', score: 88, improvement: 35 },
  },
  {
    _id: 'rp6',
    programNumber: 'RP-2026-005',
    name: 'برنامج التأهيل البصري',
    type: 'visual',
    disabilityType: 'بصرية',
    beneficiary: { name: 'لمى عبدالرحمن الجهني', age: 9, id: 'B006', disabilityLevel: 'خفيفة' },
    therapist: 'أ. خالد الزهراني',
    startDate: '2026-03-01',
    endDate: '2026-08-31',
    status: 'active',
    totalSessions: 40,
    completedSessions: 3,
    progress: 12,
    goals: [
      { id: 'g11', title: 'استخدام عصا التنقل', target: 100, current: 15, status: 'in_progress' },
      { id: 'g12', title: 'قراءة برايل الأساسية', target: 100, current: 8, status: 'in_progress' },
    ],
    latestAssessment: { date: '2026-03-12', score: 22, improvement: 5 },
  },
  {
    _id: 'rp7',
    programNumber: 'RP-2026-006',
    name: 'برنامج تعديل السلوك',
    type: 'behavioral',
    disabilityType: 'توحد',
    beneficiary: { name: 'يوسف ماجد البلوي', age: 7, id: 'B007', disabilityLevel: 'شديدة' },
    therapist: 'د. سارة المالكي',
    startDate: '2026-02-15',
    endDate: '2026-08-15',
    status: 'active',
    totalSessions: 60,
    completedSessions: 10,
    progress: 25,
    goals: [
      { id: 'g13', title: 'تقليل نوبات الغضب', target: 100, current: 30, status: 'in_progress' },
      {
        id: 'g14',
        title: 'اتباع التعليمات البسيطة',
        target: 100,
        current: 35,
        status: 'in_progress',
      },
    ],
    latestAssessment: { date: '2026-03-11', score: 40, improvement: 12 },
  },
];

const MOCK_PROGRAM_STATS = {
  totalPrograms: 45,
  activePrograms: 32,
  completedPrograms: 10,
  suspendedPrograms: 3,
  totalBeneficiaries: 38,
  avgProgress: 64,
  avgImprovement: 18.5,
  goalAchievementRate: 72,
  sessionCompletionRate: 89,
  totalSessions: 1240,
  completedSessions: 1103,
};

const MOCK_SESSIONS = [
  {
    _id: 's1',
    sessionNumber: 'SS-001',
    date: '2026-03-13',
    time: '09:00',
    duration: 45,
    therapist: 'د. سارة المالكي',
    beneficiary: 'محمد أحمد العلي',
    program: 'برنامج تأهيل حركي شامل',
    type: 'فردية',
    category: 'علاج طبيعي',
    status: 'scheduled',
    room: 'غرفة العلاج الطبيعي 1',
    notes: '',
  },
  {
    _id: 's2',
    sessionNumber: 'SS-002',
    date: '2026-03-13',
    time: '10:00',
    duration: 30,
    therapist: 'أ. نورة العتيبي',
    beneficiary: 'فاطمة خالد الشمري',
    program: 'برنامج تطوير النطق واللغة',
    type: 'فردية',
    category: 'علاج نطق',
    status: 'in_progress',
    room: 'غرفة النطق 2',
    notes: 'تقدم ملحوظ في نطق حرف الراء',
  },
  {
    _id: 's3',
    sessionNumber: 'SS-003',
    date: '2026-03-13',
    time: '11:00',
    duration: 60,
    therapist: 'د. أحمد الغامدي',
    beneficiary: 'عبدالله سعد الدوسري',
    program: 'برنامج العلاج الوظيفي',
    type: 'فردية',
    category: 'علاج وظيفي',
    status: 'completed',
    room: 'غرفة العلاج الوظيفي',
    notes: 'أكمل تمارين المهارات الدقيقة بنجاح',
    rating: 4,
  },
  {
    _id: 's4',
    sessionNumber: 'SS-004',
    date: '2026-03-13',
    time: '13:00',
    duration: 45,
    therapist: 'أ. منى الحربي',
    beneficiary: 'ريم محمد القرني',
    program: 'برنامج التأهيل السمعي',
    type: 'فردية',
    category: 'تأهيل سمعي',
    status: 'scheduled',
    room: 'غرفة السمع',
    notes: '',
  },
  {
    _id: 's5',
    sessionNumber: 'SS-005',
    date: '2026-03-13',
    time: '14:00',
    duration: 45,
    therapist: 'د. هند السالم',
    beneficiary: 'سلطان فهد المطيري',
    program: 'متابعة بعد التخرج',
    type: 'متابعة',
    category: 'مهارات اجتماعية',
    status: 'scheduled',
    room: 'غرفة المهارات',
    notes: 'جلسة متابعة شهرية',
  },
  {
    _id: 's6',
    sessionNumber: 'SS-006',
    date: '2026-03-12',
    time: '09:00',
    duration: 45,
    therapist: 'د. سارة المالكي',
    beneficiary: 'يوسف ماجد البلوي',
    program: 'برنامج تعديل السلوك',
    type: 'فردية',
    category: 'تعديل سلوك',
    status: 'completed',
    room: 'غرفة السلوك',
    notes: 'استجابة جيدة للتعزيز الإيجابي',
    rating: 3,
  },
  {
    _id: 's7',
    sessionNumber: 'SS-007',
    date: '2026-03-12',
    time: '10:30',
    duration: 60,
    therapist: 'أ. خالد الزهراني',
    beneficiary: 'لمى عبدالرحمن الجهني',
    program: 'برنامج التأهيل البصري',
    type: 'فردية',
    category: 'تأهيل بصري',
    status: 'completed',
    room: 'غرفة التأهيل البصري',
    notes: 'بداية تدريب عصا التنقل',
    rating: 4,
  },
  {
    _id: 's8',
    sessionNumber: 'SS-008',
    date: '2026-03-14',
    time: '09:00',
    duration: 90,
    therapist: 'د. أحمد الغامدي',
    beneficiary: 'مجموعة',
    program: 'ورشة مهارات حياتية',
    type: 'جماعية',
    category: 'تأهيل وظيفي',
    status: 'scheduled',
    room: 'القاعة الكبرى',
    notes: '8 مستفيدين — ورشة الطبخ',
  },
];

const MOCK_SCHEDULE = [
  {
    day: 'الأحد',
    slots: [
      { time: '09:00-09:45', therapist: 'د. سارة المالكي', beneficiary: 'محمد أحمد', room: 'WT1' },
      { time: '10:00-10:30', therapist: 'أ. نورة العتيبي', beneficiary: 'فاطمة خالد', room: 'NT2' },
    ],
  },
  {
    day: 'الاثنين',
    slots: [
      {
        time: '09:00-10:00',
        therapist: 'د. أحمد الغامدي',
        beneficiary: 'عبدالله سعد',
        room: 'OT1',
      },
      { time: '11:00-11:45', therapist: 'أ. منى الحربي', beneficiary: 'ريم محمد', room: 'AU1' },
    ],
  },
  {
    day: 'الثلاثاء',
    slots: [
      { time: '09:00-09:45', therapist: 'د. سارة المالكي', beneficiary: 'يوسف ماجد', room: 'BH1' },
      {
        time: '10:30-11:30',
        therapist: 'أ. خالد الزهراني',
        beneficiary: 'لمى عبدالرحمن',
        room: 'VR1',
      },
    ],
  },
  {
    day: 'الأربعاء',
    slots: [
      {
        time: '09:00-10:30',
        therapist: 'د. أحمد الغامدي',
        beneficiary: 'مجموعة (8)',
        room: 'HALL',
      },
      { time: '13:00-13:45', therapist: 'د. هند السالم', beneficiary: 'سلطان فهد', room: 'SK1' },
    ],
  },
  {
    day: 'الخميس',
    slots: [
      { time: '09:00-09:45', therapist: 'د. سارة المالكي', beneficiary: 'محمد أحمد', room: 'WT1' },
      { time: '10:00-10:30', therapist: 'أ. نورة العتيبي', beneficiary: 'فاطمة خالد', room: 'NT2' },
    ],
  },
];

const MOCK_SESSION_STATS = {
  totalToday: 5,
  completed: 2,
  inProgress: 1,
  scheduled: 2,
  cancelled: 0,
  totalWeek: 28,
  totalMonth: 112,
  avgDuration: 48,
  attendanceRate: 92,
  satisfactionRating: 4.5,
};

const MOCK_SPECIALIZED_PROGRAMS = [
  {
    _id: 'sp1',
    name: 'برنامج ABA للتوحد',
    disabilityType: 'توحد',
    description: 'تحليل السلوك التطبيقي — برنامج مكثف لتعديل السلوك وتطوير المهارات',
    duration: '12 شهر',
    sessionsPerWeek: 5,
    maxCapacity: 8,
    currentEnrollment: 6,
    status: 'active',
    ageRange: '3-12',
    successRate: 78,
    therapists: ['د. سارة المالكي', 'د. هند السالم'],
  },
  {
    _id: 'sp2',
    name: 'برنامج PROMPT للنطق',
    disabilityType: 'نطقية',
    description: 'إعادة هيكلة الأهداف الحركية الفموية — تقنية متقدمة لعلاج اضطرابات النطق',
    duration: '6 أشهر',
    sessionsPerWeek: 3,
    maxCapacity: 10,
    currentEnrollment: 7,
    status: 'active',
    ageRange: '4-15',
    successRate: 82,
    therapists: ['أ. نورة العتيبي'],
  },
  {
    _id: 'sp3',
    name: 'برنامج Bobath للشلل الدماغي',
    disabilityType: 'حركية',
    description: 'علاج عصبي تطوري للأطفال ذوي الشلل الدماغي',
    duration: '24 شهر',
    sessionsPerWeek: 4,
    maxCapacity: 6,
    currentEnrollment: 5,
    status: 'active',
    ageRange: '2-18',
    successRate: 65,
    therapists: ['د. أحمد الغامدي'],
  },
  {
    _id: 'sp4',
    name: 'برنامج التأهيل السمعي اللفظي AVT',
    disabilityType: 'سمعية',
    description: 'تنمية مهارات الاستماع والنطق للأطفال زارعي القوقعة',
    duration: '18 شهر',
    sessionsPerWeek: 3,
    maxCapacity: 8,
    currentEnrollment: 4,
    status: 'active',
    ageRange: '1-8',
    successRate: 75,
    therapists: ['أ. منى الحربي'],
  },
  {
    _id: 'sp5',
    name: 'برنامج التوجيه والحركة للمكفوفين',
    disabilityType: 'بصرية',
    description: 'تدريب على التنقل المستقل واستخدام العصا البيضاء',
    duration: '9 أشهر',
    sessionsPerWeek: 2,
    maxCapacity: 5,
    currentEnrollment: 3,
    status: 'active',
    ageRange: '6-18',
    successRate: 88,
    therapists: ['أ. خالد الزهراني'],
  },
  {
    _id: 'sp6',
    name: 'برنامج التعلم المنظم TEACCH',
    disabilityType: 'توحد',
    description: 'نظام تعليم منظم بصرياً للأفراد ذوي طيف التوحد',
    duration: '12 شهر',
    sessionsPerWeek: 5,
    maxCapacity: 6,
    currentEnrollment: 6,
    status: 'full',
    ageRange: '5-16',
    successRate: 71,
    therapists: ['د. هند السالم'],
  },
];

const MOCK_DEVICES = [
  {
    _id: 'd1',
    deviceNumber: 'AD-001',
    name: 'كرسي متحرك كهربائي',
    category: 'تنقل',
    brand: 'Permobil',
    model: 'M3 Corpus',
    serialNumber: 'PM-2025-4521',
    status: 'assigned',
    condition: 'جيد',
    assignedTo: { name: 'محمد أحمد العلي', id: 'B001' },
    assignedDate: '2025-10-01',
    purchaseDate: '2025-08-15',
    cost: 35000,
    warranty: '2027-08-15',
    lastMaintenance: '2026-02-10',
    nextMaintenance: '2026-05-10',
  },
  {
    _id: 'd2',
    deviceNumber: 'AD-002',
    name: 'جهاز تواصل AAC',
    category: 'تواصل',
    brand: 'Tobii Dynavox',
    model: 'I-13',
    serialNumber: 'TD-2025-8834',
    status: 'assigned',
    condition: 'ممتاز',
    assignedTo: { name: 'يوسف ماجد البلوي', id: 'B007' },
    assignedDate: '2026-01-05',
    purchaseDate: '2025-12-01',
    cost: 28000,
    warranty: '2027-12-01',
    lastMaintenance: null,
    nextMaintenance: '2026-06-01',
  },
  {
    _id: 'd3',
    deviceNumber: 'AD-003',
    name: 'سماعة أذن رقمية',
    category: 'سمعي',
    brand: 'Phonak',
    model: 'Sky Marvel',
    serialNumber: 'PH-2026-1120',
    status: 'assigned',
    condition: 'جيد',
    assignedTo: { name: 'ريم محمد القرني', id: 'B004' },
    assignedDate: '2026-01-15',
    purchaseDate: '2026-01-10',
    cost: 8500,
    warranty: '2028-01-10',
    lastMaintenance: null,
    nextMaintenance: '2026-07-10',
  },
  {
    _id: 'd4',
    deviceNumber: 'AD-004',
    name: 'جهاز مشي (ووكر)',
    category: 'تنقل',
    brand: 'Rifton',
    model: 'Pacer',
    serialNumber: 'RF-2025-3345',
    status: 'available',
    condition: 'جيد',
    assignedTo: null,
    assignedDate: null,
    purchaseDate: '2025-06-20',
    cost: 12000,
    warranty: '2027-06-20',
    lastMaintenance: '2026-01-20',
    nextMaintenance: '2026-04-20',
  },
  {
    _id: 'd5',
    deviceNumber: 'AD-005',
    name: 'مقعد تموضع خاص',
    category: 'تموضع',
    brand: 'Leckey',
    model: 'Advance',
    serialNumber: 'LK-2025-6678',
    status: 'maintenance',
    condition: 'يحتاج صيانة',
    assignedTo: { name: 'عبدالله سعد الدوسري', id: 'B003' },
    assignedDate: '2025-11-15',
    purchaseDate: '2025-09-01',
    cost: 15000,
    warranty: '2027-09-01',
    lastMaintenance: '2026-03-05',
    nextMaintenance: '2026-03-20',
  },
  {
    _id: 'd6',
    deviceNumber: 'AD-006',
    name: 'عصا بيضاء إلكترونية',
    category: 'بصري',
    brand: 'WeWALK',
    model: 'Smart Cane',
    serialNumber: 'WW-2026-0012',
    status: 'assigned',
    condition: 'ممتاز',
    assignedTo: { name: 'لمى عبدالرحمن الجهني', id: 'B006' },
    assignedDate: '2026-03-05',
    purchaseDate: '2026-03-01',
    cost: 4500,
    warranty: '2028-03-01',
    lastMaintenance: null,
    nextMaintenance: '2026-09-01',
  },
  {
    _id: 'd7',
    deviceNumber: 'AD-007',
    name: 'جبيرة يد ديناميكية',
    category: 'تقويم',
    brand: 'Ottobock',
    model: 'Dynamic Hand',
    serialNumber: 'OB-2025-9910',
    status: 'available',
    condition: 'جيد',
    assignedTo: null,
    assignedDate: null,
    purchaseDate: '2025-11-10',
    cost: 6500,
    warranty: '2027-11-10',
    lastMaintenance: '2026-02-15',
    nextMaintenance: '2026-05-15',
  },
  {
    _id: 'd8',
    deviceNumber: 'AD-008',
    name: 'لوح تواصل بالصور PECS',
    category: 'تواصل',
    brand: 'Pyramid',
    model: 'PECS Phase III',
    serialNumber: 'PY-2026-0045',
    status: 'assigned',
    condition: 'جيد',
    assignedTo: { name: 'سلطان فهد المطيري', id: 'B005' },
    assignedDate: '2025-09-15',
    purchaseDate: '2025-09-01',
    cost: 1200,
    warranty: null,
    lastMaintenance: null,
    nextMaintenance: null,
  },
];

const MOCK_DEVICE_STATS = {
  total: 24,
  assigned: 16,
  available: 5,
  maintenance: 3,
  totalValue: 425000,
  categories: { تنقل: 8, تواصل: 5, سمعي: 4, بصري: 3, تقويم: 2, تموضع: 2 },
  maintenanceDue: 2,
};

const MOCK_DASHBOARD_STATS = {
  activeBeneficiaries: 38,
  activePrograms: 32,
  totalTherapists: 12,
  todaySessions: 5,
  weekSessions: 28,
  monthSessions: 112,
  avgProgress: 64,
  avgImprovement: 18.5,
  goalAchievementRate: 72,
  sessionCompletionRate: 89,
  satisfactionRate: 92,
  disabilityDistribution: [
    { type: 'حركية', count: 10, percentage: 26 },
    { type: 'توحد', count: 8, percentage: 21 },
    { type: 'نطقية', count: 7, percentage: 18 },
    { type: 'ذهنية', count: 5, percentage: 13 },
    { type: 'سمعية', count: 4, percentage: 11 },
    { type: 'بصرية', count: 3, percentage: 8 },
    { type: 'متعددة', count: 1, percentage: 3 },
  ],
  monthlyTrend: [
    { month: 'أكتوبر', sessions: 95, improvement: 12 },
    { month: 'نوفمبر', sessions: 102, improvement: 14 },
    { month: 'ديسمبر', sessions: 88, improvement: 15 },
    { month: 'يناير', sessions: 108, improvement: 17 },
    { month: 'فبراير', sessions: 115, improvement: 19 },
    { month: 'مارس', sessions: 112, improvement: 18 },
  ],
};

const MOCK_PERFORMANCE = {
  therapistPerformance: [
    { name: 'د. سارة المالكي', sessions: 48, rating: 4.8, improvement: 22, caseload: 8 },
    { name: 'د. أحمد الغامدي', sessions: 42, rating: 4.6, improvement: 25, caseload: 6 },
    { name: 'أ. نورة العتيبي', sessions: 38, rating: 4.7, improvement: 20, caseload: 7 },
    { name: 'أ. منى الحربي', sessions: 35, rating: 4.5, improvement: 15, caseload: 5 },
    { name: 'د. هند السالم', sessions: 40, rating: 4.9, improvement: 30, caseload: 6 },
    { name: 'أ. خالد الزهراني', sessions: 30, rating: 4.4, improvement: 18, caseload: 4 },
  ],
  programEffectiveness: [
    { type: 'علاج طبيعي', programs: 10, avgProgress: 68, avgImprovement: 20, completionRate: 85 },
    { type: 'علاج نطق', programs: 7, avgProgress: 55, avgImprovement: 22, completionRate: 78 },
    { type: 'علاج وظيفي', programs: 6, avgProgress: 72, avgImprovement: 25, completionRate: 90 },
    { type: 'تأهيل سمعي', programs: 4, avgProgress: 45, avgImprovement: 15, completionRate: 70 },
    { type: 'تعديل سلوك', programs: 5, avgProgress: 40, avgImprovement: 18, completionRate: 65 },
  ],
};

// ═══════════════════════════════════════════
// 6. العلاج بالفنون — Art Therapy
// ═══════════════════════════════════════════
export const artTherapyService = {
  assess: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/art-therapy/assess', {
      beneficiaryId,
      assessmentData: data,
    });
    return r.data;
  }),
  createPlan: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/art-therapy/plan', {
      beneficiaryId,
      assessmentData: data,
    });
    return r.data;
  }),
  recordSession: safe(async (beneficiaryId, sessionData) => {
    const r = await apiClient.post('/disability-rehab/art-therapy/session', {
      beneficiaryId,
      sessionData,
    });
    return r.data;
  }),
  recordArtwork: safe(async (beneficiaryId, artworkData) => {
    const r = await apiClient.post('/disability-rehab/art-therapy/artwork', {
      beneficiaryId,
      artworkData,
    });
    return r.data;
  }),
  getProgress: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/art-therapy/progress/${beneficiaryId}`);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 7. العلاج بالموسيقى — Music Therapy
// ═══════════════════════════════════════════
export const musicTherapyService = {
  assess: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/music-therapy/assess', {
      beneficiaryId,
      assessmentData: data,
    });
    return r.data;
  }),
  createPlan: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/music-therapy/plan', {
      beneficiaryId,
      assessmentData: data,
    });
    return r.data;
  }),
  recordSession: safe(async (beneficiaryId, sessionData) => {
    const r = await apiClient.post('/disability-rehab/music-therapy/session', {
      beneficiaryId,
      sessionData,
    });
    return r.data;
  }),
  getProgress: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/music-therapy/progress/${beneficiaryId}`);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 8. العلاج المائي — Hydrotherapy
// ═══════════════════════════════════════════
export const hydrotherapyService = {
  assess: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/hydrotherapy/assess', {
      beneficiaryId,
      assessmentData: data,
    });
    return r.data;
  }),
  createPlan: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/hydrotherapy/plan', {
      beneficiaryId,
      assessmentData: data,
    });
    return r.data;
  }),
  recordSession: safe(async (beneficiaryId, sessionData) => {
    const r = await apiClient.post('/disability-rehab/hydrotherapy/session', {
      beneficiaryId,
      sessionData,
    });
    return r.data;
  }),
  getProgress: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/hydrotherapy/progress/${beneficiaryId}`);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 9. تحليل السلوك التطبيقي — ABA Therapy
// ═══════════════════════════════════════════
export const abaTherapyService = {
  assess: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/aba-therapy/assess', {
      beneficiaryId,
      assessmentData: data,
    });
    return r.data;
  }),
  createPlan: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/aba-therapy/plan', {
      beneficiaryId,
      assessmentData: data,
    });
    return r.data;
  }),
  recordSession: safe(async (beneficiaryId, sessionData) => {
    const r = await apiClient.post('/disability-rehab/aba-therapy/session', {
      beneficiaryId,
      sessionData,
    });
    return r.data;
  }),
  recordDailyBehavior: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/aba-therapy/daily-behavior', {
      beneficiaryId,
      data,
    });
    return r.data;
  }),
  getProgress: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/aba-therapy/progress/${beneficiaryId}`);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 10. إعادة التأهيل المعرفي — Cognitive Rehabilitation
// ═══════════════════════════════════════════
export const cognitiveRehabService = {
  assess: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/cognitive-rehab/assess', {
      beneficiaryId,
      assessmentData: data,
    });
    return r.data;
  }),
  createPlan: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/cognitive-rehab/plan', {
      beneficiaryId,
      assessmentData: data,
    });
    return r.data;
  }),
  recordSession: safe(async (beneficiaryId, sessionData) => {
    const r = await apiClient.post('/disability-rehab/cognitive-rehab/session', {
      beneficiaryId,
      sessionData,
    });
    return r.data;
  }),
  recordHomeExercise: safe(async (beneficiaryId, exerciseData) => {
    const r = await apiClient.post('/disability-rehab/cognitive-rehab/home-exercise', {
      beneficiaryId,
      exerciseData,
    });
    return r.data;
  }),
  getProgress: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/cognitive-rehab/progress/${beneficiaryId}`);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 11. العلاج الحسي التكاملي — Sensory Integration
// ═══════════════════════════════════════════
export const sensoryIntegrationService = {
  assess: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/sensory-integration/assess', {
      beneficiaryId,
      assessmentData: data,
    });
    return r.data;
  }),
  createPlan: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/sensory-integration/plan', {
      beneficiaryId,
      assessmentData: data,
    });
    return r.data;
  }),
  recordSession: safe(async (beneficiaryId, sessionData) => {
    const r = await apiClient.post('/disability-rehab/sensory-integration/session', {
      beneficiaryId,
      sessionData,
    });
    return r.data;
  }),
  updateSensoryDiet: safe(async (beneficiaryId, dietData) => {
    const r = await apiClient.post('/disability-rehab/sensory-integration/sensory-diet', {
      beneficiaryId,
      dietData,
    });
    return r.data;
  }),
  getProgress: safe(async beneficiaryId => {
    const r = await apiClient.get(
      `/disability-rehab/sensory-integration/progress/${beneficiaryId}`
    );
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 12. العلاج بمساعدة الحيوانات — Animal-Assisted Therapy
// ═══════════════════════════════════════════
export const animalTherapyService = {
  assess: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/animal-therapy/assess', {
      beneficiaryId,
      assessmentData: data,
    });
    return r.data;
  }),
  createPlan: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/animal-therapy/plan', {
      beneficiaryId,
      assessmentData: data,
    });
    return r.data;
  }),
  recordSession: safe(async (beneficiaryId, sessionData) => {
    const r = await apiClient.post('/disability-rehab/animal-therapy/session', {
      beneficiaryId,
      sessionData,
    });
    return r.data;
  }),
  getProgress: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/animal-therapy/progress/${beneficiaryId}`);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 13. التغذية العلاجية — Therapeutic Nutrition
// ═══════════════════════════════════════════
export const therapeuticNutritionService = {
  assess: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/therapeutic-nutrition/assess', {
      beneficiaryId,
      assessmentData: data,
    });
    return r.data;
  }),
  createPlan: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/therapeutic-nutrition/plan', {
      beneficiaryId,
      assessmentData: data,
    });
    return r.data;
  }),
  recordSession: safe(async (beneficiaryId, sessionData) => {
    const r = await apiClient.post('/disability-rehab/therapeutic-nutrition/session', {
      beneficiaryId,
      sessionData,
    });
    return r.data;
  }),
  recordDailyFeeding: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/therapeutic-nutrition/daily-feeding', {
      beneficiaryId,
      data,
    });
    return r.data;
  }),
  getProgress: safe(async beneficiaryId => {
    const r = await apiClient.get(
      `/disability-rehab/therapeutic-nutrition/progress/${beneficiaryId}`
    );
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 14. العلاج بالواقع الافتراضي — VR Therapy
// ═══════════════════════════════════════════
export const vrTherapyService = {
  assess: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/vr-therapy/assess', {
      beneficiaryId,
      assessmentData: data,
    });
    return r.data;
  }),
  createPlan: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/vr-therapy/plan', {
      beneficiaryId,
      planData: data,
    });
    return r.data;
  }),
  recordSession: safe(async (beneficiaryId, sessionData) => {
    const r = await apiClient.post('/disability-rehab/vr-therapy/session', {
      beneficiaryId,
      sessionData,
    });
    return r.data;
  }),
  createEnvironment: safe(async (beneficiaryId, envData) => {
    const r = await apiClient.post('/disability-rehab/vr-therapy/environment', {
      beneficiaryId,
      environmentData: envData,
    });
    return r.data;
  }),
  getEnvironments: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/vr-therapy/environments/${beneficiaryId}`);
    return r.data;
  }),
  getProgress: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/vr-therapy/progress/${beneficiaryId}`);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 15. العلاج باللعب — Play Therapy
// ═══════════════════════════════════════════
export const playTherapyService = {
  assess: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/play-therapy/assess', {
      beneficiaryId,
      assessmentData: data,
    });
    return r.data;
  }),
  createPlan: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/play-therapy/plan', {
      beneficiaryId,
      planData: data,
    });
    return r.data;
  }),
  recordSession: safe(async (beneficiaryId, sessionData) => {
    const r = await apiClient.post('/disability-rehab/play-therapy/session', {
      beneficiaryId,
      sessionData,
    });
    return r.data;
  }),
  updateProfile: safe(async (beneficiaryId, profileData) => {
    const r = await apiClient.post('/disability-rehab/play-therapy/profile', {
      beneficiaryId,
      profileData,
    });
    return r.data;
  }),
  getProgress: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/play-therapy/progress/${beneficiaryId}`);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 16. العلاج بالروبوتات — Robotic Therapy
// ═══════════════════════════════════════════
export const roboticTherapyService = {
  assess: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/robotic-therapy/assess', {
      beneficiaryId,
      assessmentData: data,
    });
    return r.data;
  }),
  createPlan: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/robotic-therapy/plan', {
      beneficiaryId,
      planData: data,
    });
    return r.data;
  }),
  recordSession: safe(async (beneficiaryId, sessionData) => {
    const r = await apiClient.post('/disability-rehab/robotic-therapy/session', {
      beneficiaryId,
      sessionData,
    });
    return r.data;
  }),
  getDevices: safe(async () => {
    const r = await apiClient.get('/disability-rehab/robotic-therapy/devices');
    return r.data;
  }),
  getProgress: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/robotic-therapy/progress/${beneficiaryId}`);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 17. الرياضة التكيفية — Adaptive Sports
// ═══════════════════════════════════════════
export const adaptiveSportsService = {
  assess: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/adaptive-sports/assess', {
      beneficiaryId,
      assessmentData: data,
    });
    return r.data;
  }),
  createPlan: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/adaptive-sports/plan', {
      beneficiaryId,
      planData: data,
    });
    return r.data;
  }),
  recordSession: safe(async (beneficiaryId, sessionData) => {
    const r = await apiClient.post('/disability-rehab/adaptive-sports/session', {
      beneficiaryId,
      sessionData,
    });
    return r.data;
  }),
  recordAchievement: safe(async (beneficiaryId, achievementData) => {
    const r = await apiClient.post('/disability-rehab/adaptive-sports/achievement', {
      beneficiaryId,
      achievementData,
    });
    return r.data;
  }),
  getProgress: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/adaptive-sports/progress/${beneficiaryId}`);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 18. علاج صعوبات التعلم — Learning Disabilities
// ═══════════════════════════════════════════
export const learningDisabilitiesService = {
  assess: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/learning-disabilities/assess', {
      beneficiaryId,
      assessmentData: data,
    });
    return r.data;
  }),
  createPlan: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/learning-disabilities/plan', {
      beneficiaryId,
      planData: data,
    });
    return r.data;
  }),
  recordSession: safe(async (beneficiaryId, sessionData) => {
    const r = await apiClient.post('/disability-rehab/learning-disabilities/session', {
      beneficiaryId,
      sessionData,
    });
    return r.data;
  }),
  quickAssessment: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/learning-disabilities/quick-assessment', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  getProgress: safe(async beneficiaryId => {
    const r = await apiClient.get(
      `/disability-rehab/learning-disabilities/progress/${beneficiaryId}`
    );
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 19. التأهيل عن بُعد — Tele-Rehabilitation
// ═══════════════════════════════════════════
export const teleRehabService = {
  createSession: safe(async data => {
    const r = await apiClient.post('/disability-rehab/tele-rehab/session', data);
    return r.data;
  }),
  startSession: safe(async sessionId => {
    const r = await apiClient.post(`/disability-rehab/tele-rehab/start/${sessionId}`);
    return r.data;
  }),
  endSession: safe(async (sessionId, data) => {
    const r = await apiClient.post(`/disability-rehab/tele-rehab/end/${sessionId}`, data);
    return r.data;
  }),
  createPrescription: safe(async data => {
    const r = await apiClient.post('/disability-rehab/tele-rehab/prescription', data);
    return r.data;
  }),
  recordExerciseProgress: safe(async data => {
    const r = await apiClient.post('/disability-rehab/tele-rehab/exercise-progress', data);
    return r.data;
  }),
  getReport: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/tele-rehab/report/${beneficiaryId}`);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 20. التدخل المبكر — Early Intervention
// ═══════════════════════════════════════════
export const earlyInterventionService = {
  register: safe(async data => {
    const r = await apiClient.post('/disability-rehab/early-intervention/register', data);
    return r.data;
  }),
  screening: safe(async data => {
    const r = await apiClient.post('/disability-rehab/early-intervention/screening', data);
    return r.data;
  }),
  createPlan: safe(async data => {
    const r = await apiClient.post('/disability-rehab/early-intervention/plan', data);
    return r.data;
  }),
  recordSession: safe(async data => {
    const r = await apiClient.post('/disability-rehab/early-intervention/session', data);
    return r.data;
  }),
  getReport: safe(async caseId => {
    const r = await apiClient.get(`/disability-rehab/early-intervention/report/${caseId}`);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 21. دعم الأسرة — Family Support
// ═══════════════════════════════════════════
export const familySupportService = {
  register: safe(async data => {
    const r = await apiClient.post('/disability-rehab/family-support/register', data);
    return r.data;
  }),
  assess: safe(async data => {
    const r = await apiClient.post('/disability-rehab/family-support/assess', data);
    return r.data;
  }),
  counseling: safe(async data => {
    const r = await apiClient.post('/disability-rehab/family-support/counseling', data);
    return r.data;
  }),
  training: safe(async data => {
    const r = await apiClient.post('/disability-rehab/family-support/training', data);
    return r.data;
  }),
  getResources: safe(async familyId => {
    const r = await apiClient.get(
      `/disability-rehab/family-support/resources?familyId=${familyId}`
    );
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 22. الدمج المجتمعي — Community Integration
// ═══════════════════════════════════════════
export const communityIntegrationService = {
  createProgram: safe(async data => {
    const r = await apiClient.post('/disability-rehab/community-integration/program', data);
    return r.data;
  }),
  enroll: safe(async data => {
    const r = await apiClient.post('/disability-rehab/community-integration/enroll', data);
    return r.data;
  }),
  recordAttendance: safe(async data => {
    const r = await apiClient.post('/disability-rehab/community-integration/attendance', data);
    return r.data;
  }),
  assess: safe(async data => {
    const r = await apiClient.post('/disability-rehab/community-integration/assess', data);
    return r.data;
  }),
  getReport: safe(async beneficiaryId => {
    const r = await apiClient.get(
      `/disability-rehab/community-integration/report/${beneficiaryId}`
    );
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 23. التقنيات المساعدة — Assistive Technology
// ═══════════════════════════════════════════
export const assistiveTechApiService = {
  assess: safe(async data => {
    const r = await apiClient.post('/disability-rehab/assistive-tech/assess', data);
    return r.data;
  }),
  allocate: safe(async data => {
    const r = await apiClient.post('/disability-rehab/assistive-tech/allocate', data);
    return r.data;
  }),
  training: safe(async data => {
    const r = await apiClient.post('/disability-rehab/assistive-tech/training', data);
    return r.data;
  }),
  maintenance: safe(async data => {
    const r = await apiClient.post('/disability-rehab/assistive-tech/maintenance', data);
    return r.data;
  }),
  getDevices: safe(async () => {
    const r = await apiClient.get('/disability-rehab/assistive-tech/devices');
    return r.data;
  }),
  getReport: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/assistive-tech/report/${beneficiaryId}`);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 24. إدارة الحالات — Case Management
// ═══════════════════════════════════════════
export const caseManagementService = {
  create: safe(async data => {
    const r = await apiClient.post('/disability-rehab/case-management/create', data);
    return r.data;
  }),
  assignTeam: safe(async data => {
    const r = await apiClient.post('/disability-rehab/case-management/assign-team', data);
    return r.data;
  }),
  updateStatus: safe(async data => {
    const r = await apiClient.post('/disability-rehab/case-management/update-status', data);
    return r.data;
  }),
  addNote: safe(async data => {
    const r = await apiClient.post('/disability-rehab/case-management/note', data);
    return r.data;
  }),
  getReport: safe(async caseId => {
    const r = await apiClient.get(`/disability-rehab/case-management/report/${caseId}`);
    return r.data;
  }),
  getDashboard: safe(async () => {
    const r = await apiClient.get('/disability-rehab/case-management/dashboard');
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 25. التربية الخاصة — Special Education
// ═══════════════════════════════════════════
export const specialEducationService = {
  enroll: safe(async data => {
    const r = await apiClient.post('/disability-rehab/special-education/enroll', data);
    return r.data;
  }),
  createIEP: safe(async data => {
    const r = await apiClient.post('/disability-rehab/special-education/iep', data);
    return r.data;
  }),
  addGoal: safe(async data => {
    const r = await apiClient.post('/disability-rehab/special-education/goal', data);
    return r.data;
  }),
  recordProgress: safe(async data => {
    const r = await apiClient.post('/disability-rehab/special-education/progress', data);
    return r.data;
  }),
  createTransitionPlan: safe(async data => {
    const r = await apiClient.post('/disability-rehab/special-education/transition-plan', data);
    return r.data;
  }),
  getIEPReport: safe(async studentId => {
    const r = await apiClient.get(`/disability-rehab/special-education/iep-report/${studentId}`);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 26. التأهيل السكني — Residential Rehabilitation
// ═══════════════════════════════════════════
export const residentialRehabService = {
  admission: safe(async data => {
    const r = await apiClient.post('/disability-rehab/residential-rehab/admission', data);
    return r.data;
  }),
  assess: safe(async data => {
    const r = await apiClient.post('/disability-rehab/residential-rehab/assess', data);
    return r.data;
  }),
  createCarePlan: safe(async data => {
    const r = await apiClient.post('/disability-rehab/residential-rehab/care-plan', data);
    return r.data;
  }),
  recordDailyActivity: safe(async data => {
    const r = await apiClient.post('/disability-rehab/residential-rehab/daily-activity', data);
    return r.data;
  }),
  recordIncident: safe(async data => {
    const r = await apiClient.post('/disability-rehab/residential-rehab/incident', data);
    return r.data;
  }),
  recordFamilyVisit: safe(async data => {
    const r = await apiClient.post('/disability-rehab/residential-rehab/family-visit', data);
    return r.data;
  }),
  getReport: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/residential-rehab/report/${beneficiaryId}`);
    return r.data;
  }),
};

// ═══════════════════════════════════════════════════════
// المميزات المتقدمة — Advanced Features
// ═══════════════════════════════════════════════════════

// ═══════════════════════════════════════════
// 27. المواعيد الذكية — Smart Scheduling
// ═══════════════════════════════════════════
export const smartSchedulingService = {
  createAppointment: safe(async data => {
    const r = await apiClient.post('/disability-rehab/scheduling/appointment', data);
    return r.data;
  }),
  updateAppointment: safe(async (appointmentId, data) => {
    const r = await apiClient.put(
      `/disability-rehab/scheduling/appointment/${appointmentId}`,
      data
    );
    return r.data;
  }),
  cancelAppointment: safe(async appointmentId => {
    const r = await apiClient.post(`/disability-rehab/scheduling/cancel/${appointmentId}`);
    return r.data;
  }),
  getTherapistSchedule: safe(async (therapistId, params = {}) => {
    const r = await apiClient.get(`/disability-rehab/scheduling/therapist/${therapistId}`, {
      params,
    });
    return r.data;
  }),
  getBeneficiarySchedule: safe(async (beneficiaryId, params = {}) => {
    const r = await apiClient.get(`/disability-rehab/scheduling/beneficiary/${beneficiaryId}`, {
      params,
    });
    return r.data;
  }),
  addToWaitlist: safe(async data => {
    const r = await apiClient.post('/disability-rehab/scheduling/waitlist', data);
    return r.data;
  }),
  getStats: safe(async () => {
    const r = await apiClient.get('/disability-rehab/scheduling/stats');
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 28. رضا المستفيدين — Satisfaction & Feedback
// ═══════════════════════════════════════════
export const satisfactionService = {
  sendSurvey: safe(async data => {
    const r = await apiClient.post('/disability-rehab/satisfaction/survey', data);
    return r.data;
  }),
  submitResponse: safe(async (surveyId, data) => {
    const r = await apiClient.post(`/disability-rehab/satisfaction/response/${surveyId}`, data);
    return r.data;
  }),
  submitComplaint: safe(async data => {
    const r = await apiClient.post('/disability-rehab/satisfaction/complaint', data);
    return r.data;
  }),
  updateComplaint: safe(async (complaintId, data) => {
    const r = await apiClient.put(`/disability-rehab/satisfaction/complaint/${complaintId}`, data);
    return r.data;
  }),
  submitSuggestion: safe(async data => {
    const r = await apiClient.post('/disability-rehab/satisfaction/suggestion', data);
    return r.data;
  }),
  getReport: safe(async (params = {}) => {
    const r = await apiClient.get('/disability-rehab/satisfaction/report', { params });
    return r.data;
  }),
  getDashboard: safe(async () => {
    const r = await apiClient.get('/disability-rehab/satisfaction/dashboard');
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 29. التقييم بالذكاء الاصطناعي — AI Assessment
// ═══════════════════════════════════════════
export const aiAssessmentService = {
  conduct: safe(async data => {
    const r = await apiClient.post('/disability-rehab/ai-assessment/conduct', data);
    return r.data;
  }),
  predict: safe(async data => {
    const r = await apiClient.post('/disability-rehab/ai-assessment/predict', data);
    return r.data;
  }),
  getRisk: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/ai-assessment/risk/${beneficiaryId}`);
    return r.data;
  }),
  getTrends: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/ai-assessment/trends/${beneficiaryId}`);
    return r.data;
  }),
  getReport: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/ai-assessment/report/${beneficiaryId}`);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 30. التنبيهات والإشعارات — Alerts & Notifications
// ═══════════════════════════════════════════
export const alertsService = {
  create: safe(async data => {
    const r = await apiClient.post('/disability-rehab/alerts/create', data);
    return r.data;
  }),
  analyzeSession: safe(async data => {
    const r = await apiClient.post('/disability-rehab/alerts/analyze-session', data);
    return r.data;
  }),
  checkAbsence: safe(async data => {
    const r = await apiClient.post('/disability-rehab/alerts/check-absence', data);
    return r.data;
  }),
  getAll: safe(async (params = {}) => {
    const r = await apiClient.get('/disability-rehab/alerts', { params });
    return r.data;
  }),
  markRead: safe(async alertId => {
    const r = await apiClient.put(`/disability-rehab/alerts/read/${alertId}`);
    return r.data;
  }),
  dismiss: safe(async alertId => {
    const r = await apiClient.put(`/disability-rehab/alerts/dismiss/${alertId}`);
    return r.data;
  }),
  resolve: safe(async (alertId, data) => {
    const r = await apiClient.put(`/disability-rehab/alerts/resolve/${alertId}`, data);
    return r.data;
  }),
  setPreferences: safe(async data => {
    const r = await apiClient.post('/disability-rehab/alerts/preferences', data);
    return r.data;
  }),
  getReport: safe(async (params = {}) => {
    const r = await apiClient.get('/disability-rehab/alerts/report', { params });
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 31. لوحة تحكم المعالج — Therapist Dashboard
// ═══════════════════════════════════════════
export const therapistDashboardService = {
  register: safe(async data => {
    const r = await apiClient.post('/disability-rehab/therapist-dashboard/register', data);
    return r.data;
  }),
  assignBeneficiary: safe(async data => {
    const r = await apiClient.post('/disability-rehab/therapist-dashboard/assign', data);
    return r.data;
  }),
  recordPerformance: safe(async data => {
    const r = await apiClient.post('/disability-rehab/therapist-dashboard/performance', data);
    return r.data;
  }),
  getDashboard: safe(async therapistId => {
    const r = await apiClient.get(`/disability-rehab/therapist-dashboard/${therapistId}`);
    return r.data;
  }),
  getTeamReport: safe(async () => {
    const r = await apiClient.get('/disability-rehab/therapist-dashboard/team/report');
    return r.data;
  }),
  setGoal: safe(async data => {
    const r = await apiClient.post('/disability-rehab/therapist-dashboard/goal', data);
    return r.data;
  }),
  updateGoalProgress: safe(async (goalId, data) => {
    const r = await apiClient.put(`/disability-rehab/therapist-dashboard/goal/${goalId}`, data);
    return r.data;
  }),
};

// ═══════════════════════════════════════════════════════════════
//  Phase 7 — الخدمات المتقدمة الإضافية (32–44)
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════
// 32. العلاج الطبيعي المتقدم — Advanced Physical Therapy
// ═══════════════════════════════════════════
export const advancedPhysicalTherapyService = {
  createPlan: safe(async data => {
    const r = await apiClient.post('/disability-rehab/advanced-physical-therapy/plan', data);
    return r.data;
  }),
  recordSession: safe(async data => {
    const r = await apiClient.post('/disability-rehab/advanced-physical-therapy/session', data);
    return r.data;
  }),
  getPlan: safe(async planId => {
    const r = await apiClient.get(`/disability-rehab/advanced-physical-therapy/plan/${planId}`);
    return r.data;
  }),
  updatePlan: safe(async (planId, data) => {
    const r = await apiClient.put(
      `/disability-rehab/advanced-physical-therapy/plan/${planId}`,
      data
    );
    return r.data;
  }),
  getProgress: safe(async beneficiaryId => {
    const r = await apiClient.get(
      `/disability-rehab/advanced-physical-therapy/progress/${beneficiaryId}`
    );
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 33. الدعم النفسي المتقدم — Advanced Psychological Support
// ═══════════════════════════════════════════
export const advancedPsychologicalService = {
  assess: safe(async data => {
    const r = await apiClient.post('/disability-rehab/advanced-psychological/assess', data);
    return r.data;
  }),
  recordSession: safe(async data => {
    const r = await apiClient.post('/disability-rehab/advanced-psychological/session', data);
    return r.data;
  }),
  createGroupSession: safe(async data => {
    const r = await apiClient.post('/disability-rehab/advanced-psychological/group-session', data);
    return r.data;
  }),
  handleCrisis: safe(async data => {
    const r = await apiClient.post('/disability-rehab/advanced-psychological/crisis', data);
    return r.data;
  }),
  getProgress: safe(async beneficiaryId => {
    const r = await apiClient.get(
      `/disability-rehab/advanced-psychological/progress/${beneficiaryId}`
    );
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 34. علاج النطق المتقدم — Advanced Speech Therapy
// ═══════════════════════════════════════════
export const advancedSpeechService = {
  assess: safe(async data => {
    const r = await apiClient.post('/disability-rehab/advanced-speech/assess', data);
    return r.data;
  }),
  recordSession: safe(async data => {
    const r = await apiClient.post('/disability-rehab/advanced-speech/session', data);
    return r.data;
  }),
  setupAAC: safe(async data => {
    const r = await apiClient.post('/disability-rehab/advanced-speech/aac', data);
    return r.data;
  }),
  getProgress: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/advanced-speech/progress/${beneficiaryId}`);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 35. التأهيل المهني المتقدم — Advanced Vocational Rehab
// ═══════════════════════════════════════════
export const advancedVocationalService = {
  assess: safe(async data => {
    const r = await apiClient.post('/disability-rehab/advanced-vocational/assess', data);
    return r.data;
  }),
  createPlan: safe(async data => {
    const r = await apiClient.post('/disability-rehab/advanced-vocational/plan', data);
    return r.data;
  }),
  recommendAccommodations: safe(async data => {
    const r = await apiClient.post('/disability-rehab/advanced-vocational/accommodations', data);
    return r.data;
  }),
  trackProgress: safe(async data => {
    const r = await apiClient.post('/disability-rehab/advanced-vocational/progress', data);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 36. التدخل المبكر المتقدم — Advanced Early Intervention
// ═══════════════════════════════════════════
export const advancedEarlyInterventionService = {
  screening: safe(async data => {
    const r = await apiClient.post('/disability-rehab/advanced-early-intervention/screening', data);
    return r.data;
  }),
  familyTraining: safe(async data => {
    const r = await apiClient.post(
      '/disability-rehab/advanced-early-intervention/family-training',
      data
    );
    return r.data;
  }),
  recordProgress: safe(async data => {
    const r = await apiClient.post('/disability-rehab/advanced-early-intervention/progress', data);
    return r.data;
  }),
  getReport: safe(async childId => {
    const r = await apiClient.get(
      `/disability-rehab/advanced-early-intervention/report/${childId}`
    );
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 37. دعم الأسرة المتقدم — Advanced Family Support
// ═══════════════════════════════════════════
export const advancedFamilySupportService = {
  createProfile: safe(async data => {
    const r = await apiClient.post('/disability-rehab/advanced-family-support/profile', data);
    return r.data;
  }),
  counseling: safe(async data => {
    const r = await apiClient.post('/disability-rehab/advanced-family-support/counseling', data);
    return r.data;
  }),
  caregiverTraining: safe(async data => {
    const r = await apiClient.post(
      '/disability-rehab/advanced-family-support/caregiver-training',
      data
    );
    return r.data;
  }),
  respiteCare: safe(async data => {
    const r = await apiClient.post('/disability-rehab/advanced-family-support/respite-care', data);
    return r.data;
  }),
  supportGroup: safe(async data => {
    const r = await apiClient.post('/disability-rehab/advanced-family-support/support-group', data);
    return r.data;
  }),
  assessBurden: safe(async data => {
    const r = await apiClient.post(
      '/disability-rehab/advanced-family-support/caregiver-burden',
      data
    );
    return r.data;
  }),
  getReport: safe(async familyId => {
    const r = await apiClient.get(`/disability-rehab/advanced-family-support/report/${familyId}`);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 38. شهادة الإعاقة — Disability Certification
// ═══════════════════════════════════════════
export const disabilityCertificationService = {
  request: safe(async data => {
    const r = await apiClient.post('/disability-rehab/disability-certification/request', data);
    return r.data;
  }),
  assess: safe(async data => {
    const r = await apiClient.post('/disability-rehab/disability-certification/assess', data);
    return r.data;
  }),
  issue: safe(async data => {
    const r = await apiClient.post('/disability-rehab/disability-certification/issue', data);
    return r.data;
  }),
  renew: safe(async data => {
    const r = await apiClient.post('/disability-rehab/disability-certification/renew', data);
    return r.data;
  }),
  verify: safe(async certificateNumber => {
    const r = await apiClient.get(
      `/disability-rehab/disability-certification/verify/${certificateNumber}`
    );
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 39. خطة التأهيل الفردية — Individualized Rehab Plan
// ═══════════════════════════════════════════
export const rehabilitationPlanService = {
  create: safe(async data => {
    const r = await apiClient.post('/disability-rehab/rehabilitation-plan/create', data);
    return r.data;
  }),
  addGoal: safe(async data => {
    const r = await apiClient.post('/disability-rehab/rehabilitation-plan/goal', data);
    return r.data;
  }),
  updateGoalProgress: safe(async data => {
    const r = await apiClient.post('/disability-rehab/rehabilitation-plan/goal-progress', data);
    return r.data;
  }),
  addService: safe(async data => {
    const r = await apiClient.post('/disability-rehab/rehabilitation-plan/service', data);
    return r.data;
  }),
  recordServiceSession: safe(async data => {
    const r = await apiClient.post('/disability-rehab/rehabilitation-plan/service-session', data);
    return r.data;
  }),
  getReport: safe(async data => {
    const r = await apiClient.post('/disability-rehab/rehabilitation-plan/report', data);
    return r.data;
  }),
  review: safe(async data => {
    const r = await apiClient.post('/disability-rehab/rehabilitation-plan/review', data);
    return r.data;
  }),
  getPlan: safe(async planId => {
    const r = await apiClient.get(`/disability-rehab/rehabilitation-plan/${planId}`);
    return r.data;
  }),
  getByBeneficiary: safe(async beneficiaryId => {
    const r = await apiClient.get(
      `/disability-rehab/rehabilitation-plan/beneficiary/${beneficiaryId}`
    );
    return r.data;
  }),
  getTemplates: safe(async () => {
    const r = await apiClient.get('/disability-rehab/rehabilitation-plan/templates/list');
    return r.data;
  }),
  getGoalsBank: safe(async (params = {}) => {
    const r = await apiClient.get('/disability-rehab/rehabilitation-plan/goals-bank', { params });
    return r.data;
  }),
  customizeGoal: safe(async data => {
    const r = await apiClient.post('/disability-rehab/rehabilitation-plan/customize-goal', data);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 40. مقاييس التأهيل — Rehabilitation Metrics
// ═══════════════════════════════════════════
export const rehabMetricsService = {
  administer: safe(async data => {
    const r = await apiClient.post('/disability-rehab/rehab-metrics/administer', data);
    return r.data;
  }),
  getAvailable: safe(async (params = {}) => {
    const r = await apiClient.get('/disability-rehab/rehab-metrics/available', { params });
    return r.data;
  }),
  compare: safe(async data => {
    const r = await apiClient.post('/disability-rehab/rehab-metrics/compare', data);
    return r.data;
  }),
  createProfile: safe(async data => {
    const r = await apiClient.post('/disability-rehab/rehab-metrics/profile', data);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 41. تقارير التأهيل — Rehabilitation Reports
// ═══════════════════════════════════════════
export const rehabReportsService = {
  getIndividual: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/rehab-reports/individual/${beneficiaryId}`);
    return r.data;
  }),
  getCenter: safe(async centerId => {
    const r = await apiClient.get(`/disability-rehab/rehab-reports/center/${centerId}`);
    return r.data;
  }),
  getOutcomes: safe(async (params = {}) => {
    const r = await apiClient.get('/disability-rehab/rehab-reports/outcomes', { params });
    return r.data;
  }),
  getCompliance: safe(async (params = {}) => {
    const r = await apiClient.get('/disability-rehab/rehab-reports/compliance', { params });
    return r.data;
  }),
  createCustom: safe(async data => {
    const r = await apiClient.post('/disability-rehab/rehab-reports/custom', data);
    return r.data;
  }),
  exportReport: safe(async data => {
    const r = await apiClient.post('/disability-rehab/rehab-reports/export', data);
    return r.data;
  }),
  list: safe(async (params = {}) => {
    const r = await apiClient.get('/disability-rehab/rehab-reports/list', { params });
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 42. المزايا الاجتماعية السعودية — Saudi Social Benefits
// ═══════════════════════════════════════════
export const saudiBenefitsService = {
  checkEligibility: safe(async data => {
    const r = await apiClient.post('/disability-rehab/saudi-benefits/eligibility', data);
    return r.data;
  }),
  apply: safe(async data => {
    const r = await apiClient.post('/disability-rehab/saudi-benefits/apply', data);
    return r.data;
  }),
  review: safe(async data => {
    const r = await apiClient.post('/disability-rehab/saudi-benefits/review', data);
    return r.data;
  }),
  processPayment: safe(async data => {
    const r = await apiClient.post('/disability-rehab/saudi-benefits/payment', data);
    return r.data;
  }),
  getActive: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/saudi-benefits/active/${beneficiaryId}`);
    return r.data;
  }),
  renew: safe(async data => {
    const r = await apiClient.post('/disability-rehab/saudi-benefits/renew', data);
    return r.data;
  }),
  getMonthlyReport: safe(async (params = {}) => {
    const r = await apiClient.get('/disability-rehab/saudi-benefits/monthly-report', { params });
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 43. أنشطة علاج النطق — Speech Therapy Activities
// ═══════════════════════════════════════════
export const speechActivitiesService = {
  consonants: safe(async data => {
    const r = await apiClient.post('/disability-rehab/speech-activities/consonants', data);
    return r.data;
  }),
  vowels: safe(async data => {
    const r = await apiClient.post('/disability-rehab/speech-activities/vowels', data);
    return r.data;
  }),
  articulation: safe(async data => {
    const r = await apiClient.post('/disability-rehab/speech-activities/articulation', data);
    return r.data;
  }),
  getActivity: safe(async activityId => {
    const r = await apiClient.get(`/disability-rehab/speech-activities/activity/${activityId}`);
    return r.data;
  }),
  recordPerformance: safe(async data => {
    const r = await apiClient.post('/disability-rehab/speech-activities/performance', data);
    return r.data;
  }),
  getRecommended: safe(async beneficiaryId => {
    const r = await apiClient.get(
      `/disability-rehab/speech-activities/recommended/${beneficiaryId}`
    );
    return r.data;
  }),
  getProgress: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/speech-activities/progress/${beneficiaryId}`);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// 44. التقييم الموحد — Unified Assessment
// ═══════════════════════════════════════════
export const unifiedAssessmentService = {
  initial: safe(async data => {
    const r = await apiClient.post('/disability-rehab/unified-assessment/initial', data);
    return r.data;
  }),
  followUp: safe(async data => {
    const r = await apiClient.post('/disability-rehab/unified-assessment/follow-up', data);
    return r.data;
  }),
  getReport: safe(async assessmentId => {
    const r = await apiClient.get(`/disability-rehab/unified-assessment/report/${assessmentId}`);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// كتالوج الخدمات والتقرير الشامل
// ═══════════════════════════════════════════
export const rehabServicesCatalog = {
  getServicesCatalog: safe(async () => {
    const r = await apiClient.get('/disability-rehab/services-catalog');
    return r.data;
  }),
  getComprehensiveReport: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/comprehensive-report/${beneficiaryId}`);
    return r.data;
  }),
};

// ═══════════════════════════════════════════
// Phase 8 — خدمات ومميزات جديدة (45–52)
// ═══════════════════════════════════════════

// 45. العلاج السلوكي
export const behavioralTherapyService = {
  conductFBA: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/behavioral-therapy/fba', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  createBIP: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/behavioral-therapy/bip', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  recordSession: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/behavioral-therapy/session', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  recordIncident: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/behavioral-therapy/incident', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  manageReward: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/behavioral-therapy/reward', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  getProgress: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/behavioral-therapy/progress/${beneficiaryId}`);
    return r.data;
  }),
};

// 46. إدارة الألم
export const painManagementService = {
  assessPain: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/pain-management/assess', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  createPlan: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/pain-management/plan', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  recordSession: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/pain-management/session', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  logDiary: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/pain-management/diary', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  getReport: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/pain-management/report/${beneficiaryId}`);
    return r.data;
  }),
};

// 47. علاج اضطرابات النوم
export const sleepTherapyService = {
  assessSleep: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/sleep-therapy/assess', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  createPlan: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/sleep-therapy/plan', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  logDiary: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/sleep-therapy/diary', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  recordSession: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/sleep-therapy/session', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  getReport: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/sleep-therapy/report/${beneficiaryId}`);
    return r.data;
  }),
};

// 48. تدريب المهارات الاجتماعية
export const socialSkillsService = {
  assess: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/social-skills/assess', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  createProgram: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/social-skills/program', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  recordSession: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/social-skills/session', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  createGroup: safe(async data => {
    const r = await apiClient.post('/disability-rehab/social-skills/group', data);
    return r.data;
  }),
  getProgress: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/social-skills/progress/${beneficiaryId}`);
    return r.data;
  }),
};

// 49. تدريب الوالدين
export const parentalTrainingService = {
  enroll: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/parental-training/enroll', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  recordSession: safe(async (enrollmentId, data) => {
    const r = await apiClient.post('/disability-rehab/parental-training/session', {
      enrollmentId,
      ...data,
    });
    return r.data;
  }),
  assess: safe(async (enrollmentId, data) => {
    const r = await apiClient.post('/disability-rehab/parental-training/assess', {
      enrollmentId,
      ...data,
    });
    return r.data;
  }),
  issueCertificate: safe(async enrollmentId => {
    const r = await apiClient.post('/disability-rehab/parental-training/certificate', {
      enrollmentId,
    });
    return r.data;
  }),
  getModules: safe(async category => {
    const r = await apiClient.get('/disability-rehab/parental-training/modules', {
      params: { category },
    });
    return r.data;
  }),
  getReport: safe(async enrollmentId => {
    const r = await apiClient.get(`/disability-rehab/parental-training/report/${enrollmentId}`);
    return r.data;
  }),
};

// 50. التخطيط الانتقالي
export const transitionPlanningService = {
  assessReadiness: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/transition-planning/assess', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  createPlan: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/transition-planning/plan', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  recordMilestone: safe(async (planId, data) => {
    const r = await apiClient.post('/disability-rehab/transition-planning/milestone', {
      planId,
      ...data,
    });
    return r.data;
  }),
  reviewPlan: safe(async (planId, data) => {
    const r = await apiClient.post('/disability-rehab/transition-planning/review', {
      planId,
      ...data,
    });
    return r.data;
  }),
  getReport: safe(async id => {
    const r = await apiClient.get(`/disability-rehab/transition-planning/report/${id}`);
    return r.data;
  }),
};

// 51. ضمان الجودة
export const qualityAssuranceService = {
  conductAudit: safe(async data => {
    const r = await apiClient.post('/disability-rehab/quality-assurance/audit', data);
    return r.data;
  }),
  reportIncident: safe(async data => {
    const r = await apiClient.post('/disability-rehab/quality-assurance/incident', data);
    return r.data;
  }),
  createImprovement: safe(async data => {
    const r = await apiClient.post('/disability-rehab/quality-assurance/improvement', data);
    return r.data;
  }),
  recordKPI: safe(async data => {
    const r = await apiClient.post('/disability-rehab/quality-assurance/kpi', data);
    return r.data;
  }),
  getStandards: safe(async () => {
    const r = await apiClient.get('/disability-rehab/quality-assurance/standards');
    return r.data;
  }),
  getReport: safe(async params => {
    const r = await apiClient.get('/disability-rehab/quality-assurance/report', { params });
    return r.data;
  }),
};

// 52. بوابة المستفيد
export const beneficiaryPortalService = {
  manageProfile: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/beneficiary-portal/profile', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  getDashboard: safe(async beneficiaryId => {
    const r = await apiClient.get(
      `/disability-rehab/beneficiary-portal/dashboard/${beneficiaryId}`
    );
    return r.data;
  }),
  requestAppointment: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/beneficiary-portal/appointment', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  sendMessage: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/beneficiary-portal/message', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  uploadDocument: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/beneficiary-portal/document', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  trackGoal: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/beneficiary-portal/goal', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  submitFeedback: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/beneficiary-portal/feedback', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  getDocuments: safe(async beneficiaryId => {
    const r = await apiClient.get(
      `/disability-rehab/beneficiary-portal/documents/${beneficiaryId}`
    );
    return r.data;
  }),
};

// ==================== Phase 9 Services (53–61) ====================

// 53. خدمات الكراسي المتحركة والتنقل
export const wheelchairMobilityService = {
  assessMobilityNeeds: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/wheelchair-mobility/assess', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  prescribeDevice: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/wheelchair-mobility/prescribe', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  recordTraining: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/wheelchair-mobility/training', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  logMaintenance: safe(async (deviceId, data) => {
    const r = await apiClient.post('/disability-rehab/wheelchair-mobility/maintenance', {
      deviceId,
      ...data,
    });
    return r.data;
  }),
  getReport: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/wheelchair-mobility/report/${beneficiaryId}`);
    return r.data;
  }),
};

// 54. التأهيل السمعي
export const hearingRehabService = {
  assessHearing: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/hearing-rehab/assess', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  prescribeHearingAid: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/hearing-rehab/prescribe', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  recordSession: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/hearing-rehab/session', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  createCommunicationPlan: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/hearing-rehab/communication-plan', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  getReport: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/hearing-rehab/report/${beneficiaryId}`);
    return r.data;
  }),
};

// 55. التأهيل البصري
export const visualRehabService = {
  assessVision: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/visual-rehab/assess', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  prescribeVisualAid: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/visual-rehab/prescribe', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  recordOrientation: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/visual-rehab/orientation', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  recordDailyLiving: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/visual-rehab/daily-living', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  getReport: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/visual-rehab/report/${beneficiaryId}`);
    return r.data;
  }),
};

// 56. تأهيل الأمراض المزمنة
export const chronicDiseaseService = {
  assessChronic: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/chronic-disease/assess', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  createProgram: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/chronic-disease/program', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  recordSession: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/chronic-disease/session', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  recordVitals: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/chronic-disease/vitals', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  getReport: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/chronic-disease/report/${beneficiaryId}`);
    return r.data;
  }),
};

// 57. إدارة العلاج الجماعي
export const groupTherapyService = {
  createGroup: safe(async data => {
    const r = await apiClient.post('/disability-rehab/group-therapy/create', data);
    return r.data;
  }),
  enrollMember: safe(async (groupId, data) => {
    const r = await apiClient.post('/disability-rehab/group-therapy/enroll', { groupId, ...data });
    return r.data;
  }),
  recordSession: safe(async (groupId, data) => {
    const r = await apiClient.post('/disability-rehab/group-therapy/session', { groupId, ...data });
    return r.data;
  }),
  recordInteraction: safe(async (groupId, data) => {
    const r = await apiClient.post('/disability-rehab/group-therapy/interaction', {
      groupId,
      ...data,
    });
    return r.data;
  }),
  getReport: safe(async groupId => {
    const r = await apiClient.get(`/disability-rehab/group-therapy/report/${groupId}`);
    return r.data;
  }),
};

// 58. التأهيل المنزلي
export const homeRehabService = {
  assessHomeEnvironment: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/home-rehab/assess', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  scheduleVisit: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/home-rehab/visit', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  recordVisitResults: safe(async (visitId, data) => {
    const r = await apiClient.post('/disability-rehab/home-rehab/visit-results', {
      visitId,
      ...data,
    });
    return r.data;
  }),
  requestModification: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/home-rehab/modification', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  createProgram: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/home-rehab/program', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  getReport: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/home-rehab/report/${beneficiaryId}`);
    return r.data;
  }),
};

// 59. التأهيل الطارئ
export const emergencyRehabService = {
  triageEmergency: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/emergency-rehab/triage', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  recordSession: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/emergency-rehab/session', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  getProtocols: safe(async () => {
    const r = await apiClient.get('/disability-rehab/emergency-rehab/protocols');
    return r.data;
  }),
  createReferral: safe(async (beneficiaryId, data) => {
    const r = await apiClient.post('/disability-rehab/emergency-rehab/referral', {
      beneficiaryId,
      ...data,
    });
    return r.data;
  }),
  getReport: safe(async beneficiaryId => {
    const r = await apiClient.get(`/disability-rehab/emergency-rehab/report/${beneficiaryId}`);
    return r.data;
  }),
};

// 60. إدارة المتطوعين
export const volunteerService = {
  registerVolunteer: safe(async data => {
    const r = await apiClient.post('/disability-rehab/volunteers/register', data);
    return r.data;
  }),
  assignTask: safe(async (volunteerId, data) => {
    const r = await apiClient.post('/disability-rehab/volunteers/assign', { volunteerId, ...data });
    return r.data;
  }),
  logHours: safe(async (volunteerId, data) => {
    const r = await apiClient.post('/disability-rehab/volunteers/hours', { volunteerId, ...data });
    return r.data;
  }),
  evaluateVolunteer: safe(async (volunteerId, data) => {
    const r = await apiClient.post('/disability-rehab/volunteers/evaluate', {
      volunteerId,
      ...data,
    });
    return r.data;
  }),
  issueCertificate: safe(async (volunteerId, data) => {
    const r = await apiClient.post('/disability-rehab/volunteers/certificate', {
      volunteerId,
      ...data,
    });
    return r.data;
  }),
  getReport: safe(async volunteerId => {
    const r = await apiClient.get(`/disability-rehab/volunteers/report/${volunteerId}`);
    return r.data;
  }),
};

// 61. الدراسات والأبحاث
export const researchStudiesService = {
  createStudy: safe(async data => {
    const r = await apiClient.post('/disability-rehab/research/study', data);
    return r.data;
  }),
  enrollParticipant: safe(async (studyId, data) => {
    const r = await apiClient.post('/disability-rehab/research/participant', { studyId, ...data });
    return r.data;
  }),
  recordData: safe(async (studyId, data) => {
    const r = await apiClient.post('/disability-rehab/research/data', { studyId, ...data });
    return r.data;
  }),
  analyzeStudy: safe(async studyId => {
    const r = await apiClient.get(`/disability-rehab/research/analyze/${studyId}`);
    return r.data;
  }),
  createPublication: safe(async (studyId, data) => {
    const r = await apiClient.post('/disability-rehab/research/publication', { studyId, ...data });
    return r.data;
  }),
  getReport: safe(async studyId => {
    const r = await apiClient.get(`/disability-rehab/research/report/${studyId}`);
    return r.data;
  }),
};

export default {
  rehabProgramService,
  therapySessionService,
  specializedProgramService,
  assistiveDeviceService,
  rehabReportService,
  // Therapy services (6–13)
  artTherapyService,
  musicTherapyService,
  hydrotherapyService,
  abaTherapyService,
  cognitiveRehabService,
  sensoryIntegrationService,
  animalTherapyService,
  therapeuticNutritionService,
  // New therapy services (14–18)
  vrTherapyService,
  playTherapyService,
  roboticTherapyService,
  adaptiveSportsService,
  learningDisabilitiesService,
  // Support services (19–26)
  teleRehabService,
  earlyInterventionService,
  familySupportService,
  communityIntegrationService,
  assistiveTechApiService,
  caseManagementService,
  specialEducationService,
  residentialRehabService,
  // Advanced features (27–31)
  smartSchedulingService,
  satisfactionService,
  aiAssessmentService,
  alertsService,
  therapistDashboardService,
  // Phase 7 services (32–44)
  advancedPhysicalTherapyService,
  advancedPsychologicalService,
  advancedSpeechService,
  advancedVocationalService,
  advancedEarlyInterventionService,
  advancedFamilySupportService,
  disabilityCertificationService,
  rehabilitationPlanService,
  rehabMetricsService,
  rehabReportsService,
  saudiBenefitsService,
  speechActivitiesService,
  unifiedAssessmentService,
  rehabServicesCatalog,
  // Phase 8 services (45–52)
  behavioralTherapyService,
  painManagementService,
  sleepTherapyService,
  socialSkillsService,
  parentalTrainingService,
  transitionPlanningService,
  qualityAssuranceService,
  beneficiaryPortalService,
  // Phase 9 services (53–61)
  wheelchairMobilityService,
  hearingRehabService,
  visualRehabService,
  chronicDiseaseService,
  groupTherapyService,
  homeRehabService,
  emergencyRehabService,
  volunteerService,
  researchStudiesService,
};
