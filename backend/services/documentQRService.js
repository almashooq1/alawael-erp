'use strict';

/**
 * documentQRService — in-memory singleton (EventEmitter)
 * Flat-path barrel for QR code generation and scanning.
 */

const EventEmitter = require('events');
const { createHash, randomUUID, randomBytes } = require('crypto');

class DocumentQRService extends EventEmitter {
  constructor() {
    super();
    this.qrCodes = new Map();
    this.scanHistory = [];
    this.baseUrl = process.env.APP_URL || 'http://localhost:5000';
  }

  // ── generateQR ─────────────────────────────────────────────────────────────
  async generateQR(documentId, opts = {}) {
    const {
      type = 'verification',
      size = 256,
      color = '#000000',
      backgroundColor = '#FFFFFF',
      expiresInDays = 0,
      maxScans = 0,
      password,
    } = opts;

    const id = 'qr_' + randomUUID().replace(/-/g, '');
    const verificationCode = randomBytes(16).toString('hex');

    let url;
    switch (type) {
      case 'access':
        url = `${this.baseUrl}/doc/${documentId}`;
        break;
      case 'download':
        url = `${this.baseUrl}/download/${documentId}`;
        break;
      case 'info':
        url = `${this.baseUrl}/info/${documentId}`;
        break;
      default: // 'verification'
        url = `${this.baseUrl}/verify/${verificationCode}`;
    }

    const svgData = this._generateQRSVG(url, size, color, backgroundColor);
    const dataUrl = `data:image/svg+xml,${encodeURIComponent(svgData)}`;

    const qr = {
      id,
      documentId,
      type,
      verificationCode,
      url,
      svgData,
      dataUrl,
      status: 'active',
      size,
      color,
      backgroundColor,
      scanCount: 0,
      createdAt: new Date(),
    };

    if (password) {
      qr.password = createHash('sha256').update(password).digest('hex');
    }
    if (expiresInDays > 0) {
      qr.expiresAt = new Date(Date.now() + expiresInDays * 86400000);
    }
    if (maxScans > 0) {
      qr.maxScans = maxScans;
    }

    this.qrCodes.set(id, qr);
    this.emit('qrGenerated', { id, documentId, type });

    return { success: true, data: qr };
  }

