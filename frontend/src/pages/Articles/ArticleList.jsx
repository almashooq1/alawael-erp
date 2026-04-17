/**
 * ArticleList — public /articles page.
 *
 * Reads from src/data/articlesContent.js; no backend call. When a CMS
 * lands, swap the import for a fetch('/api/articles') in useEffect.
 */

import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import articles, { CATEGORIES } from '../../data/articlesContent';
import content from '../../data/landingContent';

const tailwindScopeClass = 'font-cairo antialiased text-gray-900';

export default function ArticleList() {
  const [category, setCategory] = useState('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    document.title = `المقالات — ${content.brand.nameArFull}`;
  }, []);

  const filtered = useMemo(() => {
    let list = [...articles].sort((a, b) => (a.date > b.date ? -1 : 1));
    if (category !== 'all') list = list.filter(a => a.category === category);
    if (q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      list = list.filter(
        a => rx.test(a.title) || rx.test(a.excerpt) || a.tags.some(t => rx.test(t))
      );
    }
    return list;
  }, [category, q]);

  return (
    <div id="tailwind-scope" dir="rtl" className={tailwindScopeClass}>
      {/* Header */}
      <header className="relative bg-gradient-to-br from-primary-700 via-primary-600 to-emerald-700 text-white py-20 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-[120px]" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-6 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            العودة للرئيسية
          </Link>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">مقالات وتوعية</h1>
          <p className="text-lg text-white/85 max-w-2xl leading-relaxed">
            مقالات من فريق الأوائل — مرجع علمي لكل أم وأب، ومصدر دعم في رحلة التأهيل.
          </p>
        </div>
      </header>

      {/* Filters */}
      <section className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100 py-5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                    category === c.id
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-600/25'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <input
              type="search"
              placeholder="ابحث في المقالات..."
              value={q}
              onChange={e => setQ(e.target.value)}
              className="w-full sm:w-64 px-4 py-2 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none text-sm"
            />
          </div>
        </div>
      </section>

      {/* List */}
      <main className="py-14 bg-gray-50 min-h-[60vh]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <div className="text-5xl mb-3">🔎</div>
              <p>لا توجد مقالات مطابقة.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(a => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-10 bg-gray-900 text-gray-400 text-sm text-center">
        © {new Date().getFullYear()} {content.brand.nameArFull} — جميع الحقوق محفوظة
      </footer>
    </div>
  );
}

function ArticleCard({ article }) {
  const category = CATEGORIES.find(c => c.id === article.category);
  return (
    <Link
      to={`/articles/${article.slug}`}
      className="group relative bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 ring-1 ring-gray-100 transition-all duration-500 block"
    >
      <div
        className={`h-40 bg-gradient-to-br ${article.gradient} relative flex items-center justify-center overflow-hidden`}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="text-7xl drop-shadow-lg">{article.icon}</div>
        {category && (
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/90 text-xs font-bold text-gray-800 backdrop-blur-sm">
            {category.label}
          </span>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-900 mb-2 leading-snug group-hover:text-primary-700 transition-colors line-clamp-2">
          {article.title}
        </h3>
        <p className="text-sm text-gray-600 mb-4 leading-relaxed line-clamp-3">{article.excerpt}</p>
        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
          <span>{article.author.name}</span>
          <span className="flex items-center gap-1">
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {article.readMinutes} دقائق
          </span>
        </div>
      </div>
    </Link>
  );
}
