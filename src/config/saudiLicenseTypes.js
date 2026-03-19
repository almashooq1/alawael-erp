/**
 * Saudi Arabia License Types Configuration 🇸🇦
 * إعدادات أنواع الرخص والتصاريح السعودية
 *
 * النظام الشامل لجميع أنواع الرخص والتصاريح في المملكة العربية السعودية
 */

export const SAUDI_LICENSE_TYPES = {
  // الرخص التجارية (Commercial Licenses)
  COMMERCIAL: {
    id: 'CR',
    name: 'السجل التجاري',
    nameEn: 'Commercial Registration',
    category: 'تجاري',
    icon: '🏢',
    color: '#1976d2',
    issuingAuthority: 'وزارة التجارة',
    issuingAuthorityEn: 'Ministry of Commerce',
    renewalPeriod: 365, // days
    alertDays: [60, 30, 15, 7, 3, 1],
    requiredDocuments: ['هوية المالك', 'عقد الإيجار', 'شهادة الاسم التجاري'],
    estimatedCost: 200,
    onlineRenewal: true,
    governmentLink: 'https://mc.gov.sa',
  },

  // رخص البلدية (Municipality Licenses)
  MUNICIPALITY: {
    id: 'ML',
    name: 'الرخصة البلدية',
    nameEn: 'Municipality License',
    category: 'بلدي',
    icon: '🏛️',
    color: '#388e3c',
    issuingAuthority: 'الأمانة / البلدية',
    issuingAuthorityEn: 'Municipality',
    renewalPeriod: 365,
    alertDays: [60, 30, 15, 7, 3, 1],
    requiredDocuments: ['السجل التجاري', 'عقد الإيجار', 'رسم كروكي', 'شهادة الدفاع المدني'],
    estimatedCost: 500,
    onlineRenewal: true,
    governmentLink: 'https://balady.gov.sa',
  },

  // شهادة الدفاع المدني (Civil Defense Certificate)
  CIVIL_DEFENSE: {
    id: 'CD',
    name: 'شهادة الدفاع المدني',
    nameEn: 'Civil Defense Certificate',
    category: 'سلامة',
    icon: '🚒',
    color: '#d32f2f',
    issuingAuthority: 'الدفاع المدني',
    issuingAuthorityEn: 'Civil Defense',
    renewalPeriod: 365,
    alertDays: [90, 60, 30, 15, 7, 3, 1],
    requiredDocuments: ['الرخصة البلدية', 'مخطط الموقع', 'تقرير السلامة'],
    estimatedCost: 1000,
    onlineRenewal: true,
    governmentLink: 'https://998.gov.sa',
  },

  // البطاقة الصحية (Health Card)
  HEALTH_CARD: {
    id: 'HC',
    name: 'البطاقة الصحية',
    nameEn: 'Health Card',
    category: 'صحي',
    icon: '🏥',
    color: '#00796b',
    issuingAuthority: 'وزارة الصحة',
    issuingAuthorityEn: 'Ministry of Health',
    renewalPeriod: 365,
    alertDays: [60, 30, 15, 7, 3, 1],
    requiredDocuments: ['الفحص الطبي', 'صورة شخصية', 'الهوية الوطنية'],
    estimatedCost: 100,
    onlineRenewal: true,
    governmentLink: 'https://moh.gov.sa',
  },

  // رخصة محل المواد الغذائية (Food Establishment License)
  FOOD_LICENSE: {
    id: 'FL',
    name: 'رخصة محل المواد الغذائية',
    nameEn: 'Food Establishment License',
    category: 'غذائي',
    icon: '🍽️',
    color: '#f57c00',
    issuingAuthority: 'الهيئة العامة للغذاء والدواء',
    issuingAuthorityEn: 'SFDA',
    renewalPeriod: 365,
    alertDays: [90, 60, 30, 15, 7, 3, 1],
    requiredDocuments: [
      'الرخصة البلدية',
      'شهادة الدفاع المدني',
      'البطاقة الصحية للعاملين',
      'تحليل المياه',
    ],
    estimatedCost: 1500,
    onlineRenewal: true,
    governmentLink: 'https://sfda.gov.sa',
  },

  // رخصة القيادة (Driver's License)
  DRIVING_LICENSE: {
    id: 'DL',
    name: 'رخصة القيادة',
    nameEn: "Driver's License",
    category: 'مرور',
    icon: '🚗',
    color: '#5d4037',
    issuingAuthority: 'الإدارة العامة للمرور',
    issuingAuthorityEn: 'Traffic Department',
    renewalPeriod: 1825, // 5 years
    alertDays: [180, 90, 60, 30, 15, 7, 3, 1],
    requiredDocuments: ['الفحص الطبي', 'اختبار النظر', 'الهوية الوطنية', 'صورة شخصية'],
    estimatedCost: 400,
    onlineRenewal: true,
    governmentLink: 'https://www.spa.gov.sa',
  },

  // استمارة المركبة (Vehicle Registration)
  VEHICLE_REGISTRATION: {
    id: 'VR',
    name: 'استمارة المركبة',
    nameEn: 'Vehicle Registration',
    category: 'مرور',
    icon: '🚙',
    color: '#616161',
    issuingAuthority: 'الإدارة العامة للمرور',
    issuingAuthorityEn: 'Traffic Department',
    renewalPeriod: 365,
    alertDays: [60, 30, 15, 7, 3, 1],
    requiredDocuments: ['رخصة القيادة', 'التأمين', 'الفحص الدوري', 'سند الملكية'],
    estimatedCost: 150,
    onlineRenewal: true,
    governmentLink: 'https://www.spa.gov.sa',
  },

  // الإقامة (Iqama - Residency Permit)
  IQAMA: {
    id: 'IQ',
    name: 'الإقامة',
    nameEn: 'Iqama (Residency)',
    category: 'وثائق',
    icon: '🆔',
    color: '#7b1fa2',
    issuingAuthority: 'الجوازات',
    issuingAuthorityEn: 'Passport Department',
    renewalPeriod: 365,
    alertDays: [90, 60, 30, 15, 7, 3, 1],
    requiredDocuments: ['جواز السفر', 'صورة شخصية', 'عقد العمل', 'التأمين الطبي'],
    estimatedCost: 650,
    onlineRenewal: true,
    governmentLink: 'https://www.moi.gov.sa',
  },

  // رخصة العمل (Work Permit)
  WORK_PERMIT: {
    id: 'WP',
    name: 'رخصة العمل',
    nameEn: 'Work Permit',
    category: 'وثائق',
    icon: '💼',
    color: '#0288d1',
    issuingAuthority: 'وزارة الموارد البشرية',
    issuingAuthorityEn: 'Ministry of Human Resources',
    renewalPeriod: 365,
    alertDays: [90, 60, 30, 15, 7, 3, 1],
    requiredDocuments: ['الإقامة', 'عقد العمل', 'المؤهل الدراسي', 'الخبرة العملية'],
    estimatedCost: 200,
    onlineRenewal: true,
    governmentLink: 'https://www.hrsd.gov.sa',
  },

  // رخصة مزاولة المهنة (Professional Practice License)
  PROFESSIONAL_LICENSE: {
    id: 'PR',
    name: 'رخصة مزاولة المهنة',
    nameEn: 'Professional Practice License',
    category: 'مهني',
    icon: '⚕️',
    color: '#c62828',
    issuingAuthority: 'الهيئة السعودية للتخصصات الصحية',
    issuingAuthorityEn: 'Saudi Commission for Health Specialties',
    renewalPeriod: 365,
    alertDays: [90, 60, 30, 15, 7, 3, 1],
    requiredDocuments: ['المؤهل العلمي', 'شهادة الخبرة', 'شهادة حسن السيرة', 'الفحص الطبي'],
    estimatedCost: 800,
    onlineRenewal: true,
    governmentLink: 'https://www.scfhs.org.sa',
  },

  // شهادة الزكاة والدخل (Zakat Certificate)
  ZAKAT_CERTIFICATE: {
    id: 'ZK',
    name: 'شهادة الزكاة والدخل',
    nameEn: 'Zakat & Tax Certificate',
    category: 'مالي',
    icon: '💰',
    color: '#558b2f',
    issuingAuthority: 'هيئة الزكاة والضريبة والجمارك',
    issuingAuthorityEn: 'ZATCA',
    renewalPeriod: 365,
    alertDays: [60, 30, 15, 7, 3, 1],
    requiredDocuments: ['السجل التجاري', 'القوائم المالية', 'الإقرار الضريبي'],
    estimatedCost: 0,
    onlineRenewal: true,
    governmentLink: 'https://zatca.gov.sa',
  },

  // شهادة التأمينات الاجتماعية (Social Insurance Certificate)
  GOSI_CERTIFICATE: {
    id: 'GO',
    name: 'شهادة التأمينات الاجتماعية',
    nameEn: 'GOSI Certificate',
    category: 'مالي',
    icon: '🛡️',
    color: '#1565c0',
    issuingAuthority: 'المؤسسة العامة للتأمينات الاجتماعية',
    issuingAuthorityEn: 'General Organization for Social Insurance',
    renewalPeriod: 365,
    alertDays: [60, 30, 15, 7, 3, 1],
    requiredDocuments: ['السجل التجاري', 'قائمة الموظفين', 'سداد الاشتراكات'],
    estimatedCost: 0,
    onlineRenewal: true,
    governmentLink: 'https://www.gosi.gov.sa',
  },

  // رخصة الاستثمار الأجنبي (Foreign Investment License)
  FOREIGN_INVESTMENT: {
    id: 'FI',
    name: 'رخصة الاستثمار الأجنبي',
    nameEn: 'Foreign Investment License',
    category: 'استثماري',
    icon: '🌍',
    color: '#6a1b9a',
    issuingAuthority: 'وزارة الاستثمار',
    issuingAuthorityEn: 'Ministry of Investment (MISA)',
    renewalPeriod: 365,
    alertDays: [90, 60, 30, 15, 7, 3, 1],
    requiredDocuments: ['السجل التجاري', 'دراسة الجدوى', 'جواز السفر', 'رأس المال'],
    estimatedCost: 2000,
    onlineRenewal: true,
    governmentLink: 'https://misa.gov.sa',
  },

  // رخصة استغلال السطح (Rooftop License)
  ROOFTOP_LICENSE: {
    id: 'RT',
    name: 'رخصة استغلال السطح',
    nameEn: 'Rooftop Usage License',
    category: 'بلدي',
    icon: '🏗️',
    color: '#f9a825',
    issuingAuthority: 'الأمانة / البلدية',
    issuingAuthorityEn: 'Municipality',
    renewalPeriod: 365,
    alertDays: [60, 30, 15, 7, 3, 1],
    requiredDocuments: ['صك الملكية', 'الرسم الهندسي', 'موافقة الجيران'],
    estimatedCost: 300,
    onlineRenewal: false,
    governmentLink: 'https://balady.gov.sa',
  },

  // رخصة الحفر والبناء (Construction Permit)
  CONSTRUCTION_PERMIT: {
    id: 'CP',
    name: 'رخصة البناء',
    nameEn: 'Construction Permit',
    category: 'بلدي',
    icon: '🏗️',
    color: '#e65100',
    issuingAuthority: 'الأمانة / البلدية',
    issuingAuthorityEn: 'Municipality',
    renewalPeriod: 365,
    alertDays: [60, 30, 15, 7, 3, 1],
    requiredDocuments: ['صك الملكية', 'المخططات الهندسية', 'موافقة الدفاع المدني', 'تقرير التربة'],
    estimatedCost: 5000,
    onlineRenewal: true,
    governmentLink: 'https://balady.gov.sa',
  },

  // تصريح العمل المؤقت (Temporary Work Permit)
  TEMP_WORK_PERMIT: {
    id: 'TW',
    name: 'تصريح العمل المؤقت',
    nameEn: 'Temporary Work Permit',
    category: 'وثائق',
    icon: '📋',
    color: '#00acc1',
    issuingAuthority: 'وزارة الموارد البشرية',
    issuingAuthorityEn: 'Ministry of Human Resources',
    renewalPeriod: 90,
    alertDays: [30, 15, 7, 3, 1],
    requiredDocuments: ['جواز السفر', 'عقد العمل المؤقت', 'التأمين الطبي'],
    estimatedCost: 300,
    onlineRenewal: true,
    governmentLink: 'https://www.hrsd.gov.sa',
  },

  // شهادة المطابقة (Conformity Certificate)
  CONFORMITY_CERTIFICATE: {
    id: 'CC',
    name: 'شهادة المطابقة',
    nameEn: 'Conformity Certificate',
    category: 'جودة',
    icon: '✅',
    color: '#2e7d32',
    issuingAuthority: 'الهيئة السعودية للمواصفات والمقاييس',
    issuingAuthorityEn: 'SASO',
    renewalPeriod: 365,
    alertDays: [60, 30, 15, 7, 3, 1],
    requiredDocuments: ['السجل التجاري', 'شهادة المنتج', 'تقرير الفحص'],
    estimatedCost: 1000,
    onlineRenewal: true,
    governmentLink: 'https://www.saso.gov.sa',
  },

  // رخصة تشغيل المعدات (Equipment Operation License)
  EQUIPMENT_LICENSE: {
    id: 'EQ',
    name: 'رخصة تشغيل المعدات',
    nameEn: 'Equipment Operation License',
    category: 'صناعي',
    icon: '⚙️',
    color: '#455a64',
    issuingAuthority: 'المؤسسة العامة للتدريب التقني والمهني',
    issuingAuthorityEn: 'TVTC',
    renewalPeriod: 730, // 2 years
    alertDays: [90, 60, 30, 15, 7, 3, 1],
    requiredDocuments: ['شهادة التدريب', 'اختبار الكفاءة', 'الفحص الطبي'],
    estimatedCost: 500,
    onlineRenewal: false,
    governmentLink: 'https://www.tvtc.gov.sa',
  },

  // رخصة البيئة (Environmental License)
  ENVIRONMENTAL_LICENSE: {
    id: 'EN',
    name: 'التصريح البيئي',
    nameEn: 'Environmental Permit',
    category: 'بيئي',
    icon: '🌱',
    color: '#689f38',
    issuingAuthority: 'المركز الوطني للرقابة على الالتزام البيئي',
    issuingAuthorityEn: 'NCEC',
    renewalPeriod: 365,
    alertDays: [90, 60, 30, 15, 7, 3, 1],
    requiredDocuments: ['دراسة الأثر البيئي', 'خطة الإدارة البيئية', 'الرخصة البلدية'],
    estimatedCost: 2000,
    onlineRenewal: true,
    governmentLink: 'https://ncec.gov.sa',
  },

  // رخصة النقل (Transport License)
  TRANSPORT_LICENSE: {
    id: 'TR',
    name: 'رخصة النقل',
    nameEn: 'Transport License',
    category: 'نقل',
    icon: '🚚',
    color: '#f57f17',
    issuingAuthority: 'الهيئة العامة للنقل',
    issuingAuthorityEn: 'General Authority of Transport',
    renewalPeriod: 365,
    alertDays: [60, 30, 15, 7, 3, 1],
    requiredDocuments: [
      'السجل التجاري',
      'رخصة القيادة المهنية',
      'استمارة المركبة',
      'التأمين الشامل',
    ],
    estimatedCost: 1200,
    onlineRenewal: true,
    governmentLink: 'https://www.transport.gov.sa',
  },

  // رخصة المقاولات (Contracting License)
  CONTRACTING_LICENSE: {
    id: 'CT',
    name: 'رخصة المقاولات',
    nameEn: 'Contracting License',
    category: 'مقاولات',
    icon: '🏗️',
    color: '#bf360c',
    issuingAuthority: 'وزارة البلديات والإسكان',
    issuingAuthorityEn: 'Ministry of Municipalities',
    renewalPeriod: 365,
    alertDays: [90, 60, 30, 15, 7, 3, 1],
    requiredDocuments: [
      'السجل التجاري',
      'شهادة التصنيف',
      'قائمة المشاريع السابقة',
      'الكفاءة المالية',
    ],
    estimatedCost: 3000,
    onlineRenewal: true,
    governmentLink: 'https://www.momra.gov.sa',
  },
};

