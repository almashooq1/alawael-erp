/**
 * Disability Rehabilitation Routes
 * مسارات API لنظام تأهيل ذوي الإعاقة
 *
 * @module routes/disability-rehabilitation
 * @description API Endpoints لإدارة برامج التأهيل
 * @version 1.0.0
 * @date 2026-01-19
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/disability-rehabilitation.controller');

// Middleware (basic auth only for tests)
const { authenticateToken } = require('../middleware/auth');

// ============================================
// برامج التأهيل - Programs
// ============================================

/**
 * @route   POST /api/v1/disability-rehabilitation/programs
 * @desc    إنشاء برنامج تأهيل جديد
 * @access  Private (Admins, Therapists)
 */
router.post('/programs', authenticateToken, controller.createProgram);

/**
 * @route   GET /api/v1/disability-rehabilitation/programs
 * @desc    الحصول على جميع البرامج مع الفلترة
 * @access  Private
 * @query   disability_type, status, beneficiary_id, severity, date_from, date_to, search, page, limit, sort
 */
router.get('/programs', authenticateToken, controller.getAllPrograms);

/**
 * @route   GET /api/v1/disability-rehabilitation/programs/:id
 * @desc    الحصول على برنامج محدد
 * @access  Private
 */
router.get('/programs/:id', authenticateToken, controller.getProgramById);

/**
 * @route   PUT /api/v1/disability-rehabilitation/programs/:id
 * @desc    تحديث برنامج التأهيل
 * @access  Private (Admins, Therapists, Case Managers)
 */
router.put('/programs/:id', authenticateToken, controller.updateProgram);

/**
 * @route   DELETE /api/v1/disability-rehabilitation/programs/:id
 * @desc    حذف برنامج (soft delete)
 * @access  Private (Admins only)
 */
router.delete('/programs/:id', authenticateToken, controller.deleteProgram);

// ============================================
// الجلسات - Sessions
// ============================================

/**
 * @route   POST /api/v1/disability-rehabilitation/programs/:id/sessions
 * @desc    إضافة جلسة جديدة
 * @access  Private (Therapists, Case Managers)
 */
router.post('/programs/:id/sessions', authenticateToken, controller.addSession);

// ============================================
// الأهداف - Goals
// ============================================

/**
 * @route   PUT /api/v1/disability-rehabilitation/programs/:id/goals/:goalId
 * @desc    تحديث حالة هدف
 * @access  Private (Therapists, Case Managers)
 */
router.put('/programs/:id/goals/:goalId', authenticateToken, controller.updateGoalStatus);

// ============================================
// التقييمات - Assessments
// ============================================

/**
 * @route   POST /api/v1/disability-rehabilitation/programs/:id/assessments
 * @desc    إضافة تقييم
 * @access  Private (Therapists, Assessors)
 */
router.post('/programs/:id/assessments', authenticateToken, controller.addAssessment);

// ============================================
// إدارة البرنامج - Program Management
// ============================================

/**
 * @route   PUT /api/v1/disability-rehabilitation/programs/:id/complete
 * @desc    إنهاء البرنامج
 * @access  Private (Admins, Case Managers)
 */
router.put('/programs/:id/complete', authenticateToken, controller.completeProgram);

/**
 * @route   PUT /api/v1/disability-rehabilitation/programs/:id/suspend
 * @desc    تعليق برنامج تأهيل
 * @access  Private (Admins, Case Managers)
 */
router.put('/programs/:id/suspend', authenticateToken, controller.suspendProgram);

/**
 * @route   PUT /api/v1/disability-rehabilitation/programs/:id/resume
 * @desc    استئناف برنامج معلق
 * @access  Private (Admins, Case Managers)
 */
router.put('/programs/:id/resume', authenticateToken, controller.resumeProgram);

/**
 * @route   POST /api/v1/disability-rehabilitation/programs/:id/transfer
 * @desc    تحويل المستفيد إلى برنامج آخر
 * @access  Private (Admins, Case Managers)
 */
