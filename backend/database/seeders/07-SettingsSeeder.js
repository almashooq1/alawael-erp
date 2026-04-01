/**
 * 07-SettingsSeeder.js
 * إنشاء إعدادات النظام الشاملة
 * عام + ساعات العمل + المواعيد + الفوترة + ZATCA + NPHIES + النقل + الإشعارات + AI + caseload
 */

const mongoose = require('mongoose');

// ===== نموذج مؤقت للإعدادات =====

const SettingSchema = new mongoose.Schema(
  {
    group: { type: String, required: true },
    key: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed },
    type: {
      type: String,
      enum: ['string', 'integer', 'decimal', 'boolean', 'json', 'time', 'array'],
      default: 'string',
    },
    labelAr: String,
    labelEn: String,
    isPublic: { type: Boolean, default: false },
    isEditable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SettingSchema.index({ group: 1, key: 1 }, { unique: true });

const Setting = mongoose.models.Setting || mongoose.model('Setting', SettingSchema);

async function seedSettings() {
  const settingsData = [
    // ===========================
    // الإعدادات العامة
    // ===========================
    {
      group: 'general',
      key: 'center_name_ar',
      value: 'مركز الأمل للتأهيل',
      type: 'string',
      labelAr: 'اسم المركز بالعربية',
      labelEn: 'Center Name (Arabic)',
      isPublic: true,
    },
    {
      group: 'general',
      key: 'center_name_en',
      value: 'Al-Amal Rehabilitation Center',
      type: 'string',
      labelAr: 'اسم المركز بالإنجليزية',
      labelEn: 'Center Name (English)',
      isPublic: true,
    },
    {
      group: 'general',
      key: 'center_logo',
      value: '/images/logo.png',
      type: 'string',
      labelAr: 'شعار المركز',
      labelEn: 'Center Logo',
      isPublic: true,
    },
    {
      group: 'general',
      key: 'default_language',
      value: 'ar',
      type: 'string',
      labelAr: 'اللغة الافتراضية',
      labelEn: 'Default Language',
      isPublic: true,
    },
    {
      group: 'general',
      key: 'timezone',
      value: 'Asia/Riyadh',
      type: 'string',
      labelAr: 'المنطقة الزمنية',
      labelEn: 'Timezone',
      isPublic: false,
    },
    {
      group: 'general',
      key: 'phone',
      value: '920012345',
      type: 'string',
      labelAr: 'رقم الهاتف',
      labelEn: 'Phone Number',
      isPublic: true,
    },
    {
      group: 'general',
      key: 'email',
      value: 'info@rehab-center.sa',
      type: 'string',
      labelAr: 'البريد الإلكتروني',
      labelEn: 'Email Address',
      isPublic: true,
    },
    {
      group: 'general',
      key: 'website',
      value: 'https://rehab-center.sa',
      type: 'string',
      labelAr: 'الموقع الإلكتروني',
      labelEn: 'Website',
      isPublic: true,
    },
    {
      group: 'general',
      key: 'address_ar',
      value: 'المملكة العربية السعودية - الرياض',
      type: 'string',
      labelAr: 'العنوان بالعربية',
      labelEn: 'Address (Arabic)',
      isPublic: true,
    },
    {
      group: 'general',
      key: 'address_en',
      value: 'Saudi Arabia - Riyadh',
      type: 'string',
      labelAr: 'العنوان بالإنجليزية',
      labelEn: 'Address (English)',
      isPublic: true,
    },
    {
      group: 'general',
      key: 'cr_number',
      value: '1010XXXXXXX',
      type: 'string',
      labelAr: 'رقم السجل التجاري',
      labelEn: 'Commercial Registration Number',
      isPublic: false,
    },

    // ===========================
    // ساعات العمل
    // ===========================
    {
      group: 'working_hours',
      key: 'default_start',
      value: '07:30',
      type: 'time',
      labelAr: 'وقت بداية الدوام الافتراضي',
      labelEn: 'Default Start Time',
    },
    {
      group: 'working_hours',
      key: 'default_end',
      value: '16:30',
      type: 'time',
      labelAr: 'وقت نهاية الدوام الافتراضي',
      labelEn: 'Default End Time',
    },
    {
      group: 'working_hours',
      key: 'thursday_end',
      value: '14:00',
      type: 'time',
      labelAr: 'وقت نهاية الدوام يوم الخميس',
      labelEn: 'Thursday End Time',
    },
    {
      group: 'working_hours',
      key: 'weekend_days',
      value: ['friday', 'saturday'],
      type: 'json',
      labelAr: 'أيام الإجازة الأسبوعية',
      labelEn: 'Weekly Off Days',
    },
    {
      group: 'working_hours',
      key: 'lunch_break_start',
      value: '12:00',
      type: 'time',
      labelAr: 'بداية استراحة الغداء',
      labelEn: 'Lunch Break Start',
    },
    {
      group: 'working_hours',
      key: 'lunch_break_end',
      value: '13:00',
      type: 'time',
      labelAr: 'نهاية استراحة الغداء',
      labelEn: 'Lunch Break End',
    },

    // ===========================
    // إعدادات المواعيد
    // ===========================
    {
      group: 'appointments',
      key: 'default_duration',
      value: 45,
      type: 'integer',
      labelAr: 'مدة الجلسة الافتراضية (دقيقة)',
      labelEn: 'Default Session Duration (minutes)',
    },
    {
      group: 'appointments',
      key: 'buffer_between_sessions',
      value: 15,
      type: 'integer',
      labelAr: 'وقت الفصل بين الجلسات (دقيقة)',
      labelEn: 'Buffer Between Sessions (minutes)',
    },
    {
      group: 'appointments',
      key: 'max_advance_booking_days',
      value: 30,
      type: 'integer',
      labelAr: 'أقصى عدد أيام الحجز المسبق',
      labelEn: 'Max Advance Booking Days',
    },
    {
      group: 'appointments',
      key: 'cancellation_hours_before',
      value: 24,
      type: 'integer',
      labelAr: 'عدد الساعات المسموح بالإلغاء قبلها',
      labelEn: 'Cancellation Hours Before',
    },
    {
      group: 'appointments',
      key: 'max_cancellations_per_month',
      value: 3,
      type: 'integer',
      labelAr: 'أقصى عدد إلغاءات شهرية',
      labelEn: 'Max Cancellations Per Month',
    },
    {
      group: 'appointments',
      key: 'reminder_hours_before',
      value: [24, 2],
      type: 'json',
      labelAr: 'ساعات التذكير قبل الموعد',
      labelEn: 'Reminder Hours Before',
    },
    {
      group: 'appointments',
      key: 'auto_confirm',
      value: false,
      type: 'boolean',
      labelAr: 'تأكيد المواعيد تلقائياً',
      labelEn: 'Auto Confirm Appointments',
    },

    // ===========================
    // إعدادات الفوترة
    // ===========================
    {
      group: 'billing',
      key: 'currency',
      value: 'SAR',
      type: 'string',
      labelAr: 'العملة',
      labelEn: 'Currency',
      isPublic: true,
    },
    {
      group: 'billing',
      key: 'vat_rate',
      value: 15,
      type: 'decimal',
      labelAr: 'نسبة ضريبة القيمة المضافة (%)',
      labelEn: 'VAT Rate (%)',
    },
    {
      group: 'billing',
      key: 'payment_terms_days',
      value: 15,
      type: 'integer',
      labelAr: 'مدة استحقاق الفاتورة (يوم)',
      labelEn: 'Payment Terms (days)',
    },
    {
      group: 'billing',
      key: 'auto_generate_invoices',
      value: true,
      type: 'boolean',
      labelAr: 'إنشاء الفواتير تلقائياً',
      labelEn: 'Auto Generate Invoices',
    },
    {
      group: 'billing',
      key: 'invoice_prefix',
      value: 'INV',
      type: 'string',
      labelAr: 'بادئة رقم الفاتورة',
      labelEn: 'Invoice Number Prefix',
    },
    {
      group: 'billing',
      key: 'late_payment_fee_percent',
      value: 2,
      type: 'decimal',
      labelAr: 'رسوم التأخر في السداد (%)',
      labelEn: 'Late Payment Fee (%)',
    },
    {
      group: 'billing',
      key: 'invoice_footer_ar',
      value: 'شكراً لثقتكم بمركز الأمل للتأهيل',
      type: 'string',
      labelAr: 'تذييل الفاتورة بالعربية',
      labelEn: 'Invoice Footer (Arabic)',
    },

    // ===========================
    // إعدادات ZATCA
    // ===========================
    {
      group: 'zatca',
      key: 'seller_name',
      value: 'مركز الأمل للتأهيل',
      type: 'string',
      labelAr: 'اسم البائع (للفاتورة)',
      labelEn: 'Seller Name',
    },
    {
      group: 'zatca',
      key: 'vat_registration_number',
      value: '3100XXXXXXXXXX3',
      type: 'string',
      labelAr: 'رقم تسجيل ضريبة القيمة المضافة',
      labelEn: 'VAT Registration Number',
    },
    {
      group: 'zatca',
      key: 'environment',
      value: 'sandbox',
      type: 'string',
      labelAr: 'بيئة ZATCA',
      labelEn: 'ZATCA Environment',
    },
    {
      group: 'zatca',
      key: 'compliance_certificate',
      value: '',
      type: 'string',
      labelAr: 'شهادة الامتثال',
      labelEn: 'Compliance Certificate',
    },
    {
      group: 'zatca',
      key: 'enabled',
      value: true,
      type: 'boolean',
      labelAr: 'تفعيل ZATCA',
      labelEn: 'Enable ZATCA',
    },
    {
      group: 'zatca',
      key: 'invoice_type',
      value: 'standard',
      type: 'string',
      labelAr: 'نوع الفاتورة',
      labelEn: 'Invoice Type',
    },

    // ===========================
    // إعدادات NPHIES
    // ===========================
    {
      group: 'nphies',
      key: 'provider_id',
      value: 'NPHIES-PROV-XXXXX',
      type: 'string',
      labelAr: 'رقم مزود الخدمة',
      labelEn: 'Provider ID',
    },
    {
      group: 'nphies',
      key: 'api_base_url',
      value: 'https://hsb.nphies.sa',
      type: 'string',
      labelAr: 'رابط API الأساسي',
      labelEn: 'API Base URL',
    },
    {
      group: 'nphies',
      key: 'enabled',
      value: true,
      type: 'boolean',
      labelAr: 'تفعيل تكامل NPHIES',
      labelEn: 'Enable NPHIES Integration',
    },
    {
      group: 'nphies',
      key: 'auto_eligibility_check',
      value: true,
      type: 'boolean',
      labelAr: 'التحقق التلقائي من الأهلية',
      labelEn: 'Auto Eligibility Check',
    },

    // ===========================
    // إعدادات النقل
    // ===========================
    {
      group: 'transport',
      key: 'coverage_radius_km',
      value: 30,
      type: 'integer',
      labelAr: 'نطاق التغطية (كيلومتر)',
      labelEn: 'Coverage Radius (km)',
    },
    {
      group: 'transport',
      key: 'morning_departure_time',
      value: '06:30',
      type: 'time',
      labelAr: 'وقت انطلاق الرحلة الصباحية',
      labelEn: 'Morning Departure Time',
    },
    {
      group: 'transport',
      key: 'afternoon_departure_time',
      value: '14:00',
      type: 'time',
      labelAr: 'وقت انطلاق رحلة العودة',
      labelEn: 'Afternoon Departure Time',
    },
    {
      group: 'transport',
      key: 'gps_update_interval_seconds',
      value: 30,
      type: 'integer',
      labelAr: 'فترة تحديث GPS (ثانية)',
      labelEn: 'GPS Update Interval (seconds)',
    },
    {
      group: 'transport',
      key: 'arrival_notification_meters',
      value: 500,
      type: 'integer',
      labelAr: 'المسافة لإرسال إشعار الوصول (متر)',
      labelEn: 'Arrival Notification Distance (meters)',
    },
    {
      group: 'transport',
      key: 'monthly_transport_fee',
      value: 800,
      type: 'decimal',
      labelAr: 'رسوم النقل الشهرية (ريال)',
      labelEn: 'Monthly Transport Fee (SAR)',
    },

    // ===========================
    // إعدادات الإشعارات
    // ===========================
    {
      group: 'notifications',
      key: 'sms_enabled',
      value: true,
      type: 'boolean',
      labelAr: 'تفعيل الرسائل القصيرة',
      labelEn: 'Enable SMS',
    },
    {
      group: 'notifications',
      key: 'email_enabled',
      value: true,
      type: 'boolean',
      labelAr: 'تفعيل البريد الإلكتروني',
      labelEn: 'Enable Email',
    },
    {
      group: 'notifications',
      key: 'push_enabled',
      value: true,
      type: 'boolean',
      labelAr: 'تفعيل الإشعارات الفورية',
      labelEn: 'Enable Push Notifications',
    },
    {
      group: 'notifications',
      key: 'whatsapp_enabled',
      value: false,
      type: 'boolean',
      labelAr: 'تفعيل واتساب',
      labelEn: 'Enable WhatsApp',
    },
    {
      group: 'notifications',
      key: 'quiet_hours_start',
      value: '22:00',
      type: 'time',
      labelAr: 'بداية ساعات الهدوء',
      labelEn: 'Quiet Hours Start',
    },
    {
      group: 'notifications',
      key: 'quiet_hours_end',
      value: '07:00',
      type: 'time',
      labelAr: 'نهاية ساعات الهدوء',
      labelEn: 'Quiet Hours End',
    },
    {
      group: 'notifications',
      key: 'session_reminder_enabled',
      value: true,
      type: 'boolean',
      labelAr: 'تفعيل تذكيرات الجلسات',
      labelEn: 'Enable Session Reminders',
    },
    {
      group: 'notifications',
      key: 'invoice_due_reminder_enabled',
      value: true,
      type: 'boolean',
      labelAr: 'تفعيل تذكيرات استحقاق الفواتير',
      labelEn: 'Enable Invoice Due Reminders',
    },

    // ===========================
    // إعدادات الذكاء الاصطناعي
    // ===========================
    {
      group: 'ai',
      key: 'predictions_enabled',
      value: true,
      type: 'boolean',
      labelAr: 'تفعيل التنبؤات',
      labelEn: 'Enable AI Predictions',
    },
    {
      group: 'ai',
      key: 'smart_reports_enabled',
      value: true,
      type: 'boolean',
      labelAr: 'تفعيل التقارير الذكية',
      labelEn: 'Enable Smart Reports',
    },
    {
      group: 'ai',
      key: 'openai_model',
      value: 'gpt-4',
      type: 'string',
      labelAr: 'نموذج الذكاء الاصطناعي',
      labelEn: 'AI Model',
    },
    {
      group: 'ai',
      key: 'auto_scheduling_enabled',
      value: false,
      type: 'boolean',
      labelAr: 'تفعيل الجدولة التلقائية',
      labelEn: 'Enable Auto Scheduling',
    },
    {
      group: 'ai',
      key: 'dropout_prediction_enabled',
      value: true,
      type: 'boolean',
      labelAr: 'تفعيل تنبؤ الانقطاع',
      labelEn: 'Enable Dropout Prediction',
    },
    {
      group: 'ai',
      key: 'progress_analysis_enabled',
      value: true,
      type: 'boolean',
      labelAr: 'تفعيل تحليل التقدم',
      labelEn: 'Enable Progress Analysis',
    },

    // ===========================
    // إعدادات الحمل الوظيفي
    // ===========================
    {
      group: 'caseload',
      key: 'max_per_specialist',
      value: 15,
      type: 'integer',
      labelAr: 'أقصى عدد حالات لكل أخصائي',
      labelEn: 'Max Cases Per Specialist',
    },
    {
      group: 'caseload',
      key: 'max_sessions_per_day',
      value: 8,
      type: 'integer',
      labelAr: 'أقصى عدد جلسات يومية للأخصائي',
      labelEn: 'Max Sessions Per Day Per Specialist',
    },
    {
      group: 'caseload',
      key: 'alert_threshold_percentage',
      value: 90,
      type: 'integer',
      labelAr: 'نسبة التنبيه عند الاقتراب من الحد (%)',
      labelEn: 'Alert Threshold (%)',
    },

    // ===========================
    // إعدادات الأمان
    // ===========================
    {
      group: 'security',
      key: 'session_timeout_minutes',
      value: 60,
      type: 'integer',
      labelAr: 'مهلة انتهاء الجلسة (دقيقة)',
      labelEn: 'Session Timeout (minutes)',
    },
    {
      group: 'security',
      key: 'max_login_attempts',
      value: 5,
      type: 'integer',
      labelAr: 'أقصى عدد محاولات تسجيل الدخول',
      labelEn: 'Max Login Attempts',
    },
    {
      group: 'security',
      key: 'lockout_duration_minutes',
      value: 15,
      type: 'integer',
      labelAr: 'مدة قفل الحساب بعد محاولات فاشلة (دقيقة)',
      labelEn: 'Lockout Duration (minutes)',
    },
    {
      group: 'security',
      key: 'two_factor_enabled',
      value: false,
      type: 'boolean',
      labelAr: 'تفعيل التحقق بخطوتين',
      labelEn: 'Enable Two-Factor Authentication',
    },
    {
      group: 'security',
      key: 'password_min_length',
      value: 8,
      type: 'integer',
      labelAr: 'الحد الأدنى لطول كلمة المرور',
      labelEn: 'Minimum Password Length',
    },

    // ===========================
    // إعدادات بوابة ولي الأمر
    // ===========================
    {
      group: 'parent_portal',
      key: 'enabled',
      value: true,
      type: 'boolean',
      labelAr: 'تفعيل بوابة ولي الأمر',
      labelEn: 'Enable Parent Portal',
    },
    {
      group: 'parent_portal',
      key: 'otp_expiry_minutes',
      value: 10,
      type: 'integer',
      labelAr: 'مدة صلاحية رمز OTP (دقيقة)',
      labelEn: 'OTP Expiry (minutes)',
    },
    {
      group: 'parent_portal',
      key: 'show_session_notes',
      value: true,
      type: 'boolean',
      labelAr: 'إظهار ملاحظات الجلسات لولي الأمر',
      labelEn: 'Show Session Notes to Parents',
    },
    {
      group: 'parent_portal',
      key: 'show_invoices',
      value: true,
      type: 'boolean',
      labelAr: 'إظهار الفواتير لولي الأمر',
      labelEn: 'Show Invoices to Parents',
    },
    {
      group: 'parent_portal',
      key: 'allow_appointment_cancellation',
      value: true,
      type: 'boolean',
      labelAr: 'السماح لولي الأمر بإلغاء المواعيد',
      labelEn: 'Allow Parents to Cancel Appointments',
    },
  ];

  let createdCount = 0;
  let updatedCount = 0;

  for (const setting of settingsData) {
    const exists = await Setting.findOne({ group: setting.group, key: setting.key });
    if (!exists) {
      await Setting.create(setting);
      createdCount++;
    } else {
      // تحديث القيمة إذا كانت فارغة فقط
      if (exists.value === null || exists.value === undefined || exists.value === '') {
        await Setting.updateOne(
          { group: setting.group, key: setting.key },
          { $set: { value: setting.value } }
        );
        updatedCount++;
      }
    }
  }

  console.log(`  ✅ تم إنشاء ${createdCount} إعداد، تحديث ${updatedCount} إعداد`);
}

module.exports = { seedSettings, Setting };
