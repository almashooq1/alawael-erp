// Minimal test app with just migrations router
const express = require('express');
const app = express();

app.use(express.json());

// Load migrations router
const migrationRouter = require('./routes/migrations');

console.log('=== TESTING MIGRATIONS ROUTER IN MINIMAL APP ===\n');
console.log('Migration router type:', typeof migrationRouter);
console.log('Has stack:', migrationRouter.stack ? 'YES' : 'NO');
console.log('Routes count:', migrationRouter.stack ? migrationRouter.stack.length : 0);

// Register the router (same as in app.js)
app.use('/api/migrations', migrationRouter);

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint works' });
});

// 404 handler (same as in app.js)
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

const PORT = 3009;
app.listen(PORT, () => {
  console.log(`\n✅ Test server running on port ${PORT}`);
  console.log('Try: http://localhost:3009/api/migrations/plan');
  console.log('Try: http://localhost:3009/test');
});
