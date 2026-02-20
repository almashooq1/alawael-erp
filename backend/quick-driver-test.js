#!/usr/bin/env node

// Quick Driver API Test

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function test() {
  console.log('\n🧪 Quick Driver API Test\n');

  try {
    // Test health
    console.log('1. Testing health...');
    const health = await axios.get(`${BASE_URL.replace('/api', '')}/health`);
    console.log('✓ Health OK:', health.status);

    // Test drivers endpoint
    console.log('\n2. Testing /api/drivers...');
    const drivers = await axios.get(`${BASE_URL}/drivers`);
    console.log('✓ Drivers endpoint OK:', drivers.status);
    console.log('   Drivers count:', drivers.data.drivers?.length || 0);

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.statusText}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
  }
}

test();
