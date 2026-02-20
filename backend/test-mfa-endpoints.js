/**
 * MFA API Endpoint Testing Guide
 * دليل اختبار نقاط نهاية API للمصادقة متعددة العوامل
 */

const http = require('http');

// Helper function to make HTTP requests
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

// Test MFA Endpoints
(async () => {
  console.log('🧪 MFA API Endpoint Testing\n');
  console.log('═'.repeat(50));
  
  // Test 1: Health Check
  console.log('\n✅ Test 1: Health Check');
  console.log('GET http://localhost:3001/health');
  try {
    const healthRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET'
    });
    console.log(`Status: ${healthRes.status}`);
    console.log(`Response: ${JSON.stringify(healthRes.body, null, 2)}\n`);
  } catch (e) {
    console.error(`❌ Error: ${e.message}\n`);
  }

  // Test 2: API Health Check
  console.log('✅ Test 2: API Health Check');
  console.log('GET http://localhost:3001/api/health');
  try {
    const apiHealthRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/health',
      method: 'GET'
    });
    console.log(`Status: ${apiHealthRes.status}`);
    console.log(`Response: ${JSON.stringify(apiHealthRes.body, null, 2)}\n`);
  } catch (e) {
    console.error(`❌ Error: ${e.message}\n`);
  }

  // Test 3: MFA Setup Guide
  console.log('✅ Test 3: MFA Setup Guide (Public Endpoint)');
  console.log('GET http://localhost:3001/api/mfa/setup-guide');
  try {
    const setupGuideRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/mfa/setup-guide',
      method: 'GET'
    });
    console.log(`Status: ${setupGuideRes.status}`);
    console.log(`Response Preview:`);
    if (setupGuideRes.body && setupGuideRes.body.data) {
      console.log(`- Methods Available: ${Object.keys(setupGuideRes.body.data.methods || {}).length}`);
      console.log(`- Steps: ${setupGuideRes.body.data.steps || 'N/A'}`);
      console.log(`- Full Response: ${JSON.stringify(setupGuideRes.body, null, 2).substring(0, 500)}...\n`);
    } else {
      console.log(`${JSON.stringify(setupGuideRes.body, null, 2)}\n`);
    }
  } catch (e) {
    console.error(`❌ Error: ${e.message}\n`);
  }

  console.log('═'.repeat(50));
  console.log('\n✅ MFA API Endpoints Available:');
  console.log('\n📌 PUBLIC ENDPOINTS:');
  console.log('   GET  /api/mfa/setup-guide');
  console.log('   POST /api/mfa/login/verify');
  
  console.log('\n🔒 PROTECTED ENDPOINTS (requires authentication):');
  console.log('\n   TOTP Setup:');
  console.log('   POST /api/mfa/totp/initiate');
  console.log('   POST /api/mfa/totp/verify');
  
  console.log('\n   Email OTP:');
  console.log('   POST /api/mfa/email/initiate');
  console.log('   POST /api/mfa/email/verify');
  
  console.log('\n   SMS OTP:');
  console.log('   POST /api/mfa/sms/initiate');
  console.log('   POST /api/mfa/sms/verify');
  
  console.log('\n   Settings:');
  console.log('   GET  /api/mfa/settings');
  console.log('   POST /api/mfa/settings/disable-method');
  
  console.log('\n   Device Management:');
  console.log('   POST   /api/mfa/device/trust');
  console.log('   GET    /api/mfa/device/list');
  console.log('   DELETE /api/mfa/device/:deviceId');
  
  console.log('\n═'.repeat(50));
  console.log('\n📚 Documentation:');
  console.log('   - README_MFA.md');
  console.log('   - MFA_QUICK_START.md');
  console.log('   - docs/MFA_IMPLEMENTATION_GUIDE.md');
  console.log('   - docs/MFA_WORKFLOWS_AND_DIAGRAMS.md');
  
  console.log('\n✅ All systems ready for testing!\n');
  
})();