router.post('/programs/:id/transfer', authenticateToken, controller.transferProgram);

// ============================================
// تقييمات المخاطر وجودة الحياة - Risk & QoL
// ============================================

/**
 * @route   PUT /api/v1/disability-rehabilitation/programs/:id/risk-assessment
 * @desc    تحديث تقييم المخاطر
 * @access  Private (Therapists, Case Managers)
 */
router.put('/programs/:id/risk-assessment', authenticateToken, controller.updateRiskAssessment);

/**
 * @route   PUT /api/v1/disability-rehabilitation/programs/:id/quality-of-life
 * @desc    تحديث تقييم جودة الحياة
 * @access  Private (Therapists, Assessors)
 */
router.put('/programs/:id/quality-of-life', authenticateToken, controller.updateQualityOfLife);

// ============================================
// خطة الانتقال والتخريج - Transition & Discharge
// ============================================

/**
 * @route   PUT /api/v1/disability-rehabilitation/programs/:id/transition-plan
 * @desc    تحديث خطة الانتقال
 * @access  Private (Case Managers, Admins)
 */
router.put('/programs/:id/transition-plan', authenticateToken, controller.updateTransitionPlan);

/**
 * @route   PUT /api/v1/disability-rehabilitation/programs/:id/discharge-plan
 * @desc    تحديث خطة التخريج
 * @access  Private (Case Managers, Admins)
 */
router.put('/programs/:id/discharge-plan', authenticateToken, controller.updateDischargePlan);

// ============================================
// الأدوية والقياسات الحيوية - Medications & Vitals
// ============================================

/**
 * @route   POST /api/v1/disability-rehabilitation/programs/:id/medications
 * @desc    إضافة/تحديث الأدوية
 * @access  Private (Medical Staff)
 */
router.post('/programs/:id/medications', authenticateToken, controller.manageMedications);

/**
 * @route   POST /api/v1/disability-rehabilitation/programs/:id/vitals
 * @desc    إضافة قياسات حيوية
 * @access  Private (Medical Staff, Therapists)
 */
router.post('/programs/:id/vitals', authenticateToken, controller.addVitals);

// ============================================
// التواصل والاستبيانات - Communication & Surveys
// ============================================

/**
 * @route   POST /api/v1/disability-rehabilitation/programs/:id/team-communication
 * @desc    إضافة رسالة تواصل فريق
 * @access  Private (All Team Members)
 */
router.post('/programs/:id/team-communication', authenticateToken, controller.addTeamCommunication);

/**
 * @route   POST /api/v1/disability-rehabilitation/programs/:id/satisfaction-survey
 * @desc    إضافة استبيان رضا
 * @access  Private
 */
router.post(
  '/programs/:id/satisfaction-survey',
  authenticateToken,
  controller.addSatisfactionSurvey
);

// ============================================
// البرنامج المنزلي والخطة التعليمية - Home Program & IEP
// ============================================

/**
 * @route   PUT /api/v1/disability-rehabilitation/programs/:id/home-program
 * @desc    تحديث البرنامج المنزلي
 * @access  Private (Therapists, Case Managers)
 */
router.put('/programs/:id/home-program', authenticateToken, controller.updateHomeProgram);

/**
 * @route   PUT /api/v1/disability-rehabilitation/programs/:id/iep
 * @desc    تحديث الخطة التعليمية الفردية
 * @access  Private (Educators, Case Managers)
 */
router.put('/programs/:id/iep', authenticateToken, controller.updateIEP);

// ============================================
// ملخصات وتقارير متقدمة - Advanced Reports
// ============================================

/**
 * @route   GET /api/v1/disability-rehabilitation/programs/:id/progress-summary
 * @desc    ملخص التقدم الشامل
 * @access  Private
 */
router.get('/programs/:id/progress-summary', authenticateToken, controller.getProgressSummary);

/**
 * @route   GET /api/v1/disability-rehabilitation/programs/:id/export
 * @desc    تصدير تقرير البرنامج
 * @access  Private
 * @query   format (json, csv, pdf)
 */
