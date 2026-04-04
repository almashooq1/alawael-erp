/**
 * Document Management Calculations Tests - اختبارات حسابات إدارة الوثائق
 * Pure Unit Tests - No DB
 * نظام AlAwael ERP
 */

'use strict';

const {
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
} = require('../services/documents/documentCalculations.service');

// ========================================
// DOCUMENT_CONSTANTS
// ========================================
describe('DOCUMENT_CONSTANTS', () => {
  test('أنواع الوثائق موجودة', () => {
    expect(DOCUMENT_CONSTANTS.TYPES.NATIONAL_ID).toBe('national_id');
    expect(DOCUMENT_CONSTANTS.TYPES.IQAMA).toBe('iqama');
    expect(DOCUMENT_CONSTANTS.TYPES.SCFHS_LICENSE).toBe('scfhs_license');
    expect(DOCUMENT_CONSTANTS.TYPES.MEDICAL_REPORT).toBe('medical_report');
    expect(DOCUMENT_CONSTANTS.TYPES.INVOICE).toBe('invoice');
  });

  test('تصنيفات الحساسية موجودة', () => {
    expect(DOCUMENT_CONSTANTS.SENSITIVITY.PUBLIC).toBe('public');
    expect(DOCUMENT_CONSTANTS.SENSITIVITY.CONFIDENTIAL).toBe('confidential');
    expect(DOCUMENT_CONSTANTS.SENSITIVITY.RESTRICTED).toBe('restricted');
  });

  test('حالات الوثيقة موجودة', () => {
    expect(DOCUMENT_CONSTANTS.STATUS.ACTIVE).toBe('active');
    expect(DOCUMENT_CONSTANTS.STATUS.EXPIRED).toBe('expired');
    expect(DOCUMENT_CONSTANTS.STATUS.PENDING_RENEWAL).toBe('pending_renewal');
  });

  test('حدود الحجم صحيحة', () => {
    expect(DOCUMENT_CONSTANTS.SIZE_LIMITS.image).toBe(5 * 1024 * 1024);
    expect(DOCUMENT_CONSTANTS.SIZE_LIMITS.document).toBe(10 * 1024 * 1024);
    expect(DOCUMENT_CONSTANTS.SIZE_LIMITS.report).toBe(20 * 1024 * 1024);
  });

  test('أيام التنبيه للإقامة = 60', () => {
    expect(DOCUMENT_CONSTANTS.EXPIRY_WARNING_DAYS.IQAMA).toBe(60);
  });

  test('أيام التنبيه لـ SCFHS = 90', () => {
    expect(DOCUMENT_CONSTANTS.EXPIRY_WARNING_DAYS.SCFHS_LICENSE).toBe(90);
  });

  test('قائمة الوثائق الإلزامية تحتوي على iqama', () => {
    expect(DOCUMENT_CONSTANTS.MANDATORY_RENEWAL_TYPES).toContain('iqama');
    expect(DOCUMENT_CONSTANTS.MANDATORY_RENEWAL_TYPES).toContain('scfhs_license');
    expect(DOCUMENT_CONSTANTS.MANDATORY_RENEWAL_TYPES).toContain('national_id');
  });

  test('أنواع MIME المسموح بها', () => {
    expect(DOCUMENT_CONSTANTS.ALLOWED_MIME_TYPES.images).toContain('image/jpeg');
    expect(DOCUMENT_CONSTANTS.ALLOWED_MIME_TYPES.documents).toContain('application/pdf');
  });
});

// ========================================
// validateFileUpload
// ========================================
describe('validateFileUpload', () => {
  const validFile = {
    name: 'document.pdf',
    size: 1024 * 1024, // 1 MB
    mimeType: 'application/pdf',
    documentType: 'invoice',
  };

  test('ملف صالح → لا أخطاء', () => {
    const result = validateFileUpload(validFile);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('إدخال null → خطأ', () => {
    const result = validateFileUpload(null);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('بدون اسم ملف → خطأ', () => {
    const result = validateFileUpload({ ...validFile, name: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('اسم'))).toBe(true);
  });

  test('اسم طويل جداً → خطأ', () => {
    const result = validateFileUpload({ ...validFile, name: 'A'.repeat(256) + '.pdf' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('طويل'))).toBe(true);
  });

  test('حجم صفر → خطأ', () => {
    const result = validateFileUpload({ ...validFile, size: 0 });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('حجم'))).toBe(true);
  });

  test('حجم سالب → خطأ', () => {
    const result = validateFileUpload({ ...validFile, size: -100 });
    expect(result.isValid).toBe(false);
  });

  test('حجم يتجاوز الحد → خطأ', () => {
    const result = validateFileUpload({
      ...validFile,
      size: 15 * 1024 * 1024, // 15 MB يتجاوز حد document = 10 MB
      documentType: 'document',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('يتجاوز'))).toBe(true);
  });

  test('نوع MIME غير مسموح → خطأ', () => {
    const result = validateFileUpload({ ...validFile, mimeType: 'application/exe' });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('غير مسموح'))).toBe(true);
  });

  test('صورة JPEG مسموح بها', () => {
    const result = validateFileUpload({
      name: 'photo.jpg',
      size: 1024 * 1024,
      mimeType: 'image/jpeg',
      documentType: 'photo',
    });
    expect(result.isValid).toBe(true);
  });

  test('ملف صغير جداً → تحذير', () => {
    const result = validateFileUpload({ ...validFile, size: 50 }); // 50 bytes
    expect(result.warnings.some(w => w.includes('صغير'))).toBe(true);
  });

  test('بدون mimeType → خطأ', () => {
    const result = validateFileUpload({ ...validFile, mimeType: null });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('نوع'))).toBe(true);
  });
});

