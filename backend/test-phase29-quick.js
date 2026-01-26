const http = require('http');

console.log('🧪 Testing Phase 29-33 Endpoints...\n');

function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', error => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

async function runTests() {
  const tests = [
    { name: 'Health', path: '/health' },
    { name: 'Phase 29-33 Index', path: '/api/phases-29-33' },
    { name: 'AI LLM Providers', path: '/api/phases-29-33/ai/llm/providers' },
    { name: 'HTML Docs', path: '/phase29-33-docs.html' },
  ];

  for (const test of tests) {
    try {
      console.log(`Testing ${test.name}...`);
      const result = await testEndpoint(test.path);
      console.log(`✅ ${test.name}: ${result.status}`);
      if (result.status === 200 && test.path === '/api/phases-29-33') {
        const json = JSON.parse(result.body);
        console.log(`   Total Endpoints: ${json.totalEndpoints}`);
        console.log(`   Success: ${json.success}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
    }
    console.log('');
  }
}

runTests()
  .then(() => {
    console.log('🎉 All tests completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running tests:', error);
    process.exit(1);
  });
