/**
 * Notifications Domain — نطاق الإشعارات
 * ══════════════════════════════════════════════════════════════════════════
 * Consolidated entry point. Import from here instead of individual files.
 *
 * Usage:
 *   const notifications = require('./domains/notifications');
 *   await notifications.send({ recipientId, title, body, channels: ['email', 'push'] });
 *
 * @module domains/notifications
 */

const notificationService = require('./services/notificationService');

module.exports = notificationService;
