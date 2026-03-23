/**
 * CEO Executive Dashboard Service — خدمة لوحة تحكم الإدارة التنفيذية
 * Phase 19 — شاشة واحدة شاملة بمؤشرات أداء حية
 *
 * Features:
 *   - Aggregated KPIs from ALL ERP modules
 *   - Financial overview (revenue, expenses, cash-flow, budget utilization)
 *   - Operational metrics (beneficiaries, sessions, staff, occupancy)
 *   - HR metrics (headcount, turnover, attendance, training)
 *   - Quality & compliance scores
 *   - Department performance rankings
 *   - Trend data (daily/weekly/monthly/quarterly)
 *   - Alerts & action items for executives
 *   - Configurable widgets & saved layouts
 *   - Goal tracking & strategic objectives
 *   - Comparative analytics (period-over-period)
 *   - Export executive reports (PDF summary)
 */

const logger = console;

/* ══════════════════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════════════════ */

const DEPARTMENTS = [
  { id: 'rehabilitation', nameAr: 'التأهيل', nameEn: 'Rehabilitation', color: '#1976d2' },
  { id: 'medical', nameAr: 'الطبي', nameEn: 'Medical', color: '#d32f2f' },
  { id: 'education', nameAr: 'التعليم', nameEn: 'Education', color: '#388e3c' },
  { id: 'therapy', nameAr: 'العلاج الطبيعي', nameEn: 'Therapy', color: '#f57c00' },
  { id: 'psychology', nameAr: 'علم النفس', nameEn: 'Psychology', color: '#7b1fa2' },
  { id: 'social_work', nameAr: 'الخدمة الاجتماعية', nameEn: 'Social Work', color: '#00796b' },
  { id: 'administration', nameAr: 'الإدارة', nameEn: 'Administration', color: '#546e7a' },
  { id: 'finance', nameAr: 'المالية', nameEn: 'Finance', color: '#fbc02d' },
  { id: 'hr', nameAr: 'الموارد البشرية', nameEn: 'Human Resources', color: '#e64a19' },
  { id: 'it', nameAr: 'تقنية المعلومات', nameEn: 'IT', color: '#0097a7' },
  { id: 'operations', nameAr: 'العمليات', nameEn: 'Operations', color: '#5d4037' },
  { id: 'quality', nameAr: 'الجودة', nameEn: 'Quality', color: '#c2185b' },
];

const KPI_CATEGORIES = [
  { id: 'financial', nameAr: 'المالية', nameEn: 'Financial', icon: 'AttachMoney' },
  { id: 'operational', nameAr: 'التشغيلية', nameEn: 'Operational', icon: 'Settings' },
  { id: 'hr', nameAr: 'الموارد البشرية', nameEn: 'HR', icon: 'People' },
  { id: 'quality', nameAr: 'الجودة', nameEn: 'Quality', icon: 'VerifiedUser' },
  { id: 'beneficiary', nameAr: 'المستفيدين', nameEn: 'Beneficiary', icon: 'Accessibility' },
  { id: 'strategic', nameAr: 'الاستراتيجية', nameEn: 'Strategic', icon: 'TrendingUp' },
];

const WIDGET_TYPES = [
  { id: 'kpi_card', nameAr: 'بطاقة مؤشر', nameEn: 'KPI Card' },
  { id: 'line_chart', nameAr: 'رسم بياني خطي', nameEn: 'Line Chart' },
  { id: 'bar_chart', nameAr: 'رسم بياني شريطي', nameEn: 'Bar Chart' },
  { id: 'pie_chart', nameAr: 'رسم بياني دائري', nameEn: 'Pie Chart' },
  { id: 'gauge', nameAr: 'مقياس', nameEn: 'Gauge' },
  { id: 'table', nameAr: 'جدول', nameEn: 'Table' },
  { id: 'heatmap', nameAr: 'خريطة حرارية', nameEn: 'Heatmap' },
  { id: 'trend_spark', nameAr: 'خط اتجاه مصغر', nameEn: 'Trend Sparkline' },
];

const ALERT_SEVERITIES = ['critical', 'warning', 'info'];

const PERIODS = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

const STRATEGIC_STATUSES = ['on_track', 'at_risk', 'behind', 'completed', 'not_started'];

/* ══════════════════════════════════════════════════════════════════════
   SERVICE CLASS
   ══════════════════════════════════════════════════════════════════════ */

class CEODashboardService {
  constructor() {
    /* ── Map stores ── */
    this.kpiDefinitions = new Map();   // KPI metadata
    this.kpiSnapshots = new Map();     // Timestamped KPI values
    this.alerts = new Map();           // Executive alerts
    this.goals = new Map();            // Strategic goals
    this.widgets = new Map();          // Dashboard widgets
    this.layouts = new Map();          // Saved dashboard layouts
    this.reports = new Map();          // Generated executive reports
    this.benchmarks = new Map();       // Industry benchmarks
    this.departments = new Map();      // Department performance
    this.auditLogs = new Map();        // Audit trail

    /* ── Counters ── */
    this._kpiId = 500;
    this._snapId = 600;
    this._alertId = 700;
    this._goalId = 800;
    this._widgetId = 900;
    this._layoutId = 1000;
    this._reportId = 1100;
    this._benchmarkId = 1200;
    this._auditId = 1300;

    this._seed();
    logger.info('[CEODashboard] Seed data loaded');
  }

  /* ── ID generators ── */
  _nextKpiId() { return `kpi-${++this._kpiId}`; }
  _nextSnapId() { return `snap-${++this._snapId}`; }
  _nextAlertId() { return `alert-${++this._alertId}`; }
  _nextGoalId() { return `goal-${++this._goalId}`; }
  _nextWidgetId() { return `widget-${++this._widgetId}`; }
  _nextLayoutId() { return `layout-${++this._layoutId}`; }
  _nextReportId() { return `report-${++this._reportId}`; }
  _nextBenchmarkId() { return `bench-${++this._benchmarkId}`; }
  _nextAuditId() { return `audit-${++this._auditId}`; }

