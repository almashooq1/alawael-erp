/* eslint-disable no-unused-vars */
/**
 * Seed Data Script - إنشاء بيانات تجريبية
 * Creates demo/test data for the system
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Trip = require('../models/Trip');

async function seedData() {
  try {
    console.log('\n🌱 بدء عملية Seeding...');
    console.log('Starting seed process...\n');

    // الاتصال بقاعدة البيانات
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ تم الاتصال بقاعدة البيانات');
    console.log('Connected to database\n');

    // حذف البيانات القديمة
    console.log('🗑️  حذف البيانات القديمة...');
    await Vehicle.deleteMany({});
    await Driver.deleteMany({});
    await Trip.deleteMany({});
    console.log('✅ تم حذف البيانات القديمة\n');

    // إنشاء مركبات
    console.log('🚗 إنشاء مركبات...');
    const vehicles = await Vehicle.create([
      {
        plateNumber: 'ABC-1234',
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        color: 'أبيض',
        vin: 'VIN1234567890ABC1',
        fuelType: 'بنزين',
        status: 'نشط',
        ownership: {
          ownerType: 'الشركة',
          ownerName: 'شركة النقل الحديث',
        },
        maintenance: {
          lastMaintenanceDate: new Date('2024-01-15'),
          nextMaintenanceDate: new Date('2024-07-15'),
          maintenanceHistory: [],
        },
      },
      {
        plateNumber: 'XYZ-5678',
        make: 'Honda',
        model: 'Civic',
        year: 2023,
        color: 'أسود',
        vin: 'VIN0987654321XYZ2',
        fuelType: 'بنزين',
        status: 'نشط',
        ownership: {
          ownerType: 'الشركة',
          ownerName: 'شركة النقل الحديث',
        },
        maintenance: {
          lastMaintenanceDate: new Date('2024-02-01'),
          nextMaintenanceDate: new Date('2024-08-01'),
          maintenanceHistory: [],
        },
      },
      {
        plateNumber: 'DEF-9012',
        make: 'Nissan',
        model: 'Altima',
        year: 2021,
        color: 'فضي',
        vin: 'VIN1122334455DEF3',
        fuelType: 'بنزين',
        status: 'تحت الصيانة',
        ownership: {
          ownerType: 'الشركة',
          ownerName: 'شركة النقل الحديث',
        },
        maintenance: {
          lastMaintenanceDate: new Date('2024-03-10'),
          nextMaintenanceDate: new Date('2024-09-10'),
          maintenanceHistory: [
            {
              type: 'صيانة دورية',
              description: 'تغيير زيت وفلاتر',
              date: new Date('2024-03-10'),
              mileage: 45000,
              cost: 250,
              serviceProvider: 'مركز الصيانة الرئيسي',
            },
          ],
        },
      },
    ]);
    console.log(`✅ تم إنشاء ${vehicles.length} مركبة\n`);

    // إنشاء سائقين
    console.log('👨 إنشاء سائقين...');
    const drivers = await Driver.create([
      {
        firstName: 'محمد',
        lastName: 'أحمد',
        personalInfo: {
          nationalId: '1234567890',
          dateOfBirth: new Date('1990-05-15'),
          nationality: 'سعودي',
          phoneNumber: '+966501234567',
          email: 'mohammed.ahmed@example.com',
          address: 'الرياض، المملكة العربية السعودية',
        },
        license: {
          licenseNumber: 'LIC-001-2024',
          licenseType: 'نقل عام',
          issueDate: new Date('2020-01-01'),
          expiryDate: new Date('2030-01-01'),
        },
        employmentInfo: {
          employeeId: 'EMP-001',
          hireDate: new Date('2020-02-01'),
          department: 'النقل',
          position: 'سائق',
          salary: 5000,
        },
        status: 'نشط',
      },
      {
        firstName: 'عبدالله',
        lastName: 'محمود',
        personalInfo: {
          nationalId: '0987654321',
          dateOfBirth: new Date('1988-08-20'),
          nationality: 'سعودي',
          phoneNumber: '+966507654321',
          email: 'abdullah.mahmoud@example.com',
          address: 'جدة، المملكة العربية السعودية',
        },
        license: {
          licenseNumber: 'LIC-002-2024',
          licenseType: 'نقل عام',
          issueDate: new Date('2019-06-15'),
          expiryDate: new Date('2029-06-15'),
        },
        employmentInfo: {
          employeeId: 'EMP-002',
          hireDate: new Date('2019-07-01'),
          department: 'النقل',
          position: 'سائق',
          salary: 5200,
        },
        status: 'نشط',
      },
      {
        firstName: 'خالد',
        lastName: 'السعيد',
        personalInfo: {
          nationalId: '1122334455',
          dateOfBirth: new Date('1992-12-10'),
          nationality: 'سعودي',
          phoneNumber: '+966509988776',
          email: 'khaled.alsaeed@example.com',
          address: 'الدمام، المملكة العربية السعودية',
        },
        license: {
          licenseNumber: 'LIC-003-2024',
          licenseType: 'نقل عام',
          issueDate: new Date('2021-03-10'),
          expiryDate: new Date('2031-03-10'),
        },
        employmentInfo: {
          employeeId: 'EMP-003',
          hireDate: new Date('2021-04-15'),
          department: 'النقل',
          position: 'سائق',
          salary: 4800,
        },
        status: 'نشط',
      },
    ]);
    console.log(`✅ تم إنشاء ${drivers.length} سائق\n`);

    // إنشاء رحلات
    console.log('🚦 إنشاء رحلات...');
    const trips = await Trip.create([
      {
        vehicle: vehicles[0]._id,
        driver: drivers[0]._id,
        startLocation: {
          address: 'الرياض - شارع الملك فهد',
          coordinates: { latitude: 24.7136, longitude: 46.6753 },
        },
        endLocation: {
          address: 'جدة - طريق الملك عبدالله',
          coordinates: { latitude: 21.4858, longitude: 39.1925 },
        },
        startTime: new Date('2024-01-15T08:00:00'),
        endTime: new Date('2024-01-15T18:00:00'),
        distance: 950,
        fuelConsumption: 80,
        fuelCost: 160,
        status: 'مكتملة',
        purpose: 'نقل ركاب',
      },
      {
        vehicle: vehicles[1]._id,
        driver: drivers[1]._id,
        startLocation: {
          address: 'جدة - شارع التحلية',
          coordinates: { latitude: 21.5433, longitude: 39.1728 },
        },
        endLocation: {
          address: 'مكة - طريق الحرم',
          coordinates: { latitude: 21.3891, longitude: 39.8579 },
        },
        startTime: new Date('2024-01-20T10:00:00'),
        endTime: new Date('2024-01-20T11:30:00'),
        distance: 85,
        fuelConsumption: 8,
        fuelCost: 16,
        status: 'مكتملة',
        purpose: 'نقل ركاب',
      },
      {
        vehicle: vehicles[0]._id,
        driver: drivers[2]._id,
        startLocation: {
          address: 'الدمام - الكورنيش',
          coordinates: { latitude: 26.3927, longitude: 49.9777 },
        },
        status: 'قيد التنفيذ',
        purpose: 'نقل بضائع',
      },
    ]);
    console.log(`✅ تم إنشاء ${trips.length} رحلة\n`);

    // عرض ملخص
    console.log('📊 ملخص البيانات المضافة:');
    console.log('Summary of seeded data:');
    console.log(`   🚗 المركبات: ${vehicles.length}`);
    console.log(`   👨 السائقين: ${drivers.length}`);
    console.log(`   🚦 الرحلات: ${trips.length}\n`);

    console.log('✅ اكتملت عملية Seeding بنجاح!');
    console.log('Seeding completed successfully!\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ خطأ في Seeding:', error);
    console.error('Seeding error:', error.message);
    process.exit(1);
  }
}

// تشغيل Seed
seedData();
