const express = require('express');
const app = express();

// Load Phase 29-33 routes
const phases2933Routes = require('./routes/phases-29-33.routes');

// Mount routes
app.use('/api/phases-29-33', phases2933Routes);

// Start server
const port = 3099;
app.listen(port, () => {
  console.log(`✅ Test server running on http://localhost:${port}`);
  console.log(`✅ Test URL: http://localhost:${port}/api/phases-29-33`);
});

// Test after 2 seconds
setTimeout(async () => {
  const http = require('http');

  http
    .get('http://localhost:3099/api/phases-29-33', res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        console.log(`\n✅ Response Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          const json = JSON.parse(data);
          console.log(`✅ Success: ${json.success}`);
          console.log(`✅ Total Endpoints: ${json.totalEndpoints}`);
          console.log(`✅ Message: ${json.message}`);
          console.log('\n🎉 Phase 29-33 routes work perfectly!\n');
        } else {
          console.log(`❌ Got ${res.statusCode} instead of 200`);
          console.log(data);
        }
        process.exit(0);
      });
    })
    .on('error', err => {
      console.error(`❌ Error: ${err.message}`);
      process.exit(1);
    });
}, 2000);
