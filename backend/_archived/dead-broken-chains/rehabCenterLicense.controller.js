/**
 * Rehab Center License Controller - وحدة التحكم بتراخيص مراكز ذوي الإعاقة
 * جميع العمليات: CRUD + تنبيهات + تجديد + إحصائيات + تقارير + امتثال
 */

const service = require('../services/rehabCenterLicense.service');
const _logger = require('../utils/logger');
const { asyncHandler, AppError } = require('../utils/errorHandler');

// ==================== CRUD ====================

/** إنشاء ترخيص جديد */
exports.create = asyncHandler(async (req, res) => {
  const license = await service.create(req.body, req.user?.id);
  res.status(201).json({
    success: true,
    message: 'تم إنشاء الترخيص بنجاح',
    data: license,
  });
});

/** الحصول على جميع التراخيص مع البحث والفلترة */
exports.getAll = asyncHandler(async (req, res) => {
  const {
    search,
    status,
    category,
    licenseType,
    priority,
    expiringWithinDays,
    issuingAuthority,
    city,
    assignedTo,
    tags,
    page,
    limit,
    sortBy,
    sortOrder,
  } = req.query;

  const result = await service.search(
    {
      search,
      status,
      category,
      licenseType,
      priority,
      expiringWithinDays,
      issuingAuthority,
      city,
      assignedTo,
      tags,
    },
    { page, limit, sortBy, sortOrder }
  );

  res.json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

/** الحصول على ترخيص بالمعرف */
exports.getById = asyncHandler(async (req, res) => {
  const license = await service.getById(req.params.id);
  res.json({
    success: true,
    data: license,
  });
});

/** تحديث ترخيص */
exports.update = asyncHandler(async (req, res) => {
  const license = await service.update(req.params.id, req.body, req.user?.id);
  res.json({
    success: true,
    message: 'تم تحديث الترخيص بنجاح',
    data: license,
  });
});

/** حذف ترخيص */
exports.delete = asyncHandler(async (req, res) => {
  const result = await service.delete(req.params.id, req.user?.id, req.body.reason);
  res.json({
    success: true,
    message: result.message,
  });
});

// ==================== التجديد ====================

/** تجديد ترخيص */
exports.renew = asyncHandler(async (req, res) => {
  const license = await service.renew(req.params.id, req.body, req.user?.id);
  res.json({
    success: true,
    message: 'تم تجديد الترخيص بنجاح',
    data: license,
  });
});

/** سجل التجديدات */
exports.getRenewalHistory = asyncHandler(async (req, res) => {
  const history = await service.getRenewalHistory(req.params.id);
  res.json({
    success: true,
    data: history,
  });
});

/** التجديد المجمع */
exports.bulkRenew = asyncHandler(async (req, res) => {
  const { licenseIds, ...renewalData } = req.body;
  if (!Array.isArray(licenseIds) || licenseIds.length === 0) {
    throw new AppError('يجب تحديد ترخيص واحد على الأقل', 400);
  }
  const results = await service.bulkRenew(licenseIds, renewalData, req.user?.id);
  res.json({
    success: true,
    message: `تم معالجة ${results.length} ترخيص`,
    data: results,
  });
});

// ==================== التنبيهات ====================

/** الحصول على التنبيهات النشطة */
exports.getActiveAlerts = asyncHandler(async (req, res) => {
  const alerts = await service.getActiveAlerts(req.query);
  res.json({
    success: true,
    data: alerts,
    count: alerts.length,
  });
});

/** تشغيل فحص التنبيهات */
exports.runAlertScan = asyncHandler(async (req, res) => {
  const result = await service.runAlertScan();
  res.json({
    success: true,
    message: `تم فحص ${result.scanned} ترخيص وإنشاء ${result.newAlerts} تنبيه جديد`,
    data: result,
  });
});

/** تجاهل تنبيه */
exports.dismissAlert = asyncHandler(async (req, res) => {
  const result = await service.dismissAlert(req.params.id, req.params.alertId, req.user?.id);
  res.json({ success: true, message: result.message });
});

/** تعليم تنبيه كمقروء */
exports.markAlertRead = asyncHandler(async (req, res) => {
  const result = await service.markAlertRead(req.params.id, req.params.alertId);
  res.json({ success: true, message: result.message });
});

// ==================== الإحصائيات ولوحة المعلومات ====================

/** إحصائيات عامة */
exports.getStatistics = asyncHandler(async (req, res) => {
  const statistics = await service.getStatistics();
  res.json({
    success: true,
    data: statistics,
  });
});

/** لوحة المعلومات */
exports.getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await service.getDashboard();
  res.json({
    success: true,
    data: dashboard,
  });
});

/** التقرير الشهري */
exports.getMonthlyReport = asyncHandler(async (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) throw new AppError('يجب تحديد السنة والشهر', 400);
  const report = await service.getMonthlyReport(parseInt(year), parseInt(month));
  res.json({
    success: true,
    data: report,
  });
});

/** تقرير التكاليف */
exports.getCostReport = asyncHandler(async (req, res) => {
  const report = await service.getCostReport(req.query);
  res.json({
    success: true,
    data: report,
  });
});

// ==================== الملاحظات ====================

/** إضافة ملاحظة */
exports.addNote = asyncHandler(async (req, res) => {
  const { content, category } = req.body;
  if (!content) throw new AppError('محتوى الملاحظة مطلوب', 400);
  const note = await service.addNote(req.params.id, content, category, req.user?.id);
  res.status(201).json({
    success: true,
    message: 'تم إضافة الملاحظة بنجاح',
    data: note,
  });
});

// ==================== المستندات ====================

/** رفع مستند */
exports.addAttachment = asyncHandler(async (req, res) => {
  const attachment = await service.addAttachment(req.params.id, req.body, req.user?.id);
  res.status(201).json({
    success: true,
    message: 'تم رفع المستند بنجاح',
    data: attachment,
  });
});

// ==================== الامتثال والتفتيش ====================

/** تسجيل الفحص/التفتيش */
exports.recordInspection = asyncHandler(async (req, res) => {
  const result = await service.recordInspection(req.params.id, req.body, req.user?.id);
  res.json({
    success: true,
    message: 'تم تسجيل نتيجة التفتيش بنجاح',
    data: result,
  });
});

/** تسجيل مخالفة */
exports.recordViolation = asyncHandler(async (req, res) => {
  const result = await service.recordViolation(req.params.id, req.body, req.user?.id);
  res.json({
    success: true,
    message: 'تم تسجيل المخالفة بنجاح',
    data: result,
  });
});

// ==================== العمليات المجمعة ====================

