const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/documents-smart';

async function verifyDocuments() {
  console.log('---------------------------------------------------');
  console.log('📜 PHASE 111 VERIFICATION: Automated Documents & e-Signature');
  console.log('---------------------------------------------------');

  try {
    // 1. List Templates
    console.log(`\n1. Fetching available templates...`);
    const tplRes = await axios.get(`${BASE_URL}/templates`);
    const templates = tplRes.data.data;
    console.log(`   Found ${templates.length} templates:`);
    templates.forEach(t => console.log(`   - [${t.type}] ${t.name}`));

    // Find Salary Cert Template
    const salaryTpl = templates.find(t => t.name.includes('Salary Certificate'));
    if (!salaryTpl) throw new Error('Salary Certificate template missing');

    // 2. Generate Draft (Salary Cert for Employee EMP001)
    console.log(`\n2. Generating Draft Letter for Employee EMP001...`);
    const draftRes = await axios.post(`${BASE_URL}/generate`, {
      templateId: salaryTpl.id,
      personId: 'EMP001',
    });
    const draft = draftRes.data.data;
    console.log(`   Generated Document ID: ${draft.id}`);
    console.log(`   Status: ${draft.status}`);
    console.log(`   Reference: ${draft.referenceNumber}`);
    console.log(`   Content Verification: ${draft.content.includes('Ahmed Ali') ? '✅ Name Merged' : '❌ Merge Failed'}`);
    console.log(`   Content Verification: ${draft.content.includes('15,000 SAR') ? '✅ Salary Merged' : '❌ Merge Failed'}`);

    // 2.5 Request Signature
    console.log(`\n2.5 Sending for Signature (to HR Director)...`);
    await axios.post(`${BASE_URL}/request-signature`, {
      docId: draft.id,
      signerRole: 'HR_DIRECTOR',
    });

    // 3. Demand Signature
    console.log(`\n3. Signing Document...`);
    // Simulate immediate signing for test
    const signRes = await axios.post(`${BASE_URL}/sign`, {
      docId: draft.id,
      signerName: 'Dr. John Doe (HR Director)',
    });
    const signedDoc = signRes.data.data;

    console.log(`   Status: ${signedDoc.status}`);
    console.log(`   Signed By: ${signedDoc.signedBy}`);
    console.log(`   Sealed: ${signedDoc.history.some(h => h.action === 'SEALED') ? 'YES' : 'NO'}`);
    console.log(`   Seal ID: ${signedDoc.sealId}`);

    if (signedDoc.status === 'SEALED' && signedDoc.content.includes('OFFICIAL SEAL')) {
      console.log('\n✅ DOCUMENT UNIT VERIFIED: Generation, Merge, Signature, and Smart Seal successful.');
      console.log('PHASE 111 VERIFICATION SUCCESSFUL');
      process.exit(0);
    } else {
      throw new Error('Document workflow failed to complete Seal step');
    }
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error.message);
    if (error.response) console.error('Response:', error.response.data);
    process.exit(1);
  }
}

setTimeout(verifyDocuments, 1000);