// License Categories
export const LICENSE_CATEGORIES = {
  COMMERCIAL: { name: 'تجاري', color: '#1976d2', icon: '🏢' },
  MUNICIPAL: { name: 'بلدي', color: '#388e3c', icon: '🏛️' },
  SAFETY: { name: 'سلامة', color: '#d32f2f', icon: '🚒' },
  HEALTH: { name: 'صحي', color: '#00796b', icon: '🏥' },
  FOOD: { name: 'غذائي', color: '#f57c00', icon: '🍽️' },
  TRAFFIC: { name: 'مرور', color: '#5d4037', icon: '🚗' },
  DOCUMENTS: { name: 'وثائق', color: '#7b1fa2', icon: '🆔' },
  PROFESSIONAL: { name: 'مهني', color: '#c62828', icon: '⚕️' },
  FINANCIAL: { name: 'مالي', color: '#558b2f', icon: '💰' },
  INVESTMENT: { name: 'استثماري', color: '#6a1b9a', icon: '🌍' },
  QUALITY: { name: 'جودة', color: '#2e7d32', icon: '✅' },
  INDUSTRIAL: { name: 'صناعي', color: '#455a64', icon: '⚙️' },
  ENVIRONMENTAL: { name: 'بيئي', color: '#689f38', icon: '🌱' },
  TRANSPORT: { name: 'نقل', color: '#f57f17', icon: '🚚' },
  CONTRACTING: { name: 'مقاولات', color: '#bf360c', icon: '🏗️' },
};

