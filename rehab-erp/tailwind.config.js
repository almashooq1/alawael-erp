/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './resources/**/*.blade.php',
    './resources/**/*.js',
    './resources/**/*.vue',
    './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
  ],
  theme: {
    extend: {
      colors: {
        // Primary - أزرق طبي
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Brand - تيل للرعاية الصحية
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        // Sidebar
        sidebar: {
          bg: '#0f172a',
          bgDark: '#020617',
          hover: '#1e293b',
          active: '#1e3a8a',
          border: '#1e293b',
          text: '#94a3b8',
          textHover: '#f1f5f9',
          icon: '#64748b',
        },
        // Surface
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Status
        success: { light: '#dcfce7', DEFAULT: '#22c55e', dark: '#16a34a' },
        warning: { light: '#fef9c3', DEFAULT: '#f59e0b', dark: '#d97706' },
        danger: { light: '#fee2e2', DEFAULT: '#ef4444', dark: '#dc2626' },
        info: { light: '#e0f2fe', DEFAULT: '#0ea5e9', dark: '#0284c7' },
      },
      fontFamily: {
        sans: ['Tajawal', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        arabic: ['Tajawal', 'Cairo', 'sans-serif'],
      },
      fontSize: {
        xxs: ['0.625rem', { lineHeight: '1rem' }],
      },
      spacing: {
        sidebar: '260px',
        'sidebar-collapsed': '72px',
        header: '64px',
      },
      borderRadius: {
        xl2: '1rem',
        xl3: '1.5rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,.08), 0 1px 2px -1px rgba(0,0,0,.06)',
        'card-hover': '0 4px 16px 0 rgba(0,0,0,.12), 0 2px 6px -2px rgba(0,0,0,.08)',
        sidebar: '4px 0 24px 0 rgba(0,0,0,.18)',
      },
      transitionDuration: {
        250: '250ms',
      },
      zIndex: {
        sidebar: '40',
        header: '30',
        modal: '50',
        toast: '60',
      },
    },
  },
  plugins: [],
};
