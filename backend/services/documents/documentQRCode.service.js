/**
 * Document QR Code & Barcode Service — خدمة أكواد QR والباركود
 * ──────────────────────────────────────────────────────────────
 * توليد أكواد QR وباركود لتتبع المستندات، التحقق السريع،
 * الطباعة على الملصقات، والمسح الضوئي
 *
 * @module documentQRCode.service
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const EventEmitter = require('events');

/* ─── Model ───────────────────────────────────────────────────── */
const qrCodeSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    code: { type: String, required: true, unique: true, index: true },
    type: {
      type: String,
      enum: ['qr', 'barcode128', 'barcode39', 'datamatrix', 'pdf417'],
      default: 'qr',
    },
    format: { type: String, enum: ['svg', 'png', 'base64'], default: 'svg' },
    purpose: {
      type: String,
      enum: ['tracking', 'verification', 'access', 'label', 'archive', 'custom'],
      default: 'tracking',
    },
    data: {
      url: String,
      verifyHash: String,
      metadata: mongoose.Schema.Types.Mixed,
      expiresAt: Date,
      accessCount: { type: Number, default: 0 },
      maxAccess: Number,
    },
    label: {
      title: String,
      subtitle: String,
      footer: String,
      logoUrl: String,
      size: { type: String, enum: ['small', 'medium', 'large', 'custom'], default: 'medium' },
      width: Number,
      height: Number,
    },
    status: { type: String, enum: ['active', 'expired', 'revoked', 'used'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    scans: [
      {
        scannedAt: { type: Date, default: Date.now },
        scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        ip: String,
        userAgent: String,
        location: String,
      },
    ],
  },
  { timestamps: true, collection: 'document_qrcodes' }
);

qrCodeSchema.index({ code: 1 });
qrCodeSchema.index({ documentId: 1, type: 1 });
qrCodeSchema.index({ 'data.expiresAt': 1 }, { expireAfterSeconds: 0 });

const QRCode = mongoose.models.QRCode || mongoose.model('QRCode', qrCodeSchema);

/* ─── Batch Print Job Model ──────────────────────────────────── */
const printJobSchema = new mongoose.Schema(
  {
    name: String,
    documentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    template: {
      type: String,
      enum: ['sticker', 'label', 'badge', 'full-page', 'custom'],
      default: 'sticker',
    },
    codeType: { type: String, default: 'qr' },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    output: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedAt: Date,
    error: String,
  },
  { timestamps: true, collection: 'document_print_jobs' }
);

const PrintJob = mongoose.models.PrintJob || mongoose.model('PrintJob', printJobSchema);

/* ─── Sizes ──────────────────────────────────────────────────── */
const SIZES = {
  small: { width: 100, height: 100 },
  medium: { width: 200, height: 200 },
  large: { width: 400, height: 400 },
};

/* ─── Templates ──────────────────────────────────────────────── */
const LABEL_TEMPLATES = {
  sticker: {
    nameAr: 'ملصق صغير',
    width: 50,
    height: 30,
    showTitle: true,
    showCode: true,
    showDate: false,
  },
  label: {
    nameAr: 'ملصق متوسط',
    width: 100,
    height: 60,
    showTitle: true,
    showCode: true,
    showDate: true,
  },
  badge: {
    nameAr: 'بطاقة تعريفية',
    width: 85,
    height: 55,
    showTitle: true,
    showCode: true,
    showDate: true,
    showLogo: true,
  },
  'full-page': {
    nameAr: 'صفحة كاملة',
    width: 210,
    height: 297,
    showTitle: true,
    showCode: true,
    showDate: true,
    showLogo: true,
    showMetadata: true,
  },
};

/* ─── Service ────────────────────────────────────────────────── */
class DocumentQRCodeService extends EventEmitter {
  constructor() {
    super();
    this.codePrefix = 'DOC';
  }

