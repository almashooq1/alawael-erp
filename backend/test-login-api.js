// Test Login via API
const https = require('http');

const testUsers = [
  { email: 'admin@alawael.com', password: 'Admin@123456', name: 'Admin' },
  { email: 'hr@alawael.com', password: 'Admin@123456', name: 'HR' },
  { email: 'finance@alawael.com', password: 'Admin@123456', name: 'Finance' },
];

async function testLogin(user) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: user.email,
      password: user.password,
    });

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({ status: res.statusCode, data: JSON.parse(data), user });
      });
    });

    req.on('error', error => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Login API:\n');

  for (const user of testUsers) {
    try {
      const result = await testLogin(user);
      if (result.status === 200 && result.data.success) {
        console.log(`✅ ${user.name} (${user.email}): LOGIN SUCCESS`);
        console.log(`   Token: ${result.data.data.accessToken.substring(0, 30)}...`);
      } else {
        console.log(`❌ ${user.name} (${user.email}): LOGIN FAILED`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Message: ${result.data.message}`);
      }
    } catch (error) {
      console.log(`❌ ${user.name} (${user.email}): ERROR`);
      console.log(`   ${error.message}`);
    }
    console.log('');
  }

  console.log('✅ All tests completed!');
}

runTests();
