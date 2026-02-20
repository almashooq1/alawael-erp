const express = require('express');

console.log('Testing setupRoutes...\n');

try {
  const setupRoutes = require('./api/routes/setupRoutes');
  console.log('✓ setupRoutes module loaded');

  const app = express();
  setupRoutes(app);
  console.log('✓ setupRoutes executed successfully\n');
  console.log('All routes configured successfully!');
  process.exit(0);
} catch (error) {
  console.error('✗ Error:', error.message);
  console.error('\nStack:', error.stack.split('\n').slice(0, 5).join('\n'));
  process.exit(1);
}
