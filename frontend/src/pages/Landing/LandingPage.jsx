/**
 * LandingPage — Enhanced Tailwind Design
 * Premium landing with particles, glassmorphism, parallax sections
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';

/* ══════════════════════ helpers ══════════════════════ */
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

/* ══════════════════════ Floating Particles ══════════════════════ */
function FloatingParticles({ count = 30, color = 'white' }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 10,
      opacity: Math.random() * 0.3 + 0.1,
    })), [count]);

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

/* ══════════════════════ icons ══════════════════════ */
const icons = {
  rehab: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  ),
  education: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
    </svg>
  ),
  hr: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  finance: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  ),
  admin: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  reports: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
};

/* ══════════════════════ data ══════════════════════ */
const services = [
  { icon: icons.rehab, title: 'إعادة التأهيل', desc: 'برامج تأهيلية شاملة لإعادة الاستقلالية وتحسين جودة الحياة بأحدث المنهجيات العلمية', color: 'from-green-500 to-emerald-600', light: 'bg-green-50', text: 'text-green-600' },
  { icon: icons.education, title: 'التعليم والتدريب', desc: 'خطط تعليمية فردية (IEP) وبرامج تعلّم إلكتروني متطورة تتكيّف مع كل مستفيد', color: 'from-blue-500 to-indigo-600', light: 'bg-blue-50', text: 'text-blue-600' },
  { icon: icons.hr, title: 'الموارد البشرية', desc: 'إدارة شاملة للموظفين — الحضور، الرواتب، التقييم، التدريب، والامتثال التنظيمي', color: 'from-purple-500 to-violet-600', light: 'bg-purple-50', text: 'text-purple-600' },
  { icon: icons.finance, title: 'الإدارة المالية', desc: 'فواتير إلكترونية متوافقة مع ZATCA، محاسبة متكاملة، وتقارير مالية دقيقة', color: 'from-amber-500 to-orange-600', light: 'bg-amber-50', text: 'text-amber-600' },
  { icon: icons.admin, title: 'إدارة المراكز', desc: 'متابعة الفروع، المرافق، المستودعات، الصيانة، وجميع العمليات التشغيلية', color: 'from-rose-500 to-pink-600', light: 'bg-rose-50', text: 'text-rose-600' },
  { icon: icons.reports, title: 'التقارير والتحليلات', desc: 'لوحات بيانات ذكية وتقارير شاملة لاتخاذ قرارات مبنية على بيانات دقيقة', color: 'from-teal-500 to-cyan-600', light: 'bg-teal-50', text: 'text-teal-600' },
];

const stats = [
  { value: 12, suffix: '+', label: 'فرع ومركز', icon: '🏢' },
  { value: 2500, suffix: '+', label: 'مستفيد', icon: '👥' },
  { value: 850, suffix: '+', label: 'موظف وأخصائي', icon: '👨‍⚕️' },
  { value: 15, suffix: '+', label: 'سنة خبرة', icon: '📅' },
];

const testimonials = [
  { name: 'أم عبدالله', role: 'ولي أمر مستفيد', text: 'نظام الأوائل غيّر حياتنا — نتابع تقدم ابننا لحظة بلحظة ونتواصل مع الأخصائيين بسهولة تامة.', avatar: '👩', rating: 5 },
  { name: 'د. سارة المحمدي', role: 'مديرة مركز تأهيلي', text: 'وفّر علينا ساعات عمل يومية. إدارة الموظفين والتقارير والفواتير كلها في مكان واحد.', avatar: '👩‍⚕️', rating: 5 },
  { name: 'أ. خالد العمري', role: 'أخصائي تعليمي', text: 'الخطط التعليمية الفردية والمتابعة الرقمية رفعت جودة خدماتنا بشكل ملموس.', avatar: '👨‍🏫', rating: 5 },
];

const whyUsFeatures = [
  { icon: '🔒', title: 'أمان على مستوى المؤسسات', desc: 'تشفير 256-بت وحماية متعددة الطبقات لبياناتك' },
  { icon: '⚡', title: 'سرعة فائقة', desc: 'أداء سلس وسريع حتى مع آلاف السجلات' },
  { icon: '🌐', title: 'وصول من أي مكان', desc: 'يعمل على جميع الأجهزة — كمبيوتر، جوال، تابلت' },
  { icon: '🤖', title: 'ذكاء اصطناعي', desc: 'تحليلات وتوصيات آلية لتحسين الأداء' },
  { icon: '📱', title: 'واجهة عربية بالكامل', desc: 'تصميم يدعم RTL مع تجربة مستخدم احترافية' },
  { icon: '🔄', title: 'تحديثات مستمرة', desc: 'ميزات جديدة وتحسينات دورية بدون توقف' },
];

