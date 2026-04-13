/**
 * TelehealthDashboard — لوحة تحكم الطب عن بعد
 */
import { useState, useEffect, useCallback } from 'react';
import {
  getConsultations,
  getTelehealthStats,
  cancelConsultation,
  STATUS_LABELS,
  TYPE_LABELS,
  PRIORITY_LABELS,
} from '../../services/telehealthService';

const statusBadgeClass = {
  scheduled: 'bg-blue-100 text-blue-800',
  waiting: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-green-100 text-green-800',
  paused: 'bg-orange-100 text-orange-800',
  completed: 'bg-teal-100 text-teal-800',
  cancelled: 'bg-gray-100 text-gray-600',
  no_show: 'bg-red-100 text-red-800',
  technical_failure: 'bg-purple-100 text-purple-800',
};

const priorityBadgeClass = {
  urgent: 'bg-red-100 text-red-700',
  routine: 'bg-blue-100 text-blue-700',
  follow_up: 'bg-gray-100 text-gray-600',
};

export default function TelehealthDashboard() {
  const [consultations, setConsultations] = useState([]);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({ status: '', date: '', search: '', page: 1 });
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, consultRes] = await Promise.all([
        getTelehealthStats(),
        getConsultations(filters),
      ]);
      setStats(statsRes.data?.data || {});
      setConsultations(consultRes.data?.data || []);
      setTotal(consultRes.data?.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCancel = async (id, reason) => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذه الاستشارة؟')) return;
    await cancelConsultation(id, reason || 'إلغاء من لوحة التحكم');
    loadData();
  };

  const formatDate = dt =>
    dt ? new Date(dt).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  return (
    <div className="p-6 bg-gray-50 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الطب عن بعد</h1>
            <p className="text-gray-500 text-sm mt-1">إدارة الاستشارات الافتراضية والجلسات عن بُعد</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <span>+</span> جدولة استشارة جديدة
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'اليوم', value: stats.todayCount ?? '—', color: 'blue', icon: '📅' },
            { label: 'نشطة الآن', value: stats.activeCount ?? '—', color: 'green', icon: '🎥' },
            { label: 'مكتملة اليوم', value: stats.completedToday ?? '—', color: 'teal', icon: '✅' },
            { label: 'هذا الأسبوع', value: stats.thisWeekCount ?? '—', color: 'indigo', icon: '📊' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs mb-1">{card.label}</p>
                  <p className={`text-2xl font-bold text-${card.color}-600`}>{card.value}</p>
                </div>
                <span className="text-2xl">{card.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="بحث باسم المستفيد أو رقم الاستشارة..."
              className="flex-1 min-w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
            />
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
            >
              <option value="">جميع الحالات</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <input
              type="date"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
              value={filters.date}
              onChange={e => setFilters(f => ({ ...f, date: e.target.value, page: 1 }))}
            />
            <button
              onClick={loadData}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              🔄 تحديث
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="mr-3 text-gray-500">جاري التحميل...</span>
            </div>
          ) : consultations.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <span className="text-4xl block mb-3">📅</span>
              لا توجد استشارات مطابقة
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['رقم الاستشارة', 'المستفيد', 'المعالج', 'النوع', 'الموعد', 'الأولوية', 'الحالة', 'إجراءات'].map(h => (
                      <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {consultations.map(c => (
                    <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-blue-700 font-medium">
                        {c.consultationNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{c.beneficiary?.name || '—'}</div>
                        <div className="text-xs text-gray-400">{c.beneficiary?.nationalId}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{c.provider?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{TYPE_LABELS[c.type] || c.type}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDate(c.scheduledAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityBadgeClass[c.priority] || ''}`}>
                          {PRIORITY_LABELS[c.priority] || c.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass[c.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[c.status] || c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <a
                            href={`/telehealth/consultations/${c._id}`}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            عرض
                          </a>
                          {c.status === 'scheduled' && (
                            <a
                              href={`/telehealth/consultations/${c._id}/video`}
                              className="text-green-600 hover:text-green-800 text-xs font-medium"
                            >
                              بدء
                            </a>
                          )}
                          {['scheduled', 'waiting'].includes(c.status) && (
                            <button
                              onClick={() => handleCancel(c._id)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              إلغاء
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
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <span>إجمالي {total} استشارة</span>
            <div className="flex gap-2">
              <button
                disabled={filters.page <= 1}
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                السابق
              </button>
              <span className="px-3 py-1">صفحة {filters.page}</span>
              <button
                disabled={consultations.length < 20}
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
