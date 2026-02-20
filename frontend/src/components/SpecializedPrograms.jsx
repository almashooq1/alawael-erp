/**
 * مكون إدارة البرامج المتخصصة
 * يدير عرض وإنشاء والبحث عن البرامج المتخصصة حسب نوع الإعاقة
 */

import React, { useState, useEffect } from 'react';
import './SpecializedPrograms.css';

const SpecializedPrograms = () => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDisability, setSelectedDisability] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    disabilityType: '',
    supportedSeverityLevels: [],
    ageGroup: { min: 0, max: 100 }
  });

  const DISABILITY_TYPES = {
    MOTOR: 'إعاقة حركية',
    VISUAL: 'إعاقة بصرية',
    HEARING: 'إعاقة سمعية',
    INTELLECTUAL: 'إعاقة ذهنية',
    DEVELOPMENTAL: 'اضطراب تطوري',
    COMMUNICATION: 'اضطراب التواصل',
    MULTIPLE: 'إعاقات متعددة'
  };

  const SEVERITY_LEVELS = {
    MILD: 'خفيفة',
    MODERATE: 'متوسطة',
    SEVERE: 'شديدة',
    PROFOUND: 'عميقة'
  };

  // جلب البرامج
  useEffect(() => {
    fetchPrograms();
  }, [selectedDisability]);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const url = selectedDisability
        ? `/api/programs/by-disability/${selectedDisability}`
        : '/api/programs';
      
      const response = await fetch(url);
      const data = await response.json();
      setPrograms(data.data || data.programs || []);
    } catch (error) {
      console.error('خطأ في جلب البرامج:', error);
    } finally {
      setLoading(false);
    }
  };

  // إنشاء برنامج جديد
  const handleCreateProgram = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert('تم إنشاء البرنامج بنجاح');
        setShowForm(false);
        setFormData({
          name: '',
          code: '',
          description: '',
          disabilityType: '',
          supportedSeverityLevels: [],
          ageGroup: { min: 0, max: 100 }
        });
        fetchPrograms();
      }
    } catch (error) {
      console.error('خطأ في إنشاء البرنامج:', error);
      alert('فشل في إنشاء البرنامج');
    }
  };

  return (
    <div className="specialized-programs">
      <div className="programs-header">
        <h2>البرامج المتخصصة</h2>
        <p>إدارة البرامج العلاجية والتعليمية حسب نوع الإعاقة</p>
      </div>

      {/* تصفية حسب نوع الإعاقة */}
      <div className="disability-filter">
        <label>اختر نوع الإعاقة:</label>
        <select
          value={selectedDisability}
          onChange={(e) => setSelectedDisability(e.target.value)}
          className="filter-select"
        >
          <option value="">جميع البرامج</option>
          {Object.entries(DISABILITY_TYPES).map(([key, value]) => (
            <option key={key} value={key}>
              {value}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-create-program"
        >
          إضافة برنامج جديد
        </button>
      </div>

      {/* نموذج إنشاء برنامج */}
      {showForm && (
        <form onSubmit={handleCreateProgram} className="program-form">
          <div className="form-group">
            <label>اسم البرنامج</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              placeholder="مثال: برنامج العلاج الطبيعي للإعاقة الحركية"
            />
          </div>

          <div className="form-group">
            <label>كود البرنامج</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({...formData, code: e.target.value})}
              required
              placeholder="PROG-MOTOR-001"
            />
          </div>

          <div className="form-group">
            <label>نوع الإعاقة</label>
            <select
              value={formData.disabilityType}
              onChange={(e) => setFormData({...formData, disabilityType: e.target.value})}
              required
            >
              <option value="">اختر نوع الإعاقة</option>
              {Object.entries(DISABILITY_TYPES).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>الوصف</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="وصف البرنامج..."
              rows="4"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-submit">إنشاء</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-cancel">
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* قائمة البرامج */}
      {loading ? (
        <div className="loading">جاري التحميل...</div>
      ) : (
        <div className="programs-grid">
          {programs.length === 0 ? (
            <div className="no-data">لا توجد برامج متاحة</div>
          ) : (
            programs.map((program) => (
              <div key={program._id} className="program-card">
                <div className="program-header">
                  <h3>{program.name}</h3>
                  <span className="disability-badge">
                    {DISABILITY_TYPES[program.disabilityType]}
                  </span>
                </div>

                <div className="program-details">
                  <p><strong>الكود:</strong> {program.code}</p>
                  {program.description && (
                    <p><strong>الوصف:</strong> {program.description}</p>
                  )}
                  
                  {program.sessionConfig && (
                    <div className="session-config">
                      <p>
                        <strong>مدة الجلسة:</strong> {program.sessionConfig.standardDuration} دقيقة
                      </p>
                      <p>
                        <strong>عدد الجلسات:</strong> {program.sessionConfig.frequencyPerWeek} جلسة أسبوعية
                      </p>
                    </div>
                  )}

                  {program.ageGroup && (
                    <p>
                      <strong>الفئة العمرية:</strong> {program.ageGroup.min} - {program.ageGroup.max} سنة
                    </p>
                  )}

                  {program.statistics && (
                    <div className="statistics">
                      <p>
                        <strong>المستفيدين:</strong> {program.statistics.totalBeneficiaries}
                      </p>
                      <p>
                        <strong>معدل النجاح:</strong> {program.statistics.successRate}%
                      </p>
                    </div>
                  )}
                </div>

                <div className="program-actions">
                  <button className="btn-view-details">عرض التفاصيل</button>
                  <button className="btn-start-session">بدء جلسة</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SpecializedPrograms;
