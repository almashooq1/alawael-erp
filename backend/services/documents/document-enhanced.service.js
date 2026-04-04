'use strict';

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const DocumentVersion = require('../../models/DocumentVersion');
const DocumentSignature = require('../../models/DocumentSignature');
const DocumentAccessLog = require('../../models/DocumentAccessLog');
const DocumentShare = require('../../models/DocumentShare');
const bcrypt = require('bcrypt');
const logger = require('../../utils/logger');

/**
 * خدمة إدارة الملفات والأرشيف المحسّنة
 * Enhanced Document Management Service — Prompt 9
 * يعمل مع Document model الموجود في المشروع
 */
class DocumentEnhancedService {
  constructor() {
    this.encryptionMethod = 'aes-256-cbc';
    this.encryptionKeysCollection = 'encryption_keys';
  }

  // ============================================================
  // التشفير (AES-256-CBC)
  // ============================================================

  /**
   * تشفير محتوى الملف
   */
  encryptContent(content) {
    const key = crypto.randomBytes(32); // 256 بت
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.encryptionMethod, key, iv);
    const encrypted = Buffer.concat([cipher.update(content), cipher.final()]);
    const fileHash = crypto.createHash('sha256').update(content).digest('hex');

    return {
      encryptedData: Buffer.concat([iv, encrypted]),
      key: key.toString('base64'),
      iv: iv.toString('base64'),
      fileHash,
    };
  }

  /**
   * فك تشفير الملف
   */
  decryptContent(encryptedBuffer, keyBase64) {
    const key = Buffer.from(keyBase64, 'base64');
    const iv = encryptedBuffer.subarray(0, 16);
    const encrypted = encryptedBuffer.subarray(16);
    const decipher = crypto.createDecipheriv(this.encryptionMethod, key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  /**
   * تخزين مفتاح التشفير في قاعدة البيانات
   */
  async storeEncryptionKey(keyId, keyBase64) {
    try {
      const db = mongoose.connection.db;
      await db.collection(this.encryptionKeysCollection).insertOne({
        _id: keyId,
        encryptedKey: this._encryptKey(keyBase64), // تشفير مزدوج للمفتاح
        createdAt: new Date(),
      });
    } catch (err) {
      logger.error(`[Encryption] فشل تخزين المفتاح: ${err.message}`);
      throw err;
    }
  }

  async retrieveEncryptionKey(keyId) {
    try {
      const db = mongoose.connection.db;
      const record = await db.collection(this.encryptionKeysCollection).findOne({ _id: keyId });
      if (!record) throw new Error('مفتاح التشفير غير موجود');
      return this._decryptKey(record.encryptedKey);
    } catch (err) {
      logger.error(`[Encryption] فشل استرداد المفتاح: ${err.message}`);
      throw err;
    }
  }

  _encryptKey(keyBase64) {
    const masterKey = process.env.MASTER_ENCRYPTION_KEY || 'default-master-key-32-chars-pad!!';
    const paddedKey = Buffer.from(masterKey.padEnd(32, '!').slice(0, 32));
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', paddedKey, iv);
    const encrypted = Buffer.concat([cipher.update(keyBase64), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  _decryptKey(stored) {
    const [ivHex, encHex] = stored.split(':');
    const masterKey = process.env.MASTER_ENCRYPTION_KEY || 'default-master-key-32-chars-pad!!';
    const paddedKey = Buffer.from(masterKey.padEnd(32, '!').slice(0, 32));
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', paddedKey, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString();
  }

  // ============================================================
  // معالجة OCR
  // ============================================================

  /**
   * معالجة OCR للمستند عبر Google Cloud Vision API
   */
  async processOcr(fileContent, mimeType) {
    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey) {
      logger.warn('[OCR] Google Vision API key غير مضبوط');
      return '';
    }

    try {
      const axios = require('axios');
      const feature = mimeType === 'application/pdf' ? 'DOCUMENT_TEXT_DETECTION' : 'TEXT_DETECTION';

      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          requests: [
            {
              image: { content: fileContent.toString('base64') },
              features: [{ type: feature }],
              imageContext: { languageHints: ['ar', 'en'] },
            },
          ],
        },
        { timeout: 30000 }
      );

      return response.data?.responses?.[0]?.fullTextAnnotation?.text || '';
    } catch (err) {
      logger.error(`[OCR] فشل: ${err.message}`);
      return '';
    }
  }

  isOcrCompatible(mimeType) {
    return ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'].includes(mimeType);
  }

  // ============================================================
  // إدارة الإصدارات
  // ============================================================

  async createVersion(documentId, fileData, uploadedBy, notes = null) {
    const lastVersion = await DocumentVersion.findOne({ documentId }).sort({ versionNumber: -1 });
    const versionNumber = (lastVersion?.versionNumber || 0) + 1;

    return DocumentVersion.create({
      documentId,
      versionNumber,
      uploadedBy,
      filePath: fileData.filePath,
      fileName: fileData.fileName,
      mimeType: fileData.mimeType,
      fileSize: fileData.fileSize,
      fileHash: fileData.fileHash,
      changeNotes: notes || (versionNumber === 1 ? 'الإصدار الأولي' : null),
      isEncrypted: fileData.isEncrypted || false,
      encryptionKeyId: fileData.encryptionKeyId || null,
    });
  }

  async getVersions(documentId) {
    return DocumentVersion.find({ documentId })
      .populate('uploadedBy', 'name email')
      .sort({ versionNumber: -1 });
  }

  // ============================================================
  // التوقيع الإلكتروني
  // ============================================================

  /**
   * طلب توقيع على مستند
   */
  async requestSignatures(documentId, signers, requestedBy) {
    const signatures = [];

    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i];
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const otpHash = await bcrypt.hash(otp, 10);

      const signature = await DocumentSignature.create({
        documentId,
        signerId: signer.userId,
        signerName: signer.name,
        signerRole: signer.role,
        signerEmail: signer.email,
        signatureType: signer.type || 'electronic',
        otpCode: otpHash,
        signOrder: i + 1,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 أيام
      });

      // إرسال OTP عبر خدمة الإشعارات
      try {
        const notifService = require('../notifications/notification-enhanced.service');
        await notifService.sendFromTemplate(
          'signature_request',
          { _id: signer.userId, email: signer.email },
          { otp_code: otp, document_id: documentId.toString(), signer_name: signer.name }
        );
      } catch (err) {
        logger.warn(`[Signature] فشل إرسال OTP: ${err.message}`);
      }

      signatures.push({ ...signature.toObject(), otp }); // لا ترسل OTP للواجهة في الإنتاج
    }

    return signatures;
  }

  /**
   * تنفيذ التوقيع
   */
  async sign(signatureId, signerUserId, otp, signatureData = null) {
    const signature = await DocumentSignature.findById(signatureId);
    if (!signature) throw new Error('طلب التوقيع غير موجود');
    if (signature.signerId.toString() !== signerUserId.toString()) {
      throw new Error('غير مصرح لك بالتوقيع');
    }
    if (signature.status !== 'pending') throw new Error('طلب التوقيع غير نشط');
    if (signature.expiresAt && signature.expiresAt < new Date()) {
      throw new Error('انتهت صلاحية طلب التوقيع');
    }

    // التحقق من OTP
    const valid = await bcrypt.compare(otp, signature.otpCode);
    if (!valid) throw new Error('رمز التحقق OTP غير صحيح');

    // التحقق من الترتيب
    const pendingPrevious = await DocumentSignature.exists({
      documentId: signature.documentId,
      signOrder: { $lt: signature.signOrder },
      status: { $ne: 'signed' },
    });
    if (pendingPrevious) throw new Error('يجب إتمام التوقيعات السابقة أولاً');

    await DocumentSignature.findByIdAndUpdate(signatureId, {
      signatureData,
      otpVerified: true,
      status: 'signed',
      signedAt: new Date(),
    });

    // تحقق اكتمال جميع التوقيعات
    const pendingCount = await DocumentSignature.countDocuments({
      documentId: signature.documentId,
      status: 'pending',
    });

    if (pendingCount === 0) {
      // تحديث حالة المستند
      try {
        const Document = require('../../models/Document');
        await Document.findByIdAndUpdate(signature.documentId, { status: 'signed' });
      } catch {
        // Document model قد يختلف
      }
      logger.info(`[Signature] اكتملت جميع التوقيعات للمستند: ${signature.documentId}`);
    }

    return DocumentSignature.findById(signatureId);
  }

  // ============================================================
  // المشاركة
  // ============================================================

  async shareDocument(documentId, sharedBy, options = {}) {
    return DocumentShare.create({
      documentId,
      sharedBy,
      sharedWith: options.sharedWith || null,
      sharedWithEmail: options.email || null,
      permission: options.permission || 'view',
      shareType: options.shareType || 'internal',
      expiresAt: options.expiresAt || null,
      maxDownloads: options.maxDownloads || null,
      passwordHash: options.password ? await bcrypt.hash(options.password, 10) : null,
    });
  }

  async accessSharedDocument(shareToken, password = null) {
    const share = await DocumentShare.findOne({
      shareToken,
      isActive: true,
    }).populate('documentId');

    if (!share) throw new Error('رابط المشاركة غير صالح');
    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new Error('انتهت صلاحية رابط المشاركة');
    }
    if (share.maxDownloads && share.downloadCount >= share.maxDownloads) {
      throw new Error('تجاوز الحد الأقصى للتحميلات');
    }
    if (share.passwordHash) {
      if (!password) throw new Error('هذا المستند محمي بكلمة مرور');
      const valid = await bcrypt.compare(password, share.passwordHash);
      if (!valid) throw new Error('كلمة المرور غير صحيحة');
    }

    await DocumentShare.findByIdAndUpdate(share._id, { $inc: { downloadCount: 1 } });
    return share.documentId;
  }

  // ============================================================
  // سجل الوصول
  // ============================================================

  async logAccess(documentId, userId, action, req = null, details = null) {
    return DocumentAccessLog.create({
      documentId,
      userId,
      action,
      ipAddress: req?.ip || null,
      userAgent: req?.headers?.['user-agent'] || null,
      details,
    }).catch(err => logger.warn(`[AccessLog] فشل: ${err.message}`));
  }

  async getAccessLog(documentId, filters = {}) {
    const query = { documentId };
    if (filters.userId) query.userId = filters.userId;
    if (filters.action) query.action = filters.action;
    if (filters.from) query.createdAt = { $gte: new Date(filters.from) };

    return DocumentAccessLog.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(filters.limit || 100);
  }

  // ============================================================
  // البحث في المستندات
  // ============================================================

  async searchDocuments(query, filters = {}, page = 1, limit = 20) {
    try {
      const Document = require('../../models/Document');
      const searchQuery = { status: 'active' };

      if (filters.categoryId) searchQuery.categoryId = filters.categoryId;
      if (filters.branchId) searchQuery.branchId = filters.branchId;

      if (query) {
        searchQuery.$or = [
          { titleAr: { $regex: query, $options: 'i' } },
          { titleEn: { $regex: query, $options: 'i' } },
          { tags: { $in: [query] } },
        ];
      }

      const [docs, total] = await Promise.all([
        Document.find(searchQuery)
          .skip((page - 1) * limit)
          .limit(limit)
          .sort({ createdAt: -1 }),
        Document.countDocuments(searchQuery),
      ]);

      return { data: docs, total, page, pages: Math.ceil(total / limit) };
    } catch (err) {
      logger.error(`[Document Search] ${err.message}`);
      return { data: [], total: 0, page, pages: 0 };
    }
  }

  // ============================================================
  // سياسات الاحتفاظ
  // ============================================================

  async applyRetentionPolicies() {
    logger.info('[Retention] تطبيق سياسات الاحتفاظ...');
    let processed = 0;

    try {
      const Document = require('../../models/Document');
      const expired = await Document.find({
        status: 'active',
        expiresAt: { $lte: new Date() },
      });

      for (const doc of expired) {
        await Document.findByIdAndUpdate(doc._id, {
          status: 'expired',
          archivedAt: new Date(),
          archivedReason: 'انتهاء مدة الاحتفاظ',
        });
        processed++;
      }
    } catch (err) {
      logger.error(`[Retention] خطأ: ${err.message}`);
    }

    logger.info(`[Retention] تمت معالجة ${processed} مستند`);
    return processed;
  }
}

module.exports = new DocumentEnhancedService();
