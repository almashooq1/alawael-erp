const mongoose = require('mongoose');

// ============================================
// System Settings Schema — إعدادات النظام
// Singleton document (one per tenant/org)
// ============================================

const SystemSettingsSchema = new mongoose.Schema(
  {
    /* ── General ────────────────────────── */
    general: {
      systemName: { type: String, default: 'نظام الأوائل الشامل' },
      systemVersion: { type: String, default: 'v3.0.0' },
      description: { type: String, default: 'نظام متكامل لإدارة المراكز التأهيلية والعيادات' },
      language: { type: String, enum: ['ar', 'en', 'fr'], default: 'ar' },
      supportLevel: {
        type: String,
        enum: ['basic', 'standard', 'premium', 'enterprise'],
        default: 'premium',
      },
      timezone: { type: String, default: 'Asia/Riyadh' },
      dateFormat: {
        type: String,
        enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
        default: 'DD/MM/YYYY',
      },
      currency: { type: String, default: 'SAR' },
      logo: { type: String, default: '' },
      favicon: { type: String, default: '' },
      maintenanceMode: { type: Boolean, default: false },
      maintenanceMessage: { type: String, default: 'النظام قيد الصيانة. يرجى المحاولة لاحقاً.' },
      maxUploadSize: { type: Number, default: 10 }, // MB
      allowedFileTypes: {
        type: [String],
        default: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'png'],
      },
    },

    /* ── Appearance / Branding ─────────── */
    appearance: {
      theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
      primaryColor: { type: String, default: '#1976d2' },
      secondaryColor: { type: String, default: '#dc004e' },
      sidebarColor: { type: String, default: '#1e293b' },
      fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
      compactMode: { type: Boolean, default: false },
      showLogo: { type: Boolean, default: true },
      customCSS: { type: String, default: '' },
    },

    /* ── Security ──────────────────────── */
    security: {
      twoFactorAuth: { type: Boolean, default: true },
      encryptData: { type: Boolean, default: true },
      sessionTimeout: { type: Number, default: 30 }, // minutes
      maxLoginAttempts: { type: Number, default: 5 },
      lockoutDuration: { type: Number, default: 15 }, // minutes
      ipWhitelist: { type: Boolean, default: false },
      ipWhitelistAddresses: { type: [String], default: [] },
      enforcePasswordPolicy: { type: Boolean, default: true },
      passwordMinLength: { type: Number, default: 8 },
      passwordRequireUppercase: { type: Boolean, default: true },
      passwordRequireNumbers: { type: Boolean, default: true },
      passwordRequireSpecial: { type: Boolean, default: true },
      passwordExpiryDays: { type: Number, default: 90 },
      enableAuditLog: { type: Boolean, default: true },
      enableCaptcha: { type: Boolean, default: false },
      allowedOrigins: { type: [String], default: ['*'] },
    },

    /* ── Notifications ─────────────────── */
    notifications: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      whatsappNotifications: { type: Boolean, default: false },
      notificationEmail: { type: String, default: '' },
      smsPhone: { type: String, default: '' },
      digestFrequency: {
        type: String,
        enum: ['realtime', 'hourly', 'daily', 'weekly'],
        default: 'realtime',
      },
      quietHoursEnabled: { type: Boolean, default: false },
      quietHoursStart: { type: String, default: '22:00' },
      quietHoursEnd: { type: String, default: '07:00' },
      notifyOnNewUser: { type: Boolean, default: true },
      notifyOnPayment: { type: Boolean, default: true },
      notifyOnError: { type: Boolean, default: true },
    },

    /* ── Email / SMTP ──────────────────── */
    email: {
      smtpServer: { type: String, default: '' },
      smtpPort: { type: Number, default: 587 },
      fromEmail: { type: String, default: '' },
      fromName: { type: String, default: 'نظام الأوائل' },
      username: { type: String, default: '' },
      password: { type: String, default: '' },
      enableSSL: { type: Boolean, default: true },
      enableTLS: { type: Boolean, default: true },
      maxRetrySend: { type: Number, default: 3 },
      testEmailSent: { type: Boolean, default: false },
    },

    /* ── Database / Backup ─────────────── */
    backup: {
      autoBackup: { type: Boolean, default: true },
      backupFrequency: { type: Number, default: 24 }, // hours
      backupRetention: { type: Number, default: 30 }, // days
      backupLocation: { type: String, default: 'local' },
      lastBackupDate: { type: Date, default: null },
      lastBackupStatus: {
        type: String,
        enum: ['success', 'failed', 'pending', 'none'],
        default: 'none',
      },
      compressionEnabled: { type: Boolean, default: true },
      encryptBackup: { type: Boolean, default: false },
    },

    /* ── Integrations ──────────────────── */
    integrations: {
      googleMapsApiKey: { type: String, default: '' },
      smsGateway: { type: String, enum: ['none', 'twilio', 'unifonic', 'mobily'], default: 'none' },
      smsApiKey: { type: String, default: '' },
      whatsappApiKey: { type: String, default: '' },
      paymentGateway: {
        type: String,
        enum: ['none', 'moyasar', 'hyperpay', 'tap', 'stripe'],
        default: 'none',
      },
      paymentApiKey: { type: String, default: '' },
      enableWebhooks: { type: Boolean, default: false },
      webhookUrl: { type: String, default: '' },
      enableApi: { type: Boolean, default: true },
      apiRateLimit: { type: Number, default: 100 }, // per minute
    },

    /* ── Regional / Compliance ─────────── */
    regional: {
      country: { type: String, default: 'SA' },
      region: { type: String, default: 'الرياض' },
      vatNumber: { type: String, default: '' },
      vatRate: { type: Number, default: 15 },
      enableZakat: { type: Boolean, default: true },
      enableVAT: { type: Boolean, default: true },
      fiscalYearStart: { type: String, default: '01-01' },
      complianceMode: { type: String, enum: ['saudi', 'gcc', 'international'], default: 'saudi' },
    },

    /* ── Audit Fields ──────────────────── */
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changeHistory: [
      {
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now },
        section: String,
        changes: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true }
);

// Ensure only one settings document exists (singleton)
SystemSettingsSchema.statics.getInstance = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

// Record changes for audit trail
SystemSettingsSchema.methods.recordChange = function (userId, section, changes) {
  this.changeHistory.push({
    changedBy: userId,
    changedAt: new Date(),
    section,
    changes,
  });
  // Keep last 100 change records
  if (this.changeHistory.length > 100) {
    this.changeHistory = this.changeHistory.slice(-100);
  }
};

module.exports = mongoose.models.SystemSettings || mongoose.model('SystemSettings', SystemSettingsSchema);
