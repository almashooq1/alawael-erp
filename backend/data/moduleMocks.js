// Mock data for module dashboards - used for real-time Socket.IO emissions
const moduleMocks = {
  crm: {
    kpis: [
      { label: 'الصفقات المفتوحة', value: '42', trend: '+6%', tone: 'success', chartData: [32, 35, 38, 36, 40, 42] },
      { label: 'نسبة الإغلاق', value: '28%', trend: '+3%', tone: 'success', chartData: [22, 24, 25, 26, 27, 28] },
      { label: 'متوسط دورة البيع', value: '18 يوم', trend: '-2 يوم', tone: 'info', chartData: [24, 22, 21, 20, 19, 18] },
    ],
  },
  finance: {
    kpis: [
      { label: 'فواتير مستحقة', value: '$128k', trend: '+12%', tone: 'warning', chartData: [98, 105, 110, 115, 122, 128] },
      { label: 'تحصيل هذا الشهر', value: '$86k', trend: '+9%', tone: 'success', chartData: [68, 72, 75, 78, 82, 86] },
      { label: 'نفقات التشغيل', value: '$43k', trend: '+2%', tone: 'error', chartData: [38, 39, 40, 41, 42, 43] },
    ],
  },
  hr: {
    kpis: [
      { label: 'معدل الحضور اليوم', value: '92%', trend: '-1%', tone: 'warning', chartData: [95, 94, 93, 94, 93, 92] },
      { label: 'طلبات إجازة', value: '14', trend: '+3', tone: 'info', chartData: [8, 9, 10, 11, 13, 14] },
      { label: 'توظيف مفتوح', value: '6 وظائف', trend: '+2', tone: 'success', chartData: [3, 3, 4, 4, 5, 6] },
    ],
  },
  security: {
    kpis: [
      { label: 'تنبيهات أمنية', value: '3', trend: 'منخفض', tone: 'warning' },
      { label: 'حالة الكاميرات', value: '98% شغالة', trend: '+1%', tone: 'success' },
      { label: 'محاولات دخول مرفوضة', value: '12', trend: '-4', tone: 'success' },
    ],
  },
  elearning: {
    kpis: [
      { label: 'دورات نشطة', value: '24', trend: '+2', tone: 'success' },
      { label: 'إكمال هذا الأسبوع', value: '68%', trend: '+5%', tone: 'success' },
      { label: 'جلسات مباشرة اليوم', value: '4', trend: '', tone: 'info' },
    ],
  },
  rehab: {
    kpis: [
      { label: 'جلسات اليوم', value: '18', trend: '+3', tone: 'info' },
      { label: 'خطط علاج نشطة', value: '52', trend: '+4', tone: 'success' },
      { label: 'حالات تحتاج مراجعة', value: '5', trend: '', tone: 'warning' },
    ],
  },
  reports: {
    kpis: [
      { label: 'تقارير محدثة', value: '12', trend: '+2', tone: 'success', chartData: [8, 9, 9, 10, 11, 12] },
      { label: 'تنبيهات حرجة', value: '2', trend: 'تحقق', tone: 'warning', chartData: [5, 4, 3, 3, 2, 2] },
      { label: 'نسبة اكتمال البيانات', value: '94%', trend: '+1%', tone: 'success', chartData: [88, 90, 91, 92, 93, 94] },
    ],
  },
  appeals: {
    kpis: [
      { label: 'استئناف ناجح', value: '88%', trend: '+5%', tone: 'success', chartData: [80, 82, 84, 85, 87, 88] },
      { label: 'إيرادات مستردة', value: '$45k', trend: '+12%', tone: 'success', chartData: [32, 35, 38, 40, 42, 45] },
      { label: 'رسائل مولدة', value: '142', trend: '+15', tone: 'info', chartData: [110, 115, 120, 128, 135, 142] },
    ],
  },
  biometrics: {
    kpis: [
      { label: 'مصادقة صوتية', value: '1280', trend: '+45', tone: 'info', chartData: [1100, 1150, 1200, 1230, 1250, 1280] },
      { label: 'محاولات احتيال', value: '0', trend: 'آمن', tone: 'success', chartData: [1, 0, 0, 1, 0, 0] },
      { label: 'تحقق Liveness', value: '99.9%', trend: 'ممتاز', tone: 'success', chartData: [99, 99, 99, 99, 99, 99] },
    ],
  },
};

module.exports = moduleMocks;
