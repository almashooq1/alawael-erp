/**
 * Debug Test - Verify Routes are Registered
 */

process.env.SMART_TEST_MODE = 'true';
process.env.USE_MOCK_DB = 'true';
process.env.CSRF_PROTECTION_ENABLED = 'false';
process.env.DISABLE_REDIS = 'true';
process.env.NODE_ENV = 'test';

describe('Disability Routes Registration Debug', () => {
  it('should load routes module directly', () => {
    const router = require('../routes/disability-rehabilitation.routes');
    expect(router).toBeDefined();
    expect(typeof router).toBe('function');
    expect(router.stack).toBeDefined();
    expect(router.stack.length).toBeGreaterThan(0);

    // Find POST /programs route
    const postProgramsRoute = router.stack.find(
      layer => layer.route && layer.route.path === '/programs' && layer.route.methods.post
    );

    console.log('[DEBUG] Router stack length:', router.stack.length);
    console.log('[DEBUG] POST /programs exists:', !!postProgramsRoute);

    expect(postProgramsRoute).toBeDefined();
  });

  it('should verify app has disability routes mounted', () => {
    const app = require('../server');

    // Find disability router in app stack
    const disabilityRouters = app._router.stack.filter(
      layer => layer.regexp && layer.regexp.toString().includes('disability')
    );

    console.log('[DEBUG] Disability routers in app:', disabilityRouters.length);

    expect(disabilityRouters.length).toBeGreaterThanOrEqual(1);
  });
});
