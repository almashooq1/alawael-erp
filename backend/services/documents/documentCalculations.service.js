/**
 * Document Management Calculations Service - خدمة حسابات إدارة الوثائق والملفات
 * Pure Business Logic - No DB, No Side Effects
 * نظام AlAwael ERP - مراكز تأهيل ذوي الإعاقة
 */

'use strict';

// ========================================
// CONSTANTS
// ========================================
const DOCUMENT_CONSTANTS = {
  // أنواع الوثائق
  TYPES: {
    // وثائق الموظفين
    NATIONAL_ID: 'national_id',
    IQAMA: 'iqama',
    PASSPORT: 'passport',
    SCFHS_LICENSE: 'scfhs_license',
    DRIVING_LICENSE: 'driving_license',
    CPR_CERTIFICATE: 'cpr_certificate',
    DEGREE: 'degree',
    EMPLOYMENT_CONTRACT: 'employment_contract',
    // وثائق المستفيدين
    MEDICAL_REPORT: 'medical_report',
    ASSESSMENT_REPORT: 'assessment_report',
    IEP_DOCUMENT: 'iep_document',
    INSURANCE_CARD: 'insurance_card',
    BIRTH_CERTIFICATE: 'birth_certificate',
    GUARDIAN_ID: 'guardian_id',
    // وثائق مالية
    INVOICE: 'invoice',
    RECEIPT: 'receipt',
    CONTRACT: 'contract',
    // وثائق تشغيلية
    VEHICLE_REGISTRATION: 'vehicle_registration',
    VEHICLE_INSURANCE: 'vehicle_insurance',
    FACILITY_LICENSE: 'facility_license',
    // وثائق عامة
    PHOTO: 'photo',
    OTHER: 'other',
  },

  // تصنيفات الحساسية
  SENSITIVITY: {
    PUBLIC: 'public',
    INTERNAL: 'internal',
    CONFIDENTIAL: 'confidential',
    RESTRICTED: 'restricted',
  },

  // حالات الوثيقة
  STATUS: {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    PENDING_RENEWAL: 'pending_renewal',
    REVOKED: 'revoked',
    ARCHIVED: 'archived',
  },

  // أنواع الملفات المسموح بها
  ALLOWED_MIME_TYPES: {
    images: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    documents: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    spreadsheets: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },

  // حدود الحجم (بالبايت)
  SIZE_LIMITS: {
    image: 5 * 1024 * 1024, // 5 MB
    document: 10 * 1024 * 1024, // 10 MB
    report: 20 * 1024 * 1024, // 20 MB
    default: 10 * 1024 * 1024, // 10 MB
  },

  // أيام التنبيه قبل الانتهاء
  EXPIRY_WARNING_DAYS: {
    IQAMA: 60, // إقامة: تنبيه قبل 60 يوم
    SCFHS_LICENSE: 90, // رخصة SCFHS: قبل 90 يوم
    PASSPORT: 90, // جواز: قبل 90 يوم
    NATIONAL_ID: 30, // هوية: قبل 30 يوم
    DRIVING_LICENSE: 30, // رخصة قيادة: قبل 30 يوم
    CPR_CERTIFICATE: 60, // CPR: قبل 60 يوم
    VEHICLE_REGISTRATION: 30,
    VEHICLE_INSURANCE: 30,
    FACILITY_LICENSE: 60,
    DEFAULT: 30,
  },

  // وثائق تتطلب تجديد إلزامي
  MANDATORY_RENEWAL_TYPES: [
    'iqama',
    'scfhs_license',
    'passport',
    'national_id',
    'driving_license',
    'cpr_certificate',
    'vehicle_registration',
    'vehicle_insurance',
    'facility_license',
  ],
};

// ========================================
// FILE VALIDATION
// ========================================

/**
 * التحقق من صحة ملف قبل رفعه
 * @param {object} fileInfo - معلومات الملف {name, size, mimeType, documentType}
 * @returns {object} - {isValid, errors, warnings}
 */
