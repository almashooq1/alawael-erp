/**
 * Create Sample KPIs and Reports for Analytics System
 * سكريبت إنشاء بيانات تجريبية لنظام التحليلات
 *
 * Usage:
 * node scripts/createSampleAnalyticsData.js
 */

const mongoose = require('mongoose');
const { KPI, ReportTemplate, Dashboard, Prediction } = require('../models/analytics');

// Sample KPIs
const sampleKPIs = [
  // Operational KPIs
  {
    name: 'Attendance Rate',
    nameAr: 'معدل الحضور',
    code: 'OPS_ATTENDANCE',
    category: 'operational',
    unit: 'percentage',
    direction: 'up',
    value: { current: 85, target: 95, previous: 82 },
    thresholds: { excellent: 95, good: 85, warning: 70, critical: 60 },
    calculation: {
      formula: '(present / total) * 100',
      dataSource: 'attendance_records',
      refreshInterval: 3600,
    },
    isActive: true,
    visibleTo: ['admin', 'manager', 'hr', 'teacher'],
  },
  {
    name: 'Facility Utilization',
    nameAr: 'استخدام المرافق',
    code: 'OPS_UTILIZATION',
    category: 'operational',
    unit: 'percentage',
    direction: 'up',
    value: { current: 78, target: 85, previous: 75 },
    thresholds: { excellent: 85, good: 75, warning: 65, critical: 50 },
    calculation: {
      formula: '(occupied_hours / total_hours) * 100',
      dataSource: 'facility_bookings',
      refreshInterval: 3600,
    },
    isActive: true,
    visibleTo: ['admin', 'manager'],
  },
  {
    name: 'Operational Efficiency',
    nameAr: 'الكفاءة التشغيلية',
    code: 'OPS_EFFICIENCY',
    category: 'operational',
    unit: 'percentage',
    direction: 'up',
    value: { current: 88, target: 92, previous: 86 },
    thresholds: { excellent: 92, good: 85, warning: 75, critical: 65 },
    calculation: {
      formula: '(completed_tasks / total_tasks) * 100',
      dataSource: 'operations',
      refreshInterval: 7200,
    },
    isActive: true,
    visibleTo: ['admin', 'manager'],
  },

  // Financial KPIs
  {
    name: 'Monthly Revenue',
    nameAr: 'الإيرادات الشهرية',
    code: 'FIN_REVENUE',
    category: 'financial',
    unit: 'currency',
    direction: 'up',
    value: { current: 1200000, target: 1500000, previous: 1100000 },
    thresholds: { excellent: 1400000, good: 1200000, warning: 1000000, critical: 800000 },
    calculation: {
      formula: 'SUM(revenue)',
      dataSource: 'financial_transactions',
      refreshInterval: 3600,
    },
    isActive: true,
    visibleTo: ['admin', 'manager', 'finance'],
  },
  {
    name: 'Profit Margin',
    nameAr: 'هامش الربح',
    code: 'FIN_PROFIT',
    category: 'financial',
    unit: 'percentage',
    direction: 'up',
    value: { current: 25, target: 30, previous: 22 },
    thresholds: { excellent: 30, good: 25, warning: 20, critical: 15 },
    calculation: {
      formula: '((revenue - expenses) / revenue) * 100',
      dataSource: 'financial_transactions',
      refreshInterval: 7200,
    },
    isActive: true,
    visibleTo: ['admin', 'manager', 'finance'],
  },
  {
    name: 'Collection Rate',
    nameAr: 'معدل التحصيل',
    code: 'FIN_COLLECTION',
    category: 'financial',
    unit: 'percentage',
    direction: 'up',
    value: { current: 88, target: 95, previous: 85 },
    thresholds: { excellent: 95, good: 88, warning: 80, critical: 70 },
    calculation: {
      formula: '(collected / billed) * 100',
      dataSource: 'financial_transactions',
      refreshInterval: 3600,
    },
    isActive: true,
    visibleTo: ['admin', 'manager', 'finance'],
  },
  {
    name: 'Total Expenses',
    nameAr: 'إجمالي المصروفات',
    code: 'FIN_EXPENSES',
    category: 'financial',
    unit: 'currency',
    direction: 'down',
    value: { current: 900000, target: 850000, previous: 950000 },
    thresholds: { excellent: 800000, good: 850000, warning: 900000, critical: 1000000 },
    calculation: {
      formula: 'SUM(expenses)',
      dataSource: 'financial_transactions',
      refreshInterval: 7200,
    },
    isActive: true,
    visibleTo: ['admin', 'manager', 'finance'],
  },

  // Satisfaction KPIs
  {
    name: 'Student Satisfaction',
    nameAr: 'رضا الطلاب',
    code: 'SAT_STUDENT',
    category: 'satisfaction',
    unit: 'percentage',
    direction: 'up',
    value: { current: 88, target: 92, previous: 85 },
    thresholds: { excellent: 90, good: 80, warning: 70, critical: 60 },
    calculation: {
      formula: 'AVG(satisfaction_score) * 20',
      dataSource: 'student_surveys',
      refreshInterval: 86400,
    },
    isActive: true,
    visibleTo: ['admin', 'manager', 'teacher'],
  },
  {
    name: 'Parent Satisfaction',
    nameAr: 'رضا أولياء الأمور',
    code: 'SAT_PARENT',
    category: 'satisfaction',
    unit: 'percentage',
    direction: 'up',
    value: { current: 82, target: 88, previous: 80 },
    thresholds: { excellent: 88, good: 78, warning: 68, critical: 58 },
    calculation: {
      formula: 'AVG(satisfaction_score) * 20',
      dataSource: 'parent_surveys',
      refreshInterval: 86400,
    },
    isActive: true,
    visibleTo: ['admin', 'manager'],
  },
  {
    name: 'Employee Satisfaction',
    nameAr: 'رضا الموظفين',
    code: 'SAT_EMPLOYEE',
    category: 'satisfaction',
    unit: 'percentage',
    direction: 'up',
    value: { current: 75, target: 85, previous: 73 },
    thresholds: { excellent: 85, good: 75, warning: 65, critical: 55 },
    calculation: {
      formula: 'AVG(satisfaction_score) * 20',
      dataSource: 'employee_surveys',
      refreshInterval: 86400,
    },
    isActive: true,
    visibleTo: ['admin', 'manager', 'hr'],
  },

  // Quality KPIs
  {
    name: 'Service Quality',
    nameAr: 'جودة الخدمة',
    code: 'QUA_SATISFACTION',
    category: 'quality',
    unit: 'percentage',
    direction: 'up',
    value: { current: 90, target: 95, previous: 87 },
    thresholds: { excellent: 95, good: 85, warning: 75, critical: 65 },
    calculation: {
      formula: 'AVG(quality_score) * 20',
      dataSource: 'service_evaluations',
      refreshInterval: 7200,
    },
    isActive: true,
    visibleTo: ['admin', 'manager', 'teacher'],
  },
  {
    name: 'Compliance Rate',
    nameAr: 'معدل الامتثال',
    code: 'QUA_COMPLIANCE',
    category: 'quality',
    unit: 'percentage',
    direction: 'up',
    value: { current: 92, target: 98, previous: 90 },
    thresholds: { excellent: 98, good: 92, warning: 85, critical: 75 },
    calculation: {
      formula: '(compliant_items / total_items) * 100',
      dataSource: 'compliance_checks',
      refreshInterval: 86400,
    },
    isActive: true,
    visibleTo: ['admin', 'manager'],
  },
  {
    name: 'Defect Rate',
    nameAr: 'معدل الأخطاء',
    code: 'QUA_DEFECTS',
    category: 'quality',
    unit: 'percentage',
    direction: 'down',
    value: { current: 4.5, target: 2, previous: 5.2 },
    thresholds: { excellent: 2, good: 4, warning: 6, critical: 8 },
    calculation: {
      formula: '(defects / total_items) * 100',
      dataSource: 'quality_checks',
      refreshInterval: 7200,
    },
    isActive: true,
    visibleTo: ['admin', 'manager'],
  },
];

