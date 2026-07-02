/**
 * Application Entry Point
 * نقطة دخول التطبيق
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import '@fontsource/cairo/300.css';
import '@fontsource/cairo/400.css';
import '@fontsource/cairo/500.css';
import '@fontsource/cairo/600.css';
import '@fontsource/cairo/700.css';
import { surfaceColors, neutralColors } from './theme/palette';
import { initSentry } from './utils/sentry';
import { startWebVitalsReporting } from './utils/webVitalsReporter';
import { validateFrontendEnv } from './config/validateEnv';

// Validate environment variables early.
// Never let a missing/invalid var crash the entire UI in production — the API
// client falls back to same-origin /api/v1. Log loudly but keep rendering.
try {
  validateFrontendEnv();
} catch (err) {
  console.error('[index] Environment validation failed (continuing to render):', err);
}

// Initialize Sentry error tracking (loads async, non-blocking)
initSentry();

// Start Real User Monitoring (Web Vitals) — non-blocking, sampled
startWebVitalsReporting();

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

// Fetch published CMS landing content (if any) BEFORE the App module — which
// imports the landing content via module-level derivations — is evaluated.
// Any failure/null/timeout falls back to the static content file (zero flash).
async function loadLandingCms() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1200); // never block render long
    const resp = await fetch('/api/v1/landing/content', {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(t);
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.ok && data.content && typeof data.content === 'object') {
        window.__ALAWAEL_LANDING_CMS__ = data.content;
      }
    }
  } catch {
    /* ignore — fall back to static content */
  }
}

// Service Worker CLEANUP (formerly registration).
// A root-scope ('/') SW registered here used to serve a stale legacy app-shell
// for every navigation — including sibling apps (/rehab, /admin) — causing the
// recurring "404 on most of the site". We now register NO service worker and
// instead unregister any existing one + purge all caches (guarded single reload
// so it can never loop). Correctness > offline for this online tool.
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker
    .getRegistrations()
    .then(regs => {
      const hadSw = regs.length > 0;
      return Promise.all(regs.map(r => r.unregister()))
        .then(() =>
          typeof caches !== 'undefined' && caches.keys
            ? caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
            : null
        )
        .then(() => hadSw);
    })
    .then(hadSw => {
      try {
        if (hadSw && !sessionStorage.getItem('__sw_purged_v1__')) {
          sessionStorage.setItem('__sw_purged_v1__', '1');
          window.location.reload();
        }
      } catch {
        /* sessionStorage unavailable — cleanup already ran */
      }
    })
    .catch(() => {
      /* no-op — cleanup must never break boot */
    });
}

// Render app (App is dynamically imported AFTER the CMS fetch so that the
// injected window override is in place before the landing content modules run).
async function bootstrap() {
  await loadLandingCms();
  const { default: App } = await import('./App');
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  registerServiceWorker();
}

// Kick off the async bootstrap (CMS preload → dynamic App import → mount React).
// This invocation was missing, so bootstrap() was tree-shaken and the app never
// mounted → blank page (prod outage 2026-06-30). A render failure must surface
// in the console, never silently blank the page.
bootstrap().catch(err => {
  console.error('[index] Bootstrap failed:', err);
});