/** تحديث حالة مجمع */
exports.bulkUpdateStatus = asyncHandler(async (req, res) => {
  const { licenseIds, status } = req.body;
  if (!Array.isArray(licenseIds) || !status) {
    throw new AppError('يجب تحديد التراخيص والحالة الجديدة', 400);
  }
  const results = await service.bulkUpdateStatus(licenseIds, status, req.user?.id);
  res.json({
    success: true,
    message: `تم معالجة ${results.length} ترخيص`,
    data: results,
  });
});

// ==================== التصدير ====================

/** تصدير البيانات */
exports.exportData = asyncHandler(async (req, res) => {
  const data = await service.exportData(req.query);
  res.json({
    success: true,
    data,
    count: data.length,
  });
});

// ==================== التفويضات ====================

/** إضافة / تحديث تفويض */
exports.setDelegation = asyncHandler(async (req, res) => {
  const delegation = await service.setDelegation(req.params.id, req.body, req.user?.id);
  res.json({ success: true, message: 'تم إضافة التفويض بنجاح', data: delegation });
});

/** إلغاء تفويض */
exports.revokeDelegation = asyncHandler(async (req, res) => {
  const result = await service.revokeDelegation(req.params.id, req.user?.id);
  res.json({ success: true, message: result.message });
});

/** الحصول على التفويضات النشطة */
exports.getActiveDelegations = asyncHandler(async (req, res) => {
  const delegations = await service.getActiveDelegations();
  res.json({ success: true, data: delegations, count: delegations.length });
});

// ==================== التراخيص المرتبطة ====================

/** ربط ترخيصين */
exports.linkLicenses = asyncHandler(async (req, res) => {
  const { targetId, relationship, description } = req.body;
  if (!targetId || !relationship)
    throw new AppError('يجب تحديد الترخيص المستهدف ونوع العلاقة', 400);
  const result = await service.linkLicenses(
    req.params.id,
    targetId,
    relationship,
    description,
    req.user?.id
  );
  res.json({ success: true, message: result.message });
});

/** الحصول على التراخيص المرتبطة */
exports.getLinkedLicenses = asyncHandler(async (req, res) => {
  const linked = await service.getLinkedLicenses(req.params.id);
  res.json({ success: true, data: linked });
});

// ==================== المتطلبات ====================

/** إضافة متطلب */
exports.addRequirement = asyncHandler(async (req, res) => {
  if (!req.body.requirement) throw new AppError('المتطلب مطلوب', 400);
  const requirement = await service.addRequirement(req.params.id, req.body, req.user?.id);
  res.status(201).json({ success: true, message: 'تم إضافة المتطلب', data: requirement });
});

/** تحديث حالة متطلب */
exports.updateRequirement = asyncHandler(async (req, res) => {
  const requirement = await service.updateRequirement(
    req.params.id,
    req.params.requirementId,
    req.body,
    req.user?.id
  );
  res.json({ success: true, message: 'تم تحديث المتطلب', data: requirement });
});

/** حالة المتطلبات */
exports.getRequirementsStatus = asyncHandler(async (req, res) => {
  const status = await service.getRequirementsStatus(req.params.id);
  res.json({ success: true, data: status });
});

// ==================== الشروط ====================

/** إضافة شرط */
exports.addCondition = asyncHandler(async (req, res) => {
  if (!req.body.condition) throw new AppError('الشرط مطلوب', 400);
  const condition = await service.addCondition(req.params.id, req.body, req.user?.id);
  res.status(201).json({ success: true, message: 'تم إضافة الشرط', data: condition });
});

/** تحديث حالة شرط */
exports.updateCondition = asyncHandler(async (req, res) => {
  const condition = await service.updateCondition(
    req.params.id,
    req.params.conditionId,
    req.body,
    req.user?.id
  );
  res.json({ success: true, message: 'تم تحديث الشرط', data: condition });
});

// ==================== الغرامات والعقوبات ====================

/** إضافة غرامة */
exports.addPenalty = asyncHandler(async (req, res) => {
  const penalty = await service.addPenalty(req.params.id, req.body, req.user?.id);
  res.status(201).json({ success: true, message: 'تم تسجيل الغرامة', data: penalty });
});

/** تحديث حالة غرامة */
exports.updatePenalty = asyncHandler(async (req, res) => {
  const penalty = await service.updatePenalty(
    req.params.id,
    req.params.penaltyId,
    req.body,
    req.user?.id
  );
  res.json({ success: true, message: 'تم تحديث الغرامة', data: penalty });
});

/** الغرامات المعلقة */
exports.getPendingPenalties = asyncHandler(async (req, res) => {
  const penalties = await service.getPendingPenalties();
  res.json({ success: true, data: penalties, count: penalties.length });
});

/** إحصائيات الغرامات */
exports.getPenaltyStatistics = asyncHandler(async (req, res) => {
  const stats = await service.getPenaltyStatistics();
  res.json({ success: true, data: stats });
});

// ==================== درجة المخاطرة ====================

/** حساب المخاطرة لترخيص */
exports.calculateRisk = asyncHandler(async (req, res) => {
  const riskScore = await service.calculateRisk(req.params.id);
  res.json({ success: true, data: riskScore });
});

/** حساب المخاطرة لجميع التراخيص */
exports.calculateAllRisks = asyncHandler(async (req, res) => {
  const result = await service.calculateAllRisks();
  res.json({ success: true, message: `تم تحديث ${result.updated} ترخيص`, data: result });
});

/** التراخيص عالية المخاطرة */
exports.getHighRiskLicenses = asyncHandler(async (req, res) => {
  const minScore = parseInt(req.query.minScore) || 50;
  const licenses = await service.getHighRiskLicenses(minScore);
  res.json({ success: true, data: licenses, count: licenses.length });
});

// ==================== سير عمل الموافقات ====================

/** إعداد سير عمل موافقة */
exports.setupApprovalWorkflow = asyncHandler(async (req, res) => {
  const { steps } = req.body;
  if (!Array.isArray(steps) || steps.length === 0)
    throw new AppError('يجب تحديد خطوات الموافقة', 400);
  const workflow = await service.setupApprovalWorkflow(req.params.id, steps, req.user?.id);
  res.json({ success: true, message: 'تم إعداد سير عمل الموافقات', data: workflow });
});

/** معالجة خطوة موافقة */
exports.processApprovalStep = asyncHandler(async (req, res) => {
  const { stepNumber, action, comments } = req.body;
  if (!stepNumber || !action) throw new AppError('يجب تحديد رقم الخطوة والإجراء', 400);
  const workflow = await service.processApprovalStep(
    req.params.id,
    parseInt(stepNumber),
    action,
    comments,
    req.user?.id
  );
  res.json({ success: true, message: 'تم معالجة خطوة الموافقة', data: workflow });
});

// ==================== الأرشيف ====================

/** أرشفة ترخيص */
exports.archive = asyncHandler(async (req, res) => {
  const result = await service.archive(req.params.id, req.body.reason, req.user?.id);
  res.json({ success: true, message: result.message });
});

