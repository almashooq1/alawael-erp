# Notification Services Consolidation Analysis

## 1. Per-File Breakdown

---

### File 1: `notificationService.js` (1032 lines)
**Classes:** `NotificationTemplate`, `EmailService`, `SMSService`, `PushNotificationService`, `NotificationService`
**Export:** `NotificationService` (class), plus named: `NotificationTemplate`, `EmailService`, `SMSService`, `PushNotificationService`
**Dependencies:** `nodemailer`, `logger`
**Channels:** Email, SMS, Push, In-App

| Method | Signature |
|--------|-----------|
| `NotificationTemplate.render` | `render(data = {})` |
| `NotificationTemplate.validateVariables` | `validateVariables(data = {})` |
| `EmailService.send` | `async send(to, template, data = {}, options = {})` |
| `EmailService.getStats` | `getStats()` |
| `SMSService.send` | `async send(to, template, data = {}, options = {})` |
| `SMSService.getStats` | `getStats()` |
| `PushNotificationService.send` | `async send(userId, template, data = {}, options = {})` |
| `PushNotificationService.getStats` | `getStats()` |
| `sendEmailWithTemplate` | `async sendEmailWithTemplate(to, templateName, data = {}, options = {})` |
| `sendSmsWithTemplate` | `async sendSmsWithTemplate(to, templateName, data = {})` |
| `sendPushWithTemplate` | `async sendPushWithTemplate(userId, templateName, data = {}, options = {})` |
| `sendInAppNotification` | `async sendInAppNotification(userId, title, message, type = 'info', metadata = {})` |
| `sendEmailNotification` | `async sendEmailNotification(userId, userEmail, subject, htmlContent, metadata = {})` |
| `sendSmsNotification` | `async sendSmsNotification(userId, phoneNumber, message, metadata = {})` |
| `sendPushNotification` | `async sendPushNotification(userId, title, body, metadata = {})` |
| `sendMultiChannelNotification` | `async sendMultiChannelNotification(userId, notification, channels = ['in-app','email','sms'])` |
| `getNotifications` | `async getNotifications(userId, limit = 50, offset = 0)` |
| `markAsRead` | `async markAsRead(notificationId)` |
| `markAllAsRead` | `async markAllAsRead(userId)` |
| `deleteNotification` | `async deleteNotification(notificationId)` |
| `setNotificationPreferences` | `async setNotificationPreferences(userId, preferences)` |
| `getNotificationPreferences` | `async getNotificationPreferences(userId)` |
| `scheduleNotification` | `async scheduleNotification(userId, notification, scheduledFor)` |
| `getUnreadCount` | `async getUnreadCount(userId)` |
| `logNotification` | `async logNotification(userId, channel, title, status)` |
| `getNotificationStats` | `async getNotificationStats(userId)` |

---

### File 2: `notifications.service.js` (642 lines)
**Class:** `NotificationsService` (all static methods)
**Export:** `NotificationsService`
**Dependencies:** `Notification` (mongoose model), `logger`, `sanitize.escapeRegex`, `emailManager` (optional), `User` (optional)
**Channels:** Email (via emailManager), Push (stub), In-App (via Notification model)

| Method | Signature |
|--------|-----------|
| `createNotification` | `static async createNotification(data, options = {})` |
| `getNotifications` | `static async getNotifications(userId, filters = {})` |
| `getNotificationById` | `static async getNotificationById(notificationId)` |
| `markAsRead` | `static async markAsRead(notificationId)` |
| `markMultipleAsRead` | `static async markMultipleAsRead(notificationIds)` |
| `markAllAsRead` | `static async markAllAsRead(userId)` |
| `archiveNotification` | `static async archiveNotification(notificationId)` |
| `restoreNotification` | `static async restoreNotification(notificationId)` |
| `toggleFavorite` | `static async toggleFavorite(notificationId)` |
| `snoozeNotification` | `static async snoozeNotification(notificationId, snoozeUntil)` |
| `deleteNotification` | `static async deleteNotification(notificationId)` |
| `deleteMultiple` | `static async deleteMultiple(notificationIds)` |
| `deleteReadNotifications` | `static async deleteReadNotifications(userId)` |
| `getPreferences` | `static async getPreferences(userId)` |
| `getTemplates` | `static async getTemplates()` |
| `getTemplate` | `static async getTemplate(templateId)` |
| `getDeliveryStatus` | `static async getDeliveryStatus(notificationId)` |
| `retrySendNotification` | `static async retrySendNotification(notificationId)` |
| `getUnreadCount` | `static async getUnreadCount(userId)` |
| `getUnreadCountByType` | `static async getUnreadCountByType(userId)` |
| `sendPushNotification` | `static async sendPushNotification(data)` |

