'use strict';

/**
 * Document → Finance Subscriber
 * ==============================
 * يستمع إلى أحداث المستندات ويحدث السجلات المالية.
 */

const logger = require('../../utils/logger');

let Invoice;
let Payment;
try {
  Invoice = require('../../models/Invoice');
  Payment = require('../../models/Payment');
} catch {
  Invoice = null;
  Payment = null;
}

function register(integrationBus) {
  if (!integrationBus || !Invoice || !Payment) {
    logger.warn('[DocumentFinanceSubscriber] Integration bus or finance models unavailable');
    return;
  }

  integrationBus.subscribe('documents.document.linked', async event => {
    const { entityType, entityId, documentId } = event.payload || {};
    if (!['Invoice', 'Payment'].includes(entityType) || !entityId || !documentId) return;

    try {
      if (entityType === 'Invoice') {
        await Invoice.findByIdAndUpdate(entityId, { $addToSet: { attachmentIds: documentId } });
      } else if (entityType === 'Payment') {
        await Payment.findByIdAndUpdate(entityId, { $addToSet: { attachmentIds: documentId } });
      }
      logger.info(
        `[DocumentFinanceSubscriber] Linked document ${documentId} to ${entityType}:${entityId}`
      );
    } catch (err) {
      logger.warn(`[DocumentFinanceSubscriber] Failed to link document: ${err.message}`);
    }
  });

  integrationBus.subscribe('documents.document.deleted', async event => {
    const { documentId } = event.payload || {};
    if (!documentId) return;

    try {
      await Invoice.updateMany(
        { attachmentIds: documentId },
        { $pull: { attachmentIds: documentId } }
      );
      await Payment.updateMany(
        { attachmentIds: documentId },
        { $pull: { attachmentIds: documentId } }
      );
      logger.info(
        `[DocumentFinanceSubscriber] Removed document ${documentId} from finance records`
      );
    } catch (err) {
      logger.warn(`[DocumentFinanceSubscriber] Failed to unlink document: ${err.message}`);
    }
  });

  logger.info('[DocumentFinanceSubscriber] Subscribed');
}

module.exports = { register };
