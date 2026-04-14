'use strict';
/**
 * @deprecated — Split into backend/models/attendance/ (7 individual model files).
 * Kept as a backward-compatible barrel export so existing requires keep working.
 * Migrate callers to: const { AttendanceRecord } = require('../models/attendance/index');
 *
 * NOTE: Uses explicit './attendance/index' path (not './attendance') to avoid Windows
 * case-insensitive collision with the existing Attendance.js file in this directory.
 */
module.exports = require('./attendance/index');
