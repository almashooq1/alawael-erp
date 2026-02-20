// Direct route testing
const express = require('express');
const http = require('http');

const app = express();
app.use(express.json());

// Load the router
const supplyChainRouter = require('./routes/supplyChain.routes');

// Mount it
app.use('/api/supply-chain', supplyChainRouter);

console.log('✅ Router mounted');
console.log('Routes in router:', supplyChainRouter.stack.length);

// Start server
const server = http.createServer(app);
server.listen(3009, () => {
  console.log('Test server running on port 3009');
  
  // Test the route after a delay
  setTimeout(() => {
    const { get } = http;
    get('http://localhost:3009/api/supply-chain/status', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response:`, JSON.parse(data));
        server.close();
        process.exit(0);
      });
    }).on('error', (err) => {
      console.error('Request error:', err.message);
      server.close();
      process.exit(1);
    });
  }, 500);
});
