/**
 * LoginPage — صفحة تسجيل الدخول بتصميم Tailwind
 * Split-screen: form (left) + brand panel (right on desktop)
 * Same design system as LandingPage
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';

export default function LoginPage() {
  const { login } = useAuth() || {};
  const showSnackbar = useSnackbar?.();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

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
        return; // Navigation handled by AppRoutes
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
      <div className="min-h-screen flex bg-gray-950">

        {/* ══════ RIGHT BRAND PANEL (desktop) ══════ */}
        <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 flex-col justify-center items-center p-12 text-white">
          {/* Animated blobs */}
          <div className="absolute top-10 right-10 w-72 h-72 bg-primary-400/20 rounded-full blur-3xl animate-blob" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent-400/10 rounded-full blur-3xl animate-blob" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/3 w-60 h-60 bg-white/5 rounded-full blur-2xl animate-blob" style={{ animationDelay: '4s' }} />

          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

          <div className={`relative z-10 text-center max-w-md transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Logo */}
            <div className="w-24 h-24 mx-auto mb-8 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center border border-white/20 shadow-2xl">
              <span className="text-4xl font-bold text-accent-400">أ</span>
            </div>

            <h1 className="text-4xl font-bold mb-4 leading-tight">
              مراكز الأوائل
              <br />
              <span className="text-accent-300 text-2xl font-medium">للرعاية النهارية</span>
            </h1>
            <p className="text-white/70 text-lg mb-12 leading-relaxed">
              نظام إدارة متكامل يجمع بين التأهيل والتعليم
              <br />
              والموارد البشرية والمالية في منصة واحدة
            </p>

            {/* Features */}
            <div className="space-y-5 text-right">
              {[
                { icon: '👥', title: 'إدارة شاملة للمستفيدين', desc: 'تتبع كامل لملفات المستفيدين وبرامج التأهيل' },
                { icon: '📊', title: 'تقارير وإحصاءات متقدمة', desc: 'لوحات معلومات تفاعلية بمؤشرات أداء دقيقة' },
                { icon: '🤖', title: 'ذكاء اصطناعي متكامل', desc: 'توصيات آلية وتحليل بيانات بتقنية AI' },
              ].map((f, i) => (
                <div key={i} className={`flex items-start gap-4 bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 transition-all duration-700 delay-${(i + 1) * 200} ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
                  <span className="text-2xl mt-0.5 shrink-0">{f.icon}</span>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{f.title}</h3>
                    <p className="text-white/50 text-xs mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="flex justify-center gap-8 mt-12">
              {[
                { val: '+500', label: 'مستفيد' },
                { val: '99.9%', label: 'وقت التشغيل' },
                { val: '+30', label: 'وحدة إدارية' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl font-bold text-accent-300">{s.val}</div>
                  <div className="text-xs text-white/50 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Security badge */}
          <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/5 backdrop-blur-sm px-5 py-2.5 rounded-full border border-white/10 transition-all duration-1000 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <span className="text-xs text-white/60">محمي بأعلى معايير الأمان</span>
          </div>
        </div>

        {/* ══════ LEFT FORM PANEL ══════ */}
        <div className="flex-1 flex items-center justify-center bg-white p-6 sm:p-12">
          <div className={`w-full max-w-md transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white">أ</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800">مراكز الأوائل</h2>
            </div>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">تسجيل الدخول</h1>
              <p className="text-gray-500 text-sm">أدخل بياناتك للوصول إلى لوحة التحكم</p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in">
                <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
                    placeholder="name@company.com"
                    className="w-full pr-11 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 transition-all focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  كلمة المرور
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
                    placeholder="••••••••"
                    className="w-full pr-11 pl-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 transition-all focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPwd(p => !p)}
                    className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 hover:text-gray-600 transition-colors"
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
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 transition"
                  />
                  <span className="text-sm text-gray-600">تذكرني</span>
                </label>
                <button type="button" className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
                  نسيت كلمة المرور؟
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-l from-primary-600 to-primary-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-primary-600/30 hover:shadow-xl hover:shadow-primary-600/40 hover:from-primary-700 hover:to-primary-800 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-lg"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>جاري تسجيل الدخول...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    <span>تسجيل الدخول</span>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-7">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">أو</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Register link */}
            <div className="text-center">
              <span className="text-sm text-gray-500">ليس لديك حساب؟ </span>
              <Link
                to="/register"
                className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
              >
                إنشاء حساب جديد
              </Link>
            </div>

            {/* Back to home */}
            <div className="text-center mt-4">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
                العودة للصفحة الرئيسية
              </Link>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-gray-300 mt-8">
              © 2026 مراكز الأوائل. جميع الحقوق محفوظة
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
