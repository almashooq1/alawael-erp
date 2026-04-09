/**
 * RegisterPage — Premium Professional Registration v2
 * Multi-step: بيانات أساسية → كلمة المرور → نوع الحساب
 * Premium glass design with rich animations & micro-interactions
 */
import React, { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';

/* ───── Floating Particles ───── */
function FloatingParticles({ count = 18 }) {
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

/* ───── Password strength calc ───── */
function calcStrength(pw) {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const strengthLabels = ['', 'ضعيفة جداً', 'ضعيفة', 'متوسطة', 'قوية', 'ممتازة'];
const strengthColors = ['bg-gray-200', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400', 'bg-emerald-600'];

/* ───── Roles ───── */
const ROLES = [
  { value: 'student', label: 'مستفيد', desc: 'حساب مستفيد للوصول لبرامج التأهيل', icon: '🎓', color: 'from-emerald-400 to-green-500' },
  { value: 'guardian', label: 'ولي أمر', desc: 'متابعة تقدم المستفيد والتقارير', icon: '👨‍👩‍👦', color: 'from-blue-400 to-indigo-500' },
  { value: 'staff', label: 'موظف', desc: 'حساب موظف للإدارة والخدمات', icon: '💼', color: 'from-amber-400 to-orange-500' },
];

const STEPS = ['البيانات الأساسية', 'كلمة المرور', 'نوع الحساب'];

export default function RegisterPage() {
  const { register } = useAuth() || {};
  const showSnackbar = useSnackbar?.();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', nationalId: '',
    password: '', confirmPassword: '',
    role: '',
  });
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  const strength = calcStrength(form.password);

  const handleChange = useCallback(e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setErrors(er => ({ ...er, [name]: '' }));
    if (globalError) setGlobalError('');
  }, [globalError]);

  /* ── Validation ── */
  const validateStep = () => {
    const e = {};
    if (step === 0) {
      if (!form.name || form.name.length < 2) e.name = 'الاسم مطلوب (حرفين على الأقل)';
      if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'بريد إلكتروني صالح مطلوب';
      if (form.phone && !/^05\d{8}$/.test(form.phone)) e.phone = 'رقم الجوال يبدأ بـ 05 ويتكون من 10 أرقام';
    }
    if (step === 1) {
      if (!form.password || form.password.length < 6) e.password = 'كلمة المرور 6 أحرف على الأقل';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'كلمتا المرور غير متطابقتين';
    }
    if (step === 2) {
      if (!form.role) e.role = 'اختر نوع الحساب';
      if (!terms) e.terms = 'يجب الموافقة على الشروط';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep()) setStep(s => Math.min(s + 1, 2)); };
  const back = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validateStep()) return;
    setLoading(true);
    setGlobalError('');
    try {
      const result = await register?.(form.name, form.email, form.password);
      if (result?.success || result === undefined) {
        setSuccess(true);
        showSnackbar?.('تم إنشاء الحساب بنجاح', 'success');
        setTimeout(() => navigate('/login'), 2500);
      } else {
        setGlobalError(result?.error || 'حدث خطأ أثناء إنشاء الحساب');
      }
    } catch {
      setGlobalError('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  /* ── Success View ── */
  if (success) {
    return (
      <div id="tailwind-scope" dir="rtl" className="font-cairo">
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(21,128,61,0.06),transparent)]" />
          <div className="relative text-center animate-fade-in-up">
            <div className="bg-white rounded-[2rem] shadow-2xl shadow-emerald-500/10 p-14 max-w-md mx-4 border border-emerald-100/50">
              {/* Success checkmark */}
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-xl animate-pulse" />
                <div className="relative w-full h-full bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-full flex items-center justify-center border-2 border-emerald-200">
                  <svg className="w-12 h-12 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">تم إنشاء الحساب بنجاح!</h2>
              <p className="text-gray-500 mb-8">سيتم تحويلك لصفحة تسجيل الدخول خلال لحظات...</p>
              <div className="w-16 h-1 bg-gradient-to-l from-primary-500 to-emerald-500 rounded-full mx-auto animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="tailwind-scope" dir="rtl" className="font-cairo">
      <div className="min-h-screen flex">

        {/* ══════ RIGHT BRAND PANEL (desktop) ══════ */}
        <div className="hidden lg:flex lg:w-[50%] relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-700 to-primary-600 flex-col justify-center items-center p-12 text-white">
          {/* Layered backgrounds */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_20%_40%,rgba(16,185,129,0.12),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_70%,rgba(251,191,36,0.06),transparent)]" />

          <FloatingParticles count={18} />

          <div className="absolute top-10 right-10 w-72 h-72 bg-primary-400/15 rounded-full blur-[80px] animate-blob" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent-400/8 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '3s' }} />

          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

          <div className="relative z-10 text-center max-w-md">
            {/* Logo */}
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-accent-400/20 rounded-3xl blur-xl animate-pulse-soft" />
              <div className="relative w-full h-full bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/20 shadow-2xl">
                <span className="text-3xl font-bold bg-gradient-to-b from-accent-300 to-accent-400 bg-clip-text text-transparent">أ</span>
              </div>
            </div>

            <h1 className="text-3xl font-bold mb-3">انضم إلى مراكز الأوائل</h1>
            <p className="text-white/55 text-base leading-relaxed max-w-sm mx-auto">
              أنشئ حسابك الآن واستفد من جميع خدمات
              نظام إدارة مراكز الأوائل للرعاية النهارية
            </p>

            {/* Step indicator */}
            <div className="mt-12 space-y-3">
              {STEPS.map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-500 ${
                    i === step
                      ? 'bg-white/[0.12] border border-white/[0.15] shadow-lg shadow-white/5'
                      : i < step
                      ? 'bg-white/[0.05] border border-white/[0.08]'
                      : 'opacity-35'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                    i < step
                      ? 'bg-gradient-to-br from-accent-400 to-accent-500 text-primary-900 shadow-lg shadow-accent-400/25'
                      : i === step
                      ? 'bg-white text-primary-700 shadow-lg'
                      : 'bg-white/15 text-white/50'
                  }`}>
                    {i < step ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <div className="flex-1 text-right">
                    <span className={`text-sm font-medium ${i <= step ? 'text-white' : 'text-white/40'}`}>{s}</span>
                    {i === step && (
                      <p className="text-xs text-white/40 mt-0.5">الخطوة الحالية</p>
                    )}
                  </div>
                  {i < step && (
                    <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom security */}
            <div className="mt-12 flex items-center justify-center gap-2 text-white/35 text-xs">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              بياناتك محمية بأعلى معايير التشفير
            </div>
          </div>
        </div>

        {/* ══════ LEFT FORM PANEL ══════ */}
        <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-white to-gray-50/80 p-6 sm:p-8 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50/40 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-50/30 rounded-full blur-[80px]" />

          <div className="relative w-full max-w-lg">

            {/* Mobile header */}
            <div className="lg:hidden text-center mb-6">
              <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-600/25">
                <span className="text-xl font-bold text-white">أ</span>
              </div>
              <h2 className="text-lg font-bold text-gray-800">إنشاء حساب جديد</h2>
            </div>

            {/* Mobile stepper */}
            <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
              {STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                    i < step ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-md' : i === step ? 'bg-primary-600 text-white shadow-md' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  {i < STEPS.length - 1 && <div className={`w-8 h-0.5 rounded-full ${i < step ? 'bg-primary-500' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="hidden lg:block mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">إنشاء حساب جديد</h1>
              <p className="text-gray-500 text-sm">الخطوة {step + 1} من {STEPS.length}: {STEPS[step]}</p>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-100 rounded-full mb-7 overflow-hidden">
              <div
                className="h-full bg-gradient-to-l from-primary-500 to-primary-600 rounded-full transition-all duration-700 ease-out shadow-sm shadow-primary-500/25"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              />
            </div>

            {/* Global error */}
            {globalError && (
              <div className="mb-5 flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl p-4 animate-fade-in shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <span className="text-sm text-red-700">{globalError}</span>
              </div>
            )}

            <form onSubmit={step === 2 ? handleSubmit : e => { e.preventDefault(); next(); }}>

              {/* ── STEP 0: Basic Info ── */}
              {step === 0 && (
                <div className="space-y-4 animate-fade-in">
                  <InputField label="الاسم الكامل" name="name" value={form.name} onChange={handleChange} error={errors.name} placeholder="أدخل الاسم الكامل" focusedField={focusedField} setFocusedField={setFocusedField} icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  } />
                  <InputField label="البريد الإلكتروني" name="email" type="email" dir="ltr" value={form.email} onChange={handleChange} error={errors.email} placeholder="name@company.com" focusedField={focusedField} setFocusedField={setFocusedField} icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                  } />
                  <InputField label="رقم الجوال (اختياري)" name="phone" dir="ltr" value={form.phone} onChange={handleChange} error={errors.phone} placeholder="05XXXXXXXX" focusedField={focusedField} setFocusedField={setFocusedField} icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                  } />
                  <InputField label="رقم الهوية (اختياري)" name="nationalId" dir="ltr" value={form.nationalId} onChange={handleChange} placeholder="10 أرقام" focusedField={focusedField} setFocusedField={setFocusedField} icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" /></svg>
                  } />
                </div>
              )}

              {/* ── STEP 1: Password ── */}
              {step === 1 && (
                <div className="space-y-5 animate-fade-in">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور</label>
                    <div className={`relative rounded-2xl transition-all duration-300 ${focusedField === 'password' ? 'ring-2 ring-primary-500/20 shadow-lg shadow-primary-500/5' : ''}`}>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                        <svg className={`w-5 h-5 transition-colors ${focusedField === 'password' ? 'text-primary-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                      </div>
                      <input name="password" type={showPwd ? 'text' : 'password'} dir="ltr" value={form.password} onChange={handleChange}
                        onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField('')}
                        placeholder="••••••••"
                        className={`w-full pr-12 pl-12 py-3.5 bg-gray-50/80 border rounded-2xl text-sm text-gray-900 placeholder-gray-400 transition-all focus:bg-white focus:border-primary-500 focus:outline-none ${errors.password ? 'border-red-300' : 'border-gray-200'}`}
                      />
                      <button type="button" tabIndex={-1} onClick={() => setShowPwd(p => !p)} className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 hover:text-gray-600 transition-colors">
                        <EyeIcon open={showPwd} />
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-500 mt-1.5">{errors.password}</p>}

                    {/* Strength bar */}
                    {form.password.length > 0 && (
                      <div className="mt-4">
                        <div className="flex gap-1.5 mb-2">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className={`h-2 flex-1 rounded-full transition-all duration-500 ${i <= strength ? strengthColors[strength] : 'bg-gray-100'}`} />
                          ))}
                        </div>
                        <p className={`text-xs font-medium ${strength <= 2 ? 'text-red-500' : strength <= 3 ? 'text-yellow-600' : 'text-emerald-600'}`}>
                          قوة كلمة المرور: {strengthLabels[strength]}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">تأكيد كلمة المرور</label>
                    <div className={`relative rounded-2xl transition-all duration-300 ${focusedField === 'confirmPassword' ? 'ring-2 ring-primary-500/20 shadow-lg shadow-primary-500/5' : ''}`}>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                        <svg className={`w-5 h-5 transition-colors ${focusedField === 'confirmPassword' ? 'text-primary-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                      </div>
                      <input name="confirmPassword" type={showConfirm ? 'text' : 'password'} dir="ltr" value={form.confirmPassword} onChange={handleChange}
                        onFocus={() => setFocusedField('confirmPassword')} onBlur={() => setFocusedField('')}
                        placeholder="••••••••"
                        className={`w-full pr-12 pl-12 py-3.5 bg-gray-50/80 border rounded-2xl text-sm text-gray-900 placeholder-gray-400 transition-all focus:bg-white focus:border-primary-500 focus:outline-none ${errors.confirmPassword ? 'border-red-300' : 'border-gray-200'}`}
                      />
                      <button type="button" tabIndex={-1} onClick={() => setShowConfirm(p => !p)} className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 hover:text-gray-600 transition-colors">
                        <EyeIcon open={showConfirm} />
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-xs text-red-500 mt-1.5">{errors.confirmPassword}</p>}
                  </div>

                  {/* Requirements */}
                  <div className="bg-gray-50/80 rounded-2xl p-5 space-y-2.5 border border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 mb-3">متطلبات كلمة المرور:</p>
                    {[
                      { ok: form.password.length >= 6, text: '6 أحرف على الأقل' },
                      { ok: /[A-Z]/.test(form.password), text: 'حرف كبير واحد' },
                      { ok: /\d/.test(form.password), text: 'رقم واحد' },
                      { ok: /[^A-Za-z0-9]/.test(form.password), text: 'رمز خاص (!@#$...)' },
                    ].map((r, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-300 ${r.ok ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                          <svg className={`w-3.5 h-3.5 transition-colors ${r.ok ? 'text-emerald-600' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={r.ok ? "M4.5 12.75l6 6 9-13.5" : "M19.5 12h-15"} />
                          </svg>
                        </div>
                        <span className={`text-xs transition-colors ${r.ok ? 'text-emerald-700 font-medium' : 'text-gray-400'}`}>{r.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── STEP 2: Role ── */}
              {step === 2 && (
                <div className="space-y-5 animate-fade-in">
                  <p className="text-sm text-gray-500 mb-3">اختر نوع الحساب المناسب لك</p>
                  <div className="space-y-3">
                    {ROLES.map(r => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => { setForm(f => ({ ...f, role: r.value })); setErrors(e => ({ ...e, role: '' })); }}
                        className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-500 text-right group ${
                          form.role === r.value
                            ? 'border-primary-500 bg-primary-50/50 shadow-lg shadow-primary-500/10'
                            : 'border-gray-150 bg-white hover:border-gray-300 hover:bg-gray-50 hover:shadow-md'
                        }`}
                      >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-300 ${
                          form.role === r.value
                            ? `bg-gradient-to-br ${r.color} shadow-lg`
                            : 'bg-gray-100 group-hover:bg-gray-200'
                        }`}>
                          {r.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-bold text-sm ${form.role === r.value ? 'text-primary-700' : 'text-gray-800'}`}>{r.label}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                          form.role === r.value
                            ? 'border-primary-500 bg-primary-500'
                            : 'border-gray-300 group-hover:border-gray-400'
                        }`}>
                          {form.role === r.value && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  {errors.role && <p className="text-xs text-red-500">{errors.role}</p>}

                  {/* Terms */}
                  <label className="flex items-start gap-3 mt-5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={terms}
                      onChange={e => { setTerms(e.target.checked); setErrors(er => ({ ...er, terms: '' })); }}
                      className="mt-0.5 w-4 h-4 rounded-md border-gray-300 text-primary-600 focus:ring-primary-500 transition"
                    />
                    <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
                      أوافق على{' '}
                      <button type="button" className="text-primary-600 hover:underline font-medium">الشروط والأحكام</button>
                      {' '}و{' '}
                      <button type="button" className="text-primary-600 hover:underline font-medium">سياسة الخصوصية</button>
                    </span>
                  </label>
                  {errors.terms && <p className="text-xs text-red-500 mr-7">{errors.terms}</p>}
                </div>
              )}

              {/* ── Navigation ── */}
              <div className="flex items-center gap-3 mt-8">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={back}
                    className="group flex items-center gap-2 px-6 py-3.5 border border-gray-200 rounded-2xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300"
                  >
                    <svg className="w-4 h-4 rotate-180 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                    السابق
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="group flex-1 relative flex items-center justify-center gap-2 py-3.5 bg-gradient-to-l from-primary-600 to-primary-700 text-white rounded-2xl font-semibold text-sm shadow-xl shadow-primary-600/25 hover:shadow-2xl hover:shadow-primary-600/30 hover:-translate-y-0.5 transition-all duration-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-l from-primary-700 to-primary-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {loading ? (
                    <span className="relative z-10 flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      جاري إنشاء الحساب...
                    </span>
                  ) : step === 2 ? (
                    <span className="relative z-10">إنشاء الحساب</span>
                  ) : (
                    <span className="relative z-10 flex items-center gap-2">
                      التالي
                      <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </span>
                  )}
                </button>
              </div>
            </form>

            {/* Login link */}
            <div className="text-center mt-7 p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <span className="text-sm text-gray-500">لديك حساب بالفعل؟ </span>
              <Link to="/login" className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors hover:underline">
                تسجيل الدخول
              </Link>
            </div>

            <div className="text-center mt-5">
              <Link to="/" className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-all duration-300 group hover:-translate-y-0.5">
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
                العودة للصفحة الرئيسية
              </Link>
            </div>

            <p className="text-center text-xs text-gray-300 mt-8">
              © {new Date().getFullYear()} مراكز الأوائل. جميع الحقوق محفوظة
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Reusable components ═══ */

function InputField({ label, name, type = 'text', dir, value, onChange, error, placeholder, icon, focusedField, setFocusedField }) {
  const isFocused = focusedField === name;
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className={`relative rounded-2xl transition-all duration-300 ${isFocused ? 'ring-2 ring-primary-500/20 shadow-lg shadow-primary-500/5' : ''}`}>
        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
          <span className={`transition-colors duration-300 ${isFocused ? 'text-primary-500' : 'text-gray-400'}`}>{icon}</span>
        </div>
        <input
          name={name}
          type={type}
          dir={dir}
          value={value}
          onChange={onChange}
          onFocus={() => setFocusedField(name)}
          onBlur={() => setFocusedField('')}
          placeholder={placeholder}
          className={`w-full pr-12 pl-4 py-3.5 bg-gray-50/80 border rounded-2xl text-sm text-gray-900 placeholder-gray-400 transition-all focus:bg-white focus:border-primary-500 focus:outline-none ${error ? 'border-red-300' : 'border-gray-200'}`}
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}

function EyeIcon({ open }) {
  return open ? (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
