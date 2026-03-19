/**
 * 🗂️ خدمة الأرشفة الإلكترونية — Electronic Archiving Service
 * AlAwael ERP — Document archiving, classification, retention, search & analytics
 * @created 2026-03-13
 */
import apiClient from './api.client';
import logger from '../utils/logger';

const safe = (fn, fallback = null) =>
  fn().catch(err => {
    logger.warn('archivingService ▸', err.message);
    return fallback;
  });

/* ═══ Static Constants ═══ */
const CATEGORIES = [
  { id: 'financial', label: 'مالية', icon: '💰', color: '#43A047' },
  { id: 'hr', label: 'موارد بشرية', icon: '👥', color: '#1E88E5' },
  { id: 'contracts', label: 'عقود واتفاقيات', icon: '📋', color: '#E53935' },
  { id: 'legal', label: 'قانونية وامتثال', icon: '⚖️', color: '#9C27B0' },
  { id: 'projects', label: 'مشاريع', icon: '🎯', color: '#FF9800' },
  { id: 'reports', label: 'تقارير', icon: '📊', color: '#00BCD4' },
  { id: 'correspondence', label: 'مراسلات', icon: '✉️', color: '#795548' },
  { id: 'safety', label: 'صحة وسلامة', icon: '🛡️', color: '#607D8B' },
  { id: 'it', label: 'تكنولوجيا المعلومات', icon: '💻', color: '#3F51B5' },
  { id: 'marketing', label: 'تسويق ومبيعات', icon: '📢', color: '#FF5722' },
  { id: 'education', label: 'تعليم وتدريب', icon: '📚', color: '#009688' },
  { id: 'other', label: 'أخرى', icon: '📁', color: '#757575' },
];

const CLASSIFICATION_LEVELS = [
  { id: 'public', label: 'عام', color: '#43A047' },
  { id: 'internal', label: 'داخلي', color: '#1E88E5' },
  { id: 'confidential', label: 'سري', color: '#FF9800' },
  { id: 'secret', label: 'سري للغاية', color: '#E53935' },
];

const DOCUMENT_STATUSES = ['مسودة', 'نشط', 'مؤرشف', 'معلق', 'مستعاد', 'محذوف'];

const FILE_TYPES = [
  { ext: 'pdf', label: 'PDF', icon: '📄', color: '#E53935' },
  { ext: 'doc', label: 'Word', icon: '📝', color: '#1E88E5' },
  { ext: 'docx', label: 'Word', icon: '📝', color: '#1E88E5' },
  { ext: 'xls', label: 'Excel', icon: '📊', color: '#43A047' },
  { ext: 'xlsx', label: 'Excel', icon: '📊', color: '#43A047' },
  { ext: 'ppt', label: 'PowerPoint', icon: '📺', color: '#FF9800' },
  { ext: 'pptx', label: 'PowerPoint', icon: '📺', color: '#FF9800' },
  { ext: 'jpg', label: 'صورة', icon: '🖼️', color: '#9C27B0' },
  { ext: 'png', label: 'صورة', icon: '🖼️', color: '#9C27B0' },
  { ext: 'zip', label: 'مضغوط', icon: '📦', color: '#795548' },
  { ext: 'txt', label: 'نص', icon: '📃', color: '#607D8B' },
];

const RETENTION_POLICIES = [
  { id: 'default', label: 'افتراضي (3 سنوات)', days: 1095 },
  { id: 'compliance', label: 'امتثال (7 سنوات)', days: 2555 },
  { id: 'legal', label: 'قانوني (10 سنوات)', days: 3650 },
  { id: 'permanent', label: 'دائم', days: -1 },
  { id: 'temporary', label: 'مؤقت (شهر)', days: 30 },
];

const DEPARTMENTS = [
  'الإدارة العامة',
  'المالية',
  'الموارد البشرية',
  'تقنية المعلومات',
  'المشاريع',
  'التسويق',
  'الشؤون القانونية',
  'خدمة العملاء',
  'العمليات',
  'التدريب والتطوير',
  'المشتريات',
  'المخازن',
];

