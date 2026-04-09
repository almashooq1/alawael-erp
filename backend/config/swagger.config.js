/* eslint-disable no-unused-vars */
/**
 * Swagger/OpenAPI Configuration
 * إعدادات توثيق API
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const logger = require('../utils/logger');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Alawael ERP Center API',
      description: 'نظام إدارة مركز إعادة التأهيل - نظام ERP متكامل',
      version: '2.1.0',
      contact: {
        name: 'Alawael Support',
        email: 'support@alawael.com',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001/api/v1',
        description: 'Development Server',
      },
      {
        url: 'https://staging.alaweal.org/api/v1',
        description: 'Staging Server',
      },
      {
        url: 'https://api.alawael.com/v1',
        description: 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Token Authentication',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API Key Authentication',
        },
      },
      schemas: {
        User: {
          type: 'object',
          required: ['email', 'name'],
          properties: {
            _id: {
              type: 'string',
              format: 'mongodb-objectid',
              description: 'معرف المستخدم',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'البريد الإلكتروني',
            },
            name: {
              type: 'string',
              description: 'الاسم الكامل',
            },
            phone: {
              type: 'string',
              description: 'رقم الهاتف',
            },
            role: {
              type: 'string',
              enum: ['user', 'admin', 'manager'],
              description: 'دور المستخدم',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'تاريخ الإنشاء',
            },
          },
        },

        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'رمز الخطأ',
                },
                message: {
                  type: 'string',
                  description: 'رسالة الخطأ',
                },
                messageAr: {
                  type: 'string',
                  description: 'رسالة الخطأ بالعربية',
                },
                details: {
                  type: 'object',
                  description: 'تفاصيل إضافية',
                },
              },
            },
          },
        },

        PaginatedResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/User' },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                pages: { type: 'integer' },
              },
            },
          },
        },

        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@alawael.com' },
            password: { type: 'string', format: 'password', example: '••••••••' },
          },
        },

        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            token: { type: 'string', description: 'JWT bearer token' },
            refreshToken: { type: 'string', description: 'Refresh token' },
            user: { $ref: '#/components/schemas/User' },
          },
        },

        Beneficiary: {
          type: 'object',
          required: ['name', 'nationalId'],
          properties: {
            _id: { type: 'string', format: 'mongodb-objectid' },
            name: { type: 'string', description: 'اسم المستفيد' },
            nameAr: { type: 'string', description: 'الاسم بالعربية' },
            nationalId: { type: 'string', description: 'رقم الهوية الوطنية' },
            dateOfBirth: { type: 'string', format: 'date' },
            gender: { type: 'string', enum: ['male', 'female'] },
            phone: { type: 'string' },
            email: { type: 'string', format: 'email' },
            status: { type: 'string', enum: ['active', 'inactive', 'suspended', 'graduated'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        Employee: {
          type: 'object',
          required: ['name', 'employeeId'],
          properties: {
            _id: { type: 'string', format: 'mongodb-objectid' },
            name: { type: 'string', description: 'اسم الموظف' },
            employeeId: { type: 'string', description: 'رقم الموظف' },
            department: { type: 'string' },
            position: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            status: { type: 'string', enum: ['active', 'inactive', 'on_leave', 'terminated'] },
            hireDate: { type: 'string', format: 'date' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            messageAr: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },

      responses: {
        400: {
          description: 'Bad Request',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        401: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        403: {
          description: 'Forbidden',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        404: {
          description: 'Not Found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        500: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },

    security: [{ bearerAuth: [] }, { apiKey: [] }],

    tags: [
      { name: 'Auth', description: 'المصادقة وإدارة الجلسات — Authentication & Sessions' },
      { name: 'Users', description: 'إدارة المستخدمين — User Management' },
      { name: 'Beneficiaries', description: 'إدارة المستفيدين — Beneficiary Management' },
      { name: 'Employees', description: 'إدارة الموظفين — Employee Management' },
      { name: 'Finance', description: 'الإدارة المالية — Finance & Accounting' },
      { name: 'HR', description: 'الموارد البشرية — Human Resources' },
      { name: 'Attendance', description: 'الحضور والانصراف — Attendance Tracking' },
      { name: 'Documents', description: 'إدارة المستندات — Document Management' },
      { name: 'Notifications', description: 'الإشعارات — Notifications' },
      { name: 'Reports', description: 'التقارير — Reporting & Analytics' },
      { name: 'Settings', description: 'الإعدادات — System Settings' },
      { name: 'Health', description: 'فحص صحة النظام — Health & Monitoring' },
    ],
  },

  apis: ['./routes/**/*.js', './api/**/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

// Enrich with DDD rehabilitation domain tags & schemas (20 domains, 10+ schemas)
try {
  const { enrichSwaggerWithDDD } = require('./swagger-ddd.config');
  enrichSwaggerWithDDD(swaggerSpec);
} catch (err) {
  logger.warn('[Swagger] DDD enrichment skipped:', err.message);
}

/**
 * Setup Swagger UI — single consolidated mount point
 * Mounts at /api-docs (primary) and /api/docs (alias)
 */
const setupSwagger = app => {
  const PORT = process.env.PORT || 3001;

  // Dynamic server URL (overrides static config when env var is set)
  if (process.env.API_BASE_URL) {
    swaggerSpec.servers = [
      { url: process.env.API_BASE_URL, description: 'Current server' },
      ...swaggerSpec.servers,
    ];
  } else {
    swaggerSpec.servers.unshift({
      url: `http://localhost:${PORT}`,
      description: 'Local Development',
    });
  }

  const swaggerUiOptions = {
    swaggerOptions: {
      persistAuthorization: true,
      displayOperationId: true,
      showRequestHeaders: true,
      showExtensions: true,
    },
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Alawael ERP API Documentation',
  };

  // Primary path (was the inline route in app.js)
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  // Alias path (from original swagger.config.js)
  app.use('/api/docs', swaggerUi.serve);
  app.get('/api/docs', swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  // JSON spec endpoint
  app.get('/api/docs/openapi.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  logger.info(`📖 Swagger API Docs: http://localhost:${PORT}/api-docs`);
};

module.exports = {
  swaggerSpec,
  setupSwagger,
};
