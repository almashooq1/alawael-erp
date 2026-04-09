'use strict';

/**
 * Document Digital Signature Service — خدمة التوقيع الإلكتروني
 * ═══════════════════════════════════════════════════════════════
 * نظام توقيع رقمي متكامل مع سلاسل التوقيع، التحقق،
 * طلبات التوقيع، وسجل التوقيعات
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const logger = require('../../utils/logger');

// ─────────────────────────────────────────────
// أنواع التوقيع
// ─────────────────────────────────────────────

const SIGNATURE_TYPES = {
  approval: {
    label: 'موافقة',
    labelEn: 'Approval',
    icon: '✅',
    color: '#10B981',
    description: 'توقيع الموافقة على المستند',
  },
  review: {
    label: 'مراجعة',
    labelEn: 'Review',
    icon: '👀',
    color: '#3B82F6',
    description: 'توقيع إتمام المراجعة',
  },
  authorization: {
    label: 'اعتماد',
    labelEn: 'Authorization',
    icon: '🛡️',
    color: '#8B5CF6',
    description: 'توقيع الاعتماد الرسمي',
  },
  acknowledgment: {
    label: 'إقرار',
    labelEn: 'Acknowledgment',
    icon: '📋',
    color: '#F59E0B',
    description: 'توقيع الإقرار بالاستلام أو الاطلاع',
  },
  witness: {
    label: 'شاهد',
    labelEn: 'Witness',
    icon: '👤',
    color: '#6366F1',
    description: 'توقيع كشاهد على المستند',
  },
  rejection: {
    label: 'رفض',
    labelEn: 'Rejection',
    icon: '❌',
    color: '#EF4444',
    description: 'توقيع رفض المستند',
  },
};

// ─────────────────────────────────────────────
// مخطط التوقيع الرقمي
// ─────────────────────────────────────────────

const DigitalSignatureSchema = new mongoose.Schema(
  {
    // المستند
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    documentVersion: { type: Number, default: 1 },

    // الموقّع
    signerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    signerName: { type: String, required: true },
    signerEmail: String,
    signerRole: String,
    signerDepartment: String,

    // نوع التوقيع
    signatureType: {
      type: String,
      enum: Object.keys(SIGNATURE_TYPES),
      required: true,
    },

    // البيانات التقنية
    signatureHash: {
      type: String,
      required: true,
      unique: true,
    },
    documentHash: String,
    certificateId: String,

    // البيانات المرئية
    signatureImage: String, // Base64 صورة التوقيع
    signatureText: String, // نص التوقيع
    position: {
      page: Number,
      x: Number,
      y: Number,
      width: { type: Number, default: 200 },
      height: { type: Number, default: 80 },
    },

    // التعليقات والملاحظات
    comments: String,
    reason: String,

    // الحالة
    status: {
      type: String,
      enum: ['pending', 'signed', 'rejected', 'revoked', 'expired'],
      default: 'pending',
    },
    signedAt: Date,
    rejectedAt: Date,
    rejectionReason: String,
    revokedAt: Date,
    revokeReason: String,

    // صلاحية التوقيع
    expiresAt: Date,
    isValid: { type: Boolean, default: true },

    // سلسلة التوقيع
    signatureChainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SignatureChain',
    },
    orderInChain: { type: Number, default: 0 },

    // بيانات الجهاز
    deviceInfo: {
      ip: String,
      userAgent: String,
      location: String,
      timestamp: Date,
    },

    // التشفير
    encryptionAlgorithm: { type: String, default: 'SHA-256' },
    publicKey: String,

    // بيانات إضافية
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    collection: 'digital_signatures',
  }
);

DigitalSignatureSchema.index({ documentId: 1, signerId: 1 });
DigitalSignatureSchema.index({ signatureChainId: 1, orderInChain: 1 });
DigitalSignatureSchema.index({ status: 1 });
DigitalSignatureSchema.index({ signerId: 1, status: 1 });

const DigitalSignature =
  mongoose.models.DigitalSignature || mongoose.model('DigitalSignature', DigitalSignatureSchema);

// ─────────────────────────────────────────────
// مخطط سلسلة التوقيع
// ─────────────────────────────────────────────

const SignatureChainSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    name: { type: String, required: true },
    nameEn: String,
    description: String,

    // المشاركون في السلسلة
    participants: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        email: String,
        role: String,
        signatureType: {
          type: String,
          enum: Object.keys(SIGNATURE_TYPES),
          default: 'approval',
        },
        order: { type: Number, required: true },
        isRequired: { type: Boolean, default: true },
        status: {
          type: String,
          enum: ['pending', 'signed', 'rejected', 'skipped'],
          default: 'pending',
        },
        signatureId: { type: mongoose.Schema.Types.ObjectId, ref: 'DigitalSignature' },
        signedAt: Date,
        reminderSent: { type: Boolean, default: false },
        reminderSentAt: Date,
      },
    ],

    // الإعدادات
    requireSequential: { type: Boolean, default: true }, // توقيع تسلسلي
    allowParallelSigning: { type: Boolean, default: false }, // توقيع متوازي
    expiresAt: Date,
    reminderInterval: { type: Number, default: 24 }, // ساعات

    // الحالة
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled', 'expired'],
      default: 'active',
    },
    currentOrder: { type: Number, default: 0 },
    completedAt: Date,
    cancelledAt: Date,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelReason: String,

    // المنشئ
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    collection: 'signature_chains',
  }
);

SignatureChainSchema.index({ documentId: 1, status: 1 });
SignatureChainSchema.index({ 'participants.userId': 1, status: 1 });
SignatureChainSchema.index({ createdBy: 1 });

const SignatureChain =
  mongoose.models.SignatureChain || mongoose.model('SignatureChain', SignatureChainSchema);

// ─────────────────────────────────────────────
// خدمة التوقيع الرقمي
// ─────────────────────────────────────────────

class DocumentSignatureService {
  /**
   * إنشاء توقيع رقمي
   */
  async createSignature(documentId, signerId, signerInfo, options = {}) {
    try {
      // إنشاء hash للتوقيع
      const signatureData = `${documentId}:${signerId}:${Date.now()}:${crypto.randomBytes(16).toString('hex')}`;
      const signatureHash = crypto.createHash('sha256').update(signatureData).digest('hex');

      // حساب hash للمستند
      const Document = mongoose.model('Document');
      const doc = await Document.findById(documentId).lean();
      if (!doc) throw new Error('المستند غير موجود');

      const documentHash = crypto
        .createHash('sha256')
        .update(`${doc.title}:${doc.fileSize}:${doc.version}`)
        .digest('hex');

      const signature = new DigitalSignature({
        documentId,
        documentVersion: doc.version || 1,
        signerId,
        signerName: signerInfo.name,
        signerEmail: signerInfo.email || '',
        signerRole: signerInfo.role || '',
        signerDepartment: signerInfo.department || '',
        signatureType: options.type || 'approval',
        signatureHash,
        documentHash,
        signatureImage: options.signatureImage || '',
        signatureText: options.signatureText || signerInfo.name,
        position: options.position || {},
        comments: options.comments || '',
        reason: options.reason || '',
        status: 'signed',
        signedAt: new Date(),
        signatureChainId: options.chainId || null,
        orderInChain: options.orderInChain || 0,
        deviceInfo: {
          ip: options.ip || '',
          userAgent: options.userAgent || '',
          location: options.location || '',
          timestamp: new Date(),
        },
        encryptionAlgorithm: 'SHA-256',
        expiresAt: options.expiresAt || null,
      });

      await signature.save();

      // تحديث سجل نشاط المستند
      try {
        await Document.findByIdAndUpdate(documentId, {
          $push: {
            activityLog: {
              action: 'توقيع',
              performedBy: signerId,
              performedByName: signerInfo.name,
              performedAt: new Date(),
              details: `تم التوقيع (${SIGNATURE_TYPES[options.type || 'approval']?.label || 'موافقة'})`,
              metadata: { signatureId: signature._id, type: options.type },
            },
          },
        });
      } catch (e) {
        logger.warn(`[Signature] فشل تحديث سجل النشاط: ${e.message}`);
      }

      logger.info(`[Signature] توقيع جديد: ${signature._id} على مستند: ${documentId}`);

      return {
        success: true,
        signature: this._formatSignature(signature),
      };
    } catch (err) {
      logger.error(`[Signature] خطأ في إنشاء التوقيع: ${err.message}`);
      throw err;
    }
  }

  /**
   * التحقق من صحة التوقيع
   */
  async verifySignature(signatureId) {
    try {
      const signature = await DigitalSignature.findById(signatureId)
        .populate('signerId', 'name email')
        .lean();

      if (!signature) throw new Error('التوقيع غير موجود');

      // التحقق من الحالة
      const checks = {
        exists: true,
        statusValid: signature.status === 'signed',
        notExpired: !signature.expiresAt || new Date(signature.expiresAt) > new Date(),
        notRevoked: signature.status !== 'revoked',
        hashIntact: true,
      };

      // التحقق من hash المستند
      const Document = mongoose.model('Document');
      const doc = await Document.findById(signature.documentId).lean();
      if (doc) {
        const currentDocHash = crypto
          .createHash('sha256')
          .update(`${doc.title}:${doc.fileSize}:${signature.documentVersion}`)
          .digest('hex');
        checks.documentUnmodified = currentDocHash === signature.documentHash;
      } else {
        checks.documentUnmodified = false;
      }

      const isValid = Object.values(checks).every(v => v === true);

      return {
        success: true,
        signatureId,
        isValid,
        checks,
        signature: this._formatSignature(signature),
        verifiedAt: new Date(),
      };
    } catch (err) {
      logger.error(`[Signature] خطأ في التحقق: ${err.message}`);
      throw err;
    }
  }

  /**
   * إلغاء/سحب التوقيع
   */
  async revokeSignature(signatureId, userId, reason = '') {
    try {
      const signature = await DigitalSignature.findById(signatureId);
      if (!signature) throw new Error('التوقيع غير موجود');
      if (signature.status !== 'signed') throw new Error('لا يمكن إلغاء توقيع غير نشط');

      signature.status = 'revoked';
      signature.revokedAt = new Date();
      signature.revokeReason = reason;
      signature.isValid = false;

      await signature.save();

      logger.info(`[Signature] تم إلغاء التوقيع: ${signatureId}`);

      return { success: true, signature: this._formatSignature(signature) };
    } catch (err) {
      logger.error(`[Signature] خطأ في الإلغاء: ${err.message}`);
      throw err;
    }
  }

  /**
   * جلب توقيعات المستند
   */
  async getDocumentSignatures(documentId) {
    try {
      const signatures = await DigitalSignature.find({ documentId })
        .populate('signerId', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      return {
        success: true,
        documentId,
        signatures: signatures.map(s => this._formatSignature(s)),
        total: signatures.length,
        signedCount: signatures.filter(s => s.status === 'signed').length,
        pendingCount: signatures.filter(s => s.status === 'pending').length,
      };
    } catch (err) {
      logger.error(`[Signature] خطأ في جلب التوقيعات: ${err.message}`);
      throw err;
    }
  }

  /**
   * جلب التوقيعات المعلقة للمستخدم
   */
  async getPendingSignatures(userId) {
    try {
      // من التوقيعات المباشرة
      const directPending = await DigitalSignature.find({
        signerId: userId,
        status: 'pending',
      })
        .populate('documentId', 'title category fileType')
        .sort({ createdAt: -1 })
        .lean();

      // من سلاسل التوقيع
      const chainPending = await SignatureChain.find({
        'participants.userId': userId,
        'participants.status': 'pending',
        status: 'active',
      })
        .populate('documentId', 'title category fileType')
        .lean();

      const allPending = [
        ...directPending.map(s => ({
          type: 'direct',
          ...this._formatSignature(s),
        })),
        ...chainPending.map(chain => {
          const participant = chain.participants.find(
            p => p.userId?.toString() === userId.toString() && p.status === 'pending'
          );
          return {
            type: 'chain',
            chainId: chain._id,
            chainName: chain.name,
            documentId: chain.documentId,
            signatureType: participant?.signatureType || 'approval',
            order: participant?.order || 0,
            isRequired: participant?.isRequired || true,
            isMyTurn: !chain.requireSequential || participant?.order === chain.currentOrder,
          };
        }),
      ];

      return { success: true, pending: allPending, total: allPending.length };
    } catch (err) {
      logger.error(`[Signature] خطأ في التوقيعات المعلقة: ${err.message}`);
      throw err;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  سلسلة التوقيع
  // ═══════════════════════════════════════════════════════════

  /**
   * إنشاء سلسلة توقيع
   */
  async createSignatureChain(documentId, chainData, createdBy) {
    try {
      if (!chainData.participants?.length) {
        throw new Error('يجب تحديد مشاركين في سلسلة التوقيع');
      }

      const chain = new SignatureChain({
        documentId,
        name: chainData.name || 'سلسلة توقيع',
        nameEn: chainData.nameEn || 'Signature Chain',
        description: chainData.description || '',
        participants: chainData.participants.map((p, idx) => ({
          userId: p.userId,
          name: p.name,
          email: p.email || '',
          role: p.role || '',
          signatureType: p.signatureType || 'approval',
          order: p.order !== undefined ? p.order : idx,
          isRequired: p.isRequired !== false,
          status: 'pending',
        })),
        requireSequential: chainData.requireSequential !== false,
        allowParallelSigning: chainData.allowParallelSigning || false,
        expiresAt: chainData.expiresAt || null,
        reminderInterval: chainData.reminderInterval || 24,
        currentOrder: 0,
        createdBy,
      });

      await chain.save();

      logger.info(`[Signature] سلسلة توقيع جديدة: ${chain._id} لمستند: ${documentId}`);

      return { success: true, chain: this._formatChain(chain) };
    } catch (err) {
      logger.error(`[Signature] خطأ في إنشاء السلسلة: ${err.message}`);
      throw err;
    }
  }

  /**
   * التوقيع ضمن سلسلة
   */
  async signInChain(chainId, userId, signerInfo, options = {}) {
    try {
      const chain = await SignatureChain.findById(chainId);
      if (!chain) throw new Error('سلسلة التوقيع غير موجودة');
      if (chain.status !== 'active') throw new Error('سلسلة التوقيع غير نشطة');

      // العثور على المشارك
      const participant = chain.participants.find(
        p => p.userId?.toString() === userId.toString() && p.status === 'pending'
      );
      if (!participant) throw new Error('لست مشاركاً في هذه السلسلة أو وقّعت بالفعل');

      // التحقق من الدور (تسلسلي)
      if (chain.requireSequential && participant.order > chain.currentOrder) {
        throw new Error('لم يحن دورك بعد في التوقيع');
      }

      // إنشاء التوقيع
      const signatureResult = await this.createSignature(chain.documentId, userId, signerInfo, {
        ...options,
        type: participant.signatureType,
        chainId: chain._id,
        orderInChain: participant.order,
      });

      // تحديث المشارك
      participant.status = 'signed';
      participant.signatureId = signatureResult.signature.id;
      participant.signedAt = new Date();

      // تقدم في السلسلة
      const allSigned = chain.participants
        .filter(p => p.isRequired)
        .every(p => p.status === 'signed');

      if (allSigned) {
        chain.status = 'completed';
        chain.completedAt = new Date();
      } else {
        // الانتقال للتوقيع التالي
        const nextPending = chain.participants.find(p => p.status === 'pending' && p.isRequired);
        if (nextPending) {
          chain.currentOrder = nextPending.order;
        }
      }

      await chain.save();

      return {
        success: true,
        signature: signatureResult.signature,
        chainStatus: chain.status,
        isCompleted: chain.status === 'completed',
        nextSigner:
          chain.status !== 'completed'
            ? chain.participants.find(p => p.status === 'pending')
            : null,
      };
    } catch (err) {
      logger.error(`[Signature] خطأ في التوقيع ضمن السلسلة: ${err.message}`);
      throw err;
    }
  }

  /**
   * رفض التوقيع ضمن سلسلة
   */
  async rejectInChain(chainId, userId, reason = '') {
    try {
      const chain = await SignatureChain.findById(chainId);
      if (!chain) throw new Error('سلسلة التوقيع غير موجودة');

      const participant = chain.participants.find(
        p => p.userId?.toString() === userId.toString() && p.status === 'pending'
      );
      if (!participant) throw new Error('لست مشاركاً معلقاً في هذه السلسلة');

      participant.status = 'rejected';

      if (participant.isRequired) {
        chain.status = 'cancelled';
        chain.cancelledAt = new Date();
        chain.cancelledBy = userId;
        chain.cancelReason = reason || 'رفض أحد الموقعين المطلوبين';
      }

      await chain.save();

      return {
        success: true,
        chainStatus: chain.status,
        isCancelled: chain.status === 'cancelled',
      };
    } catch (err) {
      logger.error(`[Signature] خطأ في الرفض: ${err.message}`);
      throw err;
    }
  }

  /**
   * جلب سلسلة توقيع
   */
  async getSignatureChain(chainId) {
    try {
      const chain = await SignatureChain.findById(chainId)
        .populate('documentId', 'title category fileType')
        .populate('participants.userId', 'name email')
        .populate('createdBy', 'name email')
        .lean();

      if (!chain) return null;
      return this._formatChain(chain);
    } catch (err) {
      logger.error(`[Signature] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * جلب سلاسل توقيع المستند
   */
  async getDocumentChains(documentId) {
    try {
      const chains = await SignatureChain.find({ documentId })
        .populate('participants.userId', 'name email')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .lean();

      return {
        success: true,
        chains: chains.map(c => this._formatChain(c)),
        total: chains.length,
      };
    } catch (err) {
      logger.error(`[Signature] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * إحصائيات التوقيع
   */
  async getSignatureStats(filters = {}) {
    try {
      const matchStage = {};
      if (filters.startDate) matchStage.createdAt = { $gte: new Date(filters.startDate) };
      if (filters.endDate) {
        matchStage.createdAt = matchStage.createdAt || {};
        matchStage.createdAt.$lte = new Date(filters.endDate);
      }

      const [statusCounts, typeCounts, totalChains, completedChains] = await Promise.all([
        DigitalSignature.aggregate([
          { $match: matchStage },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        DigitalSignature.aggregate([
          { $match: { ...matchStage, status: 'signed' } },
          { $group: { _id: '$signatureType', count: { $sum: 1 } } },
        ]),
        SignatureChain.countDocuments({ ...matchStage }),
        SignatureChain.countDocuments({ ...matchStage, status: 'completed' }),
      ]);

      return {
        success: true,
        stats: {
          byStatus: statusCounts.map(s => ({
            status: s._id,
            ...(SIGNATURE_TYPES[s._id] || {}),
            count: s.count,
          })),
          byType: typeCounts.map(t => ({
            type: t._id,
            ...(SIGNATURE_TYPES[t._id] || {}),
            count: t.count,
          })),
          chains: {
            total: totalChains,
            completed: completedChains,
            completionRate: totalChains > 0 ? Math.round((completedChains / totalChains) * 100) : 0,
          },
        },
      };
    } catch (err) {
      logger.error(`[Signature] خطأ في الإحصائيات: ${err.message}`);
      throw err;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  أدوات داخلية
  // ═══════════════════════════════════════════════════════════

  _formatSignature(signature) {
    const typeConfig = SIGNATURE_TYPES[signature.signatureType] || {};
    return {
      id: signature._id,
      documentId: signature.documentId,
      documentVersion: signature.documentVersion,
      signer: {
        id: signature.signerId?._id || signature.signerId,
        name: signature.signerName || signature.signerId?.name || '',
        email: signature.signerEmail || signature.signerId?.email || '',
        role: signature.signerRole,
        department: signature.signerDepartment,
      },
      type: {
        key: signature.signatureType,
        label: typeConfig.label || signature.signatureType,
        labelEn: typeConfig.labelEn || '',
        icon: typeConfig.icon || '✍️',
        color: typeConfig.color || '#6B7280',
      },
      signatureHash: signature.signatureHash,
      signatureImage: signature.signatureImage ? '(exists)' : null,
      signatureText: signature.signatureText,
      position: signature.position,
      comments: signature.comments,
      reason: signature.reason,
      status: signature.status,
      signedAt: signature.signedAt,
      isValid: signature.isValid,
      expiresAt: signature.expiresAt,
      chainId: signature.signatureChainId,
      orderInChain: signature.orderInChain,
      createdAt: signature.createdAt,
    };
  }

  _formatChain(chain) {
    const totalParticipants = chain.participants?.length || 0;
    const signedCount = chain.participants?.filter(p => p.status === 'signed').length || 0;
    const progress =
      totalParticipants > 0 ? Math.round((signedCount / totalParticipants) * 100) : 0;

    return {
      id: chain._id,
      documentId: chain.documentId,
      name: chain.name,
      nameEn: chain.nameEn,
      description: chain.description,
      participants: chain.participants?.map(p => ({
        userId: p.userId?._id || p.userId,
        name: p.name || p.userId?.name || '',
        email: p.email || p.userId?.email || '',
        role: p.role,
        signatureType: p.signatureType,
        order: p.order,
        isRequired: p.isRequired,
        status: p.status,
        signatureId: p.signatureId,
        signedAt: p.signedAt,
        typeConfig: SIGNATURE_TYPES[p.signatureType] || {},
      })),
      settings: {
        requireSequential: chain.requireSequential,
        allowParallelSigning: chain.allowParallelSigning,
        expiresAt: chain.expiresAt,
        reminderInterval: chain.reminderInterval,
      },
      status: chain.status,
      currentOrder: chain.currentOrder,
      progress,
      completedAt: chain.completedAt,
      createdBy: chain.createdBy,
      createdAt: chain.createdAt,
    };
  }

  getSignatureTypes() {
    return SIGNATURE_TYPES;
  }
}

module.exports = new DocumentSignatureService();
module.exports.DigitalSignature = DigitalSignature;
module.exports.SignatureChain = SignatureChain;
module.exports.SIGNATURE_TYPES = SIGNATURE_TYPES;
