/**
 * خدمة إعداد الموظف الجديد (Onboarding Service)
 * ─────────────────────────────────────────────────
 */
'use strict';

const Onboarding = require('../../models/HR/Onboarding');

// قوالب التهيئة الافتراضية
const DEFAULT_TEMPLATES = {
  standard: {
    name: 'تهيئة موظف قياسية',
    tasks: [
      { title: 'إعداد حساب البريد الإلكتروني', category: 'أنظمة', priority: 'عالية', order: 1 },
      { title: 'إعداد صلاحيات الأنظمة', category: 'أنظمة', priority: 'عالية', order: 2 },
      { title: 'تسليم المعدات (لابتوب/هاتف)', category: 'معدات', priority: 'عالية', order: 3 },
      {
        title: 'جمع الوثائق المطلوبة (هوية/شهادات/عقد)',
        category: 'وثائق',
        priority: 'عالية',
        order: 4,
      },
      { title: 'تسجيل التأمين الصحي', category: 'وثائق', priority: 'عالية', order: 5 },
      { title: 'تسجيل في نظام GOSI', category: 'وثائق', priority: 'عالية', order: 6 },
      { title: 'جولة تعريفية في المنشأة', category: 'اجتماعات', priority: 'متوسطة', order: 7 },
      { title: 'اجتماع مع المدير المباشر', category: 'اجتماعات', priority: 'عالية', order: 8 },
      { title: 'اجتماع مع الفريق', category: 'اجتماعات', priority: 'متوسطة', order: 9 },
      {
        title: 'قراءة سياسات الشركة والتوقيع عليها',
        category: 'سياسات',
        priority: 'عالية',
        order: 10,
      },
      { title: 'قراءة دليل الموظف', category: 'سياسات', priority: 'متوسطة', order: 11 },
      { title: 'تدريب على أنظمة العمل الداخلية', category: 'تدريب', priority: 'متوسطة', order: 12 },
      { title: 'تدريب على السلامة المهنية', category: 'تدريب', priority: 'متوسطة', order: 13 },
      { title: 'تعيين مرشد (Buddy/Mentor)', category: 'اجتماعات', priority: 'متوسطة', order: 14 },
      { title: 'تقييم نهاية الأسبوع الأول', category: 'أخرى', priority: 'منخفضة', order: 15 },
      { title: 'تقييم نهاية الشهر الأول', category: 'أخرى', priority: 'منخفضة', order: 16 },
      { title: 'تقييم نهاية فترة التجربة', category: 'أخرى', priority: 'عالية', order: 17 },
    ],
  },
  executive: {
    name: 'تهيئة موظف تنفيذي',
    tasks: [
      { title: 'إعداد مكتب خاص ومعدات', category: 'معدات', priority: 'عالية', order: 1 },
      { title: 'إعداد حسابات وصلاحيات متقدمة', category: 'أنظمة', priority: 'عالية', order: 2 },
      { title: 'اجتماع مع الرئيس التنفيذي', category: 'اجتماعات', priority: 'عالية', order: 3 },
      { title: 'عرض تقديمي عن استراتيجية الشركة', category: 'تدريب', priority: 'عالية', order: 4 },
      { title: 'اجتماع مع جميع مديري الأقسام', category: 'اجتماعات', priority: 'عالية', order: 5 },
      { title: 'تسليم سيارة الشركة (إن وجدت)', category: 'معدات', priority: 'متوسطة', order: 6 },
      { title: 'إعداد بطاقة ائتمان الشركة', category: 'وثائق', priority: 'متوسطة', order: 7 },
      { title: 'مراجعة KPIs والأهداف ربعية', category: 'أخرى', priority: 'عالية', order: 8 },
    ],
  },
  intern: {
    name: 'تهيئة متدرب',
    tasks: [
      { title: 'إعداد حساب بريد إلكتروني مؤقت', category: 'أنظمة', priority: 'عالية', order: 1 },
      { title: 'تسليم بطاقة الدخول', category: 'معدات', priority: 'عالية', order: 2 },
      { title: 'تعيين مشرف التدريب', category: 'اجتماعات', priority: 'عالية', order: 3 },
      { title: 'شرح مهام ومسؤوليات التدريب', category: 'تدريب', priority: 'عالية', order: 4 },
      { title: 'جولة تعريفية', category: 'اجتماعات', priority: 'متوسطة', order: 5 },
      { title: 'تدريب أساسي على الأنظمة', category: 'تدريب', priority: 'متوسطة', order: 6 },
      { title: 'تقييم منتصف التدريب', category: 'أخرى', priority: 'متوسطة', order: 7 },
      { title: 'تقييم نهاية التدريب', category: 'أخرى', priority: 'عالية', order: 8 },
    ],
  },
};