// ========================================
// getMaxFileSizeForType
// ========================================
describe('getMaxFileSizeForType', () => {
  test('تقرير طبي → 20 MB', () => {
    expect(getMaxFileSizeForType('medical_report')).toBe(20 * 1024 * 1024);
  });

  test('صورة → 5 MB', () => {
    expect(getMaxFileSizeForType('photo')).toBe(5 * 1024 * 1024);
  });

  test('نوع غير معروف → 10 MB', () => {
    expect(getMaxFileSizeForType('unknown')).toBe(10 * 1024 * 1024);
  });

  test('assessment_report → 20 MB', () => {
    expect(getMaxFileSizeForType('assessment_report')).toBe(20 * 1024 * 1024);
  });

  test('iep_document → 20 MB', () => {
    expect(getMaxFileSizeForType('iep_document')).toBe(20 * 1024 * 1024);
  });

  test('national_id (صورة هوية) → 5 MB', () => {
    expect(getMaxFileSizeForType('national_id')).toBe(5 * 1024 * 1024);
  });
});

// ========================================
// formatFileSize
// ========================================
describe('formatFileSize', () => {
  test('0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  test('500 bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  test('1024 bytes = 1 KB', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
  });

  test('1.5 MB', () => {
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });

  test('1 GB', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
  });

  test('إدخال سالب → 0 B', () => {
    expect(formatFileSize(-100)).toBe('0 B');
  });

  test('إدخال غير رقمي → 0 B', () => {
    expect(formatFileSize('abc')).toBe('0 B');
  });

  test('10 MB', () => {
    expect(formatFileSize(10 * 1024 * 1024)).toBe('10 MB');
  });
});

// ========================================
// extractFileExtension
// ========================================
describe('extractFileExtension', () => {
  test('document.pdf → pdf', () => {
    expect(extractFileExtension('document.pdf')).toBe('pdf');
  });

  test('IMAGE.JPG → jpg (lowercase)', () => {
    expect(extractFileExtension('IMAGE.JPG')).toBe('jpg');
  });

  test('file.docx → docx', () => {
    expect(extractFileExtension('file.docx')).toBe('docx');
  });

  test('no_extension → empty string', () => {
    expect(extractFileExtension('no_extension')).toBe('');
  });

  test('إدخال null → empty string', () => {
    expect(extractFileExtension(null)).toBe('');
  });

  test('ملف بنقاط متعددة → آخر امتداد', () => {
    expect(extractFileExtension('archive.tar.gz')).toBe('gz');
  });
});

