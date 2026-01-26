// MongoDB connectivity check using current .env
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '.env' });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ MONGODB_URI is not set in .env');
  process.exit(1);
}

(async () => {
  console.log('🔎 Connecting to MongoDB...');
  console.log(`URI: ${uri.replace(/(:)([^@]+)(@)/, (_m, p1, _pw, p3) => `${p1}****${p3}`)}`);
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      // Mongoose 9 uses the Node driver defaults; keep simple options
    });
    console.log('✅ Connected to MongoDB Atlas successfully');
    await mongoose.connection.close();
    console.log('✅ Connection closed cleanly');
    process.exit(0);
  } catch (err) {
    console.error('❌ MongoDB connection failed');
    console.error('Reason:', err.message);
    if (err.reason && err.reason.code) {
      console.error('Driver code:', err.reason.code);
    }
    console.error(
      '\nCommon fixes:\n- Ensure Network Access in Atlas allows your IP (Add IP or Allow 0.0.0.0/0 temporarily)\n- Verify username/password and URL encoding for special characters (@ becomes %40)\n- Confirm database name exists or will be created (alawael-db)'
    );
    process.exit(1);
  }
})();
