// إعداد Swagger/OpenAPI لتوثيق REST API
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Intelligent Agent API',
    version: '1.0.0',
    description: 'توثيق REST API للنظام الذكي'
  },
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: {
          200: { description: 'OK' }
        }
      }
    },
    '/nlp': {
      post: {
        summary: 'تحليل نص باستخدام NLP',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  userId: { type: 'string' },
                  roles: { type: 'array', items: { type: 'string' } }
                },
                required: ['text', 'userId', 'roles']
              }
            }
          }
        },
        responses: {
          200: { description: 'نتيجة التحليل' },
          403: { description: 'ممنوع' },
          400: { description: 'طلب غير صالح' },
          401: { description: 'غير مصرح' }
        }
      }
    }
  },
  // <-- missing comma above
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  }
};

export function setupSwagger(app: Express) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}
