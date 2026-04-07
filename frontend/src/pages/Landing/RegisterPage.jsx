/**
 * RegisterPage — صفحة التسجيل بتصميم Tailwind
 * Multi-step: بيانات أساسية → كلمة المرور → نوع الحساب
 */
import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';

/* ───── Password strength calc ───── */
function calcStrength(pw) {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s; // 0-5
}
const strengthLabels = ['', 'ضعيفة جداً', 'ضعيفة', 'متوسطة', 'قوية', 'ممتازة'];
const strengthColors = ['bg-gray-200', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400', 'bg-emerald-600'];

/* ───── Roles ───── */
const ROLES = [
  { value: 'student', label: 'مستفيد', desc: 'حساب مستفيد للوصول لبرامج التأهيل', icon: '🎓' },
  { value: 'guardian', label: 'ولي أمر', desc: 'متابعة تقدم المستفيد والتقارير', icon: '👨‍👩‍👦' },
  { value: 'staff', label: 'موظف', desc: 'حساب موظف للإدارة والخدمات', icon: '💼' },
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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
          <div className="text-center animate-fade-in-up bg-white rounded-3xl shadow-xl p-12 max-w-md mx-4">
            <div className="w-20 h-20 mx-auto mb-6 bg-emerald-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">تم إنشاء الحساب بنجاح!</h2>
            <p className="text-gray-500 mb-6">سيتم تحويلك لصفحة تسجيل الدخول خلال لحظات...</p>
            <div className="w-12 h-1 bg-primary-500 rounded-full mx-auto animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="tailwind-scope" dir="rtl" className="font-cairo">
      <div className="min-h-screen flex bg-gray-950">

        {/* ══════ RIGHT BRAND PANEL (desktop) ══════ */}
        <div className="hidden lg:flex lg:w-[50%] relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 flex-col justify-center items-center p-12 text-white">
          <div className="absolute top-10 right-10 w-72 h-72 bg-primary-400/20 rounded-full blur-3xl animate-blob" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent-400/10 rounded-full blur-3xl animate-blob" style={{ animationDelay: '2s' }} />

          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

          <div className="relative z-10 text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center border border-white/20 shadow-2xl">
              <span className="text-3xl font-bold text-accent-400">أ</span>
            </div>
            <h1 className="text-3xl font-bold mb-3">انضم إلى مراكز الأوائل</h1>
            <p className="text-white/60 text-base leading-relaxed">
              أنشئ حسابك الآن واستفد من جميع خدمات
              <br />
              نظام إدارة مراكز الأوائل للرعاية النهارية
            </p>

            {/* Step indicator visual */}
            <div className="mt-12 space-y-4">
              {STEPS.map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-300 ${
                    i === step
                      ? 'bg-white/15 border border-white/20'
                      : i < step
                      ? 'bg-white/5 border border-white/10'
                      : 'opacity-40'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i < step
                      ? 'bg-accent-400 text-primary-800'
                      : i === step
                      ? 'bg-white text-primary-700'
                      : 'bg-white/20 text-white/60'
                  }`}>
                    {i < step ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className={`text-sm font-medium ${i <= step ? 'text-white' : 'text-white/50'}`}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════ LEFT FORM PANEL ══════ */}
        <div className="flex-1 flex items-center justify-center bg-white p-6 sm:p-8">
          <div className="w-full max-w-lg">

            {/* Mobile header */}
            <div className="lg:hidden text-center mb-6">
              <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-xl font-bold text-white">أ</span>
              </div>
              <h2 className="text-lg font-bold text-gray-800">إنشاء حساب جديد</h2>
            </div>

            {/* Mobile stepper */}
            <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
              {STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < step ? 'bg-primary-600 text-white' : i === step ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? 'bg-primary-500' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="hidden lg:block mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">إنشاء حساب جديد</h1>
              <p className="text-gray-500 text-sm">الخطوة {step + 1} من {STEPS.length}: {STEPS[step]}</p>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full mb-6 overflow-hidden">
              <div
                className="h-full bg-gradient-to-l from-primary-500 to-primary-600 rounded-full transition-all duration-500"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              />
            </div>

            {/* Global error */}
            {globalError && (
              <div className="mb-5 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in">
                <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span className="text-sm text-red-700">{globalError}</span>
              </div>
            )}

            <form onSubmit={step === 2 ? handleSubmit : e => { e.preventDefault(); next(); }}>

              {/* ── STEP 0: Basic Info ── */}
              {step === 0 && (
                <div className="space-y-4 animate-fade-in">
                  <InputField label="الاسم الكامل" name="name" value={form.name} onChange={handleChange} error={errors.name} placeholder="أدخل الاسم الكامل" icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  } />
                  <InputField label="البريد الإلكتروني" name="email" type="email" dir="ltr" value={form.email} onChange={handleChange} error={errors.email} placeholder="name@company.com" icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                  } />
                  <InputField label="رقم الجوال (اختياري)" name="phone" dir="ltr" value={form.phone} onChange={handleChange} error={errors.phone} placeholder="05XXXXXXXX" icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                  } />
                  <InputField label="رقم الهوية (اختياري)" name="nationalId" dir="ltr" value={form.nationalId} onChange={handleChange} placeholder="10 أرقام" icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" /></svg>
                  } />
                </div>
              )}

              {/* ── STEP 1: Password ── */}
              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">كلمة المرور</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-gray-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                      </div>
                      <input name="password" type={showPwd ? 'text' : 'password'} dir="ltr" value={form.password} onChange={handleChange} placeholder="••••••••"
                        className={`w-full pr-11 pl-12 py-3 bg-gray-50 border rounded-xl text-sm text-gray-900 placeholder-gray-400 transition-all focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none ${errors.password ? 'border-red-300' : 'border-gray-200'}`}
                      />
                      <button type="button" tabIndex={-1} onClick={() => setShowPwd(p => !p)} className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 hover:text-gray-600">
                        <EyeIcon open={showPwd} />
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}

                    {/* Strength bar */}
                    {form.password.length > 0 && (
                      <div className="mt-3">
                        <div className="flex gap-1 mb-1.5">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= strength ? strengthColors[strength] : 'bg-gray-200'}`} />
                          ))}
                        </div>
                        <p className={`text-xs ${strength <= 2 ? 'text-red-500' : strength <= 3 ? 'text-yellow-600' : 'text-emerald-600'}`}>
                          قوة كلمة المرور: {strengthLabels[strength]}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">تأكيد كلمة المرور</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-gray-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                      </div>
                      <input name="confirmPassword" type={showConfirm ? 'text' : 'password'} dir="ltr" value={form.confirmPassword} onChange={handleChange} placeholder="••••••••"
                        className={`w-full pr-11 pl-12 py-3 bg-gray-50 border rounded-xl text-sm text-gray-900 placeholder-gray-400 transition-all focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none ${errors.confirmPassword ? 'border-red-300' : 'border-gray-200'}`}
                      />
                      <button type="button" tabIndex={-1} onClick={() => setShowConfirm(p => !p)} className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 hover:text-gray-600">
                        <EyeIcon open={showConfirm} />
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
                  </div>

                  {/* Requirements */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-medium text-gray-500 mb-2">متطلبات كلمة المرور:</p>
                    {[
                      { ok: form.password.length >= 6, text: '6 أحرف على الأقل' },
                      { ok: /[A-Z]/.test(form.password), text: 'حرف كبير واحد' },
                      { ok: /\d/.test(form.password), text: 'رقم واحد' },
                      { ok: /[^A-Za-z0-9]/.test(form.password), text: 'رمز خاص (!@#$...)' },
                    ].map((r, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <svg className={`w-4 h-4 ${r.ok ? 'text-emerald-500' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={r.ok ? "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M21 12a9 9 0 11-18 0 9 9 0 0118 0z"} />
                        </svg>
                        <span className={`text-xs ${r.ok ? 'text-emerald-700' : 'text-gray-400'}`}>{r.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── STEP 2: Role ── */}
              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <p className="text-sm text-gray-500 mb-2">اختر نوع الحساب المناسب</p>
                  <div className="space-y-3">
                    {ROLES.map(r => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => { setForm(f => ({ ...f, role: r.value })); setErrors(e => ({ ...e, role: '' })); }}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-right ${
                          form.role === r.value
                            ? 'border-primary-500 bg-primary-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-3xl">{r.icon}</span>
                        <div className="flex-1">
                          <h4 className={`font-semibold text-sm ${form.role === r.value ? 'text-primary-700' : 'text-gray-800'}`}>{r.label}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
                        </div>
                        {form.role === r.value && (
                          <svg className="w-6 h-6 text-primary-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                  {errors.role && <p className="text-xs text-red-500">{errors.role}</p>}

                  {/* Terms */}
                  <label className="flex items-start gap-3 mt-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={terms}
                      onChange={e => { setTerms(e.target.checked); setErrors(er => ({ ...er, terms: '' })); }}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-600">
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
                    className="flex items-center gap-1.5 px-5 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                    السابق
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-l from-primary-600 to-primary-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-primary-600/30 hover:shadow-xl hover:from-primary-700 hover:to-primary-800 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>جاري إنشاء الحساب...</span>
                    </>
                  ) : step === 2 ? (
                    'إنشاء الحساب'
                  ) : (
                    <>
                      <span>التالي</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Login link */}
            <div className="text-center mt-6">
              <span className="text-sm text-gray-500">لديك حساب بالفعل؟ </span>
              <Link to="/login" className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                تسجيل الدخول
              </Link>
            </div>

            <div className="text-center mt-3">
              <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
                العودة للصفحة الرئيسية
              </Link>
            </div>

            <p className="text-center text-xs text-gray-300 mt-6">
              © 2026 مراكز الأوائل. جميع الحقوق محفوظة
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Reusable components ═══ */

function InputField({ label, name, type = 'text', dir, value, onChange, error, placeholder, icon }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-gray-400">
          {icon}
        </div>
        <input
          name={name}
          type={type}
          dir={dir}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full pr-11 pl-4 py-3 bg-gray-50 border rounded-xl text-sm text-gray-900 placeholder-gray-400 transition-all focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none ${error ? 'border-red-300' : 'border-gray-200'}`}
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
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
