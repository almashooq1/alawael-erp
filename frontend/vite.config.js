import { defineConfig, loadEnv, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  // App code + the startup env-validation read process.env.REACT_APP_*, but
  // Vite does not expose REACT_APP_* to the client by default (no envPrefix /
  // define). Without injecting process.env, it is empty in the bundle and
  // validateFrontendEnv() throws in production → blank screen (prod outage
  // 2026-06-30). Load REACT_APP_* (and VITE_* as a fallback) from the .env
  // files for this mode and bake a process.env shim. Same-origin /api/v1 is
  // the safe default when nothing is provided at build time.
  const env = loadEnv(mode, process.cwd(), ['REACT_APP_', 'VITE_']);
  const isProd = mode === 'production';
  const processEnv = {
    NODE_ENV: isProd ? 'production' : 'development',
    REACT_APP_API_URL: env.REACT_APP_API_URL || env.VITE_API_BASE_URL || '/api/v1',
    REACT_APP_API_V1_URL: env.REACT_APP_API_V1_URL || env.VITE_API_V1_URL || '/api/v1',
    REACT_APP_WS_URL: env.REACT_APP_WS_URL || env.VITE_WS_URL || '',
    REACT_APP_API_TIMEOUT: env.REACT_APP_API_TIMEOUT || '10000',
    REACT_APP_ENVIRONMENT: env.REACT_APP_ENVIRONMENT || (isProd ? 'production' : 'development'),
  };

  return {
  define: {
    'process.env': JSON.stringify(processEnv),
  },
  plugins: [
    {
      name: 'treat-js-files-as-jsx',
      async transform(code, id) {
        if (!id.match(/src\/.*\.js$/)) return null;
        return transformWithEsbuild(code, id, {
          loader: 'tsx',
          jsx: 'automatic',
        });
      },
    },
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'script',
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      manifest: false, // We use our own manifest.json
      injectManifest: {
        injectionPoint: undefined, // Custom SW, no workbox injection
        globDirectory: 'dist',
        globPatterns: [
          '**/*.{js,css,html,png,svg,ico,woff,woff2,json}',
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
      workbox: {
        // Not used since we have custom SW, but required for plugin
        cleanupOutdatedCaches: true,
      },
    }),
  ],
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
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          charts: ['recharts', 'chart.js'],
          utils: ['date-fns', 'lodash', 'axios'],
        },
      },
    },
    chunkSizeWarningLimit: 500, // KB
  },
  server: {
    port: 3000,
    host: true,
    strictPort: false,
  },
  preview: {
    port: 4173,
    host: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@mui/material', '@mui/icons-material'],
  },
  };
});
