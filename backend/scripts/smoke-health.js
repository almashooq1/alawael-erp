/* eslint-disable no-unused-vars */
// Lightweight smoke test for backend /health endpoint
const http = require('http');

(async () => {
  try {
    const { app } = require('../server');
    if (!app) {
      console.error('❌ Failed to import Express app from server.js');
      process.exit(1);
    }

    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const url = `http://127.0.0.1:${address.port}/health`;
      console.log(`🔎 Testing health at ${url}`);

      http
        .get(url, res => {
          let data = '';
          res.on('data', chunk => (data += chunk));
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              console.log('✅ Health Response:', json);
              server.close(() => process.exit(0));
            } catch (e) {
              console.error('❌ Failed to parse health response:', e.message);
              console.error('Raw response:', data);
              server.close(() => process.exit(1));
            }
          });
        })
        .on('error', err => {
          console.error('❌ HTTP error while fetching /health:', err.message);
          server.close(() => process.exit(1));
        });
    });

    server.on('error', err => {
      console.error('❌ Error starting temporary server:', err.message);
      process.exit(1);
    });
  } catch (err) {
    console.error('❌ Import error (server.js):', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
