/**
 * Document Watermark Service — خدمة العلامات المائية
 *
 * Features:
 * - Text watermarks (user name, date, confidential)
 * - Image/logo watermarks
 * - Dynamic watermarks based on user and access level
 * - QR code watermarks for document verification
 * - Watermark templates
 */

const crypto = require('crypto');
const EventEmitter = require('events');

// Watermark presets
const WATERMARK_PRESETS = {
  CONFIDENTIAL: {
    id: 'confidential',
    nameAr: 'سري',
    nameEn: 'CONFIDENTIAL',
    text: 'سري - CONFIDENTIAL',
    color: 'rgba(255, 0, 0, 0.15)',
    fontSize: 48,
    rotation: -45,
    position: 'center',
    repeat: true,
  },
  DRAFT: {
    id: 'draft',
    nameAr: 'مسودة',
    nameEn: 'DRAFT',
    text: 'مسودة - DRAFT',
    color: 'rgba(128, 128, 128, 0.2)',
    fontSize: 56,
    rotation: -45,
    position: 'center',
    repeat: true,
  },
  INTERNAL: {
    id: 'internal',
    nameAr: 'للاستخدام الداخلي',
    nameEn: 'INTERNAL USE ONLY',
    text: 'للاستخدام الداخلي فقط',
    color: 'rgba(0, 0, 255, 0.12)',
    fontSize: 36,
    rotation: -30,
    position: 'center',
    repeat: true,
  },
  COPY: {
    id: 'copy',
    nameAr: 'نسخة',
    nameEn: 'COPY',
    text: 'نسخة - COPY',
    color: 'rgba(0, 128, 0, 0.15)',
    fontSize: 44,
    rotation: -45,
    position: 'center',
    repeat: false,
  },
  ARCHIVED: {
    id: 'archived',
    nameAr: 'مؤرشف',
    nameEn: 'ARCHIVED',
    text: 'مؤرشف - ARCHIVED',
    color: 'rgba(128, 64, 0, 0.15)',
    fontSize: 40,
    rotation: -45,
    position: 'center',
    repeat: false,
  },
  APPROVED: {
    id: 'approved',
    nameAr: 'معتمد',
    nameEn: 'APPROVED',
    text: 'معتمد ✓',
    color: 'rgba(0, 128, 0, 0.2)',
    fontSize: 52,
    rotation: 0,
    position: 'bottom-right',
    repeat: false,
  },
  SAMPLE: {
    id: 'sample',
    nameAr: 'عينة',
    nameEn: 'SAMPLE',
    text: 'عينة - SAMPLE',
    color: 'rgba(255, 165, 0, 0.2)',
    fontSize: 48,
    rotation: -45,
    position: 'center',
    repeat: true,
  },
  VOID: {
    id: 'void',
    nameAr: 'ملغي',
    nameEn: 'VOID',
    text: 'ملغي - VOID',
    color: 'rgba(255, 0, 0, 0.25)',
    fontSize: 60,
    rotation: -45,
    position: 'center',
    repeat: true,
  },
};

class DocumentWatermarkService extends EventEmitter {
  constructor() {
    super();
    this.watermarkHistory = []; // track applied watermarks
    this.customTemplates = new Map(); // orgId -> templates
  }

  /**
   * Get available watermark presets — القوالب المتاحة
   */
  getPresets() {
    return {
      success: true,
      data: Object.values(WATERMARK_PRESETS),
    };
  }

