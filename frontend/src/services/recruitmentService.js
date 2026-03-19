/**
 * 🎯 خدمة التوظيف والاستقطاب — Recruitment & Hiring Service
 * AlAwael ERP
 */
import apiClient from './api.client';
import logger from '../utils/logger';

const safe = (fn, fallback = null) =>
  fn().catch(err => {
    logger.warn('recruitmentService ▸', err.message);
    return fallback;
  });

/* ─── Mock Data ─── */
export const MOCK_JOB_POSTINGS = Array.from({ length: 18 }, (_, i) => ({
  _id: `job-${i + 1}`,
  title: [
    'معلم تربية خاصة',
    'أخصائي نطق وتخاطب',
    'أخصائي علاج وظيفي',
    'أخصائي علاج طبيعي',
    'مسؤول موارد بشرية',
    'محاسب مالي',
    'مبرمج تطبيقات',
    'مدير مشاريع',
    'أخصائي نفسي',
    'ممرض/ة',
    'سائق نقل',
    'مسؤول مشتريات',
    'معلم فنون',
    'أخصائي تغذية',
    'فني صيانة',
    'مشرف أمن',
    'مساعد إداري',
    'مصمم جرافيك',
  ][i],
  department: [
    'التعليم',
    'العلاج والتأهيل',
    'العلاج والتأهيل',
    'العلاج والتأهيل',
    'الموارد البشرية',
    'المالية',
    'تقنية المعلومات',
    'الإدارة',
    'العلاج والتأهيل',
    'الصحة',
    'النقل',
    'المشتريات',
    'التعليم',
    'الصحة',
    'الصيانة',
    'الأمن',
    'الإدارة',
    'التسويق',
  ][i],
  location: ['الرياض', 'جدة', 'الدمام', 'الرياض'][i % 4],
  type: ['دوام كامل', 'دوام جزئي', 'دوام كامل', 'عقد مؤقت'][i % 4],
  experience: `${(i % 5) + 1}-${(i % 5) + 4} سنوات`,
  salary: { min: 5000 + i * 500, max: 8000 + i * 700 },
  status: ['مفتوح', 'مفتوح', 'قيد المراجعة', 'مغلق', 'مفتوح'][i % 5],
  applicantsCount: Math.floor(Math.random() * 30) + 3,
  publishDate: new Date(2026, 0, 15 + i).toISOString(),
  closingDate: new Date(2026, 2, 15 + i).toISOString(),
  requirements: ['مؤهل جامعي مناسب', 'خبرة عملية', 'إجادة اللغتين العربية والإنجليزية'],
  description: 'وظيفة مميزة في بيئة عمل احترافية تدعم التطور والنمو المهني.',
}));

export const MOCK_APPLICANTS = Array.from({ length: 25 }, (_, i) => ({
  _id: `app-${i + 1}`,
  name: [
    'أحمد محمد العتيبي',
    'سارة خالد القحطاني',
    'فهد عبدالله الشهري',
    'نورة سعد الدوسري',
    'محمد علي الغامدي',
    'هند فيصل العنزي',
    'خالد إبراهيم الزهراني',
    'ريم عبدالرحمن المالكي',
    'عبدالعزيز حسن الحربي',
    'لمياء سلطان السبيعي',
    'سلطان ماجد المطيري',
    'أمل ياسر الرشيدي',
    'ياسر عمر البلوي',
    'دانة حمد التميمي',
    'عمر سعود الشمري',
    'وفاء خالد العمري',
    'حسن أحمد الجهني',
    'مها عادل الخالدي',
    'بندر محمد الهاجري',
    'رغد سامي العسيري',
    'سعد عبدالله القرني',
    'هيفاء فهد السويلم',
    'ماجد حسين الدريس',
    'نوال إبراهيم اليامي',
    'طلال سعد الثبيتي',
  ][i],
  email: `applicant${i + 1}@email.com`,
  phone: `05${String(50000000 + i * 111111).padStart(8, '0')}`,
  jobId: `job-${(i % 18) + 1}`,
  jobTitle: MOCK_JOB_POSTINGS[i % 18].title,
  stage: [
    'تقديم جديد',
    'فرز أولي',
    'مقابلة هاتفية',
    'مقابلة شخصية',
    'اختبار فني',
    'عرض وظيفي',
    'تعيين',
  ][i % 7],
  rating: +(Math.random() * 3 + 2).toFixed(1),
  appliedDate: new Date(2026, 1, 1 + i).toISOString(),
  experience: `${(i % 8) + 1} سنوات`,
  education: ['بكالوريوس', 'ماجستير', 'دبلوم', 'بكالوريوس', 'دكتوراه'][i % 5],
  status: ['نشط', 'نشط', 'مرفوض', 'نشط', 'معين'][i % 5],
  notes: '',
  resumeUrl: '#',
}));