function validateFileUpload(fileInfo) {
  if (!fileInfo || typeof fileInfo !== 'object') {
    return { isValid: false, errors: ['معلومات الملف غير صالحة'], warnings: [] };
  }

  const errors = [];
  const warnings = [];

  // التحقق من الاسم
  if (!fileInfo.name || typeof fileInfo.name !== 'string') {
    errors.push('اسم الملف مطلوب');
  } else if (fileInfo.name.length > 255) {
    errors.push('اسم الملف طويل جداً (الحد الأقصى 255 حرف)');
  }

  // التحقق من الحجم
  if (typeof fileInfo.size !== 'number' || fileInfo.size <= 0) {
    errors.push('حجم الملف غير صالح');
  } else {
    const maxSize = getMaxFileSizeForType(fileInfo.documentType || 'default');
    if (fileInfo.size > maxSize) {
      errors.push(
        `حجم الملف (${formatFileSize(fileInfo.size)}) يتجاوز الحد الأقصى (${formatFileSize(maxSize)})`
      );
    }
    if (fileInfo.size < 100) {
      warnings.push('حجم الملف صغير جداً - تأكد من صحة الملف');
    }
  }

  // التحقق من نوع MIME
  if (!fileInfo.mimeType || typeof fileInfo.mimeType !== 'string') {
    errors.push('نوع الملف مطلوب');
  } else {
    const allAllowed = [
      ...DOCUMENT_CONSTANTS.ALLOWED_MIME_TYPES.images,
      ...DOCUMENT_CONSTANTS.ALLOWED_MIME_TYPES.documents,
      ...DOCUMENT_CONSTANTS.ALLOWED_MIME_TYPES.spreadsheets,
    ];
    if (!allAllowed.includes(fileInfo.mimeType)) {
      errors.push(`نوع الملف "${fileInfo.mimeType}" غير مسموح به`);
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * الحصول على الحد الأقصى لحجم الملف حسب نوع الوثيقة
 * @param {string} documentType - نوع الوثيقة
 * @returns {number} - الحجم الأقصى بالبايت
 */
function getMaxFileSizeForType(documentType) {
  const reportTypes = ['medical_report', 'assessment_report', 'iep_document'];
  const imageTypes = ['photo', 'national_id', 'iqama', 'passport'];

  if (reportTypes.includes(documentType)) {
    return DOCUMENT_CONSTANTS.SIZE_LIMITS.report;
  }
  if (imageTypes.includes(documentType)) {
    return DOCUMENT_CONSTANTS.SIZE_LIMITS.image;
  }
  return DOCUMENT_CONSTANTS.SIZE_LIMITS.default;
}

/**
 * تنسيق حجم الملف للعرض
 * @param {number} bytes - الحجم بالبايت
 * @returns {string} - "1.5 MB"
 */
function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);

  return `${Math.round(size * 100) / 100} ${units[i] || 'GB'}`;
}

/**
 * استخراج امتداد الملف من الاسم
 * @param {string} filename - اسم الملف
 * @returns {string} - الامتداد (pdf, jpg, ...)
 */
function extractFileExtension(filename) {
  if (!filename || typeof filename !== 'string') return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * توليد اسم ملف آمن (sanitize)
 * @param {string} filename - الاسم الأصلي
 * @returns {string} - اسم آمن
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return 'file';

  // إزالة الأحرف الخطرة
  const ext = extractFileExtension(filename);
  const nameWithoutExt = filename.substring(0, filename.length - (ext ? ext.length + 1 : 0));

  const safeName = nameWithoutExt
    .replace(/[^a-zA-Z0-9\u0600-\u06FF\s\-_]/g, '_') // الاحتفاظ بالعربية والإنجليزية
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 100)
    .trim();

  return ext ? `${safeName || 'file'}.${ext}` : safeName || 'file';
}

// ========================================
// DOCUMENT EXPIRY
// ========================================

/**
 * حساب حالة انتهاء صلاحية الوثيقة
 * @param {string|Date} expiryDate - تاريخ الانتهاء
 * @param {string} documentType - نوع الوثيقة
 * @param {Date} asOfDate - تاريخ المقارنة (افتراضي: الآن)
 * @returns {object} - {status, daysUntilExpiry, isExpired, needsRenewal, urgencyLevel}
 */
