// Phase 112 Verification: Check if Frontend files exist and API is responsive

const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function verifyFrontend() {
  console.log('---------------------------------------------------');
  console.log('🖥️ PHASE 112 VERIFICATION: Document Portal Frontend');
  console.log('---------------------------------------------------');

  try {
    // 1. Check Files
    const htmlPath = path.join(__dirname, '../frontend_smart/documents.html');
    const jsPath = path.join(__dirname, '../frontend_smart/documents.js');

    console.log(`Checking frontend files...`);
    if (fs.existsSync(htmlPath) && fs.existsSync(jsPath)) {
      console.log('✅ Frontend assets found.');
    } else {
      throw new Error('Frontend files missing');
    }

    // 2. Check API Health (Templates)
    console.log(`Checking API connectivity...`);
    const res = await axios.get('http://localhost:3001/api/documents-smart/templates');
    if (res.data.success) {
      console.log(`✅ API is serving templates (${res.data.data.length} found).`);
    } else {
      throw new Error('API failed to return templates');
    }

    // 3. Simulated User Flow (Integration Test)
    // We simulate what documents.js does
    console.log(`Simulating Frontend 'Create Document' click...`);
    const genRes = await axios.post('http://localhost:3001/api/documents-smart/generate', {
      templateId: res.data.data[0].id,
      personId: 'EMP002', // Testing Frontend dropdown value 'Sarah'
    });

    if (genRes.data.success && genRes.data.data.status === 'DRAFT') {
      console.log('✅ Frontend-Backend Integration verified (Draft Created).');
      console.log('PHASE 112 VERIFICATION SUCCESSFUL');
      process.exit(0);
    } else {
      throw new Error('Generation via API failed');
    }
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error.message);
    process.exit(1);
  }
}

// Wait for server to be likely up
setTimeout(verifyFrontend, 2000);
