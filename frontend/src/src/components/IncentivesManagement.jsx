/**
 * Incentives Management Component
 * مكون إدارة الحوافز والمزايا
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './IncentivesManagement.css';

const IncentivesManagement = () => {
  const [incentives, setIncentives] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, approved, paid
  const [formData, setFormData] = useState({
    employeeId: '',
    incentiveType: 'performance',
    month: new Date().toISOString().slice(0, 7),
    year: new Date().getFullYear(),
    amount: 0,
    reason: '',
  });
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // تحميل الحوافز
  useEffect(() => {
    loadIncentives();
  }, [filter]);

  const loadIncentives = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE}/compensation/incentives`;
      if (filter !== 'all') {
        url += `?status=${filter}`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      setIncentives(response.data.data);
    } catch (err) {
      setError('فشل تحميل الحوافز');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE}/compensation/incentives`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      alert('تم إنشاء الحافز بنجاح');
      setFormData({
        employeeId: '',
        incentiveType: 'performance',
        month: new Date().toISOString().slice(0, 7),
        year: new Date().getFullYear(),
        amount: 0,
        reason: '',
      });
      setShowForm(false);
      loadIncentives();
    } catch (err) {
      setError('فشل إنشاء الحافز');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (incentiveId) => {
    if (!window.confirm('هل تريد الموافقة على هذا الحافز؟')) {
      return;
    }

    try {
      await axios.put(
        `${API_BASE}/compensation/incentives/${incentiveId}/approve`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      alert('تمت الموافقة على الحافز');
      loadIncentives();
    } catch (error) {
      alert('فشل الموافقة على الحافز');
      console.error(error);
    }
  };

  const handleMarkPaid = async (incentiveId) => {
    const transactionRef = prompt('أدخل رقم المرجع للعملية:');
    if (!transactionRef) return;

    try {
      await axios.put(
        `${API_BASE}/compensation/incentives/${incentiveId}/mark-paid`,
        { transactionRef },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      alert('تم تحديد الحافز كمدفوع');
      loadIncentives();
    } catch (error) {
      alert('فشل تحديث حالة الحافز');
      console.error(error);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
    }).format(value || 0);
  };

  const incentiveTypeLabels = {
    performance: 'حافز الأداء',
    attendance: 'حافز الحضور',
    safety: 'حافز السلامة',
    loyalty: 'حافز الولاء',
    project: 'حافز المشروع',
    seasonal: 'حافز موسمي',
    recognition: 'حافز التقدير',
    promotion: 'حافز ترقية',
    special: 'حافز خاص',
  };

  const statusLabels = {
    draft: 'مسودة',
    pending: 'قيد الموافقة',
    approved: 'معتمد',
    paid: 'مدفوع',
    rejected: 'مرفوض',
  };

  return (
    <div className="incentives-management">
      <div className="management-header">
        <h2>إدارة الحوافز والمزايا</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'إغلاق' : 'إضافة حافز جديد'}
        </button>
      </div>

      {/* نموذج إضافة حافز */}
      {showForm && (
        <div className="form-container">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="employeeId">معرف الموظف:</label>
              <input
                id="employeeId"
                type="text"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleInputChange}
                placeholder="أدخل معرف الموظف"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="incentiveType">نوع الحافز:</label>
                <select
                  id="incentiveType"
                  name="incentiveType"
                  value={formData.incentiveType}
                  onChange={handleInputChange}
                >
                  {Object.entries(incentiveTypeLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="amount">المبلغ (ريال):</label>
                <input
                  id="amount"
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="month">الشهر:</label>
                <input
                  id="month"
                  type="month"
                  name="month"
                  value={formData.month}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="year">السنة:</label>
                <input
                  id="year"
                  type="number"
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  min="2020"
                  max={new Date().getFullYear() + 1}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reason">السبب والوصف:</label>
              <textarea
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                placeholder="أدخل سبب الحافز"
                rows="3"
              ></textarea>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-success" disabled={loading}>
                {loading ? 'جاري الحفظ...' : 'حفظ الحافز'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-cancel">
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* المرشحات */}
      <div className="filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          الكل
        </button>
        <button
          className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          قيد الموافقة
        </button>
        <button
          className={`filter-btn ${filter === 'approved' ? 'active' : ''}`}
          onClick={() => setFilter('approved')}
        >
          معتمد
        </button>
        <button
          className={`filter-btn ${filter === 'paid' ? 'active' : ''}`}
          onClick={() => setFilter('paid')}
        >
          مدفوع
        </button>
      </div>

      {/* رسالة الخطأ */}
      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* قائمة الحوافز */}
      {loading ? (
        <div className="loading-spinner">جاري التحميل...</div>
      ) : incentives.length > 0 ? (
        <div className="incentives-list">
          {incentives.map((incentive) => (
            <div key={incentive._id} className={`incentive-card ${incentive.status}`}>
              <div className="card-header">
                <div className="header-info">
                  <h3>{incentive.employeeName}</h3>
                  <span className="status-badge">{statusLabels[incentive.status]}</span>
                </div>
                <div className="header-amount">
                  <strong>{formatCurrency(incentive.amount)}</strong>
                </div>
              </div>

              <div className="card-body">
                <div className="info-row">
                  <span className="label">النوع:</span>
                  <span>{incentiveTypeLabels[incentive.incentiveType]}</span>
                </div>
                <div className="info-row">
                  <span className="label">الفترة:</span>
                  <span>{incentive.month}/{incentive.year}</span>
                </div>
                {incentive.reason && (
                  <div className="info-row">
                    <span className="label">السبب:</span>
                    <span>{incentive.reason}</span>
                  </div>
                )}
                {incentive.recommendedBy && (
                  <div className="info-row">
                    <span className="label">موصى به من:</span>
                    <span>{incentive.recommendedBy.name}</span>
                  </div>
                )}
              </div>

              <div className="card-actions">
                {incentive.status === 'draft' && (
                  <button
                    onClick={() => handleApprove(incentive._id)}
                    className="btn-small btn-approve"
                  >
                    موافقة
                  </button>
                )}
                {incentive.status === 'approved' && (
                  <button
                    onClick={() => handleMarkPaid(incentive._id)}
                    className="btn-small btn-paid"
                  >
                    تحديد كمدفوع
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-data">لا توجد حوافز</div>
      )}
    </div>
  );
};

export default IncentivesManagement;