  /* ══════════════════════════════════════════════════════════════════
     SEED DATA
     ══════════════════════════════════════════════════════════════════ */
  _seed() {
    const now = new Date().toISOString();

    /* ── KPI Definitions ── */
    const kpis = [
      { id: 'kpi-501', category: 'financial', code: 'REV_TOTAL', nameAr: 'إجمالي الإيرادات', nameEn: 'Total Revenue', unit: 'SAR', target: 5000000, currentValue: 4750000, previousValue: 4200000, trend: 'up', changePercent: 13.1, format: 'currency' },
      { id: 'kpi-502', category: 'financial', code: 'EXP_TOTAL', nameAr: 'إجمالي المصروفات', nameEn: 'Total Expenses', unit: 'SAR', target: 4000000, currentValue: 3650000, previousValue: 3800000, trend: 'down', changePercent: -3.9, format: 'currency' },
      { id: 'kpi-503', category: 'financial', code: 'NET_INCOME', nameAr: 'صافي الدخل', nameEn: 'Net Income', unit: 'SAR', target: 1000000, currentValue: 1100000, previousValue: 400000, trend: 'up', changePercent: 175, format: 'currency' },
      { id: 'kpi-504', category: 'financial', code: 'BUDGET_UTIL', nameAr: 'استخدام الميزانية', nameEn: 'Budget Utilization', unit: '%', target: 95, currentValue: 87.5, previousValue: 82.3, trend: 'up', changePercent: 6.3, format: 'percent' },
      { id: 'kpi-505', category: 'financial', code: 'CASH_FLOW', nameAr: 'التدفق النقدي', nameEn: 'Cash Flow', unit: 'SAR', target: 800000, currentValue: 920000, previousValue: 750000, trend: 'up', changePercent: 22.7, format: 'currency' },
      { id: 'kpi-506', category: 'operational', code: 'BENEFICIARY_COUNT', nameAr: 'عدد المستفيدين', nameEn: 'Active Beneficiaries', unit: 'person', target: 250, currentValue: 237, previousValue: 218, trend: 'up', changePercent: 8.7, format: 'number' },
      { id: 'kpi-507', category: 'operational', code: 'SESSION_COUNT', nameAr: 'الجلسات الشهرية', nameEn: 'Monthly Sessions', unit: 'session', target: 1200, currentValue: 1156, previousValue: 1080, trend: 'up', changePercent: 7.0, format: 'number' },
      { id: 'kpi-508', category: 'operational', code: 'OCCUPANCY', nameAr: 'نسبة الإشغال', nameEn: 'Occupancy Rate', unit: '%', target: 90, currentValue: 88.5, previousValue: 84.2, trend: 'up', changePercent: 5.1, format: 'percent' },
      { id: 'kpi-509', category: 'operational', code: 'AVG_STAY', nameAr: 'متوسط مدة الإقامة', nameEn: 'Avg Length of Stay', unit: 'days', target: 45, currentValue: 42, previousValue: 48, trend: 'down', changePercent: -12.5, format: 'number' },
      { id: 'kpi-510', category: 'hr', code: 'HEADCOUNT', nameAr: 'عدد الموظفين', nameEn: 'Total Headcount', unit: 'person', target: 180, currentValue: 175, previousValue: 168, trend: 'up', changePercent: 4.2, format: 'number' },
      { id: 'kpi-511', category: 'hr', code: 'TURNOVER', nameAr: 'معدل الدوران الوظيفي', nameEn: 'Employee Turnover', unit: '%', target: 8, currentValue: 6.2, previousValue: 9.1, trend: 'down', changePercent: -31.9, format: 'percent' },
      { id: 'kpi-512', category: 'hr', code: 'ATTENDANCE', nameAr: 'نسبة الحضور', nameEn: 'Attendance Rate', unit: '%', target: 95, currentValue: 94.8, previousValue: 93.5, trend: 'up', changePercent: 1.4, format: 'percent' },
      { id: 'kpi-513', category: 'hr', code: 'TRAINING_HOURS', nameAr: 'ساعات التدريب', nameEn: 'Training Hours', unit: 'hours', target: 500, currentValue: 465, previousValue: 380, trend: 'up', changePercent: 22.4, format: 'number' },
      { id: 'kpi-514', category: 'quality', code: 'SATISFACTION', nameAr: 'رضا المستفيدين', nameEn: 'Beneficiary Satisfaction', unit: '%', target: 90, currentValue: 91.2, previousValue: 87.8, trend: 'up', changePercent: 3.9, format: 'percent' },
      { id: 'kpi-515', category: 'quality', code: 'COMPLIANCE', nameAr: 'نسبة الامتثال', nameEn: 'Compliance Score', unit: '%', target: 100, currentValue: 96.5, previousValue: 94.1, trend: 'up', changePercent: 2.6, format: 'percent' },
      { id: 'kpi-516', category: 'quality', code: 'INCIDENT_RATE', nameAr: 'معدل الحوادث', nameEn: 'Incident Rate', unit: 'per 1000', target: 2, currentValue: 1.8, previousValue: 2.5, trend: 'down', changePercent: -28.0, format: 'number' },
      { id: 'kpi-517', category: 'beneficiary', code: 'REHAB_SUCCESS', nameAr: 'معدل نجاح التأهيل', nameEn: 'Rehabilitation Success Rate', unit: '%', target: 85, currentValue: 82.3, previousValue: 78.6, trend: 'up', changePercent: 4.7, format: 'percent' },
      { id: 'kpi-518', category: 'beneficiary', code: 'READMISSION', nameAr: 'معدل إعادة القبول', nameEn: 'Readmission Rate', unit: '%', target: 5, currentValue: 4.1, previousValue: 6.3, trend: 'down', changePercent: -34.9, format: 'percent' },
      { id: 'kpi-519', category: 'strategic', code: 'GOAL_PROGRESS', nameAr: 'تقدم الأهداف الاستراتيجية', nameEn: 'Strategic Goal Progress', unit: '%', target: 100, currentValue: 72.5, previousValue: 58.0, trend: 'up', changePercent: 25.0, format: 'percent' },
      { id: 'kpi-520', category: 'strategic', code: 'DIGITAL_TRANSFORM', nameAr: 'التحول الرقمي', nameEn: 'Digital Transformation', unit: '%', target: 100, currentValue: 85.0, previousValue: 70.0, trend: 'up', changePercent: 21.4, format: 'percent' },
    ];
    kpis.forEach(k => this.kpiDefinitions.set(k.id, { ...k, updatedAt: now }));

    /* ── KPI Snapshots (historical) ── */
    const months = ['2026-01', '2026-02', '2026-03'];
    let snapCounter = 601;
    ['kpi-501', 'kpi-506', 'kpi-514'].forEach(kpiId => {
      const kpi = this.kpiDefinitions.get(kpiId);
      months.forEach((m, idx) => {
        const factor = 0.85 + (idx * 0.075);
        this.kpiSnapshots.set(`snap-${snapCounter}`, {
          id: `snap-${snapCounter}`,
          kpiId,
          period: m,
          value: +(kpi.currentValue * factor).toFixed(2),
          capturedAt: `${m}-15T00:00:00Z`,
        });
        snapCounter++;
      });
    });
    this._snapId = snapCounter;

    /* ── Executive Alerts ── */
    const alerts = [
      { id: 'alert-701', severity: 'critical', category: 'financial', titleAr: 'تجاوز ميزانية قسم الأشعة', titleEn: 'Radiology Dept Budget Overrun', descriptionAr: 'تجاوز قسم الأشعة الميزانية المخصصة بنسبة 12%', descriptionEn: 'Radiology department exceeded allocated budget by 12%', department: 'medical', isRead: false, isResolved: false, actionRequired: true, createdAt: '2026-03-22T08:00:00Z' },
      { id: 'alert-702', severity: 'warning', category: 'hr', titleAr: 'نقص كادر العلاج الطبيعي', titleEn: 'Therapy Staff Shortage', descriptionAr: 'عدد أخصائيي العلاج الطبيعي أقل من المطلوب بـ 3 موظفين', descriptionEn: 'Physical therapy specialists are 3 below required staffing level', department: 'therapy', isRead: false, isResolved: false, actionRequired: true, createdAt: '2026-03-21T14:30:00Z' },
      { id: 'alert-703', severity: 'warning', category: 'operational', titleAr: 'انخفاض نسبة حضور الجلسات', titleEn: 'Session Attendance Drop', descriptionAr: 'انخفضت نسبة حضور الجلسات العلاجية بنسبة 8% هذا الأسبوع', descriptionEn: 'Therapy session attendance dropped by 8% this week', department: 'rehabilitation', isRead: true, isResolved: false, actionRequired: false, createdAt: '2026-03-20T10:15:00Z' },
      { id: 'alert-704', severity: 'info', category: 'quality', titleAr: 'تحسن درجة رضا الأسر', titleEn: 'Family Satisfaction Improved', descriptionAr: 'ارتفعت درجة رضا أسر المستفيدين إلى 91.2%', descriptionEn: 'Beneficiary family satisfaction score rose to 91.2%', department: 'quality', isRead: true, isResolved: true, actionRequired: false, createdAt: '2026-03-19T09:00:00Z' },
      { id: 'alert-705', severity: 'critical', category: 'operational', titleAr: 'عطل في نظام التبريد', titleEn: 'HVAC System Failure', descriptionAr: 'عطل في نظام التبريد المركزي - المبنى B', descriptionEn: 'Central HVAC failure in Building B', department: 'operations', isRead: false, isResolved: false, actionRequired: true, createdAt: '2026-03-23T06:30:00Z' },
    ];
    alerts.forEach(a => this.alerts.set(a.id, a));

    /* ── Strategic Goals ── */
    const goals = [
      { id: 'goal-801', nameAr: 'زيادة القدرة الاستيعابية', nameEn: 'Increase Capacity', description: 'زيادة عدد المستفيدين النشطين إلى 300', category: 'strategic', targetValue: 300, currentValue: 237, unit: 'person', status: 'on_track', progress: 79, deadline: '2026-12-31', owner: 'CEO', milestones: [{ name: 'توظيف كوادر إضافية', done: true }, { name: 'تجهيز أجنحة جديدة', done: false }, { name: 'اتفاقيات تحويل', done: true }] },
      { id: 'goal-802', nameAr: 'التحول الرقمي الكامل', nameEn: 'Full Digital Transformation', description: 'رقمنة جميع العمليات والتقارير', category: 'strategic', targetValue: 100, currentValue: 85, unit: '%', status: 'on_track', progress: 85, deadline: '2026-09-30', owner: 'CTO', milestones: [{ name: 'نظام ERP', done: true }, { name: 'تطبيق جوال', done: true }, { name: 'ذكاء اصطناعي', done: false }] },
      { id: 'goal-803', nameAr: 'تحقيق اعتماد CARF', nameEn: 'CARF Accreditation', description: 'الحصول على اعتماد CARF الدولي لمراكز التأهيل', category: 'quality', targetValue: 100, currentValue: 68, unit: '%', status: 'at_risk', progress: 68, deadline: '2026-06-30', owner: 'Quality Manager', milestones: [{ name: 'تقييم ذاتي', done: true }, { name: 'خطة تحسين', done: true }, { name: 'زيارة تفتيشية', done: false }] },
      { id: 'goal-804', nameAr: 'خفض التكاليف التشغيلية', nameEn: 'Reduce Operating Costs', description: 'خفض التكاليف التشغيلية بنسبة 15%', category: 'financial', targetValue: 15, currentValue: 11.2, unit: '%', status: 'on_track', progress: 74.7, deadline: '2026-12-31', owner: 'CFO', milestones: [{ name: 'أتمتة العمليات', done: true }, { name: 'تفاوض عقود', done: false }] },
      { id: 'goal-805', nameAr: 'رفع رضا المستفيدين', nameEn: 'Improve Satisfaction', description: 'رفع معدل رضا المستفيدين وأسرهم إلى 95%', category: 'beneficiary', targetValue: 95, currentValue: 91.2, unit: '%', status: 'on_track', progress: 96, deadline: '2026-12-31', owner: 'Operations Director', milestones: [{ name: 'استبيانات دورية', done: true }, { name: 'فريق متابعة شكاوى', done: true }] },
    ];
    goals.forEach(g => this.goals.set(g.id, { ...g, createdAt: now, updatedAt: now }));

    /* ── Dashboard Widgets ── */
    const widgets = [
      { id: 'widget-901', type: 'kpi_card', title: 'الإيرادات', kpiId: 'kpi-501', position: { x: 0, y: 0, w: 3, h: 1 }, visible: true },
      { id: 'widget-902', type: 'kpi_card', title: 'المصروفات', kpiId: 'kpi-502', position: { x: 3, y: 0, w: 3, h: 1 }, visible: true },
      { id: 'widget-903', type: 'kpi_card', title: 'المستفيدين', kpiId: 'kpi-506', position: { x: 6, y: 0, w: 3, h: 1 }, visible: true },
      { id: 'widget-904', type: 'kpi_card', title: 'رضا المستفيدين', kpiId: 'kpi-514', position: { x: 9, y: 0, w: 3, h: 1 }, visible: true },
      { id: 'widget-905', type: 'line_chart', title: 'اتجاه الإيرادات', kpiId: 'kpi-501', position: { x: 0, y: 1, w: 6, h: 2 }, visible: true },
      { id: 'widget-906', type: 'bar_chart', title: 'أداء الأقسام', position: { x: 6, y: 1, w: 6, h: 2 }, visible: true },
      { id: 'widget-907', type: 'pie_chart', title: 'توزيع المصروفات', position: { x: 0, y: 3, w: 4, h: 2 }, visible: true },
      { id: 'widget-908', type: 'gauge', title: 'الإشغال', kpiId: 'kpi-508', position: { x: 4, y: 3, w: 4, h: 2 }, visible: true },
      { id: 'widget-909', type: 'table', title: 'التنبيهات العاجلة', position: { x: 8, y: 3, w: 4, h: 2 }, visible: true },
      { id: 'widget-910', type: 'trend_spark', title: 'اتجاه الجلسات', kpiId: 'kpi-507', position: { x: 0, y: 5, w: 6, h: 1 }, visible: true },
    ];
    widgets.forEach(w => this.widgets.set(w.id, { ...w, createdAt: now }));

    /* ── Default Layout ── */
    this.layouts.set('layout-1001', {
      id: 'layout-1001',
      name: 'التخطيط الافتراضي',
      nameEn: 'Default Layout',
      isDefault: true,
      widgetIds: widgets.map(w => w.id),
      columns: 12,
      createdBy: 'system',
      createdAt: now,
    });

    /* ── Department Performance ── */
    DEPARTMENTS.forEach(d => {
      this.departments.set(d.id, {
        ...d,
        performance: 70 + Math.floor(Math.random() * 25),
        budget: 200000 + Math.floor(Math.random() * 300000),
        budgetUsed: 150000 + Math.floor(Math.random() * 200000),
        staffCount: 8 + Math.floor(Math.random() * 20),
        activeProjects: 1 + Math.floor(Math.random() * 5),
        satisfaction: 75 + Math.floor(Math.random() * 20),
        updatedAt: now,
      });
    });

    /* ── Benchmarks ── */
    [
      { id: 'bench-1201', kpiCode: 'REV_TOTAL', industry: 'rehabilitation_centers', percentile: 78, median: 4200000, top25: 5500000 },
      { id: 'bench-1202', kpiCode: 'SATISFACTION', industry: 'rehabilitation_centers', percentile: 85, median: 86.0, top25: 92.0 },
      { id: 'bench-1203', kpiCode: 'OCCUPANCY', industry: 'rehabilitation_centers', percentile: 72, median: 82.0, top25: 93.0 },
      { id: 'bench-1204', kpiCode: 'TURNOVER', industry: 'rehabilitation_centers', percentile: 65, median: 10.5, top25: 5.0 },
    ].forEach(b => this.benchmarks.set(b.id, b));

    /* ── Audit Logs ── */
    [
      { id: 'audit-1301', action: 'dashboard_view', userId: 'ceo-1', details: 'عرض لوحة التحكم التنفيذية', timestamp: now },
      { id: 'audit-1302', action: 'report_export', userId: 'ceo-1', details: 'تصدير تقرير تنفيذي شهري', timestamp: '2026-03-20T10:00:00Z' },
    ].forEach(a => this.auditLogs.set(a.id, a));
  }

