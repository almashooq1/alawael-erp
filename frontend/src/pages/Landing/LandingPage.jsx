/**
 * LandingPage — Premium Arabic-first landing for مراكز الأوائل للرعاية والتأهيل.
 *
 * All textual content, stats, branches, programs, testimonials, and FAQ
 * live in src/data/landingContent.js. Edit that file to change copy;
 * this component only owns layout + motion.
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import content from '../../data/landingContent';

/* ══════════════════════ helpers ══════════════════════ */
function useOnScreen(ref, threshold = 0.15) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true);
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return visible;
}

function CountUp({ end, duration = 2000, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const visible = useOnScreen(ref);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.ceil(end / (duration / 16));
    const id = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(id);
      } else setCount(start);
    }, 16);
    return () => clearInterval(id);
  }, [visible, end, duration]);
  return (
    <span ref={ref}>
      {count.toLocaleString('ar-SA')}
      {suffix}
    </span>
  );
}

/* Typewriter hook */
function useTypewriter(words, typingSpeed = 100, deletingSpeed = 60, pauseTime = 2200) {
  const [text, setText] = useState('');
  const [wordIdx, setWordIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = words[wordIdx];
    let timeout;
    if (!isDeleting && text === current) {
      timeout = setTimeout(() => setIsDeleting(true), pauseTime);
    } else if (isDeleting && text === '') {
      setIsDeleting(false);
      setWordIdx(prev => (prev + 1) % words.length);
    } else {
      timeout = setTimeout(
        () => {
          setText(current.substring(0, text.length + (isDeleting ? -1 : 1)));
        },
        isDeleting ? deletingSpeed : typingSpeed
      );
    }
    return () => clearTimeout(timeout);
  }, [text, isDeleting, wordIdx, words, typingSpeed, deletingSpeed, pauseTime]);

  return text;
}

/* Smooth scroll helper */
function smoothScrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ══════════════════════ Floating Particles ══════════════════════ */
function FloatingParticles({ count = 30, color = 'white' }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 1,
        duration: Math.random() * 20 + 15,
        delay: Math.random() * 10,
        opacity: Math.random() * 0.3 + 0.1,
      })),
    [count]
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full animate-float"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: color,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ══════════════════════ Scroll Progress Bar ══════════════════════ */
function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const handler = () => {
      const scrolled = document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setProgress(height > 0 ? (scrolled / height) * 100 : 0);
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-1">
      <div
        className="h-full bg-gradient-to-l from-accent-400 via-primary-500 to-emerald-500 transition-all duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

/* ══════════════════════ Back to Top ══════════════════════ */
function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const handler = () => setShow(window.scrollY > 600);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed bottom-8 left-8 z-50 w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-xl shadow-primary-600/30 flex items-center justify-center transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
      aria-label="العودة للأعلى"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
    </button>
  );
}