/** استعادة من الأرشيف */
exports.unarchive = asyncHandler(async (req, res) => {
  const result = await service.unarchive(req.params.id, req.user?.id);
  res.json({ success: true, message: result.message });
});

/** التراخيص المؤرشفة */
exports.getArchived = asyncHandler(async (req, res) => {
  const result = await service.getArchived(req.query);
  res.json({ success: true, data: result.data, pagination: result.pagination });
});

// ==================== كشف التكرار ====================

/** البحث عن تراخيص مكررة */
exports.findDuplicates = asyncHandler(async (req, res) => {
  const duplicates = await service.findDuplicates();
  res.json({ success: true, data: duplicates, count: duplicates.length });
});

// ==================== التوقعات والتحليلات ====================

/** توقعات التجديد */
exports.getRenewalForecast = asyncHandler(async (req, res) => {
  const months = parseInt(req.query.months) || 12;
  const forecast = await service.getRenewalForecast(months);
  res.json({ success: true, data: forecast });
});

/** إحصائيات المناطق */
exports.getRegionStatistics = asyncHandler(async (req, res) => {
  const stats = await service.getRegionStatistics();
  res.json({ success: true, data: stats });
});

/** إحصائيات التجديدات السنوية */
exports.getRenewalStatistics = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const stats = await service.getRenewalStatistics(year);
  res.json({ success: true, data: stats });
});

// ==================== التقييم ====================

/** تقييم الترخيص */
exports.setAuthorityRating = asyncHandler(async (req, res) => {
  const rating = await service.setAuthorityRating(req.params.id, req.body, req.user?.id);
  res.json({ success: true, message: 'تم تسجيل التقييم', data: rating });
});

// ==================== الإشعارات ====================

/** تحديث تفضيلات الإشعارات */
exports.updateNotificationPreferences = asyncHandler(async (req, res) => {
  const prefs = await service.updateNotificationPreferences(req.params.id, req.body, req.user?.id);
  res.json({ success: true, message: 'تم تحديث تفضيلات الإشعارات', data: prefs });
});

// ==================== الفروع ====================

/** إضافة فرع */
exports.addBranch = asyncHandler(async (req, res) => {
  if (!req.body.branchName) throw new AppError('اسم الفرع مطلوب', 400);
  const branch = await service.addBranch(req.params.id, req.body, req.user?.id);
  res.status(201).json({ success: true, message: 'تم إضافة الفرع', data: branch });
});

/** حذف فرع */
exports.removeBranch = asyncHandler(async (req, res) => {
  const result = await service.removeBranch(req.params.id, req.params.branchId, req.user?.id);
  res.json({ success: true, message: result.message });
});

// ==================== سجل التدقيق ====================

/** سجل التدقيق */
exports.getAuditTrail = asyncHandler(async (req, res) => {
  const trail = await service.getAuditTrail(req.params.id, req.query);
  res.json({ success: true, data: trail });
});

// ==================== تقارير موسعة ====================

/** لوحة التحكم الموسعة */
exports.getEnhancedDashboard = asyncHandler(async (req, res) => {
  const dashboard = await service.getEnhancedDashboard();
  res.json({ success: true, data: dashboard });
});

/** تقرير الامتثال */
exports.getComplianceReport = asyncHandler(async (req, res) => {
  const report = await service.getComplianceReport();
  res.json({ success: true, data: report });
});

/** التقرير السنوي */
exports.getAnnualReport = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const report = await service.getAnnualReport(year);
  res.json({ success: true, data: report });
});

// ==================== التراخيص المنتهية والقريبة ====================

/** التراخيص المنتهية */
exports.getExpired = asyncHandler(async (req, res) => {
  const { data } = await service.search(
    { status: 'expired' },
    { limit: 100, sortBy: 'dates.expiry', sortOrder: 'desc' }
  );
  res.json({ success: true, data, count: data.length });
});

/** التراخيص القريبة الانتهاء */
exports.getExpiringSoon = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const { data } = await service.search(
    { expiringWithinDays: days },
    { limit: 100, sortBy: 'dates.expiry', sortOrder: 'asc' }
  );
  res.json({ success: true, data, count: data.length });
});

// ==================== أنواع التراخيص والفئات (Lookup) ====================

