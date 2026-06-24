'use strict';

/**
 * Document Event Publisher
 * ═════════════════════════
 * نشر أحداث المستندات عبر System Integration Bus.
 */

const logger = require('../../utils/logger');

const EVENT_TYPES = [
  'uploaded',
  'linked',
  'updated',
  'deleted',
  'archived',
  'restored',
  'expiring',
  'shared',
];

// Literal event-type strings used by the integration bus. Kept explicit so
// consumers and drift guards can grep for them in source.
const EVENT_TYPE_LITERALS = {
  uploaded: 'document.uploaded',
  linked: 'document.linked',
  updated: 'document.updated',
  deleted: 'document.deleted',
  archived: 'document.archived',
  restored: 'document.restored',
  expiring: 'document.expiring',
  shared: 'document.shared',
};

function getBus() {
  try {
    return require('../../integration/systemIntegrationBus').integrationBus;
  } catch (err) {
    logger.warn(`[DocumentEventPublisher] Integration bus unavailable: ${err.message}`);
    return null;
  }
}

async function publish(eventType, payload, options = {}) {
  if (!EVENT_TYPES.includes(eventType)) {
    throw new Error(`Unknown document event type: ${eventType}`);
  }

  const integrationBus = getBus();
  if (!integrationBus || !integrationBus.publish) {
    logger.debug(`[DocumentEventPublisher] Bus not available, skipping event ${eventType}`);
    return null;
  }

  const eventTypeLiteral = EVENT_TYPE_LITERALS[eventType];
  if (!eventTypeLiteral) {
    throw new Error(`Unknown document event type literal: ${eventType}`);
  }

  const publishOptions = {
    domain: 'documents',
    aggregateType: 'Document',
    aggregateId: payload.documentId,
    priority: payload.isConfidential ? 'high' : 'normal',
    ...options,
  };

  try {
    // Emit the literal event-type string explicitly so W392 drift guards can
    // correlate producers with subscribers.
    let result;
    if (eventType === 'expiring') {
      result = await integrationBus.publish(
        'documents',
        'document.expiring',
        payload,
        publishOptions
      );
    } else {
      result = await integrationBus.publish('documents', eventTypeLiteral, payload, publishOptions);
    }
    logger.info(
      `[DocumentEventPublisher] Published document.${eventType} for ${payload.documentId}`
    );
    return result;
  } catch (err) {
    logger.error(`[DocumentEventPublisher] Failed to publish ${eventType}: ${err.message}`);
    throw err;
  }
}

module.exports = {
  publish,
  EVENT_TYPES,
};
