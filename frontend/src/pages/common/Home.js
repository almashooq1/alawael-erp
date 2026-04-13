/**
 * Home — الصفحة الرئيسية (Comprehensive Dashboard)
 * All 13 system sections with 94+ modules organized systematically
 * Premium design with animated KPIs, glass cards, search, and module grid
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp as TrendingUpIcon,
  Shield as ShieldIcon,
  AccountTree as AccountTreeIcon,
  Groups as GroupsIcon,
  AccessTime as AccessTimeIcon,
  QueryStats as QueryStatsIcon,
  Home as HomeIcon,
  ErrorOutline as ErrorOutlineIcon,
  CalendarMonth as CalendarIcon,
  Bolt as BoltIcon,
  AutoAwesome as SparkleIcon,
  KeyboardArrowLeft,
  OpenInNew as OpenInNewIcon,
  Search as SearchIcon,
  Dashboard as DashboardIcon,
  LocalHospital as RehabIcon,
  People as PeopleIcon,
  AccountBalance as FinanceIcon,
  Settings as OperationsIcon,
  Message as CommunicationsIcon,
  Description as DocumentsIcon,
  Analytics as AnalyticsIcon,
  Business as BusinessIcon,
  School as PortalIcon,
  Policy as GovernmentIcon,
  Flag as AdministrativeIcon,
  AdminPanelSettings as SystemAdminIcon,
  ExpandMore as ExpandMoreIcon,
  Apps as AppsIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import moduleMocks from 'data/moduleMocks';
import { useRealTimeKPIs } from 'contexts/SocketContext';
import { dashboardAPI } from 'services/api';
import { useSnackbar } from '../../contexts/SnackbarContext';

/* ═══════════════════════════════════════════════════════════════════════════
 *  COMPREHENSIVE SYSTEM SECTIONS — All 13 modules from sidebarNavConfig
 *  Organized systematically matching the sidebar navigation structure
 * ═══════════════════════════════════════════════════════════════════════════ */
