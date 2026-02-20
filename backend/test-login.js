const http = require('http');

function testLogin() {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      email: 'test@example.com',
      password: 'Test@123456'
    });

    const options = {
      hostname: 'localhost',
      port: 3002,
      path: '/api/sso/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body.length
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`\nPOST /api/sso/login:`);
        console.log(`Status: ${res.statusCode}`);
        try {
          console.log(`Body:`, JSON.parse(data));
        } catch (e) {
          console.log(`Body:`, data);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log(`ERROR: ${e.message}`);
      resolve();
    });

    req.write(body);
    req.end();
  });
}

setTimeout(testLogin, 500);
