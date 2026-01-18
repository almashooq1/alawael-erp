const axios = require('axios');

async function verifyCRM() {
    console.log('---------------------------------------------------');
    console.log('❤️ PHASE 115 VERIFICATION: Smart CRM Unit');
    console.log('---------------------------------------------------');

    const baseUrl = 'http://127.0.0.1:3001/api/crm-smart';

    try {
        // 1. List Patients
        console.log('1. Fetching Patient Directory...');
        const pRes = await axios.get(`${baseUrl}/patients`);
        const patients = pRes.data.data;
        console.log(`✅ Loaded ${patients.length} patients.`);
        
        const vipPatient = patients.find(p => p.segment === 'VIP');
        if(!vipPatient) throw new Error('No VIP patient found for testing');

        // 2. Run Campaign
        console.log('2. Running VIP Campaign...');
        const cRes = await axios.get(`${baseUrl}/campaigns`);
        const vipCampaign = cRes.data.data.find(c => c.targetSegment === 'VIP');
        
        const runRes = await axios.post(`${baseUrl}/campaigns/${vipCampaign.id}/run`);
        const result = runRes.data.data;
        console.log(`✅ Campaign Sent to ${result.targets} recipients.`);
        
        if(result.targets < 1) throw new Error('Campaign should have targeted at least 1 VIP');

        // 3. Update Engagement
        console.log('3. Simulating Patient Engagement...');
        const updateRes = await axios.post(`${baseUrl}/engagement`, {
            patientId: vipPatient.id,
            points: 50,
            activity: 'App Login'
        });
        
        const updatedPatient = updateRes.data.data;
        console.log(`✅ Score Updated: ${vipPatient.engagementScore} -> ${updatedPatient.engagementScore}`);
        
        if(updatedPatient.engagementScore !== vipPatient.engagementScore + 50) {
            throw new Error('Score calculation incorrect');
        }

        console.log('\n✅ PHASE 115 VERIFICATION SUCCESSFUL');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ VERIFICATION FAILED:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

verifyCRM();