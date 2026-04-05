/**
 * Centralized API Configuration
 * إعدادات API المركزية
 *
 * Single source of truth for all API URLs and constants.
 * Import from here instead of defining these in each file.
 */

// Runtime detection: force relative URL on HTTPS to prevent mixed-content blocking
const _isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
export const API_BASE_URL = _isHttps
  ? '/api/v1'
  : process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Auto-detect socket/WS URLs from current origin in production
const _detectOrigin = () =>
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
const _detectWs = () => {
  if (typeof window === 'undefined') return 'ws://localhost:3001';
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}`;
};

export const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || _detectOrigin();
export const WS_URL = process.env.REACT_APP_WS_URL || _detectWs();
