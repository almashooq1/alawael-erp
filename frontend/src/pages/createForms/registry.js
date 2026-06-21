/**
 * Central registry of schema-driven "create" forms.
 *
 * Each entry powers a generic <EntityFormPage> route (see AuthenticatedShell).
 * Built to replace the "Add / New" buttons that previously navigated to
 * non-existent routes (hard 404s). Each endpoint + field set was derived from
 * the live backend route + Mongoose model. Endpoints are relative to the axios
 * baseURL (/api/v1); a leading slash is normalised below.
 *
 * Modules with no real backend create endpoint are intentionally NOT here
 * (performance, training, warehouse/receive, medical-files/upload,
 * public-relations, ecommerce, sso-admin/config) — they fall through to the
 * NotFound "feature under development" screen.
 */

const RAW = {
  // ── HR / people ──────────────────────────────────────────────────────────
  'leave-management/requests/new': {
    title: 'إضافة طلب إجازة', endpoint: '/leave-requests', method: 'post', backTo: '/leave-management', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'leaveType', label: 'نوع الإجازة', type: 'select', required: true, options: [
        { value: 'annual', label: 'سنوية' }, { value: 'sick', label: 'مرضية' }, { value: 'emergency', label: 'طارئة' },
        { value: 'maternity', label: 'أمومة' }, { value: 'paternity', label: 'أبوة' }, { value: 'study', label: 'دراسية' },
        { value: 'hajj', label: 'حج' }, { value: 'unpaid', label: 'بدون راتب' } ] },
      { name: 'startDate', label: 'تاريخ البداية', type: 'date', required: true },
      { name: 'endDate', label: 'تاريخ النهاية', type: 'date', required: true },
      { name: 'daysCount', label: 'عدد الأيام', type: 'number' },
      { name: 'reason', label: 'السبب', type: 'textarea', required: true },
      { name: 'notes', label: 'ملاحظات', type: 'textarea' } ],
  },
  'payroll/new': {
    title: 'إضافة مسير راتب', endpoint: '/payroll/create', method: 'post', backTo: '/payroll', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'employeeId', label: 'معرف الموظف', type: 'text', required: true },
      { name: 'month', label: 'الشهر (YYYY-MM)', type: 'text', required: true },
      { name: 'year', label: 'السنة', type: 'number', required: true } ],
  },
  'recruitment/jobs/new': {
    title: 'إضافة وظيفة شاغرة', endpoint: '/recruitment/postings', method: 'post', backTo: '/recruitment', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'titleAr', label: 'المسمى الوظيفي (عربي)', type: 'text', required: true },
      { name: 'title', label: 'المسمى الوظيفي (إنجليزي)', type: 'text', required: true },
      { name: 'department', label: 'القسم', type: 'text' },
      { name: 'employmentType', label: 'نوع التوظيف', type: 'select', required: true, options: [
        { value: 'full_time', label: 'دوام كامل' }, { value: 'part_time', label: 'دوام جزئي' }, { value: 'contract', label: 'عقد' }, { value: 'intern', label: 'تدريب' } ] },
      { name: 'workLocation', label: 'موقع العمل', type: 'select', required: true, options: [
        { value: 'on_site', label: 'بالموقع' }, { value: 'remote', label: 'عن بُعد' }, { value: 'hybrid', label: 'هجين' } ] },
      { name: 'experienceLevel', label: 'مستوى الخبرة', type: 'select', required: true, options: [
        { value: 'entry', label: 'مبتدئ' }, { value: 'mid', label: 'متوسط' }, { value: 'senior', label: 'خبير' }, { value: 'manager', label: 'مدير' }, { value: 'executive', label: 'تنفيذي' } ] },
      { name: 'vacancies', label: 'عدد الشواغر', type: 'number' },
      { name: 'applicationDeadline', label: 'آخر موعد للتقديم', type: 'date', required: true } ],
  },
  'employee-affairs/new': {
    title: 'إضافة موظف', endpoint: '/employee-affairs', method: 'post', backTo: '/employee-affairs', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'name_ar', label: 'الاسم (عربي)', type: 'text', required: true },
      { name: 'national_id', label: 'رقم الهوية', type: 'text', required: true },
      { name: 'date_of_birth', label: 'تاريخ الميلاد', type: 'date', required: true },
      { name: 'gender', label: 'الجنس', type: 'select', required: true, options: [ { value: 'male', label: 'ذكر' }, { value: 'female', label: 'أنثى' } ] },
      { name: 'phone', label: 'الهاتف', type: 'text', required: true },
      { name: 'email', label: 'البريد الإلكتروني', type: 'email', required: true },
      { name: 'job_title_ar', label: 'المسمى الوظيفي', type: 'text', required: true },
      { name: 'department', label: 'القسم', type: 'select', required: true, options: [
        { value: 'administration', label: 'الإدارة' }, { value: 'clinical', label: 'السريري' }, { value: 'support', label: 'الدعم' }, { value: 'finance', label: 'المالية' }, { value: 'hr', label: 'الموارد البشرية' }, { value: 'transport', label: 'النقل' }, { value: 'it', label: 'تقنية المعلومات' } ] } ],
  },
  'succession/new': {
    title: 'إضافة خطة تعاقب', endpoint: '/succession-planning', method: 'post', backTo: '/succession', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'positionId', label: 'معرف المنصب', type: 'text', required: true },
      { name: 'positionTitle', label: 'عنوان المنصب', type: 'text', required: true },
      { name: 'department', label: 'القسم', type: 'text', required: true },
      { name: 'riskLevel', label: 'مستوى المخاطرة', type: 'select', options: [ { value: 'critical', label: 'حرجة' }, { value: 'high', label: 'مرتفعة' }, { value: 'medium', label: 'متوسطة' }, { value: 'low', label: 'منخفضة' } ] },
      { name: 'riskAssessment', label: 'تقييم المخاطر', type: 'textarea' },
      { name: 'notes', label: 'ملاحظات', type: 'textarea' } ],
  },

  // ── Ops / assets ─────────────────────────────────────────────────────────
  'assets/new': {
    title: 'إضافة أصل', endpoint: '/assets', method: 'post', backTo: '/assets', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'name', label: 'اسم الأصل', type: 'text', required: true },
      { name: 'category', label: 'الفئة', type: 'select', required: true, options: [ { value: 'vehicles', label: 'مركبات' }, { value: 'office', label: 'مكتبية' }, { value: 'equipment', label: 'معدات' }, { value: 'property', label: 'عقارات' }, { value: 'other', label: 'أخرى' } ] },
      { name: 'description', label: 'الوصف', type: 'textarea' },
      { name: 'value', label: 'القيمة (ر.س)', type: 'number' },
      { name: 'location', label: 'الموقع', type: 'text' },
      { name: 'status', label: 'الحالة', type: 'select', options: [ { value: 'active', label: 'نشط' }, { value: 'inactive', label: 'غير نشط' }, { value: 'maintenance', label: 'صيانة' }, { value: 'disposed', label: 'مستبعد' } ] } ],
  },
  'contracts/new': {
    title: 'إضافة عقد', endpoint: '/contract-management/contracts', method: 'post', backTo: '/contracts', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'contractTitle', label: 'عنوان العقد', type: 'text', required: true },
      { name: 'contractType', label: 'نوع العقد', type: 'select', required: true, options: [
        { value: 'SUPPLY_AGREEMENT', label: 'عقد توريد' }, { value: 'FRAMEWORK_AGREEMENT', label: 'عقد إطاري' }, { value: 'ONE_TIME_PURCHASE', label: 'شراء لمرة واحدة' }, { value: 'MAINTENANCE_AGREEMENT', label: 'عقد صيانة' }, { value: 'SERVICE_AGREEMENT', label: 'عقد خدمات' }, { value: 'DISTRIBUTION_AGREEMENT', label: 'عقد توزيع' } ] },
      { name: 'startDate', label: 'تاريخ البدء', type: 'date', required: true },
      { name: 'endDate', label: 'تاريخ الانتهاء', type: 'date', required: true },
      { name: 'notes', label: 'ملاحظات', type: 'textarea' } ],
  },
  'facility/new': {
    title: 'إضافة مرفق', endpoint: '/facilities/rooms', method: 'post', backTo: '/facility', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'code', label: 'رمز الغرفة', type: 'text', required: true },
      { name: 'nameAr', label: 'الاسم بالعربية', type: 'text', required: true },
      { name: 'nameEn', label: 'الاسم بالإنجليزية', type: 'text' },
      { name: 'type', label: 'النوع', type: 'select', required: true, options: [ { value: 'therapy', label: 'علاج' }, { value: 'assessment', label: 'تقييم' }, { value: 'sensory', label: 'حسية' }, { value: 'gym', label: 'قاعة رياضية' }, { value: 'classroom', label: 'فصل دراسي' }, { value: 'meeting', label: 'اجتماعات' }, { value: 'office', label: 'مكتب' }, { value: 'waiting', label: 'انتظار' }, { value: 'storage', label: 'مخزن' } ] },
      { name: 'floor', label: 'الطابق', type: 'text' },
      { name: 'building', label: 'المبنى', type: 'text' },
      { name: 'capacity', label: 'السعة', type: 'number' } ],
  },
  'gps-tracking/vehicles/new': {
    title: 'إضافة مركبة', endpoint: '/vehicles', method: 'post', backTo: '/gps-tracking', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'plateNumber', label: 'رقم اللوحة', type: 'text', required: true },
      { name: 'registrationNumber', label: 'رقم التسجيل', type: 'text' },
      { name: 'vin', label: 'رقم الهيكل (VIN)', type: 'text' },
      { name: 'engineNumber', label: 'رقم المحرك', type: 'text' },
      { name: 'notes', label: 'ملاحظات', type: 'textarea' } ],
  },
  'org-structure/new': {
    title: 'إضافة وظيفة', endpoint: '/organization/positions', method: 'post', backTo: '/org-structure', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'title', label: 'المسمى الوظيفي', type: 'text', required: true },
      { name: 'titleEn', label: 'المسمى بالإنجليزية', type: 'text' },
      { name: 'level', label: 'المستوى', type: 'select', options: [ { value: 'executive', label: 'تنفيذي' }, { value: 'senior_management', label: 'إدارة عليا' }, { value: 'middle_management', label: 'إدارة وسطى' }, { value: 'supervisor', label: 'مشرف' }, { value: 'staff', label: 'موظف' }, { value: 'intern', label: 'متدرب' } ] },
      { name: 'type', label: 'نوع التعاقد', type: 'select', options: [ { value: 'full_time', label: 'دوام كامل' }, { value: 'part_time', label: 'دوام جزئي' }, { value: 'contract', label: 'عقد' }, { value: 'temporary', label: 'مؤقت' } ] },
      { name: 'headcount', label: 'العدد المعتمد', type: 'number' } ],
  },
  'procurement/new': {
    title: 'إضافة طلب شراء', endpoint: '/purchasing/requests', method: 'post', backTo: '/procurement', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'requiredDate', label: 'التاريخ المطلوب', type: 'date', required: true },
      { name: 'department', label: 'القسم', type: 'text' },
      { name: 'priority', label: 'الأولوية', type: 'select', options: [ { value: 'low', label: 'منخفضة' }, { value: 'normal', label: 'عادية' }, { value: 'high', label: 'عالية' }, { value: 'urgent', label: 'عاجلة' } ] },
      { name: 'justification', label: 'المبرر', type: 'textarea' } ],
  },
  'projects/new': {
    title: 'إضافة مشروع', endpoint: '/pm/projects', method: 'post', backTo: '/projects', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'name', label: 'اسم المشروع', type: 'text', required: true },
      { name: 'description', label: 'الوصف', type: 'textarea' },
      { name: 'priority', label: 'الأولوية', type: 'select', options: [ { value: 'low', label: 'منخفضة' }, { value: 'medium', label: 'متوسطة' }, { value: 'high', label: 'عالية' }, { value: 'critical', label: 'حرجة' } ] },
      { name: 'startDate', label: 'تاريخ البدء', type: 'date' },
      { name: 'endDate', label: 'تاريخ الانتهاء', type: 'date' },
      { name: 'budget', label: 'الميزانية', type: 'number' } ],
  },

  // ── Clinical / care ──────────────────────────────────────────────────────
  'icf/new': {
    title: 'إضافة تقييم ICF', endpoint: '/icf-assessments', method: 'post', backTo: '/icf', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'title', label: 'العنوان', type: 'text', required: true },
      { name: 'description', label: 'الوصف', type: 'textarea' },
      { name: 'assessmentType', label: 'نوع التقييم', type: 'select', required: true, options: [ { value: 'initial', label: 'تقييم أولي' }, { value: 'periodic', label: 'تقييم دوري' }, { value: 'progress', label: 'تقييم تقدم' }, { value: 'discharge', label: 'تقييم خروج' }, { value: 'followUp', label: 'تقييم متابعة' }, { value: 'comprehensive', label: 'تقييم شامل' } ] },
      { name: 'assessmentDate', label: 'تاريخ التقييم', type: 'date', required: true },
      { name: 'duration', label: 'المدة (دقائق)', type: 'number' } ],
  },
  'mhpss/sessions/new': {
    title: 'إضافة جلسة إرشاد نفسي', endpoint: '/mhpss/sessions', method: 'post', backTo: '/mhpss', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'type', label: 'نوع الجلسة', type: 'select', required: true, options: [ { value: 'individual', label: 'فردي' }, { value: 'group', label: 'جماعي' }, { value: 'family', label: 'أسري' }, { value: 'couples', label: 'زوجي' } ] },
      { name: 'scheduledDate', label: 'تاريخ الجلسة', type: 'date', required: true },
      { name: 'startTime', label: 'وقت البدء', type: 'text' },
      { name: 'location', label: 'المكان', type: 'select', options: [ { value: 'office', label: 'مكتب' }, { value: 'therapy-room', label: 'غرفة علاج' }, { value: 'remote', label: 'عن بعد' }, { value: 'home-visit', label: 'منزلي' } ] },
      { name: 'chiefComplaint', label: 'الشكوى الرئيسية', type: 'textarea' } ],
  },
  'research/studies/new': {
    title: 'إضافة دراسة بحثية', endpoint: '/research', method: 'post', backTo: '/research', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'title', label: 'عنوان الدراسة', type: 'text', required: true },
      { name: 'abstract', label: 'ملخص الدراسة', type: 'textarea', required: true },
      { name: 'studyType', label: 'نوع الدراسة', type: 'select', required: true, options: [ { value: 'retrospective', label: 'بأثر رجعي' }, { value: 'prospective', label: 'استشرافي' }, { value: 'cross-sectional', label: 'مقطعي' }, { value: 'longitudinal', label: 'طولي' }, { value: 'case-study', label: 'دراسة حالة' }, { value: 'cohort', label: 'أتراب' }, { value: 'quality-improvement', label: 'تحسين الجودة' } ] } ],
  },
  'independent-living/plans/new': {
    title: 'إضافة خطة استقلالية', endpoint: '/independent-living/plans', method: 'post', backTo: '/independent-living', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'title', label: 'عنوان الخطة', type: 'text', required: true },
      { name: 'description', label: 'الوصف', type: 'textarea' },
      { name: 'startDate', label: 'تاريخ البدء', type: 'date', required: true },
      { name: 'endDate', label: 'تاريخ الانتهاء', type: 'date', required: true },
      { name: 'notes', label: 'ملاحظات', type: 'textarea' } ],
  },
  'ar-rehab/new': {
    title: 'إضافة جلسة تأهيل (AR/VR)', endpoint: '/ar-vr', method: 'post', backTo: '/ar-rehab', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'technologyType', label: 'نوع التقنية', type: 'select', required: true, options: [ { value: 'vr', label: 'واقع افتراضي' }, { value: 'ar', label: 'واقع معزز' }, { value: 'mr', label: 'واقع مختلط' }, { value: 'xr', label: 'واقع ممتد' }, { value: 'mixed', label: 'مدمج' } ] },
      { name: 'specialty', label: 'التخصص', type: 'select', options: [ { value: 'motor_rehab', label: 'تأهيل حركي' }, { value: 'cognitive_rehab', label: 'تأهيل معرفي' }, { value: 'balance_training', label: 'تدريب التوازن' }, { value: 'pain_management', label: 'إدارة الألم' }, { value: 'sensory_integration', label: 'التكامل الحسي' }, { value: 'other', label: 'أخرى' } ] },
      { name: 'plannedDurationMinutes', label: 'المدة المخططة (دقائق)', type: 'number' } ],
  },
  'community/activities/new': {
    title: 'إضافة نشاط مجتمعي', endpoint: '/community-integration/activities', method: 'post', backTo: '/community', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'title', label: 'عنوان النشاط', type: 'text', required: true },
      { name: 'description', label: 'وصف النشاط', type: 'textarea', required: true },
      { name: 'category', label: 'التصنيف', type: 'select', required: true, options: [ { value: 'sports', label: 'رياضي' }, { value: 'cultural', label: 'ثقافي' }, { value: 'entertainment', label: 'ترفيهي' }, { value: 'educational', label: 'تعليمي' }, { value: 'vocational', label: 'مهني' }, { value: 'social', label: 'اجتماعي' }, { value: 'therapeutic', label: 'علاجي' } ] },
      { name: 'startDate', label: 'تاريخ البدء', type: 'date', required: true },
      { name: 'endDate', label: 'تاريخ الانتهاء', type: 'date' } ],
  },
  'supply-chain/orders/new': {
    title: 'إضافة أمر شراء', endpoint: '/supply-chain/orders', method: 'post', backTo: '/supply-chain', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'orderNumber', label: 'رقم الطلب', type: 'text', required: true },
      { name: 'totalAmount', label: 'المبلغ الإجمالي', type: 'number' } ],
  },

  // ── Admin / quality ──────────────────────────────────────────────────────
  'complaints/new': {
    title: 'إضافة شكوى', endpoint: '/complaints', method: 'post', backTo: '/complaints', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'subject', label: 'عنوان الشكوى', type: 'text', required: true },
      { name: 'description', label: 'وصف الشكوى', type: 'textarea', required: true },
      { name: 'type', label: 'النوع', type: 'select', required: true, options: [ { value: 'complaint', label: 'شكوى' }, { value: 'suggestion', label: 'اقتراح' }, { value: 'grievance', label: 'تظلم' }, { value: 'feedback', label: 'ملاحظة' } ] },
      { name: 'source', label: 'المصدر', type: 'select', required: true, options: [ { value: 'employee', label: 'موظف' }, { value: 'student', label: 'طالب/مستفيد' }, { value: 'customer', label: 'عميل' }, { value: 'parent', label: 'ولي أمر' }, { value: 'other', label: 'أخرى' } ] },
      { name: 'priority', label: 'الأولوية', type: 'select', options: [ { value: 'critical', label: 'حرجة' }, { value: 'high', label: 'عالية' }, { value: 'medium', label: 'متوسطة' }, { value: 'low', label: 'منخفضة' } ] },
      { name: 'submitterName', label: 'اسم مقدّم الشكوى', type: 'text' } ],
  },
  'crisis/incidents/new': {
    title: 'إضافة حادثة طارئة', endpoint: '/crisis/incidents', method: 'post', backTo: '/crisis', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'title', label: 'عنوان الحادثة', type: 'text', required: true },
      { name: 'description', label: 'وصف الحادثة', type: 'textarea', required: true },
      { name: 'type', label: 'نوع الحادثة', type: 'select', required: true, options: [ { value: 'fire', label: 'حريق' }, { value: 'earthquake', label: 'زلزال' }, { value: 'flood', label: 'فيضان' }, { value: 'medical', label: 'طبية' }, { value: 'security', label: 'أمنية' }, { value: 'power_outage', label: 'انقطاع كهرباء' }, { value: 'evacuation', label: 'إخلاء' }, { value: 'other', label: 'أخرى' } ] },
      { name: 'severity', label: 'الخطورة', type: 'select', required: true, options: [ { value: 'minor', label: 'بسيطة' }, { value: 'moderate', label: 'متوسطة' }, { value: 'major', label: 'كبيرة' }, { value: 'critical', label: 'حرجة' } ] } ],
  },
  'hse/incidents/new': {
    title: 'إضافة حادثة سلامة', endpoint: '/hse/incidents', method: 'post', backTo: '/hse', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'titleAr', label: 'عنوان الحادثة', type: 'text', required: true },
      { name: 'description', label: 'وصف الحادثة', type: 'textarea', required: true },
      { name: 'incidentType', label: 'نوع الحادثة', type: 'select', required: true, options: [ { value: 'injury', label: 'إصابة' }, { value: 'near_miss', label: 'حادث وشيك' }, { value: 'property_damage', label: 'أضرار بالممتلكات' }, { value: 'environmental', label: 'بيئية' }, { value: 'fire', label: 'حريق' }, { value: 'fall', label: 'سقوط' }, { value: 'other', label: 'أخرى' } ] },
      { name: 'location', label: 'الموقع', type: 'text', required: true },
      { name: 'incidentDate', label: 'تاريخ الحادثة', type: 'date', required: true } ],
  },
  'risk-management/new': {
    title: 'إضافة مخاطرة', endpoint: '/enterprise-risk/risks', method: 'post', backTo: '/risk-management', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'titleAr', label: 'عنوان المخاطرة', type: 'text', required: true },
      { name: 'category', label: 'التصنيف', type: 'select', required: true, options: [ { value: 'strategic', label: 'استراتيجية' }, { value: 'operational', label: 'تشغيلية' }, { value: 'financial', label: 'مالية' }, { value: 'compliance', label: 'امتثال' }, { value: 'reputational', label: 'سمعة' }, { value: 'technology', label: 'تقنية' }, { value: 'safety', label: 'سلامة' }, { value: 'other', label: 'أخرى' } ] },
      { name: 'description', label: 'الوصف', type: 'textarea' },
      { name: 'priority', label: 'الأولوية', type: 'select', required: true, options: [ { value: 'critical', label: 'حرجة' }, { value: 'high', label: 'عالية' }, { value: 'medium', label: 'متوسطة' }, { value: 'low', label: 'منخفضة' } ] } ],
  },
  'legal/cases/new': {
    title: 'إضافة قضية قانونية', endpoint: '/legal-affairs/cases', method: 'post', backTo: '/legal', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'caseNumber', label: 'رقم القضية', type: 'text', required: true },
      { name: 'title', label: 'عنوان القضية', type: 'text', required: true },
      { name: 'priority', label: 'الأولوية', type: 'select', options: [ { value: 'critical', label: 'حرجة' }, { value: 'high', label: 'عالية' }, { value: 'medium', label: 'متوسطة' }, { value: 'low', label: 'منخفضة' } ] },
      { name: 'description', label: 'وصف القضية', type: 'textarea' },
      { name: 'filingDate', label: 'تاريخ القيد', type: 'date' } ],
  },
  'audit/plans/new': {
    title: 'إضافة خطة تدقيق', endpoint: '/internal-audit/audit-plans', method: 'post', backTo: '/audit', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'planId', label: 'معرّف الخطة', type: 'text', required: true },
      { name: 'year', label: 'السنة', type: 'number', required: true },
      { name: 'title', label: 'العنوان (إنجليزي)', type: 'text', required: true },
      { name: 'titleAr', label: 'العنوان (عربي)', type: 'text', required: true },
      { name: 'descriptionAr', label: 'الوصف (عربي)', type: 'textarea' } ],
  },

  // ── Content / engagement ─────────────────────────────────────────────────
  'events/new': {
    title: 'إضافة فعالية', endpoint: '/events-management', method: 'post', backTo: '/events', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'titleAr', label: 'عنوان الفعالية', type: 'text', required: true },
      { name: 'eventCode', label: 'رمز الفعالية', type: 'text', required: true },
      { name: 'type', label: 'نوع الفعالية', type: 'select', options: [ { value: 'conference', label: 'مؤتمر' }, { value: 'seminar', label: 'ندوة' }, { value: 'workshop', label: 'ورشة عمل' }, { value: 'ceremony', label: 'حفل' }, { value: 'exhibition', label: 'معرض' }, { value: 'meeting', label: 'اجتماع' }, { value: 'training', label: 'تدريب' }, { value: 'other', label: 'أخرى' } ] },
      { name: 'startDate', label: 'تاريخ البداية', type: 'date', required: true },
      { name: 'endDate', label: 'تاريخ النهاية', type: 'date', required: true },
      { name: 'description', label: 'الوصف', type: 'textarea' } ],
  },
  'meetings/new': {
    title: 'إضافة اجتماع', endpoint: '/meetings', method: 'post', backTo: '/meetings', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'title', label: 'عنوان الاجتماع', type: 'text', required: true },
      { name: 'date', label: 'تاريخ الاجتماع', type: 'date', required: true },
      { name: 'type', label: 'نوع الاجتماع', type: 'select', options: [ { value: 'department', label: 'إداري' }, { value: 'board', label: 'مجلس إدارة' }, { value: 'project', label: 'مشروع' }, { value: 'training', label: 'تدريبي' }, { value: 'review', label: 'مراجعة' }, { value: 'emergency', label: 'طارئ' } ] },
      { name: 'startTime', label: 'وقت البدء', type: 'text' },
      { name: 'location', label: 'المكان', type: 'text' },
      { name: 'description', label: 'الوصف', type: 'textarea' } ],
  },
  'documents/new': {
    title: 'إضافة مستند', endpoint: '/documents', method: 'post', backTo: '/documents', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'title', label: 'عنوان المستند', type: 'text', required: true },
      { name: 'fileUrl', label: 'رابط الملف', type: 'text', required: true },
      { name: 'category', label: 'التصنيف', type: 'select', options: [ { value: 'CLINICAL', label: 'سريري' }, { value: 'HR', label: 'موارد بشرية' }, { value: 'FINANCE', label: 'مالي' }, { value: 'LEGAL', label: 'قانوني' }, { value: 'QUALITY', label: 'جودة' }, { value: 'GENERAL', label: 'عام' } ] },
      { name: 'description', label: 'الوصف', type: 'textarea' },
      { name: 'expiryDate', label: 'تاريخ الانتهاء', type: 'date' },
      { name: 'isConfidential', label: 'سري', type: 'checkbox' } ],
  },
  'knowledge/new': {
    title: 'إضافة مقال معرفي', endpoint: '/knowledge-center/articles', method: 'post', backTo: '/knowledge', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'title', label: 'العنوان', type: 'text', required: true },
      { name: 'description', label: 'الوصف', type: 'textarea', required: true },
      { name: 'content', label: 'المحتوى', type: 'textarea', required: true },
      { name: 'category', label: 'التصنيف', type: 'select', required: true, options: [ { value: 'therapeutic_protocols', label: 'البروتوكولات العلاجية' }, { value: 'case_studies', label: 'دراسات الحالة' }, { value: 'research_experiments', label: 'التجارب البحثية' }, { value: 'best_practices', label: 'أفضل الممارسات' }, { value: 'other', label: 'أخرى' } ] },
      { name: 'isPublic', label: 'متاح للجميع', type: 'checkbox' } ],
  },
  'cms/content/new': {
    title: 'إنشاء محتوى', endpoint: '/cms/pages', method: 'post', backTo: '/cms', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'title', label: 'العنوان', type: 'text', required: true },
      { name: 'type', label: 'النوع', type: 'select', options: [ { value: 'page', label: 'صفحة' }, { value: 'blog', label: 'مدونة' }, { value: 'news', label: 'خبر' }, { value: 'announcement', label: 'إعلان' }, { value: 'faq', label: 'أسئلة شائعة' } ] },
      { name: 'content', label: 'المحتوى', type: 'textarea' } ],
  },
  'messages/compose': {
    title: 'إنشاء رسالة', endpoint: '/messages', method: 'post', backTo: '/messages', successMsg: 'تم الإرسال بنجاح ✓',
    fields: [
      { name: 'recipient', label: 'المستلم', type: 'text', required: true },
      { name: 'subject', label: 'الموضوع', type: 'text' },
      { name: 'content', label: 'نص الرسالة', type: 'textarea', required: true } ],
  },

  // ── HR — performance evaluation (employee picker) ─────────────────────────
  'performance/new': {
    title: 'إنشاء تقييم أداء', endpoint: '/hr/performance/evaluations', method: 'post', backTo: '/performance', successMsg: 'تم إنشاء التقييم بنجاح ✓',
    fields: [
      { name: 'employeeId', label: 'الموظف', type: 'entity-select', required: true, optionsEndpoint: '/hr/employees', optionValue: '_id', optionLabel: ['fullName', 'name_ar', 'nameAr', 'name', 'employeeName'] },
      { name: 'evaluationPeriod', label: 'فترة التقييم (مثال: 2026-Q1)', type: 'text', required: true },
      { name: 'hrNotes', label: 'ملاحظات الموارد البشرية', type: 'textarea' } ],
  },

  // ── HR — training course (revived module) ─────────────────────────────────
  'training/new': {
    title: 'إضافة دورة تدريبية', endpoint: '/training/courses', method: 'post', backTo: '/training', successMsg: 'تمت إضافة الدورة بنجاح ✓',
    fields: [
      { name: 'courseCode', label: 'رمز الدورة', type: 'text', required: true },
      { name: 'titleAr', label: 'اسم الدورة (عربي)', type: 'text', required: true },
      { name: 'titleEn', label: 'اسم الدورة (إنجليزي)', type: 'text' },
      { name: 'category', label: 'التصنيف', type: 'select', options: [
        { value: 'technical', label: 'تقني' }, { value: 'leadership', label: 'قيادي' }, { value: 'soft_skills', label: 'مهارات شخصية' }, { value: 'compliance', label: 'امتثال' }, { value: 'safety', label: 'سلامة' }, { value: 'professional', label: 'مهني' }, { value: 'language', label: 'لغات' }, { value: 'other', label: 'أخرى' } ] },
      { name: 'type', label: 'نوع التدريب', type: 'select', options: [
        { value: 'classroom', label: 'حضوري' }, { value: 'online', label: 'عن بُعد' }, { value: 'blended', label: 'مدمج' }, { value: 'workshop', label: 'ورشة عمل' }, { value: 'seminar', label: 'ندوة' }, { value: 'on_the_job', label: 'أثناء العمل' } ] },
      { name: 'description', label: 'الوصف', type: 'textarea' },
      { name: 'maxParticipants', label: 'الحد الأقصى للمشاركين', type: 'number' } ],
  },

  // ── Services / misc ──────────────────────────────────────────────────────
  'helpdesk/new': {
    title: 'إضافة تذكرة دعم', endpoint: '/helpdesk/tickets', method: 'post', backTo: '/helpdesk', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'titleAr', label: 'العنوان (عربي)', type: 'text', required: true },
      { name: 'description', label: 'الوصف', type: 'textarea', required: true },
      { name: 'category', label: 'الفئة', type: 'select', required: true, options: [ { value: 'hardware', label: 'أجهزة' }, { value: 'software', label: 'برمجيات' }, { value: 'network', label: 'الشبكة' }, { value: 'access', label: 'الصلاحيات والوصول' }, { value: 'email', label: 'البريد الإلكتروني' }, { value: 'general', label: 'عام' }, { value: 'other', label: 'أخرى' } ] },
      { name: 'priority', label: 'الأولوية', type: 'select', options: [ { value: 'low', label: 'منخفضة' }, { value: 'medium', label: 'متوسطة' }, { value: 'high', label: 'عالية' }, { value: 'critical', label: 'حرجة' } ] },
      { name: 'requesterDepartment', label: 'إدارة مقدم الطلب', type: 'text' } ],
  },
  'waitlist/entries/new': {
    title: 'إضافة طلب قائمة انتظار', endpoint: '/waitlist', method: 'post', backTo: '/waitlist', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'applicantName', label: 'اسم المتقدم', type: 'text', required: true },
      { name: 'applicantPhone', label: 'رقم الجوال', type: 'text', required: true },
      { name: 'applicantEmail', label: 'البريد الإلكتروني', type: 'email' },
      { name: 'disabilityType', label: 'نوع الإعاقة', type: 'select', required: true, options: [ { value: 'physical', label: 'إعاقة حركية' }, { value: 'intellectual', label: 'إعاقة ذهنية' }, { value: 'autism', label: 'اضطراب طيف التوحد' }, { value: 'hearing', label: 'إعاقة سمعية' }, { value: 'visual', label: 'إعاقة بصرية' }, { value: 'speech', label: 'إعاقة نطقية' }, { value: 'multiple', label: 'إعاقة مزدوجة' }, { value: 'other', label: 'أخرى' } ] },
      { name: 'disabilitySeverity', label: 'شدة الإعاقة', type: 'select', required: true, options: [ { value: 'mild', label: 'بسيطة' }, { value: 'moderate', label: 'متوسطة' }, { value: 'severe', label: 'شديدة' }, { value: 'profound', label: 'شديدة جداً' } ] },
      { name: 'age', label: 'العمر', type: 'number' } ],
  },
  'visitors/register': {
    title: 'تسجيل زائر', endpoint: '/visitors', method: 'post', backTo: '/visitors', successMsg: 'تم التسجيل بنجاح ✓',
    fields: [
      { name: 'fullName', label: 'الاسم الكامل', type: 'text', required: true },
      { name: 'nationalId', label: 'رقم الهوية', type: 'text' },
      { name: 'phone', label: 'رقم الجوال', type: 'text' },
      { name: 'company', label: 'الجهة / الشركة', type: 'text' },
      { name: 'purpose', label: 'الغرض من الزيارة', type: 'select', options: [ { value: 'meeting', label: 'اجتماع' }, { value: 'delivery', label: 'توصيل' }, { value: 'maintenance', label: 'صيانة' }, { value: 'interview', label: 'مقابلة' }, { value: 'inspection', label: 'تفتيش' }, { value: 'personal', label: 'شخصي' }, { value: 'other', label: 'أخرى' } ] },
      { name: 'hostName', label: 'اسم المضيف', type: 'text' } ],
  },
  'volunteers/register': {
    title: 'تسجيل متطوع', endpoint: '/volunteers/register', method: 'post', backTo: '/volunteers', successMsg: 'تم التسجيل بنجاح ✓',
    fields: [
      { name: 'firstName', label: 'الاسم الأول', type: 'text', required: true },
      { name: 'lastName', label: 'اسم العائلة', type: 'text', required: true },
      { name: 'nationalId', label: 'رقم الهوية', type: 'text', required: true },
      { name: 'email', label: 'البريد الإلكتروني', type: 'email', required: true },
      { name: 'phone', label: 'رقم الجوال', type: 'text', required: true },
      { name: 'gender', label: 'الجنس', type: 'select', required: true, options: [ { value: 'male', label: 'ذكر' }, { value: 'female', label: 'أنثى' } ] },
      { name: 'city', label: 'المدينة', type: 'text' } ],
  },
  'kitchen/meals/new': {
    title: 'إضافة عنصر قائمة طعام', endpoint: '/kitchen/menu-items', method: 'post', backTo: '/kitchen', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'category', label: 'الفئة', type: 'select', required: true, options: [ { value: 'breakfast', label: 'إفطار' }, { value: 'lunch', label: 'غداء' }, { value: 'dinner', label: 'عشاء' }, { value: 'snack', label: 'وجبة خفيفة' }, { value: 'drink', label: 'مشروب' }, { value: 'dessert', label: 'حلوى' }, { value: 'special', label: 'خاص' } ] },
      { name: 'preparationTime', label: 'وقت التحضير (دقائق)', type: 'number' },
      { name: 'servingSize', label: 'حجم الحصة', type: 'text' },
      { name: 'isActive', label: 'مُفعّل', type: 'checkbox' } ],
  },
  'laundry/orders/new': {
    title: 'إضافة طلب غسيل', endpoint: '/laundry/orders', method: 'post', backTo: '/laundry', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'department', label: 'القسم', type: 'text' },
      { name: 'type', label: 'النوع', type: 'select', options: [ { value: 'personal', label: 'شخصي' }, { value: 'bedding', label: 'مفروشات' }, { value: 'towels', label: 'مناشف' }, { value: 'uniforms', label: 'أزياء موحدة' }, { value: 'curtains', label: 'ستائر' }, { value: 'bulk', label: 'كميات كبيرة' }, { value: 'special', label: 'خاص' } ] },
      { name: 'priority', label: 'الأولوية', type: 'select', options: [ { value: 'normal', label: 'عادية' }, { value: 'urgent', label: 'عاجلة' }, { value: 'express', label: 'سريعة' } ] },
      { name: 'scheduledDate', label: 'التاريخ المجدول', type: 'date' },
      { name: 'notes', label: 'ملاحظات', type: 'textarea' } ],
  },
  'strategic-planning/new': {
    title: 'إضافة هدف استراتيجي', endpoint: '/strategic-planning/goals', method: 'post', backTo: '/strategic-planning', successMsg: 'تمت الإضافة بنجاح ✓',
    fields: [
      { name: 'title', label: 'عنوان الهدف', type: 'text', required: true },
      { name: 'description', label: 'الوصف', type: 'textarea' },
      { name: 'perspective', label: 'منظور BSC', type: 'select', required: true, options: [ { value: 'financial', label: 'المالي' }, { value: 'customer', label: 'العملاء' }, { value: 'internal_processes', label: 'العمليات الداخلية' }, { value: 'learning_growth', label: 'التعلم والنمو' } ] },
      { name: 'priority', label: 'الأولوية', type: 'select', options: [ { value: 'critical', label: 'حرجة' }, { value: 'high', label: 'عالية' }, { value: 'medium', label: 'متوسطة' }, { value: 'low', label: 'منخفضة' } ] },
      { name: 'targetValue', label: 'القيمة المستهدفة', type: 'number' },
      { name: 'startDate', label: 'تاريخ البدء', type: 'date' } ],
  },
};

// Normalise: ensure every endpoint has a single leading slash.
const CREATE_FORMS = Object.fromEntries(
  Object.entries(RAW).map(([k, v]) => [
    k,
    { ...v, endpoint: '/' + String(v.endpoint || '').replace(/^\/+/, '') },
  ])
);

export default CREATE_FORMS;