/** الحصول على أنواع التراخيص المتاحة */
exports.getLicenseTypes = asyncHandler(async (req, res) => {
  const types = [
    // التراخيص الحكومية
    {
      value: 'MHRSD_LICENSE',
      label: 'ترخيص وزارة الموارد البشرية والتنمية الاجتماعية',
      category: 'government_license',
    },
    {
      value: 'MHRSD_REHAB_PERMIT',
      label: 'تصريح مزاولة نشاط التأهيل',
      category: 'government_license',
    },
    { value: 'MOH_HEALTH_LICENSE', label: 'ترخيص وزارة الصحة', category: 'government_license' },
    { value: 'MOH_CLINIC_LICENSE', label: 'ترخيص العيادات الطبية', category: 'government_license' },
    {
      value: 'MOE_EDUCATION_LICENSE',
      label: 'ترخيص وزارة التعليم',
      category: 'government_license',
    },
    {
      value: 'MOE_SPECIAL_ED_PERMIT',
      label: 'تصريح التربية الخاصة',
      category: 'government_license',
    },
    { value: 'CIVIL_DEFENSE_CERT', label: 'شهادة الدفاع المدني', category: 'government_license' },
    {
      value: 'CIVIL_DEFENSE_EVACUATION',
      label: 'شهادة خطة الإخلاء',
      category: 'government_license',
    },
    { value: 'FOOD_LICENSE', label: 'رخصة الغذاء والدواء', category: 'government_license' },
    { value: 'TRANSPORT_LICENSE', label: 'ترخيص نقل ذوي الإعاقة', category: 'government_license' },
    // الرخص البلدية
    { value: 'MUNICIPAL_LICENSE', label: 'الرخصة البلدية', category: 'municipal_permit' },
    { value: 'MUNICIPAL_SAFETY', label: 'شهادة السلامة البلدية', category: 'municipal_permit' },
    { value: 'MUNICIPAL_SIGNBOARD', label: 'رخصة اللوحة الإعلانية', category: 'municipal_permit' },
    { value: 'MUNICIPAL_BUILDING', label: 'رخصة البناء / الترميم', category: 'municipal_permit' },
    { value: 'MUNICIPAL_OCCUPANCY', label: 'شهادة إشغال المبنى', category: 'municipal_permit' },
    // السجلات التجارية
    { value: 'COMMERCIAL_REG', label: 'السجل التجاري', category: 'commercial_record' },
    { value: 'TAX_REG', label: 'التسجيل الضريبي', category: 'commercial_record' },
    { value: 'VAT_CERT', label: 'شهادة ضريبة القيمة المضافة', category: 'commercial_record' },
    { value: 'ZAKAT_CERT', label: 'شهادة الزكاة', category: 'commercial_record' },
    { value: 'CHAMBER_MEMBERSHIP', label: 'عضوية الغرفة التجارية', category: 'commercial_record' },
    // شهادات العمل
    { value: 'QIWA_CERT', label: 'شهادة قوى', category: 'employment_cert' },
    { value: 'GOSI_CERT', label: 'شهادة التأمينات الاجتماعية', category: 'employment_cert' },
    { value: 'SAUDIZATION_CERT', label: 'شهادة نسبة السعودة', category: 'employment_cert' },
    { value: 'WORK_PERMIT', label: 'تصاريح العمل', category: 'employment_cert' },
    { value: 'WPS_CERT', label: 'شهادة حماية الأجور', category: 'employment_cert' },
    // تراخيص مهنية
    { value: 'SCFHS_LICENSE', label: 'ترخيص التخصصات الصحية', category: 'professional_license' },
    { value: 'THERAPIST_LICENSE', label: 'ترخيص علاج طبيعي', category: 'professional_license' },
    { value: 'SPEECH_THERAPY_LICENSE', label: 'ترخيص علاج نطق', category: 'professional_license' },
    { value: 'OT_LICENSE', label: 'ترخيص علاج وظيفي', category: 'professional_license' },
    { value: 'PSYCHOLOGIST_LICENSE', label: 'ترخيص أخصائي نفسي', category: 'professional_license' },
    {
      value: 'SOCIAL_WORKER_LICENSE',
      label: 'ترخيص أخصائي اجتماعي',
      category: 'professional_license',
    },
    { value: 'SPECIAL_ED_LICENSE', label: 'ترخيص تربية خاصة', category: 'professional_license' },
    // التأمين
    { value: 'INSURANCE_MEDICAL', label: 'تأمين طبي', category: 'insurance_guarantee' },
    { value: 'INSURANCE_LIABILITY', label: 'تأمين مسؤولية', category: 'insurance_guarantee' },
    { value: 'INSURANCE_PROPERTY', label: 'تأمين ممتلكات', category: 'insurance_guarantee' },
    { value: 'INSURANCE_VEHICLE', label: 'تأمين مركبات نقل', category: 'insurance_guarantee' },
    { value: 'BANK_GUARANTEE', label: 'ضمان بنكي', category: 'insurance_guarantee' },
    // جودة واعتماد
    { value: 'CARF_ACCREDITATION', label: 'اعتماد CARF', category: 'quality_accreditation' },
    { value: 'JCI_ACCREDITATION', label: 'اعتماد JCI', category: 'quality_accreditation' },
    { value: 'CBAHI_ACCREDITATION', label: 'اعتماد CBAHI', category: 'quality_accreditation' },
    { value: 'ISO_CERT', label: 'شهادة الأيزو', category: 'quality_accreditation' },
    { value: 'QUALITY_CERT', label: 'شهادة جودة أخرى', category: 'quality_accreditation' },
    // تقنية
    { value: 'DATA_PRIVACY_CERT', label: 'شهادة حماية البيانات', category: 'tech_permit' },
    { value: 'ELECTRONIC_SYSTEM_CERT', label: 'ترخيص أنظمة إلكترونية', category: 'tech_permit' },
    { value: 'CCTV_PERMIT', label: 'ترخيص كاميرات مراقبة', category: 'tech_permit' },
    // أخرى
    { value: 'CONTRACT_AGREEMENT', label: 'عقود واتفاقيات حكومية', category: 'other' },
    { value: 'DONATION_PERMIT', label: 'تصريح جمع تبرعات', category: 'other' },
    { value: 'ADVERTISING_PERMIT', label: 'تصريح إعلانات', category: 'other' },
    { value: 'EVENT_PERMIT', label: 'تصريح فعاليات', category: 'other' },
    { value: 'OTHER', label: 'أخرى', category: 'other' },
  ];

  const categories = [
    { value: 'government_license', label: 'تراخيص حكومية', icon: '🏛️' },
    { value: 'municipal_permit', label: 'رخص بلدية', icon: '🏢' },
    { value: 'commercial_record', label: 'سجلات تجارية', icon: '📋' },
    { value: 'employment_cert', label: 'شهادات عمل وتوظيف', icon: '👥' },
    { value: 'professional_license', label: 'تراخيص مهنية', icon: '🎓' },
    { value: 'insurance_guarantee', label: 'تأمين وضمانات', icon: '🛡️' },
    { value: 'quality_accreditation', label: 'جودة واعتماد', icon: '⭐' },
    { value: 'tech_permit', label: 'تراخيص تقنية', icon: '💻' },
    { value: 'other', label: 'أخرى', icon: '📎' },
  ];

  res.json({
    success: true,
    data: { types, categories },
  });
});

// ==================== المهام والتذكيرات ====================

/** إضافة مهمة */
exports.addTask = asyncHandler(async (req, res) => {
  if (!req.body.title) throw new AppError('عنوان المهمة مطلوب', 400);
  const task = await service.addTask(req.params.id, req.body, req.user?.id);
  res.status(201).json({ success: true, message: 'تم إضافة المهمة', data: task });
});

/** تحديث مهمة */
exports.updateTask = asyncHandler(async (req, res) => {
  const task = await service.updateTask(req.params.id, req.params.taskId, req.body, req.user?.id);
  res.json({ success: true, message: 'تم تحديث المهمة', data: task });
});

/** حذف مهمة */
exports.removeTask = asyncHandler(async (req, res) => {
  const result = await service.removeTask(req.params.id, req.params.taskId, req.user?.id);
  res.json({ success: true, message: result.message });
});

/** المهام المتأخرة */
exports.getOverdueTasks = asyncHandler(async (req, res) => {
  const tasks = await service.getOverdueTasks();
  res.json({ success: true, data: tasks, count: tasks.length });
});

/** إحصائيات المهام */
exports.getTaskStatistics = asyncHandler(async (req, res) => {
  const stats = await service.getTaskStatistics();
  res.json({ success: true, data: stats });
});

// ==================== سجل المراسلات ====================

/** إضافة مراسلة */
exports.addCommunication = asyncHandler(async (req, res) => {
  if (!req.body.subject) throw new AppError('موضوع المراسلة مطلوب', 400);
  const comm = await service.addCommunication(req.params.id, req.body, req.user?.id);
  res.status(201).json({ success: true, message: 'تم إضافة المراسلة', data: comm });
});

/** تحديث مراسلة */
exports.updateCommunication = asyncHandler(async (req, res) => {
  const comm = await service.updateCommunication(
    req.params.id,
    req.params.commId,
    req.body,
    req.user?.id
  );
  res.json({ success: true, message: 'تم تحديث المراسلة', data: comm });
});

