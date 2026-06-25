'use strict';

/**
 * Document → HR Subscriber
 * ========================
 * يستمع إلى أحداث المستندات ويحدث سجلات الموظفين.
 */

const logger = require('../../utils/logger');

let Employee;
try {
  Employee = require('../../models/HR/Employee');
} catch {
  Employee = null;
}

function register(integrationBus) {
  if (!integrationBus || !Employee) {
    logger.warn('[DocumentHRSubscriber] Integration bus or Employee model unavailable');
    return;
  }

  integrationBus.subscribe('documents.document.linked', async event => {
    const { entityType, entityId, documentId } = event.payload || {};
    if (entityType !== 'Employee' || !entityId || !documentId) return;

    try {
      await Employee.findByIdAndUpdate(entityId, {
        $addToSet: { documentIds: documentId },
      });
      logger.info(`[DocumentHRSubscriber] Linked document ${documentId} to employee ${entityId}`);
    } catch (err) {
      logger.warn(`[DocumentHRSubscriber] Failed to link document: ${err.message}`);
    }
  });

  integrationBus.subscribe('documents.document.deleted', async event => {
    const { documentId } = event.payload || {};
    if (!documentId) return;

    try {
      await Employee.updateMany(
        { documentIds: documentId },
        { $pull: { documentIds: documentId } }
      );
      logger.info(`[DocumentHRSubscriber] Removed document ${documentId} from employees`);
    } catch (err) {
      logger.warn(`[DocumentHRSubscriber] Failed to unlink document: ${err.message}`);
    }
  });

  logger.info('[DocumentHRSubscriber] Subscribed');
}

module.exports = { register };
