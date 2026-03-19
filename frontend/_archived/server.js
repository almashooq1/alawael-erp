const express = require('express');
const path = require('path');
const app = express();
const PORT = 3002;

const buildPath = path.join(__dirname, 'build');

// Serve static files
app.use(express.static(buildPath));

// Handle SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n✓ Frontend running on http://localhost:${PORT}`);
  console.log(`✓ Build directory: ${buildPath}`);
  console.log(`✓ SPA routing enabled\n`);
});
