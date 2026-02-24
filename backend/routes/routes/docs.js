// API Documentation Routes
const express = require('express');
const router = express.Router();
const { ApiResponse } = require('../utils/apiResponse');

// Main API documentation
router.get('/', (_req, res) => {
  const documentation = {
    title: 'ERP System API',
    version: '1.0.0',
    description: 'Comprehensive Enterprise Resource Planning System API',
    baseURL: `http://localhost:${process.env.PORT}/api`,
    environment: process.env.NODE_ENV,
    endpoints: {
      authentication: {
        path: '/api/auth',
        methods: {
          POST: [
            '/register',
            '/login',
            '/logout',
            '/verify-email',
            '/forgot-password',
            '/reset-password',
          ],
          GET: ['/verify-token', '/me', '/sessions'],
          PATCH: ['/change-password', '/update-profile', '/enable-2fa'],
        },
      },
      users: {
        path: '/api/users',
        methods: {
          GET: ['/', '/:userId', '/stats/overview', '/search'],
          POST: ['/', '/import/csv', '/:userId/reset-password'],
          PUT: ['/:userId'],
          PATCH: ['/:userId/status', '/:userId/role'],
          DELETE: ['/:userId'],
        },
      },
      rbac: {
        path: '/api/rbac',
        methods: {
          GET: [
            '/roles',
            '/roles/:roleId',
            '/permissions',
            '/stats/overview',
            '/audit/log',
            '/export/config',
          ],
          POST: [
            '/roles',
            '/check-permission',
            '/check-access',
            '/roles/:roleId/permissions',
            '/import/config',
          ],
          PUT: ['/roles/:roleId'],
          DELETE: ['/roles/:roleId', '/roles/:roleId/permissions/:permission'],
        },
      },
      analytics: {
        path: '/api/analytics',
        methods: {
          GET: [
            '/user-behavior/:userId',
            '/performance-metrics',
            '/dashboard/:userId',
            '/trends/:metric',
            '/recommendations',
          ],
        },
      },
      cms: {
        path: '/api/cms',
        methods: {
          GET: [
            '/pages',
            '/pages/:slug',
            '/posts',
            '/categories',
            '/media',
            '/stats',
            '/pages/:pageId/autosaves',
          ],
          POST: [
            '/pages',
            '/posts',
            '/categories',
            '/media/upload',
            '/schedule',
            '/pages/:pageId/restore/:versionId',
          ],
          PUT: ['/pages/:pageId'],
          DELETE: ['/pages/:pageId', '/media/:mediaId', '/comments/:commentId'],
        },
      },
      integrations: {
        path: '/api/integrations',
        methods: {
          GET: ['/status', '/available', '/rate-limit/:apiKey'],
          POST: [
            '/payments/process',
            '/email/send',
            '/sms/send',
            '/storage/upload',
            '/crm/sync',
            '/analytics/track',
            '/webhooks/handle',
          ],
        },
      },
      monitoring: {
        path: '/api/monitoring',
        methods: {
          GET: ['/health', '/metrics', '/endpoints', '/alerts', '/database', '/realtime'],
        },
      },
      notifications: {
        path: '/api/notifications',
        methods: {
          GET: ['/user/:userId'],
          POST: ['/send', '/schedule'],
          PUT: ['/:id/read'],
          DELETE: ['/:id', '/user/:userId/all'],
        },
      },
      performance: {
        path: '/api/performance',
        methods: {
          GET: [
            '/analysis',
            '/caching/recommendations',
            '/database/optimization',
            '/code/optimization',
            '/benchmarks',
            '/history',
          ],
        },
      },
      predictions: {
        path: '/api/predictions',
        methods: {
          POST: ['/sales', '/performance', '/attendance', '/churn', '/inventory'],
        },
      },
      reports: {
        path: '/api/reports',
        methods: {
          GET: ['/all'],
          POST: ['/generate', '/export/csv', '/export/json', '/export/excel'],
          DELETE: ['/:id'],
        },
      },
      support: {
        path: '/api/support',
        methods: {
          GET: ['/tickets', '/statistics', '/faq', '/team/status', '/kb/search'],
          POST: ['/tickets/create', '/tickets/:id/comments'],
          PUT: ['/tickets/:id/status'],
        },
      },
    },
    headers: {
      authorization: 'Bearer <jwt_token>',
      'content-type': 'application/json',
    },
    statusCodes: {
      200: 'OK',
      201: 'Created',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error',
    },
    examples: {
      login: {
        method: 'POST',
        url: '/api/auth/login',
        body: {
          email: 'user@example.com',
          password: 'password123',
        },
      },
      registerUser: {
        method: 'POST',
        url: '/api/users',
        body: {
          name: 'John Doe',
          email: 'john@example.com',
          password: 'secure_password_123',
          role: 'user',
        },
      },
      getUsers: {
        method: 'GET',
        url: '/api/users?role=user&status=active',
        headers: {
          authorization: 'Bearer <jwt_token>',
        },
      },
    },
  };

  return res.json(new ApiResponse(200, documentation, 'API Documentation'));
});

// Endpoint list
router.get('/endpoints', (req, res) => {
  const endpoints = [
    { path: '/api/auth', description: 'Authentication endpoints' },
    { path: '/api/users', description: 'User management' },
    { path: '/api/rbac', description: 'Role-based access control' },
    { path: '/api/analytics', description: 'Advanced analytics' },
    { path: '/api/cms', description: 'Content management system' },
    { path: '/api/integrations', description: 'Third-party integrations' },
    { path: '/api/monitoring', description: 'System monitoring' },
    { path: '/api/notifications', description: 'Notifications system' },
    { path: '/api/performance', description: 'Performance optimization' },
    { path: '/api/predictions', description: 'AI predictions' },
    { path: '/api/reports', description: 'Report generation' },
    { path: '/api/support', description: 'Support tickets' },
  ];

  return res.json(new ApiResponse(200, endpoints, 'API Endpoints'));
});

// Health status
router.get('/status', (req, res) => {
  const status = {
    api: 'operational',
    database: process.env.USE_MOCK_DB === 'true' ? 'mock' : 'connected',
    cache: process.env.USE_MOCK_CACHE === 'true' ? 'mock' : 'configured',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  };

  return res.json(new ApiResponse(200, status, 'System status'));
});

module.exports = router;