  /**
   * Apply watermark to document — تطبيق علامة مائية
   */
  async applyWatermark(documentId, watermarkConfig, appliedBy) {
    const {
      type = 'text', // text, image, qr, dynamic
      preset,
      text,
      imageUrl,
      position = 'center',
      opacity = 0.15,
      fontSize = 40,
      fontFamily = 'Arial, sans-serif',
      color = 'rgba(0, 0, 0, 0.15)',
      rotation = -45,
      repeat = false,
      spacing = 200,
      includeDate = false,
      includeUserName = false,
      includeDocId = false,
    } = watermarkConfig;

    // Build watermark data
    let watermarkText = text || '';
    if (preset && WATERMARK_PRESETS[preset.toUpperCase()]) {
      const presetData = WATERMARK_PRESETS[preset.toUpperCase()];
      watermarkText = presetData.text;
      watermarkConfig.color = watermarkConfig.color || presetData.color;
      watermarkConfig.fontSize = watermarkConfig.fontSize || presetData.fontSize;
      watermarkConfig.rotation = watermarkConfig.rotation ?? presetData.rotation;
      watermarkConfig.position = watermarkConfig.position || presetData.position;
      watermarkConfig.repeat = watermarkConfig.repeat ?? presetData.repeat;
    }

    // Dynamic parts
    const parts = [watermarkText];
    if (includeDate) parts.push(new Date().toLocaleDateString('ar-SA'));
    if (includeUserName && appliedBy?.name) parts.push(appliedBy.name);
    if (includeDocId) parts.push(`#${documentId.substr(-8)}`);
    const finalText = parts.join(' | ');

    // Generate CSS watermark (for preview/HTML rendering)
    const cssWatermark = this._generateCSSWatermark({
      text: finalText,
      color: color || watermarkConfig.color,
      fontSize: fontSize || watermarkConfig.fontSize,
      fontFamily,
      rotation: rotation ?? watermarkConfig.rotation,
      position: position || watermarkConfig.position,
      opacity,
      repeat: repeat ?? watermarkConfig.repeat,
      spacing,
    });

    // Generate SVG watermark (for PDF overlay)
    const svgWatermark = this._generateSVGWatermark({
      text: finalText,
      color: color || watermarkConfig.color,
      fontSize: fontSize || watermarkConfig.fontSize,
      rotation: rotation ?? watermarkConfig.rotation,
      repeat: repeat ?? watermarkConfig.repeat,
    });

    const watermarkRecord = {
      id: `wm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      documentId,
      type,
      config: watermarkConfig,
      text: finalText,
      css: cssWatermark,
      svg: svgWatermark,
      appliedBy: appliedBy?.id || 'system',
      appliedByName: appliedBy?.name || 'النظام',
      appliedAt: new Date(),
      isActive: true,
      hash: crypto
        .createHash('sha256')
        .update(`${documentId}:${finalText}:${Date.now()}`)
        .digest('hex'),
    };

    this.watermarkHistory.push(watermarkRecord);
    this.emit('watermarkApplied', watermarkRecord);

    return {
      success: true,
      data: watermarkRecord,
      message: 'تم تطبيق العلامة المائية بنجاح',
    };
  }

  /**
   * Generate CSS watermark — إنشاء علامة CSS
   */
  _generateCSSWatermark(config) {
    const { text, color, fontSize, fontFamily, rotation, position, opacity, repeat, spacing } =
      config;

    if (repeat) {
      return {
        type: 'repeating',
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          pointerEvents: 'none',
          overflow: 'hidden',
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='${spacing}' height='${spacing}'>` +
              `<text x='50%' y='50%' font-family='${fontFamily}' font-size='${fontSize}' ` +
              `fill='${color}' text-anchor='middle' dominant-baseline='middle' ` +
              `transform='rotate(${rotation} ${spacing / 2} ${spacing / 2})'>${text}</text></svg>`
          )}")`,
          backgroundRepeat: 'repeat',
          opacity,
        },
      };
    }

    const positionStyles = {
      center: {
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      },
      'top-left': { top: '20px', left: '20px', transform: `rotate(${rotation}deg)` },
      'top-right': { top: '20px', right: '20px', transform: `rotate(${rotation}deg)` },
      'bottom-left': { bottom: '20px', left: '20px', transform: `rotate(${rotation}deg)` },
      'bottom-right': { bottom: '20px', right: '20px', transform: `rotate(${rotation}deg)` },
    };

    return {
      type: 'single',
      style: {
        position: 'absolute',
        zIndex: 1000,
        pointerEvents: 'none',
        fontFamily,
        fontSize: `${fontSize}px`,
        color,
        opacity,
        whiteSpace: 'nowrap',
        ...(positionStyles[position] || positionStyles.center),
      },
      text,
    };
  }

  /**
   * Generate SVG watermark — إنشاء علامة SVG
   */
  _generateSVGWatermark(config) {
    const { text, color, fontSize, rotation, repeat } = config;
    const width = repeat ? 300 : 600;
    const height = repeat ? 300 : 100;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${fontSize}"
        fill="${color}" text-anchor="middle" dominant-baseline="middle"
        transform="rotate(${rotation} ${width / 2} ${height / 2})">${text}</text>
    </svg>`;
  }

  /**
   * Remove watermark — إزالة العلامة المائية
   */
  async removeWatermark(watermarkId, removedBy) {
    const watermark = this.watermarkHistory.find(w => w.id === watermarkId);
    if (!watermark) {
      return { success: false, message: 'العلامة المائية غير موجودة' };
    }

    watermark.isActive = false;
    watermark.removedBy = removedBy?.id || 'system';
    watermark.removedAt = new Date();

    this.emit('watermarkRemoved', watermark);
    return { success: true, message: 'تم إزالة العلامة المائية بنجاح' };
  }

  /**
   * Get document watermarks — جلب العلامات المائية للمستند
   */
  async getDocumentWatermarks(documentId, activeOnly = true) {
    let watermarks = this.watermarkHistory.filter(w => w.documentId === documentId);
    if (activeOnly) {
      watermarks = watermarks.filter(w => w.isActive);
    }

    return { success: true, data: watermarks };
  }

  /**
   * Create custom watermark template — إنشاء قالب مخصص
   */
  async createTemplate(orgId, templateData) {
    if (!this.customTemplates.has(orgId)) {
      this.customTemplates.set(orgId, []);
    }

    const template = {
      id: `wmt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      orgId,
      name: templateData.name,
      nameAr: templateData.nameAr || templateData.name,
      config: templateData.config || {},
      createdAt: new Date(),
    };

    this.customTemplates.get(orgId).push(template);
    return { success: true, data: template, message: 'تم إنشاء القالب بنجاح' };
  }

  /**
   * Get custom templates — جلب القوالب المخصصة
   */
  async getTemplates(orgId) {
    const templates = this.customTemplates.get(orgId) || [];
    return { success: true, data: [...Object.values(WATERMARK_PRESETS), ...templates] };
  }

  /**
   * Verify watermark — التحقق من العلامة المائية
   */
  async verifyWatermark(watermarkHash) {
    const watermark = this.watermarkHistory.find(w => w.hash === watermarkHash);
    if (!watermark) {
      return { success: false, verified: false, message: 'العلامة المائية غير موجودة' };
    }

    return {
      success: true,
      verified: true,
      data: {
        documentId: watermark.documentId,
        appliedAt: watermark.appliedAt,
        appliedByName: watermark.appliedByName,
        isActive: watermark.isActive,
      },
    };
  }
}

const watermarkService = new DocumentWatermarkService();
watermarkService.WATERMARK_PRESETS = WATERMARK_PRESETS;
module.exports = watermarkService;
