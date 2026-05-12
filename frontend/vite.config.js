import { defineConfig, loadEnv, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// CRA used .js files for JSX. Vite requires .jsx by default.
// This pre-plugin tells esbuild to treat src/**/*.js as JSX so
// vite:build-import-analysis can parse them before the React plugin runs.
// Use a regex to match both Unix '/' and Windows '\' path separators.
const srcJsPattern = /[/\\]src[/\\]/;
const jsxInJsPlugin = {
  name: 'jsx-in-js',
  enforce: 'pre',
  async transform(code, id) {
    if (
      srcJsPattern.test(id) &&
      id.endsWith('.js') &&
      !id.includes('node_modules')
    ) {
      return transformWithEsbuild(code, id, {
        loader: 'jsx',
        jsx: 'automatic',
      });
    }
  },
};

export default defineConfig(({ mode }) => {
  // Load ALL env vars (no prefix filter) so REACT_APP_ vars are accessible
  const env = loadEnv(mode, process.cwd(), '');

  // Build process.env shim: REACT_APP_* → process.env.REACT_APP_*
  // This keeps all source files unchanged during migration
  const envDefines = {};
  for (const [key, val] of Object.entries(env)) {
    if (key.startsWith('REACT_APP_')) {
      envDefines[`process.env.${key}`] = JSON.stringify(val);
    }
  }

  return {
    plugins: [
      jsxInJsPlugin,
      react(),
    ],

    // esbuild settings (handles dep pre-bundling)
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.(js|jsx)$/,
    },

    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },

    define: {
      'process.env.NODE_ENV': JSON.stringify(
        mode === 'production' ? 'production' : 'development'
      ),
      ...envDefines,
    },

    resolve: {
      alias: {
        // Absolute imports from src/ (CRA: moduleDirectories: ['node_modules', 'src'])
        // Maps bare imports like `utils/logger` → `src/utils/logger`
        src: path.resolve(__dirname, './src'),
        api: path.resolve(__dirname, './src/api'),
        components: path.resolve(__dirname, './src/components'),
        config: path.resolve(__dirname, './src/config'),
        constants: path.resolve(__dirname, './src/constants'),
        contexts: path.resolve(__dirname, './src/contexts'),
        data: path.resolve(__dirname, './src/data'),
        hooks: path.resolve(__dirname, './src/hooks'),
        pages: path.resolve(__dirname, './src/pages'),
        routes: path.resolve(__dirname, './src/routes'),
        services: path.resolve(__dirname, './src/services'),
        theme: path.resolve(__dirname, './src/theme'),
        ui: path.resolve(__dirname, './src/ui'),
        utils: path.resolve(__dirname, './src/utils'),
        views: path.resolve(__dirname, './src/views'),
      },
    },

    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api': {
          target: env.REACT_APP_API_URL
            ? env.REACT_APP_API_URL.replace('/api', '')
            : 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          ws: true,
        },
      },
    },

    build: {
      outDir: 'build', // keep same output dir as CRA
      sourcemap: env.GENERATE_SOURCEMAP !== 'false',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            mui: ['@mui/material', '@mui/icons-material'],
            charts: ['recharts'],
          },
        },
      },
    },

    // Public dir (static assets served as-is)
    publicDir: 'public',
  };
});
