/**
 * Verify MFA Routes Registration in Express App
 */

require('dotenv').config();

const app = require('./app');

console.log('🔍 Checking MFA Routes in Express App...\n');

// Get all registered routes
function getAllRoutes(stack, prefix = '') {
  const routes = [];
  
  stack.forEach(middleware => {
    if (middleware.route) {
      // Direct route
      const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase()).join(', ');
      routes.push({
        path: prefix + middleware.route.path,
        methods: methods
      });
    } else if (middleware.name === 'router' && middleware.handle.stack) {
      // Nested router
      const regexString = middleware.regexp.source.replace(/\\\\/g, '\\').replace(/\\\/\?.*\$/g, '');
      const nestedRoutes = getAllRoutes(middleware.handle.stack, prefix + regexString);
      routes.push(...nestedRoutes);
    }
  });
  
  return routes;
}

try {
  const allRoutes = getAllRoutes(app._router.stack);
  
  const mfaRoutes = allRoutes.filter(r => r.path.includes('/api/mfa'));
  
  console.log(`✅ Total routes registered: ${allRoutes.length}`);
  console.log(`✅ MFA routes found: ${mfaRoutes.length}\n`);
  
  if (mfaRoutes.length > 0) {
    console.log('📌 MFA Routes:');
    mfaRoutes.forEach(route => {
      console.log(`   ${route.methods.padEnd(10)} ${route.path}`);
    });
  } else {
    console.log('❌ No MFA routes found!');
  }
  
  console.log('\n─────────────────────────────────');
  console.log('\n📌 Debugging Info:');
  console.log(`- App is: ${app.name || 'Express'}`);
  console.log(`- Total middleware: ${app._router.stack.length}`);
  
  // Show all /api routes
  console.log('\n📌 All /api routes:');
  const apiRoutes = allRoutes.filter(r => r.path.includes('/api'));
  apiRoutes.slice(0, 20).forEach(route => {
    console.log(`   ${route.methods.padEnd(10)} ${route.path}`);
  });
  if (apiRoutes.length > 20) {
    console.log(`   ... and ${apiRoutes.length - 20} more`);
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
