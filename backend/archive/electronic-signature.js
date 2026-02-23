/**
 * Electronic Signature Service - خدمة التوقيع الإلكتروني
 * Digital Signature Management for Archive Documents
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Electronic Signature Configuration
 */
const signatureConfig = {
  // Hash algorithm
  algorithm: 'sha256',
  
  // Signature types
  types: {
    simple: 'توقيع بسيط',
    digital: 'توقيع رقمي',
    biometric: 'توقيع بيومتري',
    stamp: 'ختم إلكتروني',
  },
  
  // Validity
  validity: {
    defaultDays: 365,
    maxDays: 1825, // 5 years
  },
  
  // Providers
  providers: ['local', 'adam', 'nafath', 'yesser'],
};

/**
 * Signature Request Schema
 */
const SignatureRequestSchema = new mongoose.Schema({
  // Document reference
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  documentNumber: String,
  
  // Request details
  requestId: { type: String, unique: true, default: () => `SR-${Date.now()}-${crypto.randomBytes(4).toString('hex')}` },
  
  // Signers
  signers: [{
    userId: String,
    name: String,
    email: String,
    phone: String,
    nationalId: String,
    order: { type: Number, default: 0 },
    role: { type: String, enum: ['signer', 'approver', 'witness', 'cc'], default: 'signer' },
    status: { type: String, enum: ['pending', 'signed', 'rejected', 'expired'], default: 'pending' },
    signatureType: { type: String, enum: ['simple', 'digital', 'biometric'], default: 'simple' },
    signedAt: Date,
    signatureData: mongoose.Schema.Types.Mixed,
    ip: String,
    userAgent: String,
    notes: String,
  }],
  
  // Status
  status: { type: String, enum: ['draft', 'sent', 'in_progress', 'completed', 'cancelled', 'expired'], default: 'draft' },
  
  // Settings
  settings: {
    sequential: { type: Boolean, default: true }, // Sign in order
    requireAllSigners: { type: Boolean, default: true },
    allowRejection: { type: Boolean, default: true },
    remindInterval: { type: Number, default: 24 }, // hours
    expireAfter: { type: Number, default: 30 }, // days
  },
  
  // Timestamps
  sentAt: Date,
  completedAt: Date,
  expiresAt: Date,
  
  // Metadata
  title: String,
  message: String,
  priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
  
  // Verification
  verificationCode: String,
  accessCode: String,
  
  // Creator
  createdBy: String,
  createdAt: { type: Date, default: Date.now },
  
  // Tenant
  tenantId: String,
}, {
  collection: 'signature_requests',
});

// Indexes
SignatureRequestSchema.index({ requestId: 1 });
SignatureRequestSchema.index({ documentId: 1 });
SignatureRequestSchema.index({ 'signers.userId': 1, status: 1 });

/**
 * Digital Signature Schema
 */
const DigitalSignatureSchema = new mongoose.Schema({
  // Reference
  signatureRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'SignatureRequest' },
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  
  // Signer info
  signer: {
    userId: String,
    name: String,
    nationalId: String,
    email: String,
  },
  
  // Signature data
  signature: {
    type: { type: String, enum: ['simple', 'digital', 'biometric', 'stamp'] },
    hash: String,
    algorithm: { type: String, default: 'sha256' },
    value: String, // Base64 encoded signature
    certificate: String, // Digital certificate
    timestamp: Date,
  },
  
  // Document hash at signing time
  documentHash: String,
  
  // Verification
  verification: {
    isValid: { type: Boolean, default: true },
    verifiedAt: Date,
    verifiedBy: String,
  },
  
  // Validity period
  validFrom: { type: Date, default: Date.now },
  validUntil: Date,
  
  // Location (optional)
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
  },
  
  // Device info
  device: {
    ip: String,
    userAgent: String,
    fingerprint: String,
  },
  
  // Status
  status: { type: String, enum: ['active', 'revoked', 'expired'], default: 'active' },
  revokedAt: Date,
  revokeReason: String,
  
  // Tenant
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
}, {
  collection: 'digital_signatures',
});

/**
 * Electronic Signature Service Class
 */
class ElectronicSignatureService {
  constructor() {
    this.SignatureRequest = null;
    this.DigitalSignature = null;
  }
  
  /**
   * Initialize service
   */
  async initialize(connection) {
    this.SignatureRequest = connection.model('SignatureRequest', SignatureRequestSchema);
    this.DigitalSignature = connection.model('DigitalSignature', DigitalSignatureSchema);
    console.log('✅ Electronic Signature Service initialized');
  }
  
  /**
   * Create signature request
   */
  async createRequest(data) {
    const {
      documentId,
      documentNumber,
      title,
      message,
      signers,
      settings = {},
      createdBy,
      tenantId,
    } = data;
    
    // Generate verification code
    const verificationCode = crypto.randomBytes(6).toString('hex').toUpperCase();
    const accessCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    // Calculate expiry
    const expireAfter = settings.expireAfter || signatureConfig.validity.defaultDays;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expireAfter);
    
