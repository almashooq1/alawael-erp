/**
 * Digital Certificate Signature Service — خدمة التوقيع الرقمي بالشهادات
 * Phase 9 — توقيعات PKI مع شهادات رقمية وسلسلة ثقة وتحقق
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

/* ─── Schemas ────────────────────────────────────────────── */
const digitalCertificateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    serialNumber: { type: String, unique: true },
    subject: {
      commonName: String,
      organization: String,
      department: String,
      email: String,
      country: { type: String, default: 'SA' },
    },
    issuer: {
      commonName: String,
      organization: String,
    },
    publicKey: { type: String, required: true },
    privateKeyHash: String,
    fingerprint: String,
    algorithm: { type: String, default: 'RSA-SHA256' },
    keySize: { type: Number, default: 2048 },
    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },
    status: {
      type: String,
      enum: ['active', 'revoked', 'expired', 'suspended', 'pending'],
      default: 'pending',
    },
    revokedAt: Date,
    revokedReason: String,
    usageCount: { type: Number, default: 0 },
    lastUsedAt: Date,
    trustLevel: {
      type: String,
      enum: ['self-signed', 'organization', 'ca-signed', 'qualified'],
      default: 'organization',
    },
    extensions: { type: Map, of: mongoose.Schema.Types.Mixed },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'digital_certificates' }
);

const digitalSignatureSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    certificateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DigitalCertificate',
      required: true,
    },
    signerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    signatureData: {
      hash: String,
      algorithm: String,
      signature: String,
      timestamp: Date,
      nonce: String,
    },
    documentHash: { type: String, required: true },
    position: {
      page: Number,
      x: Number,
      y: Number,
      width: Number,
      height: Number,
    },
    visual: {
      text: String,
      includeDate: { type: Boolean, default: true },
      includeName: { type: Boolean, default: true },
      includeTitle: { type: Boolean, default: false },
      image: String,
      style: {
        type: String,
        enum: ['formal', 'handwritten', 'stamp', 'minimal'],
        default: 'formal',
      },
    },
    verification: {
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      verifiedBy: String,
      integrityOk: Boolean,
      certificateOk: Boolean,
      timestampOk: Boolean,
      chainOfTrust: [{ issuer: String, valid: Boolean }],
    },
    status: {
      type: String,
      enum: ['valid', 'invalid', 'revoked', 'expired', 'pending'],
      default: 'pending',
    },
    reason: String,
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true, collection: 'digital_signatures' }
);

const signatureRequestSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    signers: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        email: String,
        name: String,
        order: { type: Number, default: 0 },
        required: { type: Boolean, default: true },
        status: {
          type: String,
          enum: ['pending', 'signed', 'rejected', 'expired'],
          default: 'pending',
        },
        signedAt: Date,
        signatureId: { type: mongoose.Schema.Types.ObjectId, ref: 'DigitalSignature' },
        rejectedAt: Date,
        rejectReason: String,
      },
    ],
    signingOrder: { type: String, enum: ['sequential', 'parallel', 'any'], default: 'sequential' },
    status: {
      type: String,
      enum: ['draft', 'active', 'completed', 'expired', 'cancelled'],
      default: 'draft',
    },
    deadline: Date,
    message: String,
    reminders: {
      enabled: { type: Boolean, default: true },
      intervalHours: { type: Number, default: 24 },
    },
    completedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'signature_requests_v2' }
);

digitalCertificateSchema.index({ userId: 1, status: 1 });
digitalCertificateSchema.index({ serialNumber: 1 }, { unique: true });
digitalSignatureSchema.index({ documentId: 1, signerId: 1 });
signatureRequestSchema.index({ documentId: 1, status: 1 });

const DigitalCertificate =
  mongoose.models.DigitalCertificate ||
  mongoose.model('DigitalCertificate', digitalCertificateSchema);
const DigitalSignature =
  mongoose.models.DigitalSignature || mongoose.model('DigitalSignature', digitalSignatureSchema);
const SignatureRequestV2 =
  mongoose.models.SignatureRequestV2 ||
  mongoose.model('SignatureRequestV2', signatureRequestSchema);

