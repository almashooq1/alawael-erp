import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/**/*.test.ts',
      'backend/models/**/*.test.ts',
      'backend/routes/**/*.test.ts',
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
});
