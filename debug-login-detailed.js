// Comprehensive login debugging
const http = require('http');

console.log(`
╔═══════════════════════════════════════════════════╗
║      DETAILED LOGIN DEBUGGING - START             ║
╚═══════════════════════════════════════════════════╝
`);

// Test 1: Health Check
console.log('\n[TEST 1] Backend Health Check...\n');
const healthCheck = http.request(
  {
    hostname: 'localhost',
    port: 3001,
    path: '/health',
    method: 'GET',
  },
  res => {
    let data = '';
    res.on('data', chunk => (data += chunk));
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', data);

      // Test 2: Login attempt
      setTimeout(() => {
        console.log('\n[TEST 2] Login Attempt...\n');
        testLogin();
      }, 1000);
    });
  },
);

healthCheck.on('error', err => {
  console.error('❌ Health check failed:', err.message);
  process.exit(1);
});

healthCheck.end();

function testLogin() {
  const loginData = JSON.stringify({
    email: 'admin@alawael.com',
    password: 'Admin@123456',
  });

  const loginReq = http.request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length,
      },
    },
    res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Headers:', res.headers);
        console.log('\nFull Response Body:');
        console.log(data);

        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            console.log('\n✅ LOGIN SUCCESSFUL!');
            console.log('Token:', json.data.accessToken);
            console.log('User:', json.data.user);
          } catch (e) {
            console.log('Failed to parse response');
          }
        } else {
          console.log('\n❌ LOGIN FAILED');
          try {
            const json = JSON.parse(data);
            console.log('Error message:', json.message);
          } catch (e) {
            console.log('Response:', data);
          }
        }

        // Check database
        setTimeout(() => {
          console.log('\n[TEST 3] Check In-Memory Database...\n');
          checkDatabase();
        }, 1000);
      });
    },
  );

  loginReq.on('error', err => {
    console.error('❌ Login request failed:', err.message);
    process.exit(1);
  });

  loginReq.write(loginData);
  loginReq.end();
}

function checkDatabase() {
  // Load User model to check database state
  try {
    const User = require('./backend/models/User.memory.js');
    console.log('User model loaded successfully');
    console.log('Checking admin user...');

    setTimeout(async () => {
      try {
        const adminUser = await User.findOne({ email: 'admin@alawael.com' });
        if (adminUser) {
          console.log('✅ Admin user found in database');
          console.log('Email:', adminUser.email);
          console.log('Role:', adminUser.role);
          console.log('Has password:', !!adminUser.password);
        } else {
          console.log('❌ Admin user NOT found in database');
        }
      } catch (err) {
        console.log('Error checking database:', err.message);
      }
    }, 100);
  } catch (err) {
    console.log('Could not load User model:', err.message);
  }
}
