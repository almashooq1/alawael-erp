const axios = require('axios');

async function verifyTransport() {
  console.log('---------------------------------------------------');
  console.log('🚑 PHASE 114 VERIFICATION: Smart Transport Unit');
  console.log('---------------------------------------------------');

  const baseUrl = 'http://127.0.0.1:3001/api/transport-smart';

  try {
    // 1. Check Fleet
    console.log('1. Checking Fleet Status...');
    const vRes = await axios.get(`${baseUrl}/vehicles`);
    const fleet = vRes.data.data;
    console.log(`✅ Fleet Online: ${fleet.length} vehicles found.`);

    const availableCount = fleet.filter(v => v.status === 'AVAILABLE').length;
    if (availableCount === 0) throw new Error('No available vehicles to test with!');

    // 2. Request Trip
    console.log('2. Requesting Patient Transport...');
    const tripRes = await axios.post(`${baseUrl}/trips/request`, {
      patientId: 'TEST-PATIENT',
      pickup: 'Home',
      dropoff: 'ER',
      priority: 'EMERGENCY',
    });

    const trip = tripRes.data.data;
    console.log(`✅ Trip Created: ${trip.id} (Status: ${trip.status})`);

    if (trip.status !== 'DISPATCHED') throw new Error('Trip was not dispatched immediately');
    if (!trip.vehicleId) throw new Error('No vehicle assigned to trip');

    // 3. Verify Vehicle Busy
    console.log('3. Verifying Vehicle Status Change...');
    const vRes2 = await axios.get(`${baseUrl}/vehicles`);
    const assignedVehicle = vRes2.data.data.find(v => v.id === trip.vehicleId);
    if (assignedVehicle.status !== 'BUSY') throw new Error('Vehicle should be BUSY but is ' + assignedVehicle.status);
    console.log(`✅ Vehicle ${assignedVehicle.id} is marked BUSY.`);

    // 4. Complete Trip
    console.log('4. Completing Trip...');
    await axios.post(`${baseUrl}/trips/${trip.id}/status`, { status: 'COMPLETED' });

    // 5. Verify Vehicle Available
    const vRes3 = await axios.get(`${baseUrl}/vehicles`);
    const vehicleFreed = vRes3.data.data.find(v => v.id === trip.vehicleId);
    if (vehicleFreed.status !== 'AVAILABLE') throw new Error('Vehicle should be AVAILABLE after trip completion');
    console.log(`✅ Vehicle ${vehicleFreed.id} returned to pool.`);

    console.log('\n✅ PHASE 114 VERIFICATION SUCCESSFUL');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error.response ? error.response.data : error.message);
    process.exit(1);
  }
}

verifyTransport();
