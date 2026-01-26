// Direct test - bypass PM2
process.env.PORT = 3002; // Use different port
process.env.USE_MOCK_DB = 'true';

const app = require('./server.js');

console.log('\n🔍 App routes registered:');
console.log('Total middleware/routes:', app._router.stack.length);

// Find our test routes
const testRoutes = app._router.stack.filter(r => {
  if (r.route) {
    return r.route.path === '/test-first' || 
           r.route.path.includes('phases-29-33');
  }
  if (r.name === 'router' && r.regexp) {
    const regexpStr = r.regexp.toString();
    return regexpStr.includes('test-first') || 
           regexpStr.includes('phases-29-33');
  }
  return false;
});

console.log('\n✅ Found test routes:', testRoutes.length);
testRoutes.forEach((r, i) => {
  if (r.route) {
    console.log(`  ${i+1}. ${r.route.stack[0].method.toUpperCase()} ${r.route.path}`);
  } else {
    console.log(`  ${i+1}. Router: ${r.regexp}`);
  }
});

// Find notFoundHandler position
const notFoundIndex = app._router.stack.findIndex(r => 
  r.name === 'notFoundHandler' || r.handle.name === 'notFoundHandler'
);
console.log(`\n⚠️  notFoundHandler position: ${notFoundIndex} of ${app._router.stack.length}`);

// Check if test routes come after notFoundHandler
const testRouteIndex = app._router.stack.findIndex(r => 
  r.route && r.route.path === '/test-first'
);
console.log(`ℹ️  /test-first position: ${testRouteIndex}`);

if (testRouteIndex > notFoundIndex && notFoundIndex !== -1) {
  console.log('❌ PROBLEM: test-first comes AFTER notFoundHandler!');
} else {
  console.log('✅ Route order looks correct');
}

process.exit(0);
