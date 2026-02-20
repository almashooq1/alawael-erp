/**
 * Navigation Configuration - إعدادات التنقل
 * يمكن تعديل التبويبات والقوائم بسهولة من هنا
 */

import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Analytics as AnalyticsIcon,
  Article as ArticleIcon,
  Notifications as NotificationsIcon,
  Support as SupportIcon,
  Security as SecurityIcon,
  Assessment as ReportsIcon,
  TrendingUp as PredictionsIcon,
  Speed as PerformanceIcon,
  Link as IntegrationsIcon,
  Monitor as MonitoringIcon,
  DirectionsCar as VehiclesIcon,
  AttachMoney as AccountingIcon,
  Message as MessageIcon,
  Campaign as CampaignIcon,
} from '@mui/icons-material';

import SchoolIcon from '@mui/icons-material/School';

// Main Navigation Menu Items
export const MAIN_MENU_ITEMS = [
  {
    id: 'dashboard',
    text: 'لوحة التحكم',
    textEn: 'Dashboard',
    icon: DashboardIcon,
    path: '/dashboard',
    description: 'عرض ملخص النظام',
    descriptionEn: 'System Overview',
    order: 1,
    enabled: true,
    roles: ['admin', 'manager', 'user'],
  },
  {
    id: 'users',
    text: 'المستخدمين',
    textEn: 'Users',
    icon: PeopleIcon,
    path: '/users',
    description: 'إدارة المستخدمين والموظفين',
    descriptionEn: 'Manage Users & Employees',
    order: 2,
    enabled: true,
    roles: ['admin', 'manager'],
  },
  {
    id: 'rbac',
    text: 'الصلاحيات',
    textEn: 'Roles & Permissions',
    icon: SecurityIcon,
    path: '/rbac',
    description: 'إدارة الأدوار والصلاحيات',
    descriptionEn: 'Manage Roles & Permissions',
    order: 3,
    enabled: true,
    roles: ['admin'],
  },
  {
    id: 'vehicles',
    text: 'المركبات',
    textEn: 'Vehicles',
    icon: VehiclesIcon,
    path: '/vehicles',
    description: 'إدارة أسطول المركبات',
    descriptionEn: 'Manage Vehicle Fleet',
    order: 4,
    enabled: true,
    roles: ['admin', 'manager', 'driver'],
  },
  {
    id: 'accounting',
    text: 'المحاسبة',
    textEn: 'Accounting',
    icon: AccountingIcon,
    path: '/accounting',
    description: 'إدارة الحسابات والفواتير',
    descriptionEn: 'Manage Accounts & Invoices',
    order: 5,
    enabled: true,
    roles: ['admin', 'finance'],
  },
  {
    id: 'elearning',
    text: 'التعليم الإلكتروني',
    textEn: 'E-Learning',
    icon: SchoolIcon,
    path: '/elearning',
    description: 'منصة التعليم والدورات',
    descriptionEn: 'Learning Platform',
    order: 6,
    enabled: true,
    roles: ['admin', 'teacher', 'user'],
  },
  {
    id: 'messaging',
    text: 'الرسائل',
    textEn: 'Messaging',
    icon: MessageIcon,
    path: '/messaging',
    description: 'نظام الرسائل والتواصل',
    descriptionEn: 'Messaging System',
    order: 7,
    enabled: true,
    roles: ['admin', 'user'],
  },
  {
    id: 'analytics',
    text: 'التحليلات',
    textEn: 'Analytics',
    icon: AnalyticsIcon,
    path: '/analytics',
    description: 'تحليلات الأداء والبيانات',
    descriptionEn: 'Performance Analytics',
    order: 8,
    enabled: true,
    roles: ['admin', 'manager'],
  },
  {
    id: 'reports',
    text: 'التقارير',
    textEn: 'Reports',
    icon: ReportsIcon,
    path: '/reports',
    description: 'إنشاء وعرض التقارير',
    descriptionEn: 'Generate & View Reports',
    order: 9,
    enabled: true,
    roles: ['admin', 'manager'],
  },
  {
    id: 'cms',
    text: 'إدارة المحتوى',
    textEn: 'Content Management',
    icon: ArticleIcon,
    path: '/cms',
    description: 'إدارة محتوى النظام',
    descriptionEn: 'Manage System Content',
    order: 10,
    enabled: true,
    roles: ['admin'],
  },
  {
    id: 'campaigns',
    text: 'الحملات',
    textEn: 'Campaigns',
    icon: CampaignIcon,
    path: '/campaigns',
    description: 'إدارة الحملات والترويج',
    descriptionEn: 'Manage Campaigns',
    order: 11,
    enabled: true,
    roles: ['admin', 'manager'],
  },
  {
    id: 'predictions',
    text: 'التنبؤات',
    textEn: 'Predictions',
    icon: PredictionsIcon,
    path: '/predictions',
    description: 'التنبؤات والتحليلات المستقبلية',
    descriptionEn: 'Future Predictions',
    order: 12,
    enabled: true,
    roles: ['admin', 'manager'],
  },
  {
    id: 'notifications',
    text: 'الإشعارات',
    textEn: 'Notifications',
    icon: NotificationsIcon,
    path: '/notifications',
    description: 'إدارة الإشعارات والتنبيهات',
    descriptionEn: 'Manage Notifications',
    order: 13,
    enabled: true,
    roles: ['admin', 'user'],
  },
  {
    id: 'support',
    text: 'الدعم الفني',
    textEn: 'Support',
    icon: SupportIcon,
    path: '/support',
    description: 'نظام الدعم الفني والمساعدة',
    descriptionEn: 'Technical Support',
    order: 14,
    enabled: true,
    roles: ['admin', 'support'],
  },
  {
    id: 'monitoring',
    text: 'المراقبة',
    textEn: 'Monitoring',
    icon: MonitoringIcon,
    path: '/monitoring',
    description: 'مراقبة النظام والأداء',
    descriptionEn: 'System Monitoring',
    order: 15,
    enabled: true,
    roles: ['admin'],
  },
  {
    id: 'performance',
    text: 'الأداء',
    textEn: 'Performance',
    icon: PerformanceIcon,
    path: '/performance',
    description: 'قياس وتحسين الأداء',
    descriptionEn: 'Performance Metrics',
    order: 16,
    enabled: true,
    roles: ['admin'],
  },
  {
    id: 'integrations',
    text: 'التكاملات',
    textEn: 'Integrations',
    icon: IntegrationsIcon,
    path: '/integrations',
    description: 'إدارة التكاملات الخارجية',
    descriptionEn: 'External Integrations',
    order: 17,
    enabled: true,
    roles: ['admin'],
  },
];