// ========================================
// sanitizeFilename
// ========================================
describe('sanitizeFilename', () => {
  test('اسم عادي لا يتغير', () => {
    const result = sanitizeFilename('document.pdf');
    expect(result).toContain('.pdf');
  });

  test('مسافات تُبدّل بـ _', () => {
    const result = sanitizeFilename('my document.pdf');
    expect(result).toContain('my_document');
  });

  test('أحرف خطرة تُحذف', () => {
    const result = sanitizeFilename('file<>:"/\\|?*.pdf');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  test('اسم عربي يُبقى', () => {
    const result = sanitizeFilename('وثيقة_هامة.pdf');
    expect(result).toContain('وثيقة');
    expect(result).toContain('.pdf');
  });

  test('إدخال null → file', () => {
    expect(sanitizeFilename(null)).toBe('file');
  });

  test('اسم فارغ → file', () => {
    expect(sanitizeFilename('')).toBe('file');
  });

  test('اسم طويل يُقصّر', () => {
    const longName = 'A'.repeat(150);
    const result = sanitizeFilename(`${longName}.pdf`);
    expect(result.length).toBeLessThanOrEqual(110); // 100 chars + . + 3 (pdf)
  });
});

// ========================================
// calculateDocumentExpiryStatus
// ========================================
describe('calculateDocumentExpiryStatus', () => {
  const futureDate = date => {
    const d = new Date();
    d.setDate(d.getDate() + date);
    return d.toISOString().split('T')[0];
  };

  test('وثيقة بتاريخ انتهاء بعيد → active', () => {
    const result = calculateDocumentExpiryStatus(futureDate(200), 'passport');
    expect(result.status).toBe('active');
    expect(result.isExpired).toBe(false);
    expect(result.urgencyLevel).toBe('none');
  });

  test('وثيقة منتهية → expired + critical', () => {
    const result = calculateDocumentExpiryStatus(futureDate(-10), 'iqama');
    expect(result.isExpired).toBe(true);
    expect(result.status).toBe('expired');
    expect(result.urgencyLevel).toBe('critical');
  });

  test('iqama منتهية → needsRenewal true', () => {
    const result = calculateDocumentExpiryStatus(futureDate(-1), 'iqama');
    expect(result.needsRenewal).toBe(true);
  });

  test('وثيقة تنتهي خلال 5 أيام → critical', () => {
    const result = calculateDocumentExpiryStatus(futureDate(5), 'national_id');
    expect(result.urgencyLevel).toBe('critical');
    expect(result.status).toBe('pending_renewal');
  });

  test('وثيقة تنتهي خلال 20 يوم → high', () => {
    const result = calculateDocumentExpiryStatus(futureDate(20), 'national_id');
    expect(result.urgencyLevel).toBe('high');
    expect(result.needsRenewal).toBe(true);
  });

  test('إقامة تنتهي خلال 45 يوم → medium (ضمن 60 يوم)', () => {
    const result = calculateDocumentExpiryStatus(futureDate(45), 'iqama');
    expect(result.urgencyLevel).toBe('medium');
    expect(result.status).toBe('pending_renewal');
  });

  test('بدون تاريخ انتهاء → active بدون urgency', () => {
    const result = calculateDocumentExpiryStatus(null, 'degree');
    expect(result.status).toBe('active');
    expect(result.daysUntilExpiry).toBeNull();
  });

  test('تاريخ غير صالح → active', () => {
    const result = calculateDocumentExpiryStatus('not-a-date', 'iqama');
    expect(result.isExpired).toBe(false);
  });

  test('daysUntilExpiry سالب للوثيقة المنتهية', () => {
    const result = calculateDocumentExpiryStatus(futureDate(-5), 'passport');
    expect(result.daysUntilExpiry).toBeLessThanOrEqual(0);
  });

  test('asOfDate مخصص يعمل', () => {
    const asOf = new Date('2026-01-01');
    const result = calculateDocumentExpiryStatus('2026-03-01', 'national_id', asOf);
    expect(result.daysUntilExpiry).toBeGreaterThan(0);
  });

  test('warningDays يُرجع بشكل صحيح', () => {
    const result = calculateDocumentExpiryStatus(futureDate(200), 'iqama');
    expect(result.warningDays).toBe(60);
  });
});

// ========================================
// getExpiringDocuments
// ========================================
describe('getExpiringDocuments', () => {
  const makeDoc = (daysFromNow, type = 'iqama', id = 1) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return { id, type, expiryDate: d.toISOString().split('T')[0] };
  };

  test('وثائق ضمن 90 يوم تُرجع', () => {
    const docs = [makeDoc(30), makeDoc(60), makeDoc(120)];
    const result = getExpiringDocuments(docs, 90);
    expect(result).toHaveLength(2);
  });

  test('وثيقة منتهية (سالب) تُرجع', () => {
    const docs = [makeDoc(-5)];
    const result = getExpiringDocuments(docs, 90);
    expect(result).toHaveLength(1);
    expect(result[0].isExpired).toBe(true);
  });

  test('مرتبة من الأقرب للأبعد', () => {
    const docs = [
      makeDoc(60, 'passport', 1),
      makeDoc(10, 'iqama', 2),
      makeDoc(30, 'national_id', 3),
    ];
    const result = getExpiringDocuments(docs, 90);
    expect(result[0].id).toBe(2); // 10 أيام أقرب
    expect(result[1].id).toBe(3); // 30 يوم
    expect(result[2].id).toBe(1); // 60 يوم
  });

  test('وثائق بدون expiryDate تُتجاهل', () => {
    const docs = [{ id: 1, type: 'degree' }, makeDoc(20)];
    const result = getExpiringDocuments(docs, 90);
    expect(result).toHaveLength(1);
  });

  test('مصفوفة فارغة → فارغة', () => {
    expect(getExpiringDocuments([])).toEqual([]);
  });

  test('إدخال null → فارغة', () => {
    expect(getExpiringDocuments(null)).toEqual([]);
  });

  test('withinDays = 0 → فقط المنتهية', () => {
    const docs = [makeDoc(-2), makeDoc(10), makeDoc(200)];
    const result = getExpiringDocuments(docs, 0);
    expect(result).toHaveLength(1);
    expect(result[0].isExpired).toBe(true);
  });
});

// ========================================
// calculateExpiryDate
// ========================================
describe('calculateExpiryDate', () => {
  test('6 أشهر من يناير 2026 → يوليو 2026', () => {
    const result = calculateExpiryDate('2026-01-01', 6);
    expect(result.getMonth()).toBe(6); // يوليو (0-indexed)
    expect(result.getFullYear()).toBe(2026);
  });

  test('12 شهراً → سنة كاملة', () => {
    const result = calculateExpiryDate('2026-03-15', 12);
    expect(result.getFullYear()).toBe(2027);
    expect(result.getMonth()).toBe(2); // مارس
  });

  test('تاريخ null → null', () => {
    expect(calculateExpiryDate(null, 12)).toBeNull();
  });

  test('أشهر = 0 → null', () => {
    expect(calculateExpiryDate('2026-01-01', 0)).toBeNull();
  });

  test('أشهر سالبة → null', () => {
    expect(calculateExpiryDate('2026-01-01', -6)).toBeNull();
  });

  test('تاريخ غير صالح → null', () => {
    expect(calculateExpiryDate('not-a-date', 12)).toBeNull();
  });

  test('يقبل كائن Date', () => {
    const result = calculateExpiryDate(new Date('2026-01-01'), 3);
    expect(result).toBeInstanceOf(Date);
    expect(result.getMonth()).toBe(3); // أبريل
  });
});

// ========================================
// categorizeEmployeeDocuments
// ========================================
describe('categorizeEmployeeDocuments', () => {
  const futureDoc = (type, daysFromNow) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return { type, expiryDate: d.toISOString().split('T')[0] };
  };

  test('تصنيف صحيح: active + pendingRenewal + expired', () => {
    const docs = [
      futureDoc('scfhs_license', 200), // active
      futureDoc('iqama', 20), // pendingRenewal (ضمن 30)
      futureDoc('passport', -5), // expired
    ];
    const result = categorizeEmployeeDocuments(docs);
    expect(result.active).toHaveLength(1);
    expect(result.pendingRenewal).toHaveLength(1);
    expect(result.expired).toHaveLength(1);
  });

  test('byType يجمع الوثائق حسب النوع', () => {
    const docs = [
      { type: 'photo', expiryDate: null },
      { type: 'photo', expiryDate: null },
      { type: 'invoice', expiryDate: null },
    ];
    const result = categorizeEmployeeDocuments(docs);
    expect(result.byType['photo']).toHaveLength(2);
    expect(result.byType['invoice']).toHaveLength(1);
  });

  test('completeness: 3 وثائق إلزامية موجودة → 100%', () => {
    const docs = [
      { type: 'national_id', expiryDate: null },
      { type: 'employment_contract', expiryDate: null },
      { type: 'scfhs_license', expiryDate: null },
    ];
    const result = categorizeEmployeeDocuments(docs);
    expect(result.completeness).toBe(100);
  });

  test('completeness: وثيقة إلزامية واحدة فقط → 33%', () => {
    const docs = [{ type: 'national_id', expiryDate: null }];
    const result = categorizeEmployeeDocuments(docs);
    expect(result.completeness).toBe(33);
  });

  test('مصفوفة فارغة → completeness = 0', () => {
    const result = categorizeEmployeeDocuments([]);
    expect(result.completeness).toBe(0);
  });

  test('إدخال غير مصفوفة → قيم افتراضية', () => {
    const result = categorizeEmployeeDocuments(null);
    expect(result.active).toEqual([]);
    expect(result.completeness).toBe(0);
  });
});

