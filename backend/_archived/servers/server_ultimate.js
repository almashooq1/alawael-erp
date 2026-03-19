/* eslint-disable no-unused-vars */
/**
 * Server Ultimate - Enhanced Server Wrapper
 *
 * This file provides an enhanced wrapper around the main Express application.
 * It exports the app instance for use in testing and other server configurations.
 *
 * @module server_ultimate
 */

const app = require('./app.js');

// Export the app instance
module.exports = { app };

// If running directly, start the server
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server Ultimate running on port ${PORT}`);
  });
}
