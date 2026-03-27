/**
 * ESLint Flat Configuration — AlAwael ERP Backend
 *
 * Professional setup with security rules, strict mode for production code,
 * and relaxed rules for tests.
 */

'use strict';

const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  // Global ignores
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.git/**',
      '*.log',
      'package-lock.json',
      'yarn.lock',
      '.next/**',
      'out/**',
      // Generated files
      '**/*.min.js',
      '**/*.bundle.js',
      // Legacy files with encoding issues
      'erp_new_system/**',
      // Circular symlink issue
      'intelligent-agent/**',
      // Dead-code nested duplicate directories (not required by app entry points)
      'controllers/controllers/**',
      'middleware/middleware/**',
      'models/models/**',
      'services/services/**',
      'routes/routes/**',
      'config/config/**',
      'utils/utils/**',
      // k6 load tests (ES module syntax — run by k6, not Node)
      'tests/load/**',
      // Standalone test runners (not Jest — use import/ES modules)
      'tests/tests/loadTesting.js',
      // Browser JS / test-template files (not backend Node code)
      'static/**',
      'test-templates/**',
      'test-utils/**',
      'public/**',
    ],
  },
  // Base JavaScript configuration
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        // Modern Web APIs available in Node 18+
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        structuredClone: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      // ── Code Quality ──
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
      'no-console': 'off', // using structured logger instead
      'no-undef': 'error', // catch real bugs — require explicit imports
      'no-empty': 'warn',
      'no-useless-catch': 'off',
      'no-constant-condition': 'warn',
      'no-unused-expressions': 'warn',
      'prefer-const': 'warn',
      'no-var': 'error', // always use let/const
      // ── Safety ──
      eqeqeq: ['error', 'always', { null: 'ignore' }], // prevent type coercion bugs
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-return-await': 'warn', // redundant await in return
      'no-throw-literal': 'error', // always throw Error objects
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'warn', // catch 'Hello ${name}' typos
      // ── Async Best Practice ──
      'no-async-promise-executor': 'error',
      'no-promise-executor-return': 'warn',
      'require-atomic-updates': 'warn',
    },
  },
  // Frontend/React configuration
  {
    files: ['**/*.jsx', 'frontend/**/*.js', 'alawael-erp/frontend/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        React: 'readonly',
        JSX: 'readonly',
      },
    },
    rules: {
      'no-console': 'warn',
    },
  },
  // Test files configuration
  {
    files: ['**/*.test.js', '**/*.spec.js', 'tests/**/*.js', '__tests__/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
      // Relaxed rules for tests
      'no-throw-literal': 'off',
      'no-undef': 'warn',
    },
  },
  // Routes files configuration (legacy global injection — will be phased out)
  {
    files: ['**/routes/**/*.js'],
    languageOptions: {
      globals: {
        router: 'readonly',
        authenticateToken: 'readonly',
        authenticate: 'readonly',
        authMiddleware: 'readonly',
        verifyToken: 'readonly',
      },
    },
  },
  // Configuration files
  {
    files: ['*.config.js', '.*.js'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
];
