const axios = require('axios');

async function verifyPublicPortal() {
  console.log('---------------------------------------------------');
  console.log('🌍 PHASE 113 VERIFICATION: Public Document Verification');
  console.log('---------------------------------------------------');

  const baseUrl = 'http://localhost:3001/api/documents-smart';
  let docRef = '';

  try {
    // 1. Setup: Create a Sealed Document
    console.log('1. Setting up a sealed document...');

    // Get Template
    const tmplRes = await axios.get(`${baseUrl}/templates`);
    const templateId = tmplRes.data.data[0].id;

    // Generate
    const genRes = await axios.post(`${baseUrl}/generate`, { templateId, personId: 'EMP001' });
    const docId = genRes.data.data.id;

    // Request Signature (New Step from Phase 111 Fix)
    await axios.post(`${baseUrl}/request-signature`, { docId, signerRole: 'HR_MANAGER' });

    // Sign
    const signRes = await axios.post(`${baseUrl}/sign`, { docId, signerName: 'Dr. Verify' });

    // Check if Sealed (Sign triggers Seal automatically in current logic)
    const doc = signRes.data.data;
    if (doc.status !== 'SEALED') throw new Error('Document verification setup failed: Not SEALED');

    docRef = doc.referenceNumber;
    console.log(`✅ Document Sealed. Ref: ${docRef}`);

    // 2. Verify Valid Document
    console.log('2. Testing Verification API with VALID ref...');
    const verifyRes = await axios.get(`${baseUrl}/verify/${docRef}`);
    if (verifyRes.data.success && verifyRes.data.valid) {
      console.log('✅ Correctly verified valid document.');
    } else {
      throw new Error('Valid document failed verification');
    }

    // 3. Verify Invalid Document
    console.log('3. Testing Verification API with INVALID ref...');
    const invalidRes = await axios.get(`${baseUrl}/verify/INVALID-REF-12345`);
    if (invalidRes.data.valid === false) {
      console.log('✅ Correctly rejected invalid document.');
    } else {
      throw new Error('Invalid document was accepted!');
    }

    console.log('\n✅ PHASE 113 VERIFICATION SUCCESSFUL');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error.response ? JSON.stringify(error.response.data) : error.stack);
    process.exit(1);
  }
}

verifyPublicPortal();
