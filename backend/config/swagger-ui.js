/**
 * Swagger UI Setup
 * Mount Swagger documentation on the Express server
 */

const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./swagger');

const setupSwaggerUI = app => {
  app.use('/api/docs', swaggerUi.serve);
  app.get(
    '/api/docs',
    swaggerUi.setup(swaggerSpecs, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        defaultModelsExpandDepth: 1,
        syntaxHighlight: 'monokai',
      },
      customCss: `
      .topbar { background-color: #4CAF50; }
      .information-container { border-color: #4CAF50; }
      .auth-wrapper { border-color: #4CAF50; }
      .models-container { border-color: #4CAF50; }
    `,
      customSiteTitle: 'نظام تأهيل ذوي الإعاقة - API Documentation',
    })
  );

  app.get('/api/docs/spec', (req, res) => {
    res.json(swaggerSpecs);
  });

  console.log('✅ Swagger UI متاح على: http://localhost:3001/api/docs');
};

module.exports = setupSwaggerUI;
