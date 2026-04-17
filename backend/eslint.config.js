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
    ignores: [
      'node_modules/**',
      'uploads/**',
      'coverage/**',
      'dist/**',
      'build/**',
      '_archived/**', // historical / dead code — not linted
      'tests/gen/**', // auto-generated tests
      'tests/load/**', // k6 load tests use ESM (different parser)
      'tests/tests/**', // legacy nested test dirs
    ],
  },

  // ── Browser / service-worker context ─────────────────────────────────
  {
    files: ['public/**/*.js', 'test-utils/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
        ...globals.node,
        ...globals.jest,
      },
    },
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
        fail: 'readonly', // legacy Jest ≤26 global still used in a few tests
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-process-exit': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Treat stylistic / legacy issues as warnings so the pre-push gate
      // focuses on real defects. They remain visible in editor + CI.
      'no-useless-catch': 'warn',
      'no-constant-binary-expression': 'warn',
      'no-useless-escape': 'warn',
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
