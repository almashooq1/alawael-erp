const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'شامل CRM & ERP API',
      version: '2.0.0',
      description: 'توثيق شامل لـ API الخاص بنظام إدارة العلاقات والموارد البشرية والتعليم الإلكتروني',
      contact: {
        name: 'Dev Team',
        url: 'https://example.com',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development Server',
      },
      {
        url: 'http://localhost:3000',
        description: 'Frontend Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using Bearer scheme',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string' },
            fullName: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'manager', 'employee', 'user'] },
            department: { type: 'string' },
            phone: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Employee: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            fullName: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            department: { type: 'string' },
            position: { type: 'string' },
            hireDate: { type: 'string', format: 'date' },
            salary: { type: 'number' },
            status: { type: 'string', enum: ['active', 'inactive', 'on-leave'] },
          },
        },
        Course: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            instructor: { type: 'string' },
            duration: { type: 'number' },
            level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
            enrolledCount: { type: 'number' },
            rating: { type: 'number' },
          },
        },
        Customer: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            company: { type: 'string' },
            address: { type: 'string' },
            status: { type: 'string', enum: ['active', 'inactive', 'prospect'] },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            error: { type: 'string' },
          },
        },
      },
    },
  },
  apis: [
    './routes/authRoutes.js',
    './routes/userRoutes.js',
    './routes/hrRoutes.js',
    './routes/crmRoutes.js',
    './routes/elearningRoutes.js',
    './routes/emailRoutes.js',
    './routes/smsRoutes.js',
    './routes/documentRoutes.js',
    './routes/analyticsRoutes.js',
    './routes/reportRoutes.js',
    './routes/invoiceRoutes.js',
    './routes/purchaseOrderRoutes.js',
    './routes/inventoryRoutes.js',
    './routes/appointmentRoutes.js',
    './routes/approvalRoutes.js',
    './routes/admin/dashboardRoutes.js',
    './routes/admin/auditRoutes.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
