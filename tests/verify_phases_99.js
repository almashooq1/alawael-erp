const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function verifyRobotics() {
  console.log('\n--- Verifying Phase 99: Smart Robotics & Tele-Health ---');
  try {
    // 1. Register a Device
    console.log('1. Registering Robotic Device...');
    const devId = 'exo_leg_01';
    const regRes = await axios.post(`${BASE_URL}/robotics-smart/register`, {
      deviceId: devId,
      type: 'EXOSKELETON_LEG',
      specs: { maxForce: 50, degreesOfFreedom: 4 },
    });
    if (regRes.data.success) console.log('   ✓ Device Registered');

    // 2. Start Tele-Session via Global Expert Service
    console.log('2. Initiating Global Expert Tele-Session...');
    const initRes = await axios.post(`${BASE_URL}/global-expert-smart/tele-robotics/init`, {
      expertId: 'dr_chen_boston',
      deviceId: devId,
      patientId: 'patient_99',
    });

    if (initRes.data.success && initRes.data.startLink.linkStatus === 'ESTABLISHED') {
      const sid = initRes.data.startLink.controlChannel.split('/').pop();
      console.log(`   ✓ Session Established (ID: ${sid})`);

      // 3. Send Control Command (Remote)
      console.log('3. Sending Safe Control Command...');
      const cmdRes = await axios.post(`${BASE_URL}/robotics-smart/command`, {
        deviceId: devId,
        command: { torque: 10, velocity: 5, targetPosition: 45 },
      });
      if (cmdRes.data.executed) console.log('   ✓ Command Executed: Torque Applied');

      // 4. Send Unsafe Command (Safety Check)
      console.log('4. Sending Unsafe Command (Force Limit)...');
      const unsafeRes = await axios.post(`${BASE_URL}/robotics-smart/command`, {
        deviceId: devId,
        command: { torque: 100, velocity: 5 }, // Max is 50
      });

      if (!unsafeRes.data.executed && unsafeRes.data.error === 'SAFETY_VIOLATION') {
        console.log('   ✓ Safety Intercepted: ', unsafeRes.data.reason);
      } else {
        throw new Error('Safety check failed');
      }
    } else {
      throw new Error('Session Init Failed');
    }
  } catch (error) {
    console.error('❌ Phase 99 Failed:', error);
    process.exit(1);
  }
}

async function run() {
  await verifyRobotics();
  console.log('\n✅ PHASE 99 VERIFICATION SUCCESSFUL\n');
}

run();