/** المراسلات المعلقة */
exports.getPendingCommunications = asyncHandler(async (req, res) => {
  const comms = await service.getPendingCommunications();
  res.json({ success: true, data: comms, count: comms.length });
});

// ==================== نسخ الترخيص ====================

/** استنساخ ترخيص */
exports.cloneLicense = asyncHandler(async (req, res) => {
  const license = await service.cloneLicense(req.params.id, req.body, req.user?.id);
  res.status(201).json({ success: true, message: 'تم استنساخ الترخيص بنجاح', data: license });
});

// ==================== حاسبة الرسوم ====================

/** حساب رسوم ترخيص */
exports.calculateFees = asyncHandler(async (req, res) => {
  const fees = await service.calculateFees(req.params.id);
  res.json({ success: true, data: fees });
});

/** حساب الرسوم الإجمالية */
exports.calculateTotalFees = asyncHandler(async (req, res) => {
  const fees = await service.calculateTotalFees(req.query);
  res.json({ success: true, data: fees });
});

// ==================== تقويم المواعيد ====================

/** إضافة حدث */
exports.addCalendarEvent = asyncHandler(async (req, res) => {
  if (!req.body.title || !req.body.startDate)
    throw new AppError('عنوان الحدث وتاريخه مطلوبان', 400);
  const event = await service.addCalendarEvent(req.params.id, req.body, req.user?.id);
  res.status(201).json({ success: true, message: 'تم إضافة الحدث', data: event });
});

/** تحديث حدث */
exports.updateCalendarEvent = asyncHandler(async (req, res) => {
  const event = await service.updateCalendarEvent(
    req.params.id,
    req.params.eventId,
    req.body,
    req.user?.id
  );
  res.json({ success: true, message: 'تم تحديث الحدث', data: event });
});

/** حذف حدث */
exports.removeCalendarEvent = asyncHandler(async (req, res) => {
  const result = await service.removeCalendarEvent(req.params.id, req.params.eventId, req.user?.id);
  res.json({ success: true, message: result.message });
});

/** الأحداث القادمة */
exports.getUpcomingEvents = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const events = await service.getUpcomingEvents(days);
  res.json({ success: true, data: events, count: events.length });
});

// ==================== جهات الاتصال ====================

/** إضافة جهة اتصال */
exports.addAuthorityContact = asyncHandler(async (req, res) => {
  if (!req.body.authorityName) throw new AppError('اسم الجهة مطلوب', 400);
  const contact = await service.addAuthorityContact(req.params.id, req.body, req.user?.id);
  res.status(201).json({ success: true, message: 'تم إضافة جهة الاتصال', data: contact });
});

/** تحديث جهة اتصال */
exports.updateAuthorityContact = asyncHandler(async (req, res) => {
  const contact = await service.updateAuthorityContact(
    req.params.id,
    req.params.contactId,
    req.body,
    req.user?.id
  );
  res.json({ success: true, message: 'تم تحديث جهة الاتصال', data: contact });
});

/** حذف جهة اتصال */
exports.removeAuthorityContact = asyncHandler(async (req, res) => {
  const result = await service.removeAuthorityContact(
    req.params.id,
    req.params.contactId,
    req.user?.id
  );
  res.json({ success: true, message: result.message });
});

// ==================== قائمة الوثائق المطلوبة ====================

/** إضافة وثيقة */
exports.addDocumentChecklistItem = asyncHandler(async (req, res) => {
  if (!req.body.documentName) throw new AppError('اسم الوثيقة مطلوب', 400);
  const doc = await service.addDocumentChecklistItem(req.params.id, req.body, req.user?.id);
  res.status(201).json({ success: true, message: 'تم إضافة الوثيقة', data: doc });
});

/** تحديث حالة وثيقة */
exports.updateDocumentChecklistItem = asyncHandler(async (req, res) => {
  const doc = await service.updateDocumentChecklistItem(
    req.params.id,
    req.params.docId,
    req.body,
    req.user?.id
  );
  res.json({ success: true, message: 'تم تحديث الوثيقة', data: doc });
});

/** حالة قائمة الوثائق */
exports.getDocumentChecklistStatus = asyncHandler(async (req, res) => {
  const status = await service.getDocumentChecklistStatus(req.params.id);
  res.json({ success: true, data: status });
});

/** إحصائيات الوثائق */
exports.getDocumentStatistics = asyncHandler(async (req, res) => {
  const stats = await service.getDocumentStatistics();
  res.json({ success: true, data: stats });
});

// ==================== التعليقات ====================

/** إضافة تعليق */
exports.addComment = asyncHandler(async (req, res) => {
  if (!req.body.content) throw new AppError('محتوى التعليق مطلوب', 400);
  const comment = await service.addComment(req.params.id, req.body, req.user?.id);
  res.status(201).json({ success: true, message: 'تم إضافة التعليق', data: comment });
});

/** تحديث تعليق */
exports.updateComment = asyncHandler(async (req, res) => {
  const comment = await service.updateComment(
    req.params.id,
    req.params.commentId,
    req.body,
    req.user?.id
  );
  res.json({ success: true, message: 'تم تحديث التعليق', data: comment });
});

/** حذف تعليق */
exports.deleteComment = asyncHandler(async (req, res) => {
  const result = await service.deleteComment(req.params.id, req.params.commentId, req.user?.id);
  res.json({ success: true, message: result.message });
});

/** تثبيت تعليق */
exports.togglePinComment = asyncHandler(async (req, res) => {
  const result = await service.togglePinComment(req.params.id, req.params.commentId, req.user?.id);
  res.json({ success: true, message: result.message, data: { isPinned: result.isPinned } });
});

// ==================== تتبع الميزانية ====================

/** تحديث بيانات الميزانية */
exports.updateBudget = asyncHandler(async (req, res) => {
  const budget = await service.updateBudget(req.params.id, req.body, req.user?.id);
  res.json({ success: true, message: 'تم تحديث الميزانية', data: budget });
});

/** إضافة مصروف */
exports.addExpense = asyncHandler(async (req, res) => {
  if (!req.body.description || !req.body.amount)
    throw new AppError('وصف المصروف والمبلغ مطلوبان', 400);
  const expense = await service.addExpense(req.params.id, req.body, req.user?.id);
  res.status(201).json({ success: true, message: 'تم تسجيل المصروف', data: expense });
});

/** إحصائيات الميزانية */
exports.getBudgetStatistics = asyncHandler(async (req, res) => {
  const year = req.query.year ? parseInt(req.query.year) : undefined;
  const stats = await service.getBudgetStatistics(year);
  res.json({ success: true, data: stats });
});

// ==================== مؤشر صحة الترخيص ====================

/** حساب صحة ترخيص */
exports.calculateHealth = asyncHandler(async (req, res) => {
  const health = await service.calculateHealth(req.params.id);
  res.json({ success: true, data: health });
});