// Filter menu items by role
export const getMenuItemsByRole = (userRole, language = 'ar') => {
  return MAIN_MENU_ITEMS.filter(item => item.enabled && item.roles.includes(userRole))
    .sort((a, b) => a.order - b.order)
    .map(item => ({
      ...item,
      displayText: language === 'en' ? item.textEn : item.text,
    }));
};

// Get single menu item
export const getMenuItem = itemId => {
  return MAIN_MENU_ITEMS.find(item => item.id === itemId);
};

// Top Navigation Bar Configuration
export const TOP_NAV_CONFIG = {
  logo: 'نظام ERP',
  logoEn: 'ERP System',
  companyName: 'شركة الأوائل',
  companyNameEn: 'Al-Awael Company',
  supportEmail: 'support@alawael.com',
  supportPhone: '+20 100 123 4567',
};

// Dashboard Tabs Configuration
export const DASHBOARD_TABS = [
  {
    id: 'overview',
    label: 'نظرة عامة',
    labelEn: 'Overview',
    value: 0,
    icon: DashboardIcon,
  },
  {
    id: 'analytics',
    label: 'التحليلات',
    labelEn: 'Analytics',
    value: 1,
    icon: AnalyticsIcon,
  },
  {
    id: 'reports',
    label: 'التقارير',
    labelEn: 'Reports',
    value: 2,
    icon: ReportsIcon,
  },
  {
    id: 'monitoring',
    label: 'المراقبة',
    labelEn: 'Monitoring',
    value: 3,
    icon: MonitoringIcon,
  },
];

// User Profile Menu Items
export const USER_PROFILE_MENU_ITEMS = [
  {
    id: 'profile',
    label: 'ملفي الشخصي',
    labelEn: 'My Profile',
    action: 'profile',
  },
  {
    id: 'settings',
    label: 'الإعدادات',
    labelEn: 'Settings',
    action: 'settings',
  },
  {
    id: 'preferences',
    label: 'التفضيلات',
    labelEn: 'Preferences',
    action: 'preferences',
  },
  {
    id: 'help',
    label: 'المساعدة',
    labelEn: 'Help',
    action: 'help',
  },
  {
    id: 'logout',
    label: 'تسجيل الخروج',
    labelEn: 'Logout',
    action: 'logout',
    divider: true,
  },
];

export default MAIN_MENU_ITEMS;
