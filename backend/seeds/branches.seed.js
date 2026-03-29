/**
 * Branches Seed Data - بيانات الفروع الأولية
 * 12 Branches + HQ Riyadh
 * Run: node backend/seeds/branches.seed.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const Branch = require('../models/Branch');

const BRANCHES_DATA = [
  // ─── HQ ──────────────────────────────────────────────────────────────────
  {
    code: 'HQ',
    name_ar: 'المقر الرئيسي - الرياض',
    name_en: 'Headquarters - Riyadh',
    short_name: 'HQ',
    type: 'hq',
    is_hq: true,
    status: 'active',
    location: {
      city_ar: 'الرياض',
      city_en: 'Riyadh',
      address_ar: 'طريق الملك فهد، حي العليا',
      address_en: 'King Fahd Road, Olaya District',
      coordinates: { lat: 24.7136, lng: 46.6753 },
      region: 'riyadh',
    },
    capacity: {
      total_rooms: 5,
      therapy_rooms: 0,
      consultation_rooms: 5,
      max_daily_sessions: 0,
      max_patients: 0,
    },
    staff_count: 15,
    manager_name: 'المدير التنفيذي',
    phone: '+966-11-0000000',
    email: 'hq@alawael.com',
    cost_center: 'CC-HQ-001',
    monthly_target: 0,
  },

  // ─── Riyadh Branches ──────────────────────────────────────────────────────
  {
    code: 'RY-MAIN',
    name_ar: 'فرع الرياض الرئيسي',
    name_en: 'Riyadh Main Branch',
    short_name: 'ر.رئيسي',
    type: 'main',
    status: 'active',
    location: {
      city_ar: 'الرياض',
      city_en: 'Riyadh',
      address_ar: 'حي النزهة، شارع التحلية',
      address_en: 'Al Nuzha District, Tahlia Street',
      coordinates: { lat: 24.7246, lng: 46.6953 },
      region: 'riyadh',
    },
    capacity: {
      total_rooms: 20,
      therapy_rooms: 15,
      consultation_rooms: 5,
      max_daily_sessions: 60,
      max_patients: 150,
    },
    staff_count: 28,
    manager_name: 'أ. خالد العمري',
    phone: '+966-11-1111111',
    email: 'riyadh.main@alawael.com',
    cost_center: 'CC-RY-001',
    monthly_target: 350000,
  },
  {
    code: 'RY-NORTH',
    name_ar: 'فرع الرياض الشمالي',
    name_en: 'Riyadh North Branch',
    short_name: 'ر.شمالي',
    type: 'branch',
    status: 'active',
    location: {
      city_ar: 'الرياض',
      city_en: 'Riyadh',
      address_ar: 'حي الغدير، طريق الدمام',
      address_en: 'Al Ghadir District, Dammam Road',
      coordinates: { lat: 24.8112, lng: 46.7234 },
      region: 'riyadh',
    },
    capacity: {
      total_rooms: 15,
      therapy_rooms: 12,
      consultation_rooms: 3,
      max_daily_sessions: 45,
      max_patients: 110,
    },
    staff_count: 22,
    manager_name: 'أ. سارة الخثلان',
    phone: '+966-11-2222222',
    email: 'riyadh.north@alawael.com',
    cost_center: 'CC-RY-002',
    monthly_target: 280000,
  },

  // ─── Jeddah Branches ──────────────────────────────────────────────────────
  {
    code: 'JD-MAIN',
    name_ar: 'فرع جدة الرئيسي',
    name_en: 'Jeddah Main Branch',
    short_name: 'ج.رئيسي',
    type: 'main',
    status: 'active',
    location: {
      city_ar: 'جدة',
      city_en: 'Jeddah',
      address_ar: 'حي الروضة، شارع فلسطين',
      address_en: 'Al Rawda District, Palestine Street',
      coordinates: { lat: 21.5433, lng: 39.1728 },
      region: 'makkah',
    },
    capacity: {
      total_rooms: 18,
      therapy_rooms: 14,
      consultation_rooms: 4,
      max_daily_sessions: 54,
      max_patients: 130,
    },
    staff_count: 25,
    manager_name: 'د. فيصل الزهراني',
    phone: '+966-12-3333333',
    email: 'jeddah.main@alawael.com',
    cost_center: 'CC-JD-001',
    monthly_target: 320000,
  },
  {
    code: 'JD-SOUTH',
    name_ar: 'فرع جدة الجنوبي',
    name_en: 'Jeddah South Branch',
    short_name: 'ج.جنوبي',
    type: 'branch',
    status: 'active',
    location: {
      city_ar: 'جدة',
      city_en: 'Jeddah',
      address_ar: 'حي الأمير عبدالمجيد، شارع الستين',
      address_en: 'Prince Abdulmajeed District, Al-Sitteen Street',
      coordinates: { lat: 21.4234, lng: 39.2163 },
      region: 'makkah',
    },
    capacity: {
      total_rooms: 12,
      therapy_rooms: 10,
      consultation_rooms: 2,
      max_daily_sessions: 36,
      max_patients: 85,
    },
    staff_count: 18,
    manager_name: 'أ. نورة السلمي',
    phone: '+966-12-4444444',
    email: 'jeddah.south@alawael.com',
    cost_center: 'CC-JD-002',
    monthly_target: 220000,
  },

  // ─── Eastern Province ─────────────────────────────────────────────────────
  {
    code: 'DM',
    name_ar: 'فرع الدمام',
    name_en: 'Dammam Branch',
    short_name: 'دمام',
    type: 'main',
    status: 'active',
    location: {
      city_ar: 'الدمام',
      city_en: 'Dammam',
      address_ar: 'حي الشاطئ، طريق الملك عبدالعزيز',
      address_en: 'Al Shati District, King Abdulaziz Road',
      coordinates: { lat: 26.4207, lng: 50.0888 },
      region: 'eastern',
    },
    capacity: {
      total_rooms: 16,
      therapy_rooms: 12,
      consultation_rooms: 4,
      max_daily_sessions: 48,
      max_patients: 120,
    },
    staff_count: 23,
    manager_name: 'أ. عبدالله الدوسري',
    phone: '+966-13-5555555',
    email: 'dammam@alawael.com',
    cost_center: 'CC-DM-001',
    monthly_target: 300000,
  },
  {
    code: 'KH',
    name_ar: 'فرع الخبر',
    name_en: 'Khobar Branch',
    short_name: 'خبر',
    type: 'branch',
    status: 'active',
    location: {
      city_ar: 'الخبر',
      city_en: 'Khobar',
      address_ar: 'حي العقربية، شارع الأمير تركي',
      address_en: 'Al Aqrabiyah District, Prince Turki Street',
      coordinates: { lat: 26.2976, lng: 50.2083 },
      region: 'eastern',
    },
    capacity: {
      total_rooms: 14,
      therapy_rooms: 11,
      consultation_rooms: 3,
      max_daily_sessions: 42,
      max_patients: 100,
    },
    staff_count: 20,
    manager_name: 'أ. منيرة الشهري',
    phone: '+966-13-6666666',
    email: 'khobar@alawael.com',
    cost_center: 'CC-KH-001',
    monthly_target: 260000,
  },

  // ─── Western & Central ────────────────────────────────────────────────────
  {
    code: 'TF',
    name_ar: 'فرع الطائف',
    name_en: 'Taif Branch',
    short_name: 'طائف',
    type: 'branch',
    status: 'active',
    location: {
      city_ar: 'الطائف',
      city_en: 'Taif',
      address_ar: 'حي الفيصلية',
      address_en: 'Al Faisaliyah District',
      coordinates: { lat: 21.2704, lng: 40.4158 },
      region: 'makkah',
    },
    capacity: {
      total_rooms: 10,
      therapy_rooms: 8,
      consultation_rooms: 2,
      max_daily_sessions: 30,
      max_patients: 75,
    },
    staff_count: 16,
    manager_name: 'أ. طارق القحطاني',
    phone: '+966-12-7777777',
    email: 'taif@alawael.com',
    cost_center: 'CC-TF-001',
    monthly_target: 180000,
  },
  {
    code: 'TB',
    name_ar: 'فرع تبوك',
    name_en: 'Tabuk Branch',
    short_name: 'تبوك',
    type: 'branch',
    status: 'active',
    location: {
      city_ar: 'تبوك',
      city_en: 'Tabuk',
      address_ar: 'حي العزيزية',
      address_en: 'Al Aziziyah District',
      coordinates: { lat: 28.3998, lng: 36.5715 },
      region: 'tabuk',
    },
    capacity: {
      total_rooms: 8,
      therapy_rooms: 6,
      consultation_rooms: 2,
      max_daily_sessions: 24,
      max_patients: 60,
    },
    staff_count: 14,
    manager_name: 'أ. ريم العنزي',
    phone: '+966-14-8888888',
    email: 'tabuk@alawael.com',
    cost_center: 'CC-TB-001',
    monthly_target: 150000,
  },
  {
    code: 'MD',
    name_ar: 'فرع المدينة المنورة',
    name_en: 'Madinah Branch',
    short_name: 'مدينة',
    type: 'branch',
    status: 'active',
    location: {
      city_ar: 'المدينة المنورة',
      city_en: 'Madinah',
      address_ar: 'حي الورود',
      address_en: 'Al Wurud District',
      coordinates: { lat: 24.5247, lng: 39.5692 },
      region: 'madinah',
    },
    capacity: {
      total_rooms: 12,
      therapy_rooms: 10,
      consultation_rooms: 2,
      max_daily_sessions: 36,
      max_patients: 90,
    },
    staff_count: 19,
    manager_name: 'أ. سلطان الحربي',
    phone: '+966-14-9999999',
    email: 'madinah@alawael.com',
    cost_center: 'CC-MD-001',
    monthly_target: 230000,
  },

  // ─── Northern & Southern ──────────────────────────────────────────────────
  {
    code: 'QS',
    name_ar: 'فرع القصيم',
    name_en: 'Qassim Branch',
    short_name: 'قصيم',
    type: 'branch',
    status: 'active',
    location: {
      city_ar: 'بريدة',
      city_en: 'Buraydah',
      address_ar: 'حي الملك فهد',
      address_en: 'King Fahd District',
      coordinates: { lat: 26.326, lng: 43.975 },
      region: 'qassim',
    },
    capacity: {
      total_rooms: 10,
      therapy_rooms: 8,
      consultation_rooms: 2,
      max_daily_sessions: 30,
      max_patients: 75,
    },
    staff_count: 15,
    manager_name: 'أ. بدر الشمري',
    phone: '+966-16-1010101',
    email: 'qassim@alawael.com',
    cost_center: 'CC-QS-001',
    monthly_target: 170000,
  },
  {
    code: 'HL',
    name_ar: 'فرع حائل',
    name_en: "Ha'il Branch",
    short_name: 'حائل',
    type: 'branch',
    status: 'active',
    location: {
      city_ar: 'حائل',
      city_en: "Ha'il",
      address_ar: 'حي الصالحية',
      address_en: 'Al Salihiyah District',
      coordinates: { lat: 27.5114, lng: 41.6903 },
      region: 'hail',
    },
    capacity: {
      total_rooms: 8,
      therapy_rooms: 6,
      consultation_rooms: 2,
      max_daily_sessions: 24,
      max_patients: 60,
    },
    staff_count: 13,
    manager_name: 'أ. حنان الرشيدي',
    phone: '+966-16-1111111',
    email: 'hail@alawael.com',
    cost_center: 'CC-HL-001',
    monthly_target: 140000,
  },
  {
    code: 'AB',
    name_ar: 'فرع أبها',
    name_en: 'Abha Branch',
    short_name: 'أبها',
    type: 'branch',
    status: 'active',
    location: {
      city_ar: 'أبها',
      city_en: 'Abha',
      address_ar: 'حي المنهل',
      address_en: 'Al Manhal District',
      coordinates: { lat: 18.2164, lng: 42.5053 },
      region: 'aseer',
    },
    capacity: {
      total_rooms: 10,
      therapy_rooms: 8,
      consultation_rooms: 2,
      max_daily_sessions: 30,
      max_patients: 75,
    },
    staff_count: 17,
    manager_name: 'أ. عمر آل سعيد',
    phone: '+966-17-1212121',
    email: 'abha@alawael.com',
    cost_center: 'CC-AB-001',
    monthly_target: 165000,
  },
];

// ─── Seed Function ─────────────────────────────────────────────────────────────
async function seedBranches() {
  const mongoUri =
    process.env.MONGODB_URI ||
    'mongodb://admin:adminpassword@localhost:27017/alawael_erp?authSource=admin';

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing branches
    const existing = await Branch.countDocuments();
    if (existing > 0) {
      console.log(`⚠️  Found ${existing} existing branches. Use --force to overwrite.`);
      if (!process.argv.includes('--force')) {
        console.log('Skipping seed. Run with --force to overwrite.');
        process.exit(0);
      }
      await Branch.deleteMany({});
      console.log('🗑️  Cleared existing branches');
    }

    // Insert branches
    const result = await Branch.insertMany(BRANCHES_DATA);
    console.log(`\n✅ Seeded ${result.length} branches:\n`);
    result.forEach(b => {
      console.log(
        `   ${b.code.padEnd(10)} | ${b.name_ar.padEnd(30)} | ${b.type.padEnd(10)} | ${b.status}`
      );
    });

    console.log('\n📊 Summary:');
    console.log(`   HQ: 1`);
    console.log(`   Main Branches: ${result.filter(b => b.type === 'main').length}`);
    console.log(`   Regular Branches: ${result.filter(b => b.type === 'branch').length}`);
    console.log(`   Total Staff: ${result.reduce((s, b) => s + b.staff_count, 0)}`);
    console.log(
      `   Total Monthly Target: ${result.reduce((s, b) => s + b.monthly_target, 0).toLocaleString()} SAR`
    );
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Export for programmatic use
module.exports = { BRANCHES_DATA };

// Run if called directly
if (require.main === module) {
  seedBranches();
}
