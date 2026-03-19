/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║            🕌 INTELLIGENT ZAKAT CALCULATOR - REACT COMPONENT                  ║
 * ║                    مكون حاسبة الزكاة الذكية في React                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import React, { useState, useEffect } from 'react';
import {
  Calculator,
  PlusCircle,
  Trash2,
  Save,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  DollarSign,
  Coins,
  Home,
  BarChart3,
  Bell,
  Eye,
  EyeOff
} from 'lucide-react';
import axios from 'axios';

/**
 * === INTELLIGENT ZAKAT CALCULATOR COMPONENT ===
 * مكون حاسبة الزكاة الذكية والمتقدمة
 */
const IntelligentZakatCalculator = () => {
  const API_BASE = '/api/zakat';

  // ============================================================================
  // 🎯 STATE MANAGEMENT
  // ============================================================================

  const [activeTab, setActiveTab] = useState('calculator');
  const [assets, setAssets] = useState([]);
  const [calculations, setCalculations] = useState(null);
  const [zakatResult, setZakatResult] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCalculation, setSelectedCalculation] = useState(null);

  // نموذج إضافة أصل جديد
  const [newAsset, setNewAsset] = useState({
    type: 'CASH',
    name: '',
    amount: 0,
    currency: 'SAR',
    quantity: 0,
    unit: 'grams',
    currentPrice: 0,
    description: ''
  });

  // تحميل البيانات الأولية
  useEffect(() => {
    loadDashboard();
    loadReminders();
  }, []);

  // ============================================================================
  // 📊 API CALLS
  // ============================================================================

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/dashboard`);
      setDashboard(response.data.data);
      setError(null);
    } catch (err) {
      setError('فشل تحميل لوحة التحكم');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadReminders = async () => {
    try {
      const response = await axios.get(`${API_BASE}/reminders`);
      setReminders(response.data.data);
    } catch (err) {
      console.error('Error loading reminders:', err);
    }
  };

  const calculateZakat = async (assetsToCalculate) => {
    try {
      setLoading(true);
      const payload = {
        assets: assetsToCalculate.filter(a => a.amount > 0 || a.quantity > 0),
        jahriYear: new Date().getFullYear() + 579
      };

      const response = await axios.post(`${API_BASE}/calculate`, payload);
      setZakatResult(response.data.data);
      setSuccess('تم حساب الزكاة بنجاح');
      setTimeout(() => setSuccess(null), 3000);
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في الحساب');
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const addAsset = () => {
    if (!newAsset.name.trim()) {
      setError('يجب إدخال اسم الأصل');
      return;
    }

    if (newAsset.amount <= 0 && newAsset.quantity <= 0) {
      setError('يجب إدخال قيمة أو كمية');
      return;
    }

    setAssets([...assets, { ...newAsset, id: Date.now() }]);
    setNewAsset({
      type: 'CASH',
      name: '',
      amount: 0,
      currency: 'SAR',
      quantity: 0,
      unit: 'grams',
      currentPrice: 0,
      description: ''
    });
    setError(null);
  };

  const removeAsset = (id) => {
    setAssets(assets.filter(a => a.id !== id));
  };

  const recordPayment = async (paymentData) => {
    try {
      setLoading(true);
      await axios.post(`${API_BASE}/payments`, {
        calculationId: selectedCalculation,
        ...paymentData
      });
      setSuccess('تم تسجيل الدفعة بنجاح');
      loadDashboard();
      setShowPaymentModal(false);
    } catch (err) {
      setError('فشل تسجيل الدفعة');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // 🎨 UI COMPONENTS
  // ============================================================================

  // === ASSET INPUT FORM ===
  const AssetForm = () => (
    <div className=\"bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6 border-2 border-indigo-200\">
      <h3 className=\"text-xl font-bold text-gray-800 mb-4 flex items-center gap-2\">
        <PlusCircle className=\"w-6 h-6 text-indigo-600\" />
        إضافة أصل جديد
      </h3>

      <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4\">
        {/* نوع الأصل */}
        <div>
          <label className=\"block text-sm font-semibold text-gray-700 mb-2\">
            نوع الأصل *
          </label>
          <select
            value={newAsset.type}
            onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value })}
            className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500\"
          >
            <option value=\"CASH\">💰 النقود</option>
            <option value=\"GOLD\">✨ الذهب</option>
            <option value=\"SILVER\">🔗 الفضة</option>
            <option value=\"BUSINESS_INVENTORY\">🏪 الأصول التجارية</option>
            <option value=\"LIVESTOCK_CAMELS\">🐫 الإبل</option>
            <option value=\"LIVESTOCK_CATTLE\">🐄 الأبقار</option>\n            <option value=\"LIVESTOCK_SHEEP_GOATS\">🐑 الضأن والماعز</option>
            <option value=\"CROPS_GRAINS\">🌾 الحبوب</option>
            <option value=\"FINANCIAL_ASSETS\">📊 الأصول المالية</option>
          </select>
        </div>

        {/* اسم الأصل */}
        <div>
          <label className=\"block text-sm font-semibold text-gray-700 mb-2\">
            اسم الأصل *
          </label>
          <input
            type=\"text\"
            value={newAsset.name}
            onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
            placeholder=\"مثال: حسابي البنكي\"
            className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500\"
          />
        </div>

        {/* المبلغ */}
        <div>
          <label className=\"block text-sm font-semibold text-gray-700 mb-2\">
            المبلغ (SAR)
          </label>
          <input
            type=\"number\"
            value={newAsset.amount}
            onChange={(e) => setNewAsset({ ...newAsset, amount: parseFloat(e.target.value) })}
            placeholder=\"أدخل المبلغ\"
            className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500\"
          />
        </div>

        {/* الكمية */}
        <div>
          <label className=\"block text-sm font-semibold text-gray-700 mb-2\">
            الكمية
          </label>
          <input
            type=\"number\"
            value={newAsset.quantity}
            onChange={(e) => setNewAsset({ ...newAsset, quantity: parseFloat(e.target.value) })}
            placeholder=\"كم جرام؟\"
            className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500\"
          />
        </div>

        {/* الوحدة */}
        <div>
          <label className=\"block text-sm font-semibold text-gray-700 mb-2\">
            الوحدة
          </label>
          <select
            value={newAsset.unit}
            onChange={(e) => setNewAsset({ ...newAsset, unit: e.target.value })}
            className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500\"
          >
            <option value=\"grams\">جرام</option>
            <option value=\"kg\">كيلوجرام</option>\n            <option value=\"pieces\">قطعة</option>\n          </select>
        </div>

        {/* السعر الحالي */}
        <div>
          <label className=\"block text-sm font-semibold text-gray-700 mb-2\">
            السعر الحالي
          </label>
          <input
            type=\"number\"
            value={newAsset.currentPrice}\n            onChange={(e) => setNewAsset({ ...newAsset, currentPrice: parseFloat(e.target.value) })}\n            placeholder=\"السعر\"\n            className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500\"\n          />\n        </div>\n      </div>\n\n      {/* الوصف */}\n      <div className=\"mt-4\">\n        <label className=\"block text-sm font-semibold text-gray-700 mb-2\">\n          الوصف (اختياري)\n        </label>\n        <textarea\n          value={newAsset.description}\n          onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}\n          placeholder=\"أضف ملاحظات عن الأصل\"\n          className=\"w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500\"\n          rows=\"2\"\n        />\n      </div>\n\n      {/* زر الإضافة */}\n      <button\n        onClick={addAsset}\n        disabled={loading}\n        className=\"w-full mt-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50\"\n      >\n        <PlusCircle className=\"w-5 h-5 inline-block mr-2\" />\n        إضافة الأصل\n      </button>\n    </div>\n  );\n\n  // === ASSETS LIST ===\n  const AssetsList = () => (\n    <div className=\"bg-white rounded-lg shadow-lg overflow-hidden\">\n      <div className=\"bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-4\">\n        <h3 className=\"text-lg font-bold\">📋 الأصول المضافة ({assets.length})</h3>\n      </div>\n\n      {assets.length === 0 ? (\n        <div className=\"p-8 text-center text-gray-500\">\n          <AlertCircle className=\"w-12 h-12 mx-auto mb-3 opacity-50\" />\n          <p>لم تضف أي أصول حتى الآن</p>\n        </div>\n      ) : (\n        <div className=\"overflow-x-auto\">\n          <table className=\"w-full\">\n            <thead className=\"bg-gray-100 border-b-2 border-gray-300\">\n              <tr>\n                <th className=\"px-6 py-3 text-right font-semibold text-gray-700\">الاسم</th>\n                <th className=\"px-6 py-3 text-right font-semibold text-gray-700\">النوع</th>\n                <th className=\"px-6 py-3 text-right font-semibold text-gray-700\">المبلغ</th>\n                <th className=\"px-6 py-3 text-right font-semibold text-gray-700\">الكمية</th>\n                <th className=\"px-6 py-3 text-center font-semibold text-gray-700\">الإجراء</th>\n              </tr>\n            </thead>\n            <tbody>\n              {assets.map((asset) => (\n                <tr key={asset.id} className=\"border-b hover:bg-gray-50\">\n                  <td className=\"px-6 py-3 font-medium text-gray-800\">{asset.name}</td>\n                  <td className=\"px-6 py-3 text-gray-600\">{asset.type}</td>\n                  <td className=\"px-6 py-3 font-semibold text-indigo-600\">\n                    {asset.amount ? `${asset.amount.toLocaleString()} SAR` : '-'}\n                  </td>\n                  <td className=\"px-6 py-3 text-gray-600\">\n                    {asset.quantity ? `${asset.quantity} ${asset.unit}` : '-'}\n                  </td>\n                  <td className=\"px-6 py-3 text-center\">\n                    <button\n                      onClick={() => removeAsset(asset.id)}\n                      className=\"text-red-600 hover:text-red-800 transition-colors\"\n                    >\n                      <Trash2 className=\"w-5 h-5\" />\n                    </button>\n                  </td>\n                </tr>\n              ))}\n            </tbody>\n          </table>\n        </div>\n      )}\n    </div>\n  );\n\n  // === CALCULATE BUTTON ===\n  const CalculateButton = () => (\n    <button\n      onClick={() => calculateZakat(assets)}\n      disabled={assets.length === 0 || loading}\n      className=\"w-full mt-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-4 rounded-lg text-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2\"\n    >\n      <Calculator className=\"w-6 h-6\" />\n      {loading ? 'جاري الحساب...' : 'حساب الزكاة'}\n    </button>\n  );\n\n  // === RESULTS DISPLAY ===\n  const ResultsDisplay = () => {\n    if (!zakatResult) return null;\n\n    const { zakatAmount, details } = zakatResult;\n\n    return (\n      <div className=\"mt-12 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-8 border-2 border-green-200\">\n        <div className=\"flex items-center gap-3 mb-6\">\n          <CheckCircle className=\"w-8 h-8 text-green-600\" />\n          <h2 className=\"text-3xl font-bold text-green-800\">نتائج الحساب</h2>\n        </div>\n\n        {/* الزكاة المستحقة الرئيسية */}\n        <div className=\"bg-white rounded-lg p-6 mb-6 border-l-4 border-green-600\">\n          <p className=\"text-gray-600 text-lg mb-2\">الزكاة المستحقة الإجمالية</p>\n          <p className=\"text-5xl font-bold text-green-600 mb-2\">\n            {zakatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n          </p>\n          <p className=\"text-gray-500\">ريال سعودي</p>\n        </div>\n\n        {/* التفاصيل */}\n        <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4 mb-6\">\n          {details.cash.zakatAmount > 0 && (\n            <div className=\"bg-white rounded-lg p-4 border-l-4 border-blue-500\">\n              <p className=\"text-sm text-gray-600 mb-1\">💰 زكاة النقود</p>\n              <p className=\"text-2xl font-bold text-blue-600\">{details.cash.zakatAmount.toLocaleString()} SAR</p>\n            </div>\n          )}\n          {details.gold.zakatAmount > 0 && (\n            <div className=\"bg-white rounded-lg p-4 border-l-4 border-yellow-500\">\n              <p className=\"text-sm text-gray-600 mb-1\">✨ زكاة الذهب</p>\n              <p className=\"text-2xl font-bold text-yellow-600\">{details.gold.zakatAmount.toLocaleString()} SAR</p>\n            </div>\n          )}\n        </div>\n\n        {/* التوصيات الذكية */}\n        {zakatResult.recommendations && zakatResult.recommendations.length > 0 && (\n          <div className=\"bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4\">\n            <h4 className=\"font-bold text-blue-800 mb-3 flex items-center gap-2\">\n              <AlertCircle className=\"w-5 h-5\" />\n              التوصيات الذكية\n            </h4>\n            <ul className=\"space-y-2\">\n              {zakatResult.recommendations.map((rec, idx) => (\n                <li key={idx} className=\"text-blue-700\">{rec}</li>\n              ))}\n            </ul>\n          </div>\n        )}\n      </div>\n    );\n  };\n\n  // === MAIN RENDER ===\n  return (\n    <div className=\"min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 rtl\">\n      <div className=\"max-w-6xl mx-auto\">\n        {/* HEADER */}\n        <div className=\"text-center mb-12 text-white\">\n          <div className=\"flex items-center justify-center gap-3 mb-4\">\n            <span className=\"text-4xl\">🕌</span>\n            <h1 className=\"text-5xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent\">\n              حاسبة الزكاة الذكية\n            </h1>\n          </div>\n          <p className=\"text-xl text-gray-300\">نظام ذكي ومتقدم لحساب الزكاة وفق الشريعة الإسلامية</p>\n        </div>\n\n        {/* ALERTS */}\n        {error && (\n          <div className=\"bg-red-500 text-white p-4 rounded-lg mb-6 flex items-center gap-3\">\n            <AlertCircle className=\"w-6 h-6\" />\n            {error}\n          </div>\n        )}\n\n        {success && (\n          <div className=\"bg-green-500 text-white p-4 rounded-lg mb-6 flex items-center gap-3\">\n            <CheckCircle className=\"w-6 h-6\" />\n            {success}\n          </div>\n        )}\n\n        {/* MAIN CONTENT */}\n        <div className=\"bg-white rounded-xl shadow-2xl overflow-hidden\">\n          <AssetForm />\n          <div className=\"p-6\">\n            <AssetsList />\n            <CalculateButton />\n            <ResultsDisplay />\n          </div>\n        </div>\n      </div>\n    </div>\n  );\n};\n\nexport default IntelligentZakatCalculator;