---

### File 3: `notificationCenter.service.js` (99 lines)
**Class:** `NotificationCenterService` (all static methods)
**Export:** `NotificationCenterService`
**Dependencies:** `logger`, `whatsapp-integration.service`, `email-integration.service`
**Channels:** WhatsApp, SMS, Email (omni-channel dispatcher with preference-based routing)

| Method | Signature |
|--------|-----------|
| `sendNotification` | `static async sendNotification(recipient, type, message)` |
| `sendWhatsApp` | `static async sendWhatsApp(phone, msg, options = {})` |
| `sendSMS` | `static async sendSMS(phone, msg)` |
| `sendEmail` | `static async sendEmail(email, subject, body)` |

---

### File 4: `unifiedNotification.service.js` (508 lines)
**Class:** `UnifiedNotificationService` (instance-based)
**Export:** singleton instance (`new UnifiedNotificationService()`)
**Dependencies:** `emailService`, `smsService`, `Notification` (mongoose), `AuditLogger`, `logger`
**Channels:** Email, SMS, WhatsApp, Push, In-App (with queue, retry, user preferences, delivery tracking)

| Method | Signature |
|--------|-----------|
| `send` | `async send(notification)` |
| `sendBatch` | `async sendBatch(notifications)` |
| `processQueue` | `async processQueue()` |
| `deliverNotification` | `async deliverNotification(notification)` |
| `sendEmailNotification` | `async sendEmailNotification(notification)` |
| `sendSMSNotification` | `async sendSMSNotification(notification)` |
| `sendWhatsAppNotification` | `async sendWhatsAppNotification(notification)` |
| `sendPushNotification` | `async sendPushNotification(notification)` |
| `sendInAppNotification` | `async sendInAppNotification(notification)` |
| `handleDeliveryFailure` | `async handleDeliveryFailure(notification, error)` |
| `checkUserPreferences` | `async checkUserPreferences(userId, type, channel, priority = 'normal')` |
| `getUserInfo` | `async getUserInfo(userId)` |
| `getHistory` | `async getHistory(userId, options = {})` |
| `markAsRead` | `async markAsRead(notificationId, userId)` |
| `markAllAsRead` | `async markAllAsRead(userId)` |
| `getUnreadCount` | `async getUnreadCount(userId)` |
| `deleteNotification` | `async deleteNotification(notificationId, userId)` |
| `validateNotification` | (inline validation) |

---

### File 5: `unifiedNotificationManager.js` (851 lines)
**Class:** `UnifiedNotificationManager extends EventEmitter`
**Export:** `{ UnifiedNotificationManager, Notification, notificationManager }` (singleton)
**Dependencies:** `events.EventEmitter`, `mongoose`, `nodemailer`, `twilio` (optional), `logger`, `whatsappNotificationService`
**Channels:** Email, SMS, WhatsApp, In-App, Push, **Dashboard** (6 channels, with inline mongoose schema)

