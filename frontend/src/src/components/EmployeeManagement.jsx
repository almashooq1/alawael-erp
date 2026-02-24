import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Eye } from 'lucide-react';

/**
 * Employee Management - إدارة الموظفين
 * إنشاء، تعديل، حذف، عرض الموظفين
 */

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
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

  const departments = ['IT', 'HR', 'Finance', 'Sales', 'Operations', 'Marketing'];
  const positions = ['موظف', 'رئيس قسم', 'مدير', 'إدارة عليا'];

  // محاكاة جلب البيانات
  useEffect(() => {
    const mockEmployees = [
      {
        id: 1,
        fullName: 'أحمد محمد',
        email: 'ahmed@example.com',
        position: 'مدير IT',
        department: 'IT',
        hireDate: '2020-01-15',
        salary: 8000,
        phone: '+966501234567',
      },
      {
        id: 2,
        fullName: 'فاطمة علي',
        email: 'fatima@example.com',
        position: 'مسؤول موارد بشرية',
        department: 'HR',
        hireDate: '2019-06-20',
        salary: 6500,
        phone: '+966502345678',
      },
      {
        id: 3,
        fullName: 'محمود حسن',
        email: 'mahmoud@example.com',
        position: 'محاسب',
        department: 'Finance',
        hireDate: '2021-03-10',
        salary: 5500,
        phone: '+966503456789',
      },
    ];
    setEmployees(mockEmployees);
    setFilteredEmployees(mockEmployees);
  }, []);

  // البحث والفلترة
  useEffect(() => {
    const filtered = employees.filter(
      (emp) =>
        emp.fullName.includes(searchTerm) ||
        emp.email.includes(searchTerm) ||
        emp.position.includes(searchTerm)
    );
    setFilteredEmployees(filtered);
  }, [searchTerm, employees]);

  // فتح modal للإنشاء
  const handleCreateNew = () => {
    setModalMode('create');
    setFormData({
      fullName: '',
      email: '',
      position: '',
      department: '',
      hireDate: '',
      salary: '',
      phone: '',
    });
    setShowModal(true);
  };

  // فتح modal للتعديل
  const handleEdit = (employee) => {
    setModalMode('edit');
    setSelectedEmployee(employee);
    setFormData(employee);
    setShowModal(true);
  };

  // فتح modal للعرض
  const handleView = (employee) => {
    setModalMode('view');
    setSelectedEmployee(employee);
    setShowModal(true);
  };

  // حفظ البيانات
  const handleSave = () => {
    if (modalMode === 'create') {
      const newEmployee = {
        id: employees.length + 1,
        ...formData,
      };
      setEmployees([...employees, newEmployee]);
    } else if (modalMode === 'edit') {
      setEmployees(
        employees.map((emp) =>
          emp.id === selectedEmployee.id ? { ...emp, ...formData } : emp
        )
      );
    }
    setShowModal(false);
  };

  // حذف موظف
  const handleDelete = (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الموظف؟')) {
      setEmployees(employees.filter((emp) => emp.id !== id));
    }
  };

  // معالجة تغيير الحقول
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      {/* الرأس */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">إدارة الموظفين</h1>
        <p className="text-slate-600">إدارة بيانات الموظفين والتعاقدات</p>
      </div>

      {/* شريط البحث والإجراءات */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="ابحث عن موظف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={20} />
            موظف جديد
          </button>
        </div>
      </div>

      {/* جدول الموظفين */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100 border-b">
            <tr>
              <th className="text-right py-4 px-6 text-slate-700 font-semibold">الاسم</th>
              <th className="text-right py-4 px-6 text-slate-700 font-semibold">الوظيفة</th>
              <th className="text-right py-4 px-6 text-slate-700 font-semibold">القسم</th>
              <th className="text-right py-4 px-6 text-slate-700 font-semibold">البريد الإلكتروني</th>
              <th className="text-right py-4 px-6 text-slate-700 font-semibold">الراتب</th>
              <th className="text-center py-4 px-6 text-slate-700 font-semibold">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((employee) => (
              <tr key={employee.id} className="border-b hover:bg-slate-50">
                <td className="py-4 px-6 text-slate-900 font-semibold">{employee.fullName}</td>
                <td className="py-4 px-6 text-slate-600">{employee.position}</td>
                <td className="py-4 px-6 text-slate-600">{employee.department}</td>
                <td className="py-4 px-6 text-slate-600">{employee.email}</td>
                <td className="py-4 px-6 text-slate-900 font-semibold">
                  {employee.salary.toLocaleString('ar-EG')} ر.س
                </td>
                <td className="py-4 px-6 text-center">
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => handleView(employee)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded transition"
                      title="عرض"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => handleEdit(employee)}
                      className="p-2 text-green-600 hover:bg-green-100 rounded transition"
                      title="تعديل"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(employee.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded transition"
                      title="حذف"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredEmployees.length === 0 && (
          <div className="text-center py-8 text-slate-500">لا توجد نتائج</div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              {modalMode === 'create'
                ? 'إضافة موظف جديد'
                : modalMode === 'edit'
                ? 'تعديل بيانات الموظف'
                : 'عرض بيانات الموظف'}
            </h2>

            {modalMode !== 'view' ? (
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-2">الاسم الكامل</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-2">البريد الإلكتروني</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-2">الوظيفة</label>
                    <select
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">اختر الوظيفة</option>
                      {positions.map((pos) => (
                        <option key={pos} value={pos}>
                          {pos}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-2">القسم</label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">اختر القسم</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-2">تاريخ التعيين</label>
                    <input
                      type="date"
                      name="hireDate"
                      value={formData.hireDate}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-2">الراتب الأساسي</label>
                    <input
                      type="number"
                      name="salary"
                      value={formData.salary}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-2">رقم الهاتف</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-4 justify-end mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    حفظ
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-600 text-sm">الاسم الكامل</p>
                    <p className="text-slate-900 font-semibold">{formData.fullName}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm">البريد الإلكتروني</p>
                    <p className="text-slate-900 font-semibold">{formData.email}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm">الوظيفة</p>
                    <p className="text-slate-900 font-semibold">{formData.position}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm">القسم</p>
                    <p className="text-slate-900 font-semibold">{formData.department}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm">تاريخ التعيين</p>
                    <p className="text-slate-900 font-semibold">
                      {new Date(formData.hireDate).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 text-sm">الراتب الأساسي</p>
                    <p className="text-slate-900 font-semibold">
                      {formData.salary.toLocaleString('ar-EG')} ر.س
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 justify-end mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
