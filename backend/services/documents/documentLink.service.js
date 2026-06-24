'use strict';

/**
 * Document Link Service
 * ═════════════════════
 * ربط المستندات بالكيانات (Employee, Beneficiary, Invoice, etc.)
 * وإدارة هذه الروابط بشكل مركزي.
 */

const mongoose = require('mongoose');
const Document = require('../../models/Document');
const logger = require('../../utils/logger');

async function linkDocumentToEntity(documentId, entityType, entityId, metadata = {}) {
  if (!mongoose.isValidObjectId(documentId)) {
    throw new Error('معرّف المستند غير صالح');
  }
  if (!entityType || !entityId) {
    throw new Error('نوع الكيان ومعرّفه مطلوبان');
  }

  const document = await Document.findByIdAndUpdate(
    documentId,
    {
      entityType,
      entityId: String(entityId),
      sourceModule: metadata.sourceModule || inferSourceModule(entityType),
      linkedAt: new Date(),
      linkedBy: metadata.userId || null,
      ...(metadata.category ? { category: metadata.category } : {}),
      ...(metadata.tags
        ? {
            $addToSet: {
              tags: { $each: Array.isArray(metadata.tags) ? metadata.tags : [metadata.tags] },
            },
          }
        : {}),
    },
    { new: true, runValidators: true }
  );

  if (!document) {
    throw new Error('المستند غير موجود');
  }

  logger.info(`[DocumentLink] Linked ${documentId} to ${entityType}:${entityId}`);

  try {
    const eventPublisher = require('./documentEventPublisher.service');
    await eventPublisher.publish('linked', {
      documentId,
      entityType,
      entityId: String(entityId),
      sourceModule: document.sourceModule,
      linkedBy: metadata.userId,
    });
  } catch (err) {
    logger.warn(`[DocumentLink] Event publish failed: ${err.message}`);
  }

  return document;
}

async function unlinkDocumentFromEntity(documentId, entityType, entityId) {
  if (!mongoose.isValidObjectId(documentId)) {
    throw new Error('معرّف المستند غير صالح');
  }

  const document = await Document.findById(documentId);
  if (!document) {
    throw new Error('المستند غير موجود');
  }

  if (document.entityType === entityType && String(document.entityId) === String(entityId)) {
    document.entityType = null;
    document.entityId = null;
    document.linkedAt = null;
    document.linkedBy = null;
    await document.save();
    logger.info(`[DocumentLink] Unlinked ${documentId} from ${entityType}:${entityId}`);
  }

  return document;
}

async function getDocumentsForEntity(entityType, entityId, options = {}) {
  if (!entityType || !entityId) {
    throw new Error('نوع الكيان ومعرّفه مطلوبان');
  }

  const filter = {
    entityType,
    entityId: String(entityId),
    status: { $ne: 'محذوف' },
    isArchived: options.includeArchived ? undefined : false,
  };

  // Clean undefined values
  Object.keys(filter).forEach(key => filter[key] === undefined && delete filter[key]);

  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(options.limit, 10) || 50));

  const [documents, total] = await Promise.all([
    Document.find(filter)
      .sort(options.sort || { createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('uploadedBy', 'name email')
      .lean(),
    Document.countDocuments(filter),
  ]);

  return {
    success: true,
    entityType,
    entityId: String(entityId),
    documents,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

async function getEntitiesForDocument(documentId) {
  if (!mongoose.isValidObjectId(documentId)) {
    throw new Error('معرّف المستند غير صالح');
  }

  const document = await Document.findById(documentId)
    .select('entityType entityId sourceModule')
    .lean();
  if (!document) {
    throw new Error('المستند غير موجود');
  }

  return {
    success: true,
    documentId,
    entity:
      document.entityType && document.entityId
        ? { type: document.entityType, id: document.entityId, sourceModule: document.sourceModule }
        : null,
  };
}

function inferSourceModule(entityType) {
  const map = {
    Employee: 'hr',
    Beneficiary: 'medical',
    CaseManagement: 'medical',
    ClinicalAssessment: 'medical',
    ClinicalSession: 'medical',
    Invoice: 'finance',
    Payment: 'finance',
    InsuranceClaim: 'finance',
  };
  return map[entityType] || 'core';
}

module.exports = {
  linkDocumentToEntity,
  unlinkDocumentFromEntity,
  getDocumentsForEntity,
  getEntitiesForDocument,
  inferSourceModule,
};