// ========================================
// determineSensitivityLevel
// ========================================
describe('determineSensitivityLevel', () => {
  test('medical_report → restricted', () => {
    expect(determineSensitivityLevel('medical_report')).toBe('restricted');
  });

  test('iep_document → restricted', () => {
    expect(determineSensitivityLevel('iep_document')).toBe('restricted');
  });

  test('national_id → confidential', () => {
    expect(determineSensitivityLevel('national_id')).toBe('confidential');
  });

  test('iqama → confidential', () => {
    expect(determineSensitivityLevel('iqama')).toBe('confidential');
  });

  test('scfhs_license → internal', () => {
    expect(determineSensitivityLevel('scfhs_license')).toBe('internal');
  });

  test('driving_license → internal', () => {
    expect(determineSensitivityLevel('driving_license')).toBe('internal');
  });

  test('نوع غير معروف → public', () => {
    expect(determineSensitivityLevel('unknown_type')).toBe('public');
  });

  test('photo → public', () => {
    expect(determineSensitivityLevel('photo')).toBe('public');
  });

  test('employment_contract → restricted', () => {
    expect(determineSensitivityLevel('employment_contract')).toBe('restricted');
  });

  test('invoice → confidential', () => {
    expect(determineSensitivityLevel('invoice')).toBe('confidential');
  });
});

// ========================================
// calculateStorageUsage
// ========================================
describe('calculateStorageUsage', () => {
  test('حساب الحجم الكلي', () => {
    const docs = [
      { type: 'photo', size: 2 * 1024 * 1024 }, // 2 MB
      { type: 'invoice', size: 1 * 1024 * 1024 }, // 1 MB
      { type: 'report', size: 5 * 1024 * 1024 }, // 5 MB
    ];
    const result = calculateStorageUsage(docs);
    expect(result.totalSize).toBe(8 * 1024 * 1024);
    expect(result.totalCount).toBe(3);
  });

  test('تجميع حسب النوع', () => {
    const docs = [
      { type: 'photo', size: 1024 * 1024 },
      { type: 'photo', size: 2 * 1024 * 1024 },
      { type: 'pdf', size: 512 * 1024 },
    ];
    const result = calculateStorageUsage(docs);
    expect(result.byType['photo'].count).toBe(2);
    expect(result.byType['photo'].size).toBe(3 * 1024 * 1024);
    expect(result.byType['pdf'].count).toBe(1);
  });

  test('نسبة الاستخدام محسوبة بشكل صحيح', () => {
    const quota = 100 * 1024 * 1024; // 100 MB
    const docs = [{ type: 'photo', size: 50 * 1024 * 1024 }]; // 50 MB
    const result = calculateStorageUsage(docs, quota);
    expect(result.usagePercentage).toBe(50);
    expect(result.isNearLimit).toBe(false);
  });

  test('isNearLimit عند 80%+', () => {
    const quota = 100 * 1024 * 1024;
    const docs = [{ type: 'photo', size: 85 * 1024 * 1024 }];
    const result = calculateStorageUsage(docs, quota);
    expect(result.isNearLimit).toBe(true);
    expect(result.isOverLimit).toBe(false);
  });

  test('isOverLimit عند 100%+', () => {
    const quota = 100 * 1024 * 1024;
    const docs = [{ type: 'photo', size: 110 * 1024 * 1024 }];
    const result = calculateStorageUsage(docs, quota);
    expect(result.isOverLimit).toBe(true);
  });

  test('مصفوفة فارغة → كل الأصفار', () => {
    const result = calculateStorageUsage([]);
    expect(result.totalSize).toBe(0);
    expect(result.usagePercentage).toBe(0);
    expect(result.formatted).toBe('0 B');
  });

  test('وثيقة بدون حجم تُتجاهل', () => {
    const docs = [
      { type: 'photo', size: 1024 * 1024 },
      { type: 'other' }, // بدون size
    ];
    const result = calculateStorageUsage(docs);
    expect(result.totalCount).toBe(1);
  });

  test('byType.formatted موجود', () => {
    const docs = [{ type: 'photo', size: 1024 * 1024 }];
    const result = calculateStorageUsage(docs);
    expect(result.byType['photo'].formatted).toBe('1 MB');
  });
});