// Sample Report Templates
const sampleReportTemplates = [
  {
    name: 'Monthly Executive Report',
    nameAr: 'التقرير التنفيذي الشهري',
    category: 'executive',
    description: 'Comprehensive monthly report with all KPIs',
    descriptionAr: 'تقرير شهري شامل لجميع المؤشرات',
    structure: {
      sections: [
        { title: 'Executive Summary', titleAr: 'الملخص التنفيذي', order: 1 },
        { title: 'Operational Metrics', titleAr: 'المؤشرات التشغيلية', order: 2 },
        { title: 'Financial Performance', titleAr: 'الأداء المالي', order: 3 },
        { title: 'Quality & Satisfaction', titleAr: 'الجودة والرضا', order: 4 },
      ],
      charts: [
        { type: 'pie', title: 'Status Distribution', titleAr: 'توزيع الحالة' },
        { type: 'bar', title: 'Category Performance', titleAr: 'أداء الفئات' },
        { type: 'line', title: 'Trends', titleAr: 'الاتجاهات' },
      ],
      kpis: [], // Will be filled with all KPI IDs
    },
    filters: [
      { field: 'startDate', type: 'date', label: 'Start Date', labelAr: 'تاريخ البداية' },
      { field: 'endDate', type: 'date', label: 'End Date', labelAr: 'تاريخ النهاية' },
    ],
    formatting: {
      orientation: 'portrait',
      pageSize: 'A4',
      header: { enabled: true, text: 'Executive Report', textAr: 'التقرير التنفيذي' },
      footer: { enabled: true, pageNumbers: true },
    },
    permissions: {
      canView: ['admin', 'manager'],
      canEdit: ['admin'],
      isPublic: false,
    },
    isActive: true,
  },
  {
    name: 'Financial Report',
    nameAr: 'التقرير المالي',
    category: 'financial',
    description: 'Detailed financial performance report',
    descriptionAr: 'تقرير مفصل للأداء المالي',
    structure: {
      sections: [
        { title: 'Revenue Analysis', titleAr: 'تحليل الإيرادات', order: 1 },
        { title: 'Expense Breakdown', titleAr: 'تفصيل المصروفات', order: 2 },
        { title: 'Profit & Margins', titleAr: 'الأرباح والهوامش', order: 3 },
      ],
      charts: [
        { type: 'line', title: 'Revenue Trend', titleAr: 'اتجاه الإيرادات' },
        { type: 'pie', title: 'Expense Distribution', titleAr: 'توزيع المصروفات' },
      ],
      kpis: [], // Will be filled with financial KPI IDs
    },
    filters: [
      { field: 'startDate', type: 'date', label: 'Start Date', labelAr: 'تاريخ البداية' },
      { field: 'endDate', type: 'date', label: 'End Date', labelAr: 'تاريخ النهاية' },
      {
        field: 'category',
        type: 'select',
        label: 'Category',
        labelAr: 'الفئة',
        options: [
          { value: 'all', label: 'All', labelAr: 'الكل' },
          { value: 'revenue', label: 'Revenue', labelAr: 'الإيرادات' },
          { value: 'expenses', label: 'Expenses', labelAr: 'المصروفات' },
        ],
      },
    ],
    formatting: {
      orientation: 'landscape',
      pageSize: 'A4',
      header: { enabled: true, text: 'Financial Report', textAr: 'التقرير المالي' },
      footer: { enabled: true, pageNumbers: true },
    },
    permissions: {
      canView: ['admin', 'manager', 'finance'],
      canEdit: ['admin', 'finance'],
      isPublic: false,
    },
    isActive: true,
  },
  {
    name: 'Operational Performance Report',
    nameAr: 'تقرير الأداء التشغيلي',
    category: 'operational',
    description: 'Daily/weekly operational metrics',
    descriptionAr: 'مؤشرات تشغيلية يومية/أسبوعية',
    structure: {
      sections: [
        { title: 'Attendance', titleAr: 'الحضور', order: 1 },
        { title: 'Facility Usage', titleAr: 'استخدام المرافق', order: 2 },
        { title: 'Efficiency Metrics', titleAr: 'مؤشرات الكفاءة', order: 3 },
      ],
      charts: [{ type: 'bar', title: 'Daily Performance', titleAr: 'الأداء اليومي' }],
      kpis: [], // Will be filled with operational KPI IDs
    },
    filters: [
      { field: 'startDate', type: 'date', label: 'Start Date', labelAr: 'تاريخ البداية' },
      { field: 'endDate', type: 'date', label: 'End Date', labelAr: 'تاريخ النهاية' },
      {
        field: 'department',
        type: 'select',
        label: 'Department',
        labelAr: 'القسم',
        options: [{ value: 'all', label: 'All', labelAr: 'الكل' }],
      },
    ],
    formatting: {
      orientation: 'portrait',
      pageSize: 'A4',
      header: { enabled: true, text: 'Operational Report', textAr: 'التقرير التشغيلي' },
      footer: { enabled: true, pageNumbers: true },
    },
    permissions: {
      canView: ['admin', 'manager', 'hr'],
      canEdit: ['admin', 'manager'],
      isPublic: false,
    },
    isActive: true,
  },
];

