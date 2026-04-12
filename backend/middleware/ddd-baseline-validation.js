'use strict';
/**
 * DDD Baseline Validation Middleware
 * ═══════════════════════════════════
 * Provides automatic validation for common patterns across all DDD routes:
 *
 * 1. Route params named "id" or ending with "Id" → must be valid MongoDB ObjectId
 * 2. POST / PUT / PATCH body → must not be empty
 * 3. Query params "page" and "limit" → must be positive integers (if present)
 * 4. Query params "from" and "to" (date ranges) → must be valid ISO dates (if present)
 *
 * Applied automatically by ddd-loader.js to all 125 DDD route modules.
 * Zero per-endpoint configuration required — works as a safety net.
 */

const mongoose = require('mongoose');

/**
 * Checks if a string is a valid MongoDB ObjectId
 * @param {string} val
 * @returns {boolean}
 */
function isValidObjectId(val) {
  return mongoose.Types.ObjectId.isValid(val) && String(new mongoose.Types.ObjectId(val)) === val;
}

/**
 * Baseline validation middleware
 * Runs BEFORE each route handler. Rejects obviously invalid requests early.
 */
function dddBaselineValidation(req, res, next) {
  // ── 1. Validate ObjectId params ─────────────────────────────────────────
  if (req.params) {
    for (const [key, value] of Object.entries(req.params)) {
      // Match "id", "Id", "*Id" patterns (e.g., "id", "userId", "beneficiaryId")
      if ((key === 'id' || /Id$/.test(key)) && value) {
        if (!isValidObjectId(value)) {
          return res.status(400).json({
            success: false,
            error: `Invalid ${key}: must be a valid ObjectId`,
          });
        }
      }
    }
  }

  // ── 2. Validate non-empty body on write methods ─────────────────────────
  const writeMethods = ['POST', 'PUT', 'PATCH'];
  if (writeMethods.includes(req.method)) {
    // Skip if route path suggests an action (send, cancel, refund, approve, reject)
    // These often have empty or minimal bodies that are intentional
    const actionPattern =
      /\/(send|cancel|refund|approve|reject|archive|restore|toggle|activate|deactivate|verify|publish|unpublish|complete|close|reopen)(\/|$)/i;
    const isAction = actionPattern.test(req.originalUrl || req.url);

    if (!isAction && (!req.body || Object.keys(req.body).length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Request body cannot be empty',
      });
    }
  }

  // ── 3. Validate pagination query params ─────────────────────────────────
  if (req.query) {
    const { page, limit } = req.query;

    if (page !== undefined) {
      const pageNum = Number(page);
      if (!Number.isInteger(pageNum) || pageNum < 1) {
        return res.status(400).json({
          success: false,
          error: 'page must be a positive integer',
        });
      }
    }

    if (limit !== undefined) {
      const limitNum = Number(limit);
      if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 500) {
        return res.status(400).json({
          success: false,
          error: 'limit must be an integer between 1 and 500',
        });
      }
    }

    // ── 4. Validate date range params ───────────────────────────────────
    const { from, to } = req.query;
    if (from !== undefined && isNaN(Date.parse(from))) {
      return res.status(400).json({
        success: false,
        error: 'from must be a valid ISO date',
      });
    }
    if (to !== undefined && isNaN(Date.parse(to))) {
      return res.status(400).json({
        success: false,
        error: 'to must be a valid ISO date',
      });
    }
    if (from && to && new Date(from) > new Date(to)) {
      return res.status(400).json({
        success: false,
        error: 'from date must be before to date',
      });
    }
  }

  next();
}

module.exports = dddBaselineValidation;