/** حساب صحة جميع التراخيص */
exports.calculateAllHealth = asyncHandler(async (req, res) => {
  const result = await service.calculateAllHealth();
  res.json({ success: true, message: `تم تحديث ${result.updated} ترخيص`, data: result });
});

/** التراخيص ذات الصحة المنخفضة */
exports.getLowHealthLicenses = asyncHandler(async (req, res) => {
  const maxScore = parseInt(req.query.maxScore) || 50;
  const licenses = await service.getLowHealthLicenses(maxScore);
  res.json({ success: true, data: licenses, count: licenses.length });
});

// ==================== الاستيراد المجمع ====================

/** استيراد مجمع */
exports.bulkImport = asyncHandler(async (req, res) => {
  const { licenses } = req.body;
  if (!Array.isArray(licenses) || licenses.length === 0) {
    throw new AppError('يجب توفير قائمة تراخيص للاستيراد', 400);
  }
  const result = await service.bulkImport(licenses, req.user?.id);
  res.json({
    success: true,
    message: `تم استيراد ${result.succeeded} من ${result.total}`,
    data: result,
  });
});

// ==================== مؤشرات الأداء KPI ====================

/** حساب KPI لترخيص */
exports.calculateKPIs = asyncHandler(async (req, res) => {
  const kpi = await service.calculateKPIs(req.params.id);
  res.json({ success: true, data: kpi });
});

/** لوحة مؤشرات الأداء */
exports.getKPIDashboard = asyncHandler(async (req, res) => {
  const dashboard = await service.getKPIDashboard();
  res.json({ success: true, data: dashboard });
});

// ==================== Round 4: نظام القوالب ====================

/** حفظ ترخيص كقالب */
exports.saveAsTemplate = asyncHandler(async (req, res) => {
  const result = await service.saveAsTemplate(req.params.id, req.body, req.user?.id);
  res.json({ success: true, message: 'تم حفظ القالب بنجاح', data: result });
});

/** قائمة القوالب */
exports.getTemplates = asyncHandler(async (req, res) => {
  const templates = await service.getTemplates(req.query.category);
  res.json({ success: true, data: templates, count: templates.length });
});

/** إنشاء من قالب */
exports.createFromTemplate = asyncHandler(async (req, res) => {
  const { overrides } = req.body;
  const license = await service.createFromTemplate(req.params.id, overrides || {}, req.user?.id);
  res.status(201).json({ success: true, message: 'تم إنشاء ترخيص من القالب', data: license });
});

/** إلغاء قالب */
exports.removeTemplate = asyncHandler(async (req, res) => {
  const result = await service.removeTemplate(req.params.id, req.user?.id);
  res.json({ success: true, data: result });
});

// ==================== Round 4: المفضلة والمتابعة ====================

/** تبديل المفضلة */
exports.toggleFavorite = asyncHandler(async (req, res) => {
  const result = await service.toggleFavorite(req.params.id, req.user?.id);
  res.json({ success: true, data: result });
});

/** مفضلات المستخدم */
exports.getUserFavorites = asyncHandler(async (req, res) => {
  const favorites = await service.getUserFavorites(req.user?.id);
  res.json({ success: true, data: favorites, count: favorites.length });
});

/** تبديل المتابعة */
exports.toggleWatch = asyncHandler(async (req, res) => {
  const result = await service.toggleWatch(req.params.id, req.user?.id, req.body.watchType);
  res.json({ success: true, data: result });
});

/** قائمة المتابعة */
exports.getUserWatchlist = asyncHandler(async (req, res) => {
  const watchlist = await service.getUserWatchlist(req.user?.id);
  res.json({ success: true, data: watchlist, count: watchlist.length });
});

// ==================== Round 4: مقارنة التراخيص ====================

/** مقارنة تراخيص */
exports.compareLicenses = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) throw new AppError('يجب تحديد معرفات التراخيص', 400);
  const comparison = await service.compareLicenses(ids);
  res.json({ success: true, data: comparison });
});

// ==================== Round 4: SLA ====================

/** تحديث إعدادات SLA */
exports.updateSLASettings = asyncHandler(async (req, res) => {
  const sla = await service.updateSLASettings(req.params.id, req.body, req.user?.id);
  res.json({ success: true, data: sla });
});

/** إضافة قاعدة تصعيد */
exports.addEscalationRule = asyncHandler(async (req, res) => {
  const rule = await service.addEscalationRule(req.params.id, req.body, req.user?.id);
  res.json({ success: true, data: rule });
});

/** حذف قاعدة تصعيد */
exports.removeEscalationRule = asyncHandler(async (req, res) => {
  const result = await service.removeEscalationRule(req.params.id, req.params.ruleId, req.user?.id);
  res.json({ success: true, data: result });
});

/** تقييم SLA */
exports.evaluateSLA = asyncHandler(async (req, res) => {
  const sla = await service.evaluateSLA(req.params.id);
  res.json({ success: true, data: sla });
});

/** تقييم SLA لجميع التراخيص */
exports.evaluateAllSLA = asyncHandler(async (_req, res) => {
  const result = await service.evaluateAllSLA();
  res.json({ success: true, message: `تم تقييم ${result.updated} ترخيص`, data: result });
});

/** إحصائيات SLA */
exports.getSLAStatistics = asyncHandler(async (_req, res) => {
  const stats = await service.getSLAStatistics();
  res.json({ success: true, data: stats });
});

/** التراخيص المخالفة لـ SLA */
exports.getSLABreachedLicenses = asyncHandler(async (_req, res) => {
  const licenses = await service.getSLABreachedLicenses();
  res.json({ success: true, data: licenses, count: licenses.length });
});

// ==================== Round 4: نظام التذاكر ====================

/** إنشاء تذكرة */
exports.createTicket = asyncHandler(async (req, res) => {
  const ticket = await service.createTicket(req.params.id, req.body, req.user?.id);
  res.status(201).json({ success: true, message: 'تم إنشاء التذكرة', data: ticket });
});

/** تحديث تذكرة */
exports.updateTicket = asyncHandler(async (req, res) => {
  const ticket = await service.updateTicket(
    req.params.id,
    req.params.ticketId,
    req.body,
    req.user?.id
  );
  res.json({ success: true, data: ticket });
});

/** إضافة رد على تذكرة */
exports.addTicketResponse = asyncHandler(async (req, res) => {
  const response = await service.addTicketResponse(
    req.params.id,
    req.params.ticketId,
    req.body,
    req.user?.id
  );
  res.json({ success: true, data: response });
});

/** إحصائيات التذاكر */
exports.getTicketStatistics = asyncHandler(async (_req, res) => {
  const stats = await service.getTicketStatistics();
  res.json({ success: true, data: stats });
});

/** التذاكر المفتوحة */
exports.getOpenTickets = asyncHandler(async (_req, res) => {
  const tickets = await service.getOpenTickets();
  res.json({ success: true, data: tickets });
});

