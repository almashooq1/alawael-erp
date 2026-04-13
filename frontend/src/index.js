/**
 * Application Entry Point
 * نقطة دخول التطبيق
 */

import ReactDOM from 'react-dom/client';
import './index.css';
import '@fontsource/cairo/300.css';
import '@fontsource/cairo/400.css';
import '@fontsource/cairo/500.css';
import '@fontsource/cairo/600.css';
import '@fontsource/cairo/700.css';
import { surfaceColors, neutralColors } from './theme/palette';
import { initSentry } from './utils/sentry';
import { validateFrontendEnv } from './config/validateEnv';

// Validate environment variables early
validateFrontendEnv();

// Initialize Sentry error tracking (loads async, non-blocking)
initSentry();

// Global styles
const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    direction: rtl;
  }

  body {
    font-family: 'Cairo', 'Tajawal', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: ${surfaceColors.background};
  }

  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${surfaceColors.background};
  }

  ::-webkit-scrollbar-thumb {
    background: ${neutralColors.scrollbar};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${neutralColors.scrollbarHover};
  }
`;

// Inject global styles
const styleElement = document.createElement('style');
styleElement.textContent = globalStyles;
document.head.appendChild(styleElement);

// Render app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
