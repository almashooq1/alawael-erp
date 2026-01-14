const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');

// Mock data for modules
const modulesMockData = {
  elearning: {
    kpis: [
      {
        label: 'دورات نشطة',
        value: '24',
        trend: '+2',
        tone: 'success',
        chartData: [12, 15, 18, 20, 22, 24],
      },
      {
        label: 'إكمال هذا الأسبوع',
        value: '68%',
        trend: '+5%',
        tone: 'success',
        chartData: [50, 55, 60, 65, 68],
      },
      {
        label: 'جلسات مباشرة اليوم',
        value: '4',
        trend: '',
        tone: 'info',
        chartData: [2, 2, 3, 4, 4],
      },
    ],
    items: [
      {
        id: '1',
        title: 'ذكاء اصطناعي للمبتدئين',
        status: 'مباشر 4م',
        amount: '',
        category: 'تقنية',
        duration: '6 أسابيع',
        students: 245,
        rating: 4.8,
      },
      {
        id: '2',
        title: 'أمن المعلومات',
        status: 'مسجل',
        amount: '',
        category: 'أمان',
        duration: '8 أسابيع',
        students: 189,
        rating: 4.6,
      },
      {
        id: '3',
        title: 'الإرشاد الوظيفي',
        status: 'تدريب حي',
        amount: '',
        category: 'تطوير',
        duration: '4 أسابيع',
        students: 312,
        rating: 4.9,
      },
      {
        id: '4',
        title: 'تحليل البيانات',
        status: 'قادم',
        amount: '',
        category: 'بيانات',
        duration: '5 أسابيع',
        students: 0,
        rating: 0,
      },
      {
        id: '5',
        title: 'البرمجة المتقدمة',
        status: 'مسجل',
        amount: '',
        category: 'برمجة',
        duration: '10 أسابيع',
        students: 567,
        rating: 4.7,
      },
      {
        id: '6',
        title: 'إدارة المشاريع',
        status: 'مباشر 15م',
        amount: '',
        category: 'إدارة',
        duration: '6 أسابيع',
        students: 423,
        rating: 4.5,
      },
    ],
    actions: [
      { label: 'الدورات', path: '/elearning' },
      { label: 'جلسات مباشرة', path: '/sessions' },
      { label: 'مكتبة الطالب', path: '/student-portal/library' },
    ],
    statistics: {
      totalCourses: 24,
      activeCourses: 6,
      completedCourses: 42,
      enrolledStudents: 2847,
      completionRate: 68,
      avgRating: 4.7,
    },
  },
  rehab: {
    kpis: [
      {
        label: 'جلسات اليوم',
        value: '18',
        trend: '+3',
        tone: 'info',
        chartData: [10, 12, 15, 17, 18],
      },
      {
        label: 'خطط علاج نشطة',
        value: '52',
        trend: '+4',
        tone: 'success',
        chartData: [40, 44, 48, 50, 52],
      },
      {
        label: 'حالات تحتاج مراجعة',
        value: '5',
        trend: '',
        tone: 'warning',
        chartData: [8, 7, 6, 5, 5],
      },
    ],
    items: [
      { title: 'جلسة علاج نطق - مريم', status: 'بعد ساعة', time: '2:00 PM' },
      { title: 'تقييم حركة - خالد', status: 'اليوم 5م', time: '10:05 AM' },
      { title: 'متابعة خطة - ليان', status: 'غدًا', time: 'GC' },
    ],
    actions: [
      { label: 'الجلسات', path: '/sessions' },
      { label: 'الخطط العلاجية', path: '/rehab' },
      { label: 'التقارير', path: '/therapist-portal/reports' },
    ],
  },
  reports: {
    kpis: [
      { label: 'تقارير جديدة', value: '12', trend: '+3', tone: 'info' },
      { label: 'تقارير قيد المعالجة', value: '5', trend: '', tone: 'warning' },
      { label: 'تقارير مكتملة', value: '284', trend: '+42', tone: 'success' },
    ],
    items: [
      { title: 'تقرير الأداء الشهري', status: 'مكتمل', date: '2026-01-13' },
      { title: 'تقرير الحضور', status: 'قيد المعالجة', date: '2026-01-13' },
      { title: 'تقرير المالية', status: 'بانتظار المراجعة', date: '2026-01-12' },
    ],
    actions: [
      { label: 'جميع التقارير', path: '/reports' },
      { label: 'إنشاء تقرير جديد', path: '/admin-portal/reports' },
    ],
  },
  finance: {
    kpis: [
      { label: 'الإيرادات هذا الشهر', value: '250,000 ر.س', trend: '+15%', tone: 'success' },
      { label: 'النفقات المعلقة', value: '45,000 ر.س', trend: '', tone: 'warning' },
      { label: 'الرصيد', value: '1,250,000 ر.س', trend: '+5%', tone: 'success' },
    ],
    items: [
      { title: 'فاتورة العملاء #1001', status: 'مدفوع', amount: '50,000 ر.س' },
      { title: 'فاتورة المورد #2045', status: 'بانتظار', amount: '35,000 ر.س' },
      { title: 'رصيد الراتب', status: 'معالج', amount: '180,000 ر.س' },
    ],
    actions: [
      { label: 'المحاسبة', path: '/finance' },
      { label: 'الفواتير', path: '/admin-portal/payments' },
    ],
  },
  hr: {
    kpis: [
      { label: 'الموظفين النشطين', value: '156', trend: '+2', tone: 'success' },
      { label: 'طلبات الإجازة', value: '8', trend: '', tone: 'info' },
      { label: 'معدل الحضور', value: '94.5%', trend: '+1%', tone: 'success' },
    ],
    items: [
      { title: 'طلب إجازة - أحمد علي', status: 'بانتظار الموافقة', days: '5 أيام' },
      { title: 'استقالة - فاطمة محمد', status: 'تم التعالج', date: '2026-02-15' },
      { title: 'تدريب جديد - سارة أحمد', status: 'قيد التدريب', duration: '3 أسابيع' },
    ],
    actions: [
      { label: 'الموظفين', path: '/hr' },
      { label: 'الرواتب', path: '/payroll' },
    ],
  },
  crm: {
    kpis: [
      { label: 'العملاء النشطين', value: '289', trend: '+12', tone: 'success' },
      { label: 'الفرص المفتوحة', value: '34', trend: '+5', tone: 'info' },
      { label: 'نسبة الإغلاق', value: '78%', trend: '+3%', tone: 'success' },
    ],
    items: [
      { title: 'متابعة عميل - شركة ABC', status: 'بعد غد', value: '250,000 ر.س' },
      { title: 'عرض سعر - شركة XYZ', status: 'مرسل', value: '180,000 ر.س' },
      { title: 'عقد توقيع - مؤسسة DEF', status: 'معلق', value: '420,000 ر.س' },
    ],
    actions: [
      { label: 'العملاء', path: '/crm' },
      { label: 'الفرص', path: '/crm' },
    ],
  },
  security: {
    kpis: [
      { label: 'حوادث أمان', value: '3', trend: '-1', tone: 'success' },
      { label: 'تنبيهات نشطة', value: '7', trend: '', tone: 'warning' },
      { label: 'مستوى الأمان', value: 'جيد جداً', trend: '', tone: 'success' },
    ],
    items: [
      { title: 'تحديث كلمات المرور', status: 'اليوم', users: '45 مستخدم' },
      { title: 'فحص الأمان', status: 'مكتمل', date: '2026-01-10' },
      { title: 'تنبيه تسجيل دخول غريب', status: 'تم التحقق', time: '2026-01-13 14:30' },
    ],
    actions: [
      { label: 'الأمان', path: '/security' },
      { label: 'السجلات', path: '/admin-portal/audit-logs' },
    ],
  },
};

