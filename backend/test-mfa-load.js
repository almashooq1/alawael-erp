// Test MFA Router Loading
console.log('Testing MFA router load...\n');

try {
  console.log('Loading mfaService...');
  const mfaService = require('./services/mfaService');
  console.log('✅ MFA Service loaded');

  console.log('Loading mfaController...');
  const mfaController = require('./controllers/mfaController');
  console.log('✅ MFA Controller loaded');

  console.log('Loading mfa routes...');
  const mfaRouter = require('./routes/mfa');
  console.log('✅ MFA Router loaded');

  console.log('\n✅ All MFA components loaded successfully!');
  console.log('\nAvailable endpoints:');
  console.log('- GET /api/mfa/setup-guide');
  console.log('- POST /api/mfa/login/verify');
  console.log('- POST /api/mfa/totp/initiate (protected)');
  console.log('- POST /api/mfa/totp/verify (protected)');
  console.log('- POST /api/mfa/email/initiate (protected)');
  console.log('- POST /api/mfa/email/verify (protected)');
  console.log('- POST /api/mfa/sms/initiate (protected)');
  console.log('- POST /api/mfa/sms/verify (protected)');
  console.log('- GET /api/mfa/settings (protected)');
  console.log('- POST /api/mfa/settings/disable-method (protected)');
  console.log('- POST /api/mfa/device/trust (protected)');
  console.log('- GET /api/mfa/device/list (protected)');
  console.log('- DELETE /api/mfa/device/:deviceId (protected)');

} catch (error) {
  console.error('\n❌ Error loading MFA components:');
  console.error('Error message:', error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  process.exit(1);
}
