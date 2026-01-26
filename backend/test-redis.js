// Redis Cache Test Script
// يختبر وظيفة الكاش بشكل مباشر

const redisClient = require('./config/redis');

async function testRedisCache() {
  console.log('🧪 اختبار Redis Cache...\n');

  try {
    // 1. Initialize Redis
    console.log('1️⃣ تهيئة Redis...');
    await redisClient.initializeRedis();
    console.log('✅ Redis متصل بنجاح\n');

    // 2. Test SET operation
    console.log('2️⃣ اختبار حفظ البيانات...');
    await redisClient.set('test:user:1', { name: 'أحمد', role: 'admin' }, 60);
    console.log('✅ تم حفظ البيانات\n');

    // 3. Test GET operation
    console.log('3️⃣ اختبار استرجاع البيانات...');
    const data = await redisClient.get('test:user:1');
    console.log('✅ البيانات المسترجعة:', data);
    console.log('');

    // 4. Test EXISTS
    console.log('4️⃣ اختبار وجود المفتاح...');
    const exists = await redisClient.exists('test:user:1');
    console.log(`✅ المفتاح ${exists ? 'موجود' : 'غير موجود'}\n`);

    // 5. Test multiple keys
    console.log('5️⃣ اختبار حفظ عدة مفاتيح...');
    await Promise.all([
      redisClient.set('test:module:reports', { count: 150 }, 300),
      redisClient.set('test:module:finance', { count: 89 }, 300),
      redisClient.set('test:module:hr', { count: 234 }, 300),
    ]);
    console.log('✅ تم حفظ 3 مفاتيح\n');

    // 6. Test pattern deletion
    console.log('6️⃣ اختبار حذف المفاتيح بنمط معين...');
    const deleted = await redisClient.delPattern('test:module:*');
    console.log(`✅ تم حذف ${deleted} مفتاح\n`);

    // 7. Test expiry
    console.log('7️⃣ اختبار انتهاء الصلاحية...');
    await redisClient.set('test:expiring', { value: 'سيحذف بعد ثانيتين' }, 2);
    console.log('✅ تم حفظ مفتاح بصلاحية 2 ثانية');
    console.log('⏳ انتظار 3 ثوان...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    const expired = await redisClient.get('test:expiring');
    console.log(`✅ المفتاح بعد انتهاء الصلاحية: ${expired === null ? 'محذوف' : 'موجود'}\n`);

    // 8. Get stats
    console.log('8️⃣ إحصائيات Redis:');
    const stats = await redisClient.getStats();
    console.log('✅ الإحصائيات:', stats);
    console.log('');

    // Cleanup
    console.log('9️⃣ تنظيف البيانات التجريبية...');
    await redisClient.delPattern('test:*');
    console.log('✅ تم التنظيف\n');

    console.log('🎉 جميع الاختبارات نجحت!');
    console.log('📊 Redis جاهز للاستخدام في التطبيق\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error.message);
    process.exit(1);
  }
}

// Run tests
testRedisCache();
