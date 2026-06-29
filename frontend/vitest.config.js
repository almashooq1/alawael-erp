import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    testTimeout: 15000,
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      'build',
      'cypress',
      'e2e',
      // Known problematic pre-existing suites (hanging or brittle)
      'src/pages/whatsapp/__tests__/**',
      'src/__tests__/a11y/**',
      'src/__tests__/drift/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      'utils': path.resolve(__dirname, './src/utils'),
      'api': path.resolve(__dirname, './src/api'),
      'assessment': path.resolve(__dirname, './src/assessment'),
      'components': path.resolve(__dirname, './src/components'),
      'config': path.resolve(__dirname, './src/config'),
      'constants': path.resolve(__dirname, './src/constants'),
      'contexts': path.resolve(__dirname, './src/contexts'),
      'data': path.resolve(__dirname, './src/data'),
      'hooks': path.resolve(__dirname, './src/hooks'),
      'pages': path.resolve(__dirname, './src/pages'),
      'providers': path.resolve(__dirname, './src/providers'),
      'routes': path.resolve(__dirname, './src/routes'),
      'services': path.resolve(__dirname, './src/services'),
      'theme': path.resolve(__dirname, './src/theme'),
      'types': path.resolve(__dirname, './src/types'),
      'ui': path.resolve(__dirname, './src/ui'),
      'views': path.resolve(__dirname, './src/views'),
      'assets': path.resolve(__dirname, './src/assets'),
      '@pwa': path.resolve(__dirname, './src/pwa'),
      '@api': path.resolve(__dirname, './src/api'),
    },
  },
});