/* ═══ Mock Data ═══ */
const MOCK_DOCUMENTS = Array.from({ length: 30 }, (_, i) => {
  const cat = CATEGORIES[i % CATEGORIES.length];
  const status = DOCUMENT_STATUSES[i % 4]; // cycle through active statuses
  const ftype = FILE_TYPES[i % FILE_TYPES.length];
  const classif = CLASSIFICATION_LEVELS[i % CLASSIFICATION_LEVELS.length];
  const dept = DEPARTMENTS[i % DEPARTMENTS.length];
  const dd = new Date(2025, i % 12, 1 + ((i * 2) % 28));
  return {
    _id: `doc-${i + 1}`,
    documentNumber: `DOC-${new Date().getFullYear()}-${String(i + 1).padStart(5, '0')}`,
    title: [
      'تقرير الميزانية السنوية 2025',
      'عقد توريد معدات مكتبية',
      'محضر اجتماع مجلس الإدارة',
      'سياسة السلامة المهنية',
      'خطة المشروع التعليمي',
      'تقرير أداء الربع الثالث',
      'مراسلة رسمية — وزارة التعليم',
      'تقرير الصيانة الدورية',
      'خطة النسخ الاحتياطي',
      'حملة تسويقية — الفصل الصيفي',
      'دليل التدريب للموظفين الجدد',
      'فاتورة مشتريات #4421',
      'تقرير مالي ربعي Q4-2025',
      'عقد تأجير المبنى الفرعي',
      'محضر لجنة الموارد البشرية',
      'تقييم المخاطر — المبنى الرئيسي',
      'خطة إطلاق المنتج الجديد',
      'تقرير التدقيق السنوي',
      'خطاب شكر رسمي',
      'تقرير حوادث العمل Q2',
      'مواصفات النظام الجديد',
      'عرض تسويقي للمعرض',
      'شهادات تدريب — الدفعة 12',
      'كشف حساب شهري',
      'عقد خدمات استشارية',
      'محضر اجتماع اللجنة التنفيذية',
      'تقرير الامتثال السنوي',
      'خطة التوظيف 2026',
      'تقرير أداء المشروع',
      'مذكرة داخلية — الإدارة المالية',
    ][i],
    description: `وصف مختصر للمستند رقم ${i + 1} — ${cat.label}`,
    category: cat.id,
    categoryLabel: cat.label,
    categoryIcon: cat.icon,
    classification: classif.id,
    classificationLabel: classif.label,
    department: dept,
    fileType: ftype.ext,
    fileTypeLabel: ftype.label,
    fileIcon: ftype.icon,
    fileSize: Math.floor(50 + Math.random() * 15000) * 1024, // bytes
    version: 1 + (i % 4),
    versions: Array.from({ length: 1 + (i % 4) }, (__, v) => ({
      version: v + 1,
      date: new Date(2025, i % 12, 1 + v * 10).toISOString().slice(0, 10),
      uploadedBy: ['أحمد المنصور', 'ليلى الحربي', 'خالد العتيبي'][v % 3],
      notes: v === 0 ? 'النسخة الأولية' : `تحديث رقم ${v}`,
    })),
    status,
    tags: [
      ['ميزانية', 'مالي', '2025'],
      ['توريد', 'عقد', 'معدات'],
      ['اجتماع', 'مجلس', 'إدارة'],
      ['سلامة', 'سياسة', 'مهنية'],
    ][i % 4],
    author: ['أحمد المنصور', 'فاطمة السعيد', 'خالد العتيبي', 'ليلى الحربي', 'سعود الغامدي'][i % 5],
    retentionPolicy: RETENTION_POLICIES[i % 3].id,
    retentionLabel: RETENTION_POLICIES[i % 3].label,
    referenceNumber: `REF-${2025}-${String(1000 + i)}`,
    documentDate: dd.toISOString().slice(0, 10),
    createdAt: dd.toISOString(),
    updatedAt: new Date(dd.getTime() + 86400000 * (i % 30)).toISOString(),
    accessCount: Math.floor(Math.random() * 200),
    lastAccessedAt: new Date().toISOString(),
    physicalLocation:
      i % 3 === 0
        ? {
            building: 'المبنى الرئيسي',
            floor: `الدور ${(i % 3) + 1}`,
            room: `غرفة ${100 + i}`,
            cabinet: `خزانة ${(i % 5) + 1}`,
          }
        : null,
  };
});

const MOCK_ACTIVITY_LOG = Array.from({ length: 25 }, (_, i) => {
  const actions = [
    'رفع مستند',
    'تحديث بيانات',
    'تحميل',
    'أرشفة',
    'استعادة',
    'حذف',
    'مشاركة',
    'طباعة',
    'تعليق',
    'إنشاء نسخة',
  ];
  const users = ['أحمد المنصور', 'فاطمة السعيد', 'خالد العتيبي', 'ليلى الحربي', 'سعود الغامدي'];
  const d = new Date();
  d.setHours(d.getHours() - i * 3);
  return {
    _id: `log-${i + 1}`,
    action: actions[i % actions.length],
    user: users[i % users.length],
    document: MOCK_DOCUMENTS[i % MOCK_DOCUMENTS.length].title,
    documentNumber: MOCK_DOCUMENTS[i % MOCK_DOCUMENTS.length].documentNumber,
    timestamp: d.toISOString(),
    ip: `192.168.1.${100 + (i % 50)}`,
  };
});

