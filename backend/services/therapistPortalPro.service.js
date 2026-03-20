/**
 * Therapist Portal Pro Service — خدمات بوابة المعالج المتقدمة (الدفعة الثالثة)
 *
 * خدمات جديدة:
 * ─── سجل المهام اليومية (Daily Task Board)
 * ─── تتبع التقدم (Progress Tracking)
 * ─── المكتبة العلمية (Clinical Library)
 * ─── نماذج التوثيق (Documentation Templates)
 * ─── التواصل مع الأهل (Parent Communication)
 * ─── الأهداف الذكية (SMART Goals Manager)
 *
 * @version 1.0.0
 */

// ─── Lazy model loaders ──────────────────────────────────────────────────────
let _TherapySession, _Beneficiary, _CaseManagement;

const _getTherapySession = () => {
  if (!_TherapySession) _TherapySession = require('../models/TherapySession');
  return _TherapySession;
};
const _getBeneficiary = () => {
  if (!_Beneficiary) _Beneficiary = require('../models/Beneficiary');
  return _Beneficiary;
};
const _getCaseManagement = () => {
  if (!_CaseManagement) _CaseManagement = require('../models/CaseManagement');
  return _CaseManagement;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const startOfDay = (d = new Date()) => {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
};
const endOfDay = (d = new Date()) => {
  const dt = new Date(d);
  dt.setHours(23, 59, 59, 999);
  return dt;
};

// ─── In-memory stores ────────────────────────────────────────────────────────
const tasksStore = new Map();
const progressStore = new Map();
const libraryStore = new Map();
const templatesStore = new Map();
const parentCommsStore = new Map();
const smartGoalsStore = new Map();

let _taskId = 5000;
let _progressId = 6000;
let _libraryId = 7000;
let _templateId = 8000;
let _parentCommId = 9000;
let _smartGoalId = 10000;

// ─── Seed data ───────────────────────────────────────────────────────────────
const CLINICAL_LIBRARY_CATEGORIES = [
  { id: 'physical-therapy', nameAr: 'العلاج الطبيعي', nameEn: 'Physical Therapy', icon: '🦿' },
  {
    id: 'occupational-therapy',
    nameAr: 'العلاج الوظيفي',
    nameEn: 'Occupational Therapy',
    icon: '🤲',
  },
  { id: 'speech-therapy', nameAr: 'علاج النطق', nameEn: 'Speech Therapy', icon: '🗣️' },
  {
    id: 'behavioral-therapy',
    nameAr: 'العلاج السلوكي',
    nameEn: 'Behavioral Therapy',
    icon: '🧠',
  },
  { id: 'protocols', nameAr: 'البروتوكولات', nameEn: 'Clinical Protocols', icon: '📋' },
  { id: 'guidelines', nameAr: 'الإرشادات', nameEn: 'Guidelines', icon: '📖' },
  { id: 'research', nameAr: 'أبحاث', nameEn: 'Research Papers', icon: '🔬' },
  { id: 'tools', nameAr: 'أدوات وموارد', nameEn: 'Tools & Resources', icon: '🛠️' },
];

const SEED_LIBRARY_ITEMS = [
  {
    id: 'lib-1',
    title: 'بروتوكول إعادة التأهيل بعد الجلطة الدماغية',
    titleEn: 'Post-Stroke Rehabilitation Protocol',
    category: 'protocols',
    type: 'protocol',
    content:
      'بروتوكول شامل لإعادة تأهيل المرضى بعد السكتة الدماغية يشمل المراحل الحادة وتحت الحادة والمزمنة.',
    tags: ['جلطة', 'تأهيل', 'بروتوكول', 'أعصاب'],
    author: 'فريق التأهيل',
    lastUpdated: '2026-02-15',
    views: 234,
    isFeatured: true,
  },
  {
    id: 'lib-2',
    title: 'إرشادات العلاج الطبيعي لآلام الظهر',
    titleEn: 'PT Guidelines for Lower Back Pain',
    category: 'physical-therapy',
    type: 'guideline',
    content: 'إرشادات قائمة على الأدلة لتقييم وعلاج آلام أسفل الظهر الحادة والمزمنة.',
    tags: ['ظهر', 'ألم', 'علاج طبيعي'],
    author: 'قسم العلاج الطبيعي',
    lastUpdated: '2026-01-20',
    views: 189,
    isFeatured: true,
  },
  {
    id: 'lib-3',
    title: 'دليل تقييم اضطرابات النطق عند الأطفال',
    titleEn: 'Pediatric Speech Disorder Assessment Guide',
    category: 'speech-therapy',
    type: 'guideline',
    content: 'دليل تفصيلي لتقييم اضطرابات النطق واللغة عند الأطفال من سن 2-12 سنة.',
    tags: ['نطق', 'أطفال', 'تقييم'],
    author: 'قسم علاج النطق',
    lastUpdated: '2026-03-01',
    views: 156,
    isFeatured: false,
  },
  {
    id: 'lib-4',
    title: 'تقنيات العلاج السلوكي المعرفي (CBT)',
    titleEn: 'CBT Techniques Reference',
    category: 'behavioral-therapy',
    type: 'reference',
    content: 'مرجع شامل لتقنيات العلاج السلوكي المعرفي المستخدمة في التأهيل.',
    tags: ['CBT', 'سلوكي', 'معرفي'],
    author: 'قسم العلاج السلوكي',
    lastUpdated: '2026-02-28',
    views: 98,
    isFeatured: false,
  },
  {
    id: 'lib-5',
    title: 'بروتوكول العلاج الوظيفي للمراهقين',
    titleEn: 'OT Protocol for Adolescents',
    category: 'occupational-therapy',
    type: 'protocol',
    content:
      'بروتوكول علاج وظيفي مخصص للمراهقين ذوي الاحتياجات الخاصة لتطوير مهارات الحياة اليومية.',
    tags: ['وظيفي', 'مراهقين', 'مهارات'],
    author: 'قسم العلاج الوظيفي',
    lastUpdated: '2026-01-10',
    views: 145,
    isFeatured: true,
  },
];

const DOCUMENTATION_TEMPLATES_SEED = [
  {
    id: 'tmpl-1',
    name: 'ملاحظات SOAP',
    nameEn: 'SOAP Notes',
    category: 'session',
    type: 'SOAP',
    sections: [
      {
        key: 'subjective',
        label: 'الشكوى الذاتية (S)',
        placeholder: 'ما يذكره المريض من أعراض وشكاوى...',
      },
      {
        key: 'objective',
        label: 'الفحص الموضوعي (O)',
        placeholder: 'نتائج الفحص والملاحظات الموضوعية...',
      },
      {
        key: 'assessment',
        label: 'التقييم (A)',
        placeholder: 'تحليل الحالة والتشخيص...',
      },
      {
        key: 'plan',
        label: 'الخطة (P)',
        placeholder: 'خطة العلاج والتوصيات...',
      },
    ],
    description: 'نموذج التوثيق القياسي SOAP لملاحظات الجلسات العلاجية',
    isDefault: true,
    usageCount: 456,
  },
  {
    id: 'tmpl-2',
    name: 'تقرير التقييم الأولي',
    nameEn: 'Initial Assessment Report',
    category: 'assessment',
    type: 'initial',
    sections: [
      {
        key: 'demographics',
        label: 'البيانات الديموغرافية',
        placeholder: 'الاسم، العمر، التاريخ الطبي...',
      },
      {
        key: 'chief_complaint',
        label: 'الشكوى الرئيسية',
        placeholder: 'سبب الإحالة والشكوى الأساسية...',
      },
      {
        key: 'history',
        label: 'التاريخ المرضي',
        placeholder: 'التاريخ الطبي والجراحي والعائلي...',
      },
      {
        key: 'examination',
        label: 'الفحص السريري',
        placeholder: 'نتائج الفحص البدني والوظيفي...',
      },
      {
        key: 'findings',
        label: 'النتائج والتوصيات',
        placeholder: 'الاستنتاجات وخطة العلاج المقترحة...',
      },
    ],
    description: 'نموذج التقييم الأولي الشامل للمرضى الجدد',
    isDefault: true,
    usageCount: 234,
  },
  {
    id: 'tmpl-3',
    name: 'تقرير التخريج',
    nameEn: 'Discharge Summary',
    category: 'discharge',
    type: 'discharge',
    sections: [
      {
        key: 'admission_summary',
        label: 'ملخص الدخول',
        placeholder: 'سبب القبول والتشخيص الأولي...',
      },
      {
        key: 'treatment_provided',
        label: 'العلاج المقدم',
        placeholder: 'ملخص جميع العلاجات والتدخلات...',
      },
      {
        key: 'progress',
        label: 'التقدم المحرز',
        placeholder: 'مقارنة بين الحالة عند الدخول والتخريج...',
      },
      {
        key: 'discharge_instructions',
        label: 'تعليمات التخريج',
        placeholder: 'توصيات ما بعد التخريج والتمارين المنزلية...',
      },
      {
        key: 'followup',
        label: 'المتابعة',
        placeholder: 'مواعيد المتابعة والجدول الزمني...',
      },
    ],
    description: 'نموذج تقرير التخريج عند انتهاء البرنامج العلاجي',
    isDefault: true,
    usageCount: 178,
  },
  {
    id: 'tmpl-4',
    name: 'ملاحظات التقدم',
    nameEn: 'Progress Notes',
    category: 'progress',
    type: 'progress',
    sections: [
      {
        key: 'current_status',
        label: 'الحالة الحالية',
        placeholder: 'وصف الحالة الحالية للمريض...',
      },
      {
        key: 'interventions',
        label: 'التدخلات',
        placeholder: 'التدخلات العلاجية المقدمة...',
      },
      {
        key: 'response',
        label: 'استجابة المريض',
        placeholder: 'كيف استجاب المريض للعلاج...',
      },
      {
        key: 'goals_update',
        label: 'تحديث الأهداف',
        placeholder: 'تحديث لحالة الأهداف العلاجية...',
      },
      {
        key: 'next_session',
        label: 'الجلسة التالية',
        placeholder: 'خطة الجلسة القادمة...',
      },
    ],
    description: 'نموذج ملاحظات التقدم الدورية',
    isDefault: false,
    usageCount: 312,
  },
  {
    id: 'tmpl-5',
    name: 'تقرير متعدد التخصصات',
    nameEn: 'Multidisciplinary Report',
    category: 'team',
    type: 'multidisciplinary',
    sections: [
      {
        key: 'team_members',
        label: 'أعضاء الفريق',
        placeholder: 'المعالجين والمتخصصين المشاركين...',
      },
      {
        key: 'individual_reports',
        label: 'التقارير الفردية',
        placeholder: 'ملخص تقرير كل تخصص...',
      },
      {
        key: 'integrated_assessment',
        label: 'التقييم الموحد',
        placeholder: 'التقييم الشامل المتكامل...',
      },
      {
        key: 'coordinated_plan',
        label: 'الخطة المنسقة',
        placeholder: 'خطة العمل الموحدة بين التخصصات...',
      },
    ],
    description: 'نموذج تقرير الفريق متعدد التخصصات',
    isDefault: false,
    usageCount: 89,
  },
];

// Initialize seed templates
DOCUMENTATION_TEMPLATES_SEED.forEach(t => templatesStore.set(t.id, { ...t }));
SEED_LIBRARY_ITEMS.forEach(item => libraryStore.set(item.id, { ...item }));

class TherapistPortalProService {
  // ═══════════════════════════════════════════════════════════════════════════
  //  سجل المهام اليومية — Daily Task Board
  // ═══════════════════════════════════════════════════════════════════════════

  async getDailyTasks(therapistId, query = {}) {
    const tasks = [...tasksStore.values()].filter(t => t.therapistId === therapistId);
    const _date = query.date ? new Date(query.date) : new Date();

    let filtered = tasks;
    if (query.status && query.status !== 'all') {
      filtered = filtered.filter(t => t.status === query.status);
    }
    if (query.priority) {
      filtered = filtered.filter(t => t.priority === query.priority);
    }
    if (query.category) {
      filtered = filtered.filter(t => t.category === query.category);
    }

    // Sort by priority then due date
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    filtered.sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));

    const today = startOfDay();
    const todayEnd = endOfDay();

    return {
      tasks: filtered,
      total: filtered.length,
      stats: {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        inProgress: tasks.filter(t => t.status === 'in-progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        overdue: tasks.filter(t => t.status !== 'completed' && new Date(t.dueDate) < today).length,
        todayDue: tasks.filter(t => new Date(t.dueDate) >= today && new Date(t.dueDate) <= todayEnd)
          .length,
      },
    };
  }

  async createTask(therapistId, data) {
    const id = `task-${++_taskId}`;
    const task = {
      id,
      therapistId,
      title: data.title,
      description: data.description || '',
      category: data.category || 'general',
      priority: data.priority || 'normal',
      status: 'pending',
      dueDate: data.dueDate || new Date().toISOString(),
      patientId: data.patientId || null,
      patientName: data.patientName || '',
      relatedSessionId: data.relatedSessionId || null,
      tags: data.tags || [],
      reminders: data.reminders || [],
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tasksStore.set(id, task);
    return task;
  }

  async updateTask(therapistId, taskId, data) {
    const task = tasksStore.get(taskId);
    if (!task || task.therapistId !== therapistId) return null;
    Object.assign(task, data, {
      updatedAt: new Date().toISOString(),
      ...(data.status === 'completed' && !task.completedAt
        ? { completedAt: new Date().toISOString() }
        : {}),
    });
    return task;
  }

  async deleteTask(therapistId, taskId) {
    const task = tasksStore.get(taskId);
    if (!task || task.therapistId !== therapistId) return false;
    tasksStore.delete(taskId);
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  تتبع التقدم — Progress Tracking
  // ═══════════════════════════════════════════════════════════════════════════

  async getProgressRecords(therapistId, query = {}) {
    const records = [...progressStore.values()].filter(r => r.therapistId === therapistId);

    let filtered = records;
    if (query.patientId) {
      filtered = filtered.filter(r => r.patientId === query.patientId);
    }
    if (query.type) {
      filtered = filtered.filter(r => r.type === query.type);
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      filtered = filtered.filter(
        r => r.patientName?.toLowerCase().includes(s) || r.notes?.toLowerCase().includes(s)
      );
    }

    filtered.sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));

    // Build patient-level summary
    const patientMap = {};
    records.forEach(r => {
      if (!patientMap[r.patientId]) {
        patientMap[r.patientId] = {
          patientId: r.patientId,
          patientName: r.patientName,
          totalRecords: 0,
          lastUpdate: r.recordedAt,
          averageScore: 0,
          scores: [],
        };
      }
      patientMap[r.patientId].totalRecords++;
      if (r.score !== undefined) patientMap[r.patientId].scores.push(r.score);
      if (new Date(r.recordedAt) > new Date(patientMap[r.patientId].lastUpdate)) {
        patientMap[r.patientId].lastUpdate = r.recordedAt;
      }
    });
    Object.values(patientMap).forEach(p => {
      p.averageScore =
        p.scores.length > 0
          ? Math.round((p.scores.reduce((a, b) => a + b, 0) / p.scores.length) * 10) / 10
          : 0;
    });

    return {
      records: filtered,
      total: filtered.length,
      patients: Object.values(patientMap),
      stats: {
        totalRecords: records.length,
        totalPatients: Object.keys(patientMap).length,
        thisMonth: records.filter(r => {
          const d = new Date(r.recordedAt);
          const now = new Date();
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length,
      },
    };
  }

  async addProgressRecord(therapistId, data) {
    const id = `prog-${++_progressId}`;
    const record = {
      id,
      therapistId,
      patientId: data.patientId,
      patientName: data.patientName || '',
      type: data.type || 'general',
      score: data.score !== undefined ? Number(data.score) : null,
      previousScore: data.previousScore || null,
      maxScore: data.maxScore || 100,
      domain: data.domain || 'general',
      milestone: data.milestone || '',
      notes: data.notes || '',
      attachments: data.attachments || [],
      recordedAt: data.recordedAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    progressStore.set(id, record);
    return record;
  }

  async deleteProgressRecord(therapistId, recordId) {
    const rec = progressStore.get(recordId);
    if (!rec || rec.therapistId !== therapistId) return false;
    progressStore.delete(recordId);
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  المكتبة العلمية — Clinical Library
  // ═══════════════════════════════════════════════════════════════════════════

  async getLibraryItems(query = {}) {
    let items = [...libraryStore.values()];

    if (query.category) {
      items = items.filter(i => i.category === query.category);
    }
    if (query.type) {
      items = items.filter(i => i.type === query.type);
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      items = items.filter(
        i =>
          i.title?.toLowerCase().includes(s) ||
          i.titleEn?.toLowerCase().includes(s) ||
          i.tags?.some(t => t.includes(s)) ||
          i.content?.toLowerCase().includes(s)
      );
    }
    if (query.featured) {
      items = items.filter(i => i.isFeatured);
    }

    items.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));

    return {
      items,
      total: items.length,
      categories: CLINICAL_LIBRARY_CATEGORIES,
      stats: {
        totalItems: libraryStore.size,
        totalProtocols: [...libraryStore.values()].filter(i => i.type === 'protocol').length,
        totalGuidelines: [...libraryStore.values()].filter(i => i.type === 'guideline').length,
        totalResearch: [...libraryStore.values()].filter(i => i.type === 'research').length,
        featuredCount: [...libraryStore.values()].filter(i => i.isFeatured).length,
      },
    };
  }

  async getLibraryItem(itemId) {
    const item = libraryStore.get(itemId);
    if (item) item.views = (item.views || 0) + 1;
    return item || null;
  }

  async addLibraryItem(therapistId, data) {
    const id = `lib-${++_libraryId}`;
    const item = {
      id,
      title: data.title,
      titleEn: data.titleEn || '',
      category: data.category || 'guidelines',
      type: data.type || 'reference',
      content: data.content || '',
      tags: data.tags || [],
      author: data.author || 'معالج',
      addedBy: therapistId,
      lastUpdated: new Date().toISOString().split('T')[0],
      views: 0,
      isFeatured: false,
      createdAt: new Date().toISOString(),
    };
    libraryStore.set(id, item);
    return item;
  }

  async deleteLibraryItem(itemId) {
    return libraryStore.delete(itemId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  نماذج التوثيق — Documentation Templates
  // ═══════════════════════════════════════════════════════════════════════════

  async getTemplates(query = {}) {
    let templates = [...templatesStore.values()];

    if (query.category) {
      templates = templates.filter(t => t.category === query.category);
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      templates = templates.filter(
        t =>
          t.name?.toLowerCase().includes(s) ||
          t.nameEn?.toLowerCase().includes(s) ||
          t.description?.toLowerCase().includes(s)
      );
    }

    templates.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));

    return {
      templates,
      total: templates.length,
      categories: [
        { id: 'session', label: 'ملاحظات الجلسة' },
        { id: 'assessment', label: 'تقارير التقييم' },
        { id: 'discharge', label: 'تقارير التخريج' },
        { id: 'progress', label: 'ملاحظات التقدم' },
        { id: 'team', label: 'تقارير الفريق' },
        { id: 'custom', label: 'نماذج مخصصة' },
      ],
    };
  }

  async getTemplateById(templateId) {
    return templatesStore.get(templateId) || null;
  }

  async createTemplate(therapistId, data) {
    const id = `tmpl-${++_templateId}`;
    const template = {
      id,
      name: data.name,
      nameEn: data.nameEn || '',
      category: data.category || 'custom',
      type: data.type || 'custom',
      sections: data.sections || [],
      description: data.description || '',
      createdBy: therapistId,
      isDefault: false,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    templatesStore.set(id, template);
    return template;
  }

  async updateTemplate(therapistId, templateId, data) {
    const tmpl = templatesStore.get(templateId);
    if (!tmpl) return null;
    Object.assign(tmpl, data, { updatedAt: new Date().toISOString() });
    return tmpl;
  }

  async useTemplate(templateId) {
    const tmpl = templatesStore.get(templateId);
    if (tmpl) {
      tmpl.usageCount = (tmpl.usageCount || 0) + 1;
      return { ...tmpl };
    }
    return null;
  }

  async deleteTemplate(templateId) {
    const tmpl = templatesStore.get(templateId);
    if (tmpl?.isDefault) return false;
    return templatesStore.delete(templateId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  التواصل مع الأهل — Parent Communication
  // ═══════════════════════════════════════════════════════════════════════════

  async getParentMessages(therapistId, query = {}) {
    let messages = [...parentCommsStore.values()].filter(m => m.therapistId === therapistId);

    if (query.patientId) {
      messages = messages.filter(m => m.patientId === query.patientId);
    }
    if (query.status && query.status !== 'all') {
      messages = messages.filter(m => m.status === query.status);
    }
    if (query.type) {
      messages = messages.filter(m => m.type === query.type);
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      messages = messages.filter(
        m =>
          m.parentName?.toLowerCase().includes(s) ||
          m.patientName?.toLowerCase().includes(s) ||
          m.subject?.toLowerCase().includes(s) ||
          m.content?.toLowerCase().includes(s)
      );
    }

    messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return {
      messages,
      total: messages.length,
      stats: {
        total: messages.length,
        sent: messages.filter(m => m.direction === 'outgoing').length,
        received: messages.filter(m => m.direction === 'incoming').length,
        unread: messages.filter(m => m.status === 'unread').length,
        updates: messages.filter(m => m.type === 'progress_update').length,
      },
    };
  }

  async sendParentMessage(therapistId, data) {
    const id = `pcomm-${++_parentCommId}`;
    const msg = {
      id,
      therapistId,
      patientId: data.patientId || '',
      patientName: data.patientName || '',
      parentName: data.parentName || '',
      parentId: data.parentId || '',
      type: data.type || 'general',
      direction: 'outgoing',
      subject: data.subject || '',
      content: data.content || '',
      attachments: data.attachments || [],
      status: 'sent',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    parentCommsStore.set(id, msg);
    return msg;
  }

  async markMessageRead(therapistId, messageId) {
    const msg = parentCommsStore.get(messageId);
    if (!msg || msg.therapistId !== therapistId) return null;
    msg.status = 'read';
    msg.isRead = true;
    msg.readAt = new Date().toISOString();
    return msg;
  }

  async deleteParentMessage(therapistId, messageId) {
    const msg = parentCommsStore.get(messageId);
    if (!msg || msg.therapistId !== therapistId) return false;
    parentCommsStore.delete(messageId);
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  الأهداف الذكية — SMART Goals Manager
  // ═══════════════════════════════════════════════════════════════════════════

  async getSmartGoals(therapistId, query = {}) {
    let goals = [...smartGoalsStore.values()].filter(g => g.therapistId === therapistId);

    if (query.patientId) {
      goals = goals.filter(g => g.patientId === query.patientId);
    }
    if (query.status && query.status !== 'all') {
      goals = goals.filter(g => g.status === query.status);
    }
    if (query.domain) {
      goals = goals.filter(g => g.domain === query.domain);
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      goals = goals.filter(
        g =>
          g.title?.toLowerCase().includes(s) ||
          g.patientName?.toLowerCase().includes(s) ||
          g.description?.toLowerCase().includes(s)
      );
    }

    goals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const allGoals = [...smartGoalsStore.values()].filter(g => g.therapistId === therapistId);
    return {
      goals,
      total: goals.length,
      stats: {
        total: allGoals.length,
        active: allGoals.filter(g => g.status === 'active').length,
        achieved: allGoals.filter(g => g.status === 'achieved').length,
        onTrack: allGoals.filter(g => g.progressPercent >= 50 && g.status === 'active').length,
        atRisk: allGoals.filter(g => g.progressPercent < 30 && g.status === 'active').length,
        avgProgress: allGoals.length
          ? Math.round(
              allGoals.reduce((sum, g) => sum + (g.progressPercent || 0), 0) / allGoals.length
            )
          : 0,
      },
      domains: [
        { id: 'motor', label: 'المهارات الحركية', color: '#3b82f6' },
        { id: 'communication', label: 'التواصل', color: '#10b981' },
        { id: 'cognitive', label: 'المعرفي', color: '#f59e0b' },
        { id: 'social', label: 'الاجتماعي', color: '#8b5cf6' },
        { id: 'self-care', label: 'العناية الذاتية', color: '#ec4899' },
        { id: 'behavioral', label: 'السلوكي', color: '#ef4444' },
        { id: 'academic', label: 'الأكاديمي', color: '#06b6d4' },
        { id: 'functional', label: 'الوظيفي', color: '#84cc16' },
      ],
    };
  }

  async createSmartGoal(therapistId, data) {
    const id = `sg-${++_smartGoalId}`;
    const goal = {
      id,
      therapistId,
      patientId: data.patientId || '',
      patientName: data.patientName || '',
      title: data.title,
      description: data.description || '',
      domain: data.domain || 'motor',
      // SMART components
      specific: data.specific || data.title,
      measurable: data.measurable || '',
      achievable: data.achievable || '',
      relevant: data.relevant || '',
      timeBound: data.timeBound || '',
      targetDate: data.targetDate || '',
      baseline: data.baseline || '',
      targetValue: data.targetValue || '',
      currentValue: data.currentValue || '',
      unit: data.unit || '',
      progressPercent: 0,
      status: 'active',
      milestones: (data.milestones || []).map((m, i) => ({
        id: `ms-${i}`,
        title: m.title || m,
        targetDate: m.targetDate || '',
        completed: false,
      })),
      updates: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    smartGoalsStore.set(id, goal);
    return goal;
  }

  async updateSmartGoal(therapistId, goalId, data) {
    const goal = smartGoalsStore.get(goalId);
    if (!goal || goal.therapistId !== therapistId) return null;

    // If updating progress, add to updates history
    if (data.progressPercent !== undefined || data.currentValue !== undefined) {
      goal.updates.push({
        date: new Date().toISOString(),
        previousProgress: goal.progressPercent,
        newProgress: data.progressPercent ?? goal.progressPercent,
        previousValue: goal.currentValue,
        newValue: data.currentValue ?? goal.currentValue,
        note: data.progressNote || '',
      });
    }

    Object.assign(goal, data, { updatedAt: new Date().toISOString() });

    if (goal.progressPercent >= 100) goal.status = 'achieved';
    return goal;
  }

  async updateMilestone(therapistId, goalId, milestoneId, data) {
    const goal = smartGoalsStore.get(goalId);
    if (!goal || goal.therapistId !== therapistId) return null;
    const ms = goal.milestones?.find(m => m.id === milestoneId);
    if (!ms) return null;
    Object.assign(ms, data);
    // Recalculate progress based on milestones
    if (goal.milestones.length > 0) {
      const completedCount = goal.milestones.filter(m => m.completed).length;
      goal.progressPercent = Math.round((completedCount / goal.milestones.length) * 100);
      if (goal.progressPercent >= 100) goal.status = 'achieved';
    }
    goal.updatedAt = new Date().toISOString();
    return goal;
  }

  async deleteSmartGoal(therapistId, goalId) {
    const goal = smartGoalsStore.get(goalId);
    if (!goal || goal.therapistId !== therapistId) return false;
    smartGoalsStore.delete(goalId);
    return true;
  }
}

module.exports = new TherapistPortalProService();
