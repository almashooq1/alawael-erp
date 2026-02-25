/**
 * WebSocket Service
 * Minimal WebSocket service for real-time features
 */

module.exports = {
  initialize: (server) => {
    // Minimal initialization for testing
    return {
      on: () => {},
      emit: () => {},
      broadcast: () => {},
    };
  },
  getIO: () => {
    return {
      on: () => {},
      emit: () => {},
      broadcast: () => {},
    };
  }
};
