/**
 * Document QR Code Service — خدمة رمز الاستجابة السريعة
 *
 * @deprecated Use services/documents/documentQRCode.service.js instead.
 * Kept for documentAdvanced.routes.js legacy compatibility.
 * Migration tracked in docs/technical-debt/consolidation-roadmap.md.
 *
 * Features:
 * - Generate QR codes for document verification
 * - QR codes for quick access links
 * - Scan-to-view document details
 * - Batch QR code generation
 * - QR code tracking and analytics
 */

const crypto = require('crypto');
const EventEmitter = require('events');

class DocumentQRService extends EventEmitter {
  constructor() {
    super();
    this.qrCodes = new Map(); // qrId -> qr info
    this.scanHistory = []; // scan events
    this.baseUrl = process.env.APP_URL || 'https://alawael.app';
  }

  /**
   * Generate QR code for document — إنشاء رمز QR للمستند
   */
  async generateQR(documentId, options = {}) {
    const {
      type = 'verification', // verification, access, download, info
      size = 256,
      color = '#000000',
      backgroundColor = '#FFFFFF',
      includelogo = false,
      expiresInDays = 0, // 0 = no expiry
      maxScans = 0, // 0 = unlimited
      password = null,
      generatedBy,
      generatedByName,
    } = options;

    const qrId = `qr_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    const verificationCode = crypto.randomBytes(16).toString('hex');

    // Build QR content URL based on type
    let qrUrl;
    switch (type) {
      case 'verification':
        qrUrl = `${this.baseUrl}/verify/${verificationCode}`;
        break;
      case 'access':
        qrUrl = `${this.baseUrl}/doc/${documentId}?ref=${qrId}`;
        break;
      case 'download':
        qrUrl = `${this.baseUrl}/download/${documentId}?token=${verificationCode}`;
        break;
      case 'info':
        qrUrl = `${this.baseUrl}/info/${documentId}`;
        break;
      default:
        qrUrl = `${this.baseUrl}/verify/${verificationCode}`;
    }

    const qrData = {
      id: qrId,
      documentId,
      type,
      url: qrUrl,
      verificationCode,
      // QR appearance
      size,
      color,
      backgroundColor,
      includeLogo: includelogo,
      // QR SVG data (simple QR representation)
      svgData: this._generateQRSVG(qrUrl, size, color, backgroundColor),
      // Metadata for rendering
      dataUrl: `data:image/svg+xml,${encodeURIComponent(this._generateQRSVG(qrUrl, size, color, backgroundColor))}`,
      // Security
      password: password ? crypto.createHash('sha256').update(password).digest('hex') : null,
      expiresAt:
        expiresInDays > 0 ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null,
      maxScans: maxScans || 0,
      scanCount: 0,
      // Tracking
      generatedBy: generatedBy || 'system',
      generatedByName: generatedByName || 'النظام',
      status: 'active', // active, expired, disabled, limit_reached
      createdAt: new Date(),
    };

    this.qrCodes.set(qrId, qrData);
    this.emit('qrGenerated', qrData);

    return {
      success: true,
      data: qrData,
      message: 'تم إنشاء رمز QR بنجاح',
    };
  }

  /**
   * Generate simple QR SVG — إنشاء SVG لرمز QR
   * (Simplified representation - production would use a proper QR library)
   */
  _generateQRSVG(data, size, color, bgColor) {
    const hash = crypto.createHash('md5').update(data).digest('hex');
    const modules = 21; // QR version 1
    const cellSize = size / modules;

    let cells = '';
    for (let row = 0; row < modules; row++) {
      for (let col = 0; col < modules; col++) {
        // Finder patterns (corners)
        const isFinderPattern =
          (row < 7 && col < 7) ||
          (row < 7 && col >= modules - 7) ||
          (row >= modules - 7 && col < 7);

        // Generate pseudo-random pattern from hash
        const hashIndex = (row * modules + col) % hash.length;
        const isFilled = isFinderPattern
          ? this._isFinderPatternFilled(row, col, modules)
          : parseInt(hash[hashIndex], 16) > 7;

        if (isFilled) {
          cells += `<rect x="${col * cellSize}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}" fill="${color}"/>`;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="${bgColor}"/>
      ${cells}
      <text x="${size / 2}" y="${size + 16}" font-family="Arial" font-size="10" text-anchor="middle" fill="${color}">مسح للتحقق</text>
    </svg>`;
  }

  /**
   * Check if position is in finder pattern
   */
  _isFinderPatternFilled(row, col, modules) {
    // Top-left
    if (row < 7 && col < 7) {
      if (row === 0 || row === 6 || col === 0 || col === 6) return true;
      if (row >= 2 && row <= 4 && col >= 2 && col <= 4) return true;
      return false;
    }
    // Top-right
    if (row < 7 && col >= modules - 7) {
      const c = col - (modules - 7);
      if (row === 0 || row === 6 || c === 0 || c === 6) return true;
      if (row >= 2 && row <= 4 && c >= 2 && c <= 4) return true;
      return false;
    }
    // Bottom-left
    if (row >= modules - 7 && col < 7) {
      const r = row - (modules - 7);
      if (r === 0 || r === 6 || col === 0 || col === 6) return true;
      if (r >= 2 && r <= 4 && col >= 2 && col <= 4) return true;
      return false;
    }
    return false;
  }

