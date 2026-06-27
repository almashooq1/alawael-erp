import React, { useState, useEffect } from 'react';

/**
 * Accessibility Widget
 * ويدجت الوصول — يتيح للمستخدمين تخصيص تجربة التصفح
 *
 * Features:
 * - Dark / Light mode toggle
 * - Readable text (dyslexia-friendly spacing)
 * - No animations (vestibular comfort)
 * - Big cursor (low vision)
 * - Highlight links (low vision)
 */

const A11Y_PREFS = {
  DARK: 'dark',
  READABLE: 'a11y-readable',
  NO_ANIM: 'a11y-noanim',
  BIG_CURSOR: 'a11y-bigcursor',
  HIGHLIGHT_LINKS: 'a11y-links',
};

function getStoredPrefs() {
  try {
    return JSON.parse(localStorage.getItem('a11y-prefs') || '{}');
  } catch {
    return {};
  }
}

function storePrefs(prefs) {
  try {
    localStorage.setItem('a11y-prefs', JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(getStoredPrefs);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle(A11Y_PREFS.DARK, !!prefs.dark);
    html.classList.toggle(A11Y_PREFS.READABLE, !!prefs.readable);
    html.classList.toggle(A11Y_PREFS.NO_ANIM, !!prefs.noAnim);
    html.classList.toggle(A11Y_PREFS.BIG_CURSOR, !!prefs.bigCursor);
    html.classList.toggle(A11Y_PREFS.HIGHLIGHT_LINKS, !!prefs.highlightLinks);
    storePrefs(prefs);
  }, [prefs]);

  const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div className="fixed bottom-6 left-6 z-50" dir="rtl">
      <button
        onClick={() => setOpen(!open)}
        aria-label="إعدادات إمكانية الوصول"
        className="w-12 h-12 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors"
      >
        ♿
      </button>

      {open && (
        <div className="absolute bottom-14 left-0 w-64 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">
            إمكانية الوصول
          </h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!prefs.dark}
                onChange={() => toggle('dark')}
                className="rounded text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">الوضع الداكن</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!prefs.readable}
                onChange={() => toggle('readable')}
                className="rounded text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">نص مريح للقراءة</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!prefs.noAnim}
                onChange={() => toggle('noAnim')}
                className="rounded text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">إيقاف الحركة</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!prefs.bigCursor}
                onChange={() => toggle('bigCursor')}
                className="rounded text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">مؤشر كبير</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!prefs.highlightLinks}
                onChange={() => toggle('highlightLinks')}
                className="rounded text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">تظليل الروابط</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
