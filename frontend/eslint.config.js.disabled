const js = require('@eslint/js');
const globals = require('globals');

// This flat config is used by ESLint v10 (root) when linting frontend files via lint-staged.
// React-specific rules are handled by frontend/.eslintrc.json via react-scripts (ESLint v8).
module.exports = [
  {
    ignores: ['node_modules/**', 'coverage/**', 'build/**', 'dist/**', '.git/**', '*.log'],
    linterOptions: {
      reportUnusedDisableDirectives: 'warn',
    },
  },
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    linterOptions: {
      reportUnusedDisableDirectives: 'warn',
    },
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
      ...js.configs.recommended.rules,
      'no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
      'no-console': 'warn',
      'no-undef': 'warn',
      // Override recommended rules from errors to warnings
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-constant-condition': 'warn',
      'no-useless-catch': 'warn',
      'no-useless-escape': 'warn',
      'no-unsafe-finally': 'warn',
    },
  },
  {
    files: ['**/*.test.js', '**/*.test.jsx', '**/*.spec.js', '**/*.spec.jsx'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
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
    },
  },
];