  // ── _generateQRSVG ─────────────────────────────────────────────────────────
  _generateQRSVG(data, size, color, backgroundColor) {
    const gridSize = 21;
    const cellSize = size / gridSize;
    let rects = '';

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const filled =
          this._isFinderPatternFilled(row, col, gridSize) ||
          (row + col + data.charCodeAt((row * gridSize + col) % data.length)) % 3 === 0;
        if (filled) {
          rects += `<rect x="${col * cellSize}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}" fill="${color}"/>`;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${backgroundColor}"/>${rects}</svg>`;
  }

  // ── _isFinderPatternFilled ─────────────────────────────────────────────────
  _isFinderPatternFilled(row, col, size) {
    // Top-left finder pattern (rows 0-6, cols 0-6)
    if (row >= 0 && row <= 6 && col >= 0 && col <= 6) {
      return this._finderCell(row, col);
    }
    // Top-right finder pattern (rows 0-6, cols size-7 to size-1)
    if (row >= 0 && row <= 6 && col >= size - 7 && col <= size - 1) {
      return this._finderCell(row, col - (size - 7));
    }
    // Bottom-left finder pattern (rows size-7 to size-1, cols 0-6)
    if (row >= size - 7 && row <= size - 1 && col >= 0 && col <= 6) {
      return this._finderCell(row - (size - 7), col);
    }
    return false;
  }

  _finderCell(r, c) {
    // Outer border
    if (r === 0 || r === 6 || c === 0 || c === 6) return true;
    // Inner 3×3 block
    if (r >= 2 && r <= 4 && c >= 2 && c <= 4) return true;
    // Gap
    return false;
  }

  // ── scanQR ─────────────────────────────────────────────────────────────────
  async scanQR(qrId, scanInfo = {}) {
    // Lookup by id or verificationCode
    let qr = this.qrCodes.get(qrId);
    if (!qr) {
      for (const entry of this.qrCodes.values()) {
        if (entry.verificationCode === qrId) {
          qr = entry;
          break;
        }
      }
    }
    if (!qr) return { success: false, error: 'رمز QR غير موجود' };
    if (qr.status !== 'active') return { success: false, error: 'رمز QR معطّل' };
    if (qr.expiresAt && new Date(qr.expiresAt) < new Date()) {
      return { success: false, expired: true, error: 'رمز QR منتهي الصلاحية' };
    }
    if (qr.maxScans && qr.scanCount >= qr.maxScans) {
      return { success: false, error: 'تجاوز الحد الأقصى للمسح' };
    }
    if (qr.password) {
      const provided = scanInfo.password
        ? createHash('sha256').update(scanInfo.password).digest('hex')
        : null;
      if (provided !== qr.password) return { success: false, error: 'كلمة المرور غير صحيحة' };
    }

    qr.scanCount++;
    const scanRecord = {
      qrId: qr.id,
      documentId: qr.documentId,
      scannedBy: scanInfo.userId || null,
      userName: scanInfo.userName || null,
      scannedAt: new Date(),
    };
    this.scanHistory.push(scanRecord);
    this.emit('qrScanned', { qrId: qr.id, documentId: qr.documentId });

    return { success: true, data: { verified: true, documentId: qr.documentId, qrId: qr.id } };
  }

  // ── disableQR ──────────────────────────────────────────────────────────────
  async disableQR(qrId) {
    const qr = this.qrCodes.get(qrId);
    if (!qr) return { success: false, error: 'رمز QR غير موجود' };
    qr.status = 'disabled';
    this.emit('qrDisabled', { qrId });
    return { success: true, data: qr };
  }

  // ── getDocumentQRCodes ─────────────────────────────────────────────────────
  async getDocumentQRCodes(documentId) {
    const data = Array.from(this.qrCodes.values()).filter(q => q.documentId === documentId);
    return { success: true, data, total: data.length };
  }

  // ── batchGenerateQR ────────────────────────────────────────────────────────
  async batchGenerateQR(documentIds = [], opts = {}) {
    const data = [];
    for (const docId of documentIds) {
      const res = await this.generateQR(docId, opts);
      data.push(res.data);
    }
    return { success: true, data, total: data.length };
  }

  // ── getScanAnalytics ───────────────────────────────────────────────────────
  async getScanAnalytics(documentId, { days } = {}) {
    let scans = this.scanHistory.filter(s => s.documentId === documentId);

    if (days != null) {
      const cutoff = new Date(Date.now() - days * 86400000);
      scans = scans.filter(s => new Date(s.scannedAt) >= cutoff);
    }

    const totalScans = scans.length;
    const uniqueUsers = new Set(scans.map(s => s.scannedBy).filter(Boolean)).size;

    const byDay = {};
    const byUser = {};

    for (const s of scans) {
      const day = new Date(s.scannedAt).toISOString().slice(0, 10);
      byDay[day] = (byDay[day] || 0) + 1;
      if (s.userName) {
        byUser[s.userName] = (byUser[s.userName] || 0) + 1;
      }
    }

    return { success: true, data: { totalScans, uniqueUsers, byDay, byUser } };
  }

  // ── getStatistics ──────────────────────────────────────────────────────────
  async getStatistics() {
    const qrArray = Array.from(this.qrCodes.values());
    const totalQRCodes = qrArray.length;
    const totalScans = qrArray.reduce((sum, q) => sum + q.scanCount, 0);
    const averageScansPerQR = totalQRCodes > 0 ? Math.round(totalScans / totalQRCodes) : 0;

    const byType = {};
    const byStatus = {};
    for (const q of qrArray) {
      byType[q.type] = (byType[q.type] || 0) + 1;
      byStatus[q.status] = (byStatus[q.status] || 0) + 1;
    }

    return {
      success: true,
      data: { totalQRCodes, totalScans, averageScansPerQR, byType, byStatus },
    };
  }
}

module.exports = new DocumentQRService();