const systemSections = [
  // ═══ ① لوحات التحكم الرئيسية ═══
  {
    title: 'لوحات التحكم الرئيسية',
    emoji: '🏠',
    accent: 'green',
    description: 'اللوحات الرئيسية والمراقبة ولوحات البريميوم',
    items: [
      { title: 'لوحة التحكم', path: '/dashboard' },
      { title: 'المراقبة', path: '/monitoring' },
      { title: 'مركز البريميوم', path: '/premium', badge: 'NEW' },
      { title: 'لوحة الرئيس التنفيذي', path: '/ceo-pro', badge: 'PRO' },
      { title: 'الموارد البشرية المتقدمة', path: '/hr-pro', badge: 'PRO' },
      { title: 'المالية والمحاسبة PRO', path: '/finance-pro', badge: 'PRO' },
      { title: 'إدارة المرضى', path: '/patients-pro', badge: 'PRO' },
      { title: 'الجدول والمواعيد PRO', path: '/schedule-pro', badge: 'PRO' },
      { title: 'التقارير والذكاء', path: '/reports-pro', badge: 'PRO' },
      { title: 'المخزون والتوريد PRO', path: '/inventory-pro', badge: 'PRO' },
      { title: 'الأمان والحماية PRO', path: '/security-pro', badge: 'PRO' },
      { title: 'التحليلات المتقدمة', path: '/analytics-pro', badge: 'PRO' },
      { title: 'لوحة المعالج المتكاملة', path: '/therapist-pro', badge: 'PRO' },
      { title: 'مؤشرات الأداء الاستراتيجية', path: '/kpi-pro', badge: 'PRO' },
      { title: 'لوحة التأهيل الشاملة', path: '/rehab-pro', badge: 'PRO' },
      { title: 'الإدارة التنفيذية', path: '/admin-executive', badge: 'PRO' },
      { title: 'الصيدلية والأدوية', path: '/pharmacy-pro', badge: 'PRO' },
      { title: 'المختبرات والتحاليل', path: '/lab-pro', badge: 'PRO' },
      { title: 'التأمين الصحي PRO', path: '/insurance-pro', badge: 'PRO' },
      { title: 'الجودة والامتثال PRO', path: '/quality-pro', badge: 'PRO' },
      { title: 'التدريب والتطوير PRO', path: '/training-pro', badge: 'PRO' },
      { title: 'علاقات العملاء PRO', path: '/crm-pro', badge: 'PRO' },
      { title: 'العمليات والتشغيل PRO', path: '/operations-pro', badge: 'PRO' },
      { title: 'التمريض والرعاية', path: '/nursing-pro', badge: 'PRO' },
      { title: 'المشتريات والعقود PRO', path: '/procurement-pro', badge: 'PRO' },
      { title: 'الأشعة والتصوير', path: '/radiology-pro', badge: 'PRO' },
      { title: 'الطوارئ والإسعاف', path: '/emergency-pro', badge: 'PRO' },
      { title: 'إدارة المخاطر PRO', path: '/risk-pro', badge: 'PRO' },
      { title: 'التغذية والمطبخ PRO', path: '/nutrition-pro', badge: 'PRO' },
      { title: 'مكافحة العدوى', path: '/infection-control-pro', badge: 'PRO' },
      { title: 'الخدمة الاجتماعية', path: '/social-work-pro', badge: 'PRO' },
      { title: 'الصيانة والمرافق PRO', path: '/maintenance-pro', badge: 'PRO' },
      { title: 'بنك الدم', path: '/blood-bank-pro', badge: 'PRO' },
      { title: 'السجلات الطبية PRO', path: '/medical-records-pro', badge: 'PRO' },
      { title: 'النقل والمواصلات', path: '/transport-pro', badge: 'PRO' },
      { title: 'الامتثال التنظيمي', path: '/compliance-pro', badge: 'PRO' },
      { title: 'النفايات الطبية', path: '/waste-management-pro', badge: 'PRO' },
      { title: 'الطب عن بُعد PRO', path: '/telemedicine-pro', badge: 'PRO' },
      { title: 'الأبحاث السريرية', path: '/clinical-trials-pro', badge: 'PRO' },
      { title: 'سلامة المرضى', path: '/patient-safety-pro', badge: 'PRO' },
      { title: 'إعدادات النظام PRO', path: '/settings-pro', badge: 'PRO' },
      { title: 'مركز الإشعارات PRO', path: '/notifications-pro', badge: 'PRO' },
    ],
  },

  // ═══ ② الخدمات الأساسية ═══
  {
    title: 'الخدمات الأساسية',
    emoji: '🏥',
    accent: 'emerald',
    description: 'المستفيدون والتأهيل والتعليم والجلسات والملفات الطبية',
    items: [
      { title: 'لوحة تحكم المستفيدين', path: '/beneficiaries-dashboard' },
      { title: 'قائمة المستفيدين', path: '/beneficiaries' },
      { title: 'تسجيل طالب جديد', path: '/student-registration' },
      { title: 'جدول المستفيدين', path: '/beneficiaries/table' },
      { title: 'لوحة تحكم الطلاب', path: '/students-dashboard' },
      { title: 'إدارة الطلاب', path: '/student-management' },
      { title: 'مركز تقارير الطلاب', path: '/student-reports-center' },
      { title: 'التقرير الدوري', path: '/student-reports/periodic' },
      { title: 'تقرير المقارنة', path: '/student-reports/comparison' },
      { title: 'قوالب الطباعة', path: '/beneficiaries/templates' },
      { title: 'العلاج والتأهيل', path: '/rehab' },
      { title: 'خطط الرعاية', path: '/integrated-care' },
      { title: 'مقاييس التقييم', path: '/assessment-scales' },
      { title: 'اختبارات التقييم', path: '/assessment-tests' },
      { title: 'لوحة تحكم التأهيل', path: '/disability-rehab-dashboard' },
      { title: 'البرامج التأهيلية', path: '/rehab-programs' },
      { title: 'الجلسات العلاجية', path: '/therapy-sessions-admin' },
      { title: 'الأجهزة المساعدة', path: '/assistive-devices' },
      { title: 'تقارير التأهيل', path: '/disability-rehab-reports' },
      { title: 'مكتبة المقاييس المتخصصة', path: '/specialized-scales' },
      { title: 'تطبيق المقاييس', path: '/scale-administration' },
      { title: 'مكتبة برامج التأهيل', path: '/rehab-programs-library' },
      { title: 'تسجيل البرامج', path: '/program-enrollment' },
      { title: 'متابعة التقدم', path: '/rehab-progress' },
      { title: 'إدارة السلوك', path: '/behavior-management' },
      { title: 'لوحة تحكم الجلسات', path: '/sessions-dashboard' },
      { title: 'إدارة الجلسات', path: '/sessions' },
      { title: 'الملفات الطبية', path: '/medical-files' },
      { title: 'الدعم النفسي والاجتماعي', path: '/mhpss' },
      { title: 'الحياة المستقلة', path: '/independent-living' },
      { title: 'قائمة الانتظار', path: '/waitlist' },
      { title: 'التعليم الإلكتروني', path: '/lms' },
      { title: 'التعليم والتأهيل', path: '/education' },
      { title: 'لوحة تحكم مونتيسوري', path: '/montessori' },
      { title: 'طلاب مونتيسوري', path: '/montessori/students' },
      { title: 'برامج مونتيسوري', path: '/montessori/programs' },
      { title: 'جلسات مونتيسوري', path: '/montessori/sessions' },
      { title: 'فريق مونتيسوري', path: '/montessori/team' },
    ],
  },

  // ═══ ③ الموارد البشرية ═══
  {
    title: 'الموارد البشرية',
    emoji: '👥',
    accent: 'blue',
    description: 'إدارة الموظفين والرواتب والتوظيف والتدريب والأداء',
    items: [
      { title: 'لوحة الموارد البشرية', path: '/hr' },
      { title: 'إدارة الموظفين', path: '/hr/employees' },
      { title: 'الحضور والانصراف', path: '/hr/attendance' },
      { title: 'إدارة الإجازات', path: '/hr/leaves' },
      { title: 'الرواتب', path: '/hr/payroll' },
      { title: 'الحوافز', path: '/hr/incentives' },
      { title: 'هيكل التعويضات', path: '/hr/compensation' },
      { title: 'تحليلات الرواتب', path: '/hr/analytics' },
      { title: 'كشف الراتب', path: '/hr/salary-slip' },
      { title: 'معالجة الرواتب', path: '/hr/payroll-processing' },
      { title: 'تقارير الرواتب', path: '/hr/payroll-reports' },
      { title: 'إعدادات الرواتب', path: '/hr/payroll-settings' },
      { title: 'مكافأة نهاية الخدمة', path: '/hr/end-of-service' },
      { title: 'الهيكل التنظيمي', path: '/organization' },
      { title: 'تأمين الموظفين الصحي', path: '/hr/insurance' },
      { title: 'التوظيف والاستقطاب', path: '/recruitment' },
      { title: 'لوحة تحكم التدريب', path: '/training' },
      { title: 'البرامج التدريبية', path: '/training/programs' },
      { title: 'تقارير التدريب', path: '/training/reports' },
      { title: 'الأداء والتخطيط', path: '/performance' },
    ],
  },

  // ═══ ④ المالية والمحاسبة ═══
  {
    title: 'المالية والمحاسبة',
    emoji: '💰',
    accent: 'amber',
    description: 'المحاسبة والفواتير والضرائب والبنوك والتقارير المالية',
    items: [
      { title: 'لوحة المحاسبة', path: '/accounting' },
      { title: 'دليل الحسابات', path: '/accounting/chart-of-accounts' },
      { title: 'القيود اليومية', path: '/accounting/journal-entries' },
      { title: 'الأستاذ العام', path: '/accounting/general-ledger' },
      { title: 'ميزان المراجعة', path: '/accounting/trial-balance' },
      { title: 'الفواتير', path: '/accounting/invoices' },
      { title: 'المصروفات', path: '/accounting/expenses' },
      { title: 'المدفوعات', path: '/finance' },
      { title: 'الموازنات', path: '/accounting/budgets' },
      { title: 'الموازنة مقابل الفعلي', path: '/accounting/budget-variance' },
      { title: 'مراكز التكلفة', path: '/accounting/cost-centers' },
      { title: 'التدفقات النقدية', path: '/accounting/cash-flow' },
      { title: 'الأصول الثابتة', path: '/accounting/fixed-assets' },
      { title: 'جدول الإهلاك', path: '/accounting/depreciation' },
      { title: 'الضريبة والزكاة', path: '/accounting/vat-zakat' },
      { title: 'ضريبة الاستقطاع', path: '/accounting/withholding-tax' },
      { title: 'التقويم الضريبي', path: '/accounting/tax-calendar' },
      { title: 'الفوترة الإلكترونية', path: '/e-invoicing' },
      { title: 'التسوية البنكية', path: '/accounting/bank-reconciliation' },
      { title: 'إدارة الشيكات', path: '/accounting/cheques' },
      { title: 'سندات الصرف والقبض', path: '/accounting/payment-vouchers' },
      { title: 'العملات وأسعار الصرف', path: '/accounting/multi-currency' },
      { title: 'المعاملات المتكررة', path: '/accounting/recurring-transactions' },
      { title: 'إشعارات دائن/مدين', path: '/accounting/credit-debit-notes' },
      { title: 'التقارير المالية', path: '/accounting/reports' },
      { title: 'النسب المالية', path: '/accounting/financial-ratios' },
      { title: 'تقارير أعمار الديون', path: '/accounting/aged-reports' },
      { title: 'كشوف حساب العملاء', path: '/accounting/customer-statements' },
      { title: 'الفترات المالية', path: '/accounting/fiscal-periods' },
      { title: 'سجل المراجعة', path: '/accounting/audit-trail' },
      { title: 'الملخص التنفيذي', path: '/accounting/executive-summary' },
      { title: 'التبرعات', path: '/donations' },
      { title: 'إعدادات المحاسبة', path: '/accounting/settings' },
      { title: 'قائمة الأرباح والخسائر', path: '/accounting/profit-loss' },
      { title: 'الميزانية العمومية', path: '/accounting/balance-sheet' },
      { title: 'الحسابات البنكية', path: '/accounting/bank-accounts' },
      { title: 'العهد والصندوق', path: '/accounting/petty-cash' },
      { title: 'سلف الموظفين', path: '/accounting/employee-loans' },
      { title: 'مدفوعات الموردين', path: '/accounting/vendor-payments' },
      { title: 'إقفال الفترات', path: '/finance/period-closing' },
      { title: 'تسوية الحسابات', path: '/finance/account-reconciliation' },
      { title: 'التحصيل والمطالبات', path: '/finance/dunning' },
      { title: 'خطابات الضمان', path: '/finance/bank-guarantees' },
      { title: 'إدارة الخزينة', path: '/finance/treasury' },
      { title: 'الإقرارات الضريبية', path: '/finance/tax-filing' },
      { title: 'الاعتمادات المالية', path: '/finance/financial-approvals' },
      { title: 'القروض والتمويل', path: '/finance/company-loans' },
      { title: 'التجميع المالي', path: '/finance/consolidation' },
      { title: 'الاعتراف بالإيراد', path: '/finance/revenue-recognition' },
      { title: 'محاسبة الإيجارات', path: '/finance/leases' },
      { title: 'المحفظة الاستثمارية', path: '/finance/investments' },
      { title: 'إدارة الائتمان', path: '/finance/credit-management' },
      { title: 'التخطيط المالي', path: '/finance/financial-planning' },
      { title: 'الامتثال والرقابة', path: '/finance/compliance' },
      { title: 'التسويات بين الشركات', path: '/finance/intercompany' },
      { title: 'إدارة المخاطر المالية', path: '/finance/risk-management' },
      { title: 'لوحات البيانات المالية', path: '/finance/dashboards' },
      { title: 'إدارة الخزينة المتقدمة', path: '/finance/treasury-management' },
      { title: 'إدارة الديون', path: '/finance/debt-management' },
      { title: 'توزيع التكاليف', path: '/finance/cost-allocation' },
      { title: 'سير العمل المالي', path: '/finance/workflow' },
      { title: 'التخطيط الضريبي', path: '/finance/tax-planning' },
      { title: 'إدارة التدقيق', path: '/finance/audit-manager' },
      { title: 'إدارة الميزانيات', path: '/budget-management' },
    ],
  },

  // ═══ ⑤ العمليات والإمداد ═══
  {
    title: 'العمليات والإمداد',
    emoji: '⚙️',
    accent: 'slate',
    description: 'العمليات والأسطول والصيانة والموردين والمشاريع وسلاسل الإمداد',
    items: [
      { title: 'لوحة تحكم العمليات', path: '/operations-dashboard' },
      { title: 'إدارة العمليات', path: '/operations' },
      { title: 'إدارة المخزون', path: '/inventory' },
      { title: 'المشتريات', path: '/purchasing' },
      { title: 'المعدات والأصول', path: '/equipment' },
      { title: 'إدارة الحوادث', path: '/incidents' },
      { title: 'الرخص والتصاريح', path: '/licenses' },
      { title: 'تراخيص مراكز التأهيل', path: '/rehab-licenses' },
      { title: 'مخازن الفروع', path: '/branch-warehouses' },
      { title: 'تحويلات المخزون', path: '/stock-transfers' },
      { title: 'مشتريات الفروع', path: '/branch-purchasing' },
      { title: 'تقارير الفروع', path: '/branch-reports' },
      { title: 'لوحة تحكم الأسطول', path: '/fleet-dashboard' },
      { title: 'إدارة الأسطول', path: '/fleet' },
      { title: 'إدارة المركبات', path: '/vehicle-management' },
      { title: 'إدارة التأمين', path: '/insurance-management' },
      { title: 'إدارة النقل', path: '/transport-management' },
      { title: 'الصيانة والمرافق', path: '/maintenance' },
      { title: 'إدارة الموردين', path: '/vendors' },
      { title: 'لوحة تحكم العقود', path: '/contracts-dashboard' },
      { title: 'إدارة العقود', path: '/contracts' },
      { title: 'إدارة المشاريع', path: '/projects' },
      { title: 'لوحة تحكم الجودة', path: '/quality-dashboard' },
      { title: 'إدارة الجودة', path: '/quality' },
      { title: 'التدقيق الداخلي', path: '/internal-audit' },
      { title: 'تقييم المخاطر', path: '/risk-assessment' },
      { title: 'إدارة المطبخ', path: '/kitchen' },
      { title: 'إدارة المغسلة', path: '/laundry' },
      { title: 'تتبع GPS', path: '/gps-tracking' },
      { title: 'إنترنت الأشياء (IoT)', path: '/iot' },
      { title: 'إدارة المستودعات', path: '/warehouse' },
      { title: 'سلسلة الإمداد', path: '/supply-chain' },
      { title: 'الصحة والسلامة (HSE)', path: '/hse' },
      { title: 'إدارة الأزمات', path: '/crisis' },
      { title: 'الدعم الفني (HelpDesk)', path: '/helpdesk' },
    ],
  },

  // ═══ ⑥ التواصل والمراسلات ═══
  {
    title: 'التواصل والمراسلات',
    emoji: '📨',
    accent: 'violet',
    description: 'الرسائل والاتصالات الإدارية والتوجيهات والإشعارات',
    items: [
      { title: 'الرسائل', path: '/messages' },
      { title: 'نظام التواصل', path: '/communications-system' },
      { title: 'لوحة الاتصالات الإدارية', path: '/admin-communications' },
      { title: 'البريد الوارد', path: '/admin-communications/inbox' },
      { title: 'البريد الصادر', path: '/admin-communications/outbox' },
      { title: 'المراسلات الداخلية', path: '/admin-communications/all' },
      { title: 'مراسلة جديدة', path: '/admin-communications/compose' },
      { title: 'قوالب المراسلات', path: '/admin-communications/templates' },
      { title: 'الجهات الخارجية', path: '/admin-communications/external-entities' },
      { title: 'لوحة التوجيهات', path: '/electronic-directives' },
      { title: 'قائمة التوجيهات', path: '/electronic-directives/list' },
      { title: 'توجيه جديد', path: '/electronic-directives/compose' },
      { title: 'مركز الإشعارات', path: '/smart-notifications' },
      { title: 'الاجتماعات', path: '/meetings' },
      { title: 'العلاقات العامة', path: '/public-relations' },
    ],
  },

  // ═══ ⑦ المستندات والأرشفة ═══
  {
    title: 'المستندات والأرشفة',
    emoji: '📄',
    accent: 'teal',
    description: 'المستندات والتوقيع والختم الإلكتروني والنماذج ومركز الطباعة',
    items: [
      { title: 'المستندات', path: '/documents' },
      { title: 'المستندات الذكية', path: '/smart-documents' },
      { title: 'الأرشفة الإلكترونية', path: '/archiving' },
      { title: 'لوحة الوسائط', path: '/media-library' },
      { title: 'لوحة التوقيع الإلكتروني', path: '/e-signature' },
      { title: 'طلب توقيع جديد', path: '/e-signature/create' },
      { title: 'قوالب التوقيع', path: '/e-signature/templates' },
      { title: 'التحقق من التوقيع', path: '/e-signature/verify' },
      { title: 'لوحة الأختام', path: '/e-stamp' },
      { title: 'إنشاء ختم جديد', path: '/e-stamp/create' },
      { title: 'التحقق من ختم', path: '/e-stamp/verify' },
      { title: 'النماذج الجاهزة', path: '/form-templates' },
      { title: 'إدارة المحتوى', path: '/cms' },
      { title: 'جميع قوالب الطباعة', path: '/print-center' },
      { title: 'قوالب الموارد البشرية', path: '/print-center/hr' },
      { title: 'قوالب المالية', path: '/print-center/finance' },
      { title: 'قوالب العلاج والتأهيل', path: '/print-center/therapy' },
      { title: 'قوالب الإدارة', path: '/print-center/admin' },
      { title: 'قوالب العمليات', path: '/print-center/operations' },
    ],
  },

  // ═══ ⑧ التحليلات والذكاء ═══
  {
    title: 'التحليلات والذكاء',
    emoji: '📊',
    accent: 'indigo',
    description: 'التحليلات والتقارير وإدارة علاقات العملاء ومؤشرات الأداء',
    items: [
      { title: 'لوحة التحليلات', path: '/analytics' },
      { title: 'التقارير', path: '/reports' },
      { title: 'التحليلات الذكية', path: '/ai-analytics' },
      { title: 'تقارير متقدمة', path: '/analytics/advanced' },
      { title: 'تصدير واستيراد', path: '/export-import' },
      { title: 'مركز الاستيراد والتصدير', path: '/import-export', badge: 'PRO' },
      { title: 'لوحة تحكم CRM', path: '/crm' },
      { title: 'جهات الاتصال', path: '/crm/contacts' },
      { title: 'العملاء المحتملين', path: '/crm/leads' },
      { title: 'تقارير CRM', path: '/crm/reports' },
      { title: 'مؤشرات الأداء', path: '/kpi-dashboard' },
      { title: 'البحث والدراسات', path: '/research' },
      { title: 'لوحة BI التحليلية', path: '/bi-dashboard' },
    ],
  },

  // ═══ ⑨ إدارة الأعمال ═══
  {
    title: 'إدارة الأعمال',
    emoji: '🏢',
    accent: 'orange',
    description: 'الإدارة وسير العمل والمهام والتذاكر والشكاوى',
    items: [
      { title: 'لوحة الإدارة', path: '/administration' },
      { title: 'القرارات والمذكرات', path: '/administration/decisions' },
      { title: 'المراسلات الإدارية', path: '/administration/correspondence' },
      { title: 'التفويضات', path: '/administration/delegations' },
      { title: 'لوحة سير العمل', path: '/workflow' },
      { title: 'مُنشئ سير العمل', path: '/workflow/builder' },
      { title: 'مهامي', path: '/workflow/my-tasks' },
      { title: 'النسخ المنفذة', path: '/workflow/instances' },
      { title: 'قوالب سير العمل', path: '/workflow/templates' },
      { title: 'تحليلات سير العمل', path: '/workflow/analytics' },
      { title: 'إدارة المهام', path: '/tasks' },
      { title: 'نظام التذاكر', path: '/advanced-tickets' },
      { title: 'الشكاوى والمقترحات', path: '/complaints' },
      { title: 'سجل الزوار', path: '/visitors' },
      { title: 'مركز المعرفة', path: '/knowledge-center' },
      { title: 'المتجر الإلكتروني', path: '/ecommerce' },
    ],
  },

  // ═══ ⑩ البوابات الإلكترونية ═══
  {
    title: 'البوابات الإلكترونية',
    emoji: '🚪',
    accent: 'cyan',
    description: 'بوابات الطالب والمعالج وولي الأمر والموظف',
    items: [
      { title: 'بوابة الطالب', path: '/student-portal' },
      { title: 'لوحة تحكم المعالج', path: '/therapist-portal' },
      { title: 'المرضى', path: '/therapist-portal/patients' },
      { title: 'جدول المعالج', path: '/therapist-portal/schedule' },
      { title: 'جلسات المعالج', path: '/therapist-portal/sessions' },
      { title: 'الحالات', path: '/therapist-portal/cases' },
      { title: 'مستندات المعالج', path: '/therapist-portal/documents' },
      { title: 'تقارير المعالج', path: '/therapist-portal/reports' },
      { title: 'رسائل المعالج', path: '/therapist-portal/messages' },
      { title: 'الخطط العلاجية', path: '/therapist-portal/treatment-plans' },
      { title: 'التقييمات', path: '/therapist-portal/assessments' },
      { title: 'الوصفات العلاجية', path: '/therapist-portal/prescriptions' },
      { title: 'التطوير المهني', path: '/therapist-portal/professional-dev' },
      { title: 'تحليلات المعالج', path: '/therapist-portal/analytics' },
      { title: 'الاستشارات', path: '/therapist-portal/consultations' },
      { title: 'سجل المهام', path: '/therapist-portal/tasks' },
      { title: 'تتبع التقدم', path: '/therapist-portal/progress-tracking' },
      { title: 'المكتبة العلمية', path: '/therapist-portal/clinical-library' },
      { title: 'نماذج التوثيق', path: '/therapist-portal/doc-templates' },
      { title: 'التواصل مع الأهل', path: '/therapist-portal/parent-comm' },
      { title: 'الأهداف الذكية', path: '/therapist-portal/smart-goals' },
      { title: 'سجل الإحالات', path: '/therapist-portal/referrals' },
      { title: 'العلاج الجماعي', path: '/therapist-portal/group-therapy' },
      { title: 'إدارة معدات المعالج', path: '/therapist-portal/equipment' },
      { title: 'مؤشرات أداء المعالج', path: '/therapist-portal/kpis' },
      { title: 'بروتوكولات السلامة', path: '/therapist-portal/safety-protocols' },
      { title: 'البحث السريري', path: '/therapist-portal/clinical-research' },
      { title: 'العلاج عن بُعد', path: '/therapist-portal/telehealth' },
      { title: 'سجل التدريب الميداني', path: '/therapist-portal/field-training' },
      { title: 'إدارة الموافقات', path: '/therapist-portal/consents' },
      { title: 'تقارير الجودة', path: '/therapist-portal/quality-reports' },
      { title: 'قائمة انتظار المعالج', path: '/therapist-portal/waiting-list' },
      { title: 'لوحة الإنجازات', path: '/therapist-portal/achievements' },
      { title: 'لوحة تحكم ولي الأمر', path: '/parent-portal' },
      { title: 'تقدم الأبناء', path: '/parent-portal/children-progress' },
      { title: 'تقارير الحضور', path: '/parent-portal/attendance-reports' },
      { title: 'التواصل مع المعالجين', path: '/parent-portal/therapist-communications' },
      { title: 'مدفوعات ولي الأمر', path: '/parent-portal/payments-history' },
      { title: 'مستندات ولي الأمر', path: '/parent-portal/documents-reports' },
      { title: 'مواعيد ولي الأمر', path: '/parent-portal/appointments-scheduling' },
      { title: 'رسائل ولي الأمر', path: '/parent-portal/messages' },
      { title: 'بوابة الموظف', path: '/employee-portal' },
    ],
  },

  // ═══ ⑪ التكامل الحكومي ═══
  {
    title: 'التكامل الحكومي',
    emoji: '🏛️',
    accent: 'rose',
    description: 'الربط مع الأنظمة والمنصات الحكومية السعودية',
    items: [
      { title: 'مُدد — حماية الأجور', path: '/mudad' },
      { title: 'طاقات — التوظيف', path: '/taqat' },
      { title: 'هيئة رعاية ذوي الإعاقة', path: '/disability-authority' },
      { title: 'معايير سباهي (CBAHI)', path: '/cbahi' },
      { title: 'التصاريح العلاجية', path: '/treatment-authorization' },
      { title: 'استبيانات رضا الأسر', path: '/family-satisfaction' },
      { title: 'نظام نور — وزارة التعليم', path: '/noor' },
      { title: 'التأمينات الاجتماعية (GOSI)', path: '/gosi' },
      { title: 'منصة قوى — الموارد البشرية', path: '/qiwa' },
      { title: 'التدخل المبكر (0–3)', path: '/early-intervention' },
      { title: 'متابعة ما بعد التأهيل', path: '/post-rehab-followup' },
      { title: 'بوابة ولي الأمر الحكومية', path: '/guardian-portal' },
    ],
  },

  // ═══ ⑫ الأنظمة الإدارية ═══
  {
    title: 'الأنظمة الإدارية',
    emoji: '📋',
    accent: 'lime',
    description: 'التخطيط الاستراتيجي والمرافق والشؤون القانونية والفعاليات',
    items: [
      { title: 'التخطيط الاستراتيجي', path: '/strategic-planning' },
      { title: 'إدارة الاجتماعات', path: '/meetings' },
      { title: 'إدارة الزوار', path: '/visitors' },
      { title: 'الشكاوى والمقترحات', path: '/complaints' },
      { title: 'الهيكل التنظيمي', path: '/org-structure' },
      { title: 'التعاقب الوظيفي', path: '/succession-planning' },
      { title: 'إدارة المرافق', path: '/facility-management' },
      { title: 'الشؤون القانونية', path: '/legal-affairs' },
      { title: 'إدارة الفعاليات', path: '/events' },
      { title: 'شؤون الموظفين', path: '/employee-affairs' },
      { title: 'قائمة الانتظار', path: '/waitlist' },
      { title: 'التكامل المجتمعي', path: '/community' },
      { title: 'إدارة المتطوعين', path: '/volunteers' },
    ],
  },

  // ═══ ⑬ الإدارة والنظام ═══
  {
    title: 'الإدارة والنظام',
    emoji: '🔧',
    accent: 'red',
    description: 'إدارة النظام والأمان والتقنيات المتقدمة والإعدادات',
    items: [
      { title: 'اللوحة الرئيسية للإدارة', path: '/admin-portal' },
      { title: 'إدارة المستخدمين', path: '/admin-portal/users' },
      { title: 'إعدادات النظام', path: '/admin-portal/settings' },
      { title: 'الهوية والتصميم', path: '/admin-portal/branding' },
      { title: 'سجل المراجعة', path: '/admin-portal/audit-logs' },
      { title: 'تقارير الإدارة', path: '/admin-portal/reports' },
      { title: 'إدارة النظام', path: '/system-admin' },
      { title: 'الأمان', path: '/security' },
      { title: 'الدخول الموحد (SSO)', path: '/sso-admin' },
      { title: 'شهادات البلوكتشين', path: '/blockchain-certificates' },
      { title: 'تقييمات ICF', path: '/icf-assessments' },
      { title: 'التنسيق متعدد التخصصات', path: '/mdt-coordination' },
      { title: 'تأهيل الواقع المعزز', path: '/ar-rehab' },
      { title: 'لوحة الطب عن بُعد', path: '/telehealth' },
      { title: 'جلسات عن بُعد', path: '/telehealth/sessions' },
      { title: 'غرفة الانتظار الافتراضية', path: '/telehealth/waiting-room' },
      { title: 'غرفة الفيديو', path: '/telehealth/video-room' },
      { title: 'التسجيلات والتقارير', path: '/telehealth/recordings' },
      { title: 'الإعدادات', path: '/profile' },
    ],
  },
];

