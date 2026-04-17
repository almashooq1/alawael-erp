/**
 * ArticleDetail — public /articles/:slug page.
 *
 * Injects Article JSON-LD structured data into <head> for SEO.
 * Content is rendered via dangerouslySetInnerHTML — all content is
 * authored internally in src/data/articlesContent.js, so the trust
 * boundary is safe.
 */

import { useEffect, useMemo } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import articles, { CATEGORIES } from '../../data/articlesContent';
import content from '../../data/landingContent';

export default function ArticleDetail() {
  const { slug } = useParams();
  const article = useMemo(() => articles.find(a => a.slug === slug), [slug]);

  useEffect(() => {
    if (!article) return;
    document.title = `${article.title} — ${content.brand.nameArFull}`;
    // Meta description
    const ensureMeta = (name, value) => {
      let tag = document.head.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        tag.setAttribute('data-article-meta', '1');
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', value);
      return tag;
    };
    const d = ensureMeta('description', article.excerpt);
    const k = ensureMeta('keywords', article.tags.join(', '));
    // JSON-LD Article schema
    const scr = document.createElement('script');
    scr.type = 'application/ld+json';
    scr.setAttribute('data-article-seo', '1');
    scr.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.excerpt,
      datePublished: article.date,
      author: {
        '@type': 'Person',
        name: article.author.name,
        jobTitle: article.author.role,
      },
      publisher: {
        '@type': 'Organization',
        name: content.brand.nameArFull,
        logo: {
          '@type': 'ImageObject',
          url:
            typeof window !== 'undefined'
              ? new URL(content.brand.logoSrc, window.location.origin).toString()
              : content.brand.logoSrc,
        },
      },
      mainEntityOfPage: typeof window !== 'undefined' ? window.location.href : undefined,
      keywords: article.tags.join(', '),
    });
    document.head.appendChild(scr);
    window.scrollTo(0, 0);
    return () => {
      try {
        d.remove();
        k.remove();
        scr.remove();
      } catch {
        /* already gone */
      }
    };
  }, [article]);

  if (!article) return <Navigate to="/articles" replace />;

  const category = CATEGORIES.find(c => c.id === article.category);
  const publishedDate = new Date(article.date).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const related = articles
    .filter(
      a =>
        a.slug !== article.slug &&
        (a.category === article.category || a.tags.some(t => article.tags.includes(t)))
    )
    .slice(0, 3);

  return (
    <div id="tailwind-scope" dir="rtl" className="font-cairo antialiased text-gray-900">
      {/* Hero */}
      <header
        className={`relative bg-gradient-to-br ${article.gradient} text-white py-20 overflow-hidden`}
      >
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-white/80 mb-6">
            <Link to="/" className="hover:text-white transition-colors">
              الرئيسية
            </Link>
            <span>/</span>
            <Link to="/articles" className="hover:text-white transition-colors">
              المقالات
            </Link>
            <span>/</span>
            <span className="text-white">{category?.label || 'مقال'}</span>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="text-6xl drop-shadow-lg">{article.icon}</div>
            {category && (
              <span className="px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-sm font-semibold">
                {category.label}
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-6">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-5 text-sm text-white/85">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center font-bold">
                {article.author.name.charAt(0)}
              </div>
              <div>
                <div className="font-semibold text-white">{article.author.name}</div>
                <div className="text-xs">{article.author.role}</div>
              </div>
            </div>
            <span className="hidden sm:inline opacity-50">•</span>
            <span>{publishedDate}</span>
            <span className="hidden sm:inline opacity-50">•</span>
            <span className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4"
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
              {article.readMinutes} دقائق قراءة
            </span>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="bg-white py-14">
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose-article" dangerouslySetInnerHTML={{ __html: article.content }} />

          {/* Tags */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-semibold text-gray-700">الوسوم:</span>
              {article.tags.map(t => (
                <span
                  key={t}
                  className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Share */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">شارك:</span>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold transition-colors"
            >
              تويتر
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(article.title + ' - ' + (typeof window !== 'undefined' ? window.location.href : ''))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#1ebe5a] text-white text-sm font-semibold transition-colors"
            >
              واتساب
            </a>
            <button
              onClick={() => navigator.clipboard?.writeText(window.location.href)}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold transition-colors"
            >
              نسخ الرابط
            </button>
          </div>
        </article>
      </main>

      {/* Related */}
      {related.length > 0 && (
        <section className="bg-gray-50 py-14">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">مقالات ذات صلة</h2>
            <div className="grid md:grid-cols-3 gap-5">
              {related.map(r => (
                <Link
                  key={r.slug}
                  to={`/articles/${r.slug}`}
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 ring-1 ring-gray-100 transition-all duration-300 block"
                >
                  <div
                    className={`h-28 bg-gradient-to-br ${r.gradient} flex items-center justify-center text-5xl`}
                  >
                    {r.icon}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 group-hover:text-primary-700 transition-colors line-clamp-2">
                      {r.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-10 bg-gray-900 text-gray-400 text-sm text-center">
        <Link to="/" className="text-white hover:text-primary-300 transition-colors">
          {content.brand.nameArFull}
        </Link>
        <div className="mt-2">© {new Date().getFullYear()} — جميع الحقوق محفوظة</div>
      </footer>

      {/* Typography CSS for the article body */}
      <style>{`
        .prose-article { line-height: 1.9; font-size: 17px; color: #1f2937; }
        .prose-article > p { margin: 0 0 1.25em 0; }
        .prose-article p.lead { font-size: 1.15em; color: #374151; font-weight: 500; border-right: 4px solid #10b981; padding-right: 1em; }
        .prose-article h2 { font-size: 1.65em; font-weight: 700; color: #111827; margin: 1.8em 0 0.6em; }
        .prose-article h3 { font-size: 1.25em; font-weight: 700; color: #111827; margin: 1.4em 0 0.5em; }
        .prose-article ul, .prose-article ol { margin: 1em 0 1.25em 0; padding-right: 1.8em; }
        .prose-article li { margin: 0.4em 0; }
        .prose-article strong { color: #059669; font-weight: 700; }
        .prose-article em { font-style: normal; color: #6b21a8; font-weight: 500; }
        .prose-article table.comparison { width: 100%; border-collapse: collapse; margin: 1.5em 0; font-size: 0.95em; }
        .prose-article table.comparison th { background: #0f766e; color: white; padding: 0.75em; font-weight: 700; text-align: right; }
        .prose-article table.comparison td { padding: 0.75em; border-bottom: 1px solid #e5e7eb; }
        .prose-article table.comparison tr:nth-child(even) { background: #f9fafb; }
        .prose-article .callout { margin: 1.5em 0; padding: 1em 1.25em; border-radius: 0.75rem; border-right: 4px solid; }
        .prose-article .callout strong { color: inherit; }
        .prose-article .callout-info { background: #eff6ff; border-color: #3b82f6; color: #1e3a8a; }
        .prose-article .callout-success { background: #ecfdf5; border-color: #10b981; color: #065f46; }
        .prose-article .callout-warning { background: #fffbeb; border-color: #f59e0b; color: #78350f; }
      `}</style>
    </div>
  );
}
