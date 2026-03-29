/**
 * System Settings Seed
 * الإعدادات الأساسية للنظام - Al-Awael ERP
 */

'use strict';

const settings = [
  // ─── المؤسسة ───────────────────────────────────────────────
  {
    key: 'org.name.ar',
    value: 'مركز الأوائل للتأهيل',
    group: 'organization',
    type: 'string',
    public: true,
  },
  {
    key: 'org.name.en',
    value: 'Al-Awael Rehabilitation Center',
    group: 'organization',
    type: 'string',
    public: true,
  },
  {
    key: 'org.logo',
    value: '/assets/logo.png',
    group: 'organization',
    type: 'string',
    public: true,
  },
  {
    key: 'org.website',
    value: 'https://alawael.com.sa',
    group: 'organization',
    type: 'string',
    public: true,
  },
  {
    key: 'org.email',
    value: 'info@alawael.com.sa',
    group: 'organization',
    type: 'string',
    public: false,
  },
  {
    key: 'org.phone',
    value: '+966-11-0000000',
    group: 'organization',
    type: 'string',
    public: true,
  },
  { key: 'org.crNumber', value: '', group: 'organization', type: 'string', public: false },
  { key: 'org.vatNumber', value: '', group: 'organization', type: 'string', public: false },
  { key: 'org.address.city', value: 'الرياض', group: 'organization', type: 'string', public: true },
  { key: 'org.address.country', value: 'SA', group: 'organization', type: 'string', public: true },

  // ─── الترقيم التلقائي ─────────────────────────────────────
  {
    key: 'numbering.beneficiary.prefix',
    value: 'BEN',
    group: 'numbering',
    type: 'string',
    public: false,
  },
  {
    key: 'numbering.beneficiary.start',
    value: 1000,
    group: 'numbering',
    type: 'number',
    public: false,
  },
  {
    key: 'numbering.beneficiary.padding',
    value: 6,
    group: 'numbering',
    type: 'number',
    public: false,
  },
  {
    key: 'numbering.employee.prefix',
    value: 'EMP',
    group: 'numbering',
    type: 'string',
    public: false,
  },
  {
    key: 'numbering.employee.start',
    value: 1000,
    group: 'numbering',
    type: 'number',
    public: false,
  },
  {
    key: 'numbering.invoice.prefix',
    value: 'INV',
    group: 'numbering',
    type: 'string',
    public: false,
  },
  {
    key: 'numbering.invoice.start',
    value: 1000,
    group: 'numbering',
    type: 'number',
    public: false,
  },
  {
    key: 'numbering.session.prefix',
    value: 'SES',
    group: 'numbering',
    type: 'string',
    public: false,
  },

  // ─── الوقت والتاريخ ───────────────────────────────────────
  { key: 'locale.timezone', value: 'Asia/Riyadh', group: 'locale', type: 'string', public: true },
  { key: 'locale.defaultLang', value: 'ar', group: 'locale', type: 'string', public: true },
  { key: 'locale.dateFormat', value: 'DD/MM/YYYY', group: 'locale', type: 'string', public: true },
  { key: 'locale.timeFormat', value: 'HH:mm', group: 'locale', type: 'string', public: true },
  { key: 'locale.currency', value: 'SAR', group: 'locale', type: 'string', public: true },
  { key: 'locale.currencySymbol', value: 'ر.س', group: 'locale', type: 'string', public: true },
  { key: 'locale.calendarType', value: 'gregorian', group: 'locale', type: 'string', public: true },

  // ─── ساعات العمل ──────────────────────────────────────────
  { key: 'workHours.start', value: '08:00', group: 'workHours', type: 'string', public: true },
  { key: 'workHours.end', value: '16:00', group: 'workHours', type: 'string', public: true },
  { key: 'workHours.daysPerWeek', value: 5, group: 'workHours', type: 'number', public: true },
  {
    key: 'workHours.weekends',
    value: ['friday', 'saturday'],
    group: 'workHours',
    type: 'json',
    public: true,
  },
  { key: 'workHours.sessionDuration', value: 45, group: 'workHours', type: 'number', public: true },
  {
    key: 'workHours.breakBetweenSessions',
    value: 15,
    group: 'workHours',
    type: 'number',
    public: true,
  },

  // ─── الأمان والمصادقة ─────────────────────────────────────
  { key: 'security.passwordMinLength', value: 8, group: 'security', type: 'number', public: false },
  {
    key: 'security.passwordExpireDays',
    value: 90,
    group: 'security',
    type: 'number',
    public: false,
  },
  {
    key: 'security.sessionTimeoutMins',
    value: 480,
    group: 'security',
    type: 'number',
    public: false,
  },
  { key: 'security.maxLoginAttempts', value: 5, group: 'security', type: 'number', public: false },
  {
    key: 'security.lockoutDurationMins',
    value: 30,
    group: 'security',
    type: 'number',
    public: false,
  },
  {
    key: 'security.twoFactorEnabled',
    value: false,
    group: 'security',
    type: 'boolean',
    public: false,
  },
  {
    key: 'security.ipWhitelistEnabled',
    value: false,
    group: 'security',
    type: 'boolean',
    public: false,
  },
  {
    key: 'security.auditLogRetentionDays',
    value: 365,
    group: 'security',
    type: 'number',
    public: false,
  },

  // ─── ZATCA / الفوترة الإلكترونية ─────────────────────────
  { key: 'zatca.enabled', value: false, group: 'zatca', type: 'boolean', public: false },
  { key: 'zatca.env', value: 'sandbox', group: 'zatca', type: 'string', public: false },
  { key: 'zatca.vatRate', value: 0.15, group: 'zatca', type: 'number', public: true },
  { key: 'zatca.invoiceType', value: 'simplified', group: 'zatca', type: 'string', public: false },

  // ─── الإشعارات ────────────────────────────────────────────
  {
    key: 'notifications.email.enabled',
    value: false,
    group: 'notifications',
    type: 'boolean',
    public: false,
  },
  {
    key: 'notifications.sms.enabled',
    value: false,
    group: 'notifications',
    type: 'boolean',
    public: false,
  },
  {
    key: 'notifications.push.enabled',
    value: false,
    group: 'notifications',
    type: 'boolean',
    public: false,
  },
  {
    key: 'notifications.whatsapp.enabled',
    value: false,
    group: 'notifications',
    type: 'boolean',
    public: false,
  },
  {
    key: 'notifications.retentionDays',
    value: 30,
    group: 'notifications',
    type: 'number',
    public: false,
  },

  // ─── التخزين والملفات ─────────────────────────────────────
  { key: 'storage.provider', value: 'local', group: 'storage', type: 'string', public: false },
  { key: 'storage.maxFileSizeMB', value: 50, group: 'storage', type: 'number', public: false },
  {
    key: 'storage.allowedTypes',
    value: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'mp4'],
    group: 'storage',
    type: 'json',
    public: false,
  },

  // ─── الميزات (Feature Flags) ──────────────────────────────
  { key: 'features.teleRehab', value: false, group: 'features', type: 'boolean', public: true },
  { key: 'features.mobileApp', value: false, group: 'features', type: 'boolean', public: true },
  { key: 'features.aiAssistant', value: false, group: 'features', type: 'boolean', public: true },
  { key: 'features.elearning', value: false, group: 'features', type: 'boolean', public: true },
  { key: 'features.waitlist', value: true, group: 'features', type: 'boolean', public: true },
  { key: 'features.familyPortal', value: false, group: 'features', type: 'boolean', public: true },
  { key: 'features.employeeApp', value: false, group: 'features', type: 'boolean', public: true },

  // ─── الدعم ────────────────────────────────────────────────
  { key: 'support.phone', value: '920000000', group: 'support', type: 'string', public: true },
  {
    key: 'support.email',
    value: 'support@alawael.com.sa',
    group: 'support',
    type: 'string',
    public: true,
  },
  {
    key: 'support.hours',
    value: 'Sun-Thu 8AM-4PM',
    group: 'support',
    type: 'string',
    public: true,
  },

  // ─── إصدار النظام ─────────────────────────────────────────
  { key: 'system.version', value: '2.0.0', group: 'system', type: 'string', public: true },
  {
    key: 'system.dbSchemaVersion',
    value: '2025.02.01',
    group: 'system',
    type: 'string',
    public: false,
  },
  { key: 'system.maintenanceMode', value: false, group: 'system', type: 'boolean', public: true },
  {
    key: 'system.allowRegistration',
    value: false,
    group: 'system',
    type: 'boolean',
    public: false,
  },
];

async function seed(connection) {
  const db = connection.db || connection;
  const col = db.collection('systemsettings');

  let upserted = 0;
  let skipped = 0;

  for (const s of settings) {
    const result = await col.updateOne(
      { key: s.key },
      {
        $setOnInsert: {
          ...s,
          createdAt: new Date(),
          updatedAt: new Date(),
          isSystem: true,
        },
        $set: { updatedAt: new Date() },
      },
      { upsert: true }
    );
    if (result.upsertedCount > 0) upserted++;
    else skipped++;
  }

  console.log(`  ✔ system-settings: ${upserted} inserted, ${skipped} already existed`);
}

async function down(connection) {
  const db = connection.db || connection;
  await db.collection('systemsettings').deleteMany({ isSystem: true });
  console.log('  ✔ system-settings: removed system settings');
}

module.exports = { seed, down };
