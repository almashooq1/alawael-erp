// Mock data for module dashboards (placeholder until APIs are connected)
const moduleMocks = {
  crm: {
    kpis: [
      { label: 'الصفقات المفتوحة', value: '42', trend: '+6%', tone: 'success', chartData: [32, 35, 38, 36, 40, 42] },
      { label: 'نسبة الإغلاق', value: '28%', trend: '+3%', tone: 'success', chartData: [22, 24, 25, 26, 27, 28] },
      { label: 'متوسط دورة البيع', value: '18 يوم', trend: '-2 يوم', tone: 'info', chartData: [24, 22, 21, 20, 19, 18] },
    ],
    items: [
      { title: 'صفقة - مستشفى الشفاء', status: 'قيد التفاوض', amount: '$84k' },
      { title: 'صفقة - مزود أجهزة طبية', status: 'مرحلة العرض', amount: '$32k' },
      { title: 'صفقة - مركز تعليمي', status: 'متابعة', amount: '$15k' },
    ],
    actions: [
      { label: 'إضافة صفقة', path: '/crm/deals/new' },
      { label: 'قائمة الفرص', path: '/crm' },
    ],
  },
  finance: {
    kpis: [
      { label: 'فواتير مستحقة', value: '$128k', trend: '+12%', tone: 'warning', chartData: [98, 105, 110, 115, 122, 128] },
      { label: 'تحصيل هذا الشهر', value: '$86k', trend: '+9%', tone: 'success', chartData: [68, 72, 75, 78, 82, 86] },
      { label: 'نفقات التشغيل', value: '$43k', trend: '+2%', tone: 'error', chartData: [38, 39, 40, 41, 42, 43] },
    ],
    items: [
      { title: 'فاتورة #9821', status: 'مستحقة خلال 5 أيام', amount: '$12k' },
      { title: 'فاتورة #9744', status: 'متأخرة 3 أيام', amount: '$8k' },
      { title: 'أمر شراء #441', status: 'بانتظار الموافقة', amount: '$21k' },
    ],
    actions: [
      { label: 'الفواتير', path: '/finance/invoices' },
      { label: 'أوامر الشراء', path: '/procurement' },
    ],
  },
  hr: {
    kpis: [
      { label: 'معدل الحضور اليوم', value: '92%', trend: '-1%', tone: 'warning', chartData: [95, 94, 93, 94, 93, 92] },
      { label: 'طلبات إجازة', value: '14', trend: '+3', tone: 'info', chartData: [8, 9, 10, 11, 13, 14] },
      { label: 'توظيف مفتوح', value: '6 وظائف', trend: '+2', tone: 'success', chartData: [3, 3, 4, 4, 5, 6] },
    ],
    items: [
      { title: 'دوام متأخر - أحمد علي', status: 'تنبيه حضور', amount: '' },
      { title: 'طلب إجازة - سارة محمد', status: 'بانتظار الموافقة', amount: '' },
      { title: 'ترشيح - مطوّر React', status: 'مقابلة تقنية', amount: '' },
    ],
    actions: [
      { label: 'لوحة HR', path: '/hr' },
      { label: 'الحضور والإجازات', path: '/attendance' },
      { label: 'الرواتب', path: '/payroll' },
    ],
  },
  security: {
    kpis: [
      { label: 'تنبيهات أمنية', value: '3', trend: 'منخفض', tone: 'warning' },
      { label: 'حالة الكاميرات', value: '98% شغالة', trend: '+1%', tone: 'success' },
      { label: 'محاولات دخول مرفوضة', value: '12', trend: '-4', tone: 'success' },
    ],
    items: [
      { title: 'كاميرا البوابة 2', status: 'انقطاع متقطع', amount: '' },
      { title: 'حساب مشبوه', status: 'تم القفل مؤقتًا', amount: '' },
      { title: 'تحديث سياسات', status: 'يتطلب مراجعة', amount: '' },
    ],
    actions: [
      { label: 'مركز الأمان', path: '/security' },
      { label: 'المراقبة', path: '/surveillance' },
    ],
  },
  elearning: {
    kpis: [
      { label: 'دورات نشطة', value: '24', trend: '+2', tone: 'success' },
      { label: 'إكمال هذا الأسبوع', value: '68%', trend: '+5%', tone: 'success' },
      { label: 'جلسات مباشرة اليوم', value: '4', trend: '', tone: 'info' },
    ],
    items: [
      { title: 'ذكاء اصطناعي للمبتدئين', status: 'مباشر 4م', amount: '' },
      { title: 'أمن المعلومات', status: 'مسجل', amount: '' },
      { title: 'الإرشاد الوظيفي', status: 'تدريب حي', amount: '' },
    ],
    actions: [
      { label: 'الدورات', path: '/elearning' },
      { label: 'جلسات مباشرة', path: '/sessions' },
    ],
  },
  rehab: {
    kpis: [
      { label: 'جلسات اليوم', value: '18', trend: '+3', tone: 'info' },
      { label: 'خطط علاج نشطة', value: '52', trend: '+4', tone: 'success' },
      { label: 'حالات تحتاج مراجعة', value: '5', trend: '', tone: 'warning' },
    ],
    items: [
      { title: 'جلسة علاج نطق - مريم', status: 'بعد ساعة', amount: '' },
      { title: 'تقييم حركة - خالد', status: 'اليوم 5م', amount: '' },
      { title: 'متابعة خطة - ليان', status: 'غدًا', amount: '' },
    ],
    actions: [
      { label: 'الجلسات', path: '/sessions' },
      { label: 'الخطط العلاجية', path: '/rehab' },
    ],
  },
  reports: {
    kpis: [
      { label: 'تقارير محدثة', value: '12', trend: '+2', tone: 'success', chartData: [8, 9, 9, 10, 11, 12] },
      { label: 'تنبيهات حرجة', value: '2', trend: 'تحقق', tone: 'warning', chartData: [5, 4, 3, 3, 2, 2] },
      { label: 'نسبة اكتمال البيانات', value: '94%', trend: '+1%', tone: 'success', chartData: [88, 90, 91, 92, 93, 94] },
    ],
    items: [
      { title: 'تقرير الأداء الشهري', status: 'جاهز', amount: '' },
      { title: 'تقرير الحضور', status: 'تحت المعالجة', amount: '' },
      { title: 'تقرير الأمان', status: 'مطلوب مراجعة', amount: '' },
    ],
    actions: [{ label: 'عرض كل التقارير', path: '/reports' }],
    charts: {
      monthlyActivity: {
        labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
        data: [45, 52, 48, 58, 62, 68],
      },
      systemUsage: {
        labels: ['CRM', 'المالية', 'الموارد البشرية', 'التعلم', 'الأمن'],
        data: [85, 92, 78, 65, 95],
      },
      alerts: {
        labels: ['أسبوع 1', 'أسبوع 2', 'أسبوع 3', 'أسبوع 4'],
        data: [12, 8, 5, 2],
      },
    },
  },
};

export default moduleMocks;