    const request = await this.SignatureRequest.create({
      documentId,
      documentNumber,
      title,
      message,
      signers: signers.map((s, index) => ({
        ...s,
        order: index,
        status: 'pending',
      })),
      settings: {
        sequential: settings.sequential !== false,
        requireAllSigners: settings.requireAllSigners !== false,
        allowRejection: settings.allowRejection !== false,
        remindInterval: settings.remindInterval || 24,
        expireAfter,
      },
      status: 'draft',
      verificationCode,
      accessCode,
      expiresAt,
      createdBy,
      tenantId,
    });
    
    return request;
  }
  
  /**
   * Send signature request
   */
  async sendRequest(requestId) {
    const request = await this.SignatureRequest.findById(requestId);
    if (!request) throw new Error('Request not found');
    
    if (request.status !== 'draft') {
      throw new Error('Request already sent');
    }
    
    request.status = 'sent';
    request.sentAt = new Date();
    await request.save();
    
    // Send notifications to signers
    if (request.settings.sequential) {
      await this.notifySigner(request, request.signers[0]);
    } else {
      for (const signer of request.signers) {
        await this.notifySigner(request, signer);
      }
    }
    
    return request;
  }
  
  /**
   * Notify signer
   */
  async notifySigner(request, signer) {
    // Would send email/SMS notification
    console.log(`Notifying signer: ${signer.email} for request ${request.requestId}`);
  }
  
  /**
   * Sign document
   */
  async signDocument(requestId, signerId, signatureData) {
    const request = await this.SignatureRequest.findById(requestId);
    if (!request) throw new Error('Request not found');
    
    if (request.status === 'completed' || request.status === 'cancelled') {
      throw new Error(`Request already ${request.status}`);
    }
    
    if (new Date() > request.expiresAt) {
      throw new Error('Request has expired');
    }
    
    // Find signer
    const signerIndex = request.signers.findIndex(s => s.userId === signerId);
    if (signerIndex === -1) throw new Error('Signer not found');
    
    const signer = request.signers[signerIndex];
    
    // Check if already signed
    if (signer.status === 'signed') {
      throw new Error('Already signed');
    }
    
    // If sequential, check if it's this signer's turn
    if (request.settings.sequential) {
      const pendingBefore = request.signers.slice(0, signerIndex).filter(s => s.status === 'pending');
      if (pendingBefore.length > 0) {
        throw new Error('Previous signers must sign first');
      }
    }
    
    // Update signer status
    signer.status = 'signed';
    signer.signedAt = new Date();
    signer.signatureData = signatureData;
    signer.ip = signatureData.ip;
    signer.userAgent = signatureData.userAgent;
    
    // Create digital signature record
    await this.createDigitalSignature(request, signer, signatureData);
    
    // Update request status
    request.status = 'in_progress';
    
    // Check if all required signers have signed
    const allSigned = request.signers
      .filter(s => s.role === 'signer' || s.role === 'approver')
      .every(s => s.status === 'signed');
    
    if (allSigned) {
      request.status = 'completed';
      request.completedAt = new Date();
    } else if (request.settings.sequential) {
      // Notify next signer
      const nextSigner = request.signers.find(s => s.status === 'pending');
      if (nextSigner) {
        await this.notifySigner(request, nextSigner);
      }
    }
    
    await request.save();
    return request;
  }
  
  /**
   * Create digital signature
   */
  async createDigitalSignature(request, signer, signatureData) {
    // Generate document hash
    const documentHash = crypto
      .createHash(signatureConfig.algorithm)
      .update(`${request.documentId}-${signer.userId}-${Date.now()}`)
      .digest('hex');
    
    // Generate signature hash
    const signatureHash = crypto
      .createHash(signatureConfig.algorithm)
      .update(JSON.stringify(signatureData))
      .digest('hex');
    
    // Calculate validity
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + signatureConfig.validity.defaultDays);
    
    const signature = await this.DigitalSignature.create({
      signatureRequestId: request._id,
      documentId: request.documentId,
      signer: {
        userId: signer.userId,
        name: signer.name,
        nationalId: signer.nationalId,
        email: signer.email,
      },
      signature: {
        type: signer.signatureType || 'simple',
        hash: signatureHash,
        algorithm: signatureConfig.algorithm,
        value: signatureData.signature,
        timestamp: new Date(),
      },
      documentHash,
      verification: {
        isValid: true,
        verifiedAt: new Date(),
      },
      validFrom: new Date(),
      validUntil,
      device: {
        ip: signatureData.ip,
        userAgent: signatureData.userAgent,
      },
      tenantId: request.tenantId,
    });
    
    return signature;
  }
  
  /**
   * Reject signature request
   */
  async rejectRequest(requestId, signerId, reason) {
    const request = await this.SignatureRequest.findById(requestId);
    if (!request) throw new Error('Request not found');
    
    const signer = request.signers.find(s => s.userId === signerId);
    if (!signer) throw new Error('Signer not found');
    
    signer.status = 'rejected';
    signer.signedAt = new Date();
    signer.notes = reason;
    
    if (request.settings.requireAllSigners) {
      request.status = 'cancelled';
    }
    
    await request.save();
    return request;
  }
  
  /**
   * Cancel signature request
   */
  async cancelRequest(requestId, reason) {
    const request = await this.SignatureRequest.findById(requestId);
    if (!request) throw new Error('Request not found');
    
    if (request.status === 'completed') {
      throw new Error('Cannot cancel completed request');
    }
    
    request.status = 'cancelled';
    await request.save();
    
    return request;
  }
  
  /**
   * Verify signature
   */
  async verifySignature(signatureId) {
    const signature = await this.DigitalSignature.findById(signatureId);
    if (!signature) throw new Error('Signature not found');
    
    const now = new Date();
    const isValid = signature.status === 'active' && 
                    now >= signature.validFrom && 
                    now <= signature.validUntil;
    
    return {
      isValid,
      signature: {
        id: signature._id,
        type: signature.signature.type,
        signedAt: signature.signature.timestamp,
        signer: signature.signer,
      },
      document: {
        hash: signature.documentHash,
      },
      validity: {
        from: signature.validFrom,
        until: signature.validUntil,
        expired: now > signature.validUntil,
      },
    };
  }
  
  /**
   * Get signature request
   */
  async getRequest(requestId) {
    return this.SignatureRequest.findById(requestId);
  }
  
  /**
   * Get request by code
   */
  async getRequestByCode(verificationCode) {
    return this.SignatureRequest.findOne({ verificationCode });
  }
  
  /**
   * Get document signatures
   */
  async getDocumentSignatures(documentId) {
    return this.DigitalSignature.find({ documentId, status: 'active' })
      .sort({ createdAt: -1 });
  }
  
  /**
   * Get pending requests for user
   */
  async getPendingForUser(userId) {
    return this.SignatureRequest.find({
      'signers.userId': userId,
      'signers.status': 'pending',
      status: { $in: ['sent', 'in_progress'] },
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
  }
  
  /**
   * Revoke signature
   */
  async revokeSignature(signatureId, reason) {
    const signature = await this.DigitalSignature.findById(signatureId);
    if (!signature) throw new Error('Signature not found');
    
    signature.status = 'revoked';
    signature.revokedAt = new Date();
    signature.revokeReason = reason;
    await signature.save();
    
    return signature;
  }
  
  /**
   * Generate signature certificate
   */
  async generateCertificate(signatureId) {
    const signature = await this.DigitalSignature.findById(signatureId);
    if (!signature) throw new Error('Signature not found');
    
    const verification = await this.verifySignature(signatureId);
    
    return {
      certificateId: `CERT-${signature._id}`,
      document: {
        id: signature.documentId,
        hash: signature.documentHash,
      },
      signer: signature.signer,
      signature: {
        type: signature.signature.type,
        timestamp: signature.signature.timestamp,
        algorithm: signature.signature.algorithm,
      },
      verification: verification.isValid,
      generatedAt: new Date(),
    };
  }
  
  /**
   * Get statistics
   */
  async getStatistics(tenantId) {
    const filter = tenantId ? { tenantId } : {};
    
    const [total, completed, pending, cancelled] = await Promise.all([
      this.SignatureRequest.countDocuments(filter),
      this.SignatureRequest.countDocuments({ ...filter, status: 'completed' }),
      this.SignatureRequest.countDocuments({ ...filter, status: { $in: ['sent', 'in_progress'] } }),
      this.SignatureRequest.countDocuments({ ...filter, status: 'cancelled' }),
    ]);
    
    return {
      total,
      completed,
      pending,
      cancelled,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    };
  }
}

// Singleton instance
const electronicSignatureService = new ElectronicSignatureService();

/**
 * Signature Types (Arabic)
 */
const signatureTypes = {
  simple: { name: 'simple', label: 'توقيع بسيط', description: 'توقيع بنقرة واحدة' },
  digital: { name: 'digital', label: 'توقيع رقمي', description: 'توقيع معتمد بشهادة رقمية' },
  biometric: { name: 'biometric', label: 'توقيع بيومتري', description: 'توقيع بالبصمة أو الوجه' },
  stamp: { name: 'stamp', label: 'ختم إلكتروني', description: 'ختم إلكتروني للشركات' },
};

module.exports = {
  ElectronicSignatureService,
  electronicSignatureService,
  signatureConfig,
  signatureTypes,
};