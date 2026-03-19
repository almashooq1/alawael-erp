/**
 * مكونات React لنظام المقاييس والبرامج التأهيلية
 * React Components for Measurement & Rehabilitation System
 * ======================================================
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// ============================
// 1. مكون قائمة المقاييس
// ============================
export const MeasurementTypesList = () => {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');

  useEffect(() => {
    fetchMeasurementTypes();
  }, [category]);

  const fetchMeasurementTypes = async () => {
    try {
      setLoading(true);
      const params = category ? `?category=${category}` : '';
      const response = await axios.get(`${API_URL}/measurements/types${params}`);
      setTypes(response.data.data || []);
    } catch (error) {
      console.error('خطأ في جلب المقاييس:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="measurement-types-container">
      <h2>اختر نوع المقياس</h2>
      
      <div className="category-filter">
        <select 
          value={category} 
          onChange={(e) => setCategory(e.target.value)}
          className="category-select"
        >
          <option value="">جميع الفئات</option>
          <option value="GENERAL">عام</option>
          <option value="EDUCATIONAL">تربوي</option>
          <option value="BEHAVIORAL">سلوكي</option>
          <option value="AUTISM_SPECTRUM">التوحد</option>
          <option value="DAILY_LIVING">الحياة اليومية</option>
          <option value="VOCATIONAL">مهني</option>
        </select>
      </div>

      {loading ? (
        <p className="loading">جارٍ التحميل...</p>
      ) : (
        <div className="types-grid">
          {types.map((type) => (
            <div key={type.code} className="type-card">
              <h3>{type.nameAr}</h3>
              <p className="code">{type.code}</p>
              <p className="category">{type.category}</p>
              <p className="description">{type.description}</p>
              <button className="select-btn">
                اختر هذا المقياس
              </button>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .measurement-types-container {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .category-filter {
          margin: 20px 0;
        }

        .category-select {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }

        .types-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }

        .type-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .type-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border-color: #4CAF50;
        }

        .type-card h3 {
          margin: 0 0 10px 0;
          color: #333;
        }

        .code {
          font-size: 12px;
          color: #999;
          margin: 5px 0;
        }

        .category {
          font-size: 12px;
          background: #f0f0f0;
          padding: 5px 10px;
          border-radius: 4px;
          display: inline-block;
          margin: 5px 0;
        }

        .description {
          font-size: 14px;
          color: #666;
          margin: 10px 0;
        }

        .select-btn {
          width: 100%;
          padding: 10px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 10px;
        }

        .select-btn:hover {
          background: #45a049;
        }

        .loading {
          text-align: center;
          color: #999;
          padding: 20px;
        }
      `}</style>
    </div>
  );
};

// ============================
// 2. مكون تسجيل نتيجة القياس
// ============================
export const MeasurementResultForm = ({ beneficiaryId, measurementTypeCode }) => {
  const [formData, setFormData] = useState({
    rawScore: '',
    standardScore: '',
    performanceLevel: 'AVERAGE',
    observations: '',
    sessionDate: new Date().toISOString().split('T')[0]
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_URL}/measurements/results/${beneficiaryId}`,
        {
          measurementTypeCode,
          ...formData
        }
      );

      setResult(response.data);
      
      // إظهار البرامج المفعل تلقائياً
      if (response.data.activatedPrograms) {
        console.log('البرامج المفعلة:', response.data.activatedPrograms);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ في التسجيل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="measurement-form-container">
      <h2>تسجيل نتيجة القياس</h2>
      
      <form onSubmit={handleSubmit} className="measurement-form">
        <div className="form-group">
          <label>الدرجة الخام</label>
          <input
            type="number"
            name="rawScore"
            value={formData.rawScore}
            onChange={handleChange}
            required
            placeholder="أدخل الدرجة الخام"
          />
        </div>

        <div className="form-group">
          <label>الدرجة المعيارية</label>
          <input
            type="number"
            name="standardScore"
            value={formData.standardScore}
            onChange={handleChange}
            required
            placeholder="أدخل الدرجة المعيارية"
          />
        </div>

        <div className="form-group">
          <label>مستوى الأداء</label>
          <select 
            name="performanceLevel" 
            value={formData.performanceLevel}
            onChange={handleChange}
          >
            <option value="EXCELLENT">ممتاز</option>
            <option value="GOOD">جيد</option>
            <option value="AVERAGE">متوسط</option>
            <option value="BELOW_AVERAGE">دون المتوسط</option>
            <option value="POOR">ضعيف</option>
          </select>
        </div>

        <div className="form-group">
          <label>تاريخ الجلسة</label>
          <input
            type="date"
            name="sessionDate"
            value={formData.sessionDate}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>الملاحظات</label>
          <textarea
            name="observations"
            value={formData.observations}
            onChange={handleChange}
            placeholder="اكتب أي ملاحظات مهمة"
            rows={4}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button 
          type="submit" 
          disabled={loading}
          className="submit-btn"
        >
          {loading ? 'جارٍ التسجيل...' : 'تسجيل النتيجة'}
        </button>
      </form>

      {result && (
        <div className="result-summary">
          <h3>✅ تم التسجيل بنجاح!</h3>
          <p>عدد البرامج المفعل: {result.activatedPrograms?.length || 0}</p>
          {result.activatedPrograms && result.activatedPrograms.length > 0 && (
            <div className="activated-programs">
              <h4>البرامج المفعل تلقائياً:</h4>
              <ul>
                {result.activatedPrograms.map((prog, idx) => (
                  <li key={idx}>
                    {prog.program.nameAr} 
                    <span className="match-score"> ({prog.matchScore}%)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .measurement-form-container {
          max-width: 600px;
          margin: 20px auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
        }

        .measurement-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        label {
          margin-bottom: 5px;
          font-weight: bold;
          color: #333;
        }

        input, select, textarea {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: inherit;
          font-size: 14px;
        }

        input:focus, select:focus, textarea:focus {
          outline: none;
          border-color: #4CAF50;
          box-shadow: 0 0 5px rgba(76, 175, 80, 0.3);
        }

        .submit-btn {
          padding: 12px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
        }

        .submit-btn:hover:not(:disabled) {
          background: #45a049;
        }

        .submit-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .error-message {
          padding: 10px;
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 4px;
          color: #856404;
        }

        .result-summary {
          margin-top: 20px;
          padding: 15px;
          background: #d4edda;
          border: 1px solid #c3e6cb;
          border-radius: 4px;
          color: #155724;
        }

        .activated-programs {
          margin-top: 10px;
        }

        .activated-programs ul {
          list-style: none;
          padding: 0;
        }

        .activated-programs li {
          padding: 8px;
          background: white;
          margin: 5px 0;
          border-radius: 4px;
        }

        .match-score {
          color: #28a745;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

// ============================
// 3. مكون عرض البرامج المفعلة
// ============================
export const ActivatedProgramsList = ({ beneficiaryId }) => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivePrograms();
  }, [beneficiaryId]);

  const fetchActivePrograms = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/measurements/programs`);
      setPrograms(response.data.data || []);
    } catch (error) {
      console.error('خطأ في جلب البرامج:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="programs-list-container">
      <h2>البرامج التأهيلية المفعلة</h2>
      
      {loading ? (
        <p>جارٍ التحميل...</p>
      ) : (
        <div className="programs-list">
          {programs.map((program) => (
            <div key={program._id} className="program-item">
              <h3>{program.nameAr}</h3>
              <p className="category">{program.categoryCode}</p>
              <p>{program.description}</p>
              <button className="details-btn">عرض التفاصيل</button>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .programs-list-container {
          padding: 20px;
        }

        .programs-list {
          display: grid;
          gap: 15px;
          margin-top: 20px;
        }

        .program-item {
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        .program-item:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border-color: #4CAF50;
        }

        .program-item h3 {
          margin: 0 0 10px 0;
        }

        .category {
          font-size: 12px;
          background: #f0f0f0;
          padding: 5px 10px;
          border-radius: 4px;
          display: inline-block;
          margin-bottom: 10px;
        }

        .details-btn {
          padding: 8px 15px;
          background: #2196F3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 10px;
        }

        .details-btn:hover {
          background: #0b7dda;
        }
      `}</style>
    </div>
  );
};

// ============================
// 4. مكون لوحة التحكم
// ============================
export const MeasurementDashboard = ({ beneficiaryId }) => {
  const [stats, setStats] = useState({
    totalMeasurements: 0,
    activePrograms: 0,
    completionRate: 0
  });

  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, [beneficiaryId]);

  const fetchStats = async () => {
    try {
      // جلب إحصائيات المستفيد
      const response = await axios.get(`${API_URL}/measurements/comprehensive-report/${beneficiaryId}`);
      setStats({
        totalMeasurements: response.data.measurements?.length || 0,
        activePrograms: response.data.programs?.length || 0,
        completionRate: response.data.completionRate || 0
      });
    } catch (err) {
      setError('فشل في جلب الإحصائيات');
    }
  };

  return (
    <div className="dashboard-container">
      <h2>لوحة التحكم</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>{stats.totalMeasurements}</h3>
          <p>المقاييس المسجلة</p>
        </div>
        <div className="stat-card">
          <h3>{stats.activePrograms}</h3>
          <p>البرامج النشطة</p>
        </div>
        <div className="stat-card">
          <h3>{stats.completionRate}%</h3>
          <p>معدل الإنجاز</p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <style jsx>{`
        .dashboard-container {
          padding: 20px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-top: 20px;
        }

        .stat-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        }

        .stat-card h3 {
          margin: 0;
          font-size: 32px;
        }

        .stat-card p {
          margin: 10px 0 0 0;
          opacity: 0.9;
        }

        .error {
          color: #d32f2f;
          padding: 10px;
          background: #ffebee;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default {
  MeasurementTypesList,
  MeasurementResultForm,
  ActivatedProgramsList,
  MeasurementDashboard
};
