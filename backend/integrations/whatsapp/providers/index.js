/**
 * WhatsApp Provider Factory
 * مصنع مزودي WhatsApp مع نظام fallback
 */

'use strict';

const BaseWhatsAppProvider = require('./baseProvider');
const UltraMsgProvider = require('./ultraMsgProvider');
const TwilioWhatsAppProvider = require('./twilioWhatsAppProvider');
const { PROVIDER } = require('../constants');

const PROVIDER_MAP = {
  [PROVIDER.ULTRAMSG]: UltraMsgProvider,
  [PROVIDER.TWILIO]: TwilioWhatsAppProvider,
};

/**
 * Create a WhatsApp provider instance
 * @param {string} name - Provider name
 * @param {object} config - Provider configuration
 * @returns {BaseWhatsAppProvider}
 */
function createProvider(name, config = {}) {
  const ProviderClass = PROVIDER_MAP[name.toLowerCase()];
  if (!ProviderClass) {
    throw new Error(`Unknown WhatsApp provider: ${name}. Available: ${Object.keys(PROVIDER_MAP).join(', ')}`);
  }
  return new ProviderClass(config);
}

/**
 * Get the primary provider with fallback
 * @returns {{primary: BaseWhatsAppProvider, fallback: BaseWhatsAppProvider|null}}
 */
function getProviders() {
  const primaryName = process.env.WHATSAPP_PRIMARY_PROVIDER || PROVIDER.ULTRAMSG;
  const fallbackName = process.env.WHATSAPP_FALLBACK_PROVIDER || PROVIDER.TWILIO;

  let primary;
  try {
    primary = createProvider(primaryName);
  } catch (err) {
    console.warn(`[whatsapp] Failed to create primary provider ${primaryName}: ${err.message}`);
    primary = null;
  }

  let fallback = null;
  if (fallbackName && fallbackName !== primaryName) {
    try {
      fallback = createProvider(fallbackName);
      if (!fallback.isEnabled()) {
        fallback = null;
      }
    } catch (err) {
      console.warn(`[whatsapp] Failed to create fallback provider ${fallbackName}: ${err.message}`);
      fallback = null;
    }
  }

  return { primary, fallback };
}

/**
 * Send a message using the primary provider, falling back if needed
 * @param {Function} sendFn - The send function to execute
 * @param {BaseWhatsAppProvider} primary - Primary provider
 * @param {BaseWhatsAppProvider|null} fallback - Fallback provider
 * @returns {Promise<object>}
 */
async function sendWithFallback(sendFn, primary, fallback) {
  if (!primary || !primary.isEnabled()) {
    if (fallback && fallback.isEnabled()) {
      return sendFn(fallback);
    }
    return { success: false, error: 'no_whatsapp_provider_configured' };
  }

  const result = await sendFn(primary);
  if (result.success || !fallback || !fallback.isEnabled()) {
    return result;
  }

  console.warn(`[whatsapp] Primary provider failed: ${result.error}. Trying fallback...`);
  return sendFn(fallback);
}

module.exports = {
  createProvider,
  getProviders,
  sendWithFallback,
  PROVIDER_MAP,
  BaseWhatsAppProvider,
  UltraMsgProvider,
  TwilioWhatsAppProvider,
};