// Sample Dashboards
const sampleDashboards = [
  {
    name: 'Executive Dashboard',
    nameAr: 'لوحة التحكم التنفيذية',
    type: 'executive',
    description: 'Main dashboard for executives',
    descriptionAr: 'اللوحة الرئيسية للمدراء التنفيذيين',
    layout: {
      columns: 12,
      widgets: [
        {
          type: 'kpi-summary',
          position: { x: 0, y: 0, w: 12, h: 2 },
          config: { categories: ['all'] },
        },
        {
          type: 'pie-chart',
          position: { x: 0, y: 2, w: 6, h: 4 },
          config: { dataType: 'status-distribution' },
        },
        {
          type: 'bar-chart',
          position: { x: 6, y: 2, w: 6, h: 4 },
          config: { dataType: 'category-performance' },
        },
        {
          type: 'kpi-list',
          position: { x: 0, y: 6, w: 12, h: 6 },
          config: { category: 'all', limit: 10 },
        },
      ],
    },
    permissions: {
      owner: null, // Will be set to first admin
      sharedWith: [],
      isPublic: false,
      allowedRoles: ['admin', 'manager'],
    },
    isDefault: true,
    isActive: true,
  },
  {
    name: 'Financial Dashboard',
    nameAr: 'لوحة المالية',
    type: 'financial',
    description: 'Financial metrics and trends',
    descriptionAr: 'المؤشرات والاتجاهات المالية',
    layout: {
      columns: 12,
      widgets: [
        {
          type: 'kpi-summary',
          position: { x: 0, y: 0, w: 12, h: 2 },
          config: { categories: ['financial'] },
        },
        {
          type: 'line-chart',
          position: { x: 0, y: 2, w: 12, h: 4 },
          config: { dataType: 'revenue-trend' },
        },
        {
          type: 'kpi-list',
          position: { x: 0, y: 6, w: 6, h: 6 },
          config: { category: 'financial', limit: 5 },
        },
        { type: 'predictions', position: { x: 6, y: 6, w: 6, h: 6 }, config: { type: 'revenue' } },
      ],
    },
    permissions: {
      owner: null,
      sharedWith: [],
      isPublic: false,
      allowedRoles: ['admin', 'manager', 'finance'],
    },
    isDefault: false,
    isActive: true,
  },
];

