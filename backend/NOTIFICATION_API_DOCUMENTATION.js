/**
 * ═══════════════════════════════════════════════════════════════
 * 📚 Notification System - API Documentation & Examples
 * توثيق نظام الإشعارات وأمثلة الاستخدام
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// 🔐 Authentication
// ═══════════════════════════════════════════════════════════════

/**
 * Method 1: Bearer Token
 * ─────────────────────
 * All requests should include:
 * 
 * Header: Authorization: Bearer <token>
 * 
 * Example JavaScript:
 * ```javascript
 * const token = generateToken('user-123', ['read', 'write']);
 * const headers = {
 *   'Authorization': `Bearer ${token}`,
 *   'Content-Type': 'application/json'
 * };
 * ```
 * 
 * Example curl:
 * ```bash
 * curl -H "Authorization: Bearer YOUR_TOKEN" \
 *      http://localhost:3001/api/notifications/advanced/templates
 * ```
 */

/**
 * Method 2: API Key
 * ────────────────
 * Header: x-api-key: <api-key>
 * OR Query: ?apiKey=<api-key>
 * 
 * Test API Keys:
 * - test-notification-api-key-12345
 * - demo-api-key-2026
 * 
 * Example:
 * ```bash
 * curl -H "x-api-key: test-notification-api-key-12345" \
 *      http://localhost:3001/api/notifications/advanced/templates
 * ```
 */

// ═══════════════════════════════════════════════════════════════
// 📨 Send Notification Endpoints
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/notifications/advanced/send
 * ─────────────────────────────────────
 * Send a unified notification to single user
 * 
 * Request Body:
 * {
 *   "userId": "user-123",                    // [Required] User ID
 *   "title": "Welcome!",                     // [Required] Notification title
 *   "body": "Welcome to our system",         // [Required] Notification body
 *   "channels": {                            // [Optional] Channels to send to
 *     "email": true,
 *     "sms": false,
 *     "whatsapp": true,
 *     "inApp": true,
 *     "push": false,
 *     "dashboard": true
 *   },
 *   "category": "welcome",                   // [Optional] Notification category
 *   "priority": "high",                      // [Optional] high, medium, low
 *   "metadata": {                            // [Optional] Additional data
 *     "phoneNumber": "+1234567890",
 *     "customField": "customValue"
 *   },
 *   "templateId": "template-123"             // [Optional] Template to use
 * }
 * 
 * Response (201 Created):
 * {
 *   "success": true,
 *   "message": "Notification sent successfully",
 *   "data": {
 *     "id": "notif-abc123",
 *     "userId": "user-123",
 *     "status": "sent",
 *     "channels": {
 *       "email": { "status": "sent", "sentAt": "2026-02-19T10:30:00Z" },
 *       "whatsapp": { "status": "sent", "sentAt": "2026-02-19T10:30:05Z" }
 *     }
 *   }
 * }
 * 
 * Example JavaScript:
 * ```javascript
 * const response = await fetch('http://localhost:3001/api/notifications/advanced/send', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': `Bearer ${token}`,
 *     'Content-Type': 'application/json'
 *   },
 *   body: JSON.stringify({
 *     userId: 'user-123',
 *     title: 'New Transaction',
 *     body: 'Your transaction has been processed',
 *     channels: { email: true, whatsapp: true },
 *     priority: 'high'
 *   })
 * });
 * ```
 */

/**
 * POST /api/notifications/advanced/send-bulk
 * ──────────────────────────────────────────
 * Send bulk notifications to multiple users
 * 
 * Request Body:
 * {
 *   "notifications": [
 *     {
 *       "userId": "user-123",
 *       "title": "Update",
 *       "body": "System maintenance scheduled"
 *     },
 *     {
 *       "userId": "user-456",
 *       "title": "Update",
 *       "body": "System maintenance scheduled"
 *     }
 *   ],
 *   "commonMetadata": {                      // [Optional] Common metadata for all
 *     "maintenanceWindow": "02:00 - 04:00 AM"
 *   }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Bulk notifications sent",
 *   "data": {
 *     "total": 2,
 *     "sent": 2,
 *     "failed": 0,
 *     "results": [...]
 *   }
 * }
 */

