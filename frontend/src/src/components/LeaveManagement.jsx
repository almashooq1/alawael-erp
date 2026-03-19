import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';

/**
 * Leave Management - إدارة الإجازات
 * تقديم، الموافقة، تتبع الإجازات
 */

const LeaveManagement = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showNewLeaveForm, setShowNewLeaveForm] = useState(false);
  const [newLeave, setNewLeave] = useState({
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
  });

  useEffect(() => {
    // محاكاة جلب طلبات الإجازات
    const mockLeaves = [
      {
        id: 1,
        employeeName: 'أحمد محمد',
        leaveType: 'سنوية',
        startDate: '2026-02-20',
        endDate: '2026-02-24',
        days: 5,
        reason: 'عطلة عائلية',
        status: 'معلق',
        requestDate: '2026-02-10',
      },
      {
        id: 2,
        employeeName: 'فاطمة علي',
        leaveType: 'مرضية',
        startDate: '2026-02-15',
        endDate: '2026-02-17',
        days: 3,
        reason: 'حالة صحية',
        status: 'موافق عليه',
        requestDate: '2026-02-13',
        approvedBy: 'محمود إبراهيم',
        approvedDate: '2026-02-13',
      },
      {
        id: 3,
        employeeName: 'محمود حسن',
        leaveType: 'شخصية',
        startDate: '2026-02-18',
        endDate: '2026-02-18',
        days: 1,
        reason: 'ضروري شخصي',
        status: 'مرفوض',
        requestDate: '2026-02-15',
        rejectedBy: 'سارة أحمد',
        rejectedDate: '2026-02-15',
        rejectionReason: 'فترة حرجة في المشروع',
      },
    ];
    setLeaveRequests(mockLeaves);
  }, []);

  const filteredLeaves =
    filterStatus === 'all' ? leaveRequests : leaveRequests.filter((l) => l.status === filterStatus);

  const handleApproveLeave = (id) => {
    if (window.confirm('هل تريد الموافقة على هذه الإجازة؟')) {
      setLeaveRequests(
        leaveRequests.map((leave) =>
          leave.id === id
            ? {
                ...leave,
                status: 'موافق عليه',
                approvedBy: 'أنت',
                approvedDate: new Date().toISOString().slice(0, 10),
              }
            : leave
        )
      );
      alert('تمت الموافقة على الإجازة');
    }
  };

  const handleRejectLeave = (id) => {
    const reason = prompt('أدخل سبب الرفض:');
    if (reason) {
      setLeaveRequests(
        leaveRequests.map((leave) =>
          leave.id === id
            ? {
                ...leave,
                status: 'مرفوض',
                rejectedBy: 'أنت',
                rejectedDate: new Date().toISOString().slice(0, 10),
                rejectionReason: reason,
              }
            : leave
        )
      );
      alert('تم رفض الإجازة');
    }
  };

  const handleSubmitNewLeave = () => {
    if (!newLeave.startDate || !newLeave.endDate || !newLeave.reason) {
      alert('الرجاء ملء جميع الحقول');
      return;
    }

    const days =
      Math.ceil(
        (new Date(newLeave.endDate) - new Date(newLeave.startDate)) / (1000 * 60 * 60 * 24)
      ) + 1;

    const leave = {
      id: leaveRequests.length + 1,
      employeeName: 'الموظف الحالي',
      leaveType:
        newLeave.leaveType === 'annual' ? 'سنوية' : newLeave.leaveType === 'sick' ? 'مرضية' : 'شخصية',
      startDate: newLeave.startDate,
      endDate: newLeave.endDate,
      days,
      reason: newLeave.reason,
      status: 'معلق',
      requestDate: new Date().toISOString().slice(0, 10),
    };

    setLeaveRequests([leave, ...leaveRequests]);
    setNewLeave({ leaveType: 'annual', startDate: '', endDate: '', reason: '' });
    setShowNewLeaveForm(false);
    alert('تم تقديم طلب الإجازة');
  };

  const getStatusIcon = (status) => {
    if (status === 'موافق عليه') return <CheckCircle className="text-green-600" size={20} />;
    if (status === 'مرفوض') return <XCircle className="text-red-600" size={20} />;
    return <Clock className="text-yellow-600" size={20} />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      {/* الرأس */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">إدارة الإجازات</h1>
        <p className="text-slate-600">تقديم وإدارة طلبات الإجازات</p>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="إجمالي الطلبات"
          value={leaveRequests.length}
          icon={Calendar}
          color="bg-blue-50"
        />
        <StatCard
          title="معلق"
          value={leaveRequests.filter((l) => l.status === 'معلق').length}
          icon={Clock}
          color="bg-yellow-50"
        />
        <StatCard
          title="موافق عليه"
          value={leaveRequests.filter((l) => l.status === 'موافق عليه').length}
          icon={CheckCircle}
          color="bg-green-50"
        />
        <StatCard
          title="مرفوض"
          value={leaveRequests.filter((l) => l.status === 'مرفوض').length}
          icon={XCircle}
          color="bg-red-50"
        />
      </div>

      {/* الإجراءات */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2">
            <button
              className={`px-6 py-2 rounded-lg transition ${
                filterStatus === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
              onClick={() => setFilterStatus('all')}
            >
              الكل
            </button>
            <button
              className={`px-6 py-2 rounded-lg transition ${
                filterStatus === 'معلق'
                  ? 'bg-yellow-600 text-white'
                  : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
              onClick={() => setFilterStatus('معلق')}
            >
              معلق
            </button>
            <button
              className={`px-6 py-2 rounded-lg transition ${
                filterStatus === 'موافق عليه'
                  ? 'bg-green-600 text-white'
                  : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
              onClick={() => setFilterStatus('موافق عليه')}
            >
              موافق عليه
            </button>
          </div>
          <button
            onClick={() => setShowNewLeaveForm(!showNewLeaveForm)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            {showNewLeaveForm ? 'إلغاء' : 'طلب إجازة جديد'}
          </button>
        </div>
      </div>

      {/* نموذج طلب إجازة جديد */}
      {showNewLeaveForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">تقديم طلب إجازة جديد</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-2">نوع الإجازة</label>
              <select
                value={newLeave.leaveType}
                onChange={(e) => setNewLeave({ ...newLeave, leaveType: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="annual">سنوية</option>
                <option value="sick">مرضية</option>
                <option value="personal">شخصية</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-2">تاريخ البداية</label>
              <input
                type="date"
                value={newLeave.startDate}
                onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-2">تاريخ النهاية</label>
              <input
                type="date"
                value={newLeave.endDate}
                onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-2">السبب</label>
              <input
                type="text"
                value={newLeave.reason}
                onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                placeholder="أدخل سبب الإجازة"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-4 justify-end mt-6">
            <button
              onClick={() => setShowNewLeaveForm(false)}
              className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
            >
              إلغاء
            </button>
            <button
              onClick={handleSubmitNewLeave}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              تقديم الطلب
            </button>
          </div>
        </div>
      )}

      {/* جدول الإجازات */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100 border-b">
            <tr>
              <th className="text-right py-4 px-6 text-slate-700 font-semibold">اسم الموظف</th>
              <th className="text-center py-4 px-6 text-slate-700 font-semibold">نوع الإجازة</th>
              <th className="text-center py-4 px-6 text-slate-700 font-semibold">الفترة</th>
              <th className="text-center py-4 px-6 text-slate-700 font-semibold">الأيام</th>
              <th className="text-right py-4 px-6 text-slate-700 font-semibold">السبب</th>
              <th className="text-center py-4 px-6 text-slate-700 font-semibold">الحالة</th>
              <th className="text-center py-4 px-6 text-slate-700 font-semibold">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeaves.map((leave) => (
              <tr key={leave.id} className="border-b hover:bg-slate-50">
                <td className="py-4 px-6 text-slate-900 font-semibold">{leave.employeeName}</td>
                <td className="py-4 px-6 text-center text-slate-600">{leave.leaveType}</td>
                <td className="py-4 px-6 text-center text-slate-600">
                  {new Date(leave.startDate).toLocaleDateString('ar-EG')} -{' '}
                  {new Date(leave.endDate).toLocaleDateString('ar-EG')}
                </td>
                <td className="py-4 px-6 text-center font-semibold text-slate-900">
                  {leave.days} أيام
                </td>
                <td className="py-4 px-6 text-right text-slate-600">{leave.reason}</td>
                <td className="py-4 px-6 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {getStatusIcon(leave.status)}
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        leave.status === 'معلق'
                          ? 'bg-yellow-100 text-yellow-800'
                          : leave.status === 'موافق عليه'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {leave.status}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6 text-center">
                  {leave.status === 'معلق' && (
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleApproveLeave(leave.id)}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition"
                      >
                        موافق
                      </button>
                      <button
                        onClick={() => handleRejectLeave(leave.id)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
                      >
                        رفض
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredLeaves.length === 0 && (
          <div className="text-center py-8 text-slate-500">لا توجد نتائج</div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className={`${color} rounded-lg shadow-md p-6 border border-slate-200`}>
    <div className="flex items-start justify-between mb-4">
      <h3 className="text-slate-600 font-semibold">{title}</h3>
      <Icon className="text-slate-600" size={24} />
    </div>
    <div className="text-3xl font-bold text-slate-900">{value}</div>
  </div>
);

export default LeaveManagement;
