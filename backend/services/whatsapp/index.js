/**
 * WhatsApp Services Barrel — فهرس خدمات واتساب
 * @module services/whatsapp
 */

'use strict';

const whatsappService = require('./whatsappService');
const whatsappAI = require('./whatsappAI.service');
const whatsappWebhook = require('./whatsappWebhook.service');
const whatsappTemplates = require('./whatsappTemplates.service');

module.exports = {
  whatsappService,
  whatsappAI,
  whatsappWebhook,
  whatsappTemplates,
};
