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

  const bus = getBus();
  if (!bus || !bus.publish) {
    logger.debug(`[DocumentEventPublisher] Bus not available, skipping event ${eventType}`);
    return null;
  }

  try {
    const result = await bus.publish('documents', `document.${eventType}`, payload, {
      domain: 'documents',
      aggregateType: 'Document',
      aggregateId: payload.documentId,
      priority: payload.isConfidential ? 'high' : 'normal',
      ...options,
    });
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
