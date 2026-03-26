/**
 * Frontend Environment Validation
 * التحقق من متغيرات البيئة عند بدء التطبيق
 *
 * Validates REACT_APP_* env vars on app startup.
 * Throws in production if required vars are missing;
 * warns in development so devs can keep working.
 */

const REQUIRED = [
  {
    key: 'REACT_APP_API_URL',
    label: 'Backend API URL',
    validate: v => /^(https?:\/\/.+|\/\w+)/i.test(v),
    hint: 'Must be a valid HTTP(S) URL or a relative path, e.g. http://localhost:3001/api or /api',
  },
];

const OPTIONAL = [
  {
    key: 'REACT_APP_SOCKET_URL',
    label: 'Socket.IO URL',
    validate: v => /^(https?|wss?):\/\/.+/i.test(v),
    hint: 'Auto-detected from window.location if omitted',
  },
  {
    key: 'REACT_APP_WS_URL',
    label: 'WebSocket URL',
    validate: v => /^wss?:\/\/.+/i.test(v),
    hint: 'Auto-detected from window.location if omitted',
  },
  {
    key: 'REACT_APP_API_TIMEOUT',
    label: 'API Timeout (ms)',
    validate: v => /^\d+$/.test(v) && Number(v) > 0,
    hint: 'Must be a positive integer in milliseconds',
  },
  {
    key: 'REACT_APP_SENTRY_DSN',
    label: 'Sentry DSN',
    validate: v => /^https:\/\/.+@.+\.ingest\.sentry\.io\/.+/.test(v),
    hint: 'Sentry DSN URL format',
  },
];

/**
 * Run environment validation.
 * Call once during app initialization (e.g. in index.js before ReactDOM.render).
 */
export function validateFrontendEnv() {
  const errors = [];
  const warnings = [];
  const isProd = process.env.NODE_ENV === 'production';

  // Check required vars
  for (const { key, label, validate, hint } of REQUIRED) {
    const value = process.env[key];
    if (!value || value.trim() === '') {
      errors.push(`❌ Missing required env var: ${key} (${label}) — ${hint}`);
    } else if (validate && !validate(value)) {
      errors.push(`❌ Invalid ${key} (${label}): "${value}" — ${hint}`);
    }
  }

  // Check optional vars (warn only)
  for (const { key, label, validate, hint } of OPTIONAL) {
    const value = process.env[key];
    if (value && validate && !validate(value)) {
      warnings.push(`⚠️  Invalid ${key} (${label}): "${value}" — ${hint}`);
    }
  }

  // Report warnings
  if (warnings.length > 0) {
    console.warn(`[EnvValidation] ${warnings.length} warning(s):\n${warnings.join('\n')}`);
  }

  // Report errors
  if (errors.length > 0) {
    const msg = `[EnvValidation] ${errors.length} error(s):\n${errors.join('\n')}`;
    if (isProd) {
      // In production, throw to prevent serving a broken app
      throw new Error(msg);
    } else {
      // In dev, warn loudly but don't crash (allows local dev without .env)
      console.error(msg);
      console.info(
        '[EnvValidation] ℹ️  Running in development mode — defaults will be used. ' +
          'Set these vars in .env or .env.local to silence this warning.'
      );
    }
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.info('[EnvValidation] ✅ All environment variables validated');
  }
}

export default validateFrontendEnv;
