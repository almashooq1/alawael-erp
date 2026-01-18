const Document = require('../models/Document');
const crypto = require('crypto');

class DmsService {
  // --- Version Control ---
  async createNewVersion(docId, fileData, userId) {
    const doc = await Document.findById(docId);
    if (!doc) throw new Error('Document not found');

    // Archive current version
    doc.previousVersions.push({
      versionNumber: doc.version,
      uploadedAt: doc.lastModified,
      uploadedBy: doc.lastModifiedBy || doc.uploadedBy,
      filePath: doc.filePath,
      fileSize: doc.fileSize,
      changes: 'New version upload',
    });

    // Update with new file
    doc.version += 1;
    doc.filePath = fileData.path;
    doc.fileSize = fileData.size;
    doc.lastModified = new Date();
    doc.lastModifiedBy = userId;

    return await doc.save();
  }

  // --- Electronic Signature ---
  async signDocument(docId, userId, signaturePin) {
    const doc = await Document.findById(docId);
    // In real app: Verify PIN against user profile
    const signatureHash = crypto.createHash('sha256').update(`${docId}-${userId}-${new Date().toISOString()}`).digest('hex');

    doc.signatures.push({
      signedBy: userId,
      signedAt: new Date(),
      signatureHash,
      status: 'signed',
    });

    return await doc.save();
  }

  // --- Permissions / Sharing ---
  async grantAccess(docId, targetUserId, permission = 'view') {
    const doc = await Document.findById(docId);

    // Check if already exists
    const existing = doc.sharedWith.find(s => s.userId.toString() === targetUserId.toString());
    if (existing) {
      existing.permission = permission;
    } else {
      doc.sharedWith.push({
        userId: targetUserId,
        permission,
        sharedAt: new Date(),
      });
    }
    return await doc.save();
  }

  // --- Mock OCR ---
  async triggerOcr(docId) {
    const doc = await Document.findById(docId);
    doc.ocrStatus = 'completed';
    doc.extractedText = `Extracted text content from ${doc.fileName}... [Simulated OCR Result]`;
    return await doc.save();
  }

  async getDocument(docId) {
    return await Document.findById(docId).populate('signatures.signedBy', 'firstName lastName email');
  }
}

module.exports = DmsService;