| Method | Signature |
|--------|-----------|
| `sendNotification` | `async sendNotification(userId, notificationData)` |
| `sendImmediateNotification` | `async sendImmediateNotification(userId, notificationData)` |
| `sendBulkNotifications` | `async sendBulkNotifications(userIds, notificationTemplate)` |
| `startQueueProcessor` | `startQueueProcessor()` |
| `stopQueueProcessor` | `stopQueueProcessor()` |
| `processQueue` | `async processQueue()` |
| `deliverNotification` | `async deliverNotification(notification)` |
| `sendEmailNotification` | `async sendEmailNotification(notification)` |
| `sendWhatsAppNotification` | `async sendWhatsAppNotification(notification)` |
| `sendSMSNotification` | `async sendSMSNotification(notification)` |
| `sendInAppNotification` | `async sendInAppNotification(notification)` |
| `sendPushNotification` | `async sendPushNotification(notification)` |
| `sendDashboardNotification` | `async sendDashboardNotification(notification)` |
| `buildEmailTemplate` | `buildEmailTemplate(notification)` |
| `buildWhatsAppMessage` | `buildWhatsAppMessage(notification)` |
| `getNotificationEmoji` | `getNotificationEmoji(type)` |
| `getStatistics` | `getStatistics()` |
| `getUserNotifications` | `async getUserNotifications(userId, filters = {})` |
| `markAsRead` | `async markAsRead(notificationId)` |
| `deleteNotification` | `async deleteNotification(notificationId)` |
| `rateNotification` | `async rateNotification(notificationId, rating, feedback = '')` |

---

### File 6: `smartNotificationService.js` (135 lines)
**Class:** `SmartNotificationService` (instance-based, in-memory `Map`)
**Export:** `SmartNotificationService` + `instance` (singleton)
**Dependencies:** `uuid`, `logger`
**Channels:** In-App, Email, Push (flags only — no actual transport)

| Method | Signature |
|--------|-----------|
| `calculatePriority` | `calculatePriority(workflow = {}, type = 'info')` |
| `createSmartNotification` | `createSmartNotification(workflow, type = 'info', recipientId)` |
| `sendNotification` | `sendNotification(recipientId, notification)` |
| `markAsRead` | `markAsRead(notificationId, recipientId)` |
| `getUnreadNotifications` | `getUnreadNotifications(recipientId)` |
| `getAllNotifications` | `getAllNotifications(recipientId)` |
| `deleteNotification` | `deleteNotification(notificationId, recipientId)` |
| `clearAllNotifications` | `clearAllNotifications(recipientId)` |
| `getNotificationStats` | `getNotificationStats(recipientId)` |
| `scheduleNotification` | `scheduleNotification(notification, date, recipientId)` |
| `send` (static) | `static async send(recipientId, title, message, type = 'INFO', link = null)` |

---

### File 7: `alertNotificationService.js` (429 lines)
**Class:** `AlertNotificationService` (instance-based, in-memory arrays)
**Export:** singleton instance (`new AlertNotificationService()`)
**Dependencies:** None (self-contained, fleet/vehicle/driver domain)
**Channels:** In-memory notifications (no real channel transport)

| Method | Signature |
|--------|-----------|
| `initializeAlertRules` | `initializeAlertRules()` |
| `createAlert` | `createAlert(alertData)` |
| `createSafetyAlert` | `createSafetyAlert(vehicleId, driverId, alertType, details)` |
| `sendNotification` | `sendNotification(notificationData)` |
| `getActiveAlerts` | `getActiveAlerts(filters = {})` |
| `acknowledgeAlert` | `acknowledgeAlert(alertId, acknowledgedBy)` |
| `closeAlert` | `closeAlert(alertId, resolution)` |
| `getAlertHistory` | `getAlertHistory(filters = {}, limit = 50)` |
| `getAlertStatistics` | `getAlertStatistics(period = 'monthly')` |
| `getPendingNotifications` | `getPendingNotifications(userId)` |
| `markNotificationAsRead` | `markNotificationAsRead(notificationId, userId)` |
| `createCustomAlertRule` | `createCustomAlertRule(ruleData)` |
| `getAlertRules` | `getAlertRules()` |
| `updateAlertRule` | `updateAlertRule(ruleId, updates)` |
| `getAlertReport` | `getAlertReport(vehicleId, startDate, endDate)` |
| `calculateAverageAcknowledgeTime` | `calculateAverageAcknowledgeTime(alerts)` |
| `analyzeAlertPatterns` | `analyzeAlertPatterns()` |
| `getMostCommonAlertType` | `getMostCommonAlertType()` |
| `getHighRiskVehicles` | `getHighRiskVehicles()` |
| `getHighRiskDrivers` | `getHighRiskDrivers()` |
| `getTimePatterns` | `getTimePatterns()` |

