/**
 * تكوين المسارات - Routes Configuration
 */

const logger = require('../utils/logger');

const setupRoutes = app => {
  const routesPath = './routes';
  const loadedRoutes = [];
  const failedRoutes = [];

  // قائمة المسارات الأساسية
  const routes = [
    { path: '/api/v1/auth', file: 'auth.routes' },
    { path: '/api/v1/users', file: 'users.routes' },
    { path: '/api/v1/branches', file: 'branches.routes' },
    { path: '/api/v1/projects', file: 'projects.routes' },
    { path: '/api/v1/vehicles', file: 'vehicles.routes' },
    { path: '/api/v1/students', file: 'students.routes' },
    { path: '/api/v1/hr', file: 'hr.routes' },
    { path: '/api/v1/reports', file: 'reports.routes' },
    { path: '/api/v1/dashboard', file: 'dashboard.routes' },
    { path: '/api/v1/notifications', file: 'notifications.routes' },
    { path: '/api/v1/documents', file: 'documents.routes' },
    { path: '/api/v1/archive', file: 'archive.routes' },
    { path: '/api/v1/communication', file: 'communication.routes' },
    { path: '/api/v1/finance', file: 'finance.routes' },
    { path: '/api/v1/inventory', file: 'inventory.routes' },
    { path: '/api/v1/settings', file: 'settings.routes' },
  ];

  // تحميل المسارات
  routes.forEach(({ path, file }) => {
    try {
      const route = require(`${routesPath}/${file}`);
      app.use(path, route);
      loadedRoutes.push({ path, file, status: 'loaded' });
    } catch (error) {
      failedRoutes.push({ path, file, error: error.message });
    }
  });

  // طباعة تقرير التحميل
  if (loadedRoutes.length > 0) {
    logger.info(`Loaded ${loadedRoutes.length} routes successfully`);
  }

  if (failedRoutes.length > 0) {
    logger.warn(
      `${failedRoutes.length} routes could not be loaded:`,
      failedRoutes.map(r => r.file).join(', ')
    );
  }

  return { loadedRoutes, failedRoutes };
};

// إعداد المسارات الأساسية (الصحة والجذر)
const setupBaseRoutes = (app, checkDBHealth, checkRedisHealth) => {
  // نقطة نهاية الفحص الصحي
  app.get('/health', async (_req, res) => {
    const dbHealth = checkDBHealth();
    const redisHealth = await checkRedisHealth();

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: '2.0.0',
      services: {
        mongodb: dbHealth.status,
        redis: redisHealth.status,
      },
    };

    const statusCode = dbHealth.status === 'connected' && redisHealth.connected ? 200 : 503;
    res.status(statusCode).json(health);
  });

  // نقطة البداية
  app.get('/', (req, res) => {
    res.json({
      name: 'نظام الأصول ERP',
      version: '2.0.0',
      description: 'نظام إدارة موارد المؤسسات الشامل',
      endpoints: {
        health: '/health',
        api: '/api/v1',
      },
    });
  });

  // نقطة معلومات API
  app.get('/api', (req, res) => {
    res.json({
      name: 'Alawael ERP API',
      version: '2.0.0',
      endpoints: {
        auth: '/api/v1/auth',
        users: '/api/v1/users',
        branches: '/api/v1/branches',
        projects: '/api/v1/projects',
        vehicles: '/api/v1/vehicles',
        students: '/api/v1/students',
        hr: '/api/v1/hr',
        reports: '/api/v1/reports',
        dashboard: '/api/v1/dashboard',
        notifications: '/api/v1/notifications',
        documents: '/api/v1/documents',
        archive: '/api/v1/archive',
        communication: '/api/v1/communication',
        health: '/health',
      },
    });
  });
};

module.exports = {
  setupRoutes,
  setupBaseRoutes,
};