/* ─── Quick Links (expanded to 8) ────────────────────────────────────────── */
const quickLinks = [
  { label: 'لوحة التحكم', path: '/dashboard', variant: 'primary' },
  { label: 'المستفيدون', path: '/beneficiaries', variant: 'primary' },
  { label: 'الموارد البشرية', path: '/hr', variant: 'gold' },
  { label: 'المالية', path: '/accounting', variant: 'gold' },
  { label: 'التقارير', path: '/reports', variant: 'outline' },
  { label: 'مركز الأمان', path: '/security', variant: 'outline' },
  { label: 'إدارة العلاقات', path: '/crm', variant: 'outline' },
  { label: 'البريميوم', path: '/premium', variant: 'outline' },
];

/* ─── Section icon map ───────────────────────────────────────────────────── */
const sectionIcons = {
  'لوحات التحكم الرئيسية': <DashboardIcon sx={{ fontSize: 20 }} />,
  'الخدمات الأساسية': <RehabIcon sx={{ fontSize: 20 }} />,
  'الموارد البشرية': <PeopleIcon sx={{ fontSize: 20 }} />,
  'المالية والمحاسبة': <FinanceIcon sx={{ fontSize: 20 }} />,
  'العمليات والإمداد': <OperationsIcon sx={{ fontSize: 20 }} />,
  'التواصل والمراسلات': <CommunicationsIcon sx={{ fontSize: 20 }} />,
  'المستندات والأرشفة': <DocumentsIcon sx={{ fontSize: 20 }} />,
  'التحليلات والذكاء': <AnalyticsIcon sx={{ fontSize: 20 }} />,
  'إدارة الأعمال': <BusinessIcon sx={{ fontSize: 20 }} />,
  'البوابات الإلكترونية': <PortalIcon sx={{ fontSize: 20 }} />,
  'التكامل الحكومي': <GovernmentIcon sx={{ fontSize: 20 }} />,
  'الأنظمة الإدارية': <AdministrativeIcon sx={{ fontSize: 20 }} />,
  'الإدارة والنظام': <SystemAdminIcon sx={{ fontSize: 20 }} />,
};