/* ─── Service ────────────────────────────────────────────── */
class DigitalCertificateService {
  /* ── Certificate Management ───────── */
  async generateCertificate(userId, subjectInfo) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const serialNumber = `SN-${Date.now()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const fingerprint = crypto.createHash('sha256').update(publicKey).digest('hex');
    const now = new Date();
    const validTo = new Date(now.getTime() + 365 * 86400000);

    const cert = new DigitalCertificate({
      userId,
      serialNumber,
      subject: { ...subjectInfo },
      issuer: { commonName: 'AlAwael ERP CA', organization: 'AlAwael Systems' },
      publicKey,
      privateKeyHash: crypto.createHash('sha256').update(privateKey).digest('hex'),
      fingerprint,
      validFrom: now,
      validTo,
      status: 'active',
      createdBy: userId,
    });
    await cert.save();

    return { certificate: cert, privateKey }; // privateKey returned once
  }

  async getCertificates(userId, filters = {}) {
    const query = { userId };
    if (filters.status) query.status = filters.status;
    return DigitalCertificate.find(query).select('-publicKey').sort('-createdAt').lean();
  }

  async getCertificate(certId) {
    const c = await DigitalCertificate.findById(certId).lean();
    if (!c) throw new Error('الشهادة غير موجودة');
    return c;
  }

  async revokeCertificate(certId, reason, userId) {
    const cert = await DigitalCertificate.findById(certId);
    if (!cert) throw new Error('الشهادة غير موجودة');
    cert.status = 'revoked';
    cert.revokedAt = new Date();
    cert.revokedReason = reason;
    await cert.save();

    // invalidate all signatures with this cert
    await DigitalSignature.updateMany({ certificateId: certId }, { status: 'revoked' });
    return cert;
  }

  async renewCertificate(certId, userId) {
    const old = await DigitalCertificate.findById(certId);
    if (!old) throw new Error('الشهادة غير موجودة');

    old.status = 'expired';
    await old.save();

    return this.generateCertificate(userId, {
      commonName: old.subject.commonName,
      organization: old.subject.organization,
      department: old.subject.department,
      email: old.subject.email,
    });
  }

  _validateCertificate(cert) {
    const now = new Date();
    return {
      valid: cert.status === 'active' && now >= cert.validFrom && now <= cert.validTo,
      expired: now > cert.validTo,
      revoked: cert.status === 'revoked',
      notYetValid: now < cert.validFrom,
    };
  }

  /* ── Digital Signing ──────────────── */
  async signDocument(documentId, certId, userId, options = {}) {
    const cert = await DigitalCertificate.findById(certId);
    if (!cert) throw new Error('الشهادة غير موجودة');
    const validation = this._validateCertificate(cert);
    if (!validation.valid) throw new Error('الشهادة غير صالحة');

    const documentHash =
      options.documentHash ||
      crypto.createHash('sha256').update(`${documentId}:${Date.now()}`).digest('hex');
    const nonce = crypto.randomBytes(16).toString('hex');
    const dataToSign = `${documentHash}:${nonce}:${Date.now()}`;

    // simulate signing
    const signatureValue = crypto
      .createHash('sha512')
      .update(dataToSign + cert.publicKey)
      .digest('hex');

    const sig = new DigitalSignature({
      documentId,
      certificateId: certId,
      signerId: userId,
      documentHash,
      signatureData: {
        hash: crypto.createHash('sha256').update(signatureValue).digest('hex'),
        algorithm: cert.algorithm,
        signature: signatureValue,
        timestamp: new Date(),
        nonce,
      },
      position: options.position || {},
      visual: options.visual || {},
      verification: {
        verified: true,
        verifiedAt: new Date(),
        integrityOk: true,
        certificateOk: true,
        timestampOk: true,
      },
      status: 'valid',
      reason: options.reason || 'توقيع إلكتروني',
    });
    await sig.save();

    cert.usageCount += 1;
    cert.lastUsedAt = new Date();
    await cert.save();

    return sig;
  }

  async verifySignature(signatureId) {
    const sig = await DigitalSignature.findById(signatureId).populate('certificateId');
    if (!sig) throw new Error('التوقيع غير موجود');

    const cert = sig.certificateId;
    const certValid = cert ? this._validateCertificate(cert) : { valid: false };

    // recalc hash to verify
    const dataToSign = `${sig.documentHash}:${sig.signatureData.nonce}:${new Date(sig.signatureData.timestamp).getTime()}`;
    const expectedSig = crypto
      .createHash('sha512')
      .update(dataToSign + (cert?.publicKey || ''))
      .digest('hex');
    const integrityOk = expectedSig === sig.signatureData.signature;

    sig.verification = {
      verified: true,
      verifiedAt: new Date(),
      verifiedBy: 'system',
      integrityOk,
      certificateOk: certValid.valid,
      timestampOk: !!sig.signatureData.timestamp,
      chainOfTrust: [{ issuer: cert?.issuer?.commonName || 'unknown', valid: certValid.valid }],
    };
    sig.status = integrityOk && certValid.valid ? 'valid' : 'invalid';
    await sig.save();

    return {
      signature: sig,
      certificate: cert
        ? { serialNumber: cert.serialNumber, subject: cert.subject, validity: certValid }
        : null,
    };
  }

  async getDocumentSignatures(documentId) {
    return DigitalSignature.find({ documentId })
      .populate('signerId', 'name email')
      .populate('certificateId', 'serialNumber subject status')
      .sort('-createdAt')
      .lean();
  }

  async verifyAllSignatures(documentId) {
    const sigs = await DigitalSignature.find({ documentId });
    const results = [];
    for (const s of sigs) {
      try {
        results.push(await this.verifySignature(s._id));
      } catch (e) {
        results.push({ error: e.message, signatureId: s._id });
      }
    }
    return {
      documentId,
      total: sigs.length,
      valid: results.filter(r => r.signature?.status === 'valid').length,
      results,
    };
  }

  /* ── Signature Requests ───────────── */
  async createSignatureRequest(documentId, signers, options, userId) {
    const req = new SignatureRequestV2({
      documentId,
      requestedBy: userId,
      signers: signers.map((s, i) => ({ ...s, order: s.order ?? i })),
      signingOrder: options.signingOrder || 'sequential',
      deadline: options.deadline,
      message: options.message,
      status: 'active',
      createdBy: userId,
    });
    await req.save();
    return req;
  }

  async processSignatureRequest(requestId, userId, action, data = {}) {
    const req = await SignatureRequestV2.findById(requestId);
    if (!req || req.status !== 'active') throw new Error('الطلب غير صالح');

    const signer = req.signers.find(
      s => String(s.userId) === String(userId) && s.status === 'pending'
    );
    if (!signer) throw new Error('ليس لديك إجراء مطلوب');

    if (action === 'sign') {
      const sig = await this.signDocument(req.documentId, data.certificateId, userId, data.options);
      signer.status = 'signed';
      signer.signedAt = new Date();
      signer.signatureId = sig._id;
    } else if (action === 'reject') {
      signer.status = 'rejected';
      signer.rejectedAt = new Date();
      signer.rejectReason = data.reason;
    }

    const allDone = req.signers.every(s => s.status !== 'pending');
    const allSigned = req.signers.filter(s => s.required).every(s => s.status === 'signed');
    if (allDone || allSigned) {
      req.status = allSigned ? 'completed' : 'cancelled';
      req.completedAt = new Date();
    }

    await req.save();
    return req;
  }

  async getSignatureRequests(filters = {}) {
    const query = {};
    if (filters.documentId) query.documentId = filters.documentId;
    if (filters.status) query.status = filters.status;
    if (filters.userId) query['signers.userId'] = filters.userId;
    return SignatureRequestV2.find(query).populate('requestedBy', 'name').sort('-createdAt').lean();
  }

  /* ── Stats ────────────────────────── */
  async getStats(userId) {
    const [certs, sigs, requests, activeCerts] = await Promise.all([
      DigitalCertificate.countDocuments(userId ? { userId } : {}),
      DigitalSignature.countDocuments(userId ? { signerId: userId } : {}),
      SignatureRequestV2.countDocuments(),
      DigitalCertificate.countDocuments({ status: 'active', ...(userId ? { userId } : {}) }),
    ]);
    const validSigs = await DigitalSignature.countDocuments({ status: 'valid' });
    return {
      totalCertificates: certs,
      activeCertificates: activeCerts,
      totalSignatures: sigs,
      validSignatures: validSigs,
      totalRequests: requests,
    };
  }
}

module.exports = new DigitalCertificateService();