function calculateDocumentExpiryStatus(expiryDate, documentType, asOfDate = new Date()) {
  if (!expiryDate) {
    return {
      status: DOCUMENT_CONSTANTS.STATUS.ACTIVE,
      daysUntilExpiry: null,
      isExpired: false,
      needsRenewal: false,
      urgencyLevel: 'none',
    };
  }

  try {
    const expiry = new Date(expiryDate);
    const now = new Date(asOfDate);

    if (isNaN(expiry.getTime())) {
      return {
        status: DOCUMENT_CONSTANTS.STATUS.ACTIVE,
        daysUntilExpiry: null,
        isExpired: false,
        needsRenewal: false,
        urgencyLevel: 'none',
      };
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / msPerDay);

    const warningDays =
      DOCUMENT_CONSTANTS.EXPIRY_WARNING_DAYS[documentType?.toUpperCase()] ||
      DOCUMENT_CONSTANTS.EXPIRY_WARNING_DAYS.DEFAULT;

    let status;
    let urgencyLevel;
    let isExpired = false;
    let needsRenewal = false;

    if (daysUntilExpiry <= 0) {
      status = DOCUMENT_CONSTANTS.STATUS.EXPIRED;
      urgencyLevel = 'critical';
      isExpired = true;
      needsRenewal = DOCUMENT_CONSTANTS.MANDATORY_RENEWAL_TYPES.includes(documentType);
    } else if (daysUntilExpiry <= 7) {
      status = DOCUMENT_CONSTANTS.STATUS.PENDING_RENEWAL;
      urgencyLevel = 'critical';
      needsRenewal = true;
    } else if (daysUntilExpiry <= 30) {
      status = DOCUMENT_CONSTANTS.STATUS.PENDING_RENEWAL;
      urgencyLevel = 'high';
      needsRenewal = true;
    } else if (daysUntilExpiry <= warningDays) {
      status = DOCUMENT_CONSTANTS.STATUS.PENDING_RENEWAL;
      urgencyLevel = 'medium';
      needsRenewal = true;
    } else {
      status = DOCUMENT_CONSTANTS.STATUS.ACTIVE;
      urgencyLevel = 'none';
    }

    return {
      status,
      daysUntilExpiry,
      isExpired,
      needsRenewal,
      urgencyLevel,
      expiryDate: expiry,
      warningDays,
    };
  } catch {
    return {
      status: DOCUMENT_CONSTANTS.STATUS.ACTIVE,
      daysUntilExpiry: null,
      isExpired: false,
      needsRenewal: false,
      urgencyLevel: 'none',
    };
  }
}

/**
 * فلترة الوثائق المنتهية أو المقاربة للانتهاء
 * @param {Array} documents - قائمة الوثائق [{type, expiryDate, ...}]
 * @param {number} withinDays - ضمن كم يوم (افتراضي: 90)
 * @param {Date} asOfDate - تاريخ المقارنة
 * @returns {Array} - وثائق تحتاج انتباهاً، مرتبة حسب الإلحاح
 */
function getExpiringDocuments(documents, withinDays = 90, asOfDate = new Date()) {
  if (!Array.isArray(documents) || documents.length === 0) return [];

  const expiring = documents
    .filter(doc => doc && doc.expiryDate)
    .map(doc => {
      const status = calculateDocumentExpiryStatus(doc.expiryDate, doc.type, asOfDate);
      return { ...doc, ...status };
    })
    .filter(doc => doc.daysUntilExpiry !== null && doc.daysUntilExpiry <= withinDays)
    .sort((a, b) => (a.daysUntilExpiry ?? 999) - (b.daysUntilExpiry ?? 999));

  return expiring;
}

/**
 * حساب تاريخ الانتهاء المتوقع بناءً على مدة الصلاحية
 * @param {string|Date} issueDate - تاريخ الإصدار
 * @param {number} validityMonths - مدة الصلاحية بالأشهر
 * @returns {Date|null}
 */
