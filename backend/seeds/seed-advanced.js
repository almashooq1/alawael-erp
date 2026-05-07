/**
 * بذر البيانات المتقدمة
 * Advanced Data Seeding Script
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function seedAdvanced() {
  try {
    const mongoUri =
      process.env.MONGOOSE_URI ||
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017/rehabilitation-system';

    console.log('🔌 جارٍ الاتصال بـ MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ متصل بـ MongoDB');

    // استيراد دالة البذر المتقدمة
    const { seedAdvancedMeasurementsAndPrograms } = require('./measurement-system.seed');

    // تنفيذ البذر المتقدم
    const result = await seedAdvancedMeasurementsAndPrograms();

    console.log('\n✨ تم إكمال البذر المتقدم بنجاح!');

    // إظهار ملخص النتائج
    if (result) {
      console.log('\n📊 ملخص النتائج:');
      console.log(`   - المقاييس الإضافية: ${result.advancedMeasurementTypes?.length || 0}`);
      console.log(`   - فئات البرامج: ${result.programCategories?.length || 0}`);
      console.log(`   - البرامج الإضافية: ${result.advancedPrograms?.length || 0}`);
    }

    // إغلاق الاتصال
    await mongoose.connection.close();
    console.log('\n🔌 تم إغلاق الاتصال');
    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    process.exit(1);
  }
}

seedAdvanced();
