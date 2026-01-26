/**
 * Test Server - Minimal Express Server
 */

const express = require('express');
const app = express();

console.log('🔧 Setting up routes...');

// Test endpoints
app.get('/test-first', (req, res) => {
  console.log('✅ /test-first called');
  res.json({ success: true, message: 'Test endpoint works!' });
});

app.get('/phases-29-33', (req, res) => {
  console.log('✅ /phases-29-33 called');
  res.json({ success: true, message: 'Phase 29-33 works!', totalEndpoints: 116 });
});

app.get('/health', (req, res) => {
  console.log('✅ /health called');
  res.json({ status: 'OK', message: 'Test server running' });
});

console.log('✅ Routes configured');

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Test server running on http://localhost:${PORT}`);
  console.log('📋 Endpoints:');
  console.log(`  - http://localhost:${PORT}/health`);
  console.log(`  - http://localhost:${PORT}/test-first`);
  console.log(`  - http://localhost:${PORT}/phases-29-33\n`);
});