function calculateExpiryDate(issueDate, validityMonths) {
  if (!issueDate || typeof validityMonths !== 'number' || validityMonths <= 0) return null;

  try {
    const issue = new Date(issueDate);
    if (isNaN(issue.getTime())) return null;

    const expiry = new Date(issue);
    expiry.setMonth(expiry.getMonth() + validityMonths);
    return expiry;
  } catch {
    return null;
  }
}

// ========================================
// DOCUMENT CATEGORIZATION
// ========================================

/**
 * تصنيف وثائق الموظف حسب النوع والحالة
 * @param {Array} documents - قائمة وثائق الموظف
 * @returns {object} - {byType, expired, active, pendingRenewal, completeness}
 */
function categorizeEmployeeDocuments(documents) {
  if (!Array.isArray(documents)) {
    return { byType: {}, expired: [], active: [], pendingRenewal: [], completeness: 0 };
  }

  const byType = {};
  const expired = [];
  const active = [];
  const pendingRenewal = [];

  documents.forEach(doc => {
    if (!doc) return;
    const type = doc.type || 'other';
    if (!byType[type]) byType[type] = [];
    byType[type].push(doc);

    const expiryStatus = calculateDocumentExpiryStatus(doc.expiryDate, doc.type);
    if (expiryStatus.isExpired) expired.push(doc);
    else if (expiryStatus.needsRenewal) pendingRenewal.push(doc);
    else active.push(doc);
  });

  // حساب اكتمال الوثائق الإلزامية
  const requiredTypes = ['national_id', 'employment_contract', 'scfhs_license'];
  const presentRequired = requiredTypes.filter(t => byType[t] && byType[t].length > 0);
  const completeness = Math.round((presentRequired.length / requiredTypes.length) * 100);

  return { byType, expired, active, pendingRenewal, completeness };
}

/**
 * حساب مستوى الحساسية للوثيقة حسب نوعها
 * @param {string} documentType - نوع الوثيقة
 * @param {string} entityType - نوع الكيان (employee/beneficiary/financial)
 * @returns {string} - مستوى الحساسية
 */
function determineSensitivityLevel(documentType, entityType) {
  const restrictedTypes = [
    'medical_report',
    'assessment_report',
    'iep_document',
    'employment_contract',
    'salary_certificate',
  ];
  const confidentialTypes = [
    'national_id',
    'iqama',
    'passport',
    'birth_certificate',
    'guardian_id',
    'insurance_card',
    'invoice',
    'receipt',
  ];
  const internalTypes = [
    'scfhs_license',
    'driving_license',
    'cpr_certificate',
    'vehicle_registration',
    'vehicle_insurance',
    'degree',
    'facility_license',
    'contract',
  ];

  if (restrictedTypes.includes(documentType)) {
    return DOCUMENT_CONSTANTS.SENSITIVITY.RESTRICTED;
  }
  if (confidentialTypes.includes(documentType)) {
    return DOCUMENT_CONSTANTS.SENSITIVITY.CONFIDENTIAL;
  }
  if (internalTypes.includes(documentType)) {
    return DOCUMENT_CONSTANTS.SENSITIVITY.INTERNAL;
  }
  return DOCUMENT_CONSTANTS.SENSITIVITY.PUBLIC;
}

// ========================================
// STORAGE CALCULATIONS
// ========================================

/**
 * حساب استخدام التخزين لمجموعة من الوثائق
 * @param {Array} documents - [{size, type, ...}]
 * @returns {object} - {totalSize, byType, formatted, usagePercentage}
 */
