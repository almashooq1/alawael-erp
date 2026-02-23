/**
 * Phase 4 Database Seeder - Test Data Generation
 * Purpose: Populate MongoDB with comprehensive test data for Phase 4 validation
 * Usage: node backend/db/seeders/seed-phase4-testdata.js
 *
 * This script seeds:
 * - 5 test users (various roles)
 * - 10 test assets (vehicles, equipment)
 * - 3 disability programs
 * - 10 schedules for programs
 * - 5 assessment records
 * - Sample analytics data
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Import all models
const {
  User,
  Asset,
  DisabilityProgram,
  DisabilitySession,
  Goal,
  Assessment,
  Schedule,
  Analytics,
  Report,
  Maintenance,
  MaintenancePrediction,
  Employee,
  Beneficiary,
  Document,
  Vehicle,
} = require('../../models');

// Connect to database
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// Seed data templates
const seedUsers = async () => {
  console.log('\n📝 Seeding Users...');
  const users = [
    {
      email: 'admin@test.com',
      password: 'hashedPassword123',
      fullName: 'Admin User',
      role: 'admin',
    },
    {
      email: 'doctor@test.com',
      password: 'hashedPassword123',
      fullName: 'Dr. Ahmed Hassan',
      role: 'doctor',
    },
    {
      email: 'therapist@test.com',
      password: 'hashedPassword123',
      fullName: 'Fatima Mohamed',
      role: 'therapist',
    },
    {
      email: 'beneficiary@test.com',
      password: 'hashedPassword123',
      fullName: 'Samir Ali',
      role: 'user',
    },
    {
      email: 'manager@test.com',
      password: 'hashedPassword123',
      fullName: 'Noor Ibrahim',
      role: 'manager',
    },
  ];

  try {
    const createdUsers = await User.insertMany(users, { ordered: false });
    console.log(`✅ Created ${createdUsers.length} test users`);
    return createdUsers;
  } catch (error) {
    console.warn(`⚠️ User seeding partial (may have duplicates): ${error.message}`);
    return [];
  }
};

const seedAssets = async () => {
  console.log('\n📝 Seeding Assets...');
  const assets = [
    {
      name: 'Ambulance Unit A',
      type: 'vehicle',
      status: 'active',
      location: 'Main Hospital',
      purchaseDate: new Date('2023-01-15'),
      serialNumber: 'AMB-2023-001',
      maintenanceSchedule: 'monthly',
      lastMaintenanceDate: new Date('2025-02-01'),
    },
    {
      name: 'Wheelchair Ramp - Building A',
      type: 'equipment',
      status: 'active',
      location: 'Rehabilitation Center',
      purchaseDate: new Date('2022-06-20'),
      serialNumber: 'RAMP-2022-001',
      maintenanceSchedule: 'quarterly',
      lastMaintenanceDate: new Date('2025-01-15'),
    },
    {
      name: 'Physical Therapy Mat',
      type: 'medical',
      status: 'active',
      location: 'Therapy Room 1',
      purchaseDate: new Date('2023-08-10'),
      serialNumber: 'PTM-2023-001',
      maintenanceSchedule: 'semi-annual',
      lastMaintenanceDate: new Date('2024-08-10'),
    },
    {
      name: 'Gait Training Walker',
      type: 'medical',
      status: 'active',
      location: 'Therapy Room 2',
      purchaseDate: new Date('2024-01-05'),
      serialNumber: 'GTW-2024-001',
      maintenanceSchedule: 'annual',
      lastMaintenanceDate: new Date('2024-01-05'),
    },
    {
      name: 'Wheelchair Accessible Van',
      type: 'vehicle',
      status: 'active',
      location: 'Transportation Depot',
      purchaseDate: new Date('2023-03-12'),
      serialNumber: 'VAN-2023-001',
      maintenanceSchedule: 'monthly',
      lastMaintenanceDate: new Date('2025-01-30'),
    },
    {
      name: 'Hydrotherapy Pool Equipment',
      type: 'medical',
      status: 'active',
      location: 'Hydrotherapy Center',
      purchaseDate: new Date('2022-11-20'),
      serialNumber: 'HTE-2022-001',
      maintenanceSchedule: 'monthly',
      lastMaintenanceDate: new Date('2025-02-05'),
    },
    {
      name: 'Assistive Technology Computer',
      type: 'equipment',
      status: 'active',
      location: 'Tech Lab',
      purchaseDate: new Date('2024-06-15'),
      serialNumber: 'ATC-2024-001',
      maintenanceSchedule: 'semi-annual',
      lastMaintenanceDate: new Date('2025-01-20'),
    },
    {
      name: 'Prosthetics Fabrication Machine',
      type: 'medical',
      status: 'active',
      location: 'Prosthetics Lab',
      purchaseDate: new Date('2023-09-01'),
      serialNumber: 'PFM-2023-001',
      maintenanceSchedule: 'quarterly',
      lastMaintenanceDate: new Date('2024-11-01'),
    },
    {
      name: 'Accessible Parking Equipment',
      type: 'equipment',
      status: 'active',
      location: 'Parking Area',
      purchaseDate: new Date('2023-02-14'),
      serialNumber: 'APE-2023-001',
      maintenanceSchedule: 'semi-annual',
      lastMaintenanceDate: new Date('2024-08-14'),
    },
    {
      name: 'Emergency Response Stretcher',
      type: 'medical',
      status: 'active',
      location: 'Emergency Department',
      purchaseDate: new Date('2024-04-22'),
      serialNumber: 'ERS-2024-001',
      maintenanceSchedule: 'monthly',
      lastMaintenanceDate: new Date('2025-01-22'),
    },
  ];

  try {
    const createdAssets = await Asset.insertMany(assets, { ordered: false });
    console.log(`✅ Created ${createdAssets.length} test assets`);
    return createdAssets;
  } catch (error) {
    console.warn(`⚠️ Asset seeding partial: ${error.message}`);
    return [];
  }
};

const seedDisabilityPrograms = async () => {
  console.log('\n📝 Seeding Disability Programs...');
  const programs = [
    {
      name: 'Mobility Rehabilitation Program',
      description: 'Comprehensive program for mobility-impaired individuals',
      status: 'active',
      targetBeneficiaries: 50,
      currentBeneficiaries: 12,
      startDate: new Date('2024-01-01'),
      duration: 12, // months
      therapistRequired: 'Physical Therapist',
      goals: [
        'Improve walking ability',
        'Increase independence',
        'Strengthen leg muscles',
      ],
    },
    {
      name: 'Speech & Hearing Rehabilitation',
      description: 'Speech and hearing therapy for communication disorders',
      status: 'active',
      targetBeneficiaries: 30,
      currentBeneficiaries: 8,
      startDate: new Date('2024-02-15'),
      duration: 8,
      therapistRequired: 'Speech Therapist',
      goals: [
        'Improve speech clarity',
        'Enhance hearing comprehension',
        'Social communication skills',
      ],
    },
    {
      name: 'Cognitive & Mental Health Program',
      description: 'Mental health and cognitive rehabilitation services',
      status: 'active',
      targetBeneficiaries: 40,
      currentBeneficiaries: 15,
      startDate: new Date('2023-11-01'),
      duration: 6,
      therapistRequired: 'Psychologist/Counselor',
      goals: [
        'Mental health improvement',
        'Cognitive skill development',
        'Stress management',
      ],
    },
  ];

  try {
    const createdPrograms = await DisabilityProgram.insertMany(programs, {
      ordered: false,
    });
    console.log(`✅ Created ${createdPrograms.length} disability programs`);
    return createdPrograms;
  } catch (error) {
    console.warn(`⚠️ Program seeding partial: ${error.message}`);
    return [];
  }
};

const seedSchedules = async (programs) => {
  console.log('\n📝 Seeding Schedules...');
  const schedules = [];

  // Create 3-4 schedules per program
  for (let i = 0; i < programs.length; i++) {
    const program = programs[i];
    for (let j = 1; j <= 4; j++) {
      const dayOfWeek = (i * 2 + j) % 7; // Distribute across week
      schedules.push({
        program: program._id,
        eventName: `${program.name} - Session ${j}`,
        description: `Weekly session for ${program.name}`,
        startTime: new Date(2025, 1, 10 + j, 9 + j, 0),
        endTime: new Date(2025, 1, 10 + j, 10 + j, 0),
        location: 'Therapy Room 1',
        instructor: `Therapist ${j}`,
        capacity: 8,
        attendees: Math.floor(Math.random() * 8),
        status: 'scheduled',
        recurrence: 'weekly',
      });
    }
  }

  try {
    const createdSchedules = await Schedule.insertMany(schedules, {
      ordered: false,
    });
    console.log(`✅ Created ${createdSchedules.length} schedules`);
    return createdSchedules;
  } catch (error) {
    console.warn(`⚠️ Schedule seeding partial: ${error.message}`);
    return [];
  }
};

const seedAssessments = async (programs) => {
  console.log('\n📝 Seeding Assessments...');
  const assessments = [];

  // Create 2-3 assessments per program
  for (let i = 0; i < programs.length; i++) {
    const program = programs[i];
    for (let j = 1; j <= 3; j++) {
      assessments.push({
        program: program._id,
        assessmentType: `Assessment Type ${j}`,
        assessmentDate: new Date(2025, 0, 15 + j * 7),
        assessor: `Therapist ${j}`,
        status: 'completed',
        score: Math.floor(Math.random() * 100) + 1,
        maxScore: 100,
        findings: `Assessment findings for ${program.name}`,
        recommendations: ['Recommendation 1', 'Recommendation 2'],
      });
    }
  }

  try {
    const createdAssessments = await Assessment.insertMany(assessments, {
      ordered: false,
    });
    console.log(`✅ Created ${createdAssessments.length} assessments`);
    return createdAssessments;
  } catch (error) {
    console.warn(`⚠️ Assessment seeding partial: ${error.message}`);
    return [];
  }
};

const seedAnalytics = async (programs) => {
  console.log('\n📝 Seeding Analytics Data...');
  const analytics = [];

  // Create monthly analytics for each program
  for (let i = 0; i < programs.length; i++) {
    const program = programs[i];
    for (let month = 1; month <= 3; month++) {
      analytics.push({
        program: program._id,
        month: month,
        year: 2025,
        totalSessions: Math.floor(Math.random() * 10) + 5,
        completedSessions: Math.floor(Math.random() * 8) + 3,
        attendanceRate: parseFloat((Math.random() * 40 + 60).toFixed(2)),
        satisfactionScore: parseFloat((Math.random() * 2 + 3.5).toFixed(2)),
        improvementRate: parseFloat((Math.random() * 30 + 20).toFixed(2)),
        status: 'active',
      });
    }
  }

  try {
    const createdAnalytics = await Analytics.insertMany(analytics, {
      ordered: false,
    });
    console.log(`✅ Created ${createdAnalytics.length} analytics records`);
    return createdAnalytics;
  } catch (error) {
    console.warn(`⚠️ Analytics seeding partial: ${error.message}`);
    return [];
  }
};

const seedMaintenanceRecords = async (assets) => {
  console.log('\n📝 Seeding Maintenance Records...');
  const maintenance = [];

  // Create 1-2 maintenance records per asset
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    for (let j = 1; j <= 2; j++) {
      maintenance.push({
        asset: asset._id,
        maintenanceType: j === 1 ? 'preventive' : 'corrective',
        description: `${j === 1 ? 'Preventive' : 'Corrective'} maintenance for ${asset.name}`,
        startDate: new Date(2025, 0, 1 + j * 10),
        endDate: new Date(2025, 0, 2 + j * 10),
        cost: Math.floor(Math.random() * 5000) + 500,
        technician: `Technician ${j}`,
        status: 'completed',
        notes: `Maintenance performed successfully`,
      });
    }
  }

  try {
    const createdMaintenance = await Maintenance.insertMany(maintenance, {
      ordered: false,
    });
    console.log(`✅ Created ${createdMaintenance.length} maintenance records`);
    return createdMaintenance;
  } catch (error) {
    console.warn(`⚠️ Maintenance seeding partial: ${error.message}`);
    return [];
  }
};

const seedMaintenancePredictions = async (assets) => {
  console.log('\n📝 Seeding Maintenance Predictions...');
  const predictions = [];

  // Create 1-2 predictions per asset
  for (let i = 0; i < Math.min(assets.length, 5); i++) {
    const asset = assets[i];
    for (let j = 1; j <= 2; j++) {
      predictions.push({
        asset: asset._id,
        predictedFailureDate: new Date(2025, 2 + j, 15),
        riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        predictedCost: Math.floor(Math.random() * 10000) + 1000,
        confidence: parseFloat((Math.random() * 40 + 60).toFixed(2)),
        recommendedAction: `Schedule maintenance by ${new Date(2025, 2 + j, 15).toDateString()}`,
        status: 'active',
      });
    }
  }

  try {
    const createdPredictions = await MaintenancePrediction.insertMany(
      predictions,
      { ordered: false }
    );
    console.log(
      `✅ Created ${createdPredictions.length} maintenance predictions`
    );
    return createdPredictions;
  } catch (error) {
    console.warn(`⚠️ Prediction seeding partial: ${error.message}`);
    return [];
  }
};

// Main seeding function
const seedDatabase = async () => {
  try {
    console.log('\n🌱 === PHASE 4 DATABASE SEEDING STARTED ===\n');
    console.log(`📦 Environment: ${process.env.NODE_ENV}`);
    console.log(`🗄️  Database: ${process.env.MONGODB_URI}`);

    await connectDB();

    // Clear existing data (optional - comment out to preserve data)
    console.log('\n🧹 Clearing existing Phase 4 test data...');
    await Promise.all([
      User.deleteMany({}),
      Asset.deleteMany({}),
      DisabilityProgram.deleteMany({}),
      Schedule.deleteMany({}),
      Assessment.deleteMany({}),
      Analytics.deleteMany({}),
      Maintenance.deleteMany({}),
      MaintenancePrediction.deleteMany({}),
    ]).catch((err) => console.warn('⚠️ Clear warning:', err.message));

    // Execute seeding in sequence
    const users = await seedUsers();
    const assets = await seedAssets();
    const programs = await seedDisabilityPrograms();
    const schedules = await seedSchedules(programs);
    const assessments = await seedAssessments(programs);
    const analytics = await seedAnalytics(programs);
    const maintenance = await seedMaintenanceRecords(assets);
    const predictions = await seedMaintenancePredictions(assets);

    // Calculate totals
    const totalRecords =
      users.length +
      assets.length +
      programs.length +
      schedules.length +
      assessments.length +
      analytics.length +
      maintenance.length +
      predictions.length;

    console.log('\n✅ === PHASE 4 DATABASE SEEDING COMPLETE ===\n');
    console.log('📊 Seeded Records Summary:');
    console.log(`  👥 Users: ${users.length}`);
    console.log(`  🏢 Assets: ${assets.length}`);
    console.log(`  📋 Programs: ${programs.length}`);
    console.log(`  📅 Schedules: ${schedules.length}`);
    console.log(`  📝 Assessments: ${assessments.length}`);
    console.log(`  📊 Analytics: ${analytics.length}`);
    console.log(`  🔧 Maintenance: ${maintenance.length}`);
    console.log(`  🔮 Predictions: ${predictions.length}`);
    console.log(`\n  📈 TOTAL RECORDS CREATED: ${totalRecords}\n`);

    console.log('Next Steps:');
    console.log('  1. Start MongoDB: mongod --dbpath ./data');
    console.log('  2. Run health checks: curl http://localhost:3000/api/v1/health/db');
    console.log('  3. Start server: npm start');
    console.log('  4. Verify data: npm test\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ SEEDING ERROR:', error);
    process.exit(1);
  }
};

// Run seeding
seedDatabase();