router.get('/programs/:id/export', authenticateToken, controller.exportProgramReport);

// ============================================
// الإحصائيات والتقارير - Statistics & Reports
// ============================================

/**
 * @route   GET /api/v1/disability-rehabilitation/statistics
 * @desc    إحصائيات عامة
 * @access  Private (Admins, Managers)
 * @query   date_from, date_to
 */
router.get('/statistics', authenticateToken, controller.getStatistics);

/**
 * @route   GET /api/v1/disability-rehabilitation/waiting-list
 * @desc    قائمة الانتظار
 * @access  Private (Admins, Managers)
 */
router.get('/waiting-list', authenticateToken, controller.getWaitingList);

/**
 * @route   GET /api/v1/disability-rehabilitation/dashboard
 * @desc    لوحة المعلومات الشاملة
 * @access  Private (Admins, Managers)
 */
router.get('/dashboard', authenticateToken, controller.getDashboard);

/**
 * @route   GET /api/v1/disability-rehabilitation/performance/:year/:month
 * @desc    تقرير الأداء الشهري
 * @access  Private (Admins, Managers)
 */
router.get('/performance/:year/:month', authenticateToken, controller.getMonthlyPerformance);

/**
 * @route   GET /api/v1/disability-rehabilitation/programs/:id/report
 * @desc    تقرير تفصيلي عن برنامج
 * @access  Private
 */
router.get('/programs/:id/report', authenticateToken, controller.getDetailedReport);

// ============================================
// برامج المستفيد - Beneficiary Programs
// ============================================

/**
 * @route   GET /api/v1/disability-rehabilitation/beneficiary/:beneficiaryId/programs
 * @desc    الحصول على برامج المستفيد
 * @access  Private
 */
router.get(
  '/beneficiary/:beneficiaryId/programs',
  authenticateToken,
  controller.getBeneficiaryPrograms
);

// ============================================
// Phase 3 - المسارات المتقدمة الجديدة
// ============================================

/**
 * @route   POST /api/v1/disability-rehabilitation/programs/:id/behavioral-plans
 * @desc    إضافة خطة تدخل سلوكي
 */
router.post('/programs/:id/behavioral-plans', authenticateToken, controller.addBehavioralPlan);

/**
 * @route   PUT /api/v1/disability-rehabilitation/programs/:id/behavioral-plans/:planId
 * @desc    تحديث خطة تدخل سلوكي
 */
router.put(
  '/programs/:id/behavioral-plans/:planId',
  authenticateToken,
  controller.updateBehavioralPlan
);

/**
 * @route   POST /api/v1/disability-rehabilitation/programs/:id/incidents
 * @desc    إضافة تقرير حادثة
 */
router.post('/programs/:id/incidents', authenticateToken, controller.addIncidentReport);

/**
 * @route   PUT /api/v1/disability-rehabilitation/programs/:id/incidents/:incidentId
 * @desc    تحديث تقرير حادثة
 */
router.put(
  '/programs/:id/incidents/:incidentId',
  authenticateToken,
  controller.updateIncidentReport
);

/**
 * @route   POST /api/v1/disability-rehabilitation/programs/:id/appointments
 * @desc    إضافة موعد جديد
 */
router.post('/programs/:id/appointments', authenticateToken, controller.addAppointment);

/**
 * @route   PUT /api/v1/disability-rehabilitation/programs/:id/appointments/:appointmentId
 * @desc    تحديث موعد
 */
router.put(
  '/programs/:id/appointments/:appointmentId',
  authenticateToken,
  controller.updateAppointment
);

/**
 * @route   POST /api/v1/disability-rehabilitation/programs/:id/documents
 * @desc    إضافة مستند
 */
router.post('/programs/:id/documents', authenticateToken, controller.addDocument);

/**
 * @route   DELETE /api/v1/disability-rehabilitation/programs/:id/documents/:documentId
 * @desc    حذف مستند
 */
router.delete('/programs/:id/documents/:documentId', authenticateToken, controller.deleteDocument);

