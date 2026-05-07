'use strict';

/**
 * documentWatermarkService — in-memory singleton (EventEmitter)
 * Flat-path barrel for watermark management operations.
 */

const EventEmitter = require('events');
const { createHash, randomUUID } = require('crypto');

const WATERMARK_PRESETS = {
  CONFIDENTIAL: {
    id: 'confidential',
    text: 'سري',
    color: '#FF0000',
    fontSize: 48,
    rotation: -45,
    position: 'center',
  },
  DRAFT: {
    id: 'draft',
    text: 'مسودة',
    color: '#808080',
    fontSize: 36,
    rotation: -30,
    position: 'center',
  },
  VOID: {
    id: 'void',
    text: 'ملغى',
    color: '#FF0000',
    fontSize: 48,
    rotation: 0,
    position: 'center',
  },
  COPY: {
    id: 'copy',
    text: 'نسخة',
    color: '#0000FF',
    fontSize: 36,
    rotation: -30,
    position: 'center',
  },
  APPROVED: {
    id: 'approved',
    text: 'معتمد',
    color: '#008000',
    fontSize: 36,
    rotation: 0,
    position: 'center',
  },
  REJECTED: {
    id: 'rejected',
    text: 'مرفوض',
    color: '#CC0000',
    fontSize: 36,
    rotation: 0,
    position: 'center',
  },
  INTERNAL: {
    id: 'internal',
    text: 'داخلي',
    color: '#FFA500',
    fontSize: 36,
    rotation: -30,
    position: 'center',
  },
  CLASSIFIED: {
    id: 'classified',
    text: 'مصنف',
    color: '#800080',
    fontSize: 36,
    rotation: -45,
    position: 'center',
  },
};

const PRESETS_ARRAY = Object.values(WATERMARK_PRESETS);

class DocumentWatermarkService extends EventEmitter {
  constructor() {
    super();
    this.watermarkHistory = [];
    this._orgTemplates = new Map();
    this.WATERMARK_PRESETS = WATERMARK_PRESETS;
  }

  // ── getPresets ─────────────────────────────────────────────────────────────
  getPresets() {
    return { success: true, data: PRESETS_ARRAY };
  }

  // ── applyWatermark ─────────────────────────────────────────────────────────
  async applyWatermark(documentId, opts = {}, user = {}) {
    const {
      preset,
      text: optsText,
      color,
      fontSize,
      fontFamily = 'Arial',
      rotation,
      position = 'center',
      opacity = 0.15,
      repeat = false,
      spacing = 200,
      includeDate = false,
      includeUserName = false,
      includeDocId = false,
    } = opts;

    // Base settings from preset or options
    const presetData = preset
      ? WATERMARK_PRESETS[preset] || WATERMARK_PRESETS[preset.toUpperCase()]
      : null;
    let baseText = optsText || (presetData && presetData.text) || 'Watermark';
    const finalColor = color || (presetData && presetData.color) || '#000000';
    const finalFontSize = fontSize || (presetData && presetData.fontSize) || 36;
    const finalRotation =
      rotation !== undefined ? rotation : (presetData && presetData.rotation) || -30;
    const finalPosition = position || (presetData && presetData.position) || 'center';

    // Text composition
    if (includeDate) {
      baseText += ' | ' + new Date().toISOString().slice(0, 10);
    }
    if (includeUserName && user.name) {
      baseText += ' | ' + user.name;
    }
    if (includeDocId) {
      baseText += ' #' + documentId;
    }

    const id = 'wm_' + randomUUID().replace(/-/g, '');
    const hash = createHash('sha256').update(`${documentId}:${baseText}:${id}`).digest('hex');

    const css = this._generateCSSWatermark({
      text: baseText,
      color: finalColor,
      fontSize: finalFontSize,
      fontFamily,
      rotation: finalRotation,
      position: finalPosition,
      opacity,
      repeat,
      spacing,
    });

    const svg = this._generateSVGWatermark({
      text: baseText,
      color: finalColor,
      fontSize: finalFontSize,
      rotation: finalRotation,
      repeat,
    });

    const entry = {
      id,
      documentId,
      text: baseText,
      isActive: true,
      hash,
      css,
      svg,
      preset: preset || null,
      appliedBy: user.id || null,
      appliedAt: new Date(),
      removedAt: null,
    };

    this.watermarkHistory.push(entry);
    this.emit('watermarkApplied', entry);

    return { success: true, data: entry };
  }

