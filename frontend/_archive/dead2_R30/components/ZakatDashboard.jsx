/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║            🎛️ ZAKAT DASHBOARD - ADVANCED ANALYTICS & REPORTING                ║
 * ║                     لوحة تحكم الزكاة المتقدمة والتحليلات                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Download,
  Share2,
  Bell,
  Clock
} from 'lucide-react';
import axios from 'axios';

const ZakatDashboard = () => {
  const API_BASE = '/api/zakat';

  // ============================================================================
  // 🎯 STATE
  // ============================================================================
  const [dashboard, setDashboard] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [_payments, _setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [_selectedPeriod, _setSelectedPeriod] = useState('year');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentMethod: 'BANK_TRANSFER',
    recipientType: 'CHARITY_ORG',
    recipientName: '',
    recipientContact: ''
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  // ============================================================================
  // 📊 API CALLS
  // ============================================================================

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashRes, remRes] = await Promise.all([
        axios.get(`${API_BASE}/dashboard`),
        axios.get(`${API_BASE}/reminders?isRead=false`)
      ]);

      setDashboard(dashRes.data.data);
      setReminders(remRes.data.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const recordPayment = async () => {
    try {
      await axios.post(`${API_BASE}/payments`, paymentData);
      setShowPaymentModal(false);
      loadDashboard();
    } catch (error) {
      console.error('Error recording payment:', error);
    }
  };

  const generateReport = async () => {
    try {
      const response = await axios.post(`${API_BASE}/reports/generate`, {
        reportType: 'ANNUAL'
      });

      // إرسال لتحميل PDF
      const link = document.createElement('a');
      link.href = response.data.documentUrl;
      link.download = 'zakat_report.pdf';
      link.click();
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  // ============================================================================
  // 🎨 DASHBOARD COMPONENTS
  // ============================================================================

  // === SUMMARY CARDS ===
  const SummaryCards = () => {
    if (!dashboard) return null;

    const { summary, _statusBreakdown } = dashboard;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* الزكاة المستحقة */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-blue-100 text-sm font-semibold">الزكاة المستحقة</p>
              <p className="text-3xl font-bold mt-2">
                {summary.totalZakatDue.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </p>
              <p className="text-blue-100 text-xs mt-1">SAR</p>
            </div>
            <DollarSign className="w-12 h-12 opacity-30" />
          </div>
          <div className="w-full bg-blue-400 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full"
              style={{ width: `${Math.min(summary.compliancePercentage, 100)}%` }}
            />
          </div>
          <p className="text-xs mt-2 text-blue-100">
            {summary.compliancePercentage.toFixed(1)}% مدفوعة
          </p>
        </div>

        {/* الزكاة المدفوعة */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-green-100 text-sm font-semibold">الزكاة المدفوعة</p>
              <p className="text-3xl font-bold mt-2">
                {summary.totalZakatPaid.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </p>
              <p className="text-green-100 text-xs mt-1">SAR</p>
            </div>
            <CheckCircle className="w-12 h-12 opacity-30" />
          </div>
          <p className="text-xs mt-2 text-green-100">✅ تم السداد</p>
        </div>

        {/* الزكاة المتبقية */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-orange-100 text-sm font-semibold">المتبقي</p>
              <p className="text-3xl font-bold mt-2">
                {summary.zakatBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </p>
              <p className="text-orange-100 text-xs mt-1">SAR</p>
            </div>
            <Clock className="w-12 h-12 opacity-30" />
          </div>
          <p className="text-xs mt-2 text-orange-100">يجب سداده قريباً</p>
        </div>

        {/* إجمالي الأصول */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-purple-100 text-sm font-semibold">إجمالي الأصول</p>
              <p className="text-3xl font-bold mt-2">
                {summary.totalAssetsValue.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </p>
              <p className="text-purple-100 text-xs mt-1">SAR</p>
            </div>
            <TrendingUp className="w-12 h-12 opacity-30" />
          </div>
          <p className="text-xs mt-2 text-purple-100">📊 القيمة الكلية</p>
        </div>
      </div>
    );
  };

  // === STATUS BREAKDOWN ===
  const StatusBreakdown = () => {
    if (!dashboard) return null;

    const { statusBreakdown } = dashboard;
    const _total = Object.values(statusBreakdown).reduce((a, b) => a + b, 0);

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-600" />
          حالة الحسابات
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: 'PENDING', label: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
            { key: 'PARTIALLY_PAID', label: 'مدفوع جزئياً', color: 'bg-blue-100 text-blue-700', icon: '📊' },
            { key: 'FULLY_PAID', label: 'مدفوع بالكامل', color: 'bg-green-100 text-green-700', icon: '✅' },
            { key: 'OVERDUE', label: 'متأخر', color: 'bg-red-100 text-red-700', icon: '⚠️' }
          ].map((status) => (
            <div key={status.key} className={`${status.color} rounded-lg p-4 text-center`}>
              <p className="text-2xl mb-2">{status.icon}</p>
              <p className="font-bold text-lg">{statusBreakdown[status.key] || 0}</p>
              <p className="text-sm mt-1">{status.label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // === REMINDERS SECTION ===
  const RemindersSection = () => (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Bell className="w-6 h-6 text-red-600" />
        التذكيرات النشطة ({reminders.length})
      </h2>

      {reminders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>لا توجد تذكيرات نشطة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <div key={reminder._id} className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-red-800">{reminder.title}</p>
                  <p className="text-gray-700 mt-1">{reminder.message}</p>
                  {reminder.zakatAmount && (
                    <p className="text-sm text-red-600 mt-2 font-semibold">
                      المبلغ: {reminder.zakatAmount.toLocaleString()} SAR
                    </p>
                  )}
                </div>
                <span className="text-2xl">{getReminderTypeIcon(reminder.reminderType)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // === RECENT PAYMENTS ===
  const RecentPayments = () => {
    if (!dashboard || !dashboard.recentPayments) return null;

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">آخر الدفعات</h2>

        {dashboard.recentPayments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>لم تسجل أي دفعات حتى الآن</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2">
                <tr>
                  <th className="px-6 py-3 text-right font-semibold text-gray-700">التاريخ</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-700">المبلغ</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-700">الجهة المستقبلة</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-700">الطريقة</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentPayments.map((payment) => (
                  <tr key={payment._id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-700">
                      {new Date(payment.paymentDate).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="px-6 py-3 font-bold text-green-600">
                      {payment.amount.toLocaleString()} SAR
                    </td>
                    <td className="px-6 py-3 text-gray-700">{payment.recipientName}</td>
                    <td className="px-6 py-3 text-gray-700">{payment.paymentMethod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // === ACTIONS ===
  const ActionsBar = () => (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8 flex flex-col md:flex-row gap-4">
      <button
        onClick={() => setShowPaymentModal(true)}
        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
      >
        <DollarSign className="w-5 h-5" />
        تسجيل دفعة جديدة
      </button>

      <button
        onClick={generateReport}
        className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
      >
        <Download className="w-5 h-5" />
        تحميل التقرير
      </button>

      <button
        className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
      >
        <Share2 className="w-5 h-5" />
        مشاركة
      </button>
    </div>
  );

  // ============================================================================
  // 🎨 PAYMENT MODAL
  // ============================================================================

  const PaymentModal = () => {
    if (!showPaymentModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
            <h2 className="text-2xl font-bold">تسجيل دفعة زكاة</h2>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">المبلغ (SAR) *</label>
              <input
                type="number"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="أدخل المبلغ"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">طريقة الدفع *</label>
              <select
                value={paymentData.paymentMethod}
                onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="BANK_TRANSFER">تحويل بنكي</option>
                <option value="CASH">نقداً</option>
                <option value="CHECK">شيك</option>
                <option value="CREDIT_CARD">بطاقة ائتمان</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">نوع الجهة المستقبلة *</label>
              <select
                value={paymentData.recipientType}
                onChange={(e) => setPaymentData({ ...paymentData, recipientType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="CHARITY_ORG">منظمة خيرية</option>
                <option value="MOSQUE">مسجد</option>
                <option value="SCHOOL">مدرسة</option>
                <option value="HOSPITAL">مستشفى</option>
                <option value="INDIVIDUAL">فرد</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">اسم الجهة *</label>
              <input
                type="text"
                value={paymentData.recipientName}
                onChange={(e) => setPaymentData({ ...paymentData, recipientName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="أدخل اسم الجهة"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">جهة الاتصال</label>
              <input
                type="text"
                value={paymentData.recipientContact}
                onChange={(e) => setPaymentData({ ...paymentData, recipientContact: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="رقم الهاتف أو البريد الإلكتروني"
              />
            </div>
          </div>

          <div className="bg-gray-100 px-6 py-4 flex gap-3">
            <button
              onClick={recordPayment}
              disabled={loading}
              className="flex-1 bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              تسجيل الدفعة
            </button>
            <button
              onClick={() => setShowPaymentModal(false)}
              className="flex-1 bg-gray-300 text-gray-800 font-bold py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // 🛠️ HELPER FUNCTIONS
  // ============================================================================

  const getReminderTypeIcon = (type) => {
    const icons = {
      NISAB_REACHED: '✨',
      YEAR_APPROACHING: '📅',
      OVERDUE: '⚠️',
      FIRST_REMINDER: '🔔',
      FINAL_REMINDER: '🚨'
    };
    return icons[type] || '📌';
  };

  // ============================================================================
  // 📤 MAIN RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 rtl">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">📊 لوحة تحكم الزكاة</h1>
          <p className="text-gray-600 text-lg">نظام متقدم لإدارة والتحكم في حساباتك الزكاة</p>
        </div>

        {/* SUMMARY CARDS */}
        <SummaryCards />

        {/* STATUS BREAKDOWN */}
        <StatusBreakdown />

        {/* ACTIONS BAR */}
        <ActionsBar />

        {/* REMINDERS SECTION */}
        <RemindersSection />

        {/* RECENT PAYMENTS */}
        <RecentPayments />
      </div>

      {/* PAYMENT MODAL */}
      <PaymentModal />
    </div>
  );
};

export default ZakatDashboard;
