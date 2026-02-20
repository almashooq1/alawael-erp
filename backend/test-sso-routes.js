const express = require('express');
const app = express();

console.log('Loading SSO router...');
const ssoRouter = require('./routes/sso.routes');

console.log('Router type:', typeof ssoRouter);
console.log('Router stack length:', ssoRouter.stack.length);

console.log('\nFirst 10 routes in SSO router:');
ssoRouter.stack.slice(0, 10).forEach((layer, i) => {
  if (layer.route) {
    const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase()).join(',');
    console.log(`  ${i}: ${methods} ${layer.route.path}`);
  } else if (layer.name) {
    console.log(`  ${i}: [middleware] ${layer.name}`);
  }
});

// Register the router
app.use('/api/sso', ssoRouter);

// Start server
const server = app.listen(4005, () => {
  console.log('\n✅ Server listening on port 4005');
  
  // Test /api/sso/status
  const http = require('http');
  setTimeout(() => {
    const options = {
      hostname: 'localhost',
      port: 4005,
      path: '/api/sso/status',
      method: 'GET'
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data +=chunk);
      res.on('end', () => {
        console.log(`\nTest Result for /api/sso/status:`);
        console.log(`Status Code: ${res.statusCode}`);
        console.log(`Response: ${data.substring(0, 200)}`);
        server.close();
        process.exit(0);
      });
    });
    
    req.on('error', (e) => {
      console.error(`Error: ${e.message}`);
      server.close();
      process.exit(1);
    });
    
    req.end();
  }, 300);
});
