import React, { useState, useEffect } from 'react';
import { Download, Filter, Calculator } from 'lucide-react';

/**
 * Payroll Management - إدارة الرواتب
 * حساب، معالجة، وتحويل الرواتب
 */

const PayrollManagement = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showCalculator, setShowCalculator] = useState(false);
  const [totalPayroll, setTotalPayroll] = useState(0);

  useEffect(() => {
    // محاكاة جلب بيانات الرواتب
    const mockPayrolls = [
      {
        id: 1,
        employeeName: 'أحمد محمد',
        position: 'مدير IT',
        salary: 8000,
        allowances: 2500,
        deductions: 1500,
        netSalary: 9000,
        status: 'تم الدفع',
        paymentDate: '2026-02-01',
      },
      {
        id: 2,
        employeeName: 'فاطمة علي',
        position: 'مسؤول HR',
        salary: 6500,
        allowances: 1500,
        deductions: 1000,
        netSalary: 7000,
        status: 'تم الدفع',
        paymentDate: '2026-02-01',
      },
      {
        id: 3,
        employeeName: 'محمود حسن',
        position: 'محاسب',
        salary: 5500,
        allowances: 1000,
        deductions: 800,
        netSalary: 5700,
        status: 'معلق',
        paymentDate: null,
      },
    ];
    setPayrolls(mockPayrolls);
    setTotalPayroll(mockPayrolls.reduce((sum, p) => sum + p.netSalary, 0));
  }, [selectedMonth]);

  const handleProcessPayroll = () => {
    if (window.confirm('هل أنت متأكد من معالجة الرواتب للشهر الحالي؟')) {
      const updated = payrolls.map((p) => ({
        ...p,
        status: 'تم الدفع',
        paymentDate: new Date().toISOString().slice(0, 10),
      }));
      setPayrolls(updated);
      setTotalPayroll(updated.reduce((sum, p) => sum + p.netSalary, 0));
      alert('تم معالجة الرواتب بنجاح');
    }
  };

  const handleExportPayroll = () => {
    const csv = [
      ['اسم الموظف', 'الوظيفة', 'الراتب الأساسي', 'المزايا', 'الخصومات', 'الراتب النهائي', 'الحالة'],
      ...payrolls.map((p) => [
        p.employeeName,
        p.position,
        p.salary,
        p.allowances,
        p.deductions,
        p.netSalary,
        p.status,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${selectedMonth}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      {/* الرأس */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">إدارة الرواتب</h1>
        <p className="text-slate-600">معالجة وتحويل رواتب الموظفين</p>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="إجمالي الرواتب"
          value={totalPayroll.toLocaleString('ar-EG')}
          unit="ر.س"
          color="bg-blue-50"
        />
        <StatCard
          title="عدد الموظفين"
          value={payrolls.length}
          unit="موظف"
          color="bg-green-50"
        />
        <StatCard
          title="معدل الخصومات"
          value="15%"
          unit="من الراتب"
          color="bg-red-50"
        />
      </div>

      {/* شريط التصفية والإجراءات */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-slate-600" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleProcessPayroll}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
            >
              <Calculator size={20} />
              معالجة الرواتب
            </button>
            <button
              onClick={handleExportPayroll}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Download size={20} />
              تصدير Excel
            </button>
          </div>
        </div>
      </div>

      {/* جدول الرواتب */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100 border-b">
            <tr>
              <th className="text-right py-4 px-6 text-slate-700 font-semibold">اسم الموظف</th>
              <th className="text-right py-4 px-6 text-slate-700 font-semibold">الوظيفة</th>
              <th className="text-center py-4 px-6 text-slate-700 font-semibold">الراتب الأساسي</th>
              <th className="text-center py-4 px-6 text-slate-700 font-semibold">المزايا</th>
              <th className="text-center py-4 px-6 text-slate-700 font-semibold">الخصومات</th>
              <th className="text-center py-4 px-6 text-slate-700 font-semibold">الراتب النهائي</th>
              <th className="text-center py-4 px-6 text-slate-700 font-semibold">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {payrolls.map((payroll) => (
              <tr key={payroll.id} className="border-b hover:bg-slate-50">
                <td className="py-4 px-6 text-slate-900 font-semibold">{payroll.employeeName}</td>
                <td className="py-4 px-6 text-slate-600">{payroll.position}</td>
                <td className="py-4 px-6 text-center text-slate-900">
                  {payroll.salary.toLocaleString('ar-EG')} ر.س
                </td>
                <td className="py-4 px-6 text-center text-green-600">
                  +{payroll.allowances.toLocaleString('ar-EG')}
                </td>
                <td className="py-4 px-6 text-center text-red-600">
                  -{payroll.deductions.toLocaleString('ar-EG')}
                </td>
                <td className="py-4 px-6 text-center font-bold text-slate-900">
                  {payroll.netSalary.toLocaleString('ar-EG')} ر.س
                </td>
                <td className="py-4 px-6 text-center">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      payroll.status === 'تم الدفع'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {payroll.status}
                  </span>
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-bold">
              <td colSpan="5" className="py-4 px-6 text-slate-900 text-center">
                إجمالي الرواتب
              </td>
              <td className="py-4 px-6 text-center text-blue-600">
                {totalPayroll.toLocaleString('ar-EG')} ر.س
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* معلومات إضافية */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4">توزيع الرواتب</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">الرواتب الأساسية</span>
              <span className="text-slate-900 font-bold">22,000 ر.س</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '73%' }}></div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">المزايا والبدلات</span>
              <span className="text-slate-900 font-bold">5,000 ر.س</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '17%' }}></div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">الخصومات</span>
              <span className="text-slate-900 font-bold">3,300 ر.س</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div className="bg-red-600 h-2 rounded-full" style={{ width: '11%' }}></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4">تقرير الدفع</h3>
          <div className="space-y-3 text-slate-600">
            <div className="flex justify-between">
              <span>المبلغ المدفوع:</span>
              <span className="font-bold text-green-600">17,700 ر.س</span>
            </div>
            <div className="flex justify-between">
              <span>المبلغ المعلق:</span>
              <span className="font-bold text-yellow-600">5,700 ر.س</span>
            </div>
            <div className="flex justify-between">
              <span>النسبة المئوية للدفع:</span>
              <span className="font-bold text-blue-600">75.6%</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span>آخر تحديث:</span>
              <span className="font-bold">{new Date().toLocaleDateString('ar-EG')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, unit, color }) => (
  <div className={`${color} rounded-lg shadow-md p-6 border border-slate-200`}>
    <h3 className="text-slate-600 font-semibold mb-2">{title}</h3>
    <div className="text-3xl font-bold text-slate-900">{value}</div>
    <p className="text-sm text-slate-500 mt-2">{unit}</p>
  </div>
);

export default PayrollManagement;
