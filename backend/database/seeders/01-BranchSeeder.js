/**
 * BranchSeeder — إنشاء 3 فروع تجريبية
 * الرياض + جدة + الدمام
 */
'use strict';

const mongoose = require('mongoose');
const Branch = require('../../models/Branch');

const BRANCHES = [
  {
    code: 'RUH-01',
    name_ar: 'فرع الرياض الرئيسي',
    name_en: 'Riyadh Main Branch',
    short_name: 'الرياض',
    type: 'hq',
    is_hq: true,
    status: 'active',
    location: {
      city_ar: 'الرياض',
      city_en: 'Riyadh',
      address_ar: 'طريق الملك فهد، حي العليا، الرياض',
      address_en: 'King Fahd Road, Al-Olaya District, Riyadh',
      coordinates: { lat: 24.7136, lng: 46.6753 },
      region: 'riyadh',
    },
    capacity: {
      total_rooms: 20,
      therapy_rooms: 15,
      consultation_rooms: 5,
      max_daily_sessions: 80,
      max_patients: 200,
    },
    staff_count: 25,
    phone: '0114567890',
    mobile: '0501234567',
    email: 'riyadh@alawael.sa',
    whatsapp: '0501234567',
    operating_hours: [
      { day: 'sun', open: '07:30', close: '16:30', closed: false },
      { day: 'mon', open: '07:30', close: '16:30', closed: false },
      { day: 'tue', open: '07:30', close: '16:30', closed: false },
      { day: 'wed', open: '07:30', close: '16:30', closed: false },
      { day: 'thu', open: '07:30', close: '14:00', closed: false },
      { day: 'fri', open: null, close: null, closed: true },
      { day: 'sat', open: null, close: null, closed: true },
    ],
    cost_center: 'CC-RUH-001',
    monthly_target: 500000,
    settings: {
      allow_online_booking: true,
      allow_home_visits: false,
      has_transport: true,
      language: 'ar',
      timezone: 'Asia/Riyadh',
      notification_emails: ['riyadh-manager@alawael.sa'],
    },
    established_date: new Date('2020-01-01'),
  },
  {
    code: 'JED-01',
    name_ar: 'فرع جدة',
    name_en: 'Jeddah Branch',
    short_name: 'جدة',
    type: 'main',
    is_hq: false,
    status: 'active',
    location: {
      city_ar: 'جدة',
      city_en: 'Jeddah',
      address_ar: 'شارع الأمير محمد بن عبدالعزيز، حي الروضة، جدة',
      address_en: 'Prince Mohammed bin Abdulaziz St, Al-Rawdah, Jeddah',
      coordinates: { lat: 21.5433, lng: 39.1728 },
      region: 'makkah',
    },
    capacity: {
      total_rooms: 15,
      therapy_rooms: 12,
      consultation_rooms: 3,
      max_daily_sessions: 60,
      max_patients: 150,
    },
    staff_count: 18,
    phone: '0126789012',
    mobile: '0561234567',
    email: 'jeddah@alawael.sa',
    whatsapp: '0561234567',
    operating_hours: [
      { day: 'sun', open: '07:30', close: '16:30', closed: false },
      { day: 'mon', open: '07:30', close: '16:30', closed: false },
      { day: 'tue', open: '07:30', close: '16:30', closed: false },
      { day: 'wed', open: '07:30', close: '16:30', closed: false },
      { day: 'thu', open: '07:30', close: '14:00', closed: false },
      { day: 'fri', open: null, close: null, closed: true },
      { day: 'sat', open: null, close: null, closed: true },
    ],
    cost_center: 'CC-JED-001',
    monthly_target: 350000,
    settings: {
      allow_online_booking: true,
      allow_home_visits: true,
      has_transport: true,
      language: 'ar',
      timezone: 'Asia/Riyadh',
      notification_emails: ['jeddah-manager@alawael.sa'],
    },
    established_date: new Date('2021-01-10'),
  },
  {
    code: 'DMM-01',
    name_ar: 'فرع الدمام',
    name_en: 'Dammam Branch',
    short_name: 'الدمام',
    type: 'branch',
    is_hq: false,
    status: 'active',
    location: {
      city_ar: 'الدمام',
      city_en: 'Dammam',
      address_ar: 'شارع الأمير نايف، حي الشاطئ، الدمام',
      address_en: 'Prince Naif St, Al-Shati District, Dammam',
      coordinates: { lat: 26.4207, lng: 50.0888 },
      region: 'eastern',
    },
    capacity: {
      total_rooms: 12,
      therapy_rooms: 9,
      consultation_rooms: 3,
      max_daily_sessions: 45,
      max_patients: 100,
    },
    staff_count: 14,
    phone: '0138901234',
    mobile: '0571234567',
    email: 'dammam@alawael.sa',
    whatsapp: '0571234567',
    operating_hours: [
      { day: 'sun', open: '07:30', close: '16:30', closed: false },
      { day: 'mon', open: '07:30', close: '16:30', closed: false },
      { day: 'tue', open: '07:30', close: '16:30', closed: false },
      { day: 'wed', open: '07:30', close: '16:30', closed: false },
      { day: 'thu', open: '07:30', close: '14:00', closed: false },
      { day: 'fri', open: null, close: null, closed: true },
      { day: 'sat', open: null, close: null, closed: true },
    ],
    cost_center: 'CC-DMM-001',
    monthly_target: 250000,
    settings: {
      allow_online_booking: true,
      allow_home_visits: false,
      has_transport: true,
      language: 'ar',
      timezone: 'Asia/Riyadh',
      notification_emails: ['dammam-manager@alawael.sa'],
    },
    established_date: new Date('2021-06-01'),
  },
];

async function run() {
  console.log('🏢 إنشاء الفروع (3 فروع)...');
  let created = 0;
  let updated = 0;

  for (const branchData of BRANCHES) {
    const existing = await Branch.findOne({ code: branchData.code });
    if (existing) {
      await Branch.updateOne({ code: branchData.code }, { $set: branchData });
      updated++;
    } else {
      await Branch.create(branchData);
      created++;
    }
  }

  console.log(`   ✅ الفروع: ${created} تم إنشاؤها، ${updated} تم تحديثها`);
  return { created, updated, total: BRANCHES.length };
}

module.exports = { run, BRANCHES };