export const MOCK_RECRUITMENT_DASHBOARD = {
  openPositions: 12,
  totalApplicants: 156,
  interviewsThisWeek: 8,
  hiredThisMonth: 3,
  avgTimeToHire: 28,
  avgCostPerHire: 3500,
  pipelineDistribution: [
    { stage: 'تقديم جديد', count: 45 },
    { stage: 'فرز أولي', count: 32 },
    { stage: 'مقابلة هاتفية', count: 24 },
    { stage: 'مقابلة شخصية', count: 18 },
    { stage: 'اختبار فني', count: 12 },
    { stage: 'عرض وظيفي', count: 5 },
    { stage: 'تعيين', count: 3 },
  ],
  departmentHiring: [
    { department: 'التعليم', openings: 4, applicants: 42 },
    { department: 'العلاج والتأهيل', openings: 3, applicants: 35 },
    { department: 'تقنية المعلومات', openings: 2, applicants: 28 },
    { department: 'الإدارة', openings: 1, applicants: 18 },
    { department: 'المالية', openings: 1, applicants: 15 },
    { department: 'الصيانة', openings: 1, applicants: 10 },
  ],
  monthlyHiring: [
    { month: 'سبتمبر', applications: 25, interviews: 10, hires: 2 },
    { month: 'أكتوبر', applications: 32, interviews: 14, hires: 3 },
    { month: 'نوفمبر', applications: 28, interviews: 12, hires: 2 },
    { month: 'ديسمبر', applications: 18, interviews: 8, hires: 1 },
    { month: 'يناير', applications: 40, interviews: 18, hires: 4 },
    { month: 'فبراير', applications: 35, interviews: 15, hires: 3 },
  ],
  sourceDistribution: [
    { source: 'موقع الشركة', count: 45, percentage: 29 },
    { source: 'لينكدإن', count: 38, percentage: 24 },
    { source: 'توصيات الموظفين', count: 28, percentage: 18 },
    { source: 'وكالات التوظيف', count: 22, percentage: 14 },
    { source: 'معارض التوظيف', count: 15, percentage: 10 },
    { source: 'أخرى', count: 8, percentage: 5 },
  ],
};

/* ─── API Wrappers ─── */
export const jobPostingsService = {
  getAll: () => safe(() => apiClient.get('/recruitment/jobs').then(r => r.data), MOCK_JOB_POSTINGS),
  getById: id => safe(() => apiClient.get(`/recruitment/jobs/${id}`).then(r => r.data)),
  create: d => safe(() => apiClient.post('/recruitment/jobs', d).then(r => r.data), d),
  update: (id, d) => safe(() => apiClient.put(`/recruitment/jobs/${id}`, d).then(r => r.data), d),
  remove: id =>
    safe(() => apiClient.delete(`/recruitment/jobs/${id}`).then(r => r.data), { success: true }),
  close: id =>
    safe(() => apiClient.patch(`/recruitment/jobs/${id}/close`).then(r => r.data), {
      success: true,
    }),
};

export const applicantsService = {
  getAll: () =>
    safe(() => apiClient.get('/recruitment/applicants').then(r => r.data), MOCK_APPLICANTS),
  getById: id => safe(() => apiClient.get(`/recruitment/applicants/${id}`).then(r => r.data)),
  create: d => safe(() => apiClient.post('/recruitment/applicants', d).then(r => r.data), d),
  update: (id, d) =>
    safe(() => apiClient.put(`/recruitment/applicants/${id}`, d).then(r => r.data), d),
  updateStage: (id, stage) =>
    safe(
      () => apiClient.patch(`/recruitment/applicants/${id}/stage`, { stage }).then(r => r.data),
      { stage }
    ),
  reject: (id, reason) =>
    safe(
      () => apiClient.patch(`/recruitment/applicants/${id}/reject`, { reason }).then(r => r.data),
      { success: true }
    ),
  hire: id =>
    safe(() => apiClient.patch(`/recruitment/applicants/${id}/hire`).then(r => r.data), {
      success: true,
    }),
};

export const recruitmentReportsService = {
  getDashboardStats: () =>
    safe(
      () => apiClient.get('/recruitment/dashboard').then(r => r.data),
      MOCK_RECRUITMENT_DASHBOARD
    ),
};