---

## 2. Channel Coverage Matrix

| Channel    | 1-notifSvc | 2-notifs | 3-center | 4-unified | 5-manager | 6-smart | 7-alert |
|------------|:----------:|:--------:|:--------:|:---------:|:---------:|:-------:|:-------:|
| Email      | ✅         | ✅       | ✅       | ✅        | ✅        | 🔲 flag | ❌      |
| SMS        | ✅         | ❌       | ✅       | ✅        | ✅        | 🔲 flag | ❌      |
| Push       | ✅         | ✅ stub  | ❌       | ✅        | ✅        | 🔲 flag | ❌      |
| In-App     | ✅         | ✅       | ❌       | ✅        | ✅        | ✅      | ✅ mem  |
| WhatsApp   | ❌         | ❌       | ✅       | ✅        | ✅        | ❌      | ❌      |
| Dashboard  | ❌         | ❌       | ❌       | ❌        | ✅        | ❌      | ❌      |

---

## 3. Function Overlap Analysis

### 🔴 Heavily Duplicated (implemented in 4+ files)

| Function                | Files |
|-------------------------|-------|
| **sendNotification**    | 1, 3, 4, 5, 6, 7 |
| **markAsRead**          | 1, 2, 4, 5, 6, 7 |
| **deleteNotification**  | 1, 2, 4, 5, 6 |
| **getUnreadCount**      | 1, 2, 4 |
| **markAllAsRead**       | 1, 2, 4 |
| **getNotifications**    | 1, 2, 5, 6 |
| **sendEmailNotification** | 1, 4, 5 |
| **sendSMSNotification** | 1, 4, 5 |
| **sendPushNotification** | 1, 2, 4, 5 |
| **sendInAppNotification** | 1, 4, 5 |
| **processQueue**        | 4, 5 |
| **deliverNotification** | 4, 5 |
| **getNotificationStats** | 1, 6 |

### 🟡 Partially Duplicated (2-3 files)

| Function               | Files |
|------------------------|-------|
| **sendBatch / sendBulk** | 4, 5 |
| **scheduleNotification** | 1, 6 |
| **sendWhatsAppNotification** | 4, 5 |
| **checkUserPreferences / getPreferences** | 2, 4 |

### 🟢 Unique Functions (exist in only 1 file)

