/**
 * Test Phase 29-33 Routes Direct
 */
const express = require('express');
const app = express();

app.use(express.json());

// Load Phase 29-33 routes
const phases2933Routes = require('./routes/phases-29-33.routes');
app.use('/api/phases-29-33', phases2933Routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

const PORT = 3005;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Test server running on http://localhost:${PORT}`);
  console.log(`Test: http://localhost:${PORT}/api/phases-29-33/ai/llm/providers`);
});
