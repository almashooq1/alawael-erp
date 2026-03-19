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
  Calendar,
  CheckCircle,
  AlertCircle,
  PieChart,
  Download,
  Share2,
  Bell,
  Clock,
  Eye,
  Settings
} from 'lucide-react';
import axios from 'axios';

const ZakatDashboard = () => {
  const API_BASE = '/api/zakat';

  // ============================================================================
  // 🎯 STATE
  // ============================================================================
  const [dashboard, setDashboard] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('year');
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

    const { summary, statusBreakdown } = dashboard;

    return (
      <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8\">\n        {/* الزكاة المستحقة */}\n        <div className=\"bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all\">\n          <div className=\"flex items-start justify-between mb-4\">\n            <div>\n              <p className=\"text-blue-100 text-sm font-semibold\">الزكاة المستحقة</p>\n              <p className=\"text-3xl font-bold mt-2\">\n                {summary.totalZakatDue.toLocaleString(undefined, {\n                  minimumFractionDigits: 0,\n                  maximumFractionDigits: 0\n                })}\n              </p>\n              <p className=\"text-blue-100 text-xs mt-1\">SAR</p>\n            </div>\n            <DollarSign className=\"w-12 h-12 opacity-30\" />\n          </div>\n          <div className=\"w-full bg-blue-400 rounded-full h-2\">\n            <div\n              className=\"bg-white h-2 rounded-full\"\n              style={{ width: `${Math.min(summary.compliancePercentage, 100)}%` }}\n            />\n          </div>\n          <p className=\"text-xs mt-2 text-blue-100\">\n            {summary.compliancePercentage.toFixed(1)}% مدفوعة\n          </p>\n        </div>\n\n        {/* الزكاة المدفوعة */}\n        <div className=\"bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all\">\n          <div className=\"flex items-start justify-between mb-4\">\n            <div>\n              <p className=\"text-green-100 text-sm font-semibold\">الزكاة المدفوعة</p>\n              <p className=\"text-3xl font-bold mt-2\">\n                {summary.totalZakatPaid.toLocaleString(undefined, {\n                  minimumFractionDigits: 0,\n                  maximumFractionDigits: 0\n                })}\n              </p>\n              <p className=\"text-green-100 text-xs mt-1\">SAR</p>\n            </div>\n            <CheckCircle className=\"w-12 h-12 opacity-30\" />\n          </div>\n          <p className=\"text-xs mt-2 text-green-100\">✅ تم السداد</p>\n        </div>\n\n        {/* الزكاة المتبقية */}\n        <div className=\"bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all\">\n          <div className=\"flex items-start justify-between mb-4\">\n            <div>\n              <p className=\"text-orange-100 text-sm font-semibold\">المتبقي</p>\n              <p className=\"text-3xl font-bold mt-2\">\n                {summary.zakatBalance.toLocaleString(undefined, {\n                  minimumFractionDigits: 0,\n                  maximumFractionDigits: 0\n                })}\n              </p>\n              <p className=\"text-orange-100 text-xs mt-1\">SAR</p>\n            </div>\n            <Clock className=\"w-12 h-12 opacity-30\" />\n          </div>\n          <p className=\"text-xs mt-2 text-orange-100\">يجب سداده قريباً</p>\n        </div>\n\n        {/* إجمالي الأصول */}\n        <div className=\"bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all\">\n          <div className=\"flex items-start justify-between mb-4\">\n            <div>\n              <p className=\"text-purple-100 text-sm font-semibold\">إجمالي الأصول</p>\n              <p className=\"text-3xl font-bold mt-2\">\n                {summary.totalAssetsValue.toLocaleString(undefined, {\n                  minimumFractionDigits: 0,\n                  maximumFractionDigits: 0\n                })}\n              </p>\n              <p className=\"text-purple-100 text-xs mt-1\">SAR</p>\n            </div>\n            <TrendingUp className=\"w-12 h-12 opacity-30\" />\n          </div>\n          <p className=\"text-xs mt-2 text-purple-100\">📊 القيمة الكلية</p>\n        </div>\n      </div>\n    );\n  };\n\n  // === STATUS BREAKDOWN ===\n  const StatusBreakdown = () => {\n    if (!dashboard) return null;\n\n    const { statusBreakdown } = dashboard;\n    const total = Object.values(statusBreakdown).reduce((a, b) => a + b, 0);\n\n    return (\n      <div className=\"bg-white rounded-xl shadow-lg p-6 mb-8\">\n        <h2 className=\"text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2\">\n          <BarChart3 className=\"w-6 h-6 text-indigo-600\" />\n          حالة الحسابات\n        </h2>\n\n        <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4\">\n          {[\n            { key: 'PENDING', label: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },\n            { key: 'PARTIALLY_PAID', label: 'مدفوع جزئياً', color: 'bg-blue-100 text-blue-700', icon: '📊' },\n            { key: 'FULLY_PAID', label: 'مدفوع بالكامل', color: 'bg-green-100 text-green-700', icon: '✅' },\n            { key: 'OVERDUE', label: 'متأخر', color: 'bg-red-100 text-red-700', icon: '⚠️' }\n          ].map((status) => (\n            <div key={status.key} className={`${status.color} rounded-lg p-4 text-center`}>\n              <p className=\"text-2xl mb-2\">{status.icon}</p>\n              <p className=\"font-bold text-lg\">{statusBreakdown[status.key] || 0}</p>\n              <p className=\"text-sm mt-1\">{status.label}</p>\n            </div>\n          ))}\n        </div>\n      </div>\n    );\n  };\n\n  // === REMINDERS SECTION ===\n  const RemindersSection = () => (\n    <div className=\"bg-white rounded-xl shadow-lg p-6 mb-8\">\n      <h2 className=\"text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2\">\n        <Bell className=\"w-6 h-6 text-red-600\" />\n        التذكيرات النشطة ({reminders.length})\n      </h2>\n\n      {reminders.length === 0 ? (\n        <div className=\"text-center py-8 text-gray-500\">\n          <CheckCircle className=\"w-12 h-12 mx-auto mb-3 opacity-50\" />\n          <p>لا توجد تذكيرات نشطة</p>\n        </div>\n      ) : (\n        <div className=\"space-y-3\">\n          {reminders.map((reminder) => (\n            <div key={reminder._id} className=\"bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 rounded-lg p-4\">\n              <div className=\"flex items-start justify-between\">\n                <div>\n                  <p className=\"font-bold text-red-800\">{reminder.title}</p>\n                  <p className=\"text-gray-700 mt-1\">{reminder.message}</p>\n                  {reminder.zakatAmount && (\n                    <p className=\"text-sm text-red-600 mt-2 font-semibold\">\n                      المبلغ: {reminder.zakatAmount.toLocaleString()} SAR\n                    </p>\n                  )}\n                </div>\n                <span className=\"text-2xl\">{getReminder TypeIcon(reminder.reminderType)}</span>\n              </div>\n            </div>\n          ))}\n        </div>\n      )}\n    </div>\n  );\n\n  // === RECENT PAYMENTS ===\n  const RecentPayments = () => {\n    if (!dashboard || !dashboard.recentPayments) return null;\n\n    return (\n      <div className=\"bg-white rounded-xl shadow-lg p-6 mb-8\">\n        <h2 className=\"text-2xl font-bold text-gray-800 mb-6\">آخر الدفعات</h2>\n\n        {dashboard.recentPayments.length === 0 ? (\n          <div className=\"text-center py-8 text-gray-500\">\n            <p>لم تسجل أي دفعات حتى الآن</p>\n          </div>\n        ) : (\n          <div className=\"overflow-x-auto\">\n            <table className=\"w-full\">\n              <thead className=\"bg-gray-100 border-b-2\">\n                <tr>\n                  <th className=\"px-6 py-3 text-right font-semibold text-gray-700\">التاريخ</th>\n                  <th className=\"px-6 py-3 text-right font-semibold text-gray-700\">المبلغ</th>\n                  <th className=\"px-6 py-3 text-right font-semibold text-gray-700\">الجهة المستقبلة</th>\n                  <th className=\"px-6 py-3 text-right font-semibold text-gray-700\">الطريقة</th>\n                </tr>\n              </thead>\n              <tbody>\n                {dashboard.recentPayments.map((payment) => (\n                  <tr key={payment._id} className=\"border-b hover:bg-gray-50\">\n                    <td className=\"px-6 py-3 text-gray-700\">\n                      {new Date(payment.paymentDate).toLocaleDateString('ar-SA')}\n                    </td>\n                    <td className=\"px-6 py-3 font-bold text-green-600\">\n                      {payment.amount.toLocaleString()} SAR\n                    </td>\n                    <td className=\"px-6 py-3 text-gray-700\">{payment.recipientName}</td>\n                    <td className=\"px-6 py-3 text-gray-700\">{payment.paymentMethod}</td>\n                  </tr>\n                ))}\n              </tbody>\n            </table>\n          </div>\n        )}\n      </div>\n    );\n  };\n\n  // === ACTIONS ===\n  const ActionsBar = () => (\n    <div className=\"bg-white rounded-xl shadow-lg p-6 mb-8 flex flex-col md:flex-row gap-4\">\n      <button\n        onClick={() => setShowPaymentModal(true)}\n        className=\"flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2\"\n      >\n        <DollarSign className=\"w-5 h-5\" />\n        تسجيل دفعة جديدة\n      </button>\n\n      <button\n        onClick={generateReport}\n        className=\"flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2\"\n      >\n        <Download className=\"w-5 h-5\" />\n        تحميل التقرير\n      </button>\n\n      <button\n        className=\"flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2\"\n      >\n        <Share2 className=\"w-5 h-5\" />\n        مشاركة\n      </button>\n    </div>\n  );\n\n  // ============================================================================\n  // 🎨 PAYMENT MODAL\n  // ============================================================================\n\n  const PaymentModal = () => {\n    if (!showPaymentModal) return null;\n\n    return (\n      <div className=\"fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4\">\n        <div className=\"bg-white rounded-xl shadow-2xl max-w-md w-full\">\n          <div className=\"bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6\">\n            <h2 className=\"text-2xl font-bold\">تسجيل دفعة زكاة</h2>\n          </div>\n\n          <div className=\"p-6 space-y-4\">\n            <div>\n              <label className=\"block text-sm font-semibold text-gray-700 mb-2\">المبلغ (SAR) *</label>\n              <input\n                type=\"number\"\n                value={paymentData.amount}\n                onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) })}\n                className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500\"\n                placeholder=\"أدخل المبلغ\"\n              />\n            </div>\n\n            <div>\n              <label className=\"block text-sm font-semibold text-gray-700 mb-2\">طريقة الدفع *</label>\n              <select\n                value={paymentData.paymentMethod}\n                onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}\n                className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500\"\n              >\n                <option value=\"BANK_TRANSFER\">تحويل بنكي</option>\n                <option value=\"CASH\">نقداً</option>\n                <option value=\"CHECK\">شيك</option>\n                <option value=\"CREDIT_CARD\">بطاقة ائتمان</option>\n              </select>\n            </div>\n\n            <div>\n              <label className=\"block text-sm font-semibold text-gray-700 mb-2\">نوع الجهة المستقبلة *</label>\n              <select\n                value={paymentData.recipientType}\n                onChange={(e) => setPaymentData({ ...paymentData, recipientType: e.target.value })}\n                className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500\"\n              >\n                <option value=\"CHARITY_ORG\">منظمة خيرية</option>\n                <option value=\"MOSQUE\">مسجد</option>\n                <option value=\"SCHOOL\">مدرسة</option>\n                <option value=\"HOSPITAL\">مستشفى</option>\n                <option value=\"INDIVIDUAL\">فرد</option>\n              </select>\n            </div>\n\n            <div>\n              <label className=\"block text-sm font-semibold text-gray-700 mb-2\">اسم الجهة *</label>\n              <input\n                type=\"text\"\n                value={paymentData.recipientName}\n                onChange={(e) => setPaymentData({ ...paymentData, recipientName: e.target.value })}\n                className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500\"\n                placeholder=\"أدخل اسم الجهة\"\n              />\n            </div>\n\n            <div>\n              <label className=\"block text-sm font-semibold text-gray-700 mb-2\">جهة الاتصال</label>\n              <input\n                type=\"text\"\n                value={paymentData.recipientContact}\n                onChange={(e) => setPaymentData({ ...paymentData, recipientContact: e.target.value })}\n                className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500\"\n                placeholder=\"رقم الهاتف أو البريد الإلكتروني\"\n              />\n            </div>\n          </div>\n\n          <div className=\"bg-gray-100 px-6 py-4 flex gap-3\">\n            <button\n              onClick={recordPayment}\n              disabled={loading}\n              className=\"flex-1 bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50\"\n            >\n              تسجيل الدفعة\n            </button>\n            <button\n              onClick={() => setShowPaymentModal(false)}\n              className=\"flex-1 bg-gray-300 text-gray-800 font-bold py-2 rounded-lg hover:bg-gray-400 transition-colors\"\n            >\n              إلغاء\n            </button>\n          </div>\n        </div>\n      </div>\n    );\n  };\n\n  // ============================================================================\n  // 🛠️ HELPER FUNCTIONS\n  // ============================================================================\n\n  const getReminderTypeIcon = (type) => {\n    const icons = {\n      NISAB_REACHED: '✨',\n      YEAR_APPROACHING: '📅',\n      OVERDUE: '⚠️',\n      FIRST_REMINDER: '🔔',\n      FINAL_REMINDER: '🚨'\n    };\n    return icons[type] || '📌';\n  };\n\n  // ============================================================================\n  // 📤 MAIN RENDER\n  // ============================================================================\n\n  if (loading) {\n    return (\n      <div className=\"min-h-screen bg-gray-100 flex items-center justify-center\">\n        <div className=\"text-center\">\n          <div className=\"animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4\"></div>\n          <p className=\"text-gray-600\">جاري تحميل البيانات...</p>\n        </div>\n      </div>\n    );\n  }\n\n  return (\n    <div className=\"min-h-screen bg-gray-100 p-6 rtl\">\n      <div className=\"max-w-7xl mx-auto\">\n        {/* HEADER */}\n        <div className=\"mb-8\">\n          <h1 className=\"text-4xl font-bold text-gray-800 mb-2\">📊 لوحة تحكم الزكاة</h1>\n          <p className=\"text-gray-600 text-lg\">نظام متقدم لإدارة والتحكم في حساباتك الزكاة</p>\n        </div>\n\n        {/* SUMMARY CARDS */}\n        <SummaryCards />\n\n        {/* STATUS BREAKDOWN */}\n        <StatusBreakdown />\n\n        {/* ACTIONS BAR */}\n        <ActionsBar />\n\n        {/* REMINDERS SECTION */}\n        <RemindersSection />\n\n        {/* RECENT PAYMENTS */}\n        <RecentPayments />\n      </div>\n\n      {/* PAYMENT MODAL */}\n      <PaymentModal />\n    </div>\n  );\n};\n\nexport default ZakatDashboard;