| Function | Source File |
|----------|------------|
| `archiveNotification(notificationId)` | 2 - notifications.service |
| `restoreNotification(notificationId)` | 2 - notifications.service |
| `toggleFavorite(notificationId)` | 2 - notifications.service |
| `snoozeNotification(notificationId, snoozeUntil)` | 2 - notifications.service |
| `deleteMultiple(notificationIds)` | 2 - notifications.service |
| `deleteReadNotifications(userId)` | 2 - notifications.service |
| `markMultipleAsRead(notificationIds)` | 2 - notifications.service |
| `getTemplates() / getTemplate(id)` | 2 - notifications.service |
| `getDeliveryStatus(notificationId)` | 2 - notifications.service |
| `retrySendNotification(notificationId)` | 2 - notifications.service |
| `getUnreadCountByType(userId)` | 2 - notifications.service |
| `sendWhatsApp(phone, msg, options)` | 3 - notificationCenter |
| `sendSMS(phone, msg)` | 3 - notificationCenter |
| `handleDeliveryFailure(notification, error)` | 4 - unified |
| `getUserInfo(userId)` | 4 - unified |
| `getHistory(userId, options)` | 4 - unified |
| `sendImmediateNotification(userId, data)` | 5 - manager |
| `sendDashboardNotification(notification)` | 5 - manager |
| `buildEmailTemplate(notification)` | 5 - manager |
| `buildWhatsAppMessage(notification)` | 5 - manager |
| `getNotificationEmoji(type)` | 5 - manager |
| `rateNotification(notificationId, rating, feedback)` | 5 - manager |
| `startQueueProcessor()` / `stopQueueProcessor()` | 5 - manager |
| `calculatePriority(workflow, type)` | 6 - smart |
| `createSmartNotification(workflow, type, recipientId)` | 6 - smart |
| `clearAllNotifications(recipientId)` | 6 - smart |
| `getAllNotifications(recipientId)` | 6 - smart |
| `sendMultiChannelNotification(userId,notif,channels)` | 1 - notificationService |
| `logNotification(userId,channel,title,status)` | 1 - notificationService |
| `setNotificationPreferences(userId, prefs)` | 1 - notificationService |
| `sendEmailWithTemplate(to,name,data,opts)` | 1 - notificationService |
| `sendSmsWithTemplate(to, name, data)` | 1 - notificationService |
| `sendPushWithTemplate(userId,name,data,opts)` | 1 - notificationService |
| `createAlert(alertData)` | 7 - alert |
| `createSafetyAlert(vehicleId,driverId,type,details)` | 7 - alert |
| `acknowledgeAlert(alertId, acknowledgedBy)` | 7 - alert |
| `closeAlert(alertId, resolution)` | 7 - alert |
| `getAlertHistory(filters, limit)` | 7 - alert |
| `getAlertStatistics(period)` | 7 - alert |
| `createCustomAlertRule(ruleData)` | 7 - alert |
| `getAlertRules()` / `updateAlertRule(id, updates)` | 7 - alert |
| `getAlertReport(vehicleId, start, end)` | 7 - alert |
| `analyzeAlertPatterns()` | 7 - alert |
| `getHighRiskVehicles()` / `getHighRiskDrivers()` | 7 - alert |
| `getTimePatterns()` | 7 - alert |

---

## 4. Proposed Consolidated Interface

