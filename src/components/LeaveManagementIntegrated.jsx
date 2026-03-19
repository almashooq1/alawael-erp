/**
 * LeaveManagementIntegrated.jsx - إدارة الإجازات مع تكامل API كامل
 * نسخة محسّنة مع اتصال Backend حقيقي
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Check, X, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import HRAPIService from '../services/HRAPIService';

export default function LeaveManagementIntegrated() {
  // States
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filter State
  const [filterStatus, setFilterStatus] = useState('all');

  // Form State
  const [showNewLeaveForm, setShowNewLeaveForm] = useState(false);
  const [newLeave, setNewLeave] = useState({
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
  });

  // Rejection Modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Fetch leave requests
  const loadLeaveRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = filterStatus === 'all' ? {} : { status: filterStatus };

      const data = await HRAPIService.getPendingLeaveRequests(filters);

      setLeaveRequests(data || getMockLeaveRequests());
    } catch (err) {
      console.error('خطأ في جلب طلبات الإجازات:', err);
      setError('فشل تحميل طلبات الإجازات. جاري استخدام البيانات البديلة...');
      setLeaveRequests(getMockLeaveRequests());
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  // Load data on mount and when filter changes
  useEffect(() => {
    loadLeaveRequests();
  }, [loadLeaveRequests]);

  // Calculate days between dates
  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Handle Submit New Leave
  const handleSubmitNewLeave = async () => {
    try {
      // Validation
      if (!newLeave.startDate || !newLeave.endDate || !newLeave.reason) {
        setError('الرجاء ملء جميع الحقول المطلوبة');
        return;
      }

      if (new Date(newLeave.startDate) > new Date(newLeave.endDate)) {
        setError('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
        return;
      }

      setLoading(true);

      // Submit leave request
      const request = await HRAPIService.requestLeave({
        leaveType: newLeave.leaveType,
        startDate: newLeave.startDate,
        endDate: newLeave.endDate,
        reason: newLeave.reason,
      });

      // Add to list
      setLeaveRequests([request, ...leaveRequests]);

      // Reset form
      setShowNewLeaveForm(false);
      setNewLeave({
        leaveType: 'annual',
        startDate: '',
        endDate: '',
        reason: '',
      });

      setSuccess('تم تقديم طلب الإجازة بنجاح');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('فشل تقديم طلب الإجازة: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Approve Leave
  const handleApproveLeave = async leaveId => {
    try {
      setLoading(true);

      const result = await HRAPIService.approveLeave(leaveId, {
        approvalDate: new Date().toISOString(),
      });

      // Update list
      setLeaveRequests(leaveRequests.map(req => (req.id === leaveId ? result : req)));

      setSuccess('تم الموافقة على الإجازة');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('فشل الموافقة: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Reject Leave
  const handleRejectLeave = async () => {
    try {
      setLoading(true);

      if (!rejectTarget) {
        setError('لم يتم تحديد طلب');
        return;
      }

      const result = await HRAPIService.rejectLeave(rejectTarget.id, {
        rejectionReason: rejectReason,
      });

      // Update list
      setLeaveRequests(leaveRequests.map(req => (req.id === rejectTarget.id ? result : req)));

      setSuccess('تم رفض الإجازة');
      setShowRejectModal(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('فشل الرفض: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLeaveRequests();
    setRefreshing(false);
  };

  // Get filtered requests
  const filteredRequests =
    filterStatus === 'all'
      ? leaveRequests
      : leaveRequests.filter(req => req.status === filterStatus);

  // Count stats
  const stats = {
    total: leaveRequests.length,
    pending: leaveRequests.filter(req => req.status === 'معلق').length,
    approved: leaveRequests.filter(req => req.status === 'موافق عليه').length,
    rejected: leaveRequests.filter(req => req.status === 'مرفوض').length,
  };

  // Loading state
  if (loading && leaveRequests.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">إدارة الإجازات</h1>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50"
          >
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowNewLeaveForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            <Plus size={20} />
            طلب إجازة جديد
          </button>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-3">
          <CheckCircle size={20} />
          {success}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="إجمالي الطلبات" value={stats.total} icon="📋" color="blue" />
        <StatCard label="معلقة" value={stats.pending} icon="⏳" color="yellow" />
        <StatCard label="موافق عليها" value={stats.approved} icon="✅" color="green" />
        <StatCard label="مرفوضة" value={stats.rejected} icon="❌" color="red" />
      </div>

      {/* Filter Buttons */}
      <div className="bg-white rounded-lg shadow p-4 flex gap-2 flex-wrap">
        {['all', 'معلق', 'موافق عليه', 'مرفوض'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status === 'all' ? 'all' : status)}
            className={`px-4 py-2 rounded-lg transition font-semibold ${
              filterStatus === status || (filterStatus === 'all' && status === 'all')
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {status === 'all' ? 'الكل' : status}
          </button>
        ))}
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="px-6 py-3 font-semibold text-gray-800">الموظف</th>
                <th className="px-6 py-3 font-semibold text-gray-800">نوع الإجازة</th>
                <th className="px-6 py-3 font-semibold text-gray-800">الفترة</th>
                <th className="px-6 py-3 font-semibold text-gray-800">الأيام</th>
                <th className="px-6 py-3 font-semibold text-gray-800">السبب</th>
                <th className="px-6 py-3 font-semibold text-gray-800">الحالة</th>
                <th className="px-6 py-3 font-semibold text-gray-800">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length > 0 ? (
                filteredRequests.map(request => (
                  <tr key={request.id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-gray-800 font-semibold">
                      {request.employeeName}
                    </td>
                    <td className="px-6 py-4 text-gray-700">{request.type}</td>
                    <td className="px-6 py-4 text-gray-700 text-sm">
                      <div>{request.startDate}</div>
                      <div className="text-xs text-gray-500">إلى {request.endDate}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-semibold">
                      {calculateDays(request.startDate, request.endDate)} يوم
                    </td>
                    <td className="px-6 py-4 text-gray-700">{request.reason}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          request.status === 'معلق'
                            ? 'bg-yellow-100 text-yellow-800'
                            : request.status === 'موافق عليه'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {request.status === 'معلق' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveLeave(request.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="الموافقة"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setRejectTarget(request);
                              setShowRejectModal(true);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="الرفض"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    لا توجد طلبات إجازات
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Leave Modal */}
      {showNewLeaveForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">طلب إجازة جديد</h2>

            <div className="space-y-4">
              {/* Leave Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  نوع الإجازة
                </label>
                <select
                  value={newLeave.leaveType}
                  onChange={e => setNewLeave({ ...newLeave, leaveType: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="annual">سنوية</option>
                  <option value="sick">مرضية</option>
                  <option value="personal">شخصية</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">من</label>
                <input
                  type="date"
                  value={newLeave.startDate}
                  onChange={e => setNewLeave({ ...newLeave, startDate: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">إلى</label>
                <input
                  type="date"
                  value={newLeave.endDate}
                  onChange={e => setNewLeave({ ...newLeave, endDate: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Days Display */}
              {newLeave.startDate && newLeave.endDate && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-700">عدد الأيام:</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {calculateDays(newLeave.startDate, newLeave.endDate)} يوم
                  </p>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">السبب</label>
                <textarea
                  value={newLeave.reason}
                  onChange={e => setNewLeave({ ...newLeave, reason: e.target.value })}
                  rows="3"
                  placeholder="اشرح سبب طلب الإجازة..."
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                ></textarea>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => setShowNewLeaveForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleSubmitNewLeave}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
              >
                {loading ? 'جاري الإرسال...' : 'تقديم الطلب'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">رفض الإجازة</h2>

            <div className="mb-4">
              <p className="text-gray-700 mb-4">
                هل أنت متأكد من رفض إجازة <strong>{rejectTarget?.employeeName}</strong>؟
              </p>

              <label className="block text-sm font-semibold text-gray-700 mb-2">
                السبب (اختياري)
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows="3"
                placeholder="أدخل سبب الرفض..."
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              ></textarea>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleRejectLeave}
                disabled={loading}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
              >
                {loading ? 'جاري الرفض...' : 'رفض'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Stat Card Component
 */
function StatCard({ label, value, icon, color }) {
  const colorMap = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div className={`rounded-lg border-2 p-6 ${colorMap[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold opacity-75">{label}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

/**
 * Mock Data
 */
function getMockLeaveRequests() {
  return [
    {
      id: 1,
      employeeName: 'أحمد محمد',
      type: 'سنوية',
      startDate: '2026-02-15',
      endDate: '2026-02-20',
      reason: 'إجازة عائلية',
      status: 'معلق',
      requestDate: '2026-02-01',
    },
    {
      id: 2,
      employeeName: 'فاطمة علي',
      type: 'مرضية',
      startDate: '2026-02-10',
      endDate: '2026-02-12',
      reason: 'علاج طبي',
      status: 'موافق عليه',
      approvedBy: 'محمد علي',
      approvalDate: '2026-02-08',
    },
    {
      id: 3,
      employeeName: 'محمود حسن',
      type: 'شخصية',
      startDate: '2026-02-08',
      endDate: '2026-02-09',
      reason: 'مراجعة شخصية',
      status: 'موافق عليه',
      approvedBy: 'محمد علي',
      approvalDate: '2026-02-05',
    },
  ];
}
