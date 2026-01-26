/**
 * Swagger/OpenAPI Configuration
 * إعدادات توثيق API
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

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
      },

      responses: {
        '400': {
          description: 'Bad Request',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        '403': {
          description: 'Forbidden',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        '404': {
          description: 'Not Found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        '500': {
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
  },

  apis: ['./backend/routes/**/*.js', './backend/api/**/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Setup Swagger UI
 */
const setupSwagger = app => {
  app.use('/api/docs', swaggerUi.serve);

  app.get('/api/docs', swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      persistAuthorization: true,
      displayOperationId: true,
      showRequestHeaders: true,
      showExtensions: true,
    },
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Alawael ERP API Documentation',
  }));

  // JSON spec endpoint
  app.get('/api/docs/openapi.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('✅ Swagger API Documentation: http://localhost:3001/api/docs');
};

module.exports = {
  swaggerSpec,
  setupSwagger,
};