// ==================== Round 4: الإجراءات التلقائية ====================

/** إضافة قاعدة أتمتة */
exports.addAutomationRule = asyncHandler(async (req, res) => {
  const rule = await service.addAutomationRule(req.params.id, req.body, req.user?.id);
  res.json({ success: true, data: rule });
});

/** تحديث قاعدة أتمتة */
exports.updateAutomationRule = asyncHandler(async (req, res) => {
  const rule = await service.updateAutomationRule(
    req.params.id,
    req.params.ruleId,
    req.body,
    req.user?.id
  );
  res.json({ success: true, data: rule });
});

/** حذف قاعدة أتمتة */
exports.removeAutomationRule = asyncHandler(async (req, res) => {
  const result = await service.removeAutomationRule(req.params.id, req.params.ruleId, req.user?.id);
  res.json({ success: true, data: result });
});

// ==================== Round 4: التقارير التنفيذية ====================

/** التقرير التنفيذي لترخيص */
exports.generateExecutiveSummary = asyncHandler(async (req, res) => {
  const summary = await service.generateExecutiveSummary(req.params.id);
  res.json({ success: true, data: summary });
});

/** التقرير التنفيذي الشامل */
exports.getExecutiveReport = asyncHandler(async (_req, res) => {
  const report = await service.getExecutiveReport();
  res.json({ success: true, data: report });
});

/** توليد التقارير التنفيذية لجميع التراخيص */
exports.generateAllExecutiveSummaries = asyncHandler(async (_req, res) => {
  const result = await service.generateAllExecutiveSummaries();
  res.json({ success: true, message: `تم توليد ${result.updated} تقرير`, data: result });
});

// ==================== Round 4: التحليلات التنبؤية ====================

/** التحليلات التنبؤية لترخيص */
exports.calculatePredictions = asyncHandler(async (req, res) => {
  const predictions = await service.calculatePredictions(req.params.id);
  res.json({ success: true, data: predictions });
});

/** التحليلات التنبؤية الشاملة */
exports.getPredictiveAnalytics = asyncHandler(async (_req, res) => {
  const analytics = await service.getPredictiveAnalytics();
  res.json({ success: true, data: analytics });
});

// ==================== Round 4: سجل التغييرات ====================

/** سجل التغييرات لترخيص */
exports.getChangeLog = asyncHandler(async (req, res) => {
  const { fieldName, changeType, fromDate, toDate, page, limit } = req.query;
  const result = await service.getChangeLog(req.params.id, {
    fieldName,
    changeType,
    fromDate,
    toDate,
    page,
    limit,
  });
  res.json({ success: true, data: result });
});

/** إضافة سجل تغيير يدوي */
exports.addChangeLogEntry = asyncHandler(async (req, res) => {
  const entry = await service.addChangeLogEntry(req.params.id, req.body, req.user?.id);
  res.json({ success: true, data: entry });
});

// ==================== Round 4: إصدارات الوثائق ====================

/** إضافة وثيقة مع إصدار */
exports.addDocumentVersion = asyncHandler(async (req, res) => {
  const doc = await service.addDocumentVersion(req.params.id, req.body, req.user?.id);
  res.status(201).json({ success: true, data: doc });
});

/** إضافة إصدار جديد */
exports.addNewVersion = asyncHandler(async (req, res) => {
  const doc = await service.addNewVersion(req.params.id, req.params.docId, req.body, req.user?.id);
  res.json({ success: true, data: doc });
});

/** تاريخ إصدارات وثيقة */
exports.getDocumentVersionHistory = asyncHandler(async (req, res) => {
  const doc = await service.getDocumentVersionHistory(req.params.id, req.params.docId);
  res.json({ success: true, data: doc });
});

/** الوثائق القريبة من الانتهاء */
exports.getExpiringDocuments = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const docs = await service.getExpiringDocuments(days);
  res.json({ success: true, data: docs });
});

/** حذف وثيقة */
exports.removeDocumentVersion = asyncHandler(async (req, res) => {
  const result = await service.removeDocumentVersion(req.params.id, req.params.docId, req.user?.id);
  res.json({ success: true, data: result });
});

// ====================================================================
//  Round 5 — Feature 1: الإشعارات المتقدمة
// ====================================================================

exports.addScheduledNotification = asyncHandler(async (req, res) => {
  const data = await service.addScheduledNotification(req.params.id, req.body, req.user?.id);
  res.status(201).json({ success: true, data });
});

exports.getScheduledNotifications = asyncHandler(async (req, res) => {
  const data = await service.getScheduledNotifications(req.params.id);
  res.json({ success: true, data });
});

exports.updateNotificationStatus = asyncHandler(async (req, res) => {
  const data = await service.updateNotificationStatus(
    req.params.id,
    req.params.notifId,
    req.body.status,
    req.user?.id
  );
  res.json({ success: true, data });
});

exports.removeScheduledNotification = asyncHandler(async (req, res) => {
  const data = await service.removeScheduledNotification(
    req.params.id,
    req.params.notifId,
    req.user?.id
  );
  res.json({ success: true, data });
});

exports.sendBulkNotifications = asyncHandler(async (req, res) => {
  const data = await service.sendBulkNotifications(req.query, req.body, req.user?.id);
  res.json({ success: true, data });
});

// ====================================================================
//  Round 5 — Feature 2: تقييم رضا المتعاملين
// ====================================================================

exports.addSatisfactionSurvey = asyncHandler(async (req, res) => {
  const data = await service.addSatisfactionSurvey(req.params.id, req.body, req.user?.id);
  res.status(201).json({ success: true, data });
});

exports.getSatisfactionSurveys = asyncHandler(async (req, res) => {
  const data = await service.getSatisfactionSurveys(req.params.id);
  res.json({ success: true, data });
});

exports.analyzeSatisfaction = asyncHandler(async (req, res) => {
  const data = await service.analyzeSatisfaction(req.params.id);
  res.json({ success: true, data });
});

exports.getGlobalSatisfactionAnalytics = asyncHandler(async (_req, res) => {
  const data = await service.getGlobalSatisfactionAnalytics();
  res.json({ success: true, data });
});

// ====================================================================
//  Round 5 — Feature 3: التوقيعات الرقمية
// ====================================================================

exports.addDigitalSignature = asyncHandler(async (req, res) => {
  const data = await service.addDigitalSignature(req.params.id, req.body, req.user?.id);
  res.status(201).json({ success: true, data });
});

exports.getDigitalSignatures = asyncHandler(async (req, res) => {
  const data = await service.getDigitalSignatures(req.params.id);
  res.json({ success: true, data });
});

exports.verifyDigitalSignature = asyncHandler(async (req, res) => {
  const data = await service.verifyDigitalSignature(req.params.id, req.params.sigId, req.user?.id);
  res.json({ success: true, data });
});