function calculateStorageUsage(documents, storageQuotaBytes = 5 * 1024 * 1024 * 1024) {
  if (!Array.isArray(documents) || documents.length === 0) {
    return {
      totalSize: 0,
      totalCount: 0,
      byType: {},
      formatted: '0 B',
      usagePercentage: 0,
      quotaFormatted: formatFileSize(storageQuotaBytes),
    };
  }

  let totalSize = 0;
  const byType = {};

  documents.forEach(doc => {
    if (!doc || typeof doc.size !== 'number') return;
    totalSize += doc.size;

    const type = doc.type || 'other';
    if (!byType[type]) byType[type] = { count: 0, size: 0 };
    byType[type].count++;
    byType[type].size += doc.size;
  });

  // إضافة formatted لكل نوع
  for (const type of Object.keys(byType)) {
    byType[type].formatted = formatFileSize(byType[type].size);
  }

  const usagePercentage =
    storageQuotaBytes > 0 ? Math.round((totalSize / storageQuotaBytes) * 10000) / 100 : 0;

  return {
    totalSize,
    totalCount: documents.filter(d => d && typeof d.size === 'number').length,
    byType,
    formatted: formatFileSize(totalSize),
    usagePercentage,
    quotaFormatted: formatFileSize(storageQuotaBytes),
    isNearLimit: usagePercentage >= 80,
    isOverLimit: usagePercentage >= 100,
  };
}

/**
 * إيجاد الوثائق المكررة المحتملة
 * @param {Array} documents - [{name, size, type, hash}]
 * @returns {Array} - مجموعات الوثائق المكررة
 */
function findDuplicateDocuments(documents) {
  if (!Array.isArray(documents) || documents.length < 2) return [];

  const hashGroups = {};
  const nameGroups = {};

  documents.forEach(doc => {
    if (!doc) return;

    // تجميع بالـ hash إن وجد
    if (doc.hash) {
      if (!hashGroups[doc.hash]) hashGroups[doc.hash] = [];
      hashGroups[doc.hash].push(doc);
    }

    // تجميع بالاسم والحجم
    const key = `${(doc.name || '').toLowerCase()}_${doc.size || 0}`;
    if (!nameGroups[key]) nameGroups[key] = [];
    nameGroups[key].push(doc);
  });

  const duplicates = [];

  // مجموعات الـ hash
  for (const group of Object.values(hashGroups)) {
    if (group.length > 1) duplicates.push({ type: 'exact', documents: group });
  }

  // مجموعات الاسم والحجم (بدون hash)
  for (const group of Object.values(nameGroups)) {
    if (group.length > 1 && !group[0].hash) {
      duplicates.push({ type: 'probable', documents: group });
    }
  }

  return duplicates;
}

// ========================================
// ACCESS CONTROL LOGIC
// ========================================

/**
 * التحقق من صلاحية الوصول للوثيقة
 * @param {object} document - بيانات الوثيقة
 * @param {object} user - بيانات المستخدم {role, branchId, id}
 * @returns {object} - {canView, canDownload, canDelete, canEdit, reason}
 */