// ========================================
// findDuplicateDocuments
// ========================================
describe('findDuplicateDocuments', () => {
  test('ملفان بنفس الـ hash → مكررة exact', () => {
    const docs = [
      { id: 1, name: 'doc1.pdf', size: 1000, hash: 'abc123' },
      { id: 2, name: 'doc2.pdf', size: 2000, hash: 'abc123' },
    ];
    const result = findDuplicateDocuments(docs);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('exact');
    expect(result[0].documents).toHaveLength(2);
  });

  test('ملفان بنفس الاسم والحجم (بدون hash) → probable', () => {
    const docs = [
      { id: 1, name: 'invoice.pdf', size: 1000 },
      { id: 2, name: 'invoice.pdf', size: 1000 },
    ];
    const result = findDuplicateDocuments(docs);
    expect(result.some(r => r.type === 'probable')).toBe(true);
  });

  test('ملفات مختلفة → لا تكرار', () => {
    const docs = [
      { id: 1, name: 'doc1.pdf', size: 1000 },
      { id: 2, name: 'doc2.pdf', size: 2000 },
    ];
    const result = findDuplicateDocuments(docs);
    expect(result).toHaveLength(0);
  });

  test('ملف واحد → لا تكرار', () => {
    const docs = [{ id: 1, name: 'doc.pdf', size: 1000 }];
    const result = findDuplicateDocuments(docs);
    expect(result).toHaveLength(0);
  });

  test('مصفوفة فارغة → لا تكرار', () => {
    expect(findDuplicateDocuments([])).toHaveLength(0);
  });

  test('إدخال غير مصفوفة → لا تكرار', () => {
    expect(findDuplicateDocuments(null)).toHaveLength(0);
  });
});

// ========================================
// checkDocumentAccess
// ========================================
describe('checkDocumentAccess', () => {
  const restrictedDoc = { sensitivity: 'restricted', uploadedBy: 'user-2' };
  const confidentialDoc = { sensitivity: 'confidential', uploadedBy: 'user-2' };
  const internalDoc = { sensitivity: 'internal', uploadedBy: 'user-2' };
  const publicDoc = { sensitivity: 'public', uploadedBy: 'user-2' };

  test('super_admin → صلاحية كاملة على أي وثيقة', () => {
    const result = checkDocumentAccess(restrictedDoc, { role: 'super_admin', id: 'u1' });
    expect(result.canView).toBe(true);
    expect(result.canDownload).toBe(true);
    expect(result.canDelete).toBe(true);
    expect(result.canEdit).toBe(true);
  });

  test('admin → صلاحية كاملة', () => {
    const result = checkDocumentAccess(publicDoc, { role: 'admin', id: 'u1' });
    expect(result.canView).toBe(true);
    expect(result.canDelete).toBe(true);
  });

  test('accountant + restricted → لا يمكنه الوصول', () => {
    const result = checkDocumentAccess(restrictedDoc, { role: 'accountant', id: 'u1' });
    expect(result.canView).toBe(false);
    expect(result.canDownload).toBe(false);
  });

  test('therapist + restricted → يمكنه العرض فقط', () => {
    const result = checkDocumentAccess(restrictedDoc, { role: 'therapist', id: 'u1' });
    expect(result.canView).toBe(true);
    expect(result.canDownload).toBe(false);
    expect(result.canDelete).toBe(false);
  });

  test('hr_manager + confidential → يمكنه العرض والتعديل', () => {
    const result = checkDocumentAccess(confidentialDoc, { role: 'hr_manager', id: 'u1' });
    expect(result.canView).toBe(true);
    expect(result.canEdit).toBe(true);
    expect(result.canDelete).toBe(false);
  });

  test('viewer + public → يمكنه العرض والتحميل', () => {
    const result = checkDocumentAccess(publicDoc, { role: 'viewer', id: 'u1' });
    expect(result.canView).toBe(true);
    expect(result.canDownload).toBe(true);
    expect(result.canDelete).toBe(false);
  });

  test('viewer + internal → يمكنه العرض فقط', () => {
    const result = checkDocumentAccess(internalDoc, { role: 'viewer', id: 'u1' });
    expect(result.canView).toBe(true);
    expect(result.canDownload).toBe(false);
  });

  test('صاحب الوثيقة → يمكنه الحذف والتعديل', () => {
    const result = checkDocumentAccess(
      { ...confidentialDoc, uploadedBy: 'owner-user' },
      { role: 'receptionist', id: 'owner-user' }
    );
    expect(result.canDelete).toBe(true);
    expect(result.canEdit).toBe(true);
    expect(result.reason).toBe('owner_access');
  });

  test('بيانات null → لا صلاحية', () => {
    const result = checkDocumentAccess(null, null);
    expect(result.canView).toBe(false);
  });

  test('دور غير معروف → يُعامَل كـ viewer', () => {
    const result = checkDocumentAccess(restrictedDoc, { role: 'unknown_role', id: 'u1' });
    expect(result.canView).toBe(false);
  });
});

