/**
 * AccessibilityWidget — a floating, persistent accessibility toolbar for the
 * public landing of مراكز الأوائل. Built for an audience of families of
 * children with disabilities, so inclusion is a first-class feature.
 *
 * All options apply via root-level CSS classes (see index.css `.a11y-*`) plus
 * a root font-size scale — none of them break layout, fixed elements, or the
 * brand colours. Preferences persist in localStorage so a returning visitor
 * keeps their setup. Fully keyboard-accessible + RTL + ARIA.
 */
import React, { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'alawael-a11y-prefs';
const FONT_MIN = -2; // 86%
const FONT_MAX = 5; // 135%
const FONT_STEP = 7; // % per step

const DEFAULTS = {
  font: 0,
  links: false,
  readable: false,
  noAnim: false,
  bigCursor: false,
  dark: false,
};

// First-load dark default: honour the OS-level color-scheme preference.
function prefersDark() {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;
  } catch {
    return false;
  }
}

function loadPrefs() {
  try {
    const raw = typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY);
    // No saved prefs yet → seed dark from the OS color-scheme preference.
    if (!raw) return { ...DEFAULTS, dark: prefersDark() };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS, dark: prefersDark() };
  }
}

function applyPrefs(p) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  el.classList.toggle('a11y-links', !!p.links);
  el.classList.toggle('a11y-readable', !!p.readable);
  el.classList.toggle('a11y-noanim', !!p.noAnim);
  el.classList.toggle('a11y-bigcursor', !!p.bigCursor);
  el.classList.toggle('dark', !!p.dark);
  const clamped = Math.max(FONT_MIN, Math.min(FONT_MAX, p.font || 0));
  el.style.fontSize = clamped === 0 ? '' : `${100 + clamped * FONT_STEP}%`;
}

/* Inline SVG icons (Heroicons-style, currentColor) */
function IconA11y() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="3.6" r="2" />
      <path d="M21 8.4c-2.9.9-5.9 1.35-9 1.35S5.9 9.3 3 8.4l.5-1.9c2.7.84 5.5 1.25 8.5 1.25s5.8-.41 8.5-1.25L21 8.4zM10.6 11.2 9.4 21H7.4l1-7.6c-.02-.02 2.2-2.2 2.2-2.2zm2.8 0s2.22 2.18 2.2 2.2l1 7.6h-2l-1.2-9.8z" />
    </svg>
  );
}
function IconClose() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function Toggle({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 text-center transition-all duration-200 ${
        active
          ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm'
          : 'border-gray-200 bg-white text-gray-600 hover:border-primary-300 hover:bg-primary-50/40'
      }`}
    >
      <span className="text-2xl leading-none" aria-hidden="true">
        {icon}
      </span>
      <span className="text-xs font-bold leading-tight">{label}</span>
    </button>
  );
}

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULTS);

  // Hydrate from storage once
  useEffect(() => {
    const p = loadPrefs();
    setPrefs(p);
    applyPrefs(p);
  }, []);

  const update = useCallback((patch) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      applyPrefs(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable — apply only */
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    applyPrefs(DEFAULTS);
    setPrefs(DEFAULTS);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // Escape closes the panel
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const fontPct = 100 + (prefs.font || 0) * FONT_STEP;
  const anyActive =
    prefs.font !== 0 ||
    prefs.links ||
    prefs.readable ||
    prefs.noAnim ||
    prefs.bigCursor ||
    prefs.dark;

  return (
    <>
      {/* Launcher — side tab on the start (right in RTL) edge, vertically centered */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="a11y-panel"
        aria-label="خيارات إمكانية الوصول"
        title="إمكانية الوصول"
        className={`fixed top-1/2 -translate-y-1/2 start-0 z-[70] flex h-14 w-12 items-center justify-center rounded-e-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-xl shadow-primary-900/30 transition-all duration-300 hover:w-14 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 ${
          anyActive ? 'ring-2 ring-accent-400' : ''
        }`}
      >
        <IconA11y />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[71] bg-black/20 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        id="a11y-panel"
        role="dialog"
        aria-modal="true"
        aria-label="إعدادات إمكانية الوصول"
        dir="rtl"
        className={`fixed top-1/2 z-[72] w-[19rem] max-w-[88vw] -translate-y-1/2 rounded-3xl border border-gray-100 bg-white p-5 shadow-2xl transition-all duration-300 start-3 ${
          open ? 'pointer-events-auto opacity-100 translate-x-0' : 'pointer-events-none opacity-0 -translate-x-6'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <span className="text-primary-600" aria-hidden="true">
              <IconA11y />
            </span>
            إمكانية الوصول
          </h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="إغلاق"
            className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <IconClose />
          </button>
        </div>

        {/* Font size */}
        <div className="mb-4 rounded-2xl bg-gray-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700">حجم الخط</span>
            <span className="text-xs font-bold text-primary-700">{fontPct}%</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => update({ font: Math.max(FONT_MIN, (prefs.font || 0) - 1) })}
              disabled={prefs.font <= FONT_MIN}
              aria-label="تصغير الخط"
              className="flex h-9 flex-1 items-center justify-center rounded-xl border-2 border-gray-200 bg-white text-lg font-bold text-gray-700 hover:border-primary-300 disabled:opacity-40"
            >
              أ−
            </button>
            <button
              type="button"
              onClick={() => update({ font: Math.min(FONT_MAX, (prefs.font || 0) + 1) })}
              disabled={prefs.font >= FONT_MAX}
              aria-label="تكبير الخط"
              className="flex h-9 flex-1 items-center justify-center rounded-xl border-2 border-gray-200 bg-white text-xl font-bold text-gray-700 hover:border-primary-300 disabled:opacity-40"
            >
              أ+
            </button>
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-2 gap-2.5">
          <Toggle
            active={prefs.links}
            onClick={() => update({ links: !prefs.links })}
            icon="🔗"
            label="إبراز الروابط"
          />
          <Toggle
            active={prefs.readable}
            onClick={() => update({ readable: !prefs.readable })}
            icon="📖"
            label="خط سهل القراءة"
          />
          <Toggle
            active={prefs.noAnim}
            onClick={() => update({ noAnim: !prefs.noAnim })}
            icon="⏸️"
            label="إيقاف الحركة"
          />
          <Toggle
            active={prefs.bigCursor}
            onClick={() => update({ bigCursor: !prefs.bigCursor })}
            icon="🖱️"
            label="مؤشر كبير"
          />
          <Toggle
            active={prefs.dark}
            onClick={() => update({ dark: !prefs.dark })}
            icon="🌙"
            label="الوضع الليلي"
          />
        </div>

        {/* Reset */}
        <button
          type="button"
          onClick={reset}
          disabled={!anyActive}
          className="mt-4 w-full rounded-xl border-2 border-gray-200 bg-white py-2.5 text-sm font-bold text-gray-600 transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-40"
        >
          إعادة ضبط الكل
        </button>

        <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-400">
          تُحفظ تفضيلاتك على هذا الجهاز
        </p>
      </div>
    </>
  );
}
