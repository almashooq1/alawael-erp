/**
 * Swagger/OpenAPI Configuration for Disability Rehabilitation System
 * Generate comprehensive API documentation
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'نظام تأهيل ذوي الإعاقة - API Documentation',
      description: `
        نظام شامل لإدارة برامج تأهيل ذوي الإعاقة
        يوفر API RESTful متكامل مع إمكانيات:
        - إدارة البرامج التأهيلية الشاملة
        - تتبع الجلسات العلاجية
        - قياس التقدم والنتائج
        - الإحصائيات والتقارير المتقدمة
        - إدارة المستفيدين والخدمات
      `,
      version: '1.0.0',
      contact: {
        name: 'فريق التطوير',
        email: 'support@alaweal.com',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: 'Local Development Server',
      },
      {
        url: 'https://api.alaweal.com/api',
        description: 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Token for authentication',
        },
      },
      schemas: {
        ProgramInfo: {
          type: 'object',
          properties: {
            name_ar: { type: 'string', example: 'برنامج تأهيل بدني شامل' },
            name_en: { type: 'string', example: 'Comprehensive Physical Rehabilitation Program' },
            description: { type: 'string' },
            start_date: { type: 'string', format: 'date-time' },
            end_date: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['active', 'pending', 'completed', 'on_hold'] },
            severity: { type: 'string', enum: ['mild', 'moderate', 'severe'] },
            duration_target_months: { type: 'number' },
            budget_allocated: { type: 'number' },
            budget_spent: { type: 'number' },
          },
          required: ['name_ar', 'name_en', 'start_date', 'status'],
        },
        Beneficiary: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'BENE0001' },
            name_ar: { type: 'string' },
            name_en: { type: 'string' },
            date_of_birth: { type: 'string', format: 'date' },
            gender: { type: 'string', enum: ['male', 'female'] },
            contact_number: { type: 'string' },
            email: { type: 'string', format: 'email' },
          },
          required: ['id', 'name_ar', 'name_en', 'date_of_birth'],
        },
        DisabilityInfo: {
          type: 'object',
          properties: {
            primary_disability: {
              type: 'string',
              enum: [
                'physical',
                'visual',
                'hearing',
                'intellectual',
                'autism',
                'learning',
                'multiple',
                'speech',
                'behavioral',
                'developmental',
              ],
            },
            secondary_disabilities: { type: 'array', items: { type: 'string' } },
            severity_level: { type: 'string', enum: ['mild', 'moderate', 'severe'] },
            diagnosis_date: { type: 'string', format: 'date' },
            clinical_assessment: { type: 'string' },
          },
          required: ['primary_disability', 'severity_level'],
        },
        RehabilitationGoal: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: [
                'mobility',
                'communication',
                'self_care',
                'independence',
                'social_integration',
                'educational',
                'vocational',
                'emotional_wellbeing',
              ],
            },
            description_ar: { type: 'string' },
            description_en: { type: 'string' },
            target_date: { type: 'string', format: 'date' },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            measurable_criteria: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'achieved', 'paused'] },
            progress_percentage: { type: 'number', minimum: 0, maximum: 100 },
          },
          required: ['category', 'description_ar', 'target_date', 'priority'],
        },
        RehabilitationService: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: [
                'physiotherapy',
                'occupational_therapy',
                'speech_therapy',
                'psychological_counseling',
                'educational_support',
                'vocational_training',
                'mobility_assistance',
                'daily_living_skills',
              ],
            },
            frequency: { type: 'string', enum: ['weekly', 'twice_weekly', 'monthly', 'daily'] },
            duration_per_session_minutes: { type: 'number' },
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            provider_name: { type: 'string' },
            location: { type: 'string' },
            status: { type: 'string', enum: ['active', 'paused', 'completed'] },
          },
          required: ['type', 'frequency', 'duration_per_session_minutes', 'start_date'],
        },
        TherapySession: {
          type: 'object',
          properties: {
            session_date: { type: 'string', format: 'date-time' },
            duration_minutes: { type: 'number' },
            type: { type: 'string', enum: ['individual', 'group', 'family'] },
            attendance: { type: 'string', enum: ['present', 'absent', 'partially_present'] },
            notes: { type: 'string' },
            therapist_notes: { type: 'string' },
            outcome: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
          },
          required: ['session_date', 'duration_minutes', 'type', 'attendance'],
        },
        DisabilityRehabilitation: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            program_info: { $ref: '#/components/schemas/ProgramInfo' },
            beneficiary: { $ref: '#/components/schemas/Beneficiary' },
            disability_info: { $ref: '#/components/schemas/DisabilityInfo' },
            rehabilitation_goals: {
              type: 'array',
              items: { $ref: '#/components/schemas/RehabilitationGoal' },
            },
            rehabilitation_services: {
              type: 'array',
              items: { $ref: '#/components/schemas/RehabilitationService' },
            },
            therapy_sessions: {
              type: 'array',
              items: { $ref: '#/components/schemas/TherapySession' },
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' },
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
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            error: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./routes/disability-rehabilitation.routes.js'],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