/**
 * @route   POST /api/v1/disability-rehabilitation/programs/:id/group-activities
 * @desc    إضافة نشاط مجموعة
 */
router.post('/programs/:id/group-activities', authenticateToken, controller.addGroupActivity);

/**
 * @route   PUT /api/v1/disability-rehabilitation/programs/:id/emergency-contacts
 * @desc    تحديث جهات اتصال الطوارئ
 */
router.put(
  '/programs/:id/emergency-contacts',
  authenticateToken,
  controller.updateEmergencyContacts
);

/**
 * @route   PUT /api/v1/disability-rehabilitation/programs/:id/cultural-preferences
 * @desc    تحديث التفضيلات الثقافية واللغوية
 */
router.put(
  '/programs/:id/cultural-preferences',
  authenticateToken,
  controller.updateCulturalPreferences
);

/**
 * @route   PUT /api/v1/disability-rehabilitation/programs/:id/attendance-summary
 * @desc    تحديث ملخص الحضور
 */
router.put(
  '/programs/:id/attendance-summary',
  authenticateToken,
  controller.updateAttendanceSummary
);

/**
 * @route   POST /api/v1/disability-rehabilitation/programs/:id/alerts
 * @desc    إضافة تنبيه
 */
router.post('/programs/:id/alerts', authenticateToken, controller.addAlert);

/**
 * @route   PUT /api/v1/disability-rehabilitation/programs/:id/alerts/:alertId/dismiss
 * @desc    تجاهل تنبيه
 */
router.put('/programs/:id/alerts/:alertId/dismiss', authenticateToken, controller.dismissAlert);

/**
 * @route   GET /api/v1/disability-rehabilitation/analytics
 * @desc    تحليلات متقدمة
 */
router.get('/analytics', authenticateToken, controller.getAnalytics);

/**
 * @route   GET /api/v1/disability-rehabilitation/upcoming-appointments
 * @desc    المواعيد القادمة
 */
router.get('/upcoming-appointments', authenticateToken, controller.getUpcomingAppointments);

/**
 * @route   GET /api/v1/disability-rehabilitation/active-alerts
 * @desc    التنبيهات النشطة
 */
router.get('/active-alerts', authenticateToken, controller.getActiveAlerts);

// ============================================
// Phase 4: الرعاية عن بعد، المالية، الملاحظات، الإحالات، النقل
// ============================================

/** @route PUT /:id/telehealth - تحديث بيانات الرعاية عن بعد */
router.put('/:id/telehealth', authenticateToken, controller.updateTelehealth);

/** @route POST /:id/telehealth/connectivity-issue - تسجيل مشكلة اتصال */
router.post(
  '/:id/telehealth/connectivity-issue',
  authenticateToken,
  controller.addConnectivityIssue
);

/** @route PUT /:id/financial - تحديث المعلومات المالية */
router.put('/:id/financial', authenticateToken, controller.updateFinancialInfo);

/** @route POST /:id/invoices - إضافة فاتورة */
router.post('/:id/invoices', authenticateToken, controller.addInvoice);

/** @route PUT /:id/insurance - تحديث معلومات التأمين */
router.put('/:id/insurance', authenticateToken, controller.updateInsuranceInfo);

/** @route POST /:id/notes - إضافة ملاحظة */
router.post('/:id/notes', authenticateToken, controller.addNote);

/** @route PUT /:id/notes/:noteId - تحديث ملاحظة */
router.put('/:id/notes/:noteId', authenticateToken, controller.updateNote);

/** @route DELETE /:id/notes/:noteId - حذف ملاحظة */
router.delete('/:id/notes/:noteId', authenticateToken, controller.deleteNote);

/** @route POST /:id/referrals - إضافة إحالة */
router.post('/:id/referrals', authenticateToken, controller.addReferral);

/** @route PUT /:id/referrals/:referralId - تحديث إحالة */
router.put('/:id/referrals/:referralId', authenticateToken, controller.updateReferral);

/** @route PUT /:id/transportation - تحديث بيانات النقل */
router.put('/:id/transportation', authenticateToken, controller.updateTransportation);

