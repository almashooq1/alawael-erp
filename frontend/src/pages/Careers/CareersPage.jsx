/**
 * CareersPage — public /careers page.
 *
 * Lists open positions from src/data/careersContent.js with a filter
 * bar (department + search), opens ApplyModal that POSTs to
 * /api/careers/apply and returns a reference number on success.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import jobs, { DEPARTMENTS, LEVELS, EMPLOYMENT_TYPES } from '../../data/careersContent';
import content from '../../data/landingContent';

export default function CareersPage() {
  const [dept, setDept] = useState('all');
  const [q, setQ] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [applyJob, setApplyJob] = useState(null);

  useEffect(() => {
    document.title = `الوظائف — ${content.brand.nameArFull}`;
  }, []);

  const filtered = useMemo(() => {
    let list = jobs;
    if (dept !== 'all') list = list.filter(j => j.department === dept);
    if (q.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      list = list.filter(j => rx.test(j.title) || rx.test(j.summary));
    }
    return [...list].sort((a, b) => (a.featured === b.featured ? 0 : a.featured ? -1 : 1));
  }, [dept, q]);

  return (
    <div id="tailwind-scope" dir="rtl" className="font-cairo antialiased text-gray-900">
      {/* Hero */}
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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-xs font-semibold tracking-wider uppercase mb-4 ring-1 ring-white/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
            {jobs.filter(j => j.featured).length} وظائف مفتوحة مميّزة
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">انضم لفريق الأوائل</h1>
          <p className="text-lg text-white/85 max-w-2xl leading-relaxed">
            نُقدّر فريقنا — نوفّر بيئة مهنية داعمة، تدريب مستمر، ومسار تطوّر مهني واضح. انضم إلى
            +400 متخصص يُحدثون فرقاً حقيقياً في حياة الأطفال.
          </p>
        </div>
      </header>

      {/* Why work with us */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: '📚',
                title: 'تدريب مستمر',
                desc: 'شهادات دولية (ASHA, BCBA, TEACCH) بتغطية مالية',
              },
              {
                icon: '💼',
                title: 'مسار مهني واضح',
                desc: 'تدرّج من أخصائي إلى مشرف إلى مدير فرع',
              },
              { icon: '🏥', title: 'تأمين طبي شامل', desc: 'تغطية كاملة للموظف وعائلته' },
              { icon: '⏰', title: 'توازن حياة-عمل', desc: 'فترات مرنة + إجازات أسبوعية كاملة' },
            ].map(p => (
              <div
                key={p.title}
                className="text-center p-5 rounded-2xl hover:bg-gray-50 transition-colors"
              >
                <div className="text-4xl mb-2">{p.icon}</div>
                <h3 className="font-bold text-gray-900 mb-1">{p.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100 py-5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
              {DEPARTMENTS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setDept(c.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                    dept === c.id
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-600/25'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {c.label}
                  {c.id !== 'all' && (
                    <span className="mr-2 text-xs opacity-70">
                      ({jobs.filter(j => j.department === c.id).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
            <input
              type="search"
              placeholder="ابحث عن وظيفة..."
              value={q}
              onChange={e => setQ(e.target.value)}
              className="w-full sm:w-64 px-4 py-2 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none text-sm"
            />
          </div>
        </div>
      </section>

      {/* Jobs list */}
      <main className="py-14 bg-gray-50 min-h-[50vh]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <div className="text-5xl mb-3">📭</div>
              <p>لا توجد وظائف مطابقة لفلاتر البحث.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(job => (
                <JobRow
                  key={job.id}
                  job={job}
                  onDetails={() => setSelectedJob(job)}
                  onApply={() => setApplyJob(job)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-10 bg-gray-900 text-gray-400 text-sm text-center">
        © {new Date().getFullYear()} {content.brand.nameArFull} — جميع الحقوق محفوظة
      </footer>

      <JobDetailsModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onApply={j => {
          setSelectedJob(null);
          setApplyJob(j);
        }}
      />
      <ApplyModal job={applyJob} onClose={() => setApplyJob(null)} />
    </div>
  );
}

function JobRow({ job, onDetails, onApply }) {
  const deptLabel = DEPARTMENTS.find(d => d.id === job.department)?.label || job.department;
  return (
    <article className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-0.5 ring-1 ring-gray-100 transition-all duration-500">
      <div className="flex flex-col sm:flex-row gap-5">
        <div
          className={`flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br ${job.gradient} text-white flex items-center justify-center text-3xl shadow-lg`}
        >
          {job.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-xl font-bold text-gray-900">{job.title}</h3>
            {job.featured && (
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                ⭐ مميّزة
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mb-3 text-xs">
            <Chip>{deptLabel}</Chip>
            <Chip>{LEVELS[job.level]}</Chip>
            <Chip>{EMPLOYMENT_TYPES[job.type]}</Chip>
            {job.branches.slice(0, 2).map(b => (
              <Chip key={b} variant="location">
                📍 {b}
              </Chip>
            ))}
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">{job.summary}</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onDetails}
              className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-sm transition-colors"
            >
              تفاصيل كاملة
            </button>
            <button
              onClick={onApply}
              className="px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-md shadow-primary-600/20 transition-all hover:-translate-y-0.5"
            >
              تقدّم الآن
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function Chip({ children, variant }) {
  const styles =
    variant === 'location'
      ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
      : 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full ${styles} font-semibold`}>
      {children}
    </span>
  );
}

function JobDetailsModal({ job, onClose, onApply }) {
  useEffect(() => {
    if (!job) return;
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [job, onClose]);

  if (!job) return null;
  const deptLabel = DEPARTMENTS.find(d => d.id === job.department)?.label || job.department;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className={`relative p-6 bg-gradient-to-br ${job.gradient} text-white flex-shrink-0`}>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"
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
          <div className="flex items-start gap-4">
            <div className="text-5xl">{job.icon}</div>
            <div>
              <h2 className="text-2xl font-bold">{job.title}</h2>
              <div className="flex flex-wrap gap-2 mt-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-white/20">{deptLabel}</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20">{LEVELS[job.level]}</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20">
                  {EMPLOYMENT_TYPES[job.type]}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-gray-700 leading-relaxed mb-5">{job.summary}</p>

          <h3 className="text-lg font-bold text-gray-900 mb-3">الفروع المتاحة</h3>
          <div className="flex flex-wrap gap-2 mb-5">
            {job.branches.map(b => (
              <span
                key={b}
                className="px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 text-sm font-semibold ring-1 ring-primary-200"
              >
                📍 {b}
              </span>
            ))}
          </div>

          <h3 className="text-lg font-bold text-gray-900 mb-3">المتطلبات</h3>
          <ul className="space-y-2 mb-5">
            {job.requirements.map(r => (
              <li key={r} className="flex items-start gap-2 text-gray-700">
                <svg
                  className="w-5 h-5 mt-0.5 flex-shrink-0 text-emerald-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{r}</span>
              </li>
            ))}
          </ul>

          <h3 className="text-lg font-bold text-gray-900 mb-3">المسؤوليات</h3>
          <ul className="space-y-2">
            {job.responsibilities.map(r => (
              <li key={r} className="flex items-start gap-2 text-gray-700">
                <svg
                  className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                </svg>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button
            onClick={() => onApply(job)}
            className="flex-1 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl shadow-lg shadow-primary-600/25 transition-all hover:-translate-y-0.5"
          >
            تقدّم الآن
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-2xl transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

function ApplyModal({ job, onClose }) {
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    yearsExperience: '',
    currentRole: '',
    highestEducation: '',
    certifications: '',
    linkedinUrl: '',
    coverLetter: '',
    website: '',
    consentDataProcessing: false,
  });
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');

  useEffect(() => {
    if (!job) return;
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [job, onClose]);

  if (!job) return null;

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.consentDataProcessing) {
      setStatus('error');
      setMessage('يجب الموافقة على معالجة البيانات للاستمرار.');
      return;
    }
    setStatus('loading');
    setMessage('');
    try {
      const resp = await fetch('/api/careers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          jobTitle: job.title,
          fullName: form.fullName,
          phone: form.phone,
          email: form.email,
          yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : 0,
          currentRole: form.currentRole,
          highestEducation: form.highestEducation,
          certifications: form.certifications,
          linkedinUrl: form.linkedinUrl,
          coverLetter: form.coverLetter,
          website: form.website,
          consentDataProcessing: form.consentDataProcessing,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data.success) {
        setStatus('success');
        setReferenceNumber(data.referenceNumber || '');
        setMessage(data.message || 'تم استلام طلبك بنجاح.');
      } else {
        setStatus('error');
        setMessage(data.message || 'تعذّر إرسال الطلب — حاول لاحقاً.');
      }
    } catch (_err) {
      setStatus('error');
      setMessage('تعذّر الاتصال بالخادم — حاول لاحقاً.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="relative p-6 bg-gradient-to-br from-primary-600 to-emerald-600 text-white flex-shrink-0">
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"
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
          <div className="text-sm opacity-90 mb-1">تقديم على وظيفة</div>
          <h2 className="text-2xl font-bold">{job.title}</h2>
        </div>

        {status === 'success' ? (
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
            {referenceNumber && (
              <div className="mb-4">
                <p className="text-gray-600 mb-2">رقم الطلب:</p>
                <code
                  className="inline-block px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-lg tracking-wider border border-emerald-200"
                  dir="ltr"
                >
                  {referenceNumber}
                </code>
              </div>
            )}
            <p className="text-gray-600 mb-6 max-w-md">{message}</p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
            >
              إغلاق
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label="الاسم الكامل"
                required
                value={form.fullName}
                onChange={v => update('fullName', v)}
              />
              <Field
                label="رقم الجوال"
                required
                type="tel"
                dir="ltr"
                placeholder="05xxxxxxxx"
                value={form.phone}
                onChange={v => update('phone', v)}
              />
              <Field
                label="البريد الإلكتروني"
                required
                type="email"
                dir="ltr"
                value={form.email}
                onChange={v => update('email', v)}
              />
              <Field
                label="سنوات الخبرة"
                type="number"
                min={0}
                max={50}
                value={form.yearsExperience}
                onChange={v => update('yearsExperience', v)}
              />
              <Field
                label="الوظيفة الحالية"
                value={form.currentRole}
                onChange={v => update('currentRole', v)}
              />
              <Field
                label="أعلى مؤهل علمي"
                value={form.highestEducation}
                onChange={v => update('highestEducation', v)}
              />
            </div>
            <Field
              label="الشهادات والتراخيص"
              placeholder="BCBA, SCFHS, ASHA..."
              value={form.certifications}
              onChange={v => update('certifications', v)}
            />
            <Field
              label="رابط LinkedIn (اختياري)"
              dir="ltr"
              placeholder="https://linkedin.com/in/..."
              value={form.linkedinUrl}
              onChange={v => update('linkedinUrl', v)}
            />
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                لماذا تريد الانضمام لفريقنا؟ (اختياري)
              </label>
              <textarea
                rows={4}
                value={form.coverLetter}
                onChange={e => update('coverLetter', e.target.value)}
                maxLength={3000}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 outline-none transition-all resize-none text-sm"
                placeholder="اكتب فقرة موجزة عن دوافعك وما يميّزك..."
              />
            </div>

            {/* Honeypot */}
            <div className="absolute w-0 h-0 overflow-hidden" aria-hidden="true">
              <input
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={e => update('website', e.target.value)}
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.consentDataProcessing}
                onChange={e => update('consentDataProcessing', e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span>
                أوافق على معالجة بياناتي لأغراض التقييم الوظيفي وفق نظام حماية البيانات (PDPL).
              </span>
            </label>

            {status === 'error' && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
                {message}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={status === 'loading'}
                className="flex-1 px-6 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl shadow-lg shadow-primary-600/25 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {status === 'loading' ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-2xl transition-colors"
              >
                إلغاء
              </button>
            </div>
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
