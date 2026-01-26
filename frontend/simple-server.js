const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3002;
const BUILD_DIR = path.join(__dirname, 'build');

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);

  let filePath = path.join(BUILD_DIR, req.url === '/' ? 'index.html' : req.url);

  // Prevent directory traversal
  if (!filePath.startsWith(BUILD_DIR)) {
    console.log(`403 Forbidden: ${filePath}`);
    res.writeHead(403);
    res.end();
    return;
  }

  // Try to serve the file
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };

    console.log(`200 Serving file: ${filePath}`);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    res.end(fs.readFileSync(filePath));
  } else {
    // For SPA - serve index.html for all routes
    const indexPath = path.join(BUILD_DIR, 'index.html');
    console.log(`SPA fallback for ${req.url} -> ${indexPath}`);
    if (fs.existsSync(indexPath)) {
      console.log(`200 Serving index.html for SPA route`);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(fs.readFileSync(indexPath));
    } else {
      console.log(`404 index.html not found at ${indexPath}`);
      res.writeHead(404);
      res.end('Not Found');
    }
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Build dir: ${BUILD_DIR}`);
  console.log(`SPA routing enabled`);
});
