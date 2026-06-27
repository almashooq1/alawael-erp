/**
 * TelehealthDashboard — لوحة تحكم التأهيل عن بُعد
 * Remote Rehabilitation Dashboard
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  getRehabSessions,
  getUpcomingRehabSessions,
  getRehabStatistics,
  startRehabSession,
  completeRehabSession,
  addRehabMaterial,
  recordRehabIssue,
  REHAB_STATUS_LABELS,
  REHAB_STATUS_COLORS,
} from '../../services/telehealthService';

const statusBadgeClass = {
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-green-100 text-green-800',
  completed: 'bg-teal-100 text-teal-800',
  cancelled: 'bg-gray-100 text-gray-600',
  no_show: 'bg-red-100 text-red-800',
};

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDateShort(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
}

export default function TelehealthDashboard() {
  const [sessions, setSessions] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [userRole, setUserRole] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const today = new Date();
  const weekStart = getStartOfWeek(addDays(today, weekOffset * 7));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, upcomingRes, sessionsRes] = await Promise.all([
        getRehabStatistics(),
        getUpcomingRehabSessions(),
        getRehabSessions({ status: '', page: 1, limit: 50 }),
      ]);
      setStats(statsRes.data?.data || {});
      setUpcoming(upcomingRes.data?.data || []);
      setSessions(sessionsRes.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Detect role from localStorage or user context
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setUserRole(user.role || '');
    } catch {
      setUserRole('');
    }
  }, [loadData]);

  const handleStart = async (id) => {
    setActionLoading(prev => ({ ...prev, [id]: 'start' }));
    try {
      await startRehabSession(id);
      loadData();
    } catch (err) {
      alert(err?.response?.data?.message || 'فشل في بدء الجلسة');
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }));
    }
  };

  const handleComplete = async (id) => {
    const notes = window.prompt('ملاحظات إنهاء الجلسة:') || '';
    setActionLoading(prev => ({ ...prev, [id]: 'complete' }));
    try {
      await completeRehabSession(id, notes);
      loadData();
    } catch (err) {
      alert(err?.response?.data?.message || 'فشل في إنهاء الجلسة');
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }));
    }
  };

  const isTherapist = ['therapist', 'doctor', 'specialist', 'clinical_supervisor', 'admin', 'branch_admin'].includes(userRole);
  const isParent = ['parent', 'guardian'].includes(userRole);

  const sessionsForDay = (day) =>
    sessions.filter(s => s.scheduledAt && isSameDay(new Date(s.scheduledAt), day));

  const recentRecordings = sessions
    .flatMap(s => (s.recordings || []).map(r => ({ ...r, session: s })))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <div className="p-6 bg-gray-50 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">التأهيل عن بُعد</h1>
            <p className="text-gray-500 text-sm mt-1">
              {upcoming.length > 0
                ? `لديك ${upcoming.length} جلسة قادمة`
                : 'لا توجد جلسات قادمة'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              className="bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm transition-colors"
            >
              الأسبوع السابق
            </button>
            <span className="text-sm font-medium text-gray-700">
              {formatDateShort(weekStart)} - {formatDateShort(addDays(weekStart, 6))}
            </span>
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              className="bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm transition-colors"
            >
              الأسبوع التالي
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              اليوم
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: 'مكتملة هذا الشهر',
              value: stats.completedThisMonth ?? '—',
              color: 'teal',
              icon: '✅',
            },
            {
              label: 'متوسط المدة (دقيقة)',
              value: stats.avgDuration ?? '—',
              color: 'indigo',
              icon: '⏱️',
            },
            {
              label: 'مشاكل تقنية',
              value: stats.totalIssues ?? '—',
              color: 'orange',
              icon: '⚠️',
            },
            {
              label: 'نسبة الإنجاز',
              value: stats.completionRate ? `${stats.completionRate}%` : '—',
              color: 'green',
              icon: '📊',
            },
          ].map(card => (
            <div
              key={card.label}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
            >
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

        {/* Weekly Calendar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">التقويم الأسبوعي</h2>
            <span className="text-sm text-gray-500">{upcoming.length} جلسة قادمة</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="mr-3 text-gray-500">جاري التحميل...</span>
            </div>
          ) : (
            <div className="grid grid-cols-7 divide-x divide-gray-100 min-h-[240px]">
              {weekDays.map((day, idx) => {
                const daySessions = sessionsForDay(day);
                const isToday = isSameDay(day, today);
                return (
                  <div key={idx} className={`p-3 ${isToday ? 'bg-blue-50/50' : ''}`}>
                    <div className="text-center mb-3">
                      <div className={`text-xs font-medium ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                        {DAYS[idx]}
                      </div>
                      <div className={`text-lg font-bold ${isToday ? 'text-blue-700' : 'text-gray-800'}`}>
                        {day.getDate()}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {daySessions.map(s => (
                        <div
                          key={s._id}
                          className="bg-gray-50 rounded-lg p-2 text-xs border border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer"
                          onClick={() => {
                            if (s.meetingLink) window.open(s.meetingLink, '_blank');
                          }}
                        >
                          <div className="font-semibold text-gray-700 truncate">
                            {s.beneficiaryId?.name || 'مستفيد'}
                          </div>
                          <div className="text-gray-500">{formatTime(s.scheduledAt)}</div>
                          <span
                            className={`inline-block mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${statusBadgeClass[s.status] || 'bg-gray-100 text-gray-600'}`}
                          >
                            {REHAB_STATUS_LABELS[s.status] || s.status}
                          </span>
                        </div>
                      ))}
                      {daySessions.length === 0 && (
                        <div className="text-center text-gray-300 text-[10px] py-2">—</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Session Cards */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">الجلسات القادمة</h2>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-400">
                <span className="text-4xl block mb-3">📅</span>
                لا توجد جلسات قادمة
              </div>
            ) : (
              upcoming.map(s => (
                <div
                  key={s._id}
                  className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">
                        {s.beneficiaryId?.name || 'مستفيد'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDateShort(s.scheduledAt)} — {formatTime(s.scheduledAt)}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadgeClass[s.status] || 'bg-gray-100 text-gray-600'}`}
                    >
                      {REHAB_STATUS_LABELS[s.status] || s.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-3">
                    <div>المعالج: {s.therapistId?.name || '—'}</div>
                    <div>المنصة: {s.platform || 'zoom'}</div>
                    <div>المدة: {s.duration || 45} دقيقة</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.meetingLink && (
                      <a
                        href={s.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                      >
                        {isTherapist ? 'بدء الجلسة' : 'الانضمام للجلسة'}
                      </a>
                    )}
                    {isTherapist && s.status === 'scheduled' && (
                      <button
                        onClick={() => handleStart(s._id)}
                        disabled={actionLoading[s._id] === 'start'}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                      >
                        {actionLoading[s._id] === 'start' ? '...' : 'بدء'}
                      </button>
                    )}
                    {isTherapist && s.status === 'in_progress' && (
                      <button
                        onClick={() => handleComplete(s._id)}
                        disabled={actionLoading[s._id] === 'complete'}
                        className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                      >
                        {actionLoading[s._id] === 'complete' ? '...' : 'إنهاء'}
                      </button>
                    )}
                    {isParent && s.meetingLink && (
                      <a
                        href={s.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-center px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                      >
                        انضمام كولي أمر
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Recordings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">التسجيلات الأخيرة</h2>
          </div>
          <div className="p-4">
            {recentRecordings.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <span className="text-3xl block mb-2">🎥</span>
                لا توجد تسجيلات
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentRecordings.map((rec, idx) => (
                  <div key={idx} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      {rec.session?.beneficiaryId?.name || 'جلسة'}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {rec.duration ? `${rec.duration} دقيقة` : '—'} —{' '}
                      {rec.createdAt ? formatDateShort(rec.createdAt) : '—'}
                    </div>
                    {rec.url && (
                      <a
                        href={rec.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        مشاهدة التسجيل ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* All Sessions Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">سجل الجلسات</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['المستفيد', 'المعالج', 'الموعد', 'الحالة', 'المنصة', 'المدة', 'ولي الأمر', 'إجراءات'].map(h => (
                    <th
                      key={h}
                      className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.slice(0, 10).map(s => (
                  <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{s.beneficiaryId?.name || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{s.therapistId?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatDateShort(s.scheduledAt)} {formatTime(s.scheduledAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass[s.status] || 'bg-gray-100 text-gray-600'}`}
                      >
                        {REHAB_STATUS_LABELS[s.status] || s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.platform || 'zoom'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.duration || 45} د</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${s.parentAttended ? 'text-green-600' : 'text-gray-400'}`}>
                        {s.parentAttended ? 'حضر' : 'لم يحضر'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {s.meetingLink && (
                          <a
                            href={s.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            فتح الرابط
                          </a>
                        )}
                        {isTherapist && s.status === 'scheduled' && (
                          <button
                            onClick={() => handleStart(s._id)}
                            className="text-green-600 hover:text-green-800 text-xs font-medium"
                          >
                            بدء
                          </button>
                        )}
                        {isTherapist && s.status === 'in_progress' && (
                          <button
                            onClick={() => handleComplete(s._id)}
                            className="text-teal-600 hover:text-teal-800 text-xs font-medium"
                          >
                            إنهاء
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-400">
                      لا توجد جلسات مسجلة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
