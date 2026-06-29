/**
 * WhatsApp Integration Constants
 * الثوابت المتعلقة بتكامل WhatsApp
 */

'use strict';

const WHATSAPP_CHANNEL = 'whatsapp';

const MESSAGE_STATUS = {
  PENDING: 'pending',
  QUEUED: 'queued',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

const MESSAGE_TYPE = {
  TEXT: 'text',
  TEMPLATE: 'template',
  MEDIA: 'media',
  DOCUMENT: 'document',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  LOCATION: 'location',
  CONTACT: 'contact',
  BUTTON_REPLY: 'button_reply',
  LIST_REPLY: 'list_reply',
  INTERACTIVE: 'interactive',
};

const MESSAGE_DIRECTION = {
  OUTBOUND: 'outbound',
  INBOUND: 'inbound',
};

const PROVIDER = {
  ULTRAMSG: 'ultramsg',
  TWILIO: 'twilio',
  META: 'meta',
};

const TEMPLATE_NAMESPACE = process.env.WHATSAPP_TEMPLATES_NAMESPACE || 'alawael';
const DEFAULT_LANGUAGE = process.env.WHATSAPP_TEMPLATES_LANGUAGE || 'ar';

const EMERGENCY_KEYWORDS = [
  'طوارئ',
  'أزمة',
  'مساعدة',
  'مستعجل',
  'urgent',
  'emergency',
  'help',
  'crisis',
  'سريع',
];

const RATE_LIMIT = {
  PER_SECOND: parseInt(process.env.WHATSAPP_RATE_LIMIT_PER_SEC, 10) || 30,
  PER_MINUTE: parseInt(process.env.WHATSAPP_RATE_LIMIT_PER_MIN, 10) || 300,
  PER_HOUR: parseInt(process.env.WHATSAPP_RATE_LIMIT_PER_HOUR, 10) || 1000,
};

const QUEUE = {
  NAME: 'whatsapp-messages',
  CONCURRENCY: parseInt(process.env.WHATSAPP_QUEUE_CONCURRENCY, 10) || 5,
  RATE_LIMIT: parseInt(process.env.WHATSAPP_QUEUE_RATE_LIMIT, 10) || 30,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 5000,
  BACKOFF_FACTOR: 2,
};

const WEBHOOK_EVENTS = {
  MESSAGE_RECEIVED: 'message_received',
  MESSAGE_SENT: 'message_sent',
  MESSAGE_DELIVERED: 'message_delivered',
  MESSAGE_READ: 'message_read',
  MESSAGE_FAILED: 'message_failed',
  STATUS_UPDATE: 'status_update',
  TEMPLATE_APPROVED: 'template_approved',
  TEMPLATE_REJECTED: 'template_rejected',
};

const MEDIA_MAX_SIZE_MB = 16;
const DOCUMENT_MAX_SIZE_MB = 100;

const CONVERSATION_TTL_SECONDS = 300; // 5 minutes context window

module.exports = {
  WHATSAPP_CHANNEL,
  MESSAGE_STATUS,
  MESSAGE_TYPE,
  MESSAGE_DIRECTION,
  PROVIDER,
  TEMPLATE_NAMESPACE,
  DEFAULT_LANGUAGE,
  EMERGENCY_KEYWORDS,
  RATE_LIMIT,
  QUEUE,
  WEBHOOK_EVENTS,
  MEDIA_MAX_SIZE_MB,
  DOCUMENT_MAX_SIZE_MB,
  CONVERSATION_TTL_SECONDS,
};
