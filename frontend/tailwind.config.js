/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  // NOTE: previously `important: '#tailwind-scope'` was set to win over MUI's
  // specificity. In Tailwind v4 this rewrites every utility as a descendant
  // selector (`#tailwind-scope .flex`) which means utilities placed on the
  // scope element itself silently do not apply, AND default theme colors
  // like text-gray-900 don't get emitted. The site rendered unstyled because
  // of this. We now rely on Tailwind's CSS layer ordering + MUI's own
  // CssBaseline ordering (MUI is loaded before our index.css import).
  important: true,
  theme: {
    extend: {
      fontFamily: {
        // Tajawal is the Alawael brand font (matches the soft rounded Arabic
        // of the wordmark + the web-admin design system). Cairo kept as the
        // secondary display fallback per brand spec. `font-cairo` is a legacy
        // class name retained so existing markup keeps working — it now
        // resolves Tajawal-first.
        sans: ['Tajawal', 'Cairo', 'system-ui', 'sans-serif'],
        cairo: ['Tajawal', 'Cairo', 'sans-serif'],
        tajawal: ['Tajawal', 'Cairo', 'sans-serif'],
      },
      colors: {
        // ─── Alawael official brand identity (source: packages/ui tokens) ───
        // Primary = Care Navy. The landing previously used green as primary;
        // remapped to the official logo identity (navy + orange + green) so the
        // public site, the admin app, and the logo all share one palette.
        // `primary-*` and the brand gradient/glow utilities below are now navy.

        // Care Navy — primary brand (trust, headings, links, primary surfaces)
        primary: {
          50: '#ECF1F9',
          100: '#C9D6EC',
          200: '#94AFD6',
          300: '#5D85BC',
          400: '#346AAB',
          500: '#1B4A8A',
          600: '#163C71',
          700: '#102D55',
          800: '#0A1E3A',
          900: '#050F1F',
          950: '#030915',
        },
        // Sunrise Orange — accent brand (CTAs, highlights, milestones).
        // Was gold (#ffc107); now the official brand orange.
        accent: {
          50: '#FEF4E4',
          100: '#FCE4BD',
          200: '#FACB8A',
          300: '#F7B05B',
          400: '#F5A23A',
          500: '#F39220',
          600: '#D87C16',
          700: '#B26410',
          800: '#864A0A',
          900: '#5A3107',
          950: '#3D2105',
        },
        // Growth Green — wellness brand (progress, therapy, success). Tertiary.
        // Overrides Tailwind's default `green` so `green-*` reads on-brand.
        green: {
          50: '#E8F7EC',
          100: '#C2EBCC',
          200: '#8FD9A1',
          300: '#5DC576',
          400: '#3DB85C',
          500: '#28A648',
          600: '#208A3B',
          700: '#186A2D',
          800: '#114B20',
          900: '#082C13',
        },
        // Navy scale for dark surfaces — same family as primary (brand navy).
        navy: {
          50: '#ECF1F9',
          100: '#C9D6EC',
          200: '#94AFD6',
          300: '#5D85BC',
          400: '#346AAB',
          500: '#1B4A8A',
          600: '#163C71',
          700: '#102D55',
          800: '#0A1E3A',
          900: '#050F1F',
          950: '#030915',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        // Brand glows — navy (primary) + orange (accent). Names kept for
        // back-compat with existing markup; values are now on-brand.
        'glow-green': '0 0 20px rgba(27,74,138,0.25), 0 0 60px rgba(27,74,138,0.10)',
        'glow-green-sm': '0 0 10px rgba(27,74,138,0.20)',
        'glow-gold': '0 0 20px rgba(243,146,32,0.22), 0 0 60px rgba(243,146,32,0.08)',
        card: '0 1px 3px rgba(40,30,20,0.05), 0 4px 12px rgba(40,30,20,0.04)',
        'card-hover': '0 4px 16px rgba(27,74,138,0.10), 0 12px 32px rgba(27,74,138,0.06)',
        'card-dark': '0 1px 3px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.15)',
        glass: '0 8px 32px rgba(27,74,138,0.10)',
        'glass-dark': '0 8px 32px rgba(0,0,0,0.32)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.12)',
      },
      backgroundImage: {
        // Brand gradients. `gradient-green` is the primary (navy) gradient —
        // name kept for back-compat; value is now navy per the brand identity.
        'gradient-green': 'linear-gradient(135deg, #102D55 0%, #1B4A8A 50%, #346AAB 100%)',
        'gradient-green-dark': 'linear-gradient(135deg, #050F1F 0%, #102D55 50%, #1B4A8A 100%)',
        'gradient-gold': 'linear-gradient(135deg, #B26410 0%, #F39220 50%, #F7B05B 100%)',
        'gradient-navy': 'linear-gradient(180deg, #050F1F 0%, #0A1E3A 50%, #050F1F 100%)',
        'gradient-wellness': 'linear-gradient(135deg, #186A2D 0%, #28A648 50%, #5DC576 100%)',
        'gradient-glass':
          'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        'gradient-mesh':
          'radial-gradient(at 0% 0%, rgba(27,74,138,0.06) 0%, transparent 50%), radial-gradient(at 100% 100%, rgba(243,146,32,0.05) 0%, transparent 50%)',
        noise:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'fade-in-down': 'fadeInDown 0.6s ease-out forwards',
        'slide-right': 'slideRight 0.6s ease-out forwards',
        'slide-left': 'slideLeft 0.6s ease-out forwards',
        'scale-in': 'scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'count-up': 'countUp 2s ease-out forwards',
        float: 'float 6s ease-in-out infinite',
        blob: 'blob 7s infinite',
        shimmer: 'shimmer 2s linear infinite',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
        'slide-up-stagger': 'slideUpStagger 0.5s ease-out forwards',
        'bounce-in': 'bounceIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'spin-slow': 'spin 20s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          from: { opacity: '0', transform: 'translateY(-24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          from: { opacity: '0', transform: 'translateX(-40px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideLeft: {
          from: { opacity: '0', transform: 'translateX(40px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        glow: {
          from: { boxShadow: '0 0 10px rgba(27,74,138,0.3)' },
          to: { boxShadow: '0 0 25px rgba(27,74,138,0.5), 0 0 50px rgba(27,74,138,0.2)' },
        },
        slideUpStagger: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities, addComponents }) {
      addUtilities({
        // Brand text gradients. `text-gradient-green` is the primary (navy)
        // gradient — name kept for back-compat; value is now navy.
        '.text-gradient-green': {
          background: 'linear-gradient(135deg, #102D55, #1B4A8A)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.text-gradient-gold': {
          background: 'linear-gradient(135deg, #B26410, #F39220)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.text-gradient-wellness': {
          background: 'linear-gradient(135deg, #186A2D, #28A648)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.glass-light': {
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(20px) saturate(180%)',
          '-webkit-backdrop-filter': 'blur(20px) saturate(180%)',
        },
        '.glass-dark': {
          background: 'rgba(10,30,58,0.8)',
          backdropFilter: 'blur(20px) saturate(180%)',
          '-webkit-backdrop-filter': 'blur(20px) saturate(180%)',
        },
        '.glass-green': {
          background: 'rgba(27,74,138,0.08)',
          backdropFilter: 'blur(12px)',
          '-webkit-backdrop-filter': 'blur(12px)',
        },
        '.scrollbar-thin': {
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(27,74,138,0.2) transparent',
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(27,74,138,0.2)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'rgba(27,74,138,0.4)',
          },
        },
        '.scrollbar-hidden': {
          scrollbarWidth: 'none',
          '-ms-overflow-style': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
      });
      addComponents({
        '.card-base': {
          background: 'white',
          borderRadius: '1rem',
          border: '1px solid rgb(237 229 216)',
          boxShadow: '0 1px 3px rgba(40,30,20,0.05), 0 4px 12px rgba(40,30,20,0.04)',
          transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(27,74,138,0.10), 0 12px 32px rgba(27,74,138,0.06)',
            transform: 'translateY(-2px)',
          },
        },
        '.card-dark': {
          background: 'rgba(10,30,58,0.6)',
          borderRadius: '1rem',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.15)',
          transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0,0,0,0.3), 0 12px 32px rgba(0,0,0,0.2)',
            borderColor: 'rgba(255,255,255,0.1)',
            transform: 'translateY(-2px)',
          },
        },
        // Primary button — Care Navy. (Name kept; value now brand navy.)
        '.btn-primary': {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.625rem 1.5rem',
          borderRadius: '0.75rem',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: 'white',
          background: 'linear-gradient(135deg, #102D55 0%, #1B4A8A 100%)',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontFamily: 'Tajawal, Cairo, sans-serif',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(27,74,138,0.4)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        // Accent button — Sunrise Orange. The primary public CTA colour.
        '.btn-accent': {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.625rem 1.5rem',
          borderRadius: '0.75rem',
          fontSize: '0.875rem',
          fontWeight: '700',
          color: 'white',
          background: 'linear-gradient(135deg, #D87C16 0%, #F39220 100%)',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontFamily: 'Tajawal, Cairo, sans-serif',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(243,146,32,0.4)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        '.btn-outline-green': {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1.25rem',
          borderRadius: '0.75rem',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#1B4A8A',
          background: 'transparent',
          border: '2px solid rgba(27,74,138,0.3)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontFamily: 'Tajawal, Cairo, sans-serif',
          '&:hover': {
            background: 'rgba(27,74,138,0.06)',
            borderColor: '#1B4A8A',
          },
        },
        '.badge-green': {
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0.125rem 0.625rem',
          borderRadius: '9999px',
          fontSize: '0.7rem',
          fontWeight: '700',
          background: 'rgba(27,74,138,0.1)',
          color: '#1B4A8A',
          border: '1px solid rgba(27,74,138,0.2)',
        },
        '.badge-gold': {
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0.125rem 0.625rem',
          borderRadius: '9999px',
          fontSize: '0.7rem',
          fontWeight: '700',
          background: 'rgba(243,146,32,0.12)',
          color: '#B26410',
          border: '1px solid rgba(243,146,32,0.25)',
        },
      });
    }),
  ],
};
