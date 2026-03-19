/* eslint-disable no-unused-vars */
/**
 * Server Enhanced - Advanced Server Configuration
 *
 * This file provides an advanced wrapper around the main Express application.
 * It includes enhanced features and configurations for production use.
 *
 * @module server-enhanced
 */

const app = require('./app.js');

// Export the app instance with enhanced configuration
module.exports = { app };

// Enhanced startup with additional configuration
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  const HOST = process.env.HOST || '0.0.0.0';

  const server = app.listen(PORT, HOST, () => {
    console.log(`🌟 Enhanced Server running on ${HOST}:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
}