```js
/**
 * ═══════════════════════════════════════════════════════════════
 * ConsolidatedNotificationService
 *
 * Single entry point for ALL notification capabilities.
 * Replaces: notificationService.js, notifications.service.js,
 *           notificationCenter.service.js, unifiedNotification.service.js,
 *           unifiedNotificationManager.js, smartNotificationService.js,
 *           alertNotificationService.js
 * ═══════════════════════════════════════════════════════════════
 */

const EventEmitter = require('events');

class ConsolidatedNotificationService extends EventEmitter {

  // ─── CORE SEND ────────────────────────────────────────────────

  /**
   * Send a single notification (main entry point)
   * Replaces: 6 different sendNotification variants
   * @param {Object} payload
   * @param {string} payload.userId       - Target user ID
   * @param {string} payload.title        - Notification title
   * @param {string} payload.message      - Notification body
   * @param {string} [payload.type='info'] - info|warning|urgent|success
   * @param {string} [payload.priority='normal'] - low|normal|high|critical
   * @param {string[]} [payload.channels=['in-app']] - email|sms|push|in-app|whatsapp|dashboard
   * @param {string} [payload.templateId] - Optional template reference
   * @param {Object} [payload.templateData={}] - Variable substitution data
   * @param {Object} [payload.metadata={}] - Extra context
   * @param {Object} [options={}]
   * @param {boolean} [options.immediate=false] - Skip queue
   * @param {boolean} [options.respectPreferences=true] - Check user prefs
   * @returns {Promise<{notificationId, channels: {channel,status}[], createdAt}>}
   */
  async send(payload, options = {}) {}

  /**
   * Send to multiple users
   * Replaces: sendBulkNotifications, sendBatch, batchSend
   */
  async sendBatch(userIds, payload, options = {}) {}

  /**
   * Send via template
   * Replaces: sendEmailWithTemplate, sendSmsWithTemplate, sendPushWithTemplate
   */
  async sendWithTemplate(userId, templateId, data = {}, channels = ['in-app'], options = {}) {}

  /**
   * Multi-channel send for one user
   * Replaces: sendMultiChannelNotification
   */
  async sendMultiChannel(userId, payload, channels = ['in-app', 'email', 'sms']) {}


  // ─── CHANNEL-SPECIFIC DELIVERY (internal, but exposed for direct use) ──

  async _deliverEmail(notification) {}
  async _deliverSMS(notification) {}
  async _deliverPush(notification) {}
  async _deliverInApp(notification) {}
  async _deliverWhatsApp(notification) {}
  async _deliverDashboard(notification) {}


  // ─── QUEUE & SCHEDULING ───────────────────────────────────────

  /**
   * Schedule a notification for future delivery
   * Replaces: scheduleNotification (files 1, 6)
   */
  async schedule(userId, payload, scheduledFor) {}

  /**
   * Add to internal processing queue
   */
  enqueue(notification) {}

  /**
   * Process pending queue items
   * Replaces: processQueue (files 4, 5)
   */
  async processQueue() {}

  /** Start/stop the queue processor interval */
  startQueueProcessor(intervalMs = 5000) {}
  stopQueueProcessor() {}


  // ─── RETRY & FAILURE HANDLING ─────────────────────────────────

  /**
   * Retry a previously failed notification
   * Replaces: retrySendNotification, handleDeliveryFailure
   */
  async retry(notificationId) {}

  /** Handle delivery failure with configurable retry policy */
  async _handleDeliveryFailure(notification, error) {}


  // ─── NOTIFICATION CRUD & LIFECYCLE ────────────────────────────

  /** Create and persist a notification record (without sending) */
  async create(data) {}

  /** Get notification by ID */
  async getById(notificationId) {}

  /** Get notifications list with filters, pagination, search */
  async getNotifications(userId, filters = {}) {}

  /** Get notification delivery/send history */
  async getHistory(userId, options = {}) {}

  /** Delete a single notification */
  async delete(notificationId, userId) {}

  /** Delete multiple notifications */
  async deleteMultiple(notificationIds) {}

  /** Delete all read notifications for a user */
  async deleteRead(userId) {}


  // ─── READ STATE MANAGEMENT ────────────────────────────────────

  async markAsRead(notificationId, userId) {}
  async markMultipleAsRead(notificationIds) {}
  async markAllAsRead(userId) {}
  async getUnreadCount(userId) {}
  async getUnreadCountByType(userId) {}


  // ─── NOTIFICATION STATE TRANSITIONS ───────────────────────────

  /** Archive a notification (soft-remove from inbox) */
  async archive(notificationId) {}

  /** Restore an archived notification */
  async restore(notificationId) {}

  /** Toggle favorite/star on notification */
  async toggleFavorite(notificationId) {}

  /** Snooze a notification until a future date */
  async snooze(notificationId, snoozeUntil) {}

  /** Rate a notification (quality/feedback) */
  async rate(notificationId, rating, feedback = '') {}


  // ─── USER PREFERENCES ─────────────────────────────────────────

  /** Get user notification preferences (channels, quiet hours, types) */
  async getPreferences(userId) {}

  /** Set/update user notification preferences */
  async setPreferences(userId, preferences) {}

  /**
   * Check if a notification is allowed by user preferences
   * Replaces: checkUserPreferences
   */
  async checkPreferences(userId, type, channel, priority = 'normal') {}

  /** Lookup user info (email, phone) for delivery */
  async getUserInfo(userId) {}


  // ─── TEMPLATES ────────────────────────────────────────────────

  /** Create a notification template */
  async createTemplate(templateData) {}

  /** Get all templates */
  async getTemplates() {}

  /** Get a single template by ID */
  async getTemplate(templateId) {}

  /** Render a template with variable data */
  renderTemplate(template, data = {}) {}

  /** Validate template variables are provided */
  validateTemplateVariables(template, data = {}) {}


  // ─── STATISTICS & ANALYTICS ───────────────────────────────────

  /** Per-user notification stats (total, unread, by type/channel) */
  async getStats(userId) {}

  /** Global notification statistics (sent, failed, by channel) */
  async getGlobalStats() {}

  /** Get delivery status for a notification */
  async getDeliveryStatus(notificationId) {}

  /** Log a notification event for audit trail */
  async logEvent(userId, channel, title, status) {}


  // ─── SMART NOTIFICATIONS (Priority/Workflow) ──────────────────

  /**
   * Calculate priority from workflow context
   * From: smartNotificationService
   */
  calculatePriority(workflow = {}, type = 'info') {}

  /**
   * Create a workflow-aware notification with smart priority/styling
   */
  createSmartNotification(workflow, type = 'info', recipientId) {}

  /** Clear all notifications for a user */
  async clearAll(userId) {}


  // ─── ALERT MANAGEMENT (Domain-Specific) ───────────────────────

  /** Create an alert from rule evaluation */
  createAlert(alertData) {}

  /** Create a safety-specific alert */
  createSafetyAlert(entityId, assigneeId, alertType, details) {}

  /** Get active (unresolved) alerts with filters */
  getActiveAlerts(filters = {}) {}

  /** Acknowledge an alert */
  acknowledgeAlert(alertId, acknowledgedBy) {}

  /** Close/resolve an alert */
  closeAlert(alertId, resolution) {}

  /** Get historical alerts with filters */
  getAlertHistory(filters = {}, limit = 50) {}

  /** Get alert statistics for a period */
  getAlertStatistics(period = 'monthly') {}


  // ─── ALERT RULES ──────────────────────────────────────────────

  /** Create a custom alert rule */
  createAlertRule(ruleData) {}

  /** Get all alert rules */
  getAlertRules() {}

  /** Update an existing alert rule */
  updateAlertRule(ruleId, updates) {}


  // ─── ALERT ANALYTICS ──────────────────────────────────────────

  /** Generate alert report for an entity over a date range */
  getAlertReport(entityId, startDate, endDate) {}

  /** Analyze alert patterns and trends */
  analyzeAlertPatterns() {}

  /** Get average alert acknowledge time */
  calculateAverageAcknowledgeTime(alerts) {}

  /** Get time distribution of alerts (hourly) */
  getTimePatterns() {}


  // ─── TEMPLATE BUILDERS (internal) ─────────────────────────────

  _buildEmailTemplate(notification) {}
  _buildWhatsAppMessage(notification) {}
  _getNotificationEmoji(type) {}
}
```

