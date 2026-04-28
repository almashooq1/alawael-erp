/**
 * Mock Vehicle Seeder
 *
 * Seeds demo vehicle data into the in-memory database.
 * Extracted from server.js for maintainability.
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

const DEMO_OWNER_ID = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');

const DEMO_VEHICLES = [
  {
    registrationNumber: 'VRN-TEST-001',
    plateNumber: 'ABC-1001',
    vin: 'VINTEST001A',
    engineNumber: 'ENGTEST001',
    owner: DEMO_OWNER_ID,
    ownerName: 'Demo Fleet',
    basicInfo: {
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      type: 'sedan',
      fuelType: 'gasoline',
      color: 'white',
    },
    registration: {
      registrationDate: new Date('2024-01-01'),
      expiryDate: new Date('2026-01-01'),
      category: 'private',
      status: 'active',
    },
    performance: { odometer: 42000 },
  },
  {
    registrationNumber: 'VRN-TEST-002',
    plateNumber: 'DEF-2002',
    vin: 'VINTEST002B',
    engineNumber: 'ENGTEST002',
    owner: DEMO_OWNER_ID,
    ownerName: 'Demo Fleet',
    basicInfo: {
      make: 'Ford',
      model: 'Transit',
      year: 2021,
      type: 'van',
      fuelType: 'diesel',
      color: 'silver',
    },
    registration: {
      registrationDate: new Date('2024-03-01'),
      expiryDate: new Date('2026-03-01'),
      category: 'commercial',
      status: 'active',
    },
    performance: { odometer: 88000 },
  },
  {
    registrationNumber: 'VRN-TEST-003',
    plateNumber: 'GHI-3003',
    vin: 'VINTEST003C',
    engineNumber: 'ENGTEST003',
    owner: DEMO_OWNER_ID,
    ownerName: 'Demo Fleet',
    basicInfo: {
      make: 'Hyundai',
      model: 'H350',
      year: 2020,
      type: 'bus',
      fuelType: 'diesel',
      color: 'blue',
    },
    registration: {
      registrationDate: new Date('2023-12-15'),
      expiryDate: new Date('2025-12-15'),
      category: 'public',
      status: 'active',
    },
    performance: { odometer: 132000 },
  },
];

/**
 * Seed mock vehicles if fewer than 3 exist.
 *
 * Inserts go through the raw MongoDB driver collection rather than the
 * `Vehicle` Mongoose model: the demo fixture above pre-dates the current
 * `models/transport/Vehicle.js` schema (snake_case fields, branch_id
 * required, different vehicle_type enum), so passing it through Mongoose
 * validation would fail. The DEMO_VEHICLES rows are intentionally just
 * enough for the in-memory dev mode to render a populated fleet UI.
 */
async function seedMockVehicles() {
  try {
    if (!mongoose.connection || !mongoose.connection.db) return;

    const collection = mongoose.connection.db.collection('vehicles');
    const existing = await collection.countDocuments();
    if (existing >= 3) return;

    await collection.insertMany(
      DEMO_VEHICLES.map(v => ({ ...v, _id: new mongoose.Types.ObjectId() }))
    );
    logger.info('Seeded mock vehicles (raw insert into `vehicles` collection)');
  } catch (err) {
    logger.info('Mock vehicle seeding skipped:', err.message);
  }
}

module.exports = { seedMockVehicles };