  /**
   * Scan/verify QR code — مسح/التحقق من رمز QR
   */
  async scanQR(qrId, scanData = {}) {
    const qr = this.qrCodes.get(qrId);
    if (!qr) {
      // Try finding by verification code
      for (const [, qrData] of this.qrCodes) {
        if (qrData.verificationCode === qrId) {
          return this._processScan(qrData, scanData);
        }
      }
      return { success: false, message: 'رمز QR غير صالح' };
    }

    return this._processScan(qr, scanData);
  }

  /**
   * Process QR scan — معالجة مسح QR
   */
  async _processScan(qr, scanData) {
    // Check if expired
    if (qr.expiresAt && new Date(qr.expiresAt) < new Date()) {
      qr.status = 'expired';
      return { success: false, message: 'رمز QR منتهي الصلاحية', expired: true };
    }

    // Check scan limit
    if (qr.maxScans > 0 && qr.scanCount >= qr.maxScans) {
      qr.status = 'limit_reached';
      return { success: false, message: 'تم الوصول للحد الأقصى من عمليات المسح' };
    }

    // Check if disabled
    if (qr.status === 'disabled') {
      return { success: false, message: 'رمز QR معطل' };
    }

    // Check password
    if (qr.password && scanData.password) {
      const providedHash = crypto.createHash('sha256').update(scanData.password).digest('hex');
      if (providedHash !== qr.password) {
        return { success: false, message: 'كلمة المرور غير صحيحة' };
      }
    }

    // Record scan
    qr.scanCount++;
    const scanEvent = {
      id: `scan_${Date.now()}`,
      qrId: qr.id,
      documentId: qr.documentId,
      scannedBy: scanData.userId || 'anonymous',
      scannedByName: scanData.userName || 'مجهول',
      ipAddress: scanData.ipAddress || 'unknown',
      userAgent: scanData.userAgent || 'unknown',
      location: scanData.location || null,
      scannedAt: new Date(),
    };

    this.scanHistory.push(scanEvent);
    this.emit('qrScanned', scanEvent);

    return {
      success: true,
      data: {
        documentId: qr.documentId,
        type: qr.type,
        url: qr.url,
        verified: true,
        generatedByName: qr.generatedByName,
        createdAt: qr.createdAt,
      },
      message: 'تم التحقق بنجاح',
    };
  }

  /**
   * Disable QR code — تعطيل رمز QR
   */
  async disableQR(qrId) {
    const qr = this.qrCodes.get(qrId);
    if (!qr) return { success: false, message: 'رمز QR غير موجود' };

    qr.status = 'disabled';
    qr.disabledAt = new Date();

    return { success: true, message: 'تم تعطيل رمز QR' };
  }

  /**
   * Get document QR codes — جلب رموز QR للمستند
   */
  async getDocumentQRCodes(documentId) {
    const qrCodes = [];
    for (const [, qr] of this.qrCodes) {
      if (qr.documentId === documentId) {
        qrCodes.push(qr);
      }
    }

    return { success: true, data: qrCodes, total: qrCodes.length };
  }

  /**
   * Batch generate QR codes — إنشاء رموز QR دفعة واحدة
   */
  async batchGenerateQR(documentIds, options = {}) {
    const results = [];

    for (const docId of documentIds) {
      const result = await this.generateQR(docId, options);
      results.push(result.data);
    }

    return {
      success: true,
      data: results,
      total: results.length,
      message: `تم إنشاء ${results.length} رمز QR`,
    };
  }

  /**
   * Get scan analytics — تحليلات المسح
   */
  async getScanAnalytics(documentId, options = {}) {
    const days = options.days || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let scans = [...this.scanHistory];
    if (documentId) scans = scans.filter(s => s.documentId === documentId);
    scans = scans.filter(s => new Date(s.scannedAt) >= since);

    const byDay = {};
    const byUser = {};
    scans.forEach(s => {
      const day = new Date(s.scannedAt).toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
      byUser[s.scannedByName] = (byUser[s.scannedByName] || 0) + 1;
    });

    return {
      success: true,
      data: {
        totalScans: scans.length,
        period: `${days} days`,
        byDay,
        byUser,
        uniqueUsers: Object.keys(byUser).length,
        recentScans: scans.slice(-10).reverse(),
      },
    };
  }

  /**
   * Get QR statistics — إحصائيات رموز QR
   */
  async getStatistics() {
    const qrCodes = Array.from(this.qrCodes.values());

    const byType = {};
    const byStatus = {};
    let totalScans = 0;

    qrCodes.forEach(qr => {
      byType[qr.type] = (byType[qr.type] || 0) + 1;
      byStatus[qr.status] = (byStatus[qr.status] || 0) + 1;
      totalScans += qr.scanCount;
    });

    return {
      success: true,
      data: {
        totalQRCodes: qrCodes.length,
        totalScans,
        byType,
        byStatus,
        averageScansPerQR: qrCodes.length > 0 ? Math.round(totalScans / qrCodes.length) : 0,
      },
    };
  }
}

module.exports = new DocumentQRService();
