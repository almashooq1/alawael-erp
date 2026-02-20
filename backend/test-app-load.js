const path = require('path');
process.chdir('c:\\Users\\x-be\\OneDrive\\المستندات\\04-10-2025\\66666\\erp_new_system\\backend');

console.log('Testing app.js context...');
console.log('Current dir:', process.cwd());

// Test if sso.routes can load
try {
  const router = require('./routes/sso.routes.js');
  console.log('✅ sso.routes.js loads successfully');
  console.log('Router type:', typeof router);
} catch (e) {
  console.log('❌ sso.routes.js failed to load:', e.message);
  console.log(e.stack);
}

// Now test require('./app') and check if app is valid
try {
  const app = require('./app');
  console.log('✅ app.js loads successfully');
  console.log('App type:', typeof app);
} catch (e) {
  console.log('❌ app.js failed to load:', e.message);
  console.log(e.stack);
}

// Check if ssoRouter exists in global after app requires
console.log('\nDone.');
