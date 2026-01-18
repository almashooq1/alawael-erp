const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/holo-port-smart';
const PATIENT_ID = 'TEST_PATIENT_HOLO';
const FAMILY_ID = 'TEST_DAD_HOLO';

async function verifyHoloPort() {
  console.log('---------------------------------------------------');
  console.log('👨‍👩‍👧‍👦 PHASE 106 VERIFICATION: Smart Family Holo-Port');
  console.log('---------------------------------------------------');

  try {
    // 1. Create Room
    console.log(`\n1. Creating Family Room for [${PATIENT_ID}]...`);
    const createRes = await axios.post(`${BASE_URL}/create-room`, {
      patientId: PATIENT_ID,
      familyMemberIds: [FAMILY_ID],
    });

    const roomId = createRes.data.config.roomId;
    console.log(`   Room Created: ${roomId}`);
    console.log(`   Environment: ${createRes.data.config.environment}`);

    // 2. Family Joins
    console.log(`\n2. Family Member [${FAMILY_ID}] Joining...`);
    const joinRes = await axios.post(`${BASE_URL}/join`, {
      roomId: roomId,
      userId: FAMILY_ID,
      role: 'FAMILY',
    });
    console.log(`   Status: ${joinRes.data.result.status}`);
    console.log(`   Participants: ${joinRes.data.result.currentParticipants}`);

    // 3. Start Activity
    console.log(`\n3. Starting Shared Activity: PHOTO_ALBUM...`);
    const actRes = await axios.post(`${BASE_URL}/activity`, {
      roomId: roomId,
      type: 'PHOTO_ALBUM',
    });
    console.log(`   Event Emitted: ${actRes.data.event.payload.type}`);

    if (actRes.data.event.payload.type === 'PHOTO_ALBUM') {
      console.log('\n✅ HOLO-PORT VERIFIED: Room, Sync, and Activities functional.');
      console.log('PHASE 106 VERIFICATION SUCCESSFUL');
      process.exit(0);
    } else {
      throw new Error('Activity sync failed');
    }
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error.message);
    if (error.response) console.error('Response:', error.response.data);
    process.exit(1);
  }
}

setTimeout(verifyHoloPort, 1000);
