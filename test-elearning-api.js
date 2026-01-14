// Test elearning with proper authentication
const http = require('http');

const test = async () => {
  console.log('\n=== ELEARNING API TEST ===\n');

  // First, get a valid token
  console.log('Step 1: Get authentication token...');

  const loginData = JSON.stringify({
    email: 'admin@alawael.com',
    password: 'Admin@123456',
  });

  return new Promise(resolve => {
    const loginReq = http.request(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(loginData),
        },
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.success && json.data.accessToken) {
              console.log('✅ Token obtained\n');

              // Now test elearning API
              const token = json.data.accessToken;
              testElearningAPI(token, resolve);
            } else {
              console.error('❌ Failed to get token');
              resolve();
            }
          } catch (e) {
            console.error('❌ Invalid response:', data);
            resolve();
          }
        });
      },
    );

    loginReq.on('error', err => {
      console.error('❌ Login failed:', err.message);
      resolve();
    });

    loginReq.write(loginData);
    loginReq.end();
  });
};

function testElearningAPI(token, callback) {
  console.log('Step 2: Test /api/modules/elearning...\n');

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/modules/elearning',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  const req = http.request(options, res => {
    let data = '';
    res.on('data', chunk => (data += chunk));
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}\n`);

      try {
        const json = JSON.parse(data);
        if (res.statusCode === 200 && json.success) {
          console.log('✅ Elearning API Working!\n');
          console.log('Module Data:');
          console.log(
            JSON.stringify(
              {
                kpis: json.data.kpis.length + ' KPIs',
                items: json.data.items.length + ' courses',
                actions: json.data.actions.length + ' actions',
                statistics: json.data.statistics,
              },
              null,
              2,
            ),
          );
        } else {
          console.log('Response:', JSON.stringify(json, null, 2));
        }
      } catch (e) {
        console.log('Raw response:', data);
      }

      // Test other modules too
      testOtherModules(token, callback);
    });
  });

  req.on('error', err => {
    console.error('❌ Request failed:', err.message);
    callback();
  });

  req.end();
}

function testOtherModules(token, callback) {
  console.log('\n\nStep 3: Test other modules...\n');

  const modules = ['rehab', 'reports', 'finance', 'hr', 'crm', 'security'];
  let tested = 0;

  modules.forEach(module => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/modules/${module}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.success) {
            console.log(`✅ ${module.toUpperCase()}: OK (${json.data.items.length} items)`);
          } else {
            console.log(`❌ ${module.toUpperCase()}: Failed`);
          }
        } catch (e) {
          console.log(`⚠️  ${module.toUpperCase()}: Error parsing response`);
        }

        tested++;
        if (tested === modules.length) {
          callback();
        }
      });
    });

    req.on('error', err => {
      console.log(`❌ ${module.toUpperCase()}: Network error`);
      tested++;
      if (tested === modules.length) {
        callback();
      }
    });

    req.end();
  });
}

// Run test
test().catch(console.error);
