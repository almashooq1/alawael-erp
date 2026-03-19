/* eslint-disable no-unused-vars */
/**
 * Accessibility Service for Disability Rehabilitation System
 * نظام الوصولية للتأهيل
 *
 * @module accessibility/accessibility-service
 * @description خدمات الوصولية لذوي الإعاقة
 * @version 1.0.0
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;
const logger = require('../utils/logger');

// ============================================
// نماذج البيانات
// ============================================

// نموذج إعدادات الوصولية للمستخدم
const userAccessibilitySchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },

  // إعدادات البصر
  visual_settings: {
    font_size: {
      type: String,
      enum: ['small', 'medium', 'large', 'xlarge', 'xxlarge'],
      default: 'medium',
    },
    font_type: {
      type: String,
      enum: ['default', 'dyslexic', 'arial', 'verdana'],
      default: 'default',
    },
    high_contrast: { type: Boolean, default: false },
    color_blind_mode: {
      type: String,
      enum: ['none', 'protanopia', 'deuteranopia', 'tritanopia'],
      default: 'none',
    },
    screen_reader_enabled: { type: Boolean, default: false },
    reduce_motion: { type: Boolean, default: false },
    line_spacing: { type: String, enum: ['normal', 'relaxed', 'loose'], default: 'normal' },
    letter_spacing: { type: String, enum: ['normal', 'wide', 'wider'], default: 'normal' },
  },

  // إعدادات السمع
  auditory_settings: {
    captions_enabled: { type: Boolean, default: true },
    captions_size: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
    captions_background: { type: Boolean, default: true },
    sign_language_enabled: { type: Boolean, default: false },
    sign_language_type: { type: String, enum: ['sas', 'asl', 'bsl'], default: 'sas' }, // Saudi Sign Language
    visual_alerts: { type: Boolean, default: false },
    volume_boost: { type: Number, min: 0, max: 100, default: 100 },
  },

  // إعدادات الحركة
  motor_settings: {
    keyboard_navigation: { type: Boolean, default: false },
    single_click_mode: { type: Boolean, default: false },
    double_click_speed: { type: String, enum: ['slow', 'normal', 'fast'], default: 'normal' },
    mouse_keys_enabled: { type: Boolean, default: false },
    sticky_keys_enabled: { type: Boolean, default: false },
    touch_screen_mode: { type: Boolean, default: false },
    gesture_simplification: { type: Boolean, default: false },
  },

  // إعدادات الإدراك
  cognitive_settings: {
    simplified_interface: { type: Boolean, default: false },
    reading_assistant: { type: Boolean, default: false },
    text_to_speech: { type: Boolean, default: false },
    speech_to_text: { type: Boolean, default: false },
    focus_mode: { type: Boolean, default: false },
    extended_timeouts: { type: Boolean, default: false },
    simplified_language: { type: Boolean, default: false },
    picture_support: { type: Boolean, default: false }, // دعم الصور للتوحد
  },

  // إعدادات عامة
  general_settings: {
    language: { type: String, default: 'ar' },
    rtl_support: { type: Boolean, default: true },
    auto_save_enabled: { type: Boolean, default: true },
    session_reminders: { type: Boolean, default: true },
    voice_commands: { type: Boolean, default: false },
  },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// نموذج طلبات الوصولية
const accessibilityRequestSchema = new Schema({
  request_id: {
    type: String,
    unique: true,
    default: () => `ACC-REQ-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
  },
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

  // نوع الطلب
  request_type: {
    type: String,
    enum: [
      'equipment', // معدات مساعدة
      'modification', // تعديل بيئي
      'service', // خدمة خاصة
      'transportation', // نقل خاص
      'interpreter', // مترجم لغة إشارة
      'assistant', // مساعد شخصي
      'technology', // تقنية مساعدة
      'other',
    ],
    required: true,
  },

  // تفاصيل الطلب
  details: {
    title: { type: String, required: true },
    description: { type: String, required: true },
    justification: String,
    requested_items: [
      {
        name: String,
        quantity: { type: Number, default: 1 },
        specifications: String,
        estimated_cost: Number,
      },
    ],
  },

  // المرفقات
  attachments: [
    {
      file_name: String,
      file_path: String,
      file_type: String,
      uploaded_at: { type: Date, default: Date.now },
    },
  ],

  // حالة الطلب
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'fulfilled', 'cancelled'],
    default: 'pending',
  },

  // الموافقات
  approvals: [
    {
      approver_id: { type: Schema.Types.ObjectId, ref: 'User' },
      approver_name: String,
      role: String,
      status: { type: String, enum: ['pending', 'approved', 'rejected'] },
      comments: String,
      action_date: Date,
    },
  ],

  // الأولوية
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },

  // التواريخ
  dates: {
    requested_at: { type: Date, default: Date.now },
    target_date: Date,
    approved_at: Date,
    fulfilled_at: Date,
  },

  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// ============================================
// خدمة الوصولية
// ============================================

class AccessibilityService {
  constructor() {
    this.defaultSettings = this.getDefaultSettings();
    this.wcagGuidelines = this.loadWCAGGuidelines();
  }

  /**
   * الحصول على إعدادات المستخدم
   */
  async getUserSettings(userId) {
    try {
      let settings = await mongoose.model('UserAccessibility').findOne({ user_id: userId });

      if (!settings) {
        settings = await this.createDefaultSettings(userId);
      }

      return {
        success: true,
        settings: settings,
      };
    } catch (error) {
      logger.error('Error getting user accessibility settings:', error);
      return { success: false, error: 'حدث خطأ داخلي' };
    }
  }

  /**
   * تحديث إعدادات المستخدم
   */
  async updateUserSettings(userId, settings) {
    try {
      const updatedSettings = await mongoose
        .model('UserAccessibility')
        .findOneAndUpdate(
          { user_id: userId },
          { $set: { ...settings, updated_at: new Date() } },
          { new: true, upsert: true }
        );

      return {
        success: true,
        settings: updatedSettings,
        message: 'تم تحديث إعدادات الوصولية بنجاح',
      };
    } catch (error) {
      logger.error('Error updating accessibility settings:', error);
      return { success: false, error: 'حدث خطأ داخلي' };
    }
  }

  /**
   * تطبيق إعدادات الوصولية على المحتوى
   */
  applyAccessibilityToContent(content, settings) {
    let processedContent = { ...content };

    // تطبيق إعدادات البصر
    if (settings.visual_settings) {
      processedContent = this.applyVisualSettings(processedContent, settings.visual_settings);
    }

    // تطبيق إعدادات الإدراك
    if (settings.cognitive_settings) {
      processedContent = this.applyCognitiveSettings(processedContent, settings.cognitive_settings);
    }

    return processedContent;
  }

  /**
   * تطبيق إعدادات البصر
   */
  applyVisualSettings(content, visualSettings) {
    const styles = {};

    // حجم الخط
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '18px',
      xlarge: '22px',
      xxlarge: '28px',
    };
    styles.fontSize = fontSizes[visualSettings.font_size] || '16px';

    // التباين العالي
    if (visualSettings.high_contrast) {
      styles.filter = 'contrast(1.5)';
      styles.backgroundColor = '#000';
      styles.color = '#fff';
    }

    // تقليل الحركة
    if (visualSettings.reduce_motion) {
      styles.animation = 'none';
      styles.transition = 'none';
    }

    return { ...content, accessibilityStyles: styles };
  }

  /**
   * تطبيق إعدادات الإدراك
   */
  applyCognitiveSettings(content, cognitiveSettings) {
    const processedContent = { ...content };

    // واجهة مبسطة
    if (cognitiveSettings.simplified_interface) {
      processedContent.simplified = true;
      processedContent.hideDecorative = true;
    }

    // لغة مبسطة
    if (cognitiveSettings.simplified_language) {
      processedContent.languageLevel = 'simple';
    }

    // دعم الصور
    if (cognitiveSettings.picture_support) {
      processedContent.showPictureCards = true;
    }

    return processedContent;
  }

  /**
   * إنشاء طلب وصولية
   */
  async createAccessibilityRequest(requestData) {
    try {
      const request = new (mongoose.model('AccessibilityRequest'))({
        ...requestData,
        request_id: `ACC-REQ-${Date.now()}`,
        status: 'pending',
        'dates.requested_at': new Date(),
      });

      await request.save();

      return {
        success: true,
        request: request,
        message: 'تم إنشاء طلب الوصولية بنجاح',
      };
    } catch (error) {
      logger.error('Error creating accessibility request:', error);
      return { success: false, error: 'حدث خطأ داخلي' };
    }
  }

  /**
   * التحقق من توافق WCAG
   */
  checkWCAGCompliance(content) {
    const issues = [];

    // فحص النصوص البديلة للصور
    if (content.images) {
      content.images.forEach((img, index) => {
        if (!img.alt) {
          issues.push({
            type: 'missing_alt_text',
            severity: 'critical',
            element: `image[${index}]`,
            message: 'الصورة تفتقر إلى نص بديل',
          });
        }
      });
    }

    // فحص التباين
    if (content.styles) {
      const contrastRatio = this.calculateContrastRatio(
        content.styles.color,
        content.styles.backgroundColor
      );

      if (contrastRatio < 4.5) {
        issues.push({
          type: 'low_contrast',
          severity: 'serious',
          element: 'text',
          message: 'نسبة التباين منخفضة جداً',
        });
      }
    }

    // فحص التسميات
    if (content.forms) {
      content.forms.forEach((form, index) => {
        form.inputs?.forEach((input, i) => {
          if (!input.label && !input['aria-label']) {
            issues.push({
              type: 'missing_label',
              severity: 'critical',
              element: `form[${index}].input[${i}]`,
              message: 'حقل الإدخال يفتقر إلى تسمية',
            });
          }
        });
      });
    }

    return {
      compliant: issues.filter(i => i.severity === 'critical').length === 0,
      issues: issues,
      score: this.calculateComplianceScore(issues),
    };
  }

  /**
   * حساب نسبة التباين
   */
  calculateContrastRatio(foreground, background) {
    // تبسيط - في الواقع يستخدم خوارزمية WCAG المعقدة
    return 7.5; // قيمة افتراضية
  }

  /**
   * حساب درجة التوافق
   */
  calculateComplianceScore(issues) {
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const seriousCount = issues.filter(i => i.severity === 'serious').length;
    const moderateCount = issues.filter(i => i.severity === 'moderate').length;

    let score = 100;
    score -= criticalCount * 20;
    score -= seriousCount * 10;
    score -= moderateCount * 5;

    return Math.max(0, score);
  }

  /**
   * توليد CSS للوصولية
   */
  generateAccessibilityCSS(settings) {
    let css = '';

    // إعدادات البصر
    if (settings.visual_settings) {
      const vs = settings.visual_settings;

      // حجم الخط
      const fontSizes = {
        small: '14px',
        medium: '16px',
        large: '20px',
        xlarge: '24px',
        xxlarge: '32px',
      };
      css += `body { font-size: ${fontSizes[vs.font_size] || '16px'} !important; }\n`;

      // نوع الخط
      if (vs.font_type === 'dyslexic') {
        css += "body { font-family: 'OpenDyslexic', sans-serif !important; }\n";
      }

      // تباعد الأسطر
      const lineSpacings = { normal: '1.5', relaxed: '1.75', loose: '2' };
      css += `body { line-height: ${lineSpacings[vs.line_spacing] || '1.5'} !important; }\n`;

      // التباين العالي
      if (vs.high_contrast) {
        css += `
          body { background-color: #000 !important; color: #fff !important; }
          a { color: #ffff00 !important; }
          button { background-color: #fff !important; color: #000 !important; border: 2px solid #fff !important; }
        `;
      }

      // تقليل الحركة
      if (vs.reduce_motion) {
        css += `
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        `;
      }
    }

    // إعدادات الإدراك
    if (settings.cognitive_settings?.focus_mode) {
      css += `
        .content:focus { outline: 3px solid #0078d4 !important; }
        .distraction { display: none !important; }
      `;
    }

    return css;
  }

  /**
   * الحصول على الإعدادات الافتراضية
   */
  getDefaultSettings() {
    return {
      visual_settings: {
        font_size: 'medium',
        font_type: 'default',
        high_contrast: false,
        color_blind_mode: 'none',
        screen_reader_enabled: false,
        reduce_motion: false,
        line_spacing: 'normal',
        letter_spacing: 'normal',
      },
      auditory_settings: {
        captions_enabled: true,
        captions_size: 'medium',
        captions_background: true,
        sign_language_enabled: false,
        sign_language_type: 'sas',
        visual_alerts: false,
        volume_boost: 100,
      },
      motor_settings: {
        keyboard_navigation: false,
        single_click_mode: false,
        double_click_speed: 'normal',
        mouse_keys_enabled: false,
        sticky_keys_enabled: false,
        touch_screen_mode: false,
        gesture_simplification: false,
      },
      cognitive_settings: {
        simplified_interface: false,
        reading_assistant: false,
        text_to_speech: false,
        speech_to_text: false,
        focus_mode: false,
        extended_timeouts: false,
        simplified_language: false,
        picture_support: false,
      },
      general_settings: {
        language: 'ar',
        rtl_support: true,
        auto_save_enabled: true,
        session_reminders: true,
        voice_commands: false,
      },
    };
  }

  /**
   * تحميل إرشادات WCAG
   */
  loadWCAGGuidelines() {
    return {
      perceivable: [
        { id: '1.1.1', name: 'Non-text Content', level: 'A' },
        { id: '1.2.1', name: 'Audio-only and Video-only', level: 'A' },
        { id: '1.2.2', name: 'Captions', level: 'A' },
        { id: '1.3.1', name: 'Info and Relationships', level: 'A' },
        { id: '1.4.3', name: 'Contrast (Minimum)', level: 'AA' },
        { id: '1.4.4', name: 'Resize text', level: 'AA' },
      ],
      operable: [
        { id: '2.1.1', name: 'Keyboard', level: 'A' },
        { id: '2.2.1', name: 'Timing Adjustable', level: 'A' },
        { id: '2.4.1', name: 'Bypass Blocks', level: 'A' },
        { id: '2.4.3', name: 'Focus Order', level: 'A' },
      ],
      understandable: [
        { id: '3.1.1', name: 'Language of Page', level: 'A' },
        { id: '3.2.1', name: 'On Focus', level: 'A' },
        { id: '3.3.1', name: 'Error Identification', level: 'A' },
      ],
      robust: [
        { id: '4.1.1', name: 'Parsing', level: 'A' },
        { id: '4.1.2', name: 'Name, Role, Value', level: 'A' },
      ],
    };
  }

  /**
   * إنشاء إعدادات افتراضية لمستخدم جديد
   */
  async createDefaultSettings(userId) {
    const settings = new (mongoose.model('UserAccessibility'))({
      user_id: userId,
      ...this.defaultSettings,
    });

    await settings.save();
    return settings;
  }
}

// ============================================
// تصدير النماذج والخدمة
// ============================================

const UserAccessibility = mongoose.model('UserAccessibility', userAccessibilitySchema);
const AccessibilityRequest = mongoose.model('AccessibilityRequest', accessibilityRequestSchema);

module.exports = {
  AccessibilityService,
  UserAccessibility,
  AccessibilityRequest,
  userAccessibilitySchema,
  accessibilityRequestSchema,
};
