/* eslint-disable no-unused-vars */
// ═══════════════════════════════════════════════════════════════
// ALAWAEL ERP - API Documentation (Swagger/OpenAPI Setup)
// Date: March 2, 2026
// ═══════════════════════════════════════════════════════════════

/**
 * Swagger/OpenAPI Configuration for ALAWAEL ERP API
 * Install: npm install swagger-ui-express swagger-jsdoc
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// ═══════════════════════════════════════════════════════════════
// API Documentation Definition
// ═══════════════════════════════════════════════════════════════

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'ALAWAEL ERP API',
    version: '1.0.0',
    description: 'Complete API documentation for ALAWAEL ERP System',
    contact: {
      name: 'ALAWAEL Support',
      email: 'support@alawael.local',
      url: 'https://alawael.local',
    },
    license: {
      name: 'Proprietary',
      url: 'https://alawael.local',
    },
  },
  servers: [
    {
      url: process.env.BACKEND_URL || 'http://localhost:3001',
      description: 'Backend API Server',
      variables: {
        basePath: {
          default: '/api/v1',
        },
      },
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Bearer Token for authentication',
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API Key for service-to-service communication',
      },
    },
    schemas: {
      // Common Response Schemas
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'healthy' },
          timestamp: { type: 'string', format: 'date-time' },
          uptime: {
            type: 'object',
            properties: {
              seconds: { type: 'number' },
              readable: { type: 'string', example: '2h 30m' },
            },
          },
          checks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                status: { type: 'string', enum: ['pass', 'fail', 'warn'] },
                value: { type: 'number' },
                threshold: { type: 'number' },
              },
            },
          },
          process: {
            type: 'object',
            properties: {
              pid: { type: 'number' },
              memory: {
                type: 'object',
                properties: {
                  heapUsed: { type: 'string' },
                  rss: { type: 'string' },
                },
              },
            },
          },
        },
      },

      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
          message: { type: 'string' },
          statusCode: { type: 'integer' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },

      PaginatedResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array' },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'number' },
              limit: { type: 'number' },
              total: { type: 'number' },
              pages: { type: 'number' },
            },
          },
        },
      },

      // Authentication
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
        },
      },

      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          token: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string' },
              department: { type: 'string' },
            },
          },
        },
      },

      // User
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: {
            type: 'string',
            enum: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERATOR', 'VIEWER', 'USER'],
          },
          department: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      CreateUserRequest: {
        type: 'object',
        required: ['email', 'name', 'role'],
        properties: {
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string' },
          department: { type: 'string' },
          password: { type: 'string', format: 'password' },
        },
      },

      // Order
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          orderNumber: { type: 'string' },
          status: {
            type: 'string',
            enum: ['draft', 'pending', 'approved', 'rejected', 'shipped', 'completed'],
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                quantity: { type: 'number' },
                price: { type: 'number' },
              },
            },
          },
          total: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      CreateOrderRequest: {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                quantity: { type: 'number' },
                price: { type: 'number' },
              },
            },
          },
          notes: { type: 'string' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

// ═══════════════════════════════════════════════════════════════
// API Endpoints Documentation (JSDoc format)
// ═══════════════════════════════════════════════════════════════

/**
 * @swagger
 * /health:
 *   get:
 *     tags:
 *       - System
 *     summary: System health check
 *     description: Get current system health status, uptime, and metrics
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *       503:
 *         description: System unhealthy
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: User login
 *     description: Authenticate user with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: User logout
 *     description: Logout current user and invalidate token
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Refresh authentication token
 *     description: Get a new JWT token using refresh token
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed
 */

/**
 * @swagger
 * /users:
 *   get:
 *     tags:
 *       - Users
 *     summary: List all users
 *     description: Get paginated list of users (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Users list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       403:
 *         description: Forbidden
 */

/**
 * @swagger
 * /users/{userId}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user details
 *     description: Get detailed information about a specific user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /users:
 *   post:
 *     tags:
 *       - Users
 *     summary: Create new user
 *     description: Create a new user account (Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid data
 */

/**
 * @swagger
 * /orders:
 *   get:
 *     tags:
 *       - Orders
 *     summary: List orders
 *     description: Get paginated list of orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Orders list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */

/**
 * @swagger
 * /orders:
 *   post:
 *     tags:
 *       - Orders
 *     summary: Create order
 *     description: Create a new order
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderRequest'
 *     responses:
 *       201:
 *         description: Order created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Invalid data
 */

/**
 * @swagger
 * /metrics/database:
 *   get:
 *     tags:
 *       - Metrics
 *     summary: Database metrics
 *     description: Get database performance metrics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Database metrics
 */

/**
 * @swagger
 * /metrics/redis:
 *   get:
 *     tags:
 *       - Metrics
 *     summary: Redis cache metrics
 *     description: Get Redis cache performance metrics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Redis metrics
 */

// ═══════════════════════════════════════════════════════════════
// Swagger Setup Function
// ═══════════════════════════════════════════════════════════════

const setupSwagger = app => {
  const options = {
    definition: swaggerDefinition,
    apis: ['./routes/**/*.js', './routes/*.js'],
  };

  const specs = swaggerJsdoc(options);

  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      swaggerOptions: {
        persistAuthorization: true,
        displayOperationId: false,
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
      },
      customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui { background-color: #fafafa; }
      .swagger-ui .schemes > label > span { color: #008000; }
    `,
    })
  );

  // Also provide JSON specification
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log('✅ Swagger API Documentation available at /api-docs');
};

// ═══════════════════════════════════════════════════════════════
// Installation & Usage Instructions
// ═══════════════════════════════════════════════════════════════

/**
 * INSTALLATION:
 * npm install swagger-ui-express swagger-jsdoc
 *
 * USAGE in server.js:
 * const { setupSwagger } = require('./swagger');
 * setupSwagger(app);
 *
 * ACCESS:
 * http://localhost:3001/api-docs
 *
 * EXPORT OPENAPI SPEC:
 * http://localhost:3001/api-docs.json
 */

module.exports = { setupSwagger, swaggerDefinition };