  /* ══════════════════════════════════════════════════════════════════
     EXECUTIVE DASHBOARD — لوحة التحكم الرئيسية
     ══════════════════════════════════════════════════════════════════ */
  getExecutiveDashboard() {
    const kpis = [...this.kpiDefinitions.values()];
    const alerts = [...this.alerts.values()].filter(a => !a.isResolved).sort((a, b) => {
      const sev = { critical: 0, warning: 1, info: 2 };
      return (sev[a.severity] || 3) - (sev[b.severity] || 3);
    });

    const financialKpis = kpis.filter(k => k.category === 'financial');
    const operationalKpis = kpis.filter(k => k.category === 'operational');
    const hrKpis = kpis.filter(k => k.category === 'hr');
    const qualityKpis = kpis.filter(k => k.category === 'quality');

    const goals = [...this.goals.values()];
    const goalProgress = goals.length
      ? +(goals.reduce((s, g) => s + g.progress, 0) / goals.length).toFixed(1)
      : 0;

    const departments = [...this.departments.values()].sort((a, b) => b.performance - a.performance);

    return {
      summary: {
        totalRevenue: this._getKpiValue('REV_TOTAL'),
        totalExpenses: this._getKpiValue('EXP_TOTAL'),
        netIncome: this._getKpiValue('NET_INCOME'),
        cashFlow: this._getKpiValue('CASH_FLOW'),
        activeBeneficiaries: this._getKpiValue('BENEFICIARY_COUNT'),
        occupancyRate: this._getKpiValue('OCCUPANCY'),
        staffCount: this._getKpiValue('HEADCOUNT'),
        satisfactionScore: this._getKpiValue('SATISFACTION'),
      },
      financialKpis,
      operationalKpis,
      hrKpis,
      qualityKpis,
      alerts: alerts.slice(0, 10),
      alertCounts: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        info: alerts.filter(a => a.severity === 'info').length,
        total: alerts.length,
      },
      goalProgress,
      topGoals: goals.slice(0, 5),
      departmentRanking: departments.slice(0, 5),
      lastUpdated: new Date().toISOString(),
    };
  }

  _getKpiValue(code) {
    const kpi = [...this.kpiDefinitions.values()].find(k => k.code === code);
    return kpi ? kpi.currentValue : 0;
  }

  /* ══════════════════════════════════════════════════════════════════
     KPI MANAGEMENT — إدارة مؤشرات الأداء
     ══════════════════════════════════════════════════════════════════ */
  listKPIs(category) {
    let kpis = [...this.kpiDefinitions.values()];
    if (category) kpis = kpis.filter(k => k.category === category);
    return kpis;
  }

  getKPI(id) {
    return this.kpiDefinitions.get(id) || null;
  }

  createKPI(data, userId) {
    const id = this._nextKpiId();
    const kpi = {
      id,
      category: data.category || 'operational',
      code: data.code,
      nameAr: data.nameAr,
      nameEn: data.nameEn,
      unit: data.unit || '',
      target: data.target || 0,
      currentValue: data.currentValue || 0,
      previousValue: data.previousValue || 0,
      trend: data.currentValue >= data.previousValue ? 'up' : 'down',
      changePercent: data.previousValue ? +(((data.currentValue - data.previousValue) / data.previousValue) * 100).toFixed(1) : 0,
      format: data.format || 'number',
      updatedAt: new Date().toISOString(),
    };
    this.kpiDefinitions.set(id, kpi);
    this._addAudit('kpi_create', userId, `إنشاء مؤشر: ${kpi.nameAr}`);
    return kpi;
  }

  updateKPI(id, data, userId) {
    const kpi = this.kpiDefinitions.get(id);
    if (!kpi) return null;

    if (data.currentValue !== undefined) {
      kpi.previousValue = kpi.currentValue;
      kpi.currentValue = data.currentValue;
      kpi.trend = kpi.currentValue >= kpi.previousValue ? 'up' : 'down';
      kpi.changePercent = kpi.previousValue ? +(((kpi.currentValue - kpi.previousValue) / kpi.previousValue) * 100).toFixed(1) : 0;
    }
    Object.assign(kpi, {
      ...(data.nameAr && { nameAr: data.nameAr }),
      ...(data.nameEn && { nameEn: data.nameEn }),
      ...(data.target !== undefined && { target: data.target }),
      ...(data.unit && { unit: data.unit }),
      ...(data.category && { category: data.category }),
      updatedAt: new Date().toISOString(),
    });

    this.kpiDefinitions.set(id, kpi);
    this._addAudit('kpi_update', userId, `تحديث مؤشر: ${kpi.nameAr}`);
    return kpi;
  }

  deleteKPI(id, userId) {
    const kpi = this.kpiDefinitions.get(id);
    if (!kpi) return false;
    this.kpiDefinitions.delete(id);
    this._addAudit('kpi_delete', userId, `حذف مؤشر: ${kpi.nameAr}`);
    return true;
  }

  /* ── KPI Snapshots (trend history) ── */
  getKPITrend(kpiId, period) {
    const snaps = [...this.kpiSnapshots.values()]
      .filter(s => s.kpiId === kpiId)
      .sort((a, b) => new Date(a.capturedAt) - new Date(b.capturedAt));
    if (period) {
      return snaps.filter(s => s.period.startsWith(period));
    }
    return snaps;
  }

  addKPISnapshot(kpiId, value, period, userId) {
    const kpi = this.kpiDefinitions.get(kpiId);
    if (!kpi) return null;
    const id = this._nextSnapId();
    const snap = {
      id, kpiId, value, period,
      capturedAt: new Date().toISOString(),
    };
    this.kpiSnapshots.set(id, snap);
    this._addAudit('snapshot_add', userId, `تسجيل قراءة ${kpi.nameAr}: ${value}`);
    return snap;
  }

  /* ══════════════════════════════════════════════════════════════════
     ALERTS — التنبيهات التنفيذية
     ══════════════════════════════════════════════════════════════════ */
  listAlerts(filters = {}) {
    let alerts = [...this.alerts.values()];
    if (filters.severity) alerts = alerts.filter(a => a.severity === filters.severity);
    if (filters.category) alerts = alerts.filter(a => a.category === filters.category);
    if (filters.isResolved !== undefined) alerts = alerts.filter(a => a.isResolved === filters.isResolved);
    if (filters.unreadOnly) alerts = alerts.filter(a => !a.isRead);
    return alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getAlert(id) {
    return this.alerts.get(id) || null;
  }

  createAlert(data, userId) {
    const id = this._nextAlertId();
    const alert = {
      id,
      severity: data.severity || 'info',
      category: data.category || 'operational',
      titleAr: data.titleAr,
      titleEn: data.titleEn,
      descriptionAr: data.descriptionAr || '',
      descriptionEn: data.descriptionEn || '',
      department: data.department || '',
      isRead: false,
      isResolved: false,
      actionRequired: data.actionRequired || false,
      createdAt: new Date().toISOString(),
    };
    this.alerts.set(id, alert);
    this._addAudit('alert_create', userId, `تنبيه جديد: ${alert.titleAr}`);
    return alert;
  }

  markAlertRead(id, userId) {
    const alert = this.alerts.get(id);
    if (!alert) return null;
    alert.isRead = true;
    this.alerts.set(id, alert);
    this._addAudit('alert_read', userId, `قراءة تنبيه: ${alert.titleAr}`);
    return alert;
  }

  resolveAlert(id, userId, resolution) {
    const alert = this.alerts.get(id);
    if (!alert) return null;
    alert.isResolved = true;
    alert.isRead = true;
    alert.resolvedAt = new Date().toISOString();
    alert.resolvedBy = userId;
    alert.resolution = resolution || '';
    this.alerts.set(id, alert);
    this._addAudit('alert_resolve', userId, `حل تنبيه: ${alert.titleAr}`);
    return alert;
  }

  dismissAlert(id, userId) {
    const alert = this.alerts.get(id);
    if (!alert) return false;
    this.alerts.delete(id);
    this._addAudit('alert_dismiss', userId, `تجاهل تنبيه: ${alert.titleAr}`);
    return true;
  }

  /* ══════════════════════════════════════════════════════════════════
     STRATEGIC GOALS — الأهداف الاستراتيجية
     ══════════════════════════════════════════════════════════════════ */
  listGoals(status) {
    let goals = [...this.goals.values()];
    if (status) goals = goals.filter(g => g.status === status);
    return goals.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  }

  getGoal(id) {
    return this.goals.get(id) || null;
  }

  createGoal(data, userId) {
    const id = this._nextGoalId();
    const now = new Date().toISOString();
    const goal = {
      id,
      nameAr: data.nameAr,
      nameEn: data.nameEn,
      description: data.description || '',
      category: data.category || 'strategic',
      targetValue: data.targetValue || 100,
      currentValue: data.currentValue || 0,
      unit: data.unit || '%',
      status: data.status || 'not_started',
      progress: data.currentValue && data.targetValue
        ? +((data.currentValue / data.targetValue) * 100).toFixed(1)
        : 0,
      deadline: data.deadline || '',
      owner: data.owner || '',
      milestones: data.milestones || [],
      createdAt: now,
      updatedAt: now,
    };
    this.goals.set(id, goal);
    this._addAudit('goal_create', userId, `هدف جديد: ${goal.nameAr}`);
    return goal;
  }

  updateGoal(id, data, userId) {
    const goal = this.goals.get(id);
    if (!goal) return null;

    Object.assign(goal, {
      ...(data.nameAr && { nameAr: data.nameAr }),
      ...(data.nameEn && { nameEn: data.nameEn }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.targetValue !== undefined && { targetValue: data.targetValue }),
      ...(data.currentValue !== undefined && { currentValue: data.currentValue }),
      ...(data.status && { status: data.status }),
      ...(data.deadline && { deadline: data.deadline }),
      ...(data.owner && { owner: data.owner }),
      ...(data.milestones && { milestones: data.milestones }),
      updatedAt: new Date().toISOString(),
    });

    if (data.currentValue !== undefined || data.targetValue !== undefined) {
      goal.progress = goal.targetValue ? +((goal.currentValue / goal.targetValue) * 100).toFixed(1) : 0;
    }

    this.goals.set(id, goal);
    this._addAudit('goal_update', userId, `تحديث هدف: ${goal.nameAr}`);
    return goal;
  }

  deleteGoal(id, userId) {
    const goal = this.goals.get(id);
    if (!goal) return false;
    this.goals.delete(id);
    this._addAudit('goal_delete', userId, `حذف هدف: ${goal.nameAr}`);
    return true;
  }

  /* ══════════════════════════════════════════════════════════════════
     DEPARTMENT PERFORMANCE — أداء الأقسام
     ══════════════════════════════════════════════════════════════════ */
  listDepartments() {
    return [...this.departments.values()].sort((a, b) => b.performance - a.performance);
  }

  getDepartment(id) {
    return this.departments.get(id) || null;
  }

  updateDepartment(id, data, userId) {
    const dept = this.departments.get(id);
    if (!dept) return null;
    Object.assign(dept, {
      ...(data.performance !== undefined && { performance: data.performance }),
      ...(data.budget !== undefined && { budget: data.budget }),
      ...(data.budgetUsed !== undefined && { budgetUsed: data.budgetUsed }),
      ...(data.staffCount !== undefined && { staffCount: data.staffCount }),
      ...(data.satisfaction !== undefined && { satisfaction: data.satisfaction }),
      updatedAt: new Date().toISOString(),
    });
    this.departments.set(id, dept);
    this._addAudit('dept_update', userId, `تحديث أداء قسم: ${dept.nameAr}`);
    return dept;
  }

  getDepartmentComparison() {
    const depts = [...this.departments.values()];
    return {
      byPerformance: depts.sort((a, b) => b.performance - a.performance),
      byBudgetUtilization: depts.map(d => ({
        ...d,
        utilization: d.budget ? +((d.budgetUsed / d.budget) * 100).toFixed(1) : 0,
      })).sort((a, b) => b.utilization - a.utilization),
      bySatisfaction: [...depts].sort((a, b) => b.satisfaction - a.satisfaction),
      totalBudget: depts.reduce((s, d) => s + (d.budget || 0), 0),
      totalBudgetUsed: depts.reduce((s, d) => s + (d.budgetUsed || 0), 0),
      totalStaff: depts.reduce((s, d) => s + (d.staffCount || 0), 0),
      avgPerformance: +(depts.reduce((s, d) => s + d.performance, 0) / depts.length).toFixed(1),
      avgSatisfaction: +(depts.reduce((s, d) => s + d.satisfaction, 0) / depts.length).toFixed(1),
    };
  }

  /* ══════════════════════════════════════════════════════════════════
     WIDGETS & LAYOUTS — الأدوات والتخطيطات
     ══════════════════════════════════════════════════════════════════ */
  listWidgets() {
    return [...this.widgets.values()];
  }

  getWidget(id) {
    return this.widgets.get(id) || null;
  }

  createWidget(data, userId) {
    const id = this._nextWidgetId();
    const w = {
      id,
      type: data.type || 'kpi_card',
      title: data.title,
      kpiId: data.kpiId || null,
      position: data.position || { x: 0, y: 0, w: 3, h: 1 },
      visible: data.visible !== false,
      config: data.config || {},
      createdAt: new Date().toISOString(),
    };
    this.widgets.set(id, w);
    this._addAudit('widget_create', userId, `إنشاء أداة: ${w.title}`);
    return w;
  }

  updateWidget(id, data, userId) {
    const w = this.widgets.get(id);
    if (!w) return null;
    Object.assign(w, {
      ...(data.title && { title: data.title }),
      ...(data.type && { type: data.type }),
      ...(data.kpiId !== undefined && { kpiId: data.kpiId }),
      ...(data.position && { position: data.position }),
      ...(data.visible !== undefined && { visible: data.visible }),
      ...(data.config && { config: data.config }),
    });
    this.widgets.set(id, w);
    this._addAudit('widget_update', userId, `تحديث أداة: ${w.title}`);
    return w;
  }

  deleteWidget(id, userId) {
    const w = this.widgets.get(id);
    if (!w) return false;
    this.widgets.delete(id);
    this._addAudit('widget_delete', userId, `حذف أداة: ${w.title}`);
    return true;
  }

  listLayouts() {
    return [...this.layouts.values()];
  }

  getLayout(id) {
    return this.layouts.get(id) || null;
  }

  createLayout(data, userId) {
    const id = this._nextLayoutId();
    const layout = {
      id,
      name: data.name,
      nameEn: data.nameEn || '',
      isDefault: false,
      widgetIds: data.widgetIds || [],
      columns: data.columns || 12,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };
    this.layouts.set(id, layout);
    this._addAudit('layout_create', userId, `تخطيط جديد: ${layout.name}`);
    return layout;
  }

  setDefaultLayout(id, userId) {
    const layout = this.layouts.get(id);
    if (!layout) return null;
    for (const l of this.layouts.values()) l.isDefault = false;
    layout.isDefault = true;
    this.layouts.set(id, layout);
    this._addAudit('layout_default', userId, `تعيين تخطيط افتراضي: ${layout.name}`);
    return layout;
  }

  deleteLayout(id, userId) {
    const layout = this.layouts.get(id);
    if (!layout) return false;
    if (layout.isDefault) return false;
    this.layouts.delete(id);
    this._addAudit('layout_delete', userId, `حذف تخطيط: ${layout.name}`);
    return true;
  }

  /* ══════════════════════════════════════════════════════════════════
     BENCHMARKS — المقارنة المعيارية
     ══════════════════════════════════════════════════════════════════ */
  listBenchmarks() {
    return [...this.benchmarks.values()];
  }

  getBenchmarkForKPI(kpiCode) {
    return [...this.benchmarks.values()].find(b => b.kpiCode === kpiCode) || null;
  }

  /* ══════════════════════════════════════════════════════════════════
     EXECUTIVE REPORTS — التقارير التنفيذية
     ══════════════════════════════════════════════════════════════════ */
  generateReport(type, period, userId) {
    const id = this._nextReportId();
    const kpis = [...this.kpiDefinitions.values()];
    const goals = [...this.goals.values()];
    const departments = [...this.departments.values()];
    const alerts = [...this.alerts.values()];

    const report = {
      id,
      type: type || 'monthly',
      period: period || new Date().toISOString().substring(0, 7),
      generatedAt: new Date().toISOString(),
      generatedBy: userId,
      status: 'completed',
      summary: {
        totalKPIs: kpis.length,
        kpisOnTarget: kpis.filter(k => k.currentValue >= k.target).length,
        kpisBelowTarget: kpis.filter(k => k.currentValue < k.target).length,
        activeGoals: goals.filter(g => g.status !== 'completed').length,
        goalsOnTrack: goals.filter(g => g.status === 'on_track').length,
        goalsAtRisk: goals.filter(g => g.status === 'at_risk').length,
        avgDeptPerformance: departments.length
          ? +(departments.reduce((s, d) => s + d.performance, 0) / departments.length).toFixed(1)
          : 0,
        openAlerts: alerts.filter(a => !a.isResolved).length,
        criticalAlerts: alerts.filter(a => a.severity === 'critical' && !a.isResolved).length,
      },
      financials: {
        revenue: this._getKpiValue('REV_TOTAL'),
        expenses: this._getKpiValue('EXP_TOTAL'),
        netIncome: this._getKpiValue('NET_INCOME'),
        cashFlow: this._getKpiValue('CASH_FLOW'),
        budgetUtilization: this._getKpiValue('BUDGET_UTIL'),
      },
      operations: {
        beneficiaries: this._getKpiValue('BENEFICIARY_COUNT'),
        sessions: this._getKpiValue('SESSION_COUNT'),
        occupancy: this._getKpiValue('OCCUPANCY'),
        avgStay: this._getKpiValue('AVG_STAY'),
      },
      hrMetrics: {
        headcount: this._getKpiValue('HEADCOUNT'),
        turnover: this._getKpiValue('TURNOVER'),
        attendance: this._getKpiValue('ATTENDANCE'),
        trainingHours: this._getKpiValue('TRAINING_HOURS'),
      },
      quality: {
        satisfaction: this._getKpiValue('SATISFACTION'),
        compliance: this._getKpiValue('COMPLIANCE'),
        incidentRate: this._getKpiValue('INCIDENT_RATE'),
      },
    };

    this.reports.set(id, report);
    this._addAudit('report_generate', userId, `تقرير تنفيذي: ${report.type} - ${report.period}`);
    return report;
  }

  listReports() {
    return [...this.reports.values()].sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
  }

  getReport(id) {
    return this.reports.get(id) || null;
  }

  exportReport(id, format) {
    const report = this.reports.get(id);
    if (!report) return null;

    if (format === 'csv') {
      const lines = ['Section,Metric,Value'];
      const sections = ['financials', 'operations', 'hrMetrics', 'quality'];
      sections.forEach(sec => {
        if (report[sec]) {
          Object.entries(report[sec]).forEach(([k, v]) => {
            lines.push(`${sec},${k},${v}`);
          });
        }
      });
      return { format: 'csv', fileName: `executive_report_${report.period}.csv`, data: lines.join('\n') };
    }

    return { format: 'json', fileName: `executive_report_${report.period}.json`, data: JSON.stringify(report, null, 2) };
  }

  /* ══════════════════════════════════════════════════════════════════
     COMPARATIVE ANALYTICS — التحليلات المقارنة
     ══════════════════════════════════════════════════════════════════ */
  getComparativeAnalysis(period1, period2) {
    const snap1 = [...this.kpiSnapshots.values()].filter(s => s.period === period1);
    const snap2 = [...this.kpiSnapshots.values()].filter(s => s.period === period2);

    const comparisons = [];
    const kpiIds = new Set([...snap1.map(s => s.kpiId), ...snap2.map(s => s.kpiId)]);

    for (const kpiId of kpiIds) {
      const kpi = this.kpiDefinitions.get(kpiId);
      const v1 = snap1.find(s => s.kpiId === kpiId);
      const v2 = snap2.find(s => s.kpiId === kpiId);
      if (kpi && v1 && v2) {
        comparisons.push({
          kpiId,
          code: kpi.code,
          nameAr: kpi.nameAr,
          nameEn: kpi.nameEn,
          period1Value: v1.value,
          period2Value: v2.value,
          change: +(v2.value - v1.value).toFixed(2),
          changePercent: v1.value ? +(((v2.value - v1.value) / v1.value) * 100).toFixed(1) : 0,
          trend: v2.value >= v1.value ? 'up' : 'down',
        });
      }
    }
    return { period1, period2, comparisons };
  }

  /* ══════════════════════════════════════════════════════════════════
     REFERENCE DATA
     ══════════════════════════════════════════════════════════════════ */
  getDepartmentList() { return DEPARTMENTS; }
  getKPICategories() { return KPI_CATEGORIES; }
  getWidgetTypes() { return WIDGET_TYPES; }
  getAlertSeverities() { return ALERT_SEVERITIES; }
  getPeriods() { return PERIODS; }
  getStrategicStatuses() { return STRATEGIC_STATUSES; }

  /* ══════════════════════════════════════════════════════════════════
     STATISTICS — الإحصائيات
     ══════════════════════════════════════════════════════════════════ */
  getStatistics() {
    const kpis = [...this.kpiDefinitions.values()];
    const goals = [...this.goals.values()];
    const alerts = [...this.alerts.values()];
    const departments = [...this.departments.values()];

    return {
      kpiStats: {
        total: kpis.length,
        onTarget: kpis.filter(k => k.currentValue >= k.target).length,
        belowTarget: kpis.filter(k => k.currentValue < k.target).length,
        avgTargetCompletion: kpis.length
          ? +(kpis.reduce((s, k) => s + (k.target ? (k.currentValue / k.target) * 100 : 0), 0) / kpis.length).toFixed(1)
          : 0,
      },
      goalStats: {
        total: goals.length,
        onTrack: goals.filter(g => g.status === 'on_track').length,
        atRisk: goals.filter(g => g.status === 'at_risk').length,
        behind: goals.filter(g => g.status === 'behind').length,
        completed: goals.filter(g => g.status === 'completed').length,
        avgProgress: goals.length
          ? +(goals.reduce((s, g) => s + g.progress, 0) / goals.length).toFixed(1)
          : 0,
      },
      alertStats: {
        total: alerts.length,
        unresolved: alerts.filter(a => !a.isResolved).length,
        critical: alerts.filter(a => a.severity === 'critical' && !a.isResolved).length,
        unread: alerts.filter(a => !a.isRead).length,
      },
      departmentStats: {
        total: departments.length,
        avgPerformance: departments.length
          ? +(departments.reduce((s, d) => s + d.performance, 0) / departments.length).toFixed(1)
          : 0,
        totalStaff: departments.reduce((s, d) => s + (d.staffCount || 0), 0),
        totalBudget: departments.reduce((s, d) => s + (d.budget || 0), 0),
      },
    };
  }

  /* ══════════════════════════════════════════════════════════════════
     AUDIT LOG — سجل المراجعة
     ══════════════════════════════════════════════════════════════════ */
  _addAudit(action, userId, details) {
    const id = this._nextAuditId();
    this.auditLogs.set(id, { id, action, userId, details, timestamp: new Date().toISOString() });
  }

  getAuditLog(limit) {
    const logs = [...this.auditLogs.values()].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return limit ? logs.slice(0, limit) : logs;
  }
}

/* ── Singleton ── */
module.exports = new CEODashboardService();
