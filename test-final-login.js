process.env.USE_MOCK_DB = 'true';
process.env.NODE_ENV = 'development'; // Ensure it reads from disk
process.env.PORT = '3005';
process.env.JWT_SECRET = 'test_secret_key_123';

const path = require('path');
const { server } = require('./backend/server');
const axios = require('axios');

// Wait for DB initialization (approx)
setTimeout(async () => {
  server.listen(3005, async () => {
    console.log('🚀 Test Server running on 3005');
    try {
      console.log('🔑 Attempting Login...');
      const response = await axios.post('http://localhost:3005/api/auth/login', {
        email: 'admin@alawael.com',
        password: 'Admin@123456',
      });

      if (response.data && response.data.success) {
        console.log('✅ LOGIN SUCCESSFUL');
        console.log('User:', response.data.data.user.email);
        console.log('Token:', response.data.data.accessToken ? 'Present' : 'Missing');
        process.exit(0);
      } else {
        console.log('❌ Login Failed structure:', response.data);
        process.exit(1);
      }
    } catch (error) {
      if (error.response) {
        console.log('❌ Login Error Status:', error.response.status);
        console.log('❌ Login Error Data:', error.response.data);
      } else {
        console.log('❌ Error:', error.message);
      }
      process.exit(1);
    }
  });
}, 2000);