/**
 * POST /api/notifications/advanced/whatsapp/send
 * ──────────────────────────────────────────────
 * Send WhatsApp message directly
 * 
 * Request Body:
 * {
 *   "phoneNumber": "+1234567890",           // [Required]
 *   "message": "Hello! This is a test",     // [Required]
 *   "mediaUrl": "https://...",              // [Optional] Image/document URL
 *   "templateName": "WELCOME"               // [Optional]
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "messageId": "msg-123",
 *     "status": "sent",
 *     "timestamp": "2026-02-19T10:30:00Z"
 *   }
 * }
 */

// ═══════════════════════════════════════════════════════════════
// 📋 Template Management Endpoints
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/notifications/advanced/templates
 * ──────────────────────────────────────────
 * List all notification templates
 * 
 * Query Parameters: (optional)
 * - category: filter by category
 * - language: ar or en
 * - limit: number of results (default: 20)
 * - skip: pagination offset
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "template-1",
 *       "name": "WELCOME",
 *       "category": "system",
 *       "content": {
 *         "en": "Welcome to our platform!",
 *         "ar": "أهلا بك في منصتنا"
 *       },
 *       "variables": ["name", "email"],
 *       "createdAt": "2026-02-01T00:00:00Z"
 *     }
 *   ],
 *   "pagination": {
 *     "total": 8,
 *     "count": 8,
 *     "limit": 20,
 *     "skip": 0
 *   }
 * }
 * 
 * Example curl:
 * ```bash
 * curl -H "Authorization: Bearer TOKEN" \
 *      "http://localhost:3001/api/notifications/advanced/templates?category=system"
 * ```
 */

/**
 * POST /api/notifications/advanced/templates
 * ──────────────────────────────────────────
 * Create custom notification template
 * 
 * Request Body:
 * {
 *   "name": "CUSTOM_ALERT",                 // [Required] Template name
 *   "category": "alert",                    // [Required] Category
 *   "content": {
 *     "en": "Alert: {{alertType}} detected!",
 *     "ar": "تنبيه: تم الكشف عن {{alertType}}"
 *   },
 *   "variables": ["alertType", "severity"],  // Variables in template
 *   "description": "Custom alert template"
 * }
 * 
 * Response (201 Created):
 * {
 *   "success": true,
 *   "data": {
 *     "id": "template-custom-123",
 *     "name": "CUSTOM_ALERT",
 *     "category": "alert",
 *     "createdAt": "2026-02-19T10:30:00Z"
 *   }
 * }
 */

/**
 * GET /api/notifications/advanced/templates/:templateId
 * ────────────────────────────────────────────────────
 * Get specific template details
 */

/**
 * PUT /api/notifications/advanced/templates/:templateId
 * ────────────────────────────────────────────────────
 * Update template
 */

/**
 * DELETE /api/notifications/advanced/templates/:templateId
 * ────────────────────────────────────────────────────────
 * Delete template
 */

// ═══════════════════════════════════════════════════════════════
// ⚙️ User Preferences Endpoints
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/notifications/advanced/preferences/:userId
 * ───────────────────────────────────────────────────
 * Get user notification preferences
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "userId": "user-123",
 *     "channels": {
 *       "email": { "enabled": true, "frequency": "realtime" },
 *       "sms": { "enabled": false },
 *       "whatsapp": { "enabled": true, "frequency": "daily" }
 *     },
 *     "quietHours": {
 *       "enabled": true,
 *       "startTime": "22:00",
 *       "endTime": "08:00",
 *       "timezone": "UTC"
 *     },
 *     "rateLimits": {
 *       "perDay": 100,
 *       "perHour": 20
 *     },
 *     "blacklist": [],
 *     "whitelist": [],
 *     "suspended": false
 *   }
 * }
 */

