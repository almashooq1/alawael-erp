import { useState, useEffect, useCallback } from 'react';
import {
  getReferrals,
  getReferralAnalytics,
  reviewReferral,
  autoAssignReferral,
  REFERRAL_STATUS_LABELS,
  REFERRAL_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  canTransition,
} from '../../services/referralPortalService';

// ===== مكوّن شارة الحالة =====
function StatusBadge({ status }) {
  const color = REFERRAL_STATUS_COLORS[status] || 'gray';
  const label = REFERRAL_STATUS_LABELS[status] || status;
  const colorMap = {
    gray:   'bg-gray-100 text-gray-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    blue:   'bg-blue-100 text-blue-700',
    red:    'bg-red-100 text-red-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    green:  'bg-green-100 text-green-700',
    teal:   'bg-teal-100 text-teal-700',
    slate:  'bg-slate-100 text-slate-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[color] || colorMap.gray}`}>
      {label}
    </span>
  );
}

// ===== مكوّن شارة الأولوية =====
function PriorityBadge({ priority }) {
  const color = PRIORITY_COLORS[priority] || 'gray';
  const label = PRIORITY_LABELS[priority] || priority;
  const colorMap = {
    red:    'bg-red-100 text-red-700 border border-red-200',
    blue:   'bg-blue-100 text-blue-700 border border-blue-200',
    green:  'bg-green-100 text-green-700 border border-green-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${colorMap[color] || 'bg-gray-100 text-gray-700'}`}>
      {priority === 'urgent' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 ml-1 animate-pulse"></span>}
      {label}
    </span>
  );
}

// ===== بطاقة إحصائية =====
function StatCard({ title, value, subtitle, color, icon }) {
  const colorMap = {
    blue:   'bg-blue-500',
    yellow: 'bg-yellow-500',
    green:  'bg-green-500',
    red:    'bg-red-500',
    indigo: 'bg-indigo-500',
    teal:   'bg-teal-500',
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value ?? '—'}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 ${colorMap[color] || 'bg-gray-400'} rounded-xl flex items-center justify-center text-white text-xl`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ===== نافذة مراجعة التحويل =====
function ReviewModal({ referral, onClose, onSuccess }) {
  const [decision, setDecision] = useState('accepted');
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await reviewReferral(referral._id, { decision, notes, rejectionReason });
      onSuccess();
      onClose();
    } catch (err) {
      alert('حدث خطأ أثناء المراجعة: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">مراجعة التحويل #{referral.referralNumber}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
          <p className="text-sm text-gray-500 mt-1">المريض: {referral.patientName}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">القرار</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="accepted" checked={decision === 'accepted'} onChange={e => setDecision(e.target.value)} className="text-green-600" />
                <span className="text-green-700 font-medium">قبول</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="rejected" checked={decision === 'rejected'} onChange={e => setDecision(e.target.value)} className="text-red-600" />
                <span className="text-red-700 font-medium">رفض</span>
              </label>
            </div>
          </div>

          {decision === 'rejected' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">سبب الرفض *</label>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                required
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                placeholder="يرجى توضيح سبب رفض التحويل..."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات المراجعة</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="أضف ملاحظاتك على التحويل..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-2.5 rounded-lg text-white font-medium transition-colors ${
                decision === 'accepted'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              } disabled:opacity-50`}
            >
              {loading ? 'جاري...' : decision === 'accepted' ? '✓ قبول التحويل' : '✗ رفض التحويل'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== الصفحة الرئيسية =====
export default function ReferralPortal() {
  const [referrals, setReferrals]     = useState([]);
  const [analytics, setAnalytics]     = useState(null);
  const [loading, setLoading]         = useState(true);
  const [page, setPage]               = useState(1);
  const [total, setTotal]             = useState(0);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [filters, setFilters]         = useState({
    search: '', status: '', priority: '', specialty: '', source: '',
  });

  const limit = 20;

  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, ...filters };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const res = await getReferrals(params);
      setReferrals(res.data?.referrals || res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error('Failed to fetch referrals:', err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await getReferralAnalytics();
      setAnalytics(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  }, []);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleAutoAssign = async (referralId) => {
    try {
      await autoAssignReferral(referralId);
      fetchReferrals();
    } catch (err) {
      alert('فشل التعيين التلقائي: ' + (err.response?.data?.message || err.message));
    }
  };

  const totalPages = Math.ceil(total / limit);

  const specialties = [
    { value: '', label: 'كل التخصصات' },
    { value: 'speech_therapy', label: 'علاج النطق' },
    { value: 'physiotherapy', label: 'العلاج الطبيعي' },
    { value: 'occupational_therapy', label: 'العلاج الوظيفي' },
    { value: 'psychology', label: 'علم النفس' },
    { value: 'autism', label: 'التوحد' },
    { value: 'developmental_delay', label: 'التأخر النمائي' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      {/* الترويسة */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">بوابة التحويلات الطبية</h1>
          <p className="text-gray-500 text-sm mt-1">استقبال وإدارة التحويلات من المستشفيات والعيادات</p>
        </div>
        <a
          href="/referrals/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center gap-2"
        >
          <span>+</span>
          تحويل جديد
        </a>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="إجمالي التحويلات"
          value={analytics?.total ?? total}
          subtitle="منذ بداية الشهر"
          color="blue"
          icon="📋"
        />
        <StatCard
          title="قيد المراجعة"
          value={analytics?.by_status?.received ?? '—'}
          subtitle="تنتظر القرار"
          color="yellow"
          icon="⏳"
        />
        <StatCard
          title="عاجل"
          value={analytics?.urgent_pending ?? '—'}
          subtitle="تحويلات عاجلة"
          color="red"
          icon="🚨"
        />
        <StatCard
          title="نسبة القبول"
          value={analytics?.acceptance_rate != null ? `${analytics.acceptance_rate}%` : '—'}
          subtitle="من التحويلات"
          color="green"
          icon="✅"
        />
      </div>

      {/* الإحصائيات التفصيلية */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* توزيع الحالات */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-700 mb-4">توزيع الحالات</h3>
            <div className="space-y-2">
              {Object.entries(analytics.by_status || {}).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <StatusBadge status={status} />
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{ width: `${Math.min((count / (analytics.total || 1)) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-600 w-8 text-left">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* أعلى التخصصات */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-700 mb-4">التخصصات الأكثر طلباً</h3>
            <div className="space-y-2">
              {Object.entries(analytics.by_specialty || {}).slice(0, 5).map(([specialty, count]) => (
                <div key={specialty} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{specialty}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full"
                        style={{ width: `${Math.min((count / (analytics.total || 1)) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-600 w-8 text-left">{count}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 text-sm text-gray-500">
              متوسط وقت المراجعة: <span className="font-semibold text-gray-700">{analytics.avg_processing_days} يوم</span>
            </div>
          </div>
        </div>
      )}

      {/* الفلاتر */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم الهوية..."
            value={filters.search}
            onChange={e => handleFilterChange('search', e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 flex-1 min-w-48"
          />
          <select
            value={filters.status}
            onChange={e => handleFilterChange('status', e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">كل الحالات</option>
            {Object.entries(REFERRAL_STATUS_LABELS).map(([val, lbl]) => (
              <option key={val} value={val}>{lbl}</option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={e => handleFilterChange('priority', e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">كل الأولويات</option>
            <option value="urgent">عاجل</option>
            <option value="routine">روتيني</option>
            <option value="elective">اختياري</option>
          </select>
          <select
            value={filters.specialty}
            onChange={e => handleFilterChange('specialty', e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {specialties.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={filters.source}
            onChange={e => handleFilterChange('source', e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">كل المصادر</option>
            <option value="manual">يدوي</option>
            <option value="moh">وزارة الصحة</option>
            <option value="fhir">FHIR</option>
            <option value="email">بريد إلكتروني</option>
            <option value="api">API</option>
          </select>
        </div>
      </div>

      {/* جدول التحويلات */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">
            قائمة التحويلات
            <span className="text-gray-400 font-normal text-sm mr-2">({total} تحويل)</span>
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin ml-3"></div>
            جاري التحميل...
          </div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">📋</div>
            <p>لا توجد تحويلات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="text-right px-4 py-3 font-medium">رقم التحويل</th>
                  <th className="text-right px-4 py-3 font-medium">المريض</th>
                  <th className="text-right px-4 py-3 font-medium">الجهة المحيلة</th>
                  <th className="text-right px-4 py-3 font-medium">التخصص</th>
                  <th className="text-right px-4 py-3 font-medium">الأولوية</th>
                  <th className="text-right px-4 py-3 font-medium">الحالة</th>
                  <th className="text-right px-4 py-3 font-medium">المُعيَّن</th>
                  <th className="text-right px-4 py-3 font-medium">التاريخ</th>
                  <th className="text-right px-4 py-3 font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {referrals.map(ref => (
                  <tr key={ref._id} className={`hover:bg-gray-50 transition-colors ${ref.priority === 'urgent' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-blue-600 font-medium">{ref.referralNumber}</div>
                      {ref.sourceSystem !== 'manual' && (
                        <span className="text-xs text-gray-400">{ref.sourceSystem?.toUpperCase()}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{ref.patientName}</div>
                      {ref.patientNationalId && (
                        <div className="text-xs text-gray-400">{ref.patientNationalId}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-700">{ref.referringFacility?.name || '—'}</div>
                      {ref.referringPhysicianName && (
                        <div className="text-xs text-gray-400">د. {ref.referringPhysicianName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs">
                        {ref.specialtyRequired}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <PriorityBadge priority={ref.priority} />
                        <div className="w-16 bg-gray-100 rounded-full h-1">
                          <div
                            className={`h-1 rounded-full ${ref.priorityScore >= 70 ? 'bg-red-500' : ref.priorityScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${ref.priorityScore}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={ref.status} />
                    </td>
                    <td className="px-4 py-3">
                      {ref.assignedTo ? (
                        <span className="text-gray-700 text-xs">{ref.assignedTo?.name || 'مُعيَّن'}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">غير مُعيَّن</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {ref.createdAt ? new Date(ref.createdAt).toLocaleDateString('ar-SA') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <a
                          href={`/referrals/${ref._id}`}
                          className="text-blue-500 hover:text-blue-700 text-xs px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                        >
                          عرض
                        </a>
                        {canTransition(ref.status, 'accepted') && (
                          <button
                            onClick={() => setReviewTarget(ref)}
                            className="text-green-600 hover:text-green-800 text-xs px-2 py-1 rounded hover:bg-green-50 transition-colors"
                          >
                            مراجعة
                          </button>
                        )}
                        {ref.status === 'accepted' && !ref.assignedTo && (
                          <button
                            onClick={() => handleAutoAssign(ref._id)}
                            className="text-indigo-600 hover:text-indigo-800 text-xs px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                          >
                            تعيين
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ترقيم الصفحات */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              عرض {(page - 1) * limit + 1}–{Math.min(page * limit, total)} من {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                السابق
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page - 2 + i;
                if (p < 1 || p > totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${p === page ? 'bg-blue-600 text-white' : 'border border-gray-200 hover:bg-gray-50'}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {/* نافذة المراجعة */}
      {reviewTarget && (
        <ReviewModal
          referral={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSuccess={() => { fetchReferrals(); fetchAnalytics(); }}
        />
      )}
    </div>
  );
}
