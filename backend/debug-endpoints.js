const http = require('http');

function test(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`\n${path}:`);
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
      console.log(`\n${path}: ERROR - ${e.message}`);
      resolve();
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing SSO endpoints...\n');
  
  await test('/health');
  await test('/api/health');
  await test('/api/sso/status');
  await test('/api/sso/login');
  
  process.exit(0);
}

setTimeout(runTests, 500);
