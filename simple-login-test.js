const http = require('http');

// Simple login test
const postData = JSON.stringify({
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
    'Content-Length': Buffer.byteLength(postData),
  },
};

console.log('\nTesting login...\n');

const req = http.request(options, res => {
  let data = '';

  res.on('data', chunk => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);

    if (res.statusCode === 200 || res.statusCode === 401) {
      try {
        const json = JSON.parse(data);
        console.log('\nResponse:');
        console.log(JSON.stringify(json, null, 2));

        if (res.statusCode === 200) {
          console.log('\n✅ LOGIN SUCCESSFUL!\n');
          process.exit(0);
        } else {
          console.log('\n❌ LOGIN FAILED\n');
          process.exit(1);
        }
      } catch (e) {
        console.log('Raw response:', data);
        process.exit(1);
      }
    } else {
      console.log('Unexpected status:', res.statusCode);
      console.log('Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', error => {
  console.error('Request error:', error.message);
  process.exit(1);
});

req.write(postData);
req.end();
