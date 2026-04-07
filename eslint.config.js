/**
 * Root ESLint Flat Config (ESLint v10+)
 *
 * Composes backend and frontend configs with proper path scoping.
 * Used by lint-staged (pre-commit) when running `eslint --fix` on staged files.
 */

const backendConfig = require('./backend/eslint.config.js');
const frontendConfig = require('./frontend/eslint.config.js');

// Helper: prefix all `files` patterns in a config array with a directory scope
function scopeConfig(configArray, dirPrefix) {
  return configArray.map(entry => {
    const scoped = { ...entry };

    // Scope ignores
    if (scoped.ignores && !scoped.files) {
      scoped.ignores = scoped.ignores.map(p => `${dirPrefix}/${p}`);
      return scoped;
    }

    // Scope file patterns
    if (scoped.files) {
      scoped.files = scoped.files.map(p => `${dirPrefix}/${p}`);
    } else {
      // If no files specified, apply to all files in the directory
      scoped.files = [`${dirPrefix}/**/*`];
    }

    return scoped;
  });
}

module.exports = [
  // ─── Global ignores ────────────────────────────────────────────────
  {
    ignores: [
      'node_modules/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '.git/**',
      '*.log',
      // Non-JS project directories
      'ops/**',
      'deploy/**',
      'monitoring/**',
      'mobile/**',
      'rehab-erp/**',
      'secretary_ai/**',
      'python-ml/**',
      'services/**',
      'gateway/**',
      'graphql/**',
      'whatsapp/**',
      'intelligent-agent/**',
      'dashboard/**',
      'finance-module/**',
      'supply-chain-management/**',
    ],
  },

  // ─── Backend config (scoped to backend/**) ─────────────────────────
  ...scopeConfig(backendConfig, 'backend'),

  // ─── Frontend config (scoped to frontend/**) ──────────────────────
  ...scopeConfig(frontendConfig, 'frontend'),
];
