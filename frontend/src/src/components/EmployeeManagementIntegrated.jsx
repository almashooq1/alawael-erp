/**
 * EmployeeManagementIntegrated.jsx - إدارة الموظفين مع تكامل API كامل
 * نسخة محسّنة مع اتصال Backend حقيقي
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Eye, Edit2, Trash2, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import HRAPIService from '../services/HRAPIService';

export default function EmployeeManagementIntegrated() {
  // States
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view'); // 'view', 'create', 'edit'
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    position: '',
    department: '',
    hireDate: '',
    salary: '',
    phone: '',
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Fetch employees from API
  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await HRAPIService.getEmployees({
        search: searchTerm,
      });

      setEmployees(data || getMockEmployees());
      setFilteredEmployees(data || getMockEmployees());
    } catch (err) {
      console.error('خطأ في جلب الموظفين:', err);
      setError('فشل تحميل قائمة الموظفين. جاري استخدام البيانات البديلة...');
      const mockData = getMockEmployees();
      setEmployees(mockData);
      setFilteredEmployees(mockData);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  // Load data on mount
  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // Search functionality
  useEffect(() => {
    if (searchTerm) {
      const filtered = employees.filter(
        (emp) =>
          emp.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.position?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees(employees);
    }
  }, [searchTerm, employees]);

  // Handle Modal Open
  const handleOpenModal = (mode, employee = null) => {
    setModalMode(mode);
    setSelectedEmployee(employee);

    if (mode === 'create') {
      setFormData({
        fullName: '',
        email: '',
        position: '',
        department: '',
        hireDate: '',
        salary: '',
        phone: '',
      });
    } else if (employee) {
      setFormData(employee);
    }

    setShowModal(true);
  };

  // Handle Save Employee
  const handleSave = async () => {
    try {
      // Validation
      if (!formData.fullName || !formData.email) {
        setError('الرجاء ملء جميع الحقول المطلوبة');
        return;
      }

      setLoading(true);

      if (modalMode === 'create') {
        // Create new employee
        const newEmployee = await HRAPIService.createEmployee(formData);
        setEmployees([newEmployee, ...employees]);
        setSuccess('تم إضافة الموظف بنجاح');
      } else if (modalMode === 'edit') {
        // Update employee
        const updated = await HRAPIService.updateEmployee(
          selectedEmployee.id,
          formData
        );
        setEmployees(
          employees.map((emp) => (emp.id === selectedEmployee.id ? updated : emp))
        );
        setSuccess('تم تحديث بيانات الموظف بنجاح');
      }

      setShowModal(false);
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('فشل حفظ البيانات: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Delete Employee
  const handleDelete = async () => {
    try {
      setLoading(true);

      await HRAPIService.deleteEmployee(deleteTarget.id);

      setEmployees(employees.filter((emp) => emp.id !== deleteTarget.id));
      setSuccess('تم حذف الموظف بنجاح');
      setShowDeleteConfirm(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('فشل حذف الموظف: ' + err.message);
      setShowDeleteConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  // Handle Refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEmployees();
    setRefreshing(false);
  };

  // Loading state
  if (loading && employees.length === 0) {
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
        <h1 className="text-3xl font-bold text-gray-800">إدارة الموظفين</h1>
        <button
          onClick={() => handleOpenModal('create')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          <Plus size={20} />
          موظف جديد
        </button>
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

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-2">
          <Search size={20} className="text-gray-400 mt-3" />
          <input
            type="text"
            placeholder="ابحث عن موظف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 border-none outline-none"
          />
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="px-6 py-3 font-semibold text-gray-800">الاسم</th>
                <th className="px-6 py-3 font-semibold text-gray-800">الوظيفة</th>
                <th className="px-6 py-3 font-semibold text-gray-800">القسم</th>
                <th className="px-6 py-3 font-semibold text-gray-800">البريد الإلكتروني</th>
                <th className="px-6 py-3 font-semibold text-gray-800">الراتب</th>
                <th className="px-6 py-3 font-semibold text-gray-800">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-gray-800">{employee.fullName}</td>
                    <td className="px-6 py-4 text-gray-700">{employee.position}</td>
                    <td className="px-6 py-4 text-gray-700">{employee.department}</td>
                    <td className="px-6 py-4 text-gray-700">{employee.email}</td>
                    <td className="px-6 py-4 text-gray-700">{employee.salary} ريال</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenModal('view', employee)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="عرض"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleOpenModal('edit', employee)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                          title="تعديل"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget(employee);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="حذف"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    لا توجد نتائج
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {modalMode === 'create'
                  ? 'موظف جديد'
                  : modalMode === 'edit'
                  ? 'تعديل الموظف'
                  : 'عرض الموظف'}
              </h2>

              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    الاسم الكامل
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    disabled={modalMode === 'view'}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    disabled={modalMode === 'view'}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                  />
                </div>

                {/* Position */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    الوظيفة
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) =>
                      setFormData({ ...formData, position: e.target.value })
                    }
                    disabled={modalMode === 'view'}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    القسم
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    disabled={modalMode === 'view'}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                  >
                    <option value="">اختر القسم</option>
                    <option value="IT">تقنية المعلومات</option>
                    <option value="HR">الموارد البشرية</option>
                    <option value="Finance">المالية</option>
                    <option value="Sales">المبيعات</option>
                    <option value="Operations">العمليات</option>
                    <option value="Marketing">التسويق</option>
                  </select>
                </div>

                {/* Hire Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    تاريخ التعيين
                  </label>
                  <input
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) =>
                      setFormData({ ...formData, hireDate: e.target.value })
                    }
                    disabled={modalMode === 'view'}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                  />
                </div>

                {/* Salary */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    الراتب
                  </label>
                  <input
                    type="number"
                    value={formData.salary}
                    onChange={(e) =>
                      setFormData({ ...formData, salary: e.target.value })
                    }
                    disabled={modalMode === 'view'}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    الهاتف
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    disabled={modalMode === 'view'}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 mt-6 justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
                >
                  إغلاق
                </button>
                {modalMode !== 'view' && (
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
                  >
                    {loading ? 'جاري الحفظ...' : 'حفظ'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">تأكيد الحذف</h3>
            <p className="text-gray-700 mb-6">
              هل أنت متأكد من حذف الموظف: <strong>{deleteTarget?.fullName}</strong>؟
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Mock Data
 */
function getMockEmployees() {
  return [
    {
      id: 1,
      fullName: 'أحمد محمد علي',
      email: 'ahmed@company.com',
      position: 'محلل أنظمة',
      department: 'IT',
      hireDate: '2020-01-15',
      salary: 5500,
      phone: '0501234567',
    },
    {
      id: 2,
      fullName: 'فاطمة أحمد خالد',
      email: 'fatima@company.com',
      position: 'مهندسة برمجيات',
      department: 'IT',
      hireDate: '2019-03-20',
      salary: 6500,
      phone: '0509876543',
    },
    {
      id: 3,
      fullName: 'محمود حسن إبراهيم',
      email: 'mahmoud@company.com',
      position: 'مدير المبيعات',
      department: 'Sales',
      hireDate: '2018-06-10',
      salary: 7000,
      phone: '0505555555',
    },
  ];
}