// ========================================
// calculateNextVersion
// ========================================
describe('calculateNextVersion', () => {
  test('1.0 + minor → 1.1', () => {
    expect(calculateNextVersion('1.0', 'minor')).toBe('1.1');
  });

  test('1.0 + major → 2.0', () => {
    expect(calculateNextVersion('1.0', 'major')).toBe('2.0');
  });

  test('2.5 + minor → 2.6', () => {
    expect(calculateNextVersion('2.5', 'minor')).toBe('2.6');
  });

  test('3.9 + major → 4.0', () => {
    expect(calculateNextVersion('3.9', 'major')).toBe('4.0');
  });

  test('افتراضي minor', () => {
    expect(calculateNextVersion('1.2')).toBe('1.3');
  });

  test('إصدار غير صالح → 1.0', () => {
    expect(calculateNextVersion('invalid')).toBe('1.0');
  });

  test('إدخال null → 1.0', () => {
    expect(calculateNextVersion(null)).toBe('1.0');
  });

  test('إدخال فارغ → 1.0', () => {
    expect(calculateNextVersion('')).toBe('1.0');
  });

  test('patch يُعامَل كـ minor', () => {
    expect(calculateNextVersion('1.0', 'patch')).toBe('1.1');
  });
});

// ========================================
// sortVersionsDescending
// ========================================
describe('sortVersionsDescending', () => {
  test('ترتيب تنازلي صحيح', () => {
    const versions = [{ version: '1.0' }, { version: '3.0' }, { version: '2.1' }];
    const result = sortVersionsDescending(versions);
    expect(result[0].version).toBe('3.0');
    expect(result[1].version).toBe('2.1');
    expect(result[2].version).toBe('1.0');
  });

  test('نفس الـ major → ترتيب بـ minor تنازلياً', () => {
    const versions = [{ version: '2.1' }, { version: '2.5' }, { version: '2.3' }];
    const result = sortVersionsDescending(versions);
    expect(result[0].version).toBe('2.5');
    expect(result[2].version).toBe('2.1');
  });

  test('مصفوفة فارغة → فارغة', () => {
    expect(sortVersionsDescending([])).toEqual([]);
  });

  test('عنصر واحد → يُرجع كما هو', () => {
    const versions = [{ version: '1.0' }];
    const result = sortVersionsDescending(versions);
    expect(result).toHaveLength(1);
  });

  test('لا يُعدل المصفوفة الأصلية', () => {
    const versions = [{ version: '2.0' }, { version: '1.0' }];
    const original = [...versions];
    sortVersionsDescending(versions);
    expect(versions[0].version).toBe(original[0].version);
  });

  test('إدخال غير مصفوفة → فارغة', () => {
    expect(sortVersionsDescending(null)).toEqual([]);
  });
});

// ========================================
// generateDocumentStatistics
// ========================================
describe('generateDocumentStatistics', () => {
  const makeDoc = (type, status, daysFromNow, size, sensitivity) => {
    const d = daysFromNow !== null ? new Date() : null;
    if (d) d.setDate(d.getDate() + daysFromNow);
    return {
      type,
      status: status || 'active',
      expiryDate: d ? d.toISOString().split('T')[0] : null,
      size: size || 1024 * 1024,
      sensitivity: sensitivity || 'internal',
    };
  };

  test('إحصاء إجمالي صحيح', () => {
    const docs = [
      makeDoc('photo', 'active', null),
      makeDoc('iqama', 'active', 20),
      makeDoc('passport', 'expired', -10),
    ];
    const result = generateDocumentStatistics(docs);
    expect(result.total).toBe(3);
  });

  test('عدد المنتهية صحيح', () => {
    const docs = [
      makeDoc('iqama', 'expired', -5),
      makeDoc('passport', 'expired', -10),
      makeDoc('photo', 'active', null),
    ];
    const result = generateDocumentStatistics(docs);
    expect(result.expired).toBe(2);
  });

  test('expiringWithin30Days صحيح', () => {
    const docs = [
      makeDoc('iqama', 'active', 10), // < 30
      makeDoc('passport', 'active', 25), // < 30
      makeDoc('photo', 'active', 60), // > 30
    ];
    const result = generateDocumentStatistics(docs);
    expect(result.expiringWithin30Days).toBe(2);
  });

  test('expiringWithin90Days صحيح', () => {
    const docs = [
      makeDoc('iqama', 'active', 30),
      makeDoc('passport', 'active', 89),
      makeDoc('photo', 'active', 100),
    ];
    const result = generateDocumentStatistics(docs);
    expect(result.expiringWithin90Days).toBe(2);
  });

  test('byType يحسب الأنواع', () => {
    const docs = [
      makeDoc('photo', 'active', null),
      makeDoc('photo', 'active', null),
      makeDoc('invoice', 'active', null),
    ];
    const result = generateDocumentStatistics(docs);
    expect(result.byType['photo']).toBe(2);
    expect(result.byType['invoice']).toBe(1);
  });

  test('bySensitivity يحسب الحساسية', () => {
    const docs = [
      makeDoc('photo', 'active', null, 1024, 'public'),
      makeDoc('invoice', 'active', null, 1024, 'confidential'),
    ];
    const result = generateDocumentStatistics(docs);
    expect(result.bySensitivity['public']).toBe(1);
    expect(result.bySensitivity['confidential']).toBe(1);
  });

  test('totalSize يجمع الأحجام', () => {
    const docs = [
      makeDoc('photo', 'active', null, 2 * 1024 * 1024),
      makeDoc('invoice', 'active', null, 3 * 1024 * 1024),
    ];
    const result = generateDocumentStatistics(docs);
    expect(result.totalSize).toBe(5 * 1024 * 1024);
    expect(result.formattedSize).toBe('5 MB');
  });

  test('مصفوفة فارغة → إحصاءات صفرية', () => {
    const result = generateDocumentStatistics([]);
    expect(result.total).toBe(0);
    expect(result.expired).toBe(0);
  });
});

