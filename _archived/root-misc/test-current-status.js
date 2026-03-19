// Quick Status Check - March 3, 2026
// Tests current system state

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function checkStatus() {
  const results = {
    backend: '⏳ Testing...',
    health: '⏳ Testing...',
    errors: 0,
    timestamp: new Date().toISOString(),
  };

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   ALAWAEL SYSTEM STATUS CHECK       ║');
  console.log('╚════════════════════════════════════════╝\n');

  // Test 1: Backend Availability
  try {
    const response = await axios.get(`${BASE_URL}/health`, { timeout: 3000 });
    results.backend = '✅ ONLINE';
    results.health = `✅ ${response.data.status || 'Healthy'}`;
    console.log(`Backend Status: ${results.backend}`);
    console.log(`Health Endpoint: ${results.health}`);
    if (response.data.uptime) {
      console.log(`Uptime: ${response.data.uptime.readable || 'N/A'}`);
    }
  } catch (error) {
    results.backend = '❌ OFFLINE';
    results.health = '❌ Not Responding';
    results.errors++;
    console.log(`Backend Status: ${results.backend}`);
    console.log(`Error: ${error.message}`);
    console.log('\n⚠️  Backend needs to be started first.');
    console.log('   Run: cd backend && npm start');
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`Total Errors: ${results.errors}`);
  console.log(`Timestamp: ${results.timestamp}`);
  console.log('═══════════════════════════════════════\n');

  process.exit(results.errors);
}

checkStatus().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