const MOCK_STORAGE_STATS = {
  totalStorage: 50 * 1024 * 1024 * 1024, // 50 GB
  usedStorage: 23.7 * 1024 * 1024 * 1024,
  documentsCount: 30,
  archivedCount: 8,
  pendingCount: 3,
  categoryCounts: CATEGORIES.reduce((acc, c, i) => {
    acc[c.id] = {
      count: 2 + (i % 5),
      size: (0.5 + Math.random() * 4) * 1024 * 1024 * 1024,
      label: c.label,
      icon: c.icon,
      color: c.color,
    };
    return acc;
  }, {}),
  monthlyUploads: [
    { month: 'أكتوبر', uploads: 45, size: 1.2 },
    { month: 'نوفمبر', uploads: 62, size: 1.8 },
    { month: 'ديسمبر', uploads: 38, size: 1.1 },
    { month: 'يناير', uploads: 71, size: 2.3 },
    { month: 'فبراير', uploads: 55, size: 1.7 },
    { month: 'مارس', uploads: 48, size: 1.4 },
  ],
  fileTypeDistribution: FILE_TYPES.slice(0, 7).map((ft, i) => ({
    name: ft.label,
    value: 3 + i * 2 + Math.floor(Math.random() * 10),
    color: ft.color,
  })),
  classificationDistribution: CLASSIFICATION_LEVELS.map((cl, i) => ({
    name: cl.label,
    value: 5 + i * 3 + Math.floor(Math.random() * 8),
    color: cl.color,
  })),
  recentSearches: ['تقرير مالي', 'عقد توريد', 'محضر اجتماع', 'سياسة السلامة', 'خطة مشروع'],
};

/* ═══ Service Methods ═══ */
const archivingService = {
  // ─── Constants ───
  getCategories: () => CATEGORIES,
  getClassificationLevels: () => CLASSIFICATION_LEVELS,
  getDocumentStatuses: () => DOCUMENT_STATUSES,
  getFileTypes: () => FILE_TYPES,
  getRetentionPolicies: () => RETENTION_POLICIES,
  getDepartments: () => DEPARTMENTS,

  // ─── Documents CRUD ───
  getDocuments: (params = {}) =>
    safe(
      () =>
        apiClient.get('/api/archive/documents', { params }).then(r => r.data?.documents || r.data),
      MOCK_DOCUMENTS
    ),

  getDocument: id =>
    safe(
      () => apiClient.get(`/api/archive/documents/${id}`).then(r => r.data?.document || r.data),
      MOCK_DOCUMENTS.find(d => d._id === id) || null
    ),

  createDocument: data =>
    safe(
      () =>
        apiClient
          .post('/api/archive/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } })
          .then(r => r.data),
      {
        success: true,
        document: { ...data, _id: `doc-new-${Date.now()}`, documentNumber: `DOC-${Date.now()}` },
      }
    ),

  updateDocument: (id, data) =>
    safe(() => apiClient.put(`/api/archive/documents/${id}`, data).then(r => r.data), {
      success: true,
    }),

  deleteDocument: id =>
    safe(() => apiClient.delete(`/api/archive/documents/${id}`).then(r => r.data), {
      success: true,
    }),

  archiveDocument: id =>
    safe(() => apiClient.post(`/api/archive/documents/${id}/archive`).then(r => r.data), {
      success: true,
    }),

  downloadDocument: id =>
    safe(
      () => apiClient.get(`/api/archive/documents/${id}/download`, { responseType: 'blob' }),
      null
    ),

  createVersion: (id, data) =>
    safe(
      () =>
        apiClient
          .post(`/api/archive/documents/${id}/version`, data, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          .then(r => r.data),
      { success: true }
    ),

  // ─── Search & Filter ───
  searchDocuments: (query = '', filters = {}) =>
    safe(
      () =>
        apiClient
          .get('/api/archive/search', { params: { q: query, ...filters } })
          .then(r => r.data?.documents || r.data),
      MOCK_DOCUMENTS.filter(d => {
        if (
          query &&
          !Object.values(d).some(v => String(v).toLowerCase().includes(query.toLowerCase()))
        )
          return false;
        if (filters.category && d.category !== filters.category) return false;
        if (filters.status && d.status !== filters.status) return false;
        if (filters.classification && d.classification !== filters.classification) return false;
        if (filters.department && d.department !== filters.department) return false;
        return true;
      })
    ),

  // ─── Analytics & Stats ───
  getStorageStats: () =>
    safe(() => apiClient.get('/api/archive/stats').then(r => r.data), MOCK_STORAGE_STATS),

  getActivityLog: () =>
    safe(
      () => apiClient.get('/api/archive/activity').then(r => r.data?.activities || r.data),
      MOCK_ACTIVITY_LOG
    ),

  // ─── Retention ───
  getRetentionReport: () =>
    safe(() => apiClient.get('/api/archive/retention-report').then(r => r.data), {
      expiringSoon: MOCK_DOCUMENTS.filter((_, i) => i % 7 === 0).map(d => ({
        ...d,
        daysLeft: Math.floor(Math.random() * 30),
      })),
      expired: MOCK_DOCUMENTS.filter((_, i) => i % 10 === 0),
      totalRetained: MOCK_DOCUMENTS.length,
    }),

  // ─── Helpers ───
  formatFileSize: bytes => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    return `${size.toFixed(1)} ${units[i]}`;
  },
};

export default archivingService;