// Main function
async function createSampleData() {
  try {
    console.log('🚀 بدء إنشاء البيانات التجريبية...\n');

    // Connect to database
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/erp_system';
    await mongoose.connect(dbUri);
    console.log('✅ متصل بقاعدة البيانات\n');

    // 1. Create KPIs
    console.log('📊 إنشاء المؤشرات (KPIs)...');
    const createdKPIs = await KPI.insertMany(sampleKPIs);
    console.log(`✅ تم إنشاء ${createdKPIs.length} مؤشر\n`);

    createdKPIs.forEach(kpi => {
      console.log(`   - ${kpi.nameAr} (${kpi.code}) - ${kpi.status}`);
    });
    console.log('');

    // 2. Create Report Templates
    console.log('📑 إنشاء قوالب التقارير...');

    // Link KPIs to templates
    sampleReportTemplates[0].structure.kpis = createdKPIs.map(kpi => kpi._id); // All KPIs
    sampleReportTemplates[1].structure.kpis = createdKPIs
      .filter(kpi => kpi.category === 'financial')
      .map(kpi => kpi._id);
    sampleReportTemplates[2].structure.kpis = createdKPIs
      .filter(kpi => kpi.category === 'operational')
      .map(kpi => kpi._id);

    const createdTemplates = await ReportTemplate.insertMany(sampleReportTemplates);
    console.log(`✅ تم إنشاء ${createdTemplates.length} قالب تقرير\n`);

    createdTemplates.forEach(template => {
      console.log(`   - ${template.nameAr} (${template.structure.kpis.length} مؤشر)`);
    });
    console.log('');

    // 3. Create Dashboards
    console.log('📈 إنشاء لوحات التحكم...');
    const createdDashboards = await Dashboard.insertMany(sampleDashboards);
    console.log(`✅ تم إنشاء ${createdDashboards.length} لوحة تحكم\n`);

    createdDashboards.forEach(dashboard => {
      console.log(`   - ${dashboard.nameAr} (${dashboard.layout.widgets.length} widget)`);
    });
    console.log('');

    // 4. Add historical data to KPIs
    console.log('📜 إضافة بيانات تاريخية...');
    let historyCount = 0;

    for (const kpi of createdKPIs) {
      const history = [];
      const days = 30;

      for (let i = days; i > 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        // Generate random value around current value
        const variance = kpi.value.current * 0.1;
        const value = kpi.value.current + (Math.random() - 0.5) * variance;

        history.push({
          value: Math.round(value * 100) / 100,
          date: date,
          note: `Auto-generated historical data`,
        });
      }

      kpi.history = history;
      await kpi.save();
      historyCount += history.length;
    }

    console.log(`✅ تم إضافة ${historyCount} سجل تاريخي\n`);

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ تم إنشاء البيانات التجريبية بنجاح!\n');
    console.log('📊 الإحصائيات:');
    console.log(`   - ${createdKPIs.length} مؤشر أداء (KPIs)`);
    console.log(`   - ${createdTemplates.length} قالب تقرير`);
    console.log(`   - ${createdDashboards.length} لوحة تحكم`);
    console.log(`   - ${historyCount} سجل تاريخي`);
    console.log('');
    console.log('📍 الخطوات التالية:');
    console.log('   1. افتح http://localhost:3000/analytics/dashboard');
    console.log('   2. راجع المؤشرات في /analytics/kpis');
    console.log('   3. جرب توليد تقرير من /analytics/reports');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run
createSampleData();
