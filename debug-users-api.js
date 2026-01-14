// Debug Users API
const http = require('http');

async function test() {
  // First get token
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
            if (json.success) {
              const token = json.data.accessToken;
              console.log('✅ Got token');
              console.log(`Token: ${token.substring(0, 20)}...\n`);

              // Now test /api/users
              const usersReq = http.request(
                {
                  hostname: 'localhost',
                  port: 3001,
                  path: '/api/users',
                  method: 'GET',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                },
                res => {
                  let data2 = '';
                  res.on('data', chunk => (data2 += chunk));
                  res.on('end', () => {
                    console.log(`Status: ${res.statusCode}`);
                    console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
                    console.log(`Response: ${data2}`);
                    resolve();
                  });
                },
              );

              usersReq.on('error', err => {
                console.error('Request error:', err.message);
                resolve();
              });

              usersReq.end();
            }
          } catch (e) {
            console.error('Login failed:', e);
            resolve();
          }
        });
      },
    );

    loginReq.write(loginData);
    loginReq.end();
  });
}

test().catch(console.error);
