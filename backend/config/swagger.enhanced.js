/**
 * Enhanced Swagger/OpenAPI Configuration
 * تحسين توثيق API المتقدم
 *
 * Features:
 * - Comprehensive API documentation
 * - Authentication schemes
 * - Request/Response examples
 * - Error responses documentation
 * - Tags and grouping
 */

const swaggerJsdoc = require('swagger-jsdoc');

/**
 * Enhanced Swagger configuration
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AlAwael ERP API',
      version: '2.0.0',
      description: `
# AlAwael ERP System API Documentation

Complete API documentation for the AlAwael ERP system including all modules and features.

## Features
- Advanced Analytics & Reporting
- HR Management System
- Finance & Accounting
- Document Management
- Workflow Automation
- Real-time Notifications
- AI-Powered Features

## Authentication
All protected endpoints require a Bearer token in the Authorization header.

\`\`\`
Authorization: Bearer <your_token_here>
\`\`\`

## Rate Limiting
- **Global**: 100 requests per 15 minutes
- **Auth**: 5 attempts per 15 minutes
- **Heavy Operations**: 10 requests per hour
- **Uploads**: 50 requests per hour

## Response Format
All API responses follow this standard format:

**Success Response:**
\`\`\`json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "timestamp": "2026-01-29T12:00:00.000Z"
}
\`\`\`

**Error Response:**
\`\`\`json
{
  "success": false,
  "message": "Error message",
  "code": "ERROR_CODE",
  "errors": [],
  "statusCode": 400,
  "timestamp": "2026-01-29T12:00:00.000Z"
}
\`\`\`

## Support
For support, email support@alawael.com
      `,
      contact: {
        name: 'AlAwael Support',
        email: 'support@alawael.com',
        url: 'https://alawael.com/support',
      },
      license: {
        name: 'Proprietary',
        url: 'https://alawael.com/license',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: 'Development server',
      },
      {
        url: 'http://localhost:3001',
        description: 'Development server (root)',
      },
      {
        url: 'https://api.alawael.com',
        description: 'Production server',
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
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
            code: {
              type: 'string',
              example: 'ERROR_CODE',
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
            statusCode: {
              type: 'integer',
              example: 400,
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operation successful',
            },
            data: {
              type: 'object',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
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
            message: {
              type: 'string',
            },
            data: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
            meta: {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  example: 1,
                },
                limit: {
                  type: 'integer',
                  example: 10,
                },
                total: {
                  type: 'integer',
                  example: 100,
                },
                totalPages: {
                  type: 'integer',
                  example: 10,
                },
                hasNextPage: {
                  type: 'boolean',
                  example: true,
                },
                hasPrevPage: {
                  type: 'boolean',
                  example: false,
                },
              },
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
              example: '507f1f77bcf86cd799439011',
            },
            name: {
              type: 'string',
              example: 'John Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com',
            },
            role: {
              type: 'string',
              enum: ['admin', 'user', 'manager'],
              example: 'user',
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
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Unauthorized access',
                code: 'UNAUTHORIZED',
                statusCode: 401,
                timestamp: '2026-01-29T12:00:00.000Z',
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Insufficient permissions',
                code: 'FORBIDDEN',
                statusCode: 403,
                timestamp: '2026-01-29T12:00:00.000Z',
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Resource not found',
                code: 'NOT_FOUND',
                statusCode: 404,
                timestamp: '2026-01-29T12:00:00.000Z',
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                errors: [
                  {
                    field: 'email',
                    message: 'Invalid email format',
                  },
                ],
                statusCode: 422,
                timestamp: '2026-01-29T12:00:00.000Z',
              },
            },
          },
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Too many requests, please try again later',
                code: 'RATE_LIMIT_EXCEEDED',
                statusCode: 429,
                timestamp: '2026-01-29T12:00:00.000Z',
              },
            },
          },
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Internal server error',
                code: 'SERVER_ERROR',
                statusCode: 500,
                timestamp: '2026-01-29T12:00:00.000Z',
              },
            },
          },
        },
      },
      parameters: {
        PageParam: {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
          description: 'Page number for pagination',
        },
        LimitParam: {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10,
          },
          description: 'Number of items per page (max 100)',
        },
        SortParam: {
          in: 'query',
          name: 'sort',
          schema: {
            type: 'string',
            example: '-createdAt',
          },
          description: 'Sort field (prefix with - for descending)',
        },
        SearchParam: {
          in: 'query',
          name: 'search',
          schema: {
            type: 'string',
          },
          description: 'Search query string',
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
        description: 'User management operations',
      },
      {
        name: 'Analytics',
        description: 'Advanced analytics and reporting',
      },
      {
        name: 'Health',
        description: 'System health and monitoring',
      },
      {
        name: 'Metrics',
        description: 'Performance metrics and statistics',
      },
      {
        name: 'HR',
        description: 'Human resources management',
      },
      {
        name: 'Finance',
        description: 'Financial management and accounting',
      },
      {
        name: 'Documents',
        description: 'Document management system',
      },
      {
        name: 'Workflows',
        description: 'Workflow automation',
      },
      {
        name: 'Notifications',
        description: 'Notification system',
      },
    ],
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './api/routes/*.js',
    './routes/*.js',
    '../api/routes/*.js',
    '../routes/*.js',
    './api/routes/**/*.js',
    './routes/**/*.js',
  ],
};

/**
 * Generate Swagger specification
 */
const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Swagger UI custom options
 */
const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    requestSnippetsEnabled: true,
    syntaxHighlight: {
      activate: true,
      theme: 'monokai',
    },
  },
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .information-container { margin: 20px 0 }
  `,
  customSiteTitle: 'AlAwael ERP API Documentation',
};

module.exports = {
  swaggerSpec,
  swaggerUiOptions,
  swaggerOptions,
};