/** @route PUT /:id/treatment-team - تحديث فريق العلاج */
router.put('/:id/treatment-team', authenticateToken, controller.updateTreatmentTeam);

/** @route GET /financial-summary - ملخص مالي شامل */
router.get('/financial-summary', authenticateToken, controller.getFinancialSummary);

// ============================================
// معلومات إضافية - Additional Info
// ============================================

/**
 * @route   GET /api/v1/disability-rehabilitation/info
 * @desc    معلومات عن النظام
 * @access  Public
 */
router.get('/info', (_req, res) => {
  res.json({
    success: true,
    data: {
      system_name: 'نظام تأهيل ذوي الإعاقة',
      system_name_en: 'Disability Rehabilitation System',
      version: '4.0.0',
      description: 'نظام شامل لإدارة برامج تأهيل ذوي الإعاقة مع خصائص متقدمة',
      features: [
        'إدارة برامج التأهيل',
        'تتبع الجلسات والحضور',
        'إدارة الأهداف التأهيلية',
        'التقييمات الدورية',
        'إشراك الأسرة',
        'الأجهزة المساعدة',
        'التقارير والإحصائيات',
        'نظام التدقيق',
        'خطة الانتقال',
        'جلسات العلاج عن بعد',
        'تتبع الأدوية',
        'قائمة الانتظار',
        'تقييم المخاطر',
        'تقييم جودة الحياة',
        'الخطة التعليمية الفردية (IEP)',
        'البرنامج المنزلي',
        'خطة التخريج',
        'القياسات الحيوية',
        'تواصل الفريق المعالج',
        'استبيانات رضا المستفيدين',
        'إدارة النقل والمواصلات',
        'إدارة التأمين والتغطية',
        'تصدير التقارير',
        'لوحة معلومات شاملة',
        'خطط التدخل السلوكي (BIP)',
        'تقارير الحوادث',
        'جدولة المواعيد',
        'إدارة المستندات',
        'جهات اتصال الطوارئ',
        'التفضيلات الثقافية واللغوية',
        'أنشطة المجموعات',
        'تتبع حضور الجلسات',
        'نظام الإنذارات والتنبيهات',
        'التحليلات المتقدمة',
      ],
      disability_types: [
        { value: 'physical', label_ar: 'إعاقة حركية', label_en: 'Physical Disability' },
        { value: 'visual', label_ar: 'إعاقة بصرية', label_en: 'Visual Impairment' },
        { value: 'hearing', label_ar: 'إعاقة سمعية', label_en: 'Hearing Impairment' },
        { value: 'intellectual', label_ar: 'إعاقة ذهنية', label_en: 'Intellectual Disability' },
        { value: 'autism', label_ar: 'اضطراب طيف التوحد', label_en: 'Autism Spectrum Disorder' },
        { value: 'learning', label_ar: 'صعوبات تعلم', label_en: 'Learning Disabilities' },
        { value: 'multiple', label_ar: 'إعاقة متعددة', label_en: 'Multiple Disabilities' },
        { value: 'speech', label_ar: 'إعاقة نطق ولغة', label_en: 'Speech and Language Disorder' },
        { value: 'behavioral', label_ar: 'اضطرابات سلوكية', label_en: 'Behavioral Disorders' },
        { value: 'developmental', label_ar: 'تأخر نمائي', label_en: 'Developmental Delay' },
        { value: 'cerebral_palsy', label_ar: 'شلل دماغي', label_en: 'Cerebral Palsy' },
        { value: 'down_syndrome', label_ar: 'متلازمة داون', label_en: 'Down Syndrome' },
        { value: 'adhd', label_ar: 'اضطراب فرط الحركة وتشتت الانتباه', label_en: 'ADHD' },
        { value: 'epilepsy', label_ar: 'الصرع', label_en: 'Epilepsy' },
        {
          value: 'spinal_cord_injury',
          label_ar: 'إصابة الحبل الشوكي',
          label_en: 'Spinal Cord Injury',
        },
        { value: 'chronic_illness', label_ar: 'أمراض مزمنة', label_en: 'Chronic Illness' },
        { value: 'genetic_disorder', label_ar: 'اضطراب وراثي', label_en: 'Genetic Disorder' },
        {
          value: 'traumatic_brain_injury',
          label_ar: 'إصابة دماغية رضحية',
          label_en: 'Traumatic Brain Injury',
        },
        { value: 'muscular_dystrophy', label_ar: 'ضمور عضلي', label_en: 'Muscular Dystrophy' },
        { value: 'rare_disease', label_ar: 'أمراض نادرة', label_en: 'Rare Disease' },
      ],
      service_types: [
        { value: 'physical_therapy', label_ar: 'علاج طبيعي', label_en: 'Physical Therapy' },
        { value: 'occupational_therapy', label_ar: 'علاج وظيفي', label_en: 'Occupational Therapy' },
        { value: 'speech_therapy', label_ar: 'علاج نطق ولغة', label_en: 'Speech Therapy' },
        { value: 'behavioral_therapy', label_ar: 'علاج سلوكي', label_en: 'Behavioral Therapy' },
        { value: 'special_education', label_ar: 'تربية خاصة', label_en: 'Special Education' },
        { value: 'psychological_support', label_ar: 'دعم نفسي', label_en: 'Psychological Support' },
        { value: 'social_work', label_ar: 'خدمة اجتماعية', label_en: 'Social Work' },
        { value: 'vocational_training', label_ar: 'تدريب مهني', label_en: 'Vocational Training' },
        {
          value: 'assistive_technology',
          label_ar: 'تقنيات مساعدة',
          label_en: 'Assistive Technology',
        },
        { value: 'family_counseling', label_ar: 'إرشاد أسري', label_en: 'Family Counseling' },
        { value: 'hydrotherapy', label_ar: 'علاج مائي', label_en: 'Hydrotherapy' },
        { value: 'music_therapy', label_ar: 'علاج بالموسيقى', label_en: 'Music Therapy' },
        { value: 'art_therapy', label_ar: 'علاج بالفن', label_en: 'Art Therapy' },
        { value: 'hippotherapy', label_ar: 'علاج بركوب الخيل', label_en: 'Hippotherapy' },
        { value: 'sensory_integration', label_ar: 'تكامل حسي', label_en: 'Sensory Integration' },
        { value: 'early_intervention', label_ar: 'تدخل مبكر', label_en: 'Early Intervention' },
        { value: 'group_therapy', label_ar: 'علاج جماعي', label_en: 'Group Therapy' },
        { value: 'telerehabilitation', label_ar: 'تأهيل عن بعد', label_en: 'Telerehabilitation' },
        {
          value: 'recreational_therapy',
          label_ar: 'علاج ترفيهي',
          label_en: 'Recreational Therapy',
        },
        {
          value: 'nutrition_counseling',
          label_ar: 'إرشاد غذائي',
          label_en: 'Nutrition Counseling',
        },
        { value: 'cognitive_therapy', label_ar: 'علاج معرفي', label_en: 'Cognitive Therapy' },
        { value: 'play_therapy', label_ar: 'علاج باللعب', label_en: 'Play Therapy' },
        { value: 'aquatic_therapy', label_ar: 'علاج مائي متخصص', label_en: 'Aquatic Therapy' },
        { value: 'robotic_therapy', label_ar: 'علاج بالروبوت', label_en: 'Robotic Therapy' },
        {
          value: 'virtual_reality_therapy',
          label_ar: 'علاج بالواقع الافتراضي',
          label_en: 'Virtual Reality Therapy',
        },
      ],
      program_types: [
        { value: 'comprehensive', label_ar: 'شامل', label_en: 'Comprehensive' },
        { value: 'intensive', label_ar: 'مكثف', label_en: 'Intensive' },
        { value: 'standard', label_ar: 'عادي', label_en: 'Standard' },
        { value: 'early_intervention', label_ar: 'تدخل مبكر', label_en: 'Early Intervention' },
        { value: 'maintenance', label_ar: 'صيانة/متابعة', label_en: 'Maintenance' },
        { value: 'transition', label_ar: 'انتقالي', label_en: 'Transition' },
        { value: 'community_based', label_ar: 'مجتمعي', label_en: 'Community Based' },
        { value: 'home_based', label_ar: 'منزلي', label_en: 'Home Based' },
        { value: 'day_program', label_ar: 'برنامج نهاري', label_en: 'Day Program' },
        { value: 'residential', label_ar: 'سكني', label_en: 'Residential' },
        { value: 'outpatient', label_ar: 'خارجي', label_en: 'Outpatient' },
        { value: 'telerehab', label_ar: 'تأهيل عن بعد', label_en: 'Telerehabilitation' },
      ],
      goal_categories: [
        { value: 'mobility', label_ar: 'الحركة', label_en: 'Mobility' },
        { value: 'self_care', label_ar: 'العناية الذاتية', label_en: 'Self Care' },
        { value: 'communication', label_ar: 'التواصل', label_en: 'Communication' },
        { value: 'social_skills', label_ar: 'المهارات الاجتماعية', label_en: 'Social Skills' },
        { value: 'academic', label_ar: 'أكاديمي', label_en: 'Academic' },
        { value: 'vocational', label_ar: 'مهني', label_en: 'Vocational' },
        { value: 'behavioral', label_ar: 'سلوكي', label_en: 'Behavioral' },
        { value: 'cognitive', label_ar: 'معرفي', label_en: 'Cognitive' },
        { value: 'sensory', label_ar: 'حسي', label_en: 'Sensory' },
        { value: 'independence', label_ar: 'الاستقلالية', label_en: 'Independence' },
        {
          value: 'emotional_regulation',
          label_ar: 'التنظيم العاطفي',
          label_en: 'Emotional Regulation',
        },
        { value: 'life_skills', label_ar: 'مهارات حياتية', label_en: 'Life Skills' },
        { value: 'daily_living', label_ar: 'الأنشطة اليومية', label_en: 'Daily Living' },
        {
          value: 'community_integration',
          label_ar: 'الدمج المجتمعي',
          label_en: 'Community Integration',
        },
        { value: 'recreation', label_ar: 'الترفيه والتسلية', label_en: 'Recreation' },
        { value: 'health_management', label_ar: 'إدارة الصحة', label_en: 'Health Management' },
        { value: 'safety_awareness', label_ar: 'الوعي بالسلامة', label_en: 'Safety Awareness' },
        { value: 'fine_motor', label_ar: 'المهارات الحركية الدقيقة', label_en: 'Fine Motor' },
        { value: 'gross_motor', label_ar: 'المهارات الحركية الكبرى', label_en: 'Gross Motor' },
        { value: 'feeding_nutrition', label_ar: 'التغذية والأكل', label_en: 'Feeding & Nutrition' },
        { value: 'toileting', label_ar: 'استخدام دورة المياه', label_en: 'Toileting' },
        { value: 'dressing', label_ar: 'ارتداء الملابس', label_en: 'Dressing' },
        {
          value: 'executive_function',
          label_ar: 'الوظائف التنفيذية',
          label_en: 'Executive Function',
        },
        { value: 'technology_use', label_ar: 'استخدام التكنولوجيا', label_en: 'Technology Use' },
      ],
      new_features: [
        { feature: 'transition_plan', label_ar: 'خطة الانتقال', label_en: 'Transition Planning' },
        { feature: 'telehealth', label_ar: 'العلاج عن بعد', label_en: 'Telehealth Sessions' },
        {
          feature: 'medication_tracking',
          label_ar: 'تتبع الأدوية',
          label_en: 'Medication Tracking',
        },
        {
          feature: 'waiting_list',
          label_ar: 'قائمة الانتظار',
          label_en: 'Waiting List Management',
        },
        { feature: 'risk_assessment', label_ar: 'تقييم المخاطر', label_en: 'Risk Assessment' },
        {
          feature: 'quality_of_life',
          label_ar: 'تقييم جودة الحياة',
          label_en: 'Quality of Life Assessment',
        },
        { feature: 'iep_plan', label_ar: 'الخطة التعليمية الفردية', label_en: 'IEP Integration' },
        {
          feature: 'home_program',
          label_ar: 'البرنامج المنزلي',
          label_en: 'Home Exercise Program',
        },
        { feature: 'discharge_plan', label_ar: 'خطة التخريج', label_en: 'Discharge Planning' },
        {
          feature: 'vitals_tracking',
          label_ar: 'القياسات الحيوية',
          label_en: 'Vitals & Measurements',
        },
        { feature: 'team_communication', label_ar: 'تواصل الفريق', label_en: 'Team Communication' },
        {
          feature: 'satisfaction_surveys',
          label_ar: 'استبيانات الرضا',
          label_en: 'Satisfaction Surveys',
        },
        { feature: 'transportation', label_ar: 'النقل والمواصلات', label_en: 'Transportation' },
        {
          feature: 'insurance_info',
          label_ar: 'التأمين والتغطية',
          label_en: 'Insurance & Coverage',
        },
        { feature: 'program_export', label_ar: 'تصدير التقارير', label_en: 'Report Export' },
        {
          feature: 'dashboard',
          label_ar: 'لوحة معلومات شاملة',
          label_en: 'Comprehensive Dashboard',
        },
        {
          feature: 'behavioral_intervention',
          label_ar: 'خطط التدخل السلوكي',
          label_en: 'Behavioral Intervention Plans',
        },
        {
          feature: 'incident_reports',
          label_ar: 'تقارير الحوادث',
          label_en: 'Incident Reports',
        },
        {
          feature: 'appointment_scheduling',
          label_ar: 'جدولة المواعيد',
          label_en: 'Appointment Scheduling',
        },
        {
          feature: 'document_management',
          label_ar: 'إدارة المستندات',
          label_en: 'Document Management',
        },
        {
          feature: 'emergency_contacts',
          label_ar: 'جهات اتصال الطوارئ',
          label_en: 'Emergency Contacts',
        },
        {
          feature: 'cultural_preferences',
          label_ar: 'التفضيلات الثقافية واللغوية',
          label_en: 'Cultural/Language Preferences',
        },
        {
          feature: 'group_activities',
          label_ar: 'أنشطة المجموعات',
          label_en: 'Group Activities',
        },
        {
          feature: 'attendance_tracking',
          label_ar: 'تتبع الحضور المتقدم',
          label_en: 'Advanced Attendance Tracking',
        },
        {
          feature: 'alerts_notifications',
          label_ar: 'الإنذارات والتنبيهات',
          label_en: 'Alerts & Notifications',
        },
        {
          feature: 'advanced_analytics',
          label_ar: 'التحليلات المتقدمة',
          label_en: 'Advanced Analytics',
        },
        // ═══════ Phase 4 Features ═══════
        {
          feature: 'telehealth',
          label_ar: 'الرعاية الصحية عن بعد',
          label_en: 'Telehealth',
        },
        {
          feature: 'financial_info',
          label_ar: 'المعلومات المالية',
          label_en: 'Financial Information',
        },
        {
          feature: 'insurance_info',
          label_ar: 'معلومات التأمين',
          label_en: 'Insurance Information',
        },
        {
          feature: 'notes',
          label_ar: 'الملاحظات',
          label_en: 'Notes',
        },
        {
          feature: 'referrals',
          label_ar: 'الإحالات',
          label_en: 'Referrals',
        },
        {
          feature: 'transportation',
          label_ar: 'النقل والمواصلات',
          label_en: 'Transportation',
        },
        {
          feature: 'treatment_team',
          label_ar: 'فريق العلاج',
          label_en: 'Treatment Team',
        },
        {
          feature: 'financial_summary',
          label_ar: 'الملخص المالي',
          label_en: 'Financial Summary Dashboard',
        },
      ],
    },
  });
});

module.exports = router;