  // ── _generateCSSWatermark ─────────────────────────────────────────────────
  _generateCSSWatermark({
    text,
    color,
    fontSize,
    fontFamily,
    rotation,
    position,
    opacity,
    repeat,
    spacing,
  }) {
    if (repeat) {
      const bg = `url("data:image/svg+xml,${encodeURIComponent(this._generateSVGWatermark({ text, color, fontSize, rotation, repeat: true }))}")`;
      return {
        type: 'repeating',
        style: {
          backgroundImage: bg,
          backgroundRepeat: 'repeat',
          backgroundSize: `${spacing}px ${spacing}px`,
          opacity,
        },
      };
    }

    const positionStyles = this._getPositionStyle(position);
    return {
      type: 'single',
      text,
      style: {
        position: 'absolute',
        color,
        fontSize: `${fontSize}px`,
        fontFamily,
        transform: `rotate(${rotation}deg)`,
        opacity,
        pointerEvents: 'none',
        userSelect: 'none',
        ...positionStyles,
      },
    };
  }

  _getPositionStyle(position) {
    switch (position) {
      case 'top-left':
        return { top: '10%', left: '10%' };
      case 'top-right':
        return { top: '10%', right: '10%' };
      case 'bottom-left':
        return { bottom: '10%', left: '10%' };
      case 'bottom-right':
        return { bottom: '10%', right: '10%' };
      default:
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
  }

  // ── _generateSVGWatermark ─────────────────────────────────────────────────
  _generateSVGWatermark({ text, color, fontSize, rotation, repeat }) {
    const width = repeat ? 300 : 600;
    const height = repeat ? 300 : 200;
    const cx = width / 2;
    const cy = height / 2;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="${cx}" y="${cy}" fill="${color}" font-size="${fontSize}" transform="rotate(${rotation}, ${cx}, ${cy})" text-anchor="middle" dominant-baseline="middle" opacity="0.15">${text}</text></svg>`;
  }

  // ── removeWatermark ────────────────────────────────────────────────────────
  async removeWatermark(id, user = {}) {
    const wm = this.watermarkHistory.find(w => w.id === id);
    if (!wm) return { success: false, error: 'العلامة المائية غير موجودة' };

    wm.isActive = false;
    wm.removedAt = new Date();
    wm.removedBy = user.id || null;

    this.emit('watermarkRemoved', { id, documentId: wm.documentId });
    return { success: true, data: wm };
  }

  // ── getDocumentWatermarks ──────────────────────────────────────────────────
  async getDocumentWatermarks(documentId, activeOnly = true) {
    let data = this.watermarkHistory.filter(w => w.documentId === documentId);
    if (activeOnly) data = data.filter(w => w.isActive);
    return { success: true, data };
  }

  // ── createTemplate ─────────────────────────────────────────────────────────
  async createTemplate(orgId, { name, nameAr } = {}) {
    const id = 'wmt_' + randomUUID().replace(/-/g, '');
    if (!this._orgTemplates.has(orgId)) this._orgTemplates.set(orgId, []);
    const template = { id, orgId, name, nameAr, createdAt: new Date() };
    this._orgTemplates.get(orgId).push(template);
    return { success: true, data: template };
  }

  // ── getTemplates ───────────────────────────────────────────────────────────
  async getTemplates(orgId) {
    const presets = PRESETS_ARRAY;
    const customs = this._orgTemplates.get(orgId) || [];
    return { success: true, data: [...presets, ...customs] };
  }

  // ── verifyWatermark ────────────────────────────────────────────────────────
  async verifyWatermark(hash) {
    const wm = this.watermarkHistory.find(w => w.hash === hash);
    if (!wm) return { success: false, verified: false };
    return { success: true, verified: true, data: { documentId: wm.documentId } };
  }
}

const instance = new DocumentWatermarkService();
module.exports = instance;
