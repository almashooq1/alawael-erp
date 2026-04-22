/**
 * channels/index.js — factory for the channel registry consumed by
 * the reporting engine.
 *
 * Phase 10 Commit 2.
 *
 * All channel adapters are lazy: we only wire the ones whose
 * underlying services are provided. A catalog entry that names a
 * channel with no adapter registered will still flow through the
 * engine, but its delivery row will be marked FAILED with
 * "channel <name> not registered" — surfaced to the reporting-ops
 * dashboard for operator action.
 *
 * Tests can hand-roll channels; production code calls this factory.
 */

'use strict';

const { createEmailChannel } = require('./email.channel');
const { createSmsChannel } = require('./sms.channel');
const { createWhatsAppChannel } = require('./whatsapp.channel');
const { createInAppChannel } = require('./inApp.channel');
const { createPortalInboxChannel } = require('./portalInbox.channel');
const { createPdfDownloadChannel } = require('./pdfDownload.channel');

function buildChannels({
  emailService,
  smsService,
  whatsappService,
  NotificationModel,
  artifactStore,
  urlSigner,
  logger = console,
} = {}) {
  const channels = {};
  if (emailService) channels.email = createEmailChannel({ emailService, logger });
  if (smsService) channels.sms = createSmsChannel({ smsService, logger });
  if (whatsappService) {
    channels.whatsapp = createWhatsAppChannel({ whatsappService, logger });
  }
  if (NotificationModel) {
    channels.in_app = createInAppChannel({ NotificationModel, logger });
  }
  if (artifactStore) {
    channels.portal_inbox = createPortalInboxChannel({ artifactStore, logger });
  }
  if (artifactStore && urlSigner) {
    channels.pdf_download = createPdfDownloadChannel({ artifactStore, urlSigner, logger });
  }
  return channels;
}

module.exports = {
  buildChannels,
  createEmailChannel,
  createSmsChannel,
  createWhatsAppChannel,
  createInAppChannel,
  createPortalInboxChannel,
  createPdfDownloadChannel,
};