exports.getSignatureChain = asyncHandler(async (req, res) => {
  const data = await service.getSignatureChain(req.params.id);
  res.json({ success: true, data });
});

// ====================================================================
//  Round 5 — Feature 4: الاجتماعات والمراجعات
// ====================================================================

exports.addMeeting = asyncHandler(async (req, res) => {
  const data = await service.addMeeting(req.params.id, req.body, req.user?.id);
  res.status(201).json({ success: true, data });
});

exports.getMeetings = asyncHandler(async (req, res) => {
  const data = await service.getMeetings(req.params.id);
  res.json({ success: true, data });
});

exports.updateMeeting = asyncHandler(async (req, res) => {
  const data = await service.updateMeeting(
    req.params.id,
    req.params.meetingId,
    req.body,
    req.user?.id
  );
  res.json({ success: true, data });
});

exports.updateMeetingDecision = asyncHandler(async (req, res) => {
  const data = await service.updateMeetingDecision(
    req.params.id,
    req.params.meetingId,
    parseInt(req.params.decisionIndex),
    req.body,
    req.user?.id
  );
  res.json({ success: true, data });
});

exports.getGlobalMeetingsCalendar = asyncHandler(async (req, res) => {
  const data = await service.getGlobalMeetingsCalendar(req.query);
  res.json({ success: true, data });
});

// ====================================================================
//  Round 5 — Feature 5: الربط الخارجي
// ====================================================================

exports.addExternalIntegration = asyncHandler(async (req, res) => {
  const data = await service.addExternalIntegration(req.params.id, req.body, req.user?.id);
  res.status(201).json({ success: true, data });
});

exports.getExternalIntegrations = asyncHandler(async (req, res) => {
  const data = await service.getExternalIntegrations(req.params.id);
  res.json({ success: true, data });
});

exports.updateIntegrationSync = asyncHandler(async (req, res) => {
  const data = await service.updateIntegrationSync(
    req.params.id,
    req.params.integId,
    req.body,
    req.user?.id
  );
  res.json({ success: true, data });
});

exports.removeExternalIntegration = asyncHandler(async (req, res) => {
  const data = await service.removeExternalIntegration(
    req.params.id,
    req.params.integId,
    req.user?.id
  );
  res.json({ success: true, data });
});

// ====================================================================
//  Round 5 — Feature 6: التدريب والتأهيل
// ====================================================================

exports.addTrainingRecord = asyncHandler(async (req, res) => {
  const data = await service.addTrainingRecord(req.params.id, req.body, req.user?.id);
  res.status(201).json({ success: true, data });
});

exports.getTrainingRecords = asyncHandler(async (req, res) => {
  const data = await service.getTrainingRecords(req.params.id);
  res.json({ success: true, data });
});

exports.updateTrainingRecord = asyncHandler(async (req, res) => {
  const data = await service.updateTrainingRecord(
    req.params.id,
    req.params.recordId,
    req.body,
    req.user?.id
  );
  res.json({ success: true, data });
});

exports.analyzeTrainingGaps = asyncHandler(async (req, res) => {
  const data = await service.analyzeTrainingGaps(req.params.id);
  res.json({ success: true, data });
});

exports.getGlobalTrainingStatus = asyncHandler(async (_req, res) => {
  const data = await service.getGlobalTrainingStatus();
  res.json({ success: true, data });
});

// ====================================================================
//  Round 5 — Feature 7: ويدجت لوحة المعلومات
// ====================================================================

exports.updateDashboardWidgets = asyncHandler(async (req, res) => {
  const data = await service.updateDashboardWidgets(req.params.id, req.body, req.user?.id);
  res.json({ success: true, data });
});

exports.getDashboardWidgets = asyncHandler(async (req, res) => {
  const data = await service.getDashboardWidgets(req.params.id);
  res.json({ success: true, data });
});

// ====================================================================
//  Round 5 — Feature 8: الإصلاح التلقائي
// ====================================================================

exports.addRemediationAction = asyncHandler(async (req, res) => {
  const data = await service.addRemediationAction(req.params.id, req.body, req.user?.id);
  res.status(201).json({ success: true, data });
});

exports.getRemediationActions = asyncHandler(async (req, res) => {
  const data = await service.getRemediationActions(req.params.id);
  res.json({ success: true, data });
});

exports.executeRemediation = asyncHandler(async (req, res) => {
  const data = await service.executeRemediation(
    req.params.id,
    req.params.actionId,
    req.body.result,
    req.user?.id
  );
  res.json({ success: true, data });
});

exports.runAutoRemediation = asyncHandler(async (req, res) => {
  const data = await service.runAutoRemediation(req.user?.id);
  res.json({ success: true, data });
});

// ====================================================================
//  Round 5 — Feature 9: الموردين والمقاولين
// ====================================================================

exports.addVendor = asyncHandler(async (req, res) => {
  const data = await service.addVendor(req.params.id, req.body, req.user?.id);
  res.status(201).json({ success: true, data });
});

exports.getVendors = asyncHandler(async (req, res) => {
  const data = await service.getVendors(req.params.id);
  res.json({ success: true, data });
});

exports.updateVendor = asyncHandler(async (req, res) => {
  const data = await service.updateVendor(
    req.params.id,
    req.params.vendorId,
    req.body,
    req.user?.id
  );
  res.json({ success: true, data });
});

exports.removeVendor = asyncHandler(async (req, res) => {
  const data = await service.removeVendor(req.params.id, req.params.vendorId, req.user?.id);
  res.json({ success: true, data });
});

exports.getGlobalVendorRatings = asyncHandler(async (_req, res) => {
  const data = await service.getGlobalVendorRatings();
  res.json({ success: true, data });
});

// ====================================================================
//  Round 5 — Feature 10: الشكاوى والمقترحات
// ====================================================================

exports.addComplaint = asyncHandler(async (req, res) => {
  const data = await service.addComplaint(req.params.id, req.body, req.user?.id);
  res.status(201).json({ success: true, data });
});

exports.getComplaints = asyncHandler(async (req, res) => {
  const data = await service.getComplaints(req.params.id);
  res.json({ success: true, data });
});

exports.updateComplaint = asyncHandler(async (req, res) => {
  const data = await service.updateComplaint(
    req.params.id,
    req.params.complaintId,
    req.body,
    req.user?.id
  );
  res.json({ success: true, data });
});

exports.addComplaintResponse = asyncHandler(async (req, res) => {
  const data = await service.addComplaintResponse(
    req.params.id,
    req.params.complaintId,
    req.body,
    req.user?.id
  );
  res.json({ success: true, data });
});

exports.getGlobalComplaintAnalytics = asyncHandler(async (_req, res) => {
  const data = await service.getGlobalComplaintAnalytics();
  res.json({ success: true, data });
});
