const express = require('express');
const router = express.Router();

// Stub route - Integration Hub
router.get('/health', (req, res) => {
  res.json({ status: 'unavailable', message: 'Integration module not ready' });
});

router.all('*', (req, res) => {
  res.status(503).json({
    success: false,
    message: 'Integration Hub service unavailable',
    status: 'UNAVAILABLE'
  });
});

/**
 * ========== CONNECTORS ROUTES ==========
 */

/**
 * @route   POST /api/integrations/connectors/register
 * @desc    Register a new integration connector
 * @access  Private (Tenant Admin)
 * @param   {string} connectorId - Unique connector identifier
 * @param   {string} name - Connector display name
 * @param   {string} provider - Provider name (zapier, slack, etc.)
 * @param   {string} [baseUrl] - API base URL
 * @param   {object} [config] - Connector configuration
 * @return  {object} Connector object
 */
router.post(
  '/connectors/register',
  requireAuth,
  requireTenant,
  IntegrationHubController.registerConnector
);

/**
 * @route   POST /api/integrations/connectors/:connectorId/authenticate
 * @desc    Authenticate connector with credentials
 * @access  Private (Tenant Admin)
 * @param   {string} connectorId - Connector ID to authenticate
 * @body    {string} [apiKey] - API key credential
 * @body    {string} [apiSecret] - API secret
 * @body    {string} [accessToken] - OAuth access token
 * @body    {string} [refreshToken] - OAuth refresh token
 * @return  {object} Credential information
 */
router.post(
  '/connectors/:connectorId/authenticate',
  requireAuth,
  requireTenant,
  IntegrationHubController.authenticateConnector
);

/**
 * @route   GET /api/integrations/connectors
 * @desc    Get all available connectors
 * @access  Private
 * @return  {array} Array of connector objects
 */
router.get('/connectors', requireAuth, IntegrationHubController.getConnectors);

/**
 * @route   GET /api/integrations/connectors/:connectorId
 * @desc    Get specific connector details
 * @access  Private
 * @param   {string} connectorId - Connector ID
 * @return  {object} Connector details
 */
router.get('/connectors/:connectorId', requireAuth, IntegrationHubController.getConnector);

/**
 * ========== WORKFLOWS ROUTES ==========
 */

/**
 * @route   POST /api/integrations/workflows
 * @desc    Create a new workflow
 * @access  Private (Tenant User)
 * @param   {string} name - Workflow name
 * @param   {object} trigger - Trigger configuration
 * @param   {array} [actions] - Array of actions to execute
 * @param   {array} [conditions] - Conditional logic
 * @return  {object} Created workflow
 * @example
 * {
 *   "name": "Slack Alert on New Order",
 *   "trigger": {
 *     "connectorId": "shopify",
 *     "event": "order.created"
 *   },
 *   "actions": [
 *     {
 *       "connectorId": "slack",
 *       "type": "send_message",
 *       "data": { "channel": "#orders", "text": "New order created" }
 *     }
 *   ]
 * }
 */
router.post(
  '/workflows',
  requireAuth,
  requireTenant,
  IntegrationHubController.createWorkflow
);

/**
 * @route   POST /api/integrations/workflows/:workflowId/execute
 * @desc    Execute a workflow
 * @access  Private (Tenant User)
 * @param   {string} workflowId - Workflow ID
 * @body    {object} triggerData - Data to pass to workflow
 * @return  {object} Execution result
 */
router.post(
  '/workflows/:workflowId/execute',
  requireAuth,
  requireTenant,
  IntegrationHubController.executeWorkflow
);

/**
 * ========== WEBHOOKS ROUTES ==========
 */

/**
 * @route   POST /api/integrations/webhooks/register
 * @desc    Register a webhook endpoint
 * @access  Private (Tenant Admin)
 * @param   {string} connectorId - Connector ID
 * @param   {string} webhookUrl - URL to receive webhook events
 * @param   {array} [events] - Array of events to subscribe to
 * @return  {object} Webhook registration details
 */
router.post(
  '/webhooks/register',
  requireAuth,
  requireTenant,
  IntegrationHubController.registerWebhook
);

/**
 * @route   POST /api/integrations/webhooks/:webhookId/trigger
 * @desc    Trigger a webhook (for testing)
 * @access  Private
 * @param   {string} webhookId - Webhook ID
 * @body    {object} - Webhook payload data
 * @return  {object} Trigger result
 */
router.post(
  '/webhooks/:webhookId/trigger',
  requireAuth,
  IntegrationHubController.triggerWebhook
);

/**
 * ========== MARKETPLACE ROUTES ==========
 */

/**
 * @route   POST /api/integrations/marketplace/apps
 * @desc    Publish a new app to marketplace
 * @access  Private (Developer/Admin)
 * @param   {string} name - App name
 * @param   {string} author - App author email
 * @param   {string} category - App category (productivity, communication, ecommerce, etc.)
 * @param   {string} [description] - App description
 * @param   {string} [version] - Semantic version
 * @param   {object} [pricing] - Pricing information
 * @param   {array} [features] - App features list
 * @return  {object} Published app details
 */
router.post(
  '/marketplace/apps',
  requireAuth,
  IntegrationHubController.publishApp
);

/**
 * @route   GET /api/integrations/marketplace/apps
 * @desc    Get marketplace apps with filtering
 * @access  Public
 * @query   {string} [category] - Filter by category
 * @query   {string} [pricing] - Filter by pricing (free, premium, enterprise)
 * @query   {string} [search] - Search by name or description
 * @query   {number} [limit] - Limit number of results
 * @return  {array} Array of apps matching criteria
 */
router.get('/marketplace/apps', IntegrationHubController.getMarketplaceApps);

/**
 * @route   POST /api/integrations/marketplace/subscribe
 * @desc    Subscribe to a marketplace app
 * @access  Private (Tenant User)
 * @param   {string} appId - App ID to subscribe to
 * @param   {string} [plan] - Subscription plan (free, premium, enterprise)
 * @return  {object} Subscription details with API key
 */
router.post(
  '/marketplace/subscribe',
  requireAuth,
  requireTenant,
  IntegrationHubController.subscribeToApp
);

/**
 * ========== STATISTICS ROUTES ==========
 */

/**
 * @route   GET /api/integrations/statistics
 * @desc    Get integration hub statistics
 * @access  Private (Tenant Admin)
 * @return  {object} Statistics object containing:
 *          - totalConnectors: number
 *          - connectorsByStatus: object
 *          - totalWorkflows: number
 *          - activeWorkflows: number
 *          - totalExecutions: number
 *          - webhooksRegistered: number
 *          - marketplaceApps: number
 *          - totalSubscriptions: number
 */
router.get(
  '/statistics',
  requireAuth,
  requireTenant,
  IntegrationHubController.getStatistics
);

module.exports = router;