function checkDocumentAccess(document, user) {
  if (!document || !user) {
    return {
      canView: false,
      canDownload: false,
      canDelete: false,
      canEdit: false,
      reason: 'بيانات غير مكتملة',
    };
  }

  const role = user.role || 'viewer';
  const sensitivity = document.sensitivity || DOCUMENT_CONSTANTS.SENSITIVITY.INTERNAL;

  // المدير العام: صلاحية كاملة
  if (role === 'super_admin' || role === 'admin') {
    return {
      canView: true,
      canDownload: true,
      canDelete: true,
      canEdit: true,
      reason: 'full_access',
    };
  }

  // قواعد الوصول حسب الحساسية والدور
  const accessMatrix = {
    restricted: {
      hr_manager: { canView: true, canDownload: true, canDelete: false, canEdit: false },
      doctor: { canView: true, canDownload: true, canDelete: false, canEdit: false },
      therapist: { canView: true, canDownload: false, canDelete: false, canEdit: false },
      accountant: { canView: false, canDownload: false, canDelete: false, canEdit: false },
      receptionist: { canView: false, canDownload: false, canDelete: false, canEdit: false },
      viewer: { canView: false, canDownload: false, canDelete: false, canEdit: false },
    },
    confidential: {
      hr_manager: { canView: true, canDownload: true, canDelete: false, canEdit: true },
      doctor: { canView: true, canDownload: true, canDelete: false, canEdit: false },
      therapist: { canView: true, canDownload: false, canDelete: false, canEdit: false },
      accountant: { canView: true, canDownload: true, canDelete: false, canEdit: false },
      receptionist: { canView: true, canDownload: false, canDelete: false, canEdit: false },
      viewer: { canView: false, canDownload: false, canDelete: false, canEdit: false },
    },
    internal: {
      hr_manager: { canView: true, canDownload: true, canDelete: true, canEdit: true },
      doctor: { canView: true, canDownload: true, canDelete: false, canEdit: false },
      therapist: { canView: true, canDownload: true, canDelete: false, canEdit: false },
      accountant: { canView: true, canDownload: true, canDelete: false, canEdit: false },
      receptionist: { canView: true, canDownload: false, canDelete: false, canEdit: false },
      viewer: { canView: true, canDownload: false, canDelete: false, canEdit: false },
    },
    public: {
      hr_manager: { canView: true, canDownload: true, canDelete: true, canEdit: true },
      doctor: { canView: true, canDownload: true, canDelete: false, canEdit: false },
      therapist: { canView: true, canDownload: true, canDelete: false, canEdit: false },
      accountant: { canView: true, canDownload: true, canDelete: false, canEdit: false },
      receptionist: { canView: true, canDownload: true, canDelete: false, canEdit: false },
      viewer: { canView: true, canDownload: true, canDelete: false, canEdit: false },
    },
  };

  const sensitivityMatrix = accessMatrix[sensitivity] || accessMatrix.internal;
  const roleAccess = sensitivityMatrix[role] || sensitivityMatrix.viewer;

  // منشئ الوثيقة يملك صلاحيات إضافية
  if (document.uploadedBy === user.id) {
    return {
      ...roleAccess,
      canDelete: true,
      canEdit: true,
      reason: 'owner_access',
    };
  }

  return { ...roleAccess, reason: 'role_based_access' };
}

// ========================================
// DOCUMENT VERSIONING
// ========================================

/**
 * حساب رقم الإصدار التالي للوثيقة
 * @param {string} currentVersion - الإصدار الحالي "1.0", "2.3"
 * @param {string} changeType - نوع التغيير: 'major' | 'minor' | 'patch'
 * @returns {string} - رقم الإصدار التالي
 */
function calculateNextVersion(currentVersion, changeType = 'minor') {
  if (!currentVersion || typeof currentVersion !== 'string') {
    return '1.0';
  }

  const parts = currentVersion.split('.').map(Number);
  if (parts.some(isNaN)) return '1.0';

  const [major = 1, minor = 0] = parts;

  if (changeType === 'major') {
    return `${major + 1}.0`;
  }
  // minor or patch
  return `${major}.${minor + 1}`;
}

/**
 * ترتيب الإصدارات تنازلياً
 * @param {Array} versions - [{version, createdAt, ...}]
 * @returns {Array} - مرتبة من الأحدث للأقدم
 */
function sortVersionsDescending(versions) {
  if (!Array.isArray(versions) || versions.length === 0) return [];

  return [...versions].sort((a, b) => {
    const vA = (a.version || '0.0').split('.').map(Number);
    const vB = (b.version || '0.0').split('.').map(Number);
    const majorDiff = (vB[0] || 0) - (vA[0] || 0);
    if (majorDiff !== 0) return majorDiff;
    return (vB[1] || 0) - (vA[1] || 0);
  });
}

// ========================================
// STATISTICS & REPORTING
// ========================================

/**
 * إنشاء تقرير إحصائي شامل للوثائق
 * @param {Array} documents - كل الوثائق
 * @param {Date} asOfDate - تاريخ التقرير
 * @returns {object} - إحصاءات شاملة
 */
