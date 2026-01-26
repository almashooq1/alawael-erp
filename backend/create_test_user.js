// إنشاء مستخدم تجريبي للاختبار
// تشغيل: node create_test_user.js

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// User Schema
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

async function createTestUser() {
  try {
    // الاتصال بقاعدة البيانات
    const dbUrl = process.env.DATABASE_URL || 'sqlite:///./backend/alawael_erp.db';

    console.log('Connecting to database...');
    console.log('Database URL:', dbUrl);

    // إذا كان SQLite، استخدم في الذاكرة للاختبار السريع
    if (dbUrl.includes('sqlite')) {
      console.log('\n⚠️  SQLite detected. Using in-memory MongoDB for user creation.');
      console.log('Note: For production, use MongoDB Atlas.\n');
      await mongoose
        .connect('mongodb://localhost:27017/alawael_erp_test', {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        })
        .catch(() => {
          console.log('⚠️  MongoDB not available. Please install MongoDB or use MongoDB Atlas.');
          console.log('For now, you can test with these credentials when they are created:');
          console.log('Email: admin@example.com');
          console.log('Password: Admin@123');
          process.exit(0);
        });
    } else {
      await mongoose.connect(dbUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }

    console.log('✅ Connected to database');

    // التحقق من وجود المستخدم
    const existingUser = await User.findOne({ email: 'admin@example.com' });

    if (existingUser) {
      console.log('\n✅ Test user already exists!');
      console.log('Email: admin@example.com');
      console.log('Password: Admin@123');
      console.log('\nYou can login now.');
      await mongoose.disconnect();
      return;
    }

    // تشفير كلمة المرور
    console.log('Creating test user...');
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    // إنشاء المستخدم
    const testUser = new User({
      fullName: 'Admin User',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
    });

    await testUser.save();

    console.log('\n✅ Test user created successfully!');
    console.log('═══════════════════════════════════════');
    console.log('Email: admin@example.com');
    console.log('Password: Admin@123');
    console.log('Role: admin');
    console.log('═══════════════════════════════════════');
    console.log('\nYou can now login with these credentials.');

    await mongoose.disconnect();
    console.log('\n✅ Database connection closed.');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 11000) {
      console.log('User already exists. You can login with:');
      console.log('Email: admin@example.com');
      console.log('Password: Admin@123');
    }
    process.exit(1);
  }
}

createTestUser();