/**
 * @route   GET /api/modules/:moduleKey
 * @desc    Get module data
 * @access  Private
 */
router.get('/:moduleKey', authenticateToken, (req, res) => {
  try {
    const { moduleKey } = req.params;

    // Check if module exists in mock data
    if (!modulesMockData[moduleKey]) {
      return res.status(404).json({
        success: false,
        message: `Module "${moduleKey}" not found`,
        availableModules: Object.keys(modulesMockData),
      });
    }

    // Return module data
    res.status(200).json({
      success: true,
      data: modulesMockData[moduleKey],
      module: moduleKey,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching module data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch module data',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/modules
 * @desc    Get all available modules
 * @access  Private
 */
router.get('/', authenticateToken, (req, res) => {
  try {
    const modules = Object.keys(modulesMockData);

    res.status(200).json({
      success: true,
      data: {
        modules: modules,
        count: modules.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching modules list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch modules list',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/modules/elearning/courses
 * @desc    Get all elearning courses
 * @access  Private
 */
router.get('/elearning/courses', authenticateToken, (req, res) => {
  try {
    const courses = modulesMockData.elearning.items || [];

    res.status(200).json({
      success: true,
      data: {
        courses: courses,
        count: courses.length,
        stats: modulesMockData.elearning.statistics,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses',
      error: error.message,
    });
  }
});

module.exports = router;