function generateDocumentStatistics(documents, asOfDate = new Date()) {
  if (!Array.isArray(documents) || documents.length === 0) {
    return {
      total: 0,
      byStatus: {},
      byType: {},
      bySensitivity: {},
      expiringWithin30Days: 0,
      expiringWithin90Days: 0,
      expired: 0,
      totalSize: 0,
      formattedSize: '0 B',
    };
  }

  const byStatus = {};
  const byType = {};
  const bySensitivity = {};
  let totalSize = 0;
  let expiringWithin30 = 0;
  let expiringWithin90 = 0;
  let expiredCount = 0;

  documents.forEach(doc => {
    if (!doc) return;

    // بالحالة
    const status = doc.status || 'active';
    byStatus[status] = (byStatus[status] || 0) + 1;

    // بالنوع
    const type = doc.type || 'other';
    byType[type] = (byType[type] || 0) + 1;

    // بالحساسية
    const sensitivity = doc.sensitivity || 'internal';
    bySensitivity[sensitivity] = (bySensitivity[sensitivity] || 0) + 1;

    // الحجم
    if (typeof doc.size === 'number') totalSize += doc.size;

    // الانتهاء
    if (doc.expiryDate) {
      const expiryStatus = calculateDocumentExpiryStatus(doc.expiryDate, doc.type, asOfDate);
      if (expiryStatus.isExpired) {
        expiredCount++;
      } else if (expiryStatus.daysUntilExpiry !== null) {
        if (expiryStatus.daysUntilExpiry <= 30) expiringWithin30++;
        if (expiryStatus.daysUntilExpiry <= 90) expiringWithin90++;
      }
    }
  });

  return {
    total: documents.length,
    byStatus,
    byType,
    bySensitivity,
    expiringWithin30Days: expiringWithin30,
    expiringWithin90Days: expiringWithin90,
    expired: expiredCount,
    totalSize,
    formattedSize: formatFileSize(totalSize),
  };
}

/**
 * التحقق من صحة بيانات الوثيقة قبل الحفظ
 * @param {object} documentData - بيانات الوثيقة
 * @returns {Array} - قائمة الأخطاء
 */
function validateDocumentData(documentData) {
  if (!documentData || typeof documentData !== 'object') {
    return ['بيانات الوثيقة غير صالحة'];
  }

  const errors = [];

  if (!documentData.type) {
    errors.push('نوع الوثيقة مطلوب');
  }

  if (!documentData.entityType) {
    errors.push('نوع الكيان المرتبط (موظف/مستفيد) مطلوب');
  }

  if (!documentData.entityId) {
    errors.push('معرّف الكيان المرتبط مطلوب');
  }

  if (!documentData.filePath && !documentData.fileUrl) {
    errors.push('مسار الملف أو رابطه مطلوب');
  }

  // التحقق من تاريخ الانتهاء للوثائق الإلزامية
  if (
    DOCUMENT_CONSTANTS.MANDATORY_RENEWAL_TYPES.includes(documentData.type) &&
    !documentData.expiryDate
  ) {
    errors.push(`تاريخ انتهاء الصلاحية مطلوب لوثيقة من نوع "${documentData.type}"`);
  }

  // التحقق من صحة التاريخ
  if (documentData.expiryDate) {
    const expiry = new Date(documentData.expiryDate);
    if (isNaN(expiry.getTime())) {
      errors.push('تاريخ الانتهاء غير صالح');
    }
  }

  if (documentData.issueDate) {
    const issue = new Date(documentData.issueDate);
    if (isNaN(issue.getTime())) {
      errors.push('تاريخ الإصدار غير صالح');
    } else if (documentData.expiryDate) {
      const expiry = new Date(documentData.expiryDate);
      if (issue >= expiry) {
        errors.push('تاريخ الإصدار يجب أن يكون قبل تاريخ الانتهاء');
      }
    }
  }

  return errors;
}

// ========================================
// EXPORTS
// ========================================
module.exports = {
  DOCUMENT_CONSTANTS,
  validateFileUpload,
  getMaxFileSizeForType,
  formatFileSize,
  extractFileExtension,
  sanitizeFilename,
  calculateDocumentExpiryStatus,
  getExpiringDocuments,
  calculateExpiryDate,
  categorizeEmployeeDocuments,
  determineSensitivityLevel,
  calculateStorageUsage,
  findDuplicateDocuments,
  checkDocumentAccess,
  calculateNextVersion,
  sortVersionsDescending,
  generateDocumentStatistics,
  validateDocumentData,
};
