'use strict';

/**
 * Document → Medical Subscriber
 * ==============================
 * يستمع إلى أحداث المستندات ويحدث السجلات الطبية.
 */

const logger = require('../../utils/logger');

let CaseManagement;
try {
  CaseManagement = require('../../models/CaseManagement');
} catch {
  CaseManagement = null;
}

function register(integrationBus) {
  if (!integrationBus || !CaseManagement) {
    logger.warn('[DocumentMedicalSubscriber] Integration bus or CaseManagement model unavailable');
    return;
  }

  integrationBus.subscribe('documents.document.linked', async event => {
    const { entityType, entityId, documentId } = event.payload || {};
    if (!['Beneficiary', 'CaseManagement'].includes(entityType) || !entityId || !documentId) return;

    try {
      if (entityType === 'CaseManagement') {
        const doc = await require('../../models/Document').findById(documentId).lean();
        if (!doc) return;
        await CaseManagement.findByIdAndUpdate(entityId, {
          $push: {
            medicalFiles: {
              fileName: doc.originalFileName || doc.fileName,
              fileType: doc.tags?.[0] || 'أخرى',
              fileUrl: `/api/v1/documents/${documentId}/download`,
              documentId,
              fileSize: doc.fileSize,
              uploadedBy: doc.uploadedBy,
              uploadDate: doc.createdAt,
              description: doc.description,
              tags: doc.tags,
            },
          },
        });
      }
      logger.info(
        `[DocumentMedicalSubscriber] Linked document ${documentId} to ${entityType}:${entityId}`
      );
    } catch (err) {
      logger.warn(`[DocumentMedicalSubscriber] Failed to link document: ${err.message}`);
    }
  });

  integrationBus.subscribe('documents.document.deleted', async event => {
    const { documentId } = event.payload || {};
    if (!documentId) return;

    try {
      await CaseManagement.updateMany(
        { 'medicalFiles.documentId': documentId },
        { $pull: { medicalFiles: { documentId } } }
      );
      logger.info(`[DocumentMedicalSubscriber] Removed document ${documentId} from case files`);
    } catch (err) {
      logger.warn(`[DocumentMedicalSubscriber] Failed to unlink document: ${err.message}`);
    }
  });

  logger.info('[DocumentMedicalSubscriber] Subscribed');
}

module.exports = { register };
