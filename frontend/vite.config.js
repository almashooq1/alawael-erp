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
    if (srcJsPattern.test(id) && id.endsWith('.js') && !id.includes('node_modules')) {
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
    plugins: [jsxInJsPlugin, react()],

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
      'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
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
      chunkSizeWarningLimit: 1000, // exceljs is a 940 kB CJS bundle — irreducible without replacing the library
      rollupOptions: {
        output: {
          manualChunks(id) {
            // ── node_modules splitting ──────────────────────────────────────
            if (id.includes('node_modules')) {
              // Heavy MUI X packages (data-grid, date-pickers) → separate chunk
              if (id.includes('@mui/x-data-grid') || id.includes('@mui/x-date-pickers')) {
                return 'mui-x';
              }
              // MUI icon set (separate — large independent tree)
              if (id.includes('@mui/icons-material')) {
                return 'mui-icons';
              }
              // Core MUI + emotion (required by MUI)
              if (
                id.includes('@mui/material') ||
                id.includes('@mui/system') ||
                id.includes('@mui/base') ||
                id.includes('@mui/utils') ||
                id.includes('@emotion/react') ||
                id.includes('@emotion/styled') ||
                id.includes('@emotion/cache')
              ) {
                return 'mui';
              }
              // Charts
              if (id.includes('recharts') || id.includes('victory')) {
                return 'charts';
              }
              // Excel export (heavy)
              if (id.includes('exceljs')) {
                return 'exceljs';
              }
              // PDF tools
              if (id.includes('jspdf') || id.includes('html2canvas')) {
                return 'pdf-tools';
              }
              // Date utilities
              if (id.includes('date-fns') || id.includes('dayjs') || id.includes('moment')) {
                return 'date-utils';
              }
              // Form & validation
              if (
                id.includes('react-hook-form') ||
                id.includes('zod') ||
                id.includes('yup') ||
                id.includes('@hookform')
              ) {
                return 'forms';
              }
              // i18n
              if (id.includes('i18next') || id.includes('react-i18next')) {
                return 'i18n';
              }
              // Core React vendor
              if (
                id.includes('react/') ||
                id.includes('react-router-dom') ||
                id.includes('react-router/')
              ) {
                return 'vendor';
              }
              // react-dom is large on its own (~450 kB) — separate chunk so browsers cache it independently
              if (id.includes('react-dom')) {
                return 'react-dom';
              }
            }

            // ── Route modules: split by business domain ─────────────────────
            if (id.includes('/src/routes/')) {
              if (
                id.includes('Finance') ||
                id.includes('Payroll') ||
                id.includes('Zatca') ||
                id.includes('Nphies') ||
                id.includes('Muqeem') ||
                id.includes('ZatcaPhase2')
              ) {
                return 'routes-finance';
              }
              if (
                id.includes('HRRoutes') ||
                id.includes('AttendanceRoutes') ||
                id.includes('LeaveManagement') ||
                id.includes('Recruitment') ||
                id.includes('EmployeeAffairs') ||
                id.includes('Succession') ||
                id.includes('WorkforceAnalytics') ||
                id.includes('LearningDevelopment') ||
                id.includes('HRInsurance') ||
                id.includes('OrgStructure')
              ) {
                return 'routes-hr';
              }
              if (
                id.includes('RehabRoutes') ||
                id.includes('BeneficiaryRoutes') ||
                id.includes('Beneficiary360') ||
                id.includes('DDDRoutes') ||
                id.includes('SessionsRoutes') ||
                id.includes('EpisodesRoutes') ||
                id.includes('CarePlanRoutes') ||
                id.includes('ICFAssessment') ||
                id.includes('MDTCoordination') ||
                id.includes('IntegratedCare') ||
                id.includes('TeleRehabRoutes') ||
                id.includes('TelehealthRoutes') ||
                id.includes('ARRehabRoutes') ||
                id.includes('DisabilityRoutes') ||
                id.includes('MHPSSRoutes') ||
                id.includes('IndependentLiving')
              ) {
                return 'routes-rehab';
              }
              if (
                id.includes('AdminRoutes') ||
                id.includes('AuditLogs') ||
                id.includes('QualityCompliance') ||
                id.includes('QualityManagement') ||
                id.includes('SSOAdmin') ||
                id.includes('WafRateLimit') ||
                id.includes('AutomatedBackup') ||
                id.includes('BlockchainRoutes') ||
                id.includes('StrategicPlanning') ||
                id.includes('RiskManagement') ||
                id.includes('InternalAudit')
              ) {
                return 'routes-admin';
              }
              if (
                id.includes('EnterpriseRoutes') ||
                id.includes('EnterpriseProPlus') ||
                id.includes('EnterpriseUltra') ||
                id.includes('GovernmentIntegration') ||
                id.includes('AdministrativeSystems') ||
                id.includes('BIDashboard') ||
                id.includes('CEODashboard') ||
                id.includes('ReportBuilderRoutes') ||
                id.includes('ReportsRoutes') ||
                id.includes('PerformanceRoutes')
              ) {
                return 'routes-enterprise';
              }
              // All remaining route modules → misc chunk
              return 'routes-misc';
            }
          },
        },
      },
    },

    // Public dir (static assets served as-is)
    publicDir: 'public',
  };
});