---

## 5. Total Unique Function Count: **78**

| Category | Count |
|----------|-------|
| Core Send | 4 |
| Channel Delivery (internal) | 6 |
| Queue & Scheduling | 4 |
| Retry & Failure | 2 |
| CRUD & Lifecycle | 7 |
| Read State | 5 |
| State Transitions | 5 |
| User Preferences | 4 |
| Templates | 5 |
| Stats & Analytics | 4 |
| Smart Notifications | 3 |
| Alert Management | 7 |
| Alert Rules | 3 |
| Alert Analytics | 4 |
| Internal Builders | 3 |
| **TOTAL** | **78** (deduplicated from ~120 across all files) |

---

## 6. Migration Path

| Old File | Action |
|----------|--------|
| `notificationService.js` (1032 lines) | **Absorb** → Core Send, Templates, Preferences, Stats |
| `notifications.service.js` (642 lines) | **Absorb** → CRUD, Read State, State Transitions, Delivery Status |
| `notificationCenter.service.js` (99 lines) | **Absorb** → Omni-channel dispatch logic into `send()` routing |
| `unifiedNotification.service.js` (508 lines) | **Absorb** → Queue, Retry, Delivery, User Preferences check |
| `unifiedNotificationManager.js` (851 lines) | **Absorb** → EventEmitter base, Bulk, Dashboard channel, Rating, Builders |
| `smartNotificationService.js` (135 lines) | **Absorb** → Priority calc, Smart notification creation, Scheduling |
| `alertNotificationService.js` (429 lines) | **Keep as sub-module** or absorb into Alert namespace within consolidated service |

**Total lines replaced:** ~3,696 → estimated consolidated: ~1,200–1,500 lines (60% reduction)