/**
 * PUT /api/notifications/advanced/preferences/:userId
 * ───────────────────────────────────────────────────
 * Update user notification preferences
 * 
 * Request Body:
 * {
 *   "channels": {
 *     "email": { "enabled": true },
 *     "sms": { "enabled": false },
 *     "whatsapp": { "enabled": true }
 *   },
 *   "quietHours": {
 *     "enabled": true,
 *     "startTime": "22:00",
 *     "endTime": "08:00"
 *   },
 *   "rateLimits": {
 *     "perDay": 100,
 *     "perHour": 20
 *   }
 * }
 */

/**
 * PUT /api/notifications/advanced/schedule/:userId
 * ────────────────────────────────────────────────
 * Set quiet hours schedule
 * 
 * Request Body:
 * {
 *   "enabled": true,
 *   "startTime": "22:00",    // HH:mm format
 *   "endTime": "08:00",
 *   "timezone": "Africa/Cairo"
 * }
 */

// ═══════════════════════════════════════════════════════════════
// 🚨 Alert Rules Endpoints
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/notifications/advanced/rules
 * ────────────────────────────────────
 * Create alert rule
 * 
 * Request Body:
 * {
 *   "name": "High Temperature Alert",
 *   "description": "Alert when temp > 35°C",
 *   "conditions": {
 *     "operator": "AND",
 *     "rules": [
 *       {
 *         "field": "temperature",
 *         "operator": ">",
 *         "value": 35
 *       },
 *       {
 *         "field": "location",
 *         "operator": "equals",
 *         "value": "warehouse-1"
 *       }
 *     ]
 *   },
 *   "actions": [
 *     {
 *       "type": "notify",
 *       "channels": ["email", "whatsapp"],
 *       "priority": "high"
 *     },
 *     {
 *       "type": "webhook",
 *       "url": "https://api.example.com/alerts"
 *     }
 *   ],
 *   "rateLimit": {
 *     "maxPerHour": 5,
 *     "cooldownMinutes": 30
 *   },
 *   "enabled": true
 * }
 * 
 * Response (201 Created):
 * {
 *   "success": true,
 *   "data": {
 *     "id": "rule-temp-alert-123",
 *     "name": "High Temperature Alert",
 *     "createdAt": "2026-02-19T10:30:00Z"
 *   }
 * }
 */

/**
 * GET /api/notifications/advanced/rules
 * ────────────────────────────────────
 * List all alert rules
 * 
 * Query Parameters:
 * - enabled: true/false
 * - category: filter by category
 * - limit: default 20
 * - skip: pagination
 */

/**
 * POST /api/notifications/advanced/rules/evaluate
 * ──────────────────────────────────────────────
 * Test rule against data
 * 
 * Request Body:
 * {
 *   "ruleId": "rule-123",
 *   "data": {
 *     "temperature": 38,
 *     "location": "warehouse-1",
 *     "timestamp": "2026-02-19T10:30:00Z"
 *   }
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "ruleId": "rule-123",
 *     "matched": true,
 *     "actions": [...]
 *   }
 * }
 */

// ═══════════════════════════════════════════════════════════════
// 📊 Analytics & Reporting Endpoints
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/notifications/advanced/metrics/kpis
 * ──────────────────────────────────────────
 * Get key performance indicators
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "summary": {
 *       "totalSent": 15432,
 *       "totalFailed": 245,
 *       "successRate": "98.4%",
 *       "averageDeliveryTime": "2.3s"
 *     },
 *     "channels": {
 *       "email": {
 *         "sent": 8000,
 *         "delivered": 7850,
 *         "failed": 150,
 *         "openRate": "42.5%"
 *       },
 *       "whatsapp": {
 *         "sent": 5000,
 *         "delivered": 4920,
 *         "failed": 80,
 *         "readRate": "65.3%"
 *       },
 *       "sms": {
 *         "sent": 2432,
 *         "delivered": 2370,
 *         "failed": 15,
 *         "readRate": "78.9%"
 *       }
 *     }
 *   }
 * }
 */

