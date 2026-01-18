#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3002;
const BUILD_DIR = path.join(__dirname, 'build');

const server = http.createServer((req, res) => {
  try {
    let filePath = path.join(BUILD_DIR, req.url === '/' ? 'index.html' : req.url);

    // Security: Prevent directory traversal
    if (!filePath.startsWith(BUILD_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    // Check if path exists
    if (!fs.existsSync(filePath)) {
      // For SPA routing, serve index.html for all routes
      if (path.extname(filePath) === '') {
        filePath = path.join(BUILD_DIR, 'index.html');
      } else {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
    }

    // Check if it's a directory
    if (fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    // Read and serve the file
    const contentType =
      {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm',
      }[path.extname(filePath)] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Frontend server running at http://localhost:${PORT}\n`);
  console.log(`📁 Serving from: ${BUILD_DIR}\n`);
  // Keep process alive
  setInterval(() => {}, 1000);
});

server.on('error', err => {
  if (err.code !== 'EADDRINUSE') {
    console.error('Server error:', err);
    process.exit(1);
  }
});

process.on('SIGINT', () => {
  console.log('\n\n🛑 Server stopped');
  process.exit(0);
});

process.on('uncaughtException', err => {
  console.error('Uncaught exception:', err);
  // Don't exit, just log
});
process.on('exit', code => {
  console.error(`\n⚠️ Process exiting with code: ${code}`);
});