// ========================================
// validateDocumentData
// ========================================
describe('validateDocumentData', () => {
  const validDoc = {
    type: 'invoice',
    entityType: 'beneficiary',
    entityId: 'BNF-001',
    filePath: '/uploads/invoice.pdf',
  };

  test('بيانات صالحة → لا أخطاء', () => {
    const errors = validateDocumentData(validDoc);
    expect(errors).toHaveLength(0);
  });

  test('إدخال null → خطأ', () => {
    const errors = validateDocumentData(null);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('غير صالحة');
  });

  test('نوع الوثيقة مفقود → خطأ', () => {
    const errors = validateDocumentData({ ...validDoc, type: null });
    expect(errors.some(e => e.includes('نوع'))).toBe(true);
  });

  test('entityType مفقود → خطأ', () => {
    const errors = validateDocumentData({ ...validDoc, entityType: null });
    expect(errors.some(e => e.includes('الكيان'))).toBe(true);
  });

  test('entityId مفقود → خطأ', () => {
    const errors = validateDocumentData({ ...validDoc, entityId: null });
    expect(errors.some(e => e.includes('معرّف'))).toBe(true);
  });

  test('لا filePath ولا fileUrl → خطأ', () => {
    const { filePath, ...docWithout } = validDoc;
    const errors = validateDocumentData(docWithout);
    expect(errors.some(e => e.includes('مسار'))).toBe(true);
  });

  test('fileUrl بديل لـ filePath → مقبول', () => {
    const { filePath, ...docWithout } = validDoc;
    const errors = validateDocumentData({ ...docWithout, fileUrl: 'https://example.com/file.pdf' });
    expect(errors).toHaveLength(0);
  });

  test('وثيقة iqama بدون expiryDate → خطأ', () => {
    const errors = validateDocumentData({
      ...validDoc,
      type: 'iqama',
    });
    expect(errors.some(e => e.includes('تاريخ انتهاء'))).toBe(true);
  });

  test('وثيقة iqama مع expiryDate → لا خطأ للتاريخ', () => {
    const errors = validateDocumentData({
      ...validDoc,
      type: 'iqama',
      expiryDate: '2027-12-31',
    });
    expect(errors.every(e => !e.includes('تاريخ انتهاء الصلاحية مطلوب'))).toBe(true);
  });

  test('تاريخ انتهاء غير صالح → خطأ', () => {
    const errors = validateDocumentData({
      ...validDoc,
      expiryDate: 'not-a-date',
    });
    expect(errors.some(e => e.includes('تاريخ الانتهاء غير صالح'))).toBe(true);
  });

  test('تاريخ إصدار غير صالح → خطأ', () => {
    const errors = validateDocumentData({
      ...validDoc,
      issueDate: 'bad-date',
    });
    expect(errors.some(e => e.includes('تاريخ الإصدار غير صالح'))).toBe(true);
  });

  test('تاريخ إصدار بعد تاريخ انتهاء → خطأ', () => {
    const errors = validateDocumentData({
      ...validDoc,
      issueDate: '2027-01-01',
      expiryDate: '2026-01-01',
    });
    expect(errors.some(e => e.includes('قبل تاريخ الانتهاء'))).toBe(true);
  });

  test('تاريخ إصدار قبل تاريخ انتهاء → لا خطأ', () => {
    const errors = validateDocumentData({
      ...validDoc,
      issueDate: '2025-01-01',
      expiryDate: '2027-01-01',
    });
    expect(errors).toHaveLength(0);
  });

  test('وثيقة photo بدون expiryDate → لا خطأ (ليست إلزامية)', () => {
    const errors = validateDocumentData({
      ...validDoc,
      type: 'photo',
    });
    expect(errors).toHaveLength(0);
  });
});

