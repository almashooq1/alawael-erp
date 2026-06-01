/**
 * WhatsApp Services Barrel — فهرس خدمات واتساب
 * @module services/whatsapp
 */

'use strict';

const whatsappService = require('./whatsappService');
const whatsappAI = require('./whatsappAI.service');
const whatsappWebhook = require('./whatsappWebhook.service');
const whatsappTemplates = require('./whatsappTemplates.service');
const whatsappEventBindings = require('./whatsappEventBindings.service');

// Top-level helper exports — backwards-compatible names for callers that
// previously imported from the legacy `backend/communication/whatsapp-service.js`.
// Migration target: replace those imports over time with the explicit names
// on `whatsappService`.
const sendWhatsAppOTP = whatsappService.sendOtp;
const sendWhatsAppNotification = whatsappService.sendNotification;
const sendWhatsAppText = whatsappService.sendText;
const sendWhatsAppDocument = whatsappService.sendDocument;

module.exports = {
  whatsappService,
  whatsappAI,
  whatsappWebhook,
  whatsappTemplates,
  whatsappEventBindings,
  sendWhatsAppOTP,
  sendWhatsAppNotification,
  sendWhatsAppText,
  sendWhatsAppDocument,
};
