/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');

const OrgBrandingSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true,
    },
    // الهوية الأساسية
    name: { type: String, default: 'نظام مراكز الأوائل للرعاية النهارية' },
    nameEn: { type: String, default: 'Al-Awael Day Care Centers System' },
    shortName: { type: String, default: 'الأوائل' },
    tagline: { type: String, default: 'رعاية متميزة... مستقبل مشرق' },
    taglineEn: { type: String, default: 'Distinguished Care... Bright Future' },
    description: { type: String, default: '' },

    // الشعار والأيقونات
    logo: { type: String, default: '' }, // base64 أو URL
    favicon: { type: String, default: '' },

    // الألوان
    color: { type: String, default: '#667eea' },
    secondaryColor: { type: String, default: '#764ba2' },
    accentColor: { type: String, default: '#f093fb' },
    headerBgColor: { type: String, default: '#ffffff' },
    sidebarBgColor: { type: String, default: '#ffffff' },
    footerBgColor: { type: String, default: '#f5f5f5' },

    // الخطوط والتصميم
    fontFamily: { type: String, default: 'Cairo' },
    headingFontFamily: { type: String, default: 'Cairo' },
    fontSize: { type: Number, default: 14 },
    borderRadius: { type: Number, default: 8 },
    sidebarStyle: {
      type: String,
      enum: ['default', 'compact', 'modern', 'gradient'],
      default: 'default',
    },
    sidebarWidth: { type: Number, default: 280 },

    // التأثيرات البصرية
    enableAnimations: { type: Boolean, default: true },
    enableGlassEffect: { type: Boolean, default: true },
    enableShadows: { type: Boolean, default: true },
    compactMode: { type: Boolean, default: false },
    darkMode: { type: Boolean, default: false },
    autoDarkMode: { type: Boolean, default: false },

    // صفحة تسجيل الدخول
    loginBgType: { type: String, enum: ['gradient', 'solid', 'image'], default: 'gradient' },
    loginBgColor: { type: String, default: '#667eea' },
    loginBgGradient: { type: String, default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    loginBgImage: { type: String, default: '' },
    loginCardStyle: { type: String, enum: ['glass', 'solid', 'minimal'], default: 'glass' },
    loginShowLogo: { type: Boolean, default: true },
    loginShowTagline: { type: Boolean, default: true },

    // التذييل
    footerText: {
      type: String,
      default: '© {year} نظام مراكز الأوائل للرعاية النهارية - جميع الحقوق محفوظة',
    },

    // خيارات متقدمة
    enableWatermark: { type: Boolean, default: false },
    watermarkText: { type: String, default: 'مراكز الأوائل' },
    enableCustomCSS: { type: Boolean, default: false },
    customCSS: { type: String, default: '' },
    enableRTL: { type: Boolean, default: true },
    showBreadcrumbs: { type: Boolean, default: true },
    showSearchBar: { type: Boolean, default: true },
    showNotifications: { type: Boolean, default: true },
    enableMultiLanguage: { type: Boolean, default: true },
    defaultLanguage: { type: String, default: 'ar' },

    // ثيم مُطبّق
    appliedTheme: { type: String, default: 'default' },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('OrgBranding', OrgBrandingSchema);