/* ─── Accent color map ───────────────────────────────────────────────────── */
const accentStyles = {
  green: {
    headerBg: 'from-green-50/80',
    itemBg: 'bg-green-50/40',
    itemBorder: 'border-green-100/80',
    itemText: 'text-green-800',
    hoverBg: 'hover:bg-green-100/60',
    hoverBorder: 'hover:border-green-200',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-700',
    dotBg: 'bg-green-500',
    iconGradient: 'from-green-600 to-green-500',
    proBg: 'bg-green-100',
    proText: 'text-green-700',
  },
  emerald: {
    headerBg: 'from-emerald-50/80',
    itemBg: 'bg-emerald-50/40',
    itemBorder: 'border-emerald-100/80',
    itemText: 'text-emerald-800',
    hoverBg: 'hover:bg-emerald-100/60',
    hoverBorder: 'hover:border-emerald-200',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    dotBg: 'bg-emerald-500',
    iconGradient: 'from-emerald-600 to-emerald-500',
    proBg: 'bg-emerald-100',
    proText: 'text-emerald-700',
  },
  blue: {
    headerBg: 'from-blue-50/80',
    itemBg: 'bg-blue-50/40',
    itemBorder: 'border-blue-100/80',
    itemText: 'text-blue-800',
    hoverBg: 'hover:bg-blue-100/60',
    hoverBorder: 'hover:border-blue-200',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    dotBg: 'bg-blue-500',
    iconGradient: 'from-blue-600 to-blue-500',
    proBg: 'bg-blue-100',
    proText: 'text-blue-700',
  },
  amber: {
    headerBg: 'from-amber-50/80',
    itemBg: 'bg-amber-50/40',
    itemBorder: 'border-amber-100/80',
    itemText: 'text-amber-800',
    hoverBg: 'hover:bg-amber-100/60',
    hoverBorder: 'hover:border-amber-200',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    dotBg: 'bg-amber-500',
    iconGradient: 'from-amber-600 to-amber-500',
    proBg: 'bg-amber-100',
    proText: 'text-amber-700',
  },
  slate: {
    headerBg: 'from-slate-50/80',
    itemBg: 'bg-slate-50/40',
    itemBorder: 'border-slate-200/80',
    itemText: 'text-slate-800',
    hoverBg: 'hover:bg-slate-100/60',
    hoverBorder: 'hover:border-slate-300',
    badgeBg: 'bg-slate-200',
    badgeText: 'text-slate-700',
    dotBg: 'bg-slate-500',
    iconGradient: 'from-slate-600 to-slate-500',
    proBg: 'bg-slate-200',
    proText: 'text-slate-700',
  },
  violet: {
    headerBg: 'from-violet-50/80',
    itemBg: 'bg-violet-50/40',
    itemBorder: 'border-violet-100/80',
    itemText: 'text-violet-800',
    hoverBg: 'hover:bg-violet-100/60',
    hoverBorder: 'hover:border-violet-200',
    badgeBg: 'bg-violet-100',
    badgeText: 'text-violet-700',
    dotBg: 'bg-violet-500',
    iconGradient: 'from-violet-600 to-violet-500',
    proBg: 'bg-violet-100',
    proText: 'text-violet-700',
  },
  teal: {
    headerBg: 'from-teal-50/80',
    itemBg: 'bg-teal-50/40',
    itemBorder: 'border-teal-100/80',
    itemText: 'text-teal-800',
    hoverBg: 'hover:bg-teal-100/60',
    hoverBorder: 'hover:border-teal-200',
    badgeBg: 'bg-teal-100',
    badgeText: 'text-teal-700',
    dotBg: 'bg-teal-500',
    iconGradient: 'from-teal-600 to-teal-500',
    proBg: 'bg-teal-100',
    proText: 'text-teal-700',
  },
  indigo: {
    headerBg: 'from-indigo-50/80',
    itemBg: 'bg-indigo-50/40',
    itemBorder: 'border-indigo-100/80',
    itemText: 'text-indigo-800',
    hoverBg: 'hover:bg-indigo-100/60',
    hoverBorder: 'hover:border-indigo-200',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-700',
    dotBg: 'bg-indigo-500',
    iconGradient: 'from-indigo-600 to-indigo-500',
    proBg: 'bg-indigo-100',
    proText: 'text-indigo-700',
  },
  orange: {
    headerBg: 'from-orange-50/80',
    itemBg: 'bg-orange-50/40',
    itemBorder: 'border-orange-100/80',
    itemText: 'text-orange-800',
    hoverBg: 'hover:bg-orange-100/60',
    hoverBorder: 'hover:border-orange-200',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-700',
    dotBg: 'bg-orange-500',
    iconGradient: 'from-orange-600 to-orange-500',
    proBg: 'bg-orange-100',
    proText: 'text-orange-700',
  },
  cyan: {
    headerBg: 'from-cyan-50/80',
    itemBg: 'bg-cyan-50/40',
    itemBorder: 'border-cyan-100/80',
    itemText: 'text-cyan-800',
    hoverBg: 'hover:bg-cyan-100/60',
    hoverBorder: 'hover:border-cyan-200',
    badgeBg: 'bg-cyan-100',
    badgeText: 'text-cyan-700',
    dotBg: 'bg-cyan-500',
    iconGradient: 'from-cyan-600 to-cyan-500',
    proBg: 'bg-cyan-100',
    proText: 'text-cyan-700',
  },
  rose: {
    headerBg: 'from-rose-50/80',
    itemBg: 'bg-rose-50/40',
    itemBorder: 'border-rose-100/80',
    itemText: 'text-rose-800',
    hoverBg: 'hover:bg-rose-100/60',
    hoverBorder: 'hover:border-rose-200',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-700',
    dotBg: 'bg-rose-500',
    iconGradient: 'from-rose-600 to-rose-500',
    proBg: 'bg-rose-100',
    proText: 'text-rose-700',
  },
  lime: {
    headerBg: 'from-lime-50/80',
    itemBg: 'bg-lime-50/40',
    itemBorder: 'border-lime-200/80',
    itemText: 'text-lime-800',
    hoverBg: 'hover:bg-lime-100/60',
    hoverBorder: 'hover:border-lime-200',
    badgeBg: 'bg-lime-100',
    badgeText: 'text-lime-700',
    dotBg: 'bg-lime-600',
    iconGradient: 'from-lime-600 to-lime-500',
    proBg: 'bg-lime-100',
    proText: 'text-lime-700',
  },
  red: {
    headerBg: 'from-red-50/80',
    itemBg: 'bg-red-50/40',
    itemBorder: 'border-red-100/80',
    itemText: 'text-red-800',
    hoverBg: 'hover:bg-red-100/60',
    hoverBorder: 'hover:border-red-200',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
    dotBg: 'bg-red-500',
    iconGradient: 'from-red-600 to-red-500',
    proBg: 'bg-red-100',
    proText: 'text-red-700',
  },
};

