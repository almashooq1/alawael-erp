#!/usr/bin/env node
/* eslint-disable no-unused-vars, no-undef, no-empty, prefer-const, no-constant-condition, no-unused-expressions */

/**
 * ALAWAEL ERP - HTTPS Proxy Server
 * Reverse proxy with SSL/TLS for production
 *
 * Usage:
 *   pm2 start https-proxy.js --name "alawael-https"
 *   pm2 save
 *
 * Access:
 *   https://localhost:443 (HTTPS)
 *   http://localhost:80 → https://localhost:443 (redirect)
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Configuration
const CONFIG = {
  TARGET_URL: 'http://localhost:3001',
  HTTPS_PORT: 8443, // Use unprivileged port (requires admin for 443)
  HTTP_PORT: 8080, // Use unprivileged port (requires admin for 80)
  CERT_PATH: path.join(__dirname, 'certs/server.cert.pem'),
  KEY_PATH: path.join(__dirname, 'certs/server.key.pem'),
  TIMEOUT: 30000,
};

// Enhanced logging
function log(level, message, data = '') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;
  console.log(`${prefix} ${message}`, data);
}

// Check certificates exist
function checkCertificates() {
  const certDir = path.dirname(CONFIG.CERT_PATH);

  if (!fs.existsSync(CONFIG.CERT_PATH) || !fs.existsSync(CONFIG.KEY_PATH)) {
    log('ERROR', 'SSL certificates not found!');
    log('INFO', 'Generate certificates using:');
    log('INFO', '  npm run generate:cert');
    process.exit(1);
  }

  log('INFO', 'SSL certificates found');
  return {
    key: fs.readFileSync(CONFIG.KEY_PATH, 'utf8'),
    cert: fs.readFileSync(CONFIG.CERT_PATH, 'utf8'),
  };
}

// Create HTTP to HTTPS redirector on port 80
function createHttpRedirector() {
  const server = http.createServer((req, res) => {
    const host = req.headers.host?.split(':')[0] || 'localhost';
    const redirectUrl = `https://${host}${req.url}`;

    res.writeHead(301, {
      Location: redirectUrl,
      'Content-Type': 'text/plain',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    });
    res.end(`Redirecting to ${redirectUrl}`);

    log('DEBUG', `HTTP Redirect: ${req.method} ${req.url} → ${redirectUrl}`);
  });

  return server;
}

// Create HTTPS reverse proxy
function createHttpsProxy(options) {
  const express = require('express');
  const app = express();

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });

  // Trust proxy (for rate limiting)
  app.set('trust proxy', 1);

  // Health endpoint (no proxy)
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'https-proxy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Proxy all other routes to :3001
  app.use('/', (req, res, next) => {
    const proxyMiddleware = createProxyMiddleware({
      target: CONFIG.TARGET_URL,
      changeOrigin: true,
      pathRewrite: {
        '^/api/v1/': '/api/v1/',
      },
      onError: (err, req, res) => {
        log('ERROR', `Proxy error: ${err.message}`);
        res.status(503).json({
          error: 'Service temporarily unavailable',
          message: 'Backend service is not responding',
        });
      },
      onProxyRes: (proxyRes, req, res) => {
        // Add security headers to proxied responses
        proxyRes.headers['X-Proxy-By'] = 'ALAWAEL-HTTPS-Proxy';
      },
      timeout: CONFIG.TIMEOUT,
      proxyTimeout: CONFIG.TIMEOUT,
    });

    proxyMiddleware(req, res, next);
  });

  return app;
}

// Main execution
async function startServers() {
  try {
    log('INFO', '====================================');
    log('INFO', 'ALAWAEL ERP - HTTPS Proxy Starting');
    log('INFO', '====================================');

    // Check certificates
    const tlsOptions = checkCertificates();

    // Create HTTPS proxy
    const app = createHttpsProxy(tlsOptions);
    const httpsServer = https.createServer(tlsOptions, app);

    // Create HTTP redirector
    const httpServer = createHttpRedirector();

    // Start HTTP server (port 80)
    httpServer.listen(CONFIG.HTTP_PORT, () => {
      log('INFO', `HTTP Redirect Server running on port ${CONFIG.HTTP_PORT}`);
      log('INFO', `All HTTP traffic will redirect to HTTPS`);
    });

    // Start HTTPS server (port 443)
    httpsServer.listen(CONFIG.HTTPS_PORT, () => {
      log('INFO', `HTTPS Proxy Server running on port ${CONFIG.HTTPS_PORT}`);
      log('INFO', `Forwarding requests to ${CONFIG.TARGET_URL}`);
      log('INFO', `Service ready for connections!`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      log('INFO', 'SIGTERM received, shutting down gracefully...');
      httpsServer.close(() => {
        log('INFO', 'HTTPS server closed');
        process.exit(0);
      });
      httpServer.close(() => {
        log('INFO', 'HTTP redirect server closed');
      });
    });

    // Handle errors
    httpsServer.on('error', err => {
      if (err.code === 'EACCES') {
        log('ERROR', `Port ${CONFIG.HTTPS_PORT} requires admin/sudo privileges`);
      } else if (err.code === 'EADDRINUSE') {
        log('ERROR', `Port ${CONFIG.HTTPS_PORT} is already in use`);
      } else {
        log('ERROR', `Server error: ${err.message}`);
      }
      process.exit(1);
    });

    httpServer.on('error', err => {
      if (err.code === 'EACCES') {
        log('ERROR', `Port ${CONFIG.HTTP_PORT} requires admin/sudo privileges`);
      } else if (err.code === 'EADDRINUSE') {
        log('ERROR', `Port ${CONFIG.HTTP_PORT} is already in use`);
      } else {
        log('ERROR', `Redirect server error: ${err.message}`);
      }
      process.exit(1);
    });
  } catch (error) {
    log('ERROR', `Failed to start servers: ${error.message}`);
    process.exit(1);
  }
}

// Start the servers
if (require.main === module) {
  startServers();
}

module.exports = { startServers, CONFIG };