// Alert Levels Configuration
export const ALERT_LEVELS = {
  CRITICAL: {
    name: 'حرج',
    days: 7,
    color: '#d32f2f',
    icon: '🚨',
    priority: 1,
    action: 'urgent',
  },
  HIGH: {
    name: 'عالي',
    days: 15,
    color: '#f57c00',
    icon: '⚠️',
    priority: 2,
    action: 'immediate',
  },
  MEDIUM: {
    name: 'متوسط',
    days: 30,
    color: '#fbc02d',
    icon: '⏰',
    priority: 3,
    action: 'plan',
  },
  LOW: {
    name: 'منخفض',
    days: 60,
    color: '#388e3c',
    icon: 'ℹ️',
    priority: 4,
    action: 'monitor',
  },
};

// Notification Channels
export const NOTIFICATION_CHANNELS = {
  EMAIL: { name: 'البريد الإلكتروني', icon: '📧', enabled: true },
  SMS: { name: 'رسالة نصية', icon: '💬', enabled: true },
  PUSH: { name: 'إشعار فوري', icon: '🔔', enabled: true },
  WHATSAPP: { name: 'واتساب', icon: '📱', enabled: true },
  DASHBOARD: { name: 'لوحة التحكم', icon: '📊', enabled: true },
};

// Helper Functions
export const getLicenseTypeById = id => {
  return Object.values(SAUDI_LICENSE_TYPES).find(type => type.id === id);
};

