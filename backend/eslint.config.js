'use strict';
/**
 * Backend ESLint Flat Config (ESLint v10+)
 *
 * Mirrors the rules in .eslintrc.json but in flat config format.
 * Required by the root eslint.config.js which composes backend + frontend.
 */

const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  // ── Ignores ────────────────────────────────────────────────────────────
  {
    ignores: ['node_modules/**', 'uploads/**', 'coverage/**', 'dist/**', 'build/**'],
  },

  // ── Main backend rules ─────────────────────────────────────────────────
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-process-exit': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'prefer-const': 'warn',
      eqeqeq: ['warn', 'smart'],
      'no-var': 'warn',
      'no-throw-literal': 'error',
      'no-return-await': 'warn',
      'no-duplicate-imports': 'error',
      'no-template-curly-in-string': 'warn',
    },
  },
];
