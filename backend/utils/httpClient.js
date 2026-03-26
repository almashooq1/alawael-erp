/**
 * Shared HTTP Client — عميل HTTP موحد مع حدود زمنية
 *
 * All outbound HTTP calls MUST use this client to guarantee:
 *  1. Default timeout (prevents event-loop hangs on external services)
 *  2. Consistent User-Agent header
 *  3. Single place to add circuit-breakers, retries, or logging later
 *
 * Usage:
 *   const http = require('../utils/httpClient');
 *   const res  = await http.get('https://api.example.com/data');
 *   // Override timeout per-call:
 *   const res2 = await http.post(url, body, { timeout: 5000 });
 */

'use strict';

const axios = require('axios');

const DEFAULT_TIMEOUT = 15_000; // 15 seconds

const httpClient = axios.create({
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'User-Agent': 'AlAwael-ERP/1.0',
  },
  // Throw only on network errors; let callers handle HTTP 4xx/5xx
  validateStatus: null,
});

module.exports = httpClient;
