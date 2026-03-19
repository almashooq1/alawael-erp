/**
 * Centralized API Configuration
 * إعدادات API المركزية
 *
 * Single source of truth for all API URLs and constants.
 * Import from here instead of defining these in each file.
 */

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
export const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';
export const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3000';
