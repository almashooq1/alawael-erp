import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/* ──────────────────────── helpers ──────────────────────── */
function useOnScreen(ref, threshold = 0.15) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
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
    const id = setInterval(() => { start += step; if (start >= end) { setCount(end); clearInterval(id); } else setCount(start); }, 16);
    return () => clearInterval(id);
  }, [visible, end, duration]);
  return <span ref={ref}>{count.toLocaleString('ar-SA')}{suffix}</span>;
}

/* ──────────────────────── icons (inline SVG) ──────────────────────── */
const icons = {
  rehab: (
    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  ),
  education: (
    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
    </svg>
  ),
  hr: (
    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  finance: (
    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  ),
  admin: (
    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  reports: (
    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
};

/* ──────────────────────── data ──────────────────────── */
const services = [
  { icon: icons.rehab, title: 'إعادة التأهيل', desc: 'برامج تأهيلية شاملة لإعادة الاستقلالية وتحسين جودة الحياة بأحدث المنهجيات العلمية', color: 'from-green-500 to-emerald-600' },
  { icon: icons.education, title: 'التعليم والتدريب', desc: 'خطط تعليمية فردية (IEP) وبرامج تعلّم إلكتروني متطورة تتكيّف مع كل مستفيد', color: 'from-blue-500 to-indigo-600' },
  { icon: icons.hr, title: 'الموارد البشرية', desc: 'إدارة شاملة للموظفين — الحضور، الرواتب، التقييم، التدريب، والامتثال التنظيمي', color: 'from-purple-500 to-violet-600' },
  { icon: icons.finance, title: 'الإدارة المالية', desc: 'فواتير إلكترونية متوافقة مع ZATCA، محاسبة متكاملة، وتقارير مالية دقيقة', color: 'from-amber-500 to-orange-600' },
  { icon: icons.admin, title: 'إدارة المراكز', desc: 'متابعة الفروع، المرافق، المستودعات، الصيانة، وجميع العمليات التشغيلية', color: 'from-rose-500 to-pink-600' },
  { icon: icons.reports, title: 'التقارير والتحليلات', desc: 'لوحات بيانات ذكية وتقارير شاملة لاتخاذ قرارات مبنية على بيانات دقيقة', color: 'from-teal-500 to-cyan-600' },
];

const stats = [
  { value: 12, suffix: '+', label: 'فرع ومركز' },
  { value: 2500, suffix: '+', label: 'مستفيد' },
  { value: 850, suffix: '+', label: 'موظف وأخصائي' },
  { value: 15, suffix: '+', label: 'سنة خبرة' },
];

const testimonials = [
  { name: 'أم عبدالله', role: 'ولي أمر مستفيد', text: 'نظام الأوائل غيّر حياتنا — نتابع تقدم ابننا لحظة بلحظة ونتواصل مع الأخصائيين بسهولة تامة.', avatar: '👩' },
  { name: 'د. سارة المحمدي', role: 'مديرة مركز تأهيلي', text: 'وفّر علينا ساعات عمل يومية. إدارة الموظفين والتقارير والفواتير كلها في مكان واحد.', avatar: '👩‍⚕️' },
  { name: 'أ. خالد العمري', role: 'أخصائي تعليمي', text: 'الخطط التعليمية الفردية والمتابعة الرقمية رفعت جودة خدماتنا بشكل ملموس.', avatar: '👨‍🏫' },
];

/* ──────────────────────── Navbar ──────────────────────── */
function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a href="#hero" className="flex items-center gap-3 group">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-xl transition-all ${scrolled ? 'bg-primary-600 shadow-md' : 'bg-white/20 backdrop-blur-sm'}`}>أ</div>
            <span className={`text-xl font-bold transition-colors ${scrolled ? 'text-primary-700' : 'text-white'}`}>الأوائل</span>
          </a>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {[
              ['الرئيسية', '#hero'],
              ['الخدمات', '#services'],
              ['الإحصائيات', '#stats'],
              ['آراء العملاء', '#testimonials'],
            ].map(([label, href]) => (
              <a key={href} href={href} className={`text-sm font-medium transition-colors hover:text-primary-400 ${scrolled ? 'text-gray-700' : 'text-white/90'}`}>
                {label}
              </a>
            ))}
            <Link to="/login" className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${scrolled ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-600/25' : 'bg-white text-primary-700 hover:bg-white/90 shadow-lg shadow-black/10'}`}>
              تسجيل الدخول
            </Link>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setIsOpen(!isOpen)} className={`md:hidden p-2 rounded-lg transition-colors ${scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden bg-white rounded-2xl shadow-2xl p-6 mb-4 animate-fade-in">
            {[['الرئيسية', '#hero'], ['الخدمات', '#services'], ['الإحصائيات', '#stats'], ['آراء العملاء', '#testimonials']].map(([label, href]) => (
              <a key={href} href={href} onClick={() => setIsOpen(false)} className="block py-3 text-gray-700 font-medium border-b border-gray-100 last:border-0 hover:text-primary-600">
                {label}
              </a>
            ))}
            <Link to="/login" onClick={() => setIsOpen(false)} className="block w-full mt-4 px-6 py-3 rounded-xl bg-primary-600 text-white text-center font-bold hover:bg-primary-700 transition-colors">
              تسجيل الدخول
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

/* ──────────────────────── Hero ──────────────────────── */
function Hero() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-bl from-primary-900 via-primary-700 to-primary-600">
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-accent-400/15 rounded-full blur-3xl animate-blob" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-20 left-1/4 w-72 h-72 bg-emerald-400/15 rounded-full blur-3xl animate-blob" style={{ animationDelay: '4s' }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Text */}
          <div className="text-right animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm mb-8 border border-white/10">
              <span className="w-2 h-2 bg-accent-400 rounded-full animate-pulse" />
              منصة إدارة المراكز الأولى في المملكة
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              مراكز <span className="text-accent-300">الأوائل</span>
              <br />
              <span className="text-3xl sm:text-4xl lg:text-5xl text-white/90">للرعاية النهارية</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/80 leading-relaxed max-w-xl mb-10">
              نظام إدارة متكامل يربط جميع أقسام المركز — من التأهيل والتعليم
              إلى الموارد البشرية والمالية — في منصة واحدة ذكية وسهلة الاستخدام.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/login" className="group relative inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-700 rounded-2xl font-bold text-lg shadow-2xl shadow-black/20 hover:shadow-3xl hover:-translate-y-0.5 transition-all duration-300">
                ابدأ الآن
                <svg className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
              <a href="#services" className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white/30 text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all duration-300 backdrop-blur-sm">
                اكتشف الخدمات
              </a>
            </div>
          </div>

          {/* Visual */}
          <div className="hidden lg:flex justify-center animate-float">
            <div className="relative">
              <div className="w-80 h-80 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl p-8 flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-white/20 rounded-full w-3/4" />
                  <div className="h-4 bg-white/15 rounded-full w-1/2" />
                  <div className="h-4 bg-white/10 rounded-full w-5/6" />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-6">
                  {['bg-accent-400/40', 'bg-emerald-400/40', 'bg-blue-400/40'].map((bg, i) => (
                    <div key={i} className={`h-16 rounded-xl ${bg}`} />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <div className="flex-1 h-2 bg-primary-300/40 rounded-full">
                    <div className="h-2 bg-accent-400 rounded-full w-3/4" />
                  </div>
                  <span className="text-white/70 text-xs">75%</span>
                </div>
              </div>
              {/* Floating cards */}
              <div className="absolute -top-6 -right-8 bg-white rounded-2xl shadow-xl p-4 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600 text-lg">✓</div>
                  <div>
                    <div className="text-xs text-gray-500">مستفيدين اليوم</div>
                    <div className="text-lg font-bold text-gray-800">٢٤٧</div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-12 bg-white rounded-2xl shadow-xl p-4 animate-fade-in" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center text-accent-700 text-lg">📊</div>
                  <div>
                    <div className="text-xs text-gray-500">نسبة التحسن</div>
                    <div className="text-lg font-bold text-primary-700">٩٢٪</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" className="w-full"><path d="M0 120V60c240-40 480-60 720-50s480 30 720 50v60H0z" fill="white"/></svg>
      </div>
    </section>
  );
}

/* ──────────────────────── Services ──────────────────────── */
function Services() {
  const ref = useRef(null);
  const visible = useOnScreen(ref);
  return (
    <section id="services" ref={ref} className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary-50 text-primary-700 text-sm font-semibold mb-4">خدماتنا</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">حلول متكاملة لإدارة مراكز الرعاية</h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">نظام شامل يغطي جميع احتياجات المركز من التأهيل حتى التقارير المالية</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((s, i) => (
            <div
              key={s.title}
              className={`group relative bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${s.color} text-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                {s.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{s.title}</h3>
              <p className="text-gray-500 leading-relaxed">{s.desc}</p>
              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${s.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── Stats ──────────────────────── */
function Stats() {
  const ref = useRef(null);
  const visible = useOnScreen(ref);
  return (
    <section id="stats" ref={ref} className="py-24 bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-white/90 text-sm font-semibold mb-4 backdrop-blur-sm">إنجازاتنا</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">أرقام نفخر بها</h2>
          <p className="text-lg text-white/70 max-w-xl mx-auto">نتائج حقيقية تعكس التزامنا بتقديم أفضل خدمات الرعاية والتأهيل</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`text-center p-8 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-all duration-500 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <div className="text-4xl sm:text-5xl font-bold text-white mb-2">
                <CountUp end={s.value} suffix={s.suffix} />
              </div>
              <div className="text-white/70 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── Testimonials ──────────────────────── */
function Testimonials() {
  const ref = useRef(null);
  const visible = useOnScreen(ref);
  return (
    <section id="testimonials" ref={ref} className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary-50 text-primary-700 text-sm font-semibold mb-4">آراء العملاء</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">ماذا يقولون عنا</h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">تجارب حقيقية من مستخدمي النظام</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <div className="flex items-center gap-1 mb-4 text-accent-500">
                {Array.from({ length: 5 }).map((_, j) => (
                  <svg key={j} className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                ))}
              </div>
              <p className="text-gray-600 leading-relaxed mb-6 text-lg">"{t.text}"</p>
              <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl">{t.avatar}</div>
                <div>
                  <div className="font-bold text-gray-900">{t.name}</div>
                  <div className="text-sm text-gray-500">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── CTA ──────────────────────── */
function CTA() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 rounded-[2rem] p-12 sm:p-16 relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              جاهز لتحويل مركزك رقمياً؟
            </h2>
            <p className="text-lg text-white/80 max-w-xl mx-auto mb-10">
              انضم إلى عشرات المراكز التي تستخدم نظام الأوائل لإدارة عملياتها بكفاءة واحترافية
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register" className="group inline-flex items-center gap-2 px-10 py-4 bg-white text-primary-700 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300">
                سجّل مجاناً
                <svg className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
              <a href="tel:+966500000000" className="inline-flex items-center gap-2 px-10 py-4 border-2 border-white/30 text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all backdrop-blur-sm">
                تواصل معنا
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── Footer ──────────────────────── */
function Footer() {
  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold text-xl">أ</div>
              <span className="text-xl font-bold">الأوائل</span>
            </div>
            <p className="text-gray-400 leading-relaxed">نظام إدارة متكامل لمراكز الرعاية النهارية وإعادة التأهيل في المملكة العربية السعودية</p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-lg mb-4">روابط سريعة</h4>
            <ul className="space-y-3">
              {[['الرئيسية', '#hero'], ['الخدمات', '#services'], ['الإحصائيات', '#stats'], ['آراء العملاء', '#testimonials']].map(([label, href]) => (
                <li key={href}><a href={href} className="text-gray-400 hover:text-white transition-colors">{label}</a></li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-bold text-lg mb-4">الخدمات</h4>
            <ul className="space-y-3">
              {['إعادة التأهيل', 'التعليم الإلكتروني', 'الموارد البشرية', 'الإدارة المالية'].map(s => (
                <li key={s}><span className="text-gray-400">{s}</span></li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-lg mb-4">تواصل معنا</h4>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                info@alawael.org
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                966+ 50 000 0000
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                المملكة العربية السعودية
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} مراكز الأوائل للرعاية النهارية. جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-white transition-colors">سياسة الخصوصية</a>
            <a href="#" className="hover:text-white transition-colors">الشروط والأحكام</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ──────────────────────── Main Page ──────────────────────── */
export default function LandingPage() {
  useEffect(() => {
    document.title = 'الأوائل — نظام إدارة مراكز الرعاية النهارية';
  }, []);

  return (
    <div id="tailwind-scope" dir="rtl" className="font-cairo antialiased text-gray-900 overflow-x-hidden">
      <Navbar />
      <Hero />
      <Services />
      <Stats />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
}
