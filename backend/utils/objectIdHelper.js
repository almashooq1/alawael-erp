/**
 * Helper utilities for handling ObjectId conversions safely
 * Especially useful for test mode where userId might be 'mock_tester'
 */

const mongoose = require('mongoose');

/**
 * Safely convert a value to ObjectId if possible
 * Returns null if the value is 'mock_tester' or invalid
 * @param {any} value - The value to convert
 * @returns {ObjectId|null|string} - ObjectId if valid and not mock, null if mock or invalid, original string if already valid
 */
function toObjectIdSafe(value) {
  // Skip mock_tester and return null
  if (value === 'mock_tester' || (typeof value === 'object' && value === null)) {
    return null;
  }

  // If it's already an ObjectId, return it
  if (mongoose.Types.ObjectId.isValid(value)) {
    // If it's a valid hex string of length 24, convert to ObjectId
    if (typeof value === 'string' && value.length === 24) {
      try {
        return new mongoose.Types.ObjectId(value);
      } catch (e) {
        return null;
      }
    }
    // If it's already an ObjectId instance, return it
    if (value instanceof mongoose.Types.ObjectId) {
      return value;
    }
    // If it's an object with _id, try to return that
    if (typeof value === 'object' && value._id) {
      return toObjectIdSafe(value._id);
    }
  }

  return null;
}

/**
 * Extract a safe userId that handles both real and test users
 * @param {any} userObj - The user object or userId value
 * @returns {ObjectId|null|string} - Safe userId for database operations
 */
function extractSafeUserId(userObj) {
  if (!userObj) return null;

  // If it's a string
  if (typeof userObj === 'string') {
    return toObjectIdSafe(userObj);
  }

  // If it's an object, try to get id or _id
  if (typeof userObj === 'object') {
    const userId = userObj.id || userObj._id;
    return toObjectIdSafe(userId);
  }

  return null;
}

/**
 * Check if a userId is a mock test user
 * @param {any} userId - The userId to check
 * @returns {boolean} - True if it's a mock test user
 */
function isMockUser(userId) {
  return (
    userId === 'mock_tester' ||
    (typeof userId === 'object' && userId && userId.toString() === 'mock_tester')
  );
}

module.exports = {
  toObjectIdSafe,
  extractSafeUserId,
  isMockUser,
};
