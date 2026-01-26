/**
 * اختبار اتصال MongoDB Atlas
 * MongoDB Atlas Connection Test
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('\n🔄 جاري الاتصال بـ MongoDB Atlas...');
    console.log('Connecting to MongoDB Atlas...\n');

    const uri = process.env.MONGODB_URI;

    if (!uri) {
      console.error('❌ خطأ: MONGODB_URI غير موجود في .env');
      console.error('Error: MONGODB_URI not found in .env file');
      process.exit(1);
    }

    // إخفاء password في السجل
    const safeUri = uri.replace(/:([^@]+)@/, ':****@');
    console.log('📍 URI:', safeUri);

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('\n✅ تم الاتصال بنجاح!');
    console.log('Connected successfully!\n');

    console.log('📊 معلومات الاتصال / Connection Info:');
    console.log('   Database:', mongoose.connection.name);
    console.log('   Host:', mongoose.connection.host);
    console.log('   Port:', mongoose.connection.port);
    console.log(
      '   Ready State:',
      mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected'
    );

    // اختبار إنشاء collection بسيط
    console.log('\n🧪 اختبار إنشاء test document...');
    console.log('Testing document creation...\n');

    const TestSchema = new mongoose.Schema({
      name: String,
      createdAt: { type: Date, default: Date.now },
    });

    const Test = mongoose.model('ConnectionTest', TestSchema);

    const testDoc = await Test.create({
      name: 'Connection Test - ' + new Date().toISOString(),
    });

    console.log('✅ تم إنشاء test document بنجاح!');
    console.log('Test document created successfully!');
    console.log('   ID:', testDoc._id);
    console.log('   Name:', testDoc.name);

    // حذف test document
    await Test.deleteOne({ _id: testDoc._id });
    console.log('🗑️  تم حذف test document');
    console.log('Test document deleted\n');

    await mongoose.connection.close();
    console.log('👋 تم إغلاق الاتصال بنجاح');
    console.log('Connection closed successfully\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ فشل الاتصال!');
    console.error('Connection failed!\n');
    console.error('Error:', error.message);

    if (error.message.includes('authentication')) {
      console.error('\n💡 تلميح: تحقق من username وpassword في MONGODB_URI');
      console.error('Hint: Check username and password in MONGODB_URI');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('\n💡 تلميح: تحقق من صحة URI');
      console.error('Hint: Check if URI is correct');
    } else if (error.message.includes('IP')) {
      console.error('\n💡 تلميح: تحقق من Network Access في MongoDB Atlas');
      console.error('Hint: Check Network Access settings in MongoDB Atlas');
    }

    process.exit(1);
  }
}

// تشغيل الاختبار
testConnection();