/* ══════════════════════ icons ══════════════════════ */
const icons = {
  rehab: (
    <svg
      className="w-8 h-8"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  ),
  education: (
    <svg
      className="w-8 h-8"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
      />
    </svg>
  ),
  hr: (
    <svg
      className="w-8 h-8"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  ),
  finance: (
    <svg
      className="w-8 h-8"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
      />
    </svg>
  ),
  admin: (
    <svg
      className="w-8 h-8"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  reports: (
    <svg
      className="w-8 h-8"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  ),
};

/* ══════════════════════ data — sourced from landingContent.js ══════════════════════ */
// Map iconKey strings in content to SVG icon components defined above.
const services = content.services.map(s => ({ ...s, icon: icons[s.iconKey] || icons.admin }));
const stats = content.stats;
const testimonials = content.testimonials;
const whyUsFeatures = content.whyUs;
const howItWorks = content.howItWorks.steps;
const faqs = content.faq;
const trustedBy = content.trustedBy;

/* ══════════════════════ Navbar ══════════════════════ */
function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  // Shorter subset of nav shown in the compact top bar (full list lives in footer + mobile menu).
  const navLinks = useMemo(
    () => [
      ['الرئيسية', 'hero'],
      ['من نحن', 'about'],
      ['خدماتنا', 'services'],
      ['برامجنا', 'programs'],
      ['فروعنا', 'branches'],
      ['تواصل معنا', 'contact'],
    ],
    []
  );

  useEffect(() => {
    const ids = navLinks.map(([, id]) => id);
    const handler = () => {
      setScrolled(window.scrollY > 40);
      for (let i = ids.length - 1; i >= 0; i--) {
        const el = document.getElementById(ids[i]);
        if (el && window.scrollY >= el.offsetTop - 200) {
          setActiveSection(ids[i]);
          break;
        }
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [navLinks]);

  const handleNav = useCallback((e, id) => {
    e.preventDefault();
    setIsOpen(false);
    smoothScrollTo(id);
  }, []);

  return (
    <nav
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/90 backdrop-blur-2xl shadow-lg shadow-black/[0.03] border-b border-gray-100/50' : 'bg-transparent'}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a
            href="#hero"
            onClick={e => handleNav(e, 'hero')}
            className="flex items-center gap-3 group"
            aria-label={content.brand.nameArFull}
          >
            <div
              className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 overflow-hidden ${
                scrolled
                  ? 'bg-white shadow-lg shadow-primary-600/20 ring-1 ring-gray-100'
                  : 'bg-white/15 backdrop-blur-md border border-white/25'
              }`}
            >
              <img
                src={content.brand.logoSrc}
                alt={content.brand.nameArFull}
                className="w-full h-full object-contain p-1.5"
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span
                className={`text-lg font-bold transition-colors duration-500 ${scrolled ? 'text-gray-900' : 'text-white'}`}
              >
                {content.brand.nameAr}
              </span>
              <span
                className={`text-[11px] font-medium transition-colors duration-500 ${scrolled ? 'text-primary-600' : 'text-white/70'}`}
              >
                {content.brand.tagline}
              </span>
            </div>
          </a>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map(([label, id]) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={e => handleNav(e, id)}
                className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeSection === id
                    ? scrolled
                      ? 'text-primary-700 bg-primary-50'
                      : 'text-white bg-white/15'
                    : scrolled
                      ? 'text-gray-600 hover:text-primary-700 hover:bg-primary-50/50'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {label}
                {activeSection === id && (
                  <span
                    className={`absolute bottom-0 right-1/2 translate-x-1/2 w-5 h-0.5 rounded-full ${scrolled ? 'bg-primary-600' : 'bg-accent-400'}`}
                  />
                )}
              </a>
            ))}
            <div className="w-px h-6 bg-gray-300/30 mx-3" />
            <Link
              to="/register"
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${scrolled ? 'text-primary-700 hover:bg-primary-50' : 'text-white/90 hover:bg-white/10'}`}
            >
              حساب جديد
            </Link>
            <Link
              to="/login"
              className={`group relative px-7 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 overflow-hidden ${scrolled ? 'bg-gradient-to-l from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-600/25 hover:shadow-xl hover:shadow-primary-600/30 hover:-translate-y-0.5' : 'bg-white text-primary-700 shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5'}`}
            >
              <span className="relative z-10">تسجيل الدخول</span>
              <div className="absolute inset-0 bg-gradient-to-l from-primary-700 to-primary-800 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`lg:hidden p-2.5 rounded-xl transition-all duration-300 ${scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'}`}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`lg:hidden transition-all duration-500 overflow-hidden ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-5 mb-4 border border-gray-100/50">
            {navLinks.map(([label, id]) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={e => handleNav(e, id)}
                className={`block py-3 font-medium border-b border-gray-100/50 last:border-0 transition-colors ${activeSection === id ? 'text-primary-700' : 'text-gray-700 hover:text-primary-600'}`}
              >
                {label}
              </a>
            ))}
            <div className="flex gap-3 mt-4">
              <Link
                to="/register"
                onClick={() => setIsOpen(false)}
                className="flex-1 py-3 rounded-xl border-2 border-primary-200 text-primary-700 text-center font-bold hover:bg-primary-50 transition-colors"
              >
                حساب جديد
              </Link>
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="flex-1 py-3 rounded-xl bg-gradient-to-l from-primary-600 to-primary-700 text-white text-center font-bold hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg"
              >
                دخول
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

/* ══════════════════════ Hero ══════════════════════ */
function Hero() {
  const booking = useBooking();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const typewriterText = useTypewriter(content.hero.titleRotating, 90, 50, 2000);

  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Layered gradient background */}
      <div className="absolute inset-0 bg-gradient-to-bl from-primary-900 via-primary-700 to-primary-600" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_20%_40%,rgba(16,185,129,0.15),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_60%,rgba(251,191,36,0.08),transparent)]" />

      {/* Floating particles */}
      <FloatingParticles count={25} color="rgba(255,255,255,0.5)" />

      {/* Animated blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-primary-400/15 rounded-full blur-[100px] animate-blob" />
        <div
          className="absolute top-1/4 -right-20 w-96 h-96 bg-accent-400/10 rounded-full blur-[80px] animate-blob"
          style={{ animationDelay: '3s' }}
        />
        <div
          className="absolute -bottom-32 left-1/3 w-[400px] h-[400px] bg-emerald-400/10 rounded-full blur-[90px] animate-blob"
          style={{ animationDelay: '6s' }}
        />
      </div>

      {/* Dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Gradient mesh overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-primary-900/40 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Text */}
          <div className="text-right">
            {/* Badge */}
            <div
              className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md text-white/90 text-sm mb-8 border border-white/15 shadow-lg shadow-black/5 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-400" />
              </span>
              {content.hero.badge}
            </div>

            {/* Heading */}
            <h1
              className={`text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-white leading-[1.2] mb-5 transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            >
              <span>{content.hero.titleBefore}</span>
              <br />
              <span className="relative inline-block">
                <span className="bg-gradient-to-l from-accent-300 to-accent-400 bg-clip-text text-transparent">
                  {typewriterText}
                  <span className="animate-pulse text-accent-400 mr-0.5">|</span>
                </span>
                <svg
                  className="absolute -bottom-2 right-0 w-full"
                  viewBox="0 0 200 12"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2 8c40-6 80-6 120-2s60 4 76 2"
                    stroke="rgba(251,191,36,0.4)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <br />
              <span className="text-2xl sm:text-3xl lg:text-[2rem] text-white/85 font-semibold">
                {content.hero.titleAfter}
              </span>
            </h1>

            {/* Description */}
            <p
              className={`text-lg sm:text-xl text-white/75 leading-relaxed max-w-xl mb-8 transition-all duration-1000 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            >
              {content.hero.subtitle}
            </p>

            {/* Key points */}
            <ul
              className={`flex flex-col gap-2.5 mb-10 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              {content.hero.keyPoints.map(p => (
                <li key={p} className="flex items-center gap-3 text-white/85 text-base">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent-400/25 flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-accent-300"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  {p}
                </li>
              ))}
            </ul>

            {/* CTA Buttons */}
            <div
              className={`flex flex-wrap gap-4 transition-all duration-1000 delay-600 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            >
              <button
                type="button"
                onClick={booking.open}
                className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-primary-700 rounded-2xl font-bold text-lg shadow-2xl shadow-black/15 hover:shadow-3xl hover:-translate-y-1 transition-all duration-500 overflow-hidden"
              >
                <span className="relative z-10">احجز زيارة تقييم</span>
                <svg
                  className="relative z-10 w-5 h-5 rotate-180 group-hover:-translate-x-1.5 transition-transform duration-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </button>
              <a
                href={content.hero.secondaryCta.anchor}
                onClick={e => {
                  e.preventDefault();
                  smoothScrollTo(content.hero.secondaryCta.anchor.replace('#', ''));
                }}
                className="group inline-flex items-center gap-3 px-8 py-4 border-2 border-white/25 text-white rounded-2xl font-bold text-lg hover:bg-white/10 hover:border-white/40 transition-all duration-500 backdrop-blur-sm"
              >
                <svg
                  className="w-6 h-6 opacity-70 group-hover:opacity-100 transition-opacity"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
                {content.hero.secondaryCta.label}
              </a>
            </div>

            {/* Trust badges — ministry + years + branches */}
            <div
              className={`flex flex-wrap items-center gap-4 sm:gap-6 mt-10 transition-all duration-1000 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <svg
                  className="w-5 h-5 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
                تأسس عام {content.brand.foundedHijri} هـ
              </div>
              <div className="h-4 w-px bg-white/20" />
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <svg
                  className="w-5 h-5 text-accent-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11m16-11v11M8 14v3m4-3v3m4-3v3"
                  />
                </svg>
                {content.branches.items.length} فروع في الرياض
              </div>
              <div className="h-4 w-px bg-white/20" />
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <svg
                  className="w-5 h-5 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 3a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                +400 متخصص
              </div>
            </div>
          </div>

          {/* Visual - Glass Dashboard Preview */}
          <div
            className={`hidden lg:flex justify-center transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}
          >
            <div className="relative animate-float">
              {/* Main glass card */}
              <div className="w-[400px] h-[420px] rounded-3xl bg-white/[0.07] backdrop-blur-xl border border-white/[0.15] shadow-2xl shadow-black/20 p-7 flex flex-col">
                {/* Browser dots */}
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                  <div className="w-3 h-3 rounded-full bg-green-400/80" />
                  <div className="flex-1 h-6 rounded-full bg-white/10 mx-3" />
                </div>

                {/* Mock header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="h-5 bg-white/20 rounded w-28" />
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white/10" />
                    <div className="w-8 h-8 rounded-lg bg-white/10" />
                  </div>
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { bg: 'bg-emerald-400/20', bar: 'bg-emerald-400', w: '75%' },
                    { bg: 'bg-accent-400/20', bar: 'bg-accent-400', w: '60%' },
                    { bg: 'bg-blue-400/20', bar: 'bg-blue-400', w: '85%' },
                  ].map((k, i) => (
                    <div key={i} className={`rounded-xl p-3 ${k.bg}`}>
                      <div className="h-3 bg-white/20 rounded w-2/3 mb-2" />
                      <div className="h-5 bg-white/30 rounded w-1/2 mb-2" />
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full ${k.bar} rounded-full`} style={{ width: k.w }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chart area */}
                <div className="flex-1 bg-white/5 rounded-xl p-4">
                  <div className="h-3 bg-white/15 rounded w-20 mb-3" />
                  <div className="flex items-end gap-2 h-full pb-2">
                    {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-gradient-to-t from-primary-400/40 to-emerald-400/40 transition-all duration-700 hover:from-primary-400/70 hover:to-emerald-400/70"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating notification card - top right */}
              <div
                className="absolute -top-5 -right-10 bg-white rounded-2xl shadow-2xl shadow-black/10 p-4 animate-fade-in-up border border-gray-100"
                style={{ animationDelay: '1s' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">مستفيدين اليوم</div>
                    <div className="text-lg font-bold text-gray-800">٢٤٧</div>
                  </div>
                </div>
              </div>

              {/* Floating stat card - bottom left */}
              <div
                className="absolute -bottom-5 -left-14 bg-white rounded-2xl shadow-2xl shadow-black/10 p-4 animate-fade-in-up border border-gray-100"
                style={{ animationDelay: '1.5s' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-400 to-amber-500 flex items-center justify-center text-white text-sm">
                    📊
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">نسبة التحسن</div>
                    <div className="text-lg font-bold text-primary-700">٩٢٪</div>
                  </div>
                </div>
              </div>

              {/* Floating security badge */}
              <div
                className="absolute top-1/2 -left-20 -translate-y-1/2 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 animate-fade-in"
                style={{ animationDelay: '2s' }}
              >
                <svg
                  className="w-6 h-6 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wave separator */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" className="w-full" preserveAspectRatio="none">
          <path d="M0 120V80c120-30 240-50 480-40s360 30 480 20 240-20 480-30v90H0z" fill="white" />
        </svg>
      </div>
    </section>
  );
}

/* ══════════════════════ Trusted By (Ticker) ══════════════════════ */
function TrustedBy() {
  const ref = useRef(null);
  const visible = useOnScreen(ref, 0.1);
  return (
    <section ref={ref} className="py-16 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`text-center mb-10 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
            متوافق مع معايير ومتطلبات
          </p>
        </div>
        {/* Marquee ticker */}
        <div className="relative overflow-hidden">
          {/* fade edges */}
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div
            className={`flex gap-12 animate-marquee transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}
          >
            {[...trustedBy, ...trustedBy].map((name, i) => (
              <div
                key={i}
                className="flex items-center gap-3 shrink-0 px-5 py-3 rounded-xl bg-gray-50 border border-gray-100"
              >
                <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-primary-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-600 whitespace-nowrap">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inline style for marquee animation */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}

/* ══════════════════════ Services ══════════════════════ */
function Services() {
  const ref = useRef(null);
  const visible = useOnScreen(ref);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  return (
    <section id="services" ref={ref} className="py-28 bg-white relative">
      {/* Subtle background accents */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary-50/50 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent-50/50 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={`text-center mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary-50 text-primary-700 text-sm font-semibold mb-5 border border-primary-100">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
              />
            </svg>
            خدماتنا
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-5">
            خدماتنا التأهيلية المتخصصة
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            6 أقسام علاجية متكاملة تعمل بتناغم لخدمة كل مستفيد وفق خطّة فردية
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((s, i) => (
            <div
              key={s.title}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`group relative rounded-3xl p-8 border bg-white shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 ${hoveredIdx === i ? `border-transparent ring-2 ${s.ring}` : 'border-gray-100 hover:border-gray-200'} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              {/* Icon */}
              <div
                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${s.color} text-white flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:shadow-xl group-hover:rotate-3 transition-all duration-500`}
              >
                {s.icon}
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-primary-700 transition-colors">
                {s.title}
              </h3>
              <p className="text-gray-500 leading-relaxed text-[15px]">{s.desc}</p>

              {/* Arrow link */}
              <div className="mt-6 flex items-center gap-2 text-sm font-medium text-primary-600 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                <span>اعرف المزيد</span>
                <svg
                  className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>

              {/* Hover gradient overlay */}
              <div
                className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${s.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════ How It Works ══════════════════════ */
function HowItWorks() {
  const ref = useRef(null);
  const visible = useOnScreen(ref);
  return (
    <section id="how-it-works" ref={ref} className="py-28 bg-gray-50 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_30%_at_50%_100%,rgba(21,128,61,0.04),transparent)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={`text-center mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary-50 text-primary-700 text-sm font-semibold mb-5 border border-primary-100">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
              />
            </svg>
            كيف يعمل
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-5">
            {content.howItWorks.title}
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            {content.howItWorks.subtitle}
          </p>
        </div>

        {/* Steps */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {howItWorks.map((step, i) => (
            <div
              key={step.step}
              className={`relative text-center group transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              {/* Connector line on desktop */}
              {i < howItWorks.length - 1 && (
                <div className="hidden lg:block absolute top-12 -left-4 w-[calc(100%-0px)] h-px">
                  <div
                    className={`w-full h-full bg-gradient-to-l from-primary-200 to-primary-100 transition-all duration-1000 ${visible ? 'scale-x-100' : 'scale-x-0'}`}
                    style={{ transitionDelay: `${(i + 1) * 200}ms`, transformOrigin: 'right' }}
                  />
                </div>
              )}

              {/* Step number + icon */}
              <div className="relative inline-flex mb-6">
                <div
                  className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${step.color} flex items-center justify-center text-4xl shadow-xl group-hover:scale-110 group-hover:shadow-2xl group-hover:-rotate-6 transition-all duration-500`}
                >
                  {step.icon}
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center text-sm font-bold text-primary-700 border-2 border-primary-200">
                  {step.step}
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-700 transition-colors">
                {step.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════ Why Us ══════════════════════ */
function WhyUs() {
  const ref = useRef(null);
  const visible = useOnScreen(ref);
  return (
    <section id="why-us" ref={ref} className="py-28 bg-white relative overflow-hidden">
      {/* Background mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(21,128,61,0.04),transparent)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Content */}
          <div
            className={`transition-all duration-700 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
          >
            <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary-50 text-primary-700 text-sm font-semibold mb-5 border border-primary-100">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              </svg>
              لماذا نحن
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-5 leading-tight">
              لماذا تختار
              <span className="text-primary-600"> نظام الأوائل؟</span>
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed mb-10">
              نوفّر لك حلاً تقنياً متكاملاً يجمع بين البساطة والقوة، مع دعم فني متواصل ومعايير أمان
              عالمية.
            </p>

            {/* Features grid */}
            <div className="grid grid-cols-2 gap-5">
              {whyUsFeatures.map((f, i) => (
                <div
                  key={f.title}
                  className={`p-5 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-white hover:border-primary-100 hover:shadow-lg transition-all duration-500 group ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className="text-2xl mb-3 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 inline-block">
                    {f.icon}
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm mb-1.5">{f.title}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Visual */}
          <div
            className={`hidden lg:block transition-all duration-1000 delay-300 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}
          >
            <div className="relative">
              {/* Main visual: Connected modules illustration */}
              <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-3xl p-10 shadow-2xl relative overflow-hidden">
                <div
                  className="absolute inset-0 opacity-5"
                  style={{
                    backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                />
                <FloatingParticles count={12} color="rgba(255,255,255,0.4)" />

                <div className="relative text-center space-y-6">
                  {/* Central icon */}
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center animate-pulse-soft">
                    <span className="text-4xl font-bold text-accent-400">أ</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white">نظام واحد متكامل</h3>
                  <p className="text-white/60 text-sm max-w-xs mx-auto">
                    كل ما تحتاجه لإدارة مركزك في منصة واحدة
                  </p>

                  {/* Module badges */}
                  <div className="flex flex-wrap justify-center gap-3 pt-4">
                    {[
                      'التأهيل',
                      'التعليم',
                      'الموارد البشرية',
                      'المالية',
                      'التقارير',
                      'المخازن',
                    ].map(m => (
                      <span
                        key={m}
                        className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm text-white/90 text-sm border border-white/10 hover:bg-white/20 hover:border-white/25 transition-all cursor-default"
                      >
                        {m}
                      </span>
                    ))}
                  </div>

                  {/* Animated pulse ring */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className="w-32 h-32 rounded-full border border-white/5 animate-ping"
                      style={{ animationDuration: '4s' }}
                    />
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -top-4 -left-4 bg-white rounded-2xl shadow-xl p-4 border border-gray-100 hover:shadow-2xl transition-shadow">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 text-sm">
                    ✓
                  </div>
                  <span className="text-sm font-bold text-gray-800">99.9% مدة التشغيل</span>
                </div>
              </div>

              {/* Floating users count */}
              <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl p-4 border border-gray-100 hover:shadow-2xl transition-shadow">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 text-sm">
                    👥
                  </div>
                  <span className="text-sm font-bold text-gray-800">+2500 مستخدم</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════ Stats ══════════════════════ */
function Stats() {
  const ref = useRef(null);
  const visible = useOnScreen(ref);
  return (
    <section id="stats" ref={ref} className="py-28 relative overflow-hidden">
      {/* Rich gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(16,185,129,0.1),transparent)]" />

      <FloatingParticles count={15} color="rgba(255,255,255,0.3)" />

      {/* Dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 text-white/90 text-sm font-semibold mb-5 backdrop-blur-sm border border-white/10">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
              />
            </svg>
            إنجازاتنا
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">
            أرقام نفخر بها
          </h2>
          <p className="text-lg text-white/65 max-w-xl mx-auto leading-relaxed">
            نتائج حقيقية تعكس التزامنا بتقديم أفضل خدمات الرعاية والتأهيل
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`group text-center p-8 rounded-3xl bg-white/[0.07] backdrop-blur-md border border-white/[0.1] hover:bg-white/[0.14] hover:border-white/[0.2] hover:scale-[1.03] transition-all duration-500 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <div className="text-4xl mb-4 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-500">
                {s.icon}
              </div>
              <div className="text-4xl sm:text-5xl font-bold text-white mb-2 tabular-nums">
                <CountUp end={s.value} suffix={s.suffix} />
              </div>
              <div className="text-white/60 font-medium text-sm">{s.label}</div>
              {/* Decorative bottom line */}
              <div className="mt-4 mx-auto w-12 h-1 rounded-full bg-gradient-to-l from-accent-400/60 to-primary-400/60 group-hover:w-20 transition-all duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════ Testimonials (Auto-slide) ══════════════════════ */
function Testimonials() {
  const ref = useRef(null);
  const visible = useOnScreen(ref);
  const [active, setActive] = useState(0);

  // Auto-slide
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setActive(prev => (prev + 1) % testimonials.length), 5000);
    return () => clearInterval(id);
  }, [visible]);

  return (
    <section id="testimonials" ref={ref} className="py-28 bg-gray-50 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary-50/40 rounded-full blur-[100px] translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent-50/30 rounded-full blur-[100px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary-50 text-primary-700 text-sm font-semibold mb-5 border border-primary-100">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
              />
            </svg>
            آراء العملاء
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-5">
            ماذا يقولون عنا
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
            تجارب حقيقية من مستخدمي النظام
          </p>
        </div>

        {/* Featured testimonial */}
        <div className="max-w-3xl mx-auto mb-12">
          <div
            className={`relative bg-white rounded-3xl p-10 sm:p-12 border border-gray-100 shadow-xl transition-all duration-700 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
          >
            {/* Quote icon */}
            <div className="absolute top-8 left-8 text-primary-100">
              <svg className="w-14 h-14" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609L9.978 5.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H0z" />
              </svg>
            </div>

            {/* Stars */}
            <div className="flex items-center gap-1 mb-6">
              {Array.from({ length: testimonials[active].rating }).map((_, j) => (
                <svg key={j} className="w-6 h-6 text-accent-500 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>

            {/* Text */}
            <p className="text-xl sm:text-2xl text-gray-700 leading-relaxed mb-8 relative z-10 font-medium">
              "{testimonials[active].text}"
            </p>

            {/* Author */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-3xl shadow-inner ring-4 ring-primary-50">
                {testimonials[active].avatar}
              </div>
              <div>
                <div className="font-bold text-gray-900 text-lg">{testimonials[active].name}</div>
                <div className="text-sm text-gray-500">{testimonials[active].role}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Indicators + Mini cards */}
        <div className="flex justify-center items-center gap-3">
          {testimonials.map((t, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`transition-all duration-500 rounded-full ${active === i ? 'w-10 h-3 bg-primary-600' : 'w-3 h-3 bg-gray-300 hover:bg-primary-300'}`}
              aria-label={`شهادة ${t.name}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════ FAQ Accordion ══════════════════════ */
function FAQ() {
  const ref = useRef(null);
  const visible = useOnScreen(ref);
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <section id="faq" ref={ref} className="py-28 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary-50/50 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/3" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary-50 text-primary-700 text-sm font-semibold mb-5 border border-primary-100">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
              />
            </svg>
            الأسئلة الشائعة
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-5">
            أسئلة متكررة
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            إجابات على أكثر الأسئلة شيوعاً حول نظام الأوائل
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`rounded-2xl border transition-all duration-500 ${openIdx === i ? 'bg-white border-primary-200 shadow-lg shadow-primary-100/50' : 'bg-gray-50 border-gray-100 hover:bg-white hover:border-gray-200 hover:shadow-md'} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <button
                onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
                className="w-full flex items-center justify-between p-6 text-right"
              >
                <span
                  className={`font-bold transition-colors ${openIdx === i ? 'text-primary-700' : 'text-gray-900'}`}
                >
                  {faq.q}
                </span>
                <div
                  className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 mr-4 ${openIdx === i ? 'bg-primary-100 text-primary-700 rotate-180' : 'bg-gray-100 text-gray-500'}`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </div>
              </button>
              <div
                className={`overflow-hidden transition-all duration-500 ${openIdx === i ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <div className="px-6 pb-6 text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                  {faq.a}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════ Platform Features ══════════════════════ */
function PlatformFeatures() {
  const ref = useRef(null);
  const visible = useOnScreen(ref, 0.1);
  const pf = content.platformFeatures;
  return (
    <section
      id="platform"
      ref={ref}
      className="py-28 bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 relative overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="absolute top-20 -right-20 w-96 h-96 bg-accent-400/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-20 -left-20 w-96 h-96 bg-emerald-400/10 rounded-full blur-[120px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-400/15 text-accent-300 text-xs font-bold tracking-wider uppercase mb-4 ring-1 ring-accent-400/20">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" />
            منصّة رقمية
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">{pf.title}</h2>
          <p className="text-lg text-white/70 max-w-3xl mx-auto leading-relaxed">{pf.subtitle}</p>
          <div className="h-1 w-20 mx-auto rounded-full bg-gradient-to-l from-accent-400 to-emerald-400 mt-5" />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {pf.items.map((f, i) => (
            <div
              key={f.title}
              className={`group relative p-6 rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 hover:border-accent-400/40 hover:bg-white/[0.07] hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">{f.icon}</div>
                <span className="text-[10px] px-2 py-1 rounded-full bg-accent-400/15 text-accent-300 font-semibold tracking-wider">
                  {f.badge}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-accent-300 transition-colors">
                {f.title}
              </h3>
              <p className="text-sm text-white/65 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════ Team ══════════════════════ */
function Team() {
  const ref = useRef(null);
  const visible = useOnScreen(ref, 0.1);
  const t = content.team;
  return (
    <section id="team" ref={ref} className="py-28 bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_30%_at_50%_0%,rgba(245,158,11,0.04),transparent)]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div
          className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent-50 text-accent-700 text-xs font-bold tracking-wider uppercase mb-4">
            فريقنا
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{t.title}</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{t.subtitle}</p>
          <div className="h-1 w-20 mx-auto rounded-full bg-gradient-to-l from-accent-500 to-primary-500 mt-5" />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {t.items.map((member, i) => (
            <article
              key={member.name}
              className={`group relative p-7 rounded-3xl bg-gradient-to-br from-white to-gray-50 ring-1 ring-gray-100 hover:ring-primary-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div
                className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${member.color} text-white flex items-center justify-center text-4xl mb-4 shadow-lg group-hover:scale-105 transition-transform`}
              >
                {member.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{member.name}</h3>
              <p className="text-sm text-primary-700 font-semibold mb-1">{member.role}</p>
              <p className="text-xs text-gray-500 mb-3" dir="ltr">
                {member.specialty}
              </p>
              <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                {member.badge}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════ Booking Modal ══════════════════════ */
function BookingModal({ open, onClose }) {
  const ap = content.appointment;
  const branches = content.branches.items;
  const [form, setForm] = useState({
    parentName: '',
    parentPhone: '',
    childName: '',
    childAge: '',
    conditionType: '',
    branchPreference: '',
    preferredTime: '',
    notes: '',
    website: '', // honeypot — humans leave empty
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setApiError('');

    // 1) Post to backend (/api/bookings/public). Server-recorded leads don't
    //    depend on WhatsApp being available; we still open WhatsApp afterward
    //    as a convenience channel.
    let serverConfirmation = '';
    try {
      const resp = await fetch('/api/bookings/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentName: form.parentName,
          parentPhone: form.parentPhone,
          childName: form.childName,
          childAge: Number(form.childAge),
          conditionType: form.conditionType,
          branchPreference: form.branchPreference,
          preferredTime: form.preferredTime,
          notes: form.notes,
          website: form.website, // honeypot
          consentMarketing: false,
        }),
      });
      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        serverConfirmation = data.confirmationNumber || '';
      } else if (resp.status === 429) {
        setApiError('تجاوزت عدد الطلبات المسموح. حاول بعد قليل.');
      } else {
        const data = await resp.json().catch(() => ({}));
        setApiError(data.message || 'تعذّر إرسال الطلب للخادم — سنحاول واتساب.');
      }
    } catch (err) {
      // Network failure — fall through to WhatsApp as a fallback channel.
      setApiError('تعذّر الاتصال بالخادم — سنرسل طلبك عبر واتساب.');
    }

    // 2) Open WhatsApp with pre-filled message (works even if API failed).
    const lines = [
      `اسم ولي الأمر: ${form.parentName}`,
      `رقم الجوال: ${form.parentPhone}`,
      `اسم الطفل: ${form.childName}`,
      `عمر الطفل: ${form.childAge} سنوات`,
      `نوع الحالة: ${form.conditionType}`,
      `الفرع المفضّل: ${form.branchPreference}`,
      `الفترة المفضّلة: ${form.preferredTime}`,
      form.notes ? `ملاحظات: ${form.notes}` : '',
      serverConfirmation ? `رقم التأكيد: ${serverConfirmation}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    const msg = `${ap.whatsappTemplate}\n\n${lines}`;
    window.open(
      `https://wa.me/${ap.whatsappNumber}?text=${encodeURIComponent(msg)}`,
      '_blank',
      'noopener'
    );

    setConfirmationNumber(serverConfirmation);
    setSubmitted(true);
    setSubmitting(false);
    try {
      localStorage.setItem(
        'alawael:lastBooking',
        JSON.stringify({ ...form, confirmation: serverConfirmation, at: new Date().toISOString() })
      );
    } catch {
      /* storage may be blocked */
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-title"
    >
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="relative bg-gradient-to-br from-primary-600 to-emerald-600 p-6 text-white flex-shrink-0">
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 id="booking-title" className="text-2xl font-bold mb-1">
            {ap.title}
          </h2>
          <p className="text-white/85 text-sm">{ap.subtitle}</p>
        </div>

        {submitted ? (
          <div className="p-10 text-center flex-1 flex flex-col justify-center items-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
              <svg
                className="w-10 h-10 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">تم استلام طلبك بنجاح</h3>
            {confirmationNumber ? (
              <div className="mb-4">
                <p className="text-gray-600 mb-2">رقم التأكيد الخاص بك:</p>
                <code
                  className="inline-block px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-lg tracking-wider border border-emerald-200"
                  dir="ltr"
                >
                  {confirmationNumber}
                </code>
              </div>
            ) : null}
            <p className="text-gray-600 mb-6 max-w-md">
              سيتواصل معك فريق الاستقبال خلال 24 ساعة. فتحنا لك أيضاً محادثة واتساب إن أردت التواصل
              فوراً.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setConfirmationNumber('');
                setApiError('');
                onClose();
                setForm({
                  parentName: '',
                  parentPhone: '',
                  childName: '',
                  childAge: '',
                  conditionType: '',
                  branchPreference: '',
                  preferredTime: '',
                  notes: '',
                  website: '',
                });
              }}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
            >
              إغلاق
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <Field
                label={ap.formFields.parentName}
                required
                value={form.parentName}
                onChange={v => update('parentName', v)}
              />
              <Field
                label={ap.formFields.parentPhone}
                required
                type="tel"
                dir="ltr"
                placeholder="05xxxxxxxx"
                value={form.parentPhone}
                onChange={v => update('parentPhone', v)}
              />
              <Field
                label={ap.formFields.childName}
                required
                value={form.childName}
                onChange={v => update('childName', v)}
              />
              <Field
                label={ap.formFields.childAge}
                required
                type="number"
                min={1}
                max={30}
                value={form.childAge}
                onChange={v => update('childAge', v)}
              />
              <Select
                label={ap.formFields.conditionType}
                required
                options={ap.conditions}
                value={form.conditionType}
                onChange={v => update('conditionType', v)}
              />
              <Select
                label={ap.formFields.branchPreference}
                required
                options={branches.map(b => `${b.name} (${b.audience})`)}
                value={form.branchPreference}
                onChange={v => update('branchPreference', v)}
              />
              <Select
                label={ap.formFields.preferredTime}
                required
                options={ap.timeSlots}
                value={form.preferredTime}
                onChange={v => update('preferredTime', v)}
              />
            </div>
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {ap.formFields.notes}
              </label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={e => update('notes', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all resize-none text-sm"
                placeholder="أي تفاصيل تساعدنا في تجهيز الزيارة..."
              />
            </div>

            {/* Honeypot — hidden from users, catches bots. */}
            <div className="absolute w-0 h-0 overflow-hidden" aria-hidden="true">
              <label>
                Website (do not fill)
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={e => update('website', e.target.value)}
                />
              </label>
            </div>

            {apiError ? (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                {apiError}
              </div>
            ) : null}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl shadow-lg shadow-primary-600/25 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {submitting ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeOpacity="0.25"
                      />
                      <path
                        d="M12 2a10 10 0 0110 10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                    جارٍ الإرسال...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 3h18M3 8h18M3 13h18M3 18h12"
                      />
                    </svg>
                    أرسل طلب الحجز
                  </>
                )}
              </button>
              <a
                href={`tel:${content.contact.mainPhone}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-2xl transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                  />
                </svg>
                اتصل الآن
              </a>
            </div>
            <p className="text-xs text-gray-500 text-center mt-4">
              سيتم إرسال طلبك لخادمنا المحلي + فتح واتساب كقناة تواصل سريعة. نلتزم بسرية بياناتكم
              وفق نظام حماية البيانات الشخصية (PDPL).
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, required, type = 'text', dir, placeholder, value, onChange, min, max }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      <input
        type={type}
        required={required}
        dir={dir}
        placeholder={placeholder}
        value={value}
        min={min}
        max={max}
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all text-sm"
      />
    </label>
  );
}

function Select({ label, required, options, value, onChange }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      <select
        required={required}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all text-sm bg-white"
      >
        <option value="" disabled>
          اختر...
        </option>
        {options.map(o => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

/* ══════════════════════ WhatsApp FAB ══════════════════════ */
function WhatsAppFab() {
  const ap = content.appointment;
  const url = `https://wa.me/${ap.whatsappNumber}?text=${encodeURIComponent(ap.whatsappTemplate)}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل واتساب"
      className="hidden sm:flex fixed bottom-6 left-6 z-40 group items-center gap-3 bg-[#25D366] hover:bg-[#1ebe5a] text-white px-4 py-3 rounded-full shadow-2xl shadow-[#25D366]/40 hover:-translate-y-1 transition-all duration-300"
    >
      <span className="relative flex w-11 h-11 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
        <svg className="w-6 h-6 relative" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </span>
      <span className="hidden sm:inline-block font-semibold text-sm pl-1">راسلنا على واتساب</span>
    </a>
  );
}

/* ══════════════════════ SEO JSON-LD ══════════════════════ */
function SeoJsonLd() {
  const jsonLd = useMemo(() => {
    const org = {
      '@context': 'https://schema.org',
      '@type': content.seo.organizationType,
      name: content.brand.nameArFull,
      alternateName: content.brand.nameEnFull,
      url: content.contact.website || 'https://awael.sa',
      logo:
        typeof window !== 'undefined'
          ? new URL(content.brand.logoSrc, window.location.origin).toString()
          : content.brand.logoSrc,
      description: content.seo.description,
      foundingDate: `${content.brand.foundedGregorian}`,
      telephone: content.contact.mainPhone,
      email: content.contact.email,
      address: {
        '@type': 'PostalAddress',
        streetAddress: content.contact.mainAddress,
        addressLocality: 'الرياض',
        addressCountry: 'SA',
      },
      sameAs: content.contact.social.map(s => s.url),
    };
    const branches = content.branches.items.map(b => ({
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: `${content.brand.nameArFull} — ${b.name}`,
      telephone: b.phone,
      address: {
        '@type': 'PostalAddress',
        streetAddress: b.address,
        addressLocality: 'الرياض',
        addressCountry: 'SA',
      },
      parentOrganization: { '@type': content.seo.organizationType, name: content.brand.nameArFull },
    }));
    const faq = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: content.faq.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    };
    return [org, ...branches, faq];
  }, []);

  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(jsonLd);
    script.setAttribute('data-landing-seo', '1');
    document.head.appendChild(script);
    return () => {
      try {
        document.head.removeChild(script);
      } catch {
        /* already removed */
      }
    };
  }, [jsonLd]);

  return null;
}

/* ══════════════════════ Awards Strip ══════════════════════ */
function Awards() {
  const ref = useRef(null);
  const visible = useOnScreen(ref, 0.1);
  const a = content.awards;
  return (
    <section
      id="awards"
      ref={ref}
      className="py-20 bg-white relative overflow-hidden border-y border-gray-100"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`text-center mb-10 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{a.title}</h2>
          <p className="text-gray-500 text-sm">{a.subtitle}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {a.items.map((it, i) => (
            <div
              key={it.name}
              className={`group flex flex-col items-center justify-center p-5 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-lg hover:-translate-y-0.5 ring-1 ring-gray-100 hover:ring-primary-200 transition-all duration-500 text-center ${visible ? 'opacity-100' : 'opacity-0'}`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                {it.icon}
              </div>
              <div className="text-sm font-bold text-gray-900 leading-tight">{it.name}</div>
              <div className="text-[11px] text-gray-500 mt-1 leading-snug">{it.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════ Quiz (Self-Assessment Wizard) ══════════════════════ */
function Quiz() {
  const booking = useBooking();
  const ref = useRef(null);
  const visible = useOnScreen(ref, 0.12);
  const q = content.quiz;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [started, setStarted] = useState(false);

  const totalSteps = q.questions.length;
  const progress =
    started && step < totalSteps ? ((step + 1) / totalSteps) * 100 : started ? 100 : 0;

  const recommendation = useMemo(() => {
    if (step < totalSteps) return null;
    const scores = {};
    q.questions.forEach(qq => {
      const picked = qq.options.find(o => o.value === answers[qq.id]);
      if (!picked?.score) return;
      for (const [svc, pts] of Object.entries(picked.score)) {
        scores[svc] = (scores[svc] || 0) + pts;
      }
    });
    let best = null;
    let bestScore = -1;
    for (const [svc, pts] of Object.entries(scores)) {
      if (pts > bestScore) {
        best = svc;
        bestScore = pts;
      }
    }
    return best && q.recommendations[best]
      ? { id: best, ...q.recommendations[best] }
      : { id: 'fallback', ...q.fallback };
  }, [step, answers, q, totalSteps]);

  const answer = (qid, value) => {
    setAnswers(prev => ({ ...prev, [qid]: value }));
    // Auto-advance after choosing for better mobile UX.
    setTimeout(() => setStep(s => Math.min(s + 1, totalSteps)), 180);
  };

  const restart = () => {
    setStep(0);
    setStarted(false);
    setAnswers({});
  };

  return (
    <section
      id="quiz"
      ref={ref}
      className="py-28 bg-gradient-to-br from-primary-50 via-white to-emerald-50 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(16,185,129,0.08),transparent)]" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div
          className={`text-center mb-10 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 text-primary-700 text-xs font-bold tracking-wider uppercase mb-4 ring-1 ring-primary-100">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
            تقييم مجاني · دقيقتان
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">{q.title}</h2>
          <p className="text-lg text-gray-600 leading-relaxed">{q.subtitle}</p>
        </div>

        <div
          className={`relative bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-500 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        >
          <div className="h-1.5 bg-gray-100">
            <div
              className="h-full bg-gradient-to-l from-primary-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-8 sm:p-10">
            {!started && (
              <div className="text-center py-6">
                <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-primary-500 to-emerald-500 flex items-center justify-center text-4xl shadow-lg shadow-primary-500/25">
                  🔎
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">تقييم سريع بدون تسجيل</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  ستحصل فوراً على توصية ببرنامج مناسب + إمكانية حجز زيارة تقييم تفصيلية.
                </p>
                <button
                  type="button"
                  onClick={() => setStarted(true)}
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl shadow-lg shadow-primary-600/25 hover:-translate-y-0.5 transition-all"
                >
                  {q.ctaStart}
                  <svg
                    className="w-5 h-5 rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </button>
              </div>
            )}

            {started &&
              step < totalSteps &&
              (() => {
                const qq = q.questions[step];
                return (
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <span className="font-semibold">
                        سؤال {step + 1} من {totalSteps}
                      </span>
                      {step > 0 && (
                        <button
                          onClick={() => setStep(s => s - 1)}
                          className="hover:text-primary-600 transition-colors"
                        >
                          ← {q.ctaBack}
                        </button>
                      )}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">{qq.label}</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {qq.options.map(opt => {
                        const active = answers[qq.id] === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => answer(qq.id, opt.value)}
                            className={`text-right p-4 rounded-2xl border-2 transition-all duration-300 ${
                              active
                                ? 'border-primary-500 bg-primary-50 ring-4 ring-primary-100'
                                : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50/30'
                            }`}
                          >
                            <span className="font-semibold text-gray-900">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

            {started && step >= totalSteps && recommendation && (
              <div className="text-center py-4">
                <div
                  className={`w-24 h-24 mx-auto mb-5 rounded-3xl bg-gradient-to-br ${recommendation.color} flex items-center justify-center text-5xl shadow-xl`}
                >
                  {recommendation.icon}
                </div>
                <div className="text-sm font-semibold text-primary-700 mb-2">توصيتنا لطفلك</div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                  {recommendation.title}
                </h3>
                <p className="text-gray-600 max-w-lg mx-auto mb-8 leading-relaxed">
                  {recommendation.why}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    onClick={booking.open}
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl shadow-lg shadow-primary-600/25 hover:-translate-y-0.5 transition-all"
                  >
                    {q.ctaBook}
                    <svg
                      className="w-4 h-4 rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={restart}
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-2xl transition-colors"
                  >
                    {q.ctaRetake}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-6 max-w-md mx-auto">
                  هذه التوصية استرشادية — الخطة النهائية تُبنى بعد تقييم وجاهي مع فريق متعدد
                  التخصصات.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════ Gallery ══════════════════════ */
function Gallery() {
  const ref = useRef(null);
  const visible = useOnScreen(ref, 0.1);
  const g = content.gallery;
  const [filter, setFilter] = useState('all');
  const [lightbox, setLightbox] = useState(null);

  const filtered = filter === 'all' ? g.items : g.items.filter(i => i.category === filter);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = e => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const idx = filtered.findIndex(i => i.id === lightbox.id);
        const delta = e.key === 'ArrowLeft' ? 1 : -1; // RTL-friendly
        const next = filtered[(idx + delta + filtered.length) % filtered.length];
        if (next) setLightbox(next);
      }
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightbox, filtered]);

  return (
    <section id="gallery" ref={ref} className="py-28 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`text-center mb-10 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary-50 text-primary-700 text-xs font-bold tracking-wider uppercase mb-4">
            معرض الصور
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{g.title}</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{g.subtitle}</p>
          <div className="h-1 w-20 mx-auto rounded-full bg-gradient-to-l from-primary-500 to-emerald-500 mt-5" />
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {g.categories.map(c => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                filter === c.id
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/25'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {filtered.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setLightbox(item)}
              className={`group relative aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br ${item.gradient} shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 cursor-pointer ${visible ? 'opacity-100' : 'opacity-0'}`}
              style={{ transitionDelay: `${i * 50}ms` }}
              aria-label={item.caption}
            >
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-7xl drop-shadow-lg">
                {item.icon}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent text-white text-right">
                <div className="text-sm font-bold">{item.caption}</div>
              </div>
              <div className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/90 text-gray-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 3h6v6M14 10l7-7M9 21H3v-6M10 14l-7 7"
                  />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            onClick={() => setLightbox(null)}
          />
          <div
            className={`relative w-full max-w-4xl aspect-[4/3] rounded-3xl overflow-hidden bg-gradient-to-br ${lightbox.gradient} shadow-2xl`}
          >
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-[20rem] drop-shadow-2xl">
              {lightbox.icon}
            </div>
            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white text-right">
              <div className="text-2xl font-bold">{lightbox.caption}</div>
            </div>
          </div>
          <button
            onClick={() => setLightbox(null)}
            aria-label="إغلاق"
            className="absolute top-6 left-6 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </section>
  );
}

/* ══════════════════════ Success Stories ══════════════════════ */
function Stories() {
  const ref = useRef(null);
  const visible = useOnScreen(ref, 0.12);
  const s = content.stories;
  return (
    <section
      id="stories"
      ref={ref}
      className="py-28 bg-gradient-to-bl from-amber-50/50 via-white to-emerald-50/30 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`text-center mb-14 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold tracking-wider uppercase mb-4">
            قصص نجاح
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{s.title}</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{s.subtitle}</p>
          <div className="h-1 w-20 mx-auto rounded-full bg-gradient-to-l from-amber-500 to-primary-500 mt-5" />
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {s.items.map((story, i) => (
            <article
              key={story.name}
              className={`relative rounded-3xl overflow-hidden bg-white ring-1 ring-gray-100 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <div className={`h-2 bg-gradient-to-l ${story.color}`} />
              <div className="p-7">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl font-bold text-gray-900">{story.name}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {story.age} سنوات
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">{story.condition}</div>
                  </div>
                  <div
                    className={`flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${story.color} text-white flex items-center justify-center font-bold text-xl shadow-md`}
                  >
                    {story.name.charAt(0)}
                  </div>
                </div>

                <div className="space-y-4 mb-5">
                  <div className="p-3 rounded-xl bg-rose-50 border-r-4 border-rose-400">
                    <div className="text-xs font-bold text-rose-700 mb-1">قبل 🕰️</div>
                    <p className="text-sm text-gray-700 leading-relaxed">{story.before}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border-r-4 border-emerald-500">
                    <div className="text-xs font-bold text-emerald-700 mb-1">بعد ✨</div>
                    <p className="text-sm text-gray-700 leading-relaxed">{story.after}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div>
                    <div
                      className={`text-2xl font-bold bg-gradient-to-l ${story.color} bg-clip-text text-transparent`}
                    >
                      {story.metric.isText ? story.metric.value : `+${story.metric.value}`}
                    </div>
                    <div className="text-[11px] text-gray-500">{story.metric.label}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-gray-700">{story.duration}</div>
                    <div className="text-[11px] text-gray-400">{story.program}</div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════ Comparison ══════════════════════ */
function Comparison() {
  const ref = useRef(null);
  const visible = useOnScreen(ref, 0.12);
  const c = content.comparison;
  return (
    <section id="comparison" ref={ref} className="py-28 bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(16,185,129,0.05),transparent)]" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div
          className={`text-center mb-12 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold tracking-wider uppercase mb-4">
            مقارنة
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{c.title}</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{c.subtitle}</p>
          <div className="h-1 w-20 mx-auto rounded-full bg-gradient-to-l from-emerald-500 to-primary-500 mt-5" />
        </div>

        <div
          className={`rounded-3xl overflow-hidden shadow-xl ring-1 ring-gray-200 bg-white transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="grid grid-cols-[2fr_1fr_1fr] sm:grid-cols-[3fr_1fr_1fr]">
            <div className="p-5 bg-gray-50 font-bold text-gray-700 text-sm">الميزة</div>
            <div className="p-5 bg-gradient-to-br from-primary-600 to-emerald-600 text-white text-center">
              <div className="text-xs opacity-90">{c.weLabel}</div>
              <div className="text-xl font-bold mt-1">✨</div>
            </div>
            <div className="p-5 bg-gray-100 text-gray-600 text-center">
              <div className="text-xs">{c.otherLabel}</div>
              <div className="text-xl font-bold mt-1">🏢</div>
            </div>
          </div>

          {c.rows.map((row, i) => (
            <div
              key={row.feature}
              className={`grid grid-cols-[2fr_1fr_1fr] sm:grid-cols-[3fr_1fr_1fr] items-center ${i % 2 ? 'bg-gray-50/50' : 'bg-white'} hover:bg-primary-50/30 transition-colors`}
            >
              <div className="p-4 text-sm sm:text-base font-medium text-gray-900">
                {row.feature}
              </div>
              <div className="p-4 text-center">
                {row.us === true ? (
                  <div className="inline-flex w-8 h-8 rounded-full bg-emerald-500 text-white items-center justify-center shadow-md">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-emerald-700">{row.us}</span>
                )}
              </div>
              <div className="p-4 text-center">
                {row.other === false ? (
                  <div className="inline-flex w-8 h-8 rounded-full bg-gray-200 text-gray-500 items-center justify-center">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                ) : (
                  <span className="text-xs text-gray-500">{row.other}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6 max-w-lg mx-auto">
          المقارنة تعكس ملامح السوق الشائعة — قد تختلف المراكز الأخرى في بعض التفاصيل.
        </p>
      </div>
    </section>
  );
}

/* ══════════════════════ Newsletter ══════════════════════ */
function Newsletter() {
  const ref = useRef(null);
  const visible = useOnScreen(ref, 0.15);
  const n = content.newsletter;
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    if (status === 'loading') return;
    setStatus('loading');
    setMessage('');
    try {
      const resp = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, website, locale: 'ar' }),
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data.success) {
        setStatus('success');
        setMessage(data.message || n.successMessage);
        setEmail('');
        setName('');
      } else {
        setStatus('error');
        setMessage(data.message || n.errorMessage);
      }
    } catch (_err) {
      setStatus('error');
      setMessage(n.errorMessage);
    }
  };

  return (
    <section
      id="newsletter"
      ref={ref}
      className="py-24 bg-gradient-to-br from-primary-600 via-primary-700 to-emerald-700 relative overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="absolute top-0 right-1/3 w-96 h-96 bg-white/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-emerald-300/10 rounded-full blur-[120px]" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`grid lg:grid-cols-2 gap-10 items-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="text-white">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 items-center justify-center mb-5">
              <svg
                className="w-7 h-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">{n.title}</h2>
            <p className="text-white/85 text-lg leading-relaxed mb-5">{n.subtitle}</p>
            <ul className="space-y-2.5">
              {n.perks.map(p => (
                <li key={p} className="flex items-center gap-2 text-white/80 text-sm">
                  <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8">
            <div className="space-y-3">
              <input
                type="text"
                placeholder={n.placeholderName}
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all text-sm"
              />
              <input
                type="email"
                required
                placeholder={n.placeholderEmail}
                value={email}
                onChange={e => setEmail(e.target.value)}
                dir="ltr"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all text-sm"
              />
              <div className="absolute w-0 h-0 overflow-hidden" aria-hidden="true">
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading' || status === 'success'}
                className="w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-primary-600/25 transition-all hover:-translate-y-0.5 disabled:hover:translate-y-0"
              >
                {status === 'loading'
                  ? n.ctaSubmitting
                  : status === 'success'
                    ? '✓ تم'
                    : n.ctaSubmit}
              </button>
              {message && (
                <div
                  className={`text-sm text-center mt-2 ${status === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}
                >
                  {message}
                </div>
              )}
              <p className="text-[11px] text-gray-400 text-center">
                بالاشتراك، أنت توافق على استلام بريد دوري. يمكنك إلغاء الاشتراك في أي وقت.
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════ About ══════════════════════ */
function About() {
  const ref = useRef(null);
  const visible = useOnScreen(ref, 0.12);
  const a = content.about;
  return (
    <section id="about" ref={ref} className="py-28 bg-white relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(circle, #10b981 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div
          className={`text-center mb-14 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary-50 text-primary-700 text-xs font-bold tracking-wider uppercase mb-4">
            {a.eyebrow}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{a.title}</h2>
          <div className="h-1 w-20 mx-auto rounded-full bg-gradient-to-l from-primary-500 to-accent-500" />
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start mb-16">
          <div
            className={`transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}
          >
            <p className="text-xl text-gray-800 leading-relaxed mb-5 font-semibold">{a.lead}</p>
            {a.paragraphs.map((p, i) => (
              <p key={i} className="text-gray-600 leading-relaxed mb-4">
                {p}
              </p>
            ))}
          </div>

          <div
            className={`space-y-5 transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
          >
            <div className="relative p-7 rounded-3xl bg-gradient-to-br from-primary-50 to-emerald-50 border border-primary-100">
              <div className="absolute top-4 left-4 text-4xl opacity-30">🎯</div>
              <h3 className="text-xl font-bold text-primary-800 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-600" />
                {a.vision.title}
              </h3>
              <p className="text-primary-900/80 leading-relaxed">{a.vision.text}</p>
            </div>
            <div className="relative p-7 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
              <div className="absolute top-4 left-4 text-4xl opacity-30">🚀</div>
              <h3 className="text-xl font-bold text-amber-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {a.mission.title}
              </h3>
              <p className="text-amber-950/80 leading-relaxed">{a.mission.text}</p>
            </div>
          </div>
        </div>

        <div
          className={`grid grid-cols-2 lg:grid-cols-4 gap-5 transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          {a.values.map(v => (
            <div
              key={v.title}
              className="group text-center p-6 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-xl hover:-translate-y-1 border border-gray-100 transition-all duration-500"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                {v.icon}
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-1">{v.title}</h4>
              <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════ Programs ══════════════════════ */
function Programs() {
  const ref = useRef(null);
  const visible = useOnScreen(ref, 0.1);
  const p = content.programs;
  return (
    <section
      id="programs"
      ref={ref}
      className="py-28 bg-gradient-to-bl from-gray-50 via-white to-primary-50/30 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div
          className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent-50 text-accent-700 text-xs font-bold tracking-wider uppercase mb-4">
            برامج تأهيلية
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{p.title}</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{p.subtitle}</p>
          <div className="h-1 w-20 mx-auto rounded-full bg-gradient-to-l from-accent-500 to-primary-500 mt-5" />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {p.items.map((item, i) => (
            <div
              key={item.title}
              className={`group relative bg-white rounded-3xl p-7 border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 overflow-hidden ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 75}ms` }}
            >
              <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-gradient-to-br from-primary-100 to-accent-100 opacity-0 group-hover:opacity-50 transition-opacity duration-700 blur-2xl" />
              <div className="relative">
                <div className="text-5xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed mb-5">{item.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {item.tags.map(t => (
                    <span
                      key={t}
                      className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════ Branches ══════════════════════ */
function Branches() {
  const ref = useRef(null);
  const visible = useOnScreen(ref, 0.1);
  const b = content.branches;
  return (
    <section id="branches" ref={ref} className="py-28 bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(16,185,129,0.06),transparent)]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div
          className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary-50 text-primary-700 text-xs font-bold tracking-wider uppercase mb-4">
            فروعنا
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{b.title}</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{b.subtitle}</p>
          <div className="h-1 w-20 mx-auto rounded-full bg-gradient-to-l from-primary-500 to-emerald-500 mt-5" />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {b.items.map((branch, i) => (
            <article
              key={branch.name}
              className={`group relative rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 bg-white border border-gray-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div
                className={`h-28 bg-gradient-to-br ${branch.accentColor} flex items-center justify-center relative overflow-hidden`}
              >
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                />
                <div className="text-6xl relative z-10 drop-shadow-lg">{branch.icon}</div>
                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/90 text-xs font-bold text-gray-800 backdrop-blur-sm">
                  {branch.audience}
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{branch.name}</h3>
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-start gap-2 text-gray-600">
                    <svg
                      className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.8}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                      />
                    </svg>
                    {branch.address}
                  </div>
                  <a
                    href={`tel:${branch.phone}`}
                    className="flex items-center gap-2 text-gray-700 hover:text-primary-700 font-semibold transition-colors group/phone"
                  >
                    <svg
                      className="w-4 h-4 text-primary-500 group-hover/phone:scale-110 transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.8}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                      />
                    </svg>
                    <span dir="ltr">{branch.phoneDisplay}</span>
                  </a>
                  {branch.phoneSecondary && (
                    <a
                      href={`tel:${branch.phoneSecondary}`}
                      className="flex items-center gap-2 text-gray-500 text-xs hover:text-primary-600 transition-colors pr-6"
                      dir="ltr"
                    >
                      {branch.phoneSecondary}
                    </a>
                  )}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${content.brand.nameArFull} ${branch.name} ${branch.address}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-900 transition-colors"
                  >
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
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                      />
                    </svg>
                    فتح على الخريطة
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════ Mobile Action Bar ══════════════════════ */
// Sticky bottom bar on mobile with 3 primary actions: book / call / whatsapp.
// Hidden on sm+ (landing has full CTAs there). Improves thumb-reach conversion.
function MobileActionBar() {
  const booking = useBooking();
  const ap = content.appointment;
  const whatsappUrl = `https://wa.me/${ap.whatsappNumber}?text=${encodeURIComponent(ap.whatsappTemplate)}`;
  return (
    <div className="sm:hidden fixed bottom-0 right-0 left-0 z-40 bg-white/95 backdrop-blur-xl border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="grid grid-cols-3 gap-1 p-2">
        <button
          type="button"
          onClick={booking.open}
          className="flex flex-col items-center justify-center py-2 rounded-xl text-primary-700 hover:bg-primary-50 active:bg-primary-100 transition-colors"
        >
          <svg
            className="w-5 h-5 mb-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-[11px] font-bold">احجز زيارة</span>
        </button>
        <a
          href={`tel:${content.contact.mainPhone}`}
          className="flex flex-col items-center justify-center py-2 rounded-xl text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 transition-colors"
        >
          <svg
            className="w-5 h-5 mb-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
            />
          </svg>
          <span className="text-[11px] font-bold">اتصل</span>
        </a>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center py-2 rounded-xl text-[#25D366] hover:bg-[#25D366]/10 active:bg-[#25D366]/15 transition-colors"
        >
          <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          <span className="text-[11px] font-bold">واتساب</span>
        </a>
      </div>
    </div>
  );
}

/* ══════════════════════ Contact ══════════════════════ */
function Contact() {
  const ref = useRef(null);
  const visible = useOnScreen(ref, 0.12);
  const c = content.contact;
  return (
    <section
      id="contact"
      ref={ref}
      className="py-28 bg-gradient-to-br from-primary-50 via-white to-emerald-50/40 relative overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div
          className={`text-center mb-14 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold tracking-wider uppercase mb-4">
            تواصل
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">{c.title}</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{c.subtitle}</p>
          <div className="h-1 w-20 mx-auto rounded-full bg-gradient-to-l from-emerald-500 to-primary-500 mt-5" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <a
            href={`tel:${c.mainPhone}`}
            className={`group p-7 bg-white rounded-3xl shadow-sm hover:shadow-2xl hover:-translate-y-1 border border-gray-100 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-emerald-500 flex items-center justify-center mb-4 shadow-lg shadow-primary-500/20 group-hover:scale-110 transition-transform">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">اتصل بنا</h3>
            <p className="text-sm text-gray-500 mb-3">للاستفسار وحجز موعد تقييم</p>
            <div className="text-xl font-bold text-primary-700" dir="ltr">
              {c.mainPhoneDisplay}
            </div>
          </a>

          <a
            href={`mailto:${c.email}`}
            className={`group p-7 bg-white rounded-3xl shadow-sm hover:shadow-2xl hover:-translate-y-1 border border-gray-100 transition-all duration-500 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-500 to-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-accent-500/20 group-hover:scale-110 transition-transform">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">البريد الإلكتروني</h3>
            <p className="text-sm text-gray-500 mb-3">للاستفسارات الرسمية والتقارير</p>
            <div className="text-lg font-bold text-accent-700" dir="ltr">
              {c.email}
            </div>
          </a>

          <div
            className={`group p-7 bg-white rounded-3xl shadow-sm hover:shadow-2xl hover:-translate-y-1 border border-gray-100 transition-all duration-500 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">العنوان الرئيسي</h3>
            <p className="text-sm text-gray-500 mb-3">مقر الإدارة العامة</p>
            <p className="text-sm text-gray-700 leading-relaxed">{c.mainAddress}</p>
          </div>
        </div>

        <div
          className={`mt-10 p-5 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 text-center transition-all duration-700 delay-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="inline-flex items-center gap-2 text-gray-700 text-sm">
            <svg
              className="w-5 h-5 text-primary-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-semibold">أوقات العمل:</span>
            <span>{c.workingHours}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════ CTA ══════════════════════ */
function CTA() {
  const booking = useBooking();
  const ref = useRef(null);
  const visible = useOnScreen(ref);
  const c = content.cta;
  return (
    <section ref={ref} className="py-28 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div
          className={`relative bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 rounded-[2.5rem] p-12 sm:p-16 overflow-hidden shadow-2xl shadow-primary-900/20 transition-all duration-700 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        >
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-400/10 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-[80px]" />

          <FloatingParticles count={10} color="rgba(255,255,255,0.3)" />

          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-6 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342"
                />
              </svg>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">{c.title}</h2>
            <p className="text-lg text-white/80 max-w-xl mx-auto mb-10 leading-relaxed">
              {c.subtitle}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                type="button"
                onClick={booking.open}
                className="group relative inline-flex items-center gap-3 px-10 py-4 bg-white text-primary-700 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden"
              >
                <span className="relative z-10">{c.primary.label}</span>
                <svg
                  className="relative z-10 w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </button>
              <a
                href={`tel:${c.secondary.tel}`}
                className="inline-flex items-center gap-3 px-10 py-4 border-2 border-white/25 text-white rounded-2xl font-bold text-lg hover:bg-white/10 hover:border-white/40 transition-all duration-300 backdrop-blur-sm"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                  />
                </svg>
                {c.secondary.label}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════ Footer ══════════════════════ */
function Footer() {
  const f = content.footer;
  const b = content.brand;
  const c = content.contact;
  const copyright = f.copyright.replace('{year}', new Date().getFullYear());

  return (
    <footer className="bg-gray-900 text-white relative overflow-hidden">
      <div className="h-1 bg-gradient-to-l from-primary-600 via-accent-500 to-primary-600" />
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center overflow-hidden shadow-lg">
                  <img
                    src={b.logoSrc}
                    alt={b.nameArFull}
                    className="w-full h-full object-contain p-1.5"
                  />
                </div>
                <div>
                  <div className="text-lg font-bold">{b.nameAr}</div>
                  <div className="text-xs text-gray-500">{b.tagline}</div>
                </div>
              </div>
              <p className="text-gray-400 leading-relaxed text-sm mb-5">{f.description}</p>
              <div className="flex items-center gap-3">
                {c.social.map(s => (
                  <a
                    key={s.platform}
                    href={s.url}
                    aria-label={s.label}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-primary-600 flex items-center justify-center transition-all duration-300 hover:scale-110"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      {s.platform === 'facebook' && (
                        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                      )}
                      {s.platform === 'twitter' && (
                        <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                      )}
                      {s.platform === 'instagram' && (
                        <>
                          <path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.26.07 1.64.07 4.85s0 3.6-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.26.06-1.64.07-4.85.07s-3.6 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 01-1.38-.9 3.7 3.7 0 01-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.26-.07-1.64-.07-4.85s0-3.6.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.26-.06 1.64-.07 4.85-.07zm0 3.8a6 6 0 100 12 6 6 0 000-12zm0 2a4 4 0 110 8 4 4 0 010-8zm6.4-.3a1.4 1.4 0 100 2.8 1.4 1.4 0 000-2.8z" />
                        </>
                      )}
                    </svg>
                  </a>
                ))}
              </div>
            </div>

            {/* Footer columns (from content) */}
            {f.columns.map(col => (
              <div key={col.title}>
                <h4 className="font-bold text-lg mb-5">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map(link => (
                    <li key={link.label}>
                      {link.anchor ? (
                        <a
                          href={link.anchor}
                          onClick={e => {
                            e.preventDefault();
                            smoothScrollTo(link.anchor.replace('#', ''));
                          }}
                          className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group text-sm"
                        >
                          <svg
                            className="w-3 h-3 text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity rotate-180"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M8.25 4.5l7.5 7.5-7.5 7.5"
                            />
                          </svg>
                          {link.label}
                        </a>
                      ) : (
                        <a
                          href={link.href || '#'}
                          className="text-gray-400 hover:text-white transition-colors text-sm"
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Contact column */}
            <div>
              <h4 className="font-bold text-lg mb-5">تواصل معنا</h4>
              <ul className="space-y-4 text-gray-400 text-sm">
                <li className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-lg bg-gray-800 group-hover:bg-primary-600/20 flex items-center justify-center shrink-0 transition-colors">
                    <svg
                      className="w-4 h-4 text-primary-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                      />
                    </svg>
                  </div>
                  <a
                    href={`mailto:${c.email}`}
                    className="group-hover:text-white transition-colors"
                    dir="ltr"
                  >
                    {c.email}
                  </a>
                </li>
                <li className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-lg bg-gray-800 group-hover:bg-primary-600/20 flex items-center justify-center shrink-0 transition-colors">
                    <svg
                      className="w-4 h-4 text-primary-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                      />
                    </svg>
                  </div>
                  <a
                    href={`tel:${c.mainPhone}`}
                    className="group-hover:text-white transition-colors"
                    dir="ltr"
                  >
                    {c.mainPhone}
                  </a>
                </li>
                <li className="flex items-start gap-3 group">
                  <div className="w-9 h-9 rounded-lg bg-gray-800 group-hover:bg-primary-600/20 flex items-center justify-center shrink-0 transition-colors mt-0.5">
                    <svg
                      className="w-4 h-4 text-primary-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                      />
                    </svg>
                  </div>
                  <span className="group-hover:text-white transition-colors leading-relaxed">
                    {c.mainAddress}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-500 text-sm">
            <p>{copyright}</p>
            <div className="flex items-center gap-6">
              <a href="/privacy" className="hover:text-white transition-colors">
                سياسة الخصوصية
              </a>
              <a href="/terms" className="hover:text-white transition-colors">
                الشروط والأحكام
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ══════════════════════ Main Page ══════════════════════ */
// Lightweight booking-modal context so any descendant can open the appointment dialog.
const BookingContext = React.createContext({ open: () => {} });
export const useBooking = () => React.useContext(BookingContext);

export default function LandingPage() {
  const [bookingOpen, setBookingOpen] = useState(false);

  useEffect(() => {
    document.title = `${content.brand.nameArFull} — ${content.brand.tagline}`;
    document.documentElement.style.scrollBehavior = 'smooth';
    // Inject <meta name="description"> and keywords so raw crawlers see the
    // rehab-center copy regardless of what index.html carries.
    const ensureMeta = (name, value) => {
      let tag = document.head.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        tag.setAttribute('data-landing-meta', '1');
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', value);
      return tag;
    };
    const m1 = ensureMeta('description', content.seo.description);
    const m2 = ensureMeta('keywords', content.seo.keywords.join(', '));
    return () => {
      document.documentElement.style.scrollBehavior = '';
      if (m1.getAttribute('data-landing-meta')) m1.remove();
      if (m2.getAttribute('data-landing-meta')) m2.remove();
    };
  }, []);

  const bookingApi = useMemo(() => ({ open: () => setBookingOpen(true) }), []);

  return (
    <BookingContext.Provider value={bookingApi}>
      <div
        id="tailwind-scope"
        dir="rtl"
        className="font-cairo antialiased text-gray-900 overflow-x-hidden"
      >
        <SeoJsonLd />
        <ScrollProgress />
        <Navbar />
        <Hero />
        <TrustedBy />
        <Awards />
        <About />
        <Services />
        <Programs />
        <Quiz />
        <Branches />
        <Gallery />
        <PlatformFeatures />
        <HowItWorks />
        <WhyUs />
        <Comparison />
        <Team />
        <Stories />
        <Stats />
        <Testimonials />
        <FAQ />
        <Newsletter />
        <Contact />
        <CTA />
        <Footer />
        <BackToTop />
        <WhatsAppFab />
        <MobileActionBar />
        <BookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} />
      </div>
    </BookingContext.Provider>
  );
}
