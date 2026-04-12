'use strict';
/**
 * DocumentVault Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddDocumentVault.js
 */

const {
  DDDVaultDocument,
  DDDFolder,
  DDDDocumentTag,
  DDDDocumentAccess,
  DOCUMENT_TYPES,
  DOCUMENT_STATUSES,
  STORAGE_TYPES,
  MIME_CATEGORIES,
  ACCESS_LEVELS,
  CLASSIFICATION_LEVELS,
  BUILTIN_TAGS,
} = require('../models/DddDocumentVault');

const BaseCrudService = require('./base/BaseCrudService');

class DocumentVault extends BaseCrudService {
  constructor() {
    super('DocumentVault', {
      description: 'Secure document storage, versioning & access control',
      version: '1.0.0',
    }, {
      vaultDocuments: DDDVaultDocument,
      folders: DDDFolder,
      documentTags: DDDDocumentTag,
      documentAccesss: DDDDocumentAccess,
    })
  }

  async initialize() {
    await this._seedTags();
    this.log('Document Vault initialised ✓');
    return true;
  }

  async _seedTags() {
    for (const t of BUILTIN_TAGS) {
      const exists = await DDDDocumentTag.findOne({ code: t.code }).lean();
      if (!exists) await DDDDocumentTag.create(t);
    }
  }

  /* ── Documents ── */
  async listDocuments(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    if (filters.folderId) q.folderId = filters.folderId;
    if (filters.classification) q.classification = filters.classification;
    return DDDVaultDocument.find(q).sort({ updatedAt: -1 }).limit(100).lean();
  }
  async getDocument(id) { return this._getById(DDDVaultDocument, id); }
  async uploadDocument(data) {
    if (!data.documentCode) data.documentCode = `DOC-${Date.now()}`;
    return DDDVaultDocument.create(data);
  }
  async updateDocument(id, data) { return this._update(DDDVaultDocument, id, data, { runValidators: true }); }
  async deleteDocument(id) {
    return DDDVaultDocument.findByIdAndDelete(id).lean();
  }

  async searchDocuments(query) {
    return DDDVaultDocument.find({ $text: { $search: query } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(50)
      .lean();
  }

  /* ── Folders ── */
  async listFolders(parentId = null) {
    return DDDFolder.find({ parentId }).sort({ name: 1 }).lean();
  }
  async createFolder(data) {
    if (!data.folderCode) data.folderCode = `FLD-${Date.now()}`;
    return DDDFolder.create(data);
  }
  async updateFolder(id, data) { return this._update(DDDFolder, id, data); }
  async deleteFolder(id) {
    return DDDFolder.findByIdAndDelete(id).lean();
  }

  /* ── Tags ── */
  async listTags() { return this._list(DDDDocumentTag, { isActive: true }, { sort: { name: 1 } }); }
  async createTag(data) { return this._create(DDDDocumentTag, data); }

  /* ── Access ── */
  async listAccess(documentId) {
    return DDDDocumentAccess.find({ documentId, isActive: true }).lean();
  }
  async grantAccess(data) { return this._create(DDDDocumentAccess, data); }
  async revokeAccess(id) {
    return DDDDocumentAccess.findByIdAndUpdate(id, { isActive: false }, { new: true }).lean();
  }

  /* ── Analytics ── */
  async getVaultAnalytics() {
    const [documents, folders, tags, access] = await Promise.all([
      DDDVaultDocument.countDocuments(),
      DDDFolder.countDocuments(),
      DDDDocumentTag.countDocuments(),
      DDDDocumentAccess.countDocuments(),
    ]);
    return { documents, folders, tags, accessEntries: access };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new DocumentVault();
