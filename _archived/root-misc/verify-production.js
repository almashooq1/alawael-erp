const http = require('http');

console.log('🔍 Testing Production Server Endpoints...\n');

function testEndpoint(path, name) {
  return new Promise((resolve) => {
    http.get('http://localhost:3009' + path, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const success = res.statusCode === 200;
        console.log(`${success ? '✅' : '❌'} ${name}: ${res.statusCode}`);
        resolve(success);
      });
    }).on('error', (e) => {
      console.log(`❌ ${name}: Connection Error - ${e.message}`);
      resolve(false);
    });
  });
}

async function runTests() {
  const results = [];
  
  console.log('Testing Critical Endpoints:\n');
  results.push(await testEndpoint('/api/supply-chain/suppliers', 'Suppliers'));
  results.push(await testEndpoint('/api/supply-chain/inventory', 'Inventory'));
  results.push(await testEndpoint('/api/supply-chain/orders', 'Orders'));
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n📊 Results: ${passed}/${total} endpoints responding\n`);
  
  if (passed === total) {
    console.log('✨ All endpoints operational - Ready for production!');
    process.exit(0);
  } else {
    console.log('⚠️  Some endpoints not responding');
    process.exit(1);
  }
}

// Wait for server to be ready, then test
setTimeout(runTests, 2000);
