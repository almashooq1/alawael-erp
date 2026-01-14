// Test login immediately
const http = require('http');

const loginData = JSON.stringify({
  email: 'admin@alawael.com',
  password: 'Admin@123456',
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length,
  },
};

const req = http.request(options, res => {
  let data = '';

  res.on('data', chunk => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n========== LOGIN TEST RESULT ==========\n');
    console.log('Status Code:', res.statusCode);
    console.log('Status Message:', res.statusMessage);
    console.log('\nResponse:\n');

    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(data);
    }

    console.log('\n========================================\n');

    // Determine result
    if (res.statusCode === 200) {
      console.log('✅ LOGIN SUCCESSFUL!\n');
    } else {
      console.log('❌ LOGIN FAILED\n');
    }
  });
});

req.on('error', e => {
  console.error('\n❌ ERROR:', e.message);
  console.log('\nMake sure Backend is running on port 3001\n');
});

console.log('Testing login with:');
console.log('  Email: admin@alawael.com');
console.log('  Password: Admin@123456\n');

req.write(loginData);
req.end();
