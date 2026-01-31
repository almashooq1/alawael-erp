import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    include: [
      'tests/**/*.test.ts',
      'backend/models/**/*.test.ts',
      'backend/routes/**/*.test.ts',
    ],
    coverage: {
     provider: 'v8',
     reporter: ['text', 'json', 'html', 'lcov'],
     exclude: [
       'node_modules/',
       'dist/',
       'tests/',
       '**/*.test.ts',
       '**/*.spec.ts',
       'coverage/',
       '**/*.d.ts',
       'vitest.config.ts',
     ],
     all: true,
     lines: 70,
     functions: 70,
     branches: 70,
     statements: 70,
    },
   testTimeout: 30000,
   hookTimeout: 30000,
  },
});
