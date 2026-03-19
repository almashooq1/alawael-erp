/* eslint-disable no-unused-vars */
/**
 * DEPRECATED: This file now acts as a pass-through to the unified Notification model
 * All Notification operations should use the unified model
 * 
 * This comprehensive system has been consolidated to prevent model registration conflicts.
 * The unified model at the root directory combines all features from this and other variations.
 * 
 * This file is maintained for backward compatibility only.
 * New code should import directly from the unified UNIFIED_NOTIFICATION_MODEL.js at the root
 */

const Notification = require('../../../UNIFIED_NOTIFICATION_MODEL');

module.exports = Notification;