  /* ── Generate unique code ─────────────────────────────────── */
  _generateCode(type = 'qr') {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${this.codePrefix}-${type.toUpperCase()}-${timestamp}-${random}`;
  }

  /* ── Generate verification hash ───────────────────────────── */
  _generateVerifyHash(documentId, code) {
    return crypto
      .createHash('sha256')
      .update(`${documentId}:${code}:${process.env.QR_SECRET || 'doc-qr-secret'}`)
      .digest('hex')
      .substring(0, 16);
  }

  /* ── Generate QR/Barcode SVG ──────────────────────────────── */
  _generateSVG(data, type = 'qr', size = 'medium') {
    const dims = SIZES[size] || SIZES.medium;
    const w = dims.width;
    const h = dims.height;

    if (type === 'qr') {
      return this._generateQRSVG(data, w, h);
    }
    return this._generateBarcodeSVG(data, w, h, type);
  }

  _generateQRSVG(data, w, h) {
    // Simplified QR-like pattern generation (placeholder for actual QR library)
    const encoded = Buffer.from(data).toString('base64');
    const hash = crypto.createHash('md5').update(data).digest('hex');
    const modules = 21;
    const cellSize = Math.floor(Math.min(w, h) / (modules + 2));
    const offset = cellSize;
    let rects = '';

    for (let row = 0; row < modules; row++) {
      for (let col = 0; col < modules; col++) {
        const charIdx = (row * modules + col) % hash.length;
        const val = parseInt(hash[charIdx], 16);
        // Finder patterns (top-left, top-right, bottom-left)
        const isFinderTL = row < 7 && col < 7;
        const isFinderTR = row < 7 && col >= modules - 7;
        const isFinderBL = row >= modules - 7 && col < 7;
        const isFinderBorder =
          (isFinderTL || isFinderTR || isFinderBL) &&
          (row === 0 ||
            row === 6 ||
            col === 0 ||
            col === 6 ||
            (row >= 2 && row <= 4 && col >= 2 && col <= 4) ||
            (isFinderTR && (col === modules - 1 || col === modules - 7)) ||
            (isFinderBL && (row === modules - 1 || row === modules - 7)));
        const isFinder = isFinderTL || isFinderTR || isFinderBL;

        let dark;
        if (isFinder) {
          const lr = isFinderTL ? row : isFinderTR ? row : row - (modules - 7);
          const lc = isFinderTL ? col : isFinderTR ? col - (modules - 7) : col;
          dark =
            lr === 0 ||
            lr === 6 ||
            lc === 0 ||
            lc === 6 ||
            (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
        } else {
          dark = val > 7;
        }

        if (dark) {
          rects += `<rect x="${offset + col * cellSize}" y="${offset + row * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`;
        }
      }
    }

    const totalSize = (modules + 2) * cellSize;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${w}" height="${h}">
      <rect width="${totalSize}" height="${totalSize}" fill="#fff"/>
      ${rects}
      <text x="${totalSize / 2}" y="${totalSize - 2}" text-anchor="middle" font-size="4" fill="#666" font-family="monospace">${encoded.substring(0, 20)}</text>
    </svg>`;
  }

  _generateBarcodeSVG(data, w, h, type) {
    const hash = crypto.createHash('md5').update(data).digest('hex');
    const barCount = Math.min(data.length * 3, 60);
    const barWidth = w / (barCount * 1.5);
    let bars = '';

    for (let i = 0; i < barCount; i++) {
      const charIdx = i % hash.length;
      const val = parseInt(hash[charIdx], 16);
      const isDark = val > 6;
      const bw = isDark ? barWidth : barWidth * 0.5;

      if (isDark) {
        bars += `<rect x="${i * barWidth * 1.5}" y="10" width="${bw}" height="${h - 30}" fill="#000"/>`;
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
      <rect width="${w}" height="${h}" fill="#fff"/>
      ${bars}
      <text x="${w / 2}" y="${h - 5}" text-anchor="middle" font-size="10" fill="#333" font-family="monospace">${data.substring(0, 30)}</text>
    </svg>`;
  }

  /* ── Generate QR Code for Document ────────────────────────── */
  async generate(documentId, options = {}) {
    const {
      type = 'qr',
      purpose = 'tracking',
      size = 'medium',
      format = 'svg',
      baseUrl = process.env.APP_URL || 'https://app.alawael-erp.com',
      label = {},
      metadata = {},
      expiresIn,
      maxAccess,
      userId,
    } = options;

    const code = this._generateCode(type);
    const verifyHash = this._generateVerifyHash(documentId, code);
    const url = `${baseUrl}/verify/${code}?h=${verifyHash}`;

    const svgContent = this._generateSVG(url, type, size);

    const qrDoc = new QRCode({
      documentId,
      code,
      type,
      format,
      purpose,
      data: {
        url,
        verifyHash,
        metadata: { ...metadata, svgContent },
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn) : undefined,
        maxAccess,
      },
      label: {
        title: label.title || 'مستند',
        subtitle: label.subtitle || code,
        footer: label.footer || new Date().toLocaleDateString('ar-SA'),
        logoUrl: label.logoUrl,
        size,
        ...SIZES[size],
      },
      status: 'active',
      createdBy: userId,
    });

    await qrDoc.save();
    this.emit('generated', { documentId, code, type, purpose });

    return {
      success: true,
      qrCode: qrDoc,
      svg: svgContent,
      verifyUrl: url,
    };
  }

  /* ── Scan / Verify QR Code ────────────────────────────────── */
  async scan(code, scanInfo = {}) {
    const qrDoc = await QRCode.findOne({ code, status: 'active' });
    if (!qrDoc) return { success: false, error: 'الكود غير صالح أو منتهي الصلاحية' };

    // Check expiry
    if (qrDoc.data?.expiresAt && new Date() > qrDoc.data.expiresAt) {
      qrDoc.status = 'expired';
      await qrDoc.save();
      return { success: false, error: 'انتهت صلاحية الكود' };
    }

    // Check max access
    if (qrDoc.data?.maxAccess && qrDoc.data.accessCount >= qrDoc.data.maxAccess) {
      qrDoc.status = 'used';
      await qrDoc.save();
      return { success: false, error: 'تم استنفاد عدد مرات الاستخدام' };
    }

    // Record scan
    qrDoc.scans.push({
      scannedAt: new Date(),
      scannedBy: scanInfo.userId,
      ip: scanInfo.ip,
      userAgent: scanInfo.userAgent,
      location: scanInfo.location,
    });
    qrDoc.data.accessCount = (qrDoc.data.accessCount || 0) + 1;
    await qrDoc.save();

    // Verify hash
    const expectedHash = this._generateVerifyHash(qrDoc.documentId, code);
    const isValid = expectedHash === qrDoc.data.verifyHash;

    this.emit('scanned', { code, documentId: qrDoc.documentId, isValid });

    return {
      success: true,
      isValid,
      documentId: qrDoc.documentId,
      purpose: qrDoc.purpose,
      scanCount: qrDoc.data.accessCount,
    };
  }

  /* ── Get codes for document ───────────────────────────────── */
  async getForDocument(documentId, options = {}) {
    const { type, purpose, status = 'active', page = 1, limit = 20 } = options;
    const filter = { documentId };
    if (type) filter.type = type;
    if (purpose) filter.purpose = purpose;
    if (status) filter.status = status;

    const [codes, total] = await Promise.all([
      QRCode.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      QRCode.countDocuments(filter),
    ]);

    return { success: true, codes, total, page, limit };
  }

  /* ── Revoke code ──────────────────────────────────────────── */
  async revoke(codeId, userId) {
    const qr = await QRCode.findByIdAndUpdate(codeId, { status: 'revoked' }, { new: true });
    if (!qr) return { success: false, error: 'الكود غير موجود' };
    this.emit('revoked', { code: qr.code, documentId: qr.documentId, userId });
    return { success: true, qrCode: qr };
  }

  /* ── Bulk generate ────────────────────────────────────────── */
  async bulkGenerate(documentIds, options = {}) {
    const results = [];
    for (const docId of documentIds) {
      try {
        const result = await this.generate(docId, options);
        results.push({ documentId: docId, success: true, code: result.qrCode.code });
      } catch (err) {
        results.push({ documentId: docId, success: false, error: err.message });
      }
    }
    return {
      success: true,
      results,
      total: documentIds.length,
      generated: results.filter(r => r.success).length,
    };
  }

  /* ── Create Print Job ─────────────────────────────────────── */
  async createPrintJob(documentIds, options = {}) {
    const { template = 'sticker', codeType = 'qr', name, userId } = options;

    const job = new PrintJob({
      name: name || `طباعة ${documentIds.length} كود — ${new Date().toLocaleDateString('ar-SA')}`,
      documentIds,
      template,
      codeType,
      status: 'pending',
      createdBy: userId,
    });
    await job.save();

    // Process in background
    this._processPrintJob(job._id).catch(err => {
      console.error('Print job error:', err);
    });

    return { success: true, job };
  }

  async _processPrintJob(jobId) {
    const job = await PrintJob.findById(jobId);
    if (!job) return;

    job.status = 'processing';
    await job.save();

    try {
      const codes = [];
      for (const docId of job.documentIds) {
        const result = await this.generate(docId, { type: job.codeType, purpose: 'label' });
        codes.push(result);
      }

      const template = LABEL_TEMPLATES[job.template] || LABEL_TEMPLATES.sticker;
      const svgs = codes.map(c => c.svg);

      job.output = JSON.stringify({ codes: codes.map(c => c.qrCode.code), svgs, template });
      job.status = 'completed';
      job.completedAt = new Date();
    } catch (err) {
      job.status = 'failed';
      job.error = err.message;
    }
    await job.save();
    this.emit('printJobCompleted', { jobId: job._id, status: job.status });
  }

  /* ── Get Print Jobs ───────────────────────────────────────── */
  async getPrintJobs(options = {}) {
    const { status, page = 1, limit = 20 } = options;
    const filter = {};
    if (status) filter.status = status;
    const [jobs, total] = await Promise.all([
      PrintJob.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PrintJob.countDocuments(filter),
    ]);
    return { success: true, jobs, total };
  }

  /* ── Get Scan History ─────────────────────────────────────── */
  async getScanHistory(documentId, options = {}) {
    const { page = 1, limit = 50 } = options;
    const codes = await QRCode.find({ documentId }).lean();
    const allScans = codes.flatMap(c =>
      (c.scans || []).map(s => ({ ...s, code: c.code, type: c.type, purpose: c.purpose }))
    );
    allScans.sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt));
    const paged = allScans.slice((page - 1) * limit, page * limit);
    return { success: true, scans: paged, total: allScans.length };
  }

  /* ── Get available types ──────────────────────────────────── */
  getTypes() {
    return [
      { key: 'qr', labelAr: 'كود QR', icon: '📱' },
      { key: 'barcode128', labelAr: 'باركود 128', icon: '📊' },
      { key: 'barcode39', labelAr: 'باركود 39', icon: '📊' },
      { key: 'datamatrix', labelAr: 'مصفوفة البيانات', icon: '🔳' },
      { key: 'pdf417', labelAr: 'PDF417', icon: '📋' },
    ];
  }

  /* ── Get available purposes ───────────────────────────────── */
  getPurposes() {
    return [
      { key: 'tracking', labelAr: 'تتبع المستند', icon: '📍' },
      { key: 'verification', labelAr: 'التحقق من الأصالة', icon: '✅' },
      { key: 'access', labelAr: 'رابط وصول سريع', icon: '🔗' },
      { key: 'label', labelAr: 'ملصق طباعة', icon: '🏷️' },
      { key: 'archive', labelAr: 'أرشيف', icon: '📦' },
      { key: 'custom', labelAr: 'مخصص', icon: '⚙️' },
    ];
  }

  /* ── Get label templates ──────────────────────────────────── */
  getTemplates() {
    return Object.entries(LABEL_TEMPLATES).map(([key, val]) => ({ key, ...val }));
  }

  /* ── Statistics ───────────────────────────────────────────── */
  async getStats(documentId) {
    const match = documentId ? { documentId: new mongoose.Types.ObjectId(documentId) } : {};
    const [total, byType, byPurpose, recentScans] = await Promise.all([
      QRCode.countDocuments(match),
      QRCode.aggregate([{ $match: match }, { $group: { _id: '$type', count: { $sum: 1 } } }]),
      QRCode.aggregate([{ $match: match }, { $group: { _id: '$purpose', count: { $sum: 1 } } }]),
      QRCode.aggregate([
        { $match: match },
        { $unwind: '$scans' },
        { $sort: { 'scans.scannedAt': -1 } },
        { $limit: 10 },
        { $project: { code: 1, 'scans.scannedAt': 1, 'scans.location': 1 } },
      ]),
    ]);

    return {
      success: true,
      stats: {
        total,
        byType: byType.reduce((a, t) => ({ ...a, [t._id]: t.count }), {}),
        byPurpose: byPurpose.reduce((a, p) => ({ ...a, [p._id]: p.count }), {}),
        recentScans,
      },
    };
  }
}

module.exports = new DocumentQRCodeService();
