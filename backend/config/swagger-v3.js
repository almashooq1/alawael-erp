/**
 * ═══════════════════════════════════════════════════════════════════════════
 * OpenAPI 3.0 Specification — Al-Awael ERP v3.5.0
 * All 20 Systems (Phases 1-4)
 * ═══════════════════════════════════════════════════════════════════════════
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Al-Awael ERP — نظام إدارة مراكز تأهيل ذوي الإعاقة',
      version: '3.5.0',
      description: `
        **نظام متكامل لإدارة مراكز التأهيل** — يغطي 20 نظاماً فرعياً:

        | # | النظام | الوصف |
        |---|--------|-------|
        | 1 | ICF Assessment Engine | تقييم ICF-CY المتكامل |
        | 2 | Clinical Dashboard | لوحة القيادة السريرية |
        | 3 | Integrated Reports | التقارير المتكاملة |
        | 4 | AI Predictive Analytics | التحليلات التنبؤية بالذكاء الاصطناعي |
        | 5 | Telehealth | التأهيل عن بُعد |
        | 6 | Parent Portal | بوابة أولياء الأمور |
        | 7 | Executive Dashboard | لوحة القيادة التنفيذية |
        | 8 | Gamification | نظام التحفيز والتشجيع |
        | 9 | WhatsApp Chatbot | روبوت واتساب التفاعلي |
        | 10 | CCTV Integration | مركز المراقبة بالكاميرات |
        | 11 | Mobile App | تطبيق الموبايل |
        | 12 | Compliance & Accreditation | الامتثال والاعتماد |
        | 13 | EMR | السجل الطبي الإلكتروني |
        | 14 | BI Analytics | التحليلات المتقدمة |

        **التوثيق:** جميع النقاط تتطلب JWT token ما عدا Health & Public.
      `,
      contact: { name: 'فريق التطوير', email: 'dev@alawael.sa' },
      license: { name: 'Proprietary', url: 'https://alawael.sa/license' },
    },
    servers: [
      { url: 'http://localhost:3001/api/v1', description: 'Development' },
      { url: 'https://api.alawael.sa/api/v1', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token — احصل عليه من /api/auth/login',
        },
      },
      schemas: {
        // ─── Core ───
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' },
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
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            error: { type: 'string' },
            code: { type: 'string' },
          },
        },
        // ─── ICF ───
        ICFAssessment: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            beneficiary: { type: 'string', description: 'Beneficiary ID' },
            assessor: { type: 'string', description: 'Employee ID' },
            coreSetType: { type: 'string', enum: ['rehab', 'autism', 'cp', 'custom'] },
            scores: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  performance: { type: 'number', minimum: 0, maximum: 5 },
                  capacity: { type: 'number', minimum: 0, maximum: 5 },
                  environmental: { type: 'number', minimum: 0, maximum: 5 },
                  notes: { type: 'string' },
                  linkedGoals: { type: 'array', items: { type: 'string' } },
                },
              },
            },
            domainScores: {
              type: 'object',
              properties: {
                bodyFunctions: { type: 'number' },
                bodyStructures: { type: 'number' },
                activitiesAndParticipation: { type: 'number' },
                environmentalFactors: { type: 'number' },
                personalFactors: { type: 'number' },
              },
            },
            overallScore: { type: 'number', minimum: 0, maximum: 5 },
            status: { type: 'string', enum: ['draft', 'completed', 'reviewed'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
          required: ['beneficiary', 'assessor', 'coreSetType'],
        },
        ICFGoal: {
          type: 'object',
          properties: {
            domain: { type: 'string', enum: ['bodyFunctions', 'bodyStructures', 'activitiesAndParticipation', 'environmentalFactors', 'personalFactors'] },
            domainScore: { type: 'number' },
            priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            title: { type: 'string', example: 'تحسين الوظائف الجسدية' },
            description: { type: 'string' },
            measurement: { type: 'string' },
            target: { type: 'string' },
            deadline: { type: 'string', format: 'date-time' },
          },
        },
        // ─── Clinical Dashboard ───
        ClinicalDashboard: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            beneficiary: { type: 'object' },
            icf: { type: 'object', properties: { latest: { $ref: '#/components/schemas/ICFAssessment' }, history: { type: 'array' }, progress: { type: 'array' } } },
            carePlan: { type: 'object' },
            sessions: { type: 'object', properties: { upcoming: { type: 'array' }, recent: { type: 'array' }, stats: { type: 'object' } } },
            mdt: { type: 'object', properties: { meetings: { type: 'array' }, nextReview: { type: 'string', format: 'date-time' } } },
            alerts: { type: 'array' },
          },
        },
        // ─── AI Predictive ───
        GoalPrediction: {
          type: 'object',
          properties: {
            goalId: { type: 'string' },
            predictedCompletionDate: { type: 'string', format: 'date-time' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            factors: { type: 'array', items: { type: 'string' } },
            riskFlags: { type: 'array' },
          },
        },
        DischargeReadiness: {
          type: 'object',
          properties: {
            score: { type: 'integer', minimum: 0, maximum: 100 },
            level: { type: 'string', enum: ['not_ready', 'nearly_ready', 'ready', 'excellent'] },
            criteria: {
              type: 'object',
              properties: {
                goalsCompleted: { type: 'number' },
                functionalIndependence: { type: 'number' },
                familySupport: { type: 'number' },
                medicalStability: { type: 'number' },
              },
            },
          },
        },
        // ─── Telehealth ───
        TelehealthSession: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            beneficiary: { type: 'string' },
            therapist: { type: 'string' },
            scheduledAt: { type: 'string', format: 'date-time' },
            duration: { type: 'integer', description: 'Minutes' },
            status: { type: 'string', enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'] },
            videoUrl: { type: 'string' },
            recordingUrl: { type: 'string' },
            materials: { type: 'array', items: { type: 'string' } },
            technicalIssues: { type: 'array' },
            notes: { type: 'string' },
          },
        },
        // ─── Parent Portal ───
        ParentPortal: {
          type: 'object',
          properties: {
            beneficiary: { type: 'string' },
            overview: { type: 'object', properties: { activeGoals: { type: 'integer' }, upcomingSessions: { type: 'integer' }, lastAssessment: { type: 'string' }, healthStatus: { type: 'string' } } },
            progress: { type: 'array' },
            homePrograms: { type: 'array' },
            communications: { type: 'array' },
          },
        },
        // ─── Executive ───
        ExecutiveKPI: {
          type: 'object',
          properties: {
            totalBeneficiaries: { type: 'integer' },
            activeSessions: { type: 'integer' },
            avgSessionDuration: { type: 'number' },
            goalAchievementRate: { type: 'number' },
            staffUtilization: { type: 'number' },
            revenue: { type: 'number' },
            expenses: { type: 'number' },
          },
        },
        // ─── Gamification ───
        GameProfile: {
          type: 'object',
          properties: {
            beneficiary: { type: 'string' },
            points: { type: 'integer', minimum: 0 },
            badges: { type: 'array', items: { type: 'string' } },
            streak: { type: 'integer', minimum: 0 },
            challenges: { type: 'array' },
            leaderboardRank: { type: 'integer' },
          },
        },
        // ─── WhatsApp ───
        WhatsAppMessage: {
          type: 'object',
          properties: {
            from: { type: 'string', example: '966501234567' },
            to: { type: 'string' },
            body: { type: 'string', example: 'متى موعد الجلسة القادمة؟' },
            intent: { type: 'string', enum: ['appointment', 'evaluation', 'goal', 'invoice', 'contact', 'unknown'] },
            autoReply: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        // ─── CCTV ───
        Camera: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            location: { type: 'string' },
            status: { type: 'string', enum: ['online', 'offline', 'warning', 'maintenance'] },
            streamUrl: { type: 'string' },
            faceRecognitionEnabled: { type: 'boolean' },
            lastAlert: { type: 'string', format: 'date-time' },
          },
        },
        // ─── Compliance ───
        ComplianceAudit: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            standard: { type: 'string', enum: ['CBAHI', 'JCI', 'NPHIES'] },
            category: { type: 'string' },
            score: { type: 'integer', minimum: 0, maximum: 100 },
            findings: { type: 'array' },
            correctiveActions: { type: 'array' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'overdue'] },
            dueDate: { type: 'string', format: 'date-time' },
          },
        },
        // ─── EMR ───
        Prescription: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            beneficiary: { type: 'string' },
            doctor: { type: 'string' },
            medications: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  dosage: { type: 'string' },
                  frequency: { type: 'string' },
                  duration: { type: 'string' },
                },
              },
            },
            status: { type: 'string', enum: ['active', 'completed', 'cancelled'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        VitalSigns: {
          type: 'object',
          properties: {
            beneficiary: { type: 'string' },
            temperature: { type: 'number' },
            heartRate: { type: 'integer' },
            bloodPressure: { type: 'object', properties: { systolic: { type: 'integer' }, diastolic: { type: 'integer' } } },
            respiratoryRate: { type: 'integer' },
            oxygenSaturation: { type: 'integer' },
            recordedAt: { type: 'string', format: 'date-time' },
          },
        },
        // ─── BI Analytics ───
        ReportTemplate: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            fields: { type: 'array' },
            filters: { type: 'array' },
            format: { type: 'string', enum: ['pdf', 'excel', 'csv', 'json'] },
            schedule: { type: 'string' },
            recipients: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  // Include ALL route files with JSDoc comments
  apis: [
    './routes/assessment/icfRoutes.js',
    './routes/clinical.routes.js',
    './routes/ai-predictive.routes.js',
    './routes/telehealth.routes.js',
    './routes/parent-portal.routes.js',
    './routes/executive.routes.js',
    './routes/gamification.routes.js',
    './routes/whatsapp-chatbot.routes.js',
    './routes/registries/cctv.registry.js',
    './routes/compliance.routes.js',
    './routes/emr.routes.js',
    './routes/bi-analytics.routes.js',
  ],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
