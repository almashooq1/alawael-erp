/**
 * LoginPage — Premium Professional Login v2
 * Glassmorphism, floating particles, social login, rich brand panel
 */
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';

/* ── Floating Particles ── */
function FloatingParticles({ count = 20 }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 10,
      opacity: Math.random() * 0.25 + 0.05,
    })), [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full animate-float"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size,
            backgroundColor: 'rgba(255,255,255,0.5)',
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth() || {};
  const showSnackbar = useSnackbar?.();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    if (process.env.NODE_ENV === 'development') {
      setForm({ email: 'admin@alawael.com.sa', password: 'Admin@2026' });
    }
    return () => clearTimeout(t);
  }, []);

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await login?.(form.email, form.password);
      if (result?.success) {
        showSnackbar?.('مرحباً بك في نظام مراكز الأوائل', 'success');
        return;
      }
      const msg = result?.error || '';
      if (msg.includes('Invalid') || msg.includes('credentials') || msg.includes('password') || msg.includes('غير صحيح')) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else if (msg.includes('network') || msg.includes('Network') || msg.includes('الاتصال')) {
        setError('تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت');
      } else {
        setError(msg || 'حدث خطأ أثناء تسجيل الدخول');
      }
    } catch {
      setError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="tailwind-scope" dir="rtl" className="font-cairo">
      <div className="min-h-screen flex">

        {/* ══════ RIGHT BRAND PANEL (desktop) ══════ */}
        <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-700 to-primary-600 flex-col justify-center items-center p-12 text-white">
          {/* Layered backgrounds */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_20%_40%,rgba(16,185,129,0.12),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_60%,rgba(251,191,36,0.06),transparent)]" />

          {/* Floating particles */}
          <FloatingParticles count={20} />

          {/* Animated blobs */}
          <div className="absolute top-10 right-10 w-72 h-72 bg-primary-400/15 rounded-full blur-[80px] animate-blob" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent-400/8 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '3s' }} />
          <div className="absolute top-1/2 left-1/3 w-60 h-60 bg-white/5 rounded-full blur-[60px] animate-blob" style={{ animationDelay: '6s' }} />

          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

          <div className={`relative z-10 text-center max-w-md transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Logo */}
            <div className="w-24 h-24 mx-auto mb-8 relative">
              <div className="absolute inset-0 bg-accent-400/20 rounded-3xl blur-xl animate-pulse-soft" />
              <div className="relative w-full h-full bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/20 shadow-2xl">
                <span className="text-4xl font-bold bg-gradient-to-b from-accent-300 to-accent-400 bg-clip-text text-transparent">أ</span>
              </div>
            </div>

            <h1 className="text-4xl font-bold mb-3 leading-tight">
              مراكز الأوائل
            </h1>
            <p className="text-accent-300/90 text-xl font-medium mb-3">للرعاية النهارية</p>
            <p className="text-white/60 text-base mb-12 leading-relaxed max-w-sm mx-auto">
              نظام إدارة متكامل يجمع بين التأهيل والتعليم
              والموارد البشرية والمالية في منصة واحدة
            </p>

            {/* Features */}
            <div className="space-y-4 text-right">
              {[
                { icon: '🏥', title: 'إدارة شاملة للمستفيدين', desc: 'تتبع كامل لملفات المستفيدين وبرامج التأهيل' },
                { icon: '📊', title: 'تقارير وإحصاءات متقدمة', desc: 'لوحات معلومات تفاعلية بمؤشرات أداء دقيقة' },
                { icon: '🤖', title: 'ذكاء اصطناعي متكامل', desc: 'توصيات آلية وتحليل بيانات بتقنية AI' },
              ].map((f, i) => (
                <div key={i} className={`flex items-start gap-4 bg-white/[0.06] backdrop-blur-sm rounded-2xl p-4 border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.15] transition-all duration-500 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`} style={{ transitionDelay: `${(i + 1) * 200}ms` }}>
                  <span className="text-2xl mt-0.5 shrink-0">{f.icon}</span>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{f.title}</h3>
                    <p className="text-white/45 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="flex justify-center gap-10 mt-12">
              {[
                { val: '+500', label: 'مستفيد' },
                { val: '99.9%', label: 'وقت التشغيل' },
                { val: '+30', label: 'وحدة إدارية' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl font-bold bg-gradient-to-b from-accent-300 to-accent-400 bg-clip-text text-transparent">{s.val}</div>
                  <div className="text-xs text-white/45 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Security badge */}
          <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5 bg-white/[0.06] backdrop-blur-md px-6 py-3 rounded-full border border-white/[0.1] transition-all duration-1000 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <span className="text-xs text-white/55">محمي بأعلى معايير الأمان</span>
          </div>
        </div>

        {/* ══════ LEFT FORM PANEL ══════ */}
        <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-white to-gray-50/80 p-6 sm:p-12 relative">
          {/* Subtle background accent */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50/40 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-50/30 rounded-full blur-[80px]" />

          <div className={`relative w-full max-w-md transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-600/25">
                <span className="text-2xl font-bold text-white">أ</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800">مراكز الأوائل</h2>
              <p className="text-xs text-primary-600 font-medium mt-1">للرعاية النهارية</p>
            </div>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">تسجيل الدخول</h1>
              <p className="text-gray-500 text-sm">أدخل بياناتك للوصول إلى لوحة التحكم</p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl p-4 animate-fade-in shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  البريد الإلكتروني
                </label>
                <div className={`relative rounded-2xl transition-all duration-300 ${focusedField === 'email' ? 'ring-2 ring-primary-500/20 shadow-lg shadow-primary-500/5' : ''}`}>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <svg className={`w-5 h-5 transition-colors duration-300 ${focusedField === 'email' ? 'text-primary-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    dir="ltr"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField('')}
                    placeholder="name@company.com"
                    className="w-full pr-12 pl-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-sm text-gray-900 placeholder-gray-400 transition-all focus:bg-white focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  كلمة المرور
                </label>
                <div className={`relative rounded-2xl transition-all duration-300 ${focusedField === 'password' ? 'ring-2 ring-primary-500/20 shadow-lg shadow-primary-500/5' : ''}`}>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <svg className={`w-5 h-5 transition-colors duration-300 ${focusedField === 'password' ? 'text-primary-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPwd ? 'text' : 'password'}
                    dir="ltr"
                    autoComplete="current-password"
                    value={form.password}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField('')}
                    placeholder="••••••••"
                    className="w-full pr-12 pl-12 py-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-sm text-gray-900 placeholder-gray-400 transition-all focus:bg-white focus:border-primary-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPwd(p => !p)}
                    className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPwd ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded-md border-gray-300 text-primary-600 focus:ring-primary-500 transition"
                  />
                  <span className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors">تذكرني</span>
                </label>
                <button type="button" className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors hover:underline">
                  نسيت كلمة المرور؟
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group w-full relative flex items-center justify-center gap-2.5 py-4 bg-gradient-to-l from-primary-600 to-primary-700 text-white rounded-2xl font-semibold text-sm shadow-xl shadow-primary-600/25 hover:shadow-2xl hover:shadow-primary-600/30 hover:-translate-y-0.5 transition-all duration-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-l from-primary-700 to-primary-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {loading ? (
                  <span className="relative z-10 flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    جاري تسجيل الدخول...
                  </span>
                ) : (
                  <span className="relative z-10 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    تسجيل الدخول
                  </span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-7">
              <div className="flex-1 h-px bg-gradient-to-l from-transparent via-gray-200 to-transparent" />
              <span className="text-xs text-gray-400 font-medium">أو تسجيل بواسطة</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent via-gray-200 to-transparent" />
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-3 gap-3 mb-7">
              {/* Google */}
              <button type="button" className="group flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="text-xs font-medium text-gray-600 hidden sm:inline">Google</span>
              </button>

              {/* Microsoft */}
              <button type="button" className="group flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <rect fill="#F25022" x="1" y="1" width="10" height="10" />
                  <rect fill="#7FBA00" x="13" y="1" width="10" height="10" />
                  <rect fill="#00A4EF" x="1" y="13" width="10" height="10" />
                  <rect fill="#FFB900" x="13" y="13" width="10" height="10" />
                </svg>
                <span className="text-xs font-medium text-gray-600 hidden sm:inline">Microsoft</span>
              </button>

              {/* Apple */}
              <button type="button" className="group flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <span className="text-xs font-medium text-gray-600 hidden sm:inline">Apple</span>
              </button>
            </div>

            {/* Register link */}
            <div className="text-center p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <span className="text-sm text-gray-500">ليس لديك حساب؟ </span>
              <Link
                to="/register"
                className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors hover:underline"
              >
                إنشاء حساب جديد
              </Link>
            </div>

            {/* Back to home */}
            <div className="text-center mt-5">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-all duration-300 group hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
                العودة للصفحة الرئيسية
              </Link>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-gray-300 mt-8">
              © {new Date().getFullYear()} مراكز الأوائل. جميع الحقوق محفوظة
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