/* ─── Compute totals ─────────────────────────────────────────────────────── */
const totalSystems = systemSections.reduce((t, s) => t + s.items.length, 0);
const totalSections = systemSections.length;

/* ─── KPI Card ───────────────────────────────────────────────────────────── */
function KPICard({ kpi, navigate, index }) {
  const toneMap = {
    error: { text: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100' },
    warning: { text: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
    success: { text: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  };
  const tone = toneMap[kpi.tone] || toneMap.success;

  return (
    <div
      className="card-base rounded-2xl p-5 relative overflow-hidden group"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
        style={{ background: 'linear-gradient(90deg, #1B5E20, #4CAF50, #66BB6A)', opacity: 0.5 }}
      />
      <div
        className="absolute top-4 left-4 w-11 h-11 rounded-[14px] flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-glow-green"
        style={{
          background: 'linear-gradient(135deg, #1B5E20 0%, #2e7d32 60%, #43A047 100%)',
          boxShadow: '0 4px 16px rgba(46,125,50,0.3)',
        }}
      >
        {kpi.icon}
      </div>
      <div className="pt-1">
        <p className="text-[0.7rem] text-slate-400 uppercase tracking-wider font-bold mb-3">
          {kpi.label}
        </p>
        <div className="flex items-end justify-between gap-2">
          <span className="text-3xl font-extrabold text-slate-800 tracking-tight">{kpi.value}</span>
        </div>
        <div
          className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-semibold ${tone.bg} ${tone.text} ${tone.border} border`}
        >
          <TrendingUpIcon sx={{ fontSize: 13 }} />
          {kpi.trend}
        </div>
        {kpi.path && (
          <button
            onClick={() => navigate(kpi.path)}
            className="mt-3 flex items-center gap-1.5 text-green-700 text-xs font-bold bg-transparent border-none cursor-pointer p-0 font-cairo hover:gap-2.5 transition-all duration-200 group/link"
          >
            <span>التفاصيل</span>
            <KeyboardArrowLeft
              sx={{ fontSize: 15 }}
              className="transition-transform duration-200 group-hover/link:-translate-x-1"
            />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Alert Card ─────────────────────────────────────────────────────────── */
function AlertCard({ alert, navigate, index }) {
  return (
    <div
      className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:bg-green-50/30 hover:border-green-100 transition-all duration-300 group animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse-soft" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 m-0 truncate">{alert.title}</p>
          <p className="text-xs text-slate-400 mt-0.5 m-0">{alert.status}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {alert.amount && <span className="badge-green text-[0.65rem]">{alert.amount}</span>}
        <button
          onClick={() => navigate(alert.path)}
          className="w-8 h-8 rounded-lg flex items-center justify-center border-none cursor-pointer transition-all duration-200 bg-green-50 text-green-700 hover:bg-green-100 hover:shadow-sm active:scale-95"
        >
          <KeyboardArrowLeft sx={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
}

/* ─── System Section Card (NEW comprehensive card) ───────────────────────── */
function SystemSectionCard({ section, navigate, index, searchQuery }) {
  const [expanded, setExpanded] = useState(false);
  const style = accentStyles[section.accent] || accentStyles.green;
  const icon = sectionIcons[section.title];

  // Filter items by search
  const filteredItems = searchQuery
    ? section.items.filter(item => item.title.includes(searchQuery))
    : section.items;

  if (searchQuery && filteredItems.length === 0) return null;

  const displayItems = expanded ? filteredItems : filteredItems.slice(0, 6);
  const hasMore = filteredItems.length > 6;

  return (
    <div
      className="card-base rounded-2xl overflow-hidden animate-fade-in-up"
      style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}
    >
      {/* Card header */}
      <div
        className={`px-5 py-4 flex items-center justify-between bg-gradient-to-l ${style.headerBg} to-transparent`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${style.iconGradient} flex items-center justify-center text-white shadow-sm`}
          >
            {icon || <AppsIcon sx={{ fontSize: 20 }} />}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 m-0 flex items-center gap-2">
              <span>{section.emoji}</span>
              {section.title}
            </h4>
            <p className="text-[0.68rem] text-slate-400 mt-0.5 m-0">{section.description}</p>
          </div>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-[0.65rem] font-bold ${style.badgeBg} ${style.badgeText}`}
        >
          {filteredItems.length}
        </span>
      </div>

      {/* Items */}
      <div className="px-4 pb-4 pt-2 space-y-1">
        {displayItems.map(item => (
          <button
            key={item.path + item.title}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[0.78rem] font-medium border cursor-pointer font-cairo transition-all duration-200 group/item ${style.itemBorder} ${style.itemText} ${style.itemBg} ${style.hoverBg} ${style.hoverBorder} hover:shadow-sm`}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full ${style.dotBg} flex-shrink-0`} />
              <span className="truncate">{item.title}</span>
              {item.badge && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[0.55rem] font-bold ${style.proBg} ${style.proText} flex-shrink-0`}
                >
                  {item.badge}
                </span>
              )}
            </span>
            <OpenInNewIcon
              sx={{ fontSize: 12 }}
              className="opacity-0 group-hover/item:opacity-40 transition-opacity duration-200 flex-shrink-0"
            />
          </button>
        ))}

        {hasMore && (
          <button
            onClick={() => setExpanded(v => !v)}
            className={`w-full flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold border-none cursor-pointer font-cairo transition-all duration-200 ${style.badgeText} hover:${style.itemBg} bg-transparent`}
          >
            {expanded ? 'عرض أقل' : `عرض الكل (${filteredItems.length})`}
            <ExpandMoreIcon
              sx={{ fontSize: 16 }}
              className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Time greeting ──────────────────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'صباح الخير';
  if (h < 17) return 'مساء الخير';
  return 'مساء النور';
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  Main Component
 * ═══════════════════════════════════════════════════════════════════════════ */
const Home = () => {
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');

  const { kpis: reportsKPIs } = useRealTimeKPIs('reports');
  const { kpis: financeKPIs } = useRealTimeKPIs('finance');
  const { kpis: hrKPIs } = useRealTimeKPIs('hr');
  const { kpis: securityKPIs } = useRealTimeKPIs('security');

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        await dashboardAPI.getSummary();
        setError(null);
      } catch (_err) {
        showSnackbar('حدث خطأ أثناء تحميل بيانات الصفحة الرئيسية', 'error');
        setError(null);
      }
    };
    fetchHomeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpis = useMemo(() => {
    const getKPI = (mockKPI, realtimeKPIs, icon) => {
      if (realtimeKPIs?.length > 0) return { ...realtimeKPIs[0], icon, path: mockKPI.path };
      return { ...mockKPI, icon, path: mockKPI.path };
    };
    return [
      getKPI(
        moduleMocks.reports.kpis[0],
        reportsKPIs,
        <QueryStatsIcon sx={{ fontSize: 22 }} className="text-white" />
      ),
      getKPI(
        moduleMocks.finance.kpis[0],
        financeKPIs,
        <TrendingUpIcon sx={{ fontSize: 22 }} className="text-white" />
      ),
      getKPI(
        moduleMocks.hr.kpis[0],
        hrKPIs,
        <AccessTimeIcon sx={{ fontSize: 22 }} className="text-white" />
      ),
      getKPI(
        moduleMocks.security.kpis[0],
        securityKPIs,
        <ShieldIcon sx={{ fontSize: 22 }} className="text-white" />
      ),
    ];
  }, [reportsKPIs, financeKPIs, hrKPIs, securityKPIs]);

  const alerts = useMemo(
    () => [
      { ...moduleMocks.security.items[0], path: '/security' },
      { ...moduleMocks.finance.items[1], path: '/finance' },
      { ...moduleMocks.rehab.items[2], path: '/rehab' },
      { ...moduleMocks.crm.items[0], path: '/crm' },
    ],
    []
  );

  const handleQuickLink = useCallback(path => navigate(path), [navigate]);

  // Count matched items for search badge
  const matchedCount = searchQuery
    ? systemSections.reduce(
        (t, s) => t + s.items.filter(i => i.title.includes(searchQuery)).length,
        0
      )
    : totalSystems;

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* ═══ Hero Banner ═══ */}
      <div
        className="rounded-3xl p-6 md:p-8 text-white relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0d3d12 0%, #1B5E20 30%, #2e7d32 60%, #388E3C 100%)',
        }}
      >
        <div
          className="absolute -top-16 -left-16 w-64 h-64 rounded-full opacity-10 animate-blob"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.4), transparent 60%)' }}
        />
        <div
          className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full opacity-10 animate-blob"
          style={{
            background: 'radial-gradient(circle, rgba(102,187,106,0.5), transparent 60%)',
            animationDelay: '2s',
          }}
        />
        <div
          className="absolute top-1/2 left-1/4 w-32 h-32 rounded-full opacity-[0.06] animate-float"
          style={{ background: 'radial-gradient(circle, white, transparent 70%)' }}
        />
        <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.12] backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-inner transition-transform duration-300 hover:scale-105">
                <HomeIcon sx={{ fontSize: 32 }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white/50 text-sm">{getGreeting()} 👋</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold m-0 tracking-tight">
                  لوحة التحكم الموحدة
                </h1>
                <p className="text-white/60 text-sm mt-1 m-0">
                  نظام مراكز الأوائل للرعاية النهارية — جميع الأنظمة والخدمات
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.08] border border-white/[0.12] backdrop-blur-sm">
              <CalendarIcon sx={{ fontSize: 20 }} className="text-white/50" />
              <div>
                <p className="text-white/90 text-sm font-bold m-0">
                  {currentTime.toLocaleDateString('ar-SA', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-white/40 text-xs m-0 mt-px">
                  {currentTime.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>

          {/* Quick action chips */}
          <div className="flex flex-wrap gap-2 mt-5">
            {quickLinks.map(link => (
              <button
                key={link.path + link.label}
                onClick={() => handleQuickLink(link.path)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border cursor-pointer font-cairo transition-all duration-200 backdrop-blur-sm active:scale-95 ${
                  link.variant === 'primary'
                    ? 'bg-white text-green-800 border-white/90 hover:bg-white/90 shadow-lg shadow-black/10'
                    : link.variant === 'gold'
                      ? 'bg-amber-400/20 text-amber-100 border-amber-400/30 hover:bg-amber-400/30'
                      : 'bg-white/[0.08] text-white/80 border-white/15 hover:bg-white/15 hover:text-white'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Stats Ribbon ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-base rounded-xl p-4 text-center">
          <p className="text-2xl font-extrabold text-green-700 m-0">{totalSections}</p>
          <p className="text-[0.7rem] text-slate-400 mt-1 m-0 font-semibold">قسم رئيسي</p>
        </div>
        <div className="card-base rounded-xl p-4 text-center">
          <p className="text-2xl font-extrabold text-amber-600 m-0">{totalSystems}</p>
          <p className="text-[0.7rem] text-slate-400 mt-1 m-0 font-semibold">نظام وخدمة</p>
        </div>
        <div className="card-base rounded-xl p-4 text-center">
          <p className="text-2xl font-extrabold text-blue-600 m-0">42</p>
          <p className="text-[0.7rem] text-slate-400 mt-1 m-0 font-semibold">لوحة بريميوم</p>
        </div>
        <div className="card-base rounded-xl p-4 text-center">
          <p className="text-2xl font-extrabold text-emerald-600 m-0">12</p>
          <p className="text-[0.7rem] text-slate-400 mt-1 m-0 font-semibold">تكامل حكومي</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm animate-fade-in">
          <ErrorOutlineIcon sx={{ fontSize: 20 }} />
          <span>{error} — يتم استخدام البيانات التجريبية</span>
        </div>
      )}

      {/* ═══ KPI Section ═══ */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
              style={{
                background: 'linear-gradient(135deg, #1B5E20, #2e7d32)',
                boxShadow: '0 4px 12px rgba(46,125,50,0.25)',
              }}
            >
              <BoltIcon sx={{ fontSize: 18 }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 m-0">مؤشرات الأداء</h3>
              <p className="text-xs text-slate-400 m-0 mt-0.5">بيانات لحظية من جميع الأنظمة</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-[0.7rem] text-slate-400 font-medium">
              {currentTime.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, idx) => (
            <KPICard key={kpi.label} kpi={kpi} navigate={navigate} index={idx} />
          ))}
        </div>
      </section>

      {/* ═══ Quick Alerts ═══ */}
      <section className="card-base rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-100">
              <SparkleIcon sx={{ fontSize: 18 }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 m-0">تنبيهات سريعة</h3>
              <p className="text-xs text-slate-400 mt-0.5 m-0">الأمن، المالية، والرعاية</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/reports')}
            className="text-xs font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 cursor-pointer flex items-center gap-1 hover:bg-green-100 transition-all duration-200 font-cairo self-start"
          >
            عرض الكل
            <KeyboardArrowLeft sx={{ fontSize: 14 }} />
          </button>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-slate-100 to-transparent mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alerts.map((alert, idx) => (
            <AlertCard
              key={`${alert.title}-${idx}`}
              alert={alert}
              navigate={navigate}
              index={idx}
            />
          ))}
        </div>
      </section>

      {/* ═══ Search + Systems Grid ═══ */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
              style={{
                background: 'linear-gradient(135deg, #1B5E20, #2e7d32)',
                boxShadow: '0 4px 12px rgba(46,125,50,0.25)',
              }}
            >
              <AccountTreeIcon sx={{ fontSize: 18 }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 m-0">جميع الأنظمة والخدمات</h3>
              <p className="text-xs text-slate-400 m-0 mt-0.5">
                {matchedCount} نظام في {totalSections} قسم — تصفح أو ابحث
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <SearchIcon
              sx={{ fontSize: 18 }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث في الأنظمة..."
              className="w-full pr-10 pl-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-cairo text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100 transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer p-0"
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </button>
            )}
          </div>
        </div>

        {/* Section Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {systemSections.map((section, idx) => (
            <SystemSectionCard
              key={section.title}
              section={section}
              navigate={navigate}
              index={idx}
              searchQuery={searchQuery}
            />
          ))}
        </div>

        {/* No results */}
        {searchQuery && matchedCount === 0 && (
          <div className="text-center py-12">
            <SearchIcon sx={{ fontSize: 48 }} className="text-slate-200 mb-3" />
            <p className="text-slate-400 text-sm font-semibold">لا توجد نتائج لـ "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-green-600 text-sm font-bold bg-transparent border-none cursor-pointer font-cairo hover:text-green-700"
            >
              مسح البحث
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