class OnboardingService {
  /** إنشاء عملية تهيئة جديدة */
  static async create({
    employeeId,
    templateType = 'standard',
    startDate,
    mentor,
    department,
    createdBy,
  }) {
    const template = DEFAULT_TEMPLATES[templateType] || DEFAULT_TEMPLATES.standard;
    const start = new Date(startDate || Date.now());

    const tasks = template.tasks.map((t, i) => ({
      ...t,
      status: 'معلق',
      dueDate: new Date(start.getTime() + (i + 1) * 2 * 24 * 60 * 60 * 1000), // كل مهمة بعد يومين
    }));

    const onboarding = new Onboarding({
      employeeId,
      templateName: template.name,
      startDate: start,
      expectedEndDate: new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000), // 90 يوم
      status: 'لم يبدأ',
      tasks,
      mentor,
      department,
      createdBy,
    });

    return onboarding.save();
  }

  /** جلب كل عمليات التهيئة */
  static async list(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.department) query.department = filters.department;

    return Onboarding.find(query)
      .populate('employeeId', 'personalInfo name jobInfo')
      .populate('mentor', 'personalInfo name')
      .sort({ createdAt: -1 })
      .lean();
  }

  /** جلب تهيئة موظف محدد */
  static async getByEmployee(employeeId) {
    return Onboarding.findOne({ employeeId })
      .populate('employeeId', 'personalInfo name jobInfo')
      .populate('mentor', 'personalInfo name')
      .lean();
  }

  /** تحديث حالة مهمة */
  static async updateTask(onboardingId, taskId, { status, notes, completedDate, updatedBy }) {
    const onb = await Onboarding.findById(onboardingId);
    if (!onb) throw new Error('سجل التهيئة غير موجود');

    const task = onb.tasks.id(taskId);
    if (!task) throw new Error('المهمة غير موجودة');

    if (status) task.status = status;
    if (notes) task.notes = notes;
    if (status === 'مكتمل') task.completedDate = completedDate || new Date();
    onb.updatedBy = updatedBy;

    // تحديث الحالة العامة
    const allStarted = onb.tasks.some(t => ['جاري', 'مكتمل'].includes(t.status));
    if (allStarted && onb.status === 'لم يبدأ') onb.status = 'جاري';

    // كشف التأخير
    const now = new Date();
    for (const t of onb.tasks) {
      if (t.status !== 'مكتمل' && t.dueDate && t.dueDate < now) {
        t.status = 'متأخر';
      }
    }

    return onb.save();
  }

  /** إضافة تغذية راجعة */
  static async submitFeedback(
    onboardingId,
    { employeeRating, employeeComment, managerRating, managerComment }
  ) {
    return Onboarding.findByIdAndUpdate(
      onboardingId,
      {
        $set: {
          'feedback.employeeRating': employeeRating,
          'feedback.employeeComment': employeeComment,
          'feedback.managerRating': managerRating,
          'feedback.managerComment': managerComment,
          'feedback.submittedAt': new Date(),
        },
      },
      { new: true }
    );
  }

  /** لوحة تحكم ملخّص التهيئة */
  static async dashboard() {
    const [total, inProgress, delayed, completed, avgProgress] = await Promise.all([
      Onboarding.countDocuments(),
      Onboarding.countDocuments({ status: 'جاري' }),
      Onboarding.countDocuments({ status: 'متأخر' }),
      Onboarding.countDocuments({ status: 'مكتمل' }),
      Onboarding.aggregate([
        { $match: { status: { $in: ['جاري', 'لم يبدأ'] } } },
        { $group: { _id: null, avg: { $avg: '$progress' } } },
      ]),
    ]);

    return {
      total,
      inProgress,
      delayed,
      completed,
      notStarted: total - inProgress - delayed - completed,
      avgProgress: Math.round(avgProgress[0]?.avg || 0),
      completionRate: total > 0 ? +((completed / total) * 100).toFixed(1) : 0,
    };
  }

  /** القوالب المتاحة */
  static getTemplates() {
    return Object.entries(DEFAULT_TEMPLATES).map(([key, val]) => ({
      key,
      name: val.name,
      taskCount: val.tasks.length,
    }));
  }
}

module.exports = OnboardingService;
