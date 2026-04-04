/**
 * @file branches.config.js
 * @description إعداد الفروع — Branch Configuration for Seeding
 *
 * لإضافة فرع جديد: أضف كائناً جديداً في المصفوفة BRANCHES
 * يجب أن يكون branchCode فريداً لكل فرع
 *
 * الحقول المطلوبة: branchCode, nameAr, nameEn, city, cityEn, region, address, phone, email
 * الحقول الاختيارية: coordinates, capacity, status, isActive, workingHours, extra
 *
 * @example
 * // لإضافة فرع مكة:
 * {
 *   branchCode: 'MKK-MAIN',
 *   nameAr: 'فرع مكة المكرمة',
 *   nameEn: 'Makkah Branch',
 *   city: 'مكة المكرمة',
 *   cityEn: 'Makkah',
 *   region: 'makkah',
 *   address: 'حي العزيزية، مكة المكرمة',
 *   phone: '+966-12-5000010',
 *   email: 'makkah@alawael.com.sa',
 * }
 */

'use strict';

/**
 * قائمة الفروع — مفتوحة ويمكن إضافة أي عدد من الفروع
 * @type {BranchConfig[]}
 */
const BRANCHES = [
  // ─── فرع الرياض الرئيسي ──────────────────────────────────────────────────
  {
    branchCode: 'RUH-MAIN',
    nameAr: 'فرع الرياض الرئيسي',
    nameEn: 'Riyadh Main Branch',
    city: 'الرياض',
    cityEn: 'Riyadh',
    region: 'riyadh',
    address: 'طريق الملك فهد، حي الملقا، الرياض',
    phone: '+966-11-4000001',
    email: 'riyadh@alawael.com.sa',
    coordinates: { lat: 24.7136, lng: 46.6753 },
    capacity: { maxDailySessions: 60, maxBeneficiaries: 150, therapyRooms: 15 },
    workingHours: { start: '07:30', end: '16:30', thursdayEnd: '14:00' },
    status: 'active',
    isActive: true,
  },

  // ─── فرع جدة الرئيسي ────────────────────────────────────────────────────
  {
    branchCode: 'JED-MAIN',
    nameAr: 'فرع جدة الرئيسي',
    nameEn: 'Jeddah Main Branch',
    city: 'جدة',
    cityEn: 'Jeddah',
    region: 'makkah',
    address: 'حي الروضة، شارع فلسطين، جدة',
    phone: '+966-12-4000002',
    email: 'jeddah@alawael.com.sa',
    coordinates: { lat: 21.5433, lng: 39.1728 },
    capacity: { maxDailySessions: 54, maxBeneficiaries: 130, therapyRooms: 14 },
    workingHours: { start: '07:30', end: '16:30', thursdayEnd: '14:00' },
    status: 'active',
    isActive: true,
  },

  // ─── فرع الدمام الرئيسي ─────────────────────────────────────────────────
  {
    branchCode: 'DAM-MAIN',
    nameAr: 'فرع الدمام الرئيسي',
    nameEn: 'Dammam Main Branch',
    city: 'الدمام',
    cityEn: 'Dammam',
    region: 'eastern',
    address: 'حي الشاطئ، طريق الملك عبدالعزيز، الدمام',
    phone: '+966-13-4000003',
    email: 'dammam@alawael.com.sa',
    coordinates: { lat: 26.4207, lng: 50.0888 },
    capacity: { maxDailySessions: 48, maxBeneficiaries: 120, therapyRooms: 12 },
    workingHours: { start: '07:30', end: '16:30', thursdayEnd: '14:00' },
    status: 'active',
    isActive: true,
  },

  // ─── أضف فروعاً جديدة هنا ↓ ────────────────────────────────────────────
  // مثال — فرع مكة المكرمة (قم بإزالة التعليق لتفعيله):
  // {
  //   branchCode: 'MKK-MAIN',
  //   nameAr: 'فرع مكة المكرمة',
  //   nameEn: 'Makkah Branch',
  //   city: 'مكة المكرمة',
  //   cityEn: 'Makkah',
  //   region: 'makkah',
  //   address: 'حي العزيزية، طريق مكة المدينة، مكة المكرمة',
  //   phone: '+966-12-5000010',
  //   email: 'makkah@alawael.com.sa',
  //   coordinates: { lat: 21.3891, lng: 39.8579 },
  //   capacity: { maxDailySessions: 40, maxBeneficiaries: 100, therapyRooms: 10 },
  //   workingHours: { start: '07:30', end: '16:30', thursdayEnd: '14:00' },
  //   status: 'active',
  //   isActive: true,
  // },

  // مثال — فرع المدينة المنورة:
  // {
  //   branchCode: 'MED-MAIN',
  //   nameAr: 'فرع المدينة المنورة',
  //   nameEn: 'Madinah Branch',
  //   city: 'المدينة المنورة',
  //   cityEn: 'Madinah',
  //   region: 'madinah',
  //   address: 'حي قباء، المدينة المنورة',
  //   phone: '+966-14-5000011',
  //   email: 'madinah@alawael.com.sa',
  //   capacity: { maxDailySessions: 36, maxBeneficiaries: 90, therapyRooms: 9 },
  //   status: 'active',
  //   isActive: true,
  // },
];

/**
 * الحصول على إعداد فرع بالكود
 * @param {string} code
 * @returns {BranchConfig|undefined}
 */
function getBranchByCode(code) {
  return BRANCHES.find(b => b.branchCode === code);
}

/**
 * الحصول على أكواد جميع الفروع
 * @returns {string[]}
 */
function getAllBranchCodes() {
  return BRANCHES.map(b => b.branchCode);
}

/**
 * الحصول على الفروع النشطة فقط
 * @returns {BranchConfig[]}
 */
function getActiveBranches() {
  return BRANCHES.filter(b => b.isActive !== false && b.status !== 'inactive');
}

module.exports = {
  BRANCHES,
  getBranchByCode,
  getAllBranchCodes,
  getActiveBranches,
};
