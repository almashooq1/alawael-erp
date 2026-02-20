/**
 * مكون الجدولة الذكية
 * يدير جدولة الجلسات بشكل ذكي مع تجنب التعارضات
 */

import React, { useState, useEffect } from 'react';
import './SmartScheduler.css';

const SmartScheduler = ({ beneficiaryId, programId }) => {
  const [scheduler, setScheduler] = useState(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [formData, setFormData] = useState({
    frequency: 'weekly',
    sessionsPerWeek: 2,
    planDuration: 90
  });

  // إنشاء جدولة جديدة
  useEffect(() => {
    if (beneficiaryId && programId) {
      createScheduler();
    }
  }, [beneficiaryId, programId]);

  const createScheduler = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/scheduler/create-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beneficiaryId,
          programId,
          frequency: formData.frequency,
          sessionsPerWeek: formData.sessionsPerWeek,
          planDuration: formData.planDuration
        })
      });

      if (response.ok) {
        const data = await response.json();
        setScheduler(data.data);
      }
    } catch (error) {
      console.error('خطأ:', error);
    } finally {
      setLoading(false);
    }
  };

  // توليد المقترحات
  const handleGenerateSuggestions = async () => {
    if (!scheduler) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/scheduler/${scheduler._id}/generate-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.data.suggestions || []);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('خطأ:', error);
    } finally {
      setLoading(false);
    }
  };

  // الموافقة على الجدولة
  const handleApproveSchedule = async () => {
    if (!scheduler) return;

    try {
      const response = await fetch(`/api/scheduler/${scheduler._id}/approve-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approverType: 'specialist' })
      });

      if (response.ok) {
        alert('تم الموافقة على الجدولة');
        const data = await response.json();
        setScheduler(data.data);
      }
    } catch (error) {
      console.error('خطأ:', error);
    }
  };

  // تفعيل الجدولة
  const handleActivateSchedule = async () => {
    if (!scheduler) return;

    try {
      const response = await fetch(`/api/scheduler/${scheduler._id}/activate-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        alert('تم تفعيل الجدولة');
        const data = await response.json();
        setScheduler(data.data);
      }
    } catch (error) {
      console.error('خطأ:', error);
    }
  };

  // جلب التحليلات
  const handleViewAnalytics = async () => {
    if (!scheduler) return;

    try {
      const response = await fetch(`/api/scheduler/${scheduler._id}/analytics`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('خطأ:', error);
    }
  };

  if (!scheduler) {
    return <div className="loading">جاري التحضير...</div>;
  }

  return (
    <div className="smart-scheduler">
      <div className="scheduler-header">
        <h2>الجدولة الذكية للجلسات</h2>
        <p>جدولة متقدمة مع تجنب التعارضات والتحسينات الذكية</p>
      </div>

      {/* إعدادات الجدولة */}
      <div className="scheduler-settings">
        <div className="settings-group">
          <label>التكرار</label>
          <select
            value={formData.frequency}
            onChange={(e) => setFormData({...formData, frequency: e.target.value})}
          >
            <option value="daily">يومي</option>
            <option value="biweekly">كل أسبوعين</option>
            <option value="weekly">أسبوعي</option>
            <option value="twice-weekly">مرتين أسبوعياً</option>
            <option value="monthly">شهري</option>
          </select>
        </div>

        <div className="settings-group">
          <label>عدد الجلسات الأسبوعية</label>
          <input
            type="number"
            value={formData.sessionsPerWeek}
            onChange={(e) => setFormData({...formData, sessionsPerWeek: parseInt(e.target.value)})}
            min="1"
            max="7"
          />
        </div>

        <div className="settings-group">
          <label>مدة الخطة (أيام)</label>
          <input
            type="number"
            value={formData.planDuration}
            onChange={(e) => setFormData({...formData, planDuration: parseInt(e.target.value)})}
            min="30"
            step="30"
          />
        </div>
      </div>

      {/* الحالة */}
      <div className="scheduler-status">
        <p>
          <strong>الحالة:</strong> <span className={`status-badge status-${scheduler.status}`}>
            {scheduler.status}
          </span>
        </p>
      </div>

      {/* الإجراءات */}
      <div className="scheduler-actions">
        <button 
          onClick={handleGenerateSuggestions}
          disabled={loading}
          className="btn-generate"
        >
          {loading ? 'جاري التوليد...' : 'توليد المقترحات'}
        </button>

        {scheduler.status === 'pending-review' && (
          <button 
            onClick={handleApproveSchedule}
            className="btn-approve"
          >
            الموافقة على الجدولة
          </button>
        )}

        {scheduler.status === 'approved' && (
          <button 
            onClick={handleActivateSchedule}
            className="btn-activate"
          >
            تفعيل الجدولة
          </button>
        )}

        <button 
          onClick={handleViewAnalytics}
          className="btn-analytics"
        >
          عرض التحليلات
        </button>
      </div>

      {/* المقترحات */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="suggestions-section">
          <h3>مقترحات الجدولة</h3>
          <div className="suggestions-list">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="suggestion-card">
                <div className="suggestion-date">
                  {new Date(suggestion.scheduledDateTime).toLocaleDateString('ar-SA')}
                  {' '}
                  {new Date(suggestion.scheduledDateTime).toLocaleTimeString('ar-SA')}
                </div>
                
                <div className="suggestion-details">
                  <p>
                    <strong>الأخصائي:</strong> {suggestion.recommendedSpecialist?.name || 'متاح'}
                  </p>
                  <p>
                    <strong>الغرفة:</strong> {suggestion.preferredRoom?.roomName || 'غير محدد'}
                  </p>
                  <p>
                    <strong>المدة:</strong> {suggestion.estimatedDuration} دقيقة
                  </p>
                  <p>
                    <strong>درجة الثقة:</strong> {suggestion.confidenceScore}%
                  </p>
                  <p className="explanation">{suggestion.explanation}</p>
                </div>

                {suggestion.alternativeOptions && suggestion.alternativeOptions.length > 0 && (
                  <details className="alternatives">
                    <summary>خيارات بديلة ({suggestion.alternativeOptions.length})</summary>
                    {suggestion.alternativeOptions.map((alt, idx) => (
                      <div key={idx} className="alternative">
                        <p>{new Date(alt.dateTime).toLocaleDateString('ar-SA')}</p>
                        <p>{alt.reason}</p>
                      </div>
                    ))}
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* التحليلات */}
      {analytics && (
        <div className="analytics-section">
          <h3>تحليلات الجدولة</h3>
          <div className="analytics-grid">
            <div className="analytics-card">
              <h4>الكفاءة الكلية</h4>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: `${analytics.efficiency?.overallEfficiency || 0}%`}}>
                  {analytics.efficiency?.overallEfficiency}%
                </div>
              </div>
            </div>

            <div className="analytics-card">
              <h4>استخدام الموارد</h4>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: `${analytics.efficiency?.resourceUtilization || 0}%`}}>
                  {analytics.efficiency?.resourceUtilization}%
                </div>
              </div>
            </div>

            <div className="analytics-card">
              <h4>استخدام الأخصائيين</h4>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: `${analytics.efficiency?.specialistUtilization || 0}%`}}>
                  {analytics.efficiency?.specialistUtilization}%
                </div>
              </div>
            </div>
          </div>

          {analytics.recommendations && analytics.recommendations.length > 0 && (
            <div className="recommendations">
              <h4>التوصيات</h4>
              <ul>
                {analytics.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartScheduler;
