require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael-erp');
  console.log('Connected to MongoDB');

  // List all collections
  const cols = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections:', cols.map(c => c.name).join(', '));

  // Check users collection
  const userCount = await mongoose.connection.db.collection('users').countDocuments();
  console.log('Users in "users" collection:', userCount);

  if (userCount > 0) {
    const existingUsers = await mongoose.connection.db
      .collection('users')
      .find({})
      .project({ email: 1, username: 1, role: 1 })
      .toArray();
    console.log('Existing users:', JSON.stringify(existingUsers, null, 2));
  }

  // Now use the actual User model to create admin
  try {
    const User = require('./models/User');
    console.log('User model collection name:', User.collection.name);

    const modelCount = await User.countDocuments();
    console.log('Users via Model:', modelCount);

    // Create admin via the model
    const hash = await bcrypt.hash('Admin@2025!', 12);
    const existing = await User.findOne({ email: 'superadmin@alawael.com.sa' });
    if (existing) {
      console.log('Admin already exists via model');
    } else {
      const admin = await User.create({
        username: 'superadmin',
        email: 'superadmin@alawael.com.sa',
        password: hash,
        profile: {
          firstName: { ar: 'مدير', en: 'Super' },
          lastName: { ar: 'النظام', en: 'Admin' },
        },
        role: 'superadmin',
        isActive: true,
        mustChangePassword: false,
        emailVerified: true,
      });
      console.log('Admin created via model! ID:', admin._id);
    }
  } catch (err) {
    console.error('Model error:', err.message);
    // Fallback: create directly in users collection
    console.log('Trying direct insert...');
    const hash = await bcrypt.hash('Admin@2025!', 12);
    await mongoose.connection.db
      .collection('users')
      .updateOne(
        { email: 'superadmin@alawael.com.sa' },
        { $set: { password: hash, role: 'superadmin', isActive: true, username: 'superadmin' } },
        { upsert: true }
      );
    console.log('Direct upsert done');
  }

  await mongoose.disconnect();
  console.log('Done!');
}

run().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