// ========================================
// Integration Scenarios
// ========================================
describe('Integration Scenarios', () => {
  test('سيناريو: رفع وثيقة موظف كاملة', () => {
    // 1. التحقق من الملف
    const fileValidation = validateFileUpload({
      name: 'iqama_scan.pdf',
      size: 2 * 1024 * 1024,
      mimeType: 'application/pdf',
      documentType: 'iqama',
    });
    expect(fileValidation.isValid).toBe(true);

    // 2. تحديد الحساسية
    const sensitivity = determineSensitivityLevel('iqama');
    expect(sensitivity).toBe('confidential');

    // 3. التحقق من بيانات الوثيقة
    const errors = validateDocumentData({
      type: 'iqama',
      entityType: 'employee',
      entityId: 'EMP-001',
      filePath: '/uploads/iqama_scan.pdf',
      expiryDate: '2026-12-31',
      issueDate: '2024-01-01',
    });
    expect(errors).toHaveLength(0);

    // 4. حساب حالة الانتهاء
    const expiryStatus = calculateDocumentExpiryStatus('2026-12-31', 'iqama');
    expect(expiryStatus.isExpired).toBe(false);
  });

  test('سيناريو: التحقق من الوثائق المنتهية وإرسال تنبيه', () => {
    const today = new Date();
    const docs = [
      {
        type: 'iqama',
        expiryDate: new Date(today.getTime() + 10 * 86400000).toISOString().split('T')[0],
      },
      {
        type: 'scfhs_license',
        expiryDate: new Date(today.getTime() + 60 * 86400000).toISOString().split('T')[0],
      },
      {
        type: 'passport',
        expiryDate: new Date(today.getTime() + 200 * 86400000).toISOString().split('T')[0],
      },
    ];

    const expiring = getExpiringDocuments(docs, 90);
    expect(expiring).toHaveLength(2); // iqama + scfhs

    const firstDoc = expiring[0];
    expect(firstDoc.type).toBe('iqama'); // الأقرب للانتهاء أولاً
    expect(firstDoc.urgencyLevel).toBe('high'); // 10 أيام ضمن 30 → high
  });

  test('سيناريو: إدارة إصدارات وثيقة', () => {
    const versions = [
      { version: '1.0', createdAt: '2025-01-01', note: 'نسخة أولى' },
      { version: '1.2', createdAt: '2025-06-01', note: 'تعديل بسيط' },
      { version: '2.0', createdAt: '2026-01-01', note: 'تجديد سنوي' },
    ];

    const sorted = sortVersionsDescending(versions);
    expect(sorted[0].version).toBe('2.0');

    // الإصدار التالي
    const nextMinor = calculateNextVersion('2.0', 'minor');
    expect(nextMinor).toBe('2.1');

    const nextMajor = calculateNextVersion('2.0', 'major');
    expect(nextMajor).toBe('3.0');
  });

  test('سيناريو: التحقق من صلاحيات وصول متعددة الأدوار', () => {
    const medicalReport = {
      type: 'medical_report',
      sensitivity: 'restricted',
      uploadedBy: 'doctor-001',
    };

    const adminAccess = checkDocumentAccess(medicalReport, { role: 'admin', id: 'a1' });
    expect(adminAccess.canView).toBe(true);
    expect(adminAccess.canDelete).toBe(true);

    const accountantAccess = checkDocumentAccess(medicalReport, { role: 'accountant', id: 'acc1' });
    expect(accountantAccess.canView).toBe(false);

    const therapistAccess = checkDocumentAccess(medicalReport, { role: 'therapist', id: 't1' });
    expect(therapistAccess.canView).toBe(true);
    expect(therapistAccess.canDownload).toBe(false);

    const ownerAccess = checkDocumentAccess(medicalReport, {
      role: 'accountant',
      id: 'doctor-001',
    });
    expect(ownerAccess.canDelete).toBe(true); // المنشئ يمكنه الحذف
  });

  test('سيناريو: تقرير استخدام التخزين', () => {
    const docs = [
      { type: 'photo', size: 2 * 1024 * 1024 },
      { type: 'medical_report', size: 8 * 1024 * 1024 },
      { type: 'invoice', size: 512 * 1024 },
      { type: 'photo', size: 1.5 * 1024 * 1024 },
    ];

    const usage = calculateStorageUsage(docs, 50 * 1024 * 1024); // 50 MB حصة
    expect(usage.totalCount).toBe(4);
    expect(usage.byType['photo'].count).toBe(2);
    expect(usage.usagePercentage).toBeGreaterThan(0);
    expect(usage.isNearLimit).toBe(false);

    // إحصائيات شاملة
    const stats = generateDocumentStatistics(docs);
    expect(stats.total).toBe(4);
    expect(stats.byType['photo']).toBe(2);
  });

  test('سيناريو: تصنيف وثائق موظف وحساب الاكتمال', () => {
    const today = new Date();
    const future = days => new Date(today.getTime() + days * 86400000).toISOString().split('T')[0];

    const employeeDocs = [
      { type: 'national_id', expiryDate: future(365) },
      { type: 'employment_contract', expiryDate: null },
      { type: 'scfhs_license', expiryDate: future(20) }, // قريب الانتهاء
      { type: 'iqama', expiryDate: future(-5) }, // منتهي
    ];

    const categorized = categorizeEmployeeDocuments(employeeDocs);
    expect(categorized.completeness).toBe(100); // الثلاثة الإلزامية موجودة
    expect(categorized.expired).toHaveLength(1);
    expect(categorized.pendingRenewal).toHaveLength(1); // scfhs_license
  });
});
