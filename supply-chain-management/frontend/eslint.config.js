// Local flat config for SCM frontend so the root composed config (which only
// scopes /backend and /frontend) doesn't end up ignoring this subproject.
const js = require('@eslint/js');
const globals = require('globals');
const reactPlugin = require('eslint-plugin-react');

module.exports = [
  {
    ignores: ['node_modules/**', 'build/**', 'dist/**', 'coverage/**', '.jest-cache/**', 'public/**', '__mocks__/**', '*.log'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: { react: reactPlugin },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        React: 'readonly',
      },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      // React JSX variable usage detection — without these, every JSX-only
      // imported component is misreported as "unused".
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-undef': 'off', // React/JSX globals handled by build, not lint
    },
  },
  {
    files: ['src/**/*.test.{js,jsx}', 'src/**/__tests__/**/*.{js,jsx}', 'src/setupTests.js'],
    rules: {
      'no-unused-vars': 'off',
    },
  },
];