/**
 * GET /api/notifications/advanced/metrics/channels
 * ─────────────────────────────────────────────
 * Get channel-specific metrics
 */

/**
 * GET /api/notifications/advanced/metrics/trends
 * ──────────────────────────────────────────────
 * Get trend analysis
 * 
 * Query Parameters:
 * - period: daily, weekly, monthly (default: daily)
 * - days: number of days to analyze (default: 30)
 */

/**
 * POST /api/notifications/advanced/reports/comprehensive
 * ───────────────────────────────────────────────────
 * Generate comprehensive report
 * 
 * Request Body:
 * {
 *   "startDate": "2026-02-01T00:00:00Z",
 *   "endDate": "2026-02-19T23:59:59Z",
 *   "includeMetrics": true,
 *   "includeChannels": true,
 *   "includeFailures": true,
 *   "includeAnalysis": true
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "report": {...},
 *     "generatedAt": "2026-02-19T10:30:00Z",
 *     "period": "2026-02-01 to 2026-02-19"
 *   }
 * }
 */

/**
 * POST /api/notifications/advanced/reports/export
 * ────────────────────────────────────────────
 * Export report as CSV
 */

// ═══════════════════════════════════════════════════════════════
// 📝 Utility Endpoints
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/notifications/advanced/config
 * ────────────────────────────────────
 * Get system configuration
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "version": "1.0.0",
 *     "providers": {
 *       "whatsapp": "official",
 *       "email": "nodemailer",
 *       "sms": "twilio"
 *     },
 *     "features": {
 *       "templates": true,
 *       "rules": true,
 *       "analytics": true,
 *       "reporting": true
 *     }
 *   }
 * }
 */

/**
 * POST /api/notifications/advanced/health-check
 * ──────────────────────────────────────────
 * Check service health
 */

/**
 * GET /api/notifications/advanced/status
 * ────────────────────────────────────
 * Get system status
 */

// ═══════════════════════════════════════════════════════════════
// 🔧 Complete JavaScript Example
// ═══════════════════════════════════════════════════════════════

/**
 * ```javascript
 * const API_URL = 'http://localhost:3001/api/notifications/advanced';
 * const API_KEY = 'test-notification-api-key-12345';
 * 
 * // Helper function to make API calls
 * async function notificationAPI(endpoint, method = 'GET', body = null) {
 *   const options = {
 *     method,
 *     headers: {
 *       'Content-Type': 'application/json',
 *       'x-api-key': API_KEY
 *     }
 *   };
 * 
 *   if (body) {
 *     options.body = JSON.stringify(body);
 *   }
 * 
 *   const response = await fetch(`${API_URL}${endpoint}`, options);
 *   return response.json();
 * }
 * 
 * // Send notification
 * async function sendNotification() {
 *   const result = await notificationAPI('/send', 'POST', {
 *     userId: 'user-123',
 *     title: 'Welcome!',
 *     body: 'Welcome to our platform',
 *     channels: { email: true, whatsapp: true },
 *     priority: 'high'
 *   });
 *   console.log('Notification sent:', result);
 * }
 * 
 * // Get templates
 * async function getTemplates() {
 *   const result = await notificationAPI('/templates?category=system');
 *   console.log('Templates:', result.data);
 * }
 * 
 * // Get metrics
 * async function getMetrics() {
 *   const result = await notificationAPI('/metrics/kpis');
 *   console.log('KPIs:', result.data);
 * }
 * 
 * // Run examples
 * await sendNotification();
 * await getTemplates();
 * await getMetrics();
 * ```
 */

module.exports = {
  documentation: {
    title: 'Advanced Notification System API',
    version: '1.0.0',
    baseUrl: 'http://localhost:3001/api/notifications/advanced',
    authentication: ['Bearer Token', 'API Key'],
    endpoints: 28,
    channels: ['Email', 'SMS', 'WhatsApp', 'In-App', 'Push', 'Dashboard']
  }
};