export const getLicenseTypesByCategory = category => {
  return Object.values(SAUDI_LICENSE_TYPES).filter(type => type.category === category);
};

export const getAllLicenseTypes = () => {
  return Object.values(SAUDI_LICENSE_TYPES);
};

export const getAlertLevel = daysUntilExpiry => {
  if (daysUntilExpiry <= ALERT_LEVELS.CRITICAL.days) return ALERT_LEVELS.CRITICAL;
  if (daysUntilExpiry <= ALERT_LEVELS.HIGH.days) return ALERT_LEVELS.HIGH;
  if (daysUntilExpiry <= ALERT_LEVELS.MEDIUM.days) return ALERT_LEVELS.MEDIUM;
  if (daysUntilExpiry <= ALERT_LEVELS.LOW.days) return ALERT_LEVELS.LOW;
  return null;
};

export const calculateRenewalCost = (licenseType, includeLateFee = false, daysOverdue = 0) => {
  const type = getLicenseTypeById(licenseType);
  if (!type) return 0;

  let cost = type.estimatedCost;

  // Add late fee if applicable (10% per month overdue)
  if (includeLateFee && daysOverdue > 0) {
    const monthsOverdue = Math.ceil(daysOverdue / 30);
    cost += cost * 0.1 * monthsOverdue;
  }

  return cost;
};

export const formatSaudiDate = date => {
  return new Date(date).toLocaleDateString('ar-SA-u-ca-islamic', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatGregorianDate = date => {
  return new Date(date).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
};

export default SAUDI_LICENSE_TYPES;
