import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Shared shell for public legal/info pages (privacy, terms).
 * Brand-aligned (navy/orange, Tajawal), RTL, self-contained Tailwind.
 */
export default function LegalLayout({ title, subtitle, updated, children }) {
  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 font-[Tajawal,sans-serif]">
      {/* Header */}
      <header className="bg-primary-700 text-white">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <Link to="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors mb-6 text-sm">
            <span aria-hidden>→</span>
            <span>العودة للصفحة الرئيسية</span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold">{title}</h1>
          {subtitle ? <p className="mt-2 text-white/80">{subtitle}</p> : null}
          {updated ? <p className="mt-3 text-xs text-white/60">آخر تحديث: {updated}</p> : null}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10 leading-relaxed text-gray-700 space-y-6">
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-gray-400">
          مركز الأوائل لإعادة التأهيل — هذا المستند للاسترشاد وقابل للمراجعة القانونية.
        </p>
      </main>
    </div>
  );
}

export function Section({ heading, children }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-primary-700 mb-2">{heading}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
