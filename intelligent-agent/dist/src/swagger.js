"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerDocument = void 0;
exports.setupSwagger = setupSwagger;
// إعداد Swagger/OpenAPI لتوثيق REST API
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
exports.swaggerDocument = {
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
function setupSwagger(app) {
    app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(exports.swaggerDocument));
}