/* ══════════════════════ Navbar ══════════════════════ */
function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks = [
    ['الرئيسية', '#hero'],
    ['الخدمات', '#services'],
    ['لماذا نحن', '#why-us'],
    ['الإحصائيات', '#stats'],
    ['آراء العملاء', '#testimonials'],
  ];

  return (
    <nav className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/80 backdrop-blur-xl shadow-lg shadow-black/5 border-b border-gray-100/50' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <a href="#hero" className="flex items-center gap-3 group">
            <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl transition-all duration-500 overflow-hidden ${scrolled ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-600/25' : 'bg-white/15 backdrop-blur-md text-white border border-white/20'}`}>
              <span className="relative z-10">أ</span>
              <div className="absolute inset-0 bg-gradient-to-br from-accent-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-col">
              <span className={`text-lg font-bold leading-tight transition-colors duration-500 ${scrolled ? 'text-gray-900' : 'text-white'}`}>الأوائل</span>
              <span className={`text-[10px] font-medium transition-colors duration-500 ${scrolled ? 'text-primary-600' : 'text-white/60'}`}>للرعاية النهارية</span>
            </div>
          </a>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(([label, href]) => (
              <a key={href} href={href} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${scrolled ? 'text-gray-600 hover:text-primary-700 hover:bg-primary-50' : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
                {label}
              </a>
            ))}
            <div className="w-px h-6 bg-gray-300/30 mx-2" />
            <Link to="/register" className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${scrolled ? 'text-primary-700 hover:bg-primary-50' : 'text-white/90 hover:bg-white/10'}`}>
              حساب جديد
            </Link>
            <Link to="/login" className={`group relative px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 overflow-hidden ${scrolled ? 'bg-gradient-to-l from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-600/25 hover:shadow-xl hover:shadow-primary-600/30' : 'bg-white text-primary-700 shadow-lg shadow-black/10 hover:shadow-xl'}`}>
              <span className="relative z-10">تسجيل الدخول</span>
              <div className="absolute inset-0 bg-gradient-to-l from-primary-700 to-primary-800 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setIsOpen(!isOpen)} className={`md:hidden p-2.5 rounded-xl transition-all duration-300 ${scrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {isOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden transition-all duration-500 overflow-hidden ${isOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-5 mb-4 border border-gray-100/50">
            {navLinks.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setIsOpen(false)} className="block py-3 text-gray-700 font-medium border-b border-gray-100/50 last:border-0 hover:text-primary-600 transition-colors">
                {label}
              </a>
            ))}
            <div className="flex gap-3 mt-4">
              <Link to="/register" onClick={() => setIsOpen(false)} className="flex-1 py-3 rounded-xl border-2 border-primary-200 text-primary-700 text-center font-bold hover:bg-primary-50 transition-colors">
                حساب جديد
              </Link>
              <Link to="/login" onClick={() => setIsOpen(false)} className="flex-1 py-3 rounded-xl bg-gradient-to-l from-primary-600 to-primary-700 text-white text-center font-bold hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg">
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);

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
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-accent-400/10 rounded-full blur-[80px] animate-blob" style={{ animationDelay: '3s' }} />
        <div className="absolute -bottom-32 left-1/3 w-[400px] h-[400px] bg-emerald-400/10 rounded-full blur-[90px] animate-blob" style={{ animationDelay: '6s' }} />
      </div>

      {/* Dot pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Gradient mesh overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-primary-900/40 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Text */}
          <div className="text-right">
            {/* Badge */}
            <div className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md text-white/90 text-sm mb-8 border border-white/15 shadow-lg shadow-black/5 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-400" />
              </span>
              منصة إدارة المراكز الأولى في المملكة
            </div>

            {/* Heading */}
            <h1 className={`text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-white leading-[1.15] mb-6 transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              مراكز{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-l from-accent-300 to-accent-400 bg-clip-text text-transparent">الأوائل</span>
                <svg className="absolute -bottom-2 right-0 w-full" viewBox="0 0 200 12" fill="none">
                  <path d="M2 8c40-6 80-6 120-2s60 4 76 2" stroke="rgba(251,191,36,0.4)" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>
              <br />
              <span className="text-3xl sm:text-4xl lg:text-[2.75rem] text-white/85">للرعاية النهارية</span>
            </h1>

            {/* Description */}
            <p className={`text-lg sm:text-xl text-white/75 leading-relaxed max-w-xl mb-10 transition-all duration-1000 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              نظام إدارة متكامل يربط جميع أقسام المركز — من التأهيل والتعليم
              إلى الموارد البشرية والمالية — في منصة واحدة ذكية وسهلة الاستخدام.
            </p>

            {/* CTA Buttons */}
            <div className={`flex flex-wrap gap-4 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
              <Link to="/login" className="group relative inline-flex items-center gap-3 px-9 py-4 bg-white text-primary-700 rounded-2xl font-bold text-lg shadow-2xl shadow-black/15 hover:shadow-3xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
                <span className="relative z-10">ابدأ الآن</span>
                <svg className="relative z-10 w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                <div className="absolute inset-0 bg-gradient-to-l from-primary-50 to-accent-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
              <a href="#services" className="group inline-flex items-center gap-3 px-9 py-4 border-2 border-white/25 text-white rounded-2xl font-bold text-lg hover:bg-white/10 hover:border-white/40 transition-all duration-500 backdrop-blur-sm">
                <svg className="w-6 h-6 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" /></svg>
                اكتشف الخدمات
              </a>
            </div>

            {/* Trust badges */}
            <div className={`flex items-center gap-6 mt-10 transition-all duration-1000 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                تشفير SSL
              </div>
              <div className="h-4 w-px bg-white/20" />
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                متوافق مع ZATCA
              </div>
              <div className="h-4 w-px bg-white/20" />
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
                99.9% وقت التشغيل
              </div>
            </div>
          </div>

          {/* Visual - Glass Dashboard Preview */}
          <div className={`hidden lg:flex justify-center transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}>
            <div className="relative animate-float">
              {/* Main glass card */}
              <div className="w-[380px] h-[400px] rounded-3xl bg-white/[0.07] backdrop-blur-xl border border-white/[0.15] shadow-2xl shadow-black/20 p-7 flex flex-col">
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
                      <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-primary-400/40 to-emerald-400/40" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating notification card - top right */}
              <div className="absolute -top-5 -right-10 bg-white rounded-2xl shadow-2xl shadow-black/10 p-4 animate-fade-in-up border border-gray-100" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">مستفيدين اليوم</div>
                    <div className="text-lg font-bold text-gray-800">٢٤٧</div>
                  </div>
                </div>
              </div>

              {/* Floating stat card - bottom left */}
              <div className="absolute -bottom-5 -left-14 bg-white rounded-2xl shadow-2xl shadow-black/10 p-4 animate-fade-in-up border border-gray-100" style={{ animationDelay: '1.5s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-400 to-amber-500 flex items-center justify-center text-white text-sm">📊</div>
                  <div>
                    <div className="text-[11px] text-gray-500">نسبة التحسن</div>
                    <div className="text-lg font-bold text-primary-700">٩٢٪</div>
                  </div>
                </div>
              </div>

              {/* Floating security badge */}
              <div className="absolute top-1/2 -left-20 -translate-y-1/2 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 animate-fade-in" style={{ animationDelay: '2s' }}>
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
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

/* ══════════════════════ Services ══════════════════════ */
function Services() {
  const ref = useRef(null);
  const visible = useOnScreen(ref);
  return (
    <section id="services" ref={ref} className="py-28 bg-white relative">
      {/* Subtle background accents */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary-50/50 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent-50/50 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className={`text-center mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary-50 text-primary-700 text-sm font-semibold mb-5 border border-primary-100">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
            خدماتنا
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-5">حلول متكاملة لإدارة مراكز الرعاية</h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">نظام شامل يغطي جميع احتياجات المركز من التأهيل حتى التقارير المالية</p>
        </div>

        {/* Cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((s, i) => (
            <div
              key={s.title}
              className={`group relative rounded-3xl p-8 border border-gray-100 bg-white hover:border-gray-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              {/* Icon */}
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${s.color} text-white flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-500`}>
                {s.icon}
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-primary-700 transition-colors">{s.title}</h3>
              <p className="text-gray-500 leading-relaxed text-[15px]">{s.desc}</p>

              {/* Arrow link */}
              <div className="mt-5 flex items-center gap-2 text-sm font-medium text-primary-600 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                <span>اعرف المزيد</span>
                <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </div>

              {/* Hover gradient overlay */}
              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${s.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />

              {/* Corner accent */}
              <div className={`absolute top-0 left-0 w-20 h-20 rounded-tl-3xl bg-gradient-to-br ${s.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
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
    <section id="why-us" ref={ref} className="py-28 bg-gray-50 relative overflow-hidden">
      {/* Background mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(21,128,61,0.04),transparent)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Content */}
          <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary-50 text-primary-700 text-sm font-semibold mb-5 border border-primary-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
              لماذا نحن
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-5 leading-tight">
              لماذا تختار
              <span className="text-primary-600"> نظام الأوائل؟</span>
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              نوفّر لك حلاً تقنياً متكاملاً يجمع بين البساطة والقوة، مع دعم فني متواصل ومعايير أمان عالمية.
            </p>

            {/* Features grid */}
            <div className="grid grid-cols-2 gap-4">
              {whyUsFeatures.map((f, i) => (
                <div
                  key={f.title}
                  className={`p-4 rounded-2xl bg-white border border-gray-100 hover:border-primary-100 hover:shadow-lg transition-all duration-500 group ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{f.icon}</div>
                  <h4 className="font-bold text-gray-900 text-sm mb-1">{f.title}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Visual */}
          <div className={`hidden lg:block transition-all duration-1000 delay-300 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
            <div className="relative">
              {/* Main visual: Connected modules illustration */}
              <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-3xl p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <FloatingParticles count={12} color="rgba(255,255,255,0.4)" />

                <div className="relative text-center space-y-6">
                  {/* Central icon */}
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                    <span className="text-4xl font-bold text-accent-400">أ</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white">نظام واحد متكامل</h3>
                  <p className="text-white/60 text-sm max-w-xs mx-auto">كل ما تحتاجه لإدارة مركزك في منصة واحدة</p>

                  {/* Module badges */}
                  <div className="flex flex-wrap justify-center gap-3 pt-4">
                    {['التأهيل', 'التعليم', 'الموارد البشرية', 'المالية', 'التقارير', 'المخازن'].map((m) => (
                      <span key={m} className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm text-white/90 text-sm border border-white/10">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -top-4 -left-4 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 text-sm">✓</div>
                  <span className="text-sm font-bold text-gray-800">99.9% مدة التشغيل</span>
                </div>
              </div>

              {/* Floating users count */}
              <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 text-sm">👥</div>
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
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 text-white/90 text-sm font-semibold mb-5 backdrop-blur-sm border border-white/10">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>
            إنجازاتنا
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">أرقام نفخر بها</h2>
          <p className="text-lg text-white/65 max-w-xl mx-auto leading-relaxed">نتائج حقيقية تعكس التزامنا بتقديم أفضل خدمات الرعاية والتأهيل</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`group text-center p-8 rounded-3xl bg-white/[0.07] backdrop-blur-md border border-white/[0.1] hover:bg-white/[0.12] hover:border-white/[0.15] transition-all duration-500 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">{s.icon}</div>
              <div className="text-4xl sm:text-5xl font-bold text-white mb-2 tabular-nums">
                <CountUp end={s.value} suffix={s.suffix} />
              </div>
              <div className="text-white/60 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════ Testimonials ══════════════════════ */
function Testimonials() {
  const ref = useRef(null);
  const visible = useOnScreen(ref);
  return (
    <section id="testimonials" ref={ref} className="py-28 bg-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary-50/40 rounded-full blur-[100px] translate-x-1/3 -translate-y-1/3" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary-50 text-primary-700 text-sm font-semibold mb-5 border border-primary-100">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
            آراء العملاء
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-5">ماذا يقولون عنا</h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">تجارب حقيقية من مستخدمي النظام</p>
        </div>

        {/* Testimonial cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`group relative bg-white rounded-3xl p-8 border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-xl transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              {/* Quote icon */}
              <div className="absolute top-6 left-6 text-primary-100">
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609L9.978 5.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H0z" /></svg>
              </div>

              {/* Stars */}
              <div className="flex items-center gap-1 mb-5">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <svg key={j} className="w-5 h-5 text-accent-500 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                ))}
              </div>

              {/* Text */}
              <p className="text-gray-600 leading-relaxed mb-8 text-[15px] relative z-10">"{t.text}"</p>

              {/* Author */}
              <div className="flex items-center gap-4 pt-5 border-t border-gray-100">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-2xl shadow-inner">{t.avatar}</div>
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

/* ══════════════════════ CTA ══════════════════════ */
function CTA() {
  const ref = useRef(null);
  const visible = useOnScreen(ref);
  return (
    <section ref={ref} className="py-28 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className={`relative bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 rounded-[2.5rem] p-12 sm:p-16 overflow-hidden shadow-2xl shadow-primary-900/20 transition-all duration-700 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          {/* Background accents */}
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-400/10 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-[80px]" />

          <FloatingParticles count={10} color="rgba(255,255,255,0.3)" />

          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-6 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /></svg>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
              جاهز لتحويل مركزك رقمياً؟
            </h2>
            <p className="text-lg text-white/75 max-w-xl mx-auto mb-10 leading-relaxed">
              انضم إلى عشرات المراكز التي تستخدم نظام الأوائل لإدارة عملياتها بكفاءة واحترافية
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register" className="group relative inline-flex items-center gap-3 px-10 py-4 bg-white text-primary-700 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
                <span className="relative z-10">سجّل مجاناً</span>
                <svg className="relative z-10 w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                <div className="absolute inset-0 bg-gradient-to-l from-primary-50 to-accent-50 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <a href="tel:+966500000000" className="inline-flex items-center gap-3 px-10 py-4 border-2 border-white/25 text-white rounded-2xl font-bold text-lg hover:bg-white/10 hover:border-white/40 transition-all duration-300 backdrop-blur-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                تواصل معنا
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
  return (
    <footer className="bg-gray-900 text-white relative overflow-hidden">
      {/* Top gradient line */}
      <div className="h-1 bg-gradient-to-l from-primary-600 via-accent-500 to-primary-600" />

      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary-600/25">أ</div>
                <div>
                  <div className="text-lg font-bold">الأوائل</div>
                  <div className="text-xs text-gray-500">للرعاية النهارية</div>
                </div>
              </div>
              <p className="text-gray-400 leading-relaxed text-sm">نظام إدارة متكامل لمراكز الرعاية النهارية وإعادة التأهيل في المملكة العربية السعودية</p>

              {/* Social */}
              <div className="flex items-center gap-3 mt-5">
                {[
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />,
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />,
                  <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />,
                ].map((pathD, i) => (
                  <a key={i} href="#" className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-primary-600 flex items-center justify-center transition-colors duration-300">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">{pathD}</svg>
                  </a>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="font-bold text-lg mb-5">روابط سريعة</h4>
              <ul className="space-y-3">
                {[['الرئيسية', '#hero'], ['الخدمات', '#services'], ['لماذا نحن', '#why-us'], ['الإحصائيات', '#stats'], ['آراء العملاء', '#testimonials']].map(([label, href]) => (
                  <li key={href}>
                    <a href={href} className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group text-sm">
                      <svg className="w-3 h-3 text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-bold text-lg mb-5">الخدمات</h4>
              <ul className="space-y-3">
                {['إعادة التأهيل', 'التعليم الإلكتروني', 'الموارد البشرية', 'الإدارة المالية', 'التقارير والتحليلات'].map(s => (
                  <li key={s}><span className="text-gray-400 text-sm">{s}</span></li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold text-lg mb-5">تواصل معنا</h4>
              <ul className="space-y-4 text-gray-400 text-sm">
                <li className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                  </div>
                  info@alawael.org
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                  </div>
                  966+ 50 000 0000
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                  </div>
                  المملكة العربية السعودية
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-500 text-sm">
            <p>© {new Date().getFullYear()} مراكز الأوائل للرعاية النهارية. جميع الحقوق محفوظة.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-white transition-colors">سياسة الخصوصية</a>
              <a href="#" className="hover:text-white transition-colors">الشروط والأحكام</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ══════════════════════ Main Page ══════════════════════ */
export default function LandingPage() {
  useEffect(() => {
    document.title = 'الأوائل — نظام إدارة مراكز الرعاية النهارية';
  }, []);

  return (
    <div id="tailwind-scope" dir="rtl" className="font-cairo antialiased text-gray-900 overflow-x-hidden">
      <Navbar />
      <Hero />
      <Services />
      <WhyUs />
      <Stats />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
}
