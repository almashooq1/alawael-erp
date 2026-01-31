import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Alawael ERP API Documentation',
      version: '2.1.0',
      description: 'نظام إدارة موارد المؤسسة - واجهة برمجة التطبيقات',
      contact: {
        name: 'API Support',
        email: 'support@alawael.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.alawael.com',
        description: 'Production server',
      },
      {
        url: 'https://staging-api.alawael.com',
        description: 'Staging server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API Key for external integrations',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            message: {
              type: 'string',
              description: 'Detailed error description',
            },
            statusCode: {
              type: 'number',
              description: 'HTTP status code',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID',
            },
            username: {
              type: 'string',
              description: 'Username',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email address',
            },
            role: {
              type: 'string',
              enum: ['admin', 'user', 'manager', 'viewer'],
              description: 'User role',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Meeting: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Meeting ID',
            },
            title: {
              type: 'string',
              description: 'Meeting title',
            },
            description: {
              type: 'string',
              description: 'Meeting description',
            },
            date: {
              type: 'string',
              format: 'date-time',
              description: 'Meeting date and time',
            },
            attendees: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'List of attendee emails',
            },
            status: {
              type: 'string',
              enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        ComplianceEvent: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
            },
            eventType: {
              type: 'string',
              description: 'Type of compliance event',
            },
            status: {
              type: 'string',
              enum: ['pass', 'fail', 'warning'],
            },
            description: {
              type: 'string',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        NotFoundError: {
          description: 'The specified resource was not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Users',
        description: 'User management',
      },
      {
        name: 'Meetings',
        description: 'Meeting management',
      },
      {
        name: 'Compliance',
        description: 'Compliance monitoring and reporting',
      },
      {
        name: 'Analytics',
        description: 'Analytics and reporting',
      },
      {
        name: 'Health',
        description: 'System health and monitoring',
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/routes/*.js',
    './src/controllers/*.ts',
    './src/controllers/*.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Setup Swagger documentation
 */
export function setupSwagger(app: Express): void {
  // Swagger UI
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Alawael ERP API Documentation',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
      },
    })
  );

  // Swagger JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📚 Swagger documentation available at /api-docs');
}

export default setupSwagger;
