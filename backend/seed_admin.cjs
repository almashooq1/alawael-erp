// seed_admin.cjs — Create admin user using the User model
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = 'mongodb://localhost:27017/alawael-erp';

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📋 Collections:', collections.map(c => c.name).join(', '));

    // Check existing users in 'users' collection
    const usersCol = mongoose.connection.db.collection('users');
    const existingCount = await usersCol.countDocuments();
    console.log(`👥 Existing users in 'users' collection: ${existingCount}`);

    if (existingCount > 0) {
      const allUsers = await usersCol
        .find({})
        .project({ email: 1, role: 1, fullName: 1 })
        .toArray();
      console.log('📋 Existing users:', JSON.stringify(allUsers, null, 2));
    }

    // Hash password
    const password = 'Admin@2025!';
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('🔐 Password hashed successfully');

    // Delete existing admin if exists
    const deleteResult = await usersCol.deleteMany({ email: 'superadmin@alawael.com.sa' });
    console.log(`🗑️ Deleted ${deleteResult.deletedCount} existing superadmin records`);

    // Insert directly into the 'users' collection (same collection Mongoose User model uses)
    const result = await usersCol.insertOne({
      email: 'superadmin@alawael.com.sa',
      password: hashedPassword,
      fullName: 'مدير النظام',
      role: 'super_admin',
      isActive: true,
      emailVerified: true,
      failedLoginAttempts: 0,
      lockUntil: null,
      tokenVersion: 0,
      customPermissions: [],
      deniedPermissions: [],
      loginHistory: [],
      passwordHistory: [],
      requirePasswordChange: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✅ Admin user created with _id:', result.insertedId);

    // Verify: find the user back using findOne
    const verify = await usersCol.findOne({ email: 'superadmin@alawael.com.sa' });
    console.log('✅ Verification - User found:', verify ? verify.email : 'NOT FOUND');
    console.log('✅ Password hash starts with:', verify?.password?.substring(0, 10));

    // Test password comparison
    const match = await bcrypt.compare(password, verify.password);
    console.log('✅ Password comparison test:', match ? 'PASS ✓' : 'FAIL ✗');

    console.log('\n🎉 Admin user created successfully!');
    console.log('📧 Email: superadmin@alawael.com.sa');
    console.log('🔑 Password: Admin@2025!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
