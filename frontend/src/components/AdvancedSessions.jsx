/**
 * مكون إدارة الجلسات المتقدمة
 * يدير عرض وإنشاء والتحكم في الجلسات العلاجية
 */

import React, { useState, useEffect } from 'react';
import './AdvancedSessions.css';

const AdvancedSessions = ({ beneficiaryId }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionFilter, setSessionFilter] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledDateTime: '',
    scheduledDuration: 60,
    location: {}
  });

  const SESSION_STATUSES = {
    SCHEDULED: 'مجدولة',
    IN_PROGRESS: 'جاريـة',
    COMPLETED: 'مكتملة',
    CANCELLED: 'ملغاة'
  };

  const ATTENDANCE_STATUS = {
    PRESENT: 'حاضر',
    ABSENT: 'غائب',
    LATE: 'متأخر',
    EXCUSED: 'معذور'
  };

  // جلب الجلسات
  useEffect(() => {
    fetchSessions();
  }, [beneficiaryId, sessionFilter]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (beneficiaryId) params.append('beneficiaryId', beneficiaryId);
      if (sessionFilter !== 'all') params.append('status', sessionFilter);

      const response = await fetch(`/api/sessions?${params}`);
      const data = await response.json();
      setSessions(data.data?.sessions || data.sessions || []);
    } catch (error) {
      console.error('خطأ في جلب الجلسات:', error);
    } finally {
      setLoading(false);
    }
  };

  // إنشاء جلسة جديدة
  const handleCreateSession = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          beneficiaryId
        })
      });

      if (response.ok) {
        alert('تم إنشاء الجلسة بنجاح');
        setShowSessionForm(false);
        setFormData({
          title: '',
          description: '',
          scheduledDateTime: '',
          scheduledDuration: 60,
          location: {}
        });
        fetchSessions();
      }
    } catch (error) {
      console.error('خطأ:', error);
    }
  };

  // بدء جلسة
  const handleStartSession = async (sessionId) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        alert('تم بدء الجلسة');
        fetchSessions();
      }
    } catch (error) {
      console.error('خطأ:', error);
    }
  };

  // إكمال جلسة
  const handleCompleteSession = async (sessionId) => {
    const completionData = {
      beneficiaryAttendance: {
        status: 'present',
        remarks: 'الجلسة مكتملة بنجاح'
      },
      performanceAssessment: {
        overallEngagement: 'excellent',
        progressTowardGoals: 'good',
        estimatedGoalAttainment: 85
      }
    };

    try {
      const response = await fetch(`/api/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completionData)
      });

      if (response.ok) {
        alert('تم إكمال الجلسة بنجاح');
        fetchSessions();
      }
    } catch (error) {
      console.error('خطأ:', error);
    }
  };

  return (
    <div className="advanced-sessions">
      <div className="sessions-header">
        <h2>إدارة الجلسات المتقدمة</h2>
        <p>تتبع وإدارة الجلسات العلاجية والتعليمية</p>
      </div>

      {/* التصفية والإجراءات */}
      <div className="sessions-controls">
        <select
          value={sessionFilter}
          onChange={(e) => setSessionFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">جميع الجلسات</option>
          <option value="scheduled">مجدولة</option>
          <option value="completed">مكتملة</option>
          <option value="cancelled">ملغاة</option>
        </select>

        <button
          onClick={() => setShowSessionForm(!showSessionForm)}
          className="btn-create-session"
        >
          إضافة جلسة جديدة
        </button>
      </div>

      {/* نموذج إنشاء جلسة */}
      {showSessionForm && (
        <form onSubmit={handleCreateSession} className="session-form">
          <div className="form-group">
            <label>اسم الجلسة</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>الوصف</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>التاريخ والوقت</label>
            <input
              type="datetime-local"
              value={formData.scheduledDateTime}
              onChange={(e) => setFormData({...formData, scheduledDateTime: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>مدة الجلسة (دقيقة)</label>
            <input
              type="number"
              value={formData.scheduledDuration}
              onChange={(e) => setFormData({...formData, scheduledDuration: parseInt(e.target.value)})}
              min="15"
              max="180"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-submit">إنشاء</button>
            <button type="button" onClick={() => setShowSessionForm(false)} className="btn-cancel">
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* قائمة الجلسات */}
      {loading ? (
        <div className="loading">جاري التحميل...</div>
      ) : (
        <div className="sessions-list">
          {sessions.length === 0 ? (
            <div className="no-data">لا توجد جلسات</div>
          ) : (
            sessions.map((session) => (
              <div key={session._id} className={`session-card status-${session.status}`}>
                <div className="session-header">
                  <h3>{session.title}</h3>
                  <span className={`status-badge status-${session.status}`}>
                    {SESSION_STATUSES[session.status] || session.status}
                  </span>
                </div>

                <div className="session-info">
                  <p>
                    <strong>التاريخ:</strong> {new Date(session.scheduledDateTime).toLocaleDateString('ar-SA')}
                  </p>
                  <p>
                    <strong>الوقت:</strong> {new Date(session.scheduledDateTime).toLocaleTimeString('ar-SA')}
                  </p>
                  <p>
                    <strong>المدة:</strong> {session.scheduledDuration} دقيقة
                  </p>

                  {session.beneficiaryAttendance && (
                    <p>
                      <strong>الحضور:</strong> {ATTENDANCE_STATUS[session.beneficiaryAttendance.status]}
                    </p>
                  )}

                  {session.performanceAssessment && (
                    <div className="assessment">
                      <p>
                        <strong>الأداء:</strong> {session.performanceAssessment.overallEngagement}
                      </p>
                      <p>
                        <strong>التقدم:</strong> {session.performanceAssessment.estimatedGoalAttainment}%
                      </p>
                    </div>
                  )}
                </div>

                <div className="session-actions">
                  {session.status === 'scheduled' && (
                    <>
                      <button 
                        onClick={() => handleStartSession(session._id)}
                        className="btn-start"
                      >
                        بدء الجلسة
                      </button>
                      <button className="btn-reschedule">إعادة جدولة</button>
                    </>
                  )}

                  {session.status === 'in_progress' && (
                    <button 
                      onClick={() => handleCompleteSession(session._id)}
                      className="btn-complete"
                    >
                      إنهاء الجلسة
                    </button>
                  )}

                  {session.status === 'completed' && (
                    <button className="btn-view-report">عرض التقرير</button>
                  )}

                  <button 
                    onClick={() => setSelectedSession(session._id === selectedSession ? null : session._id)}
                    className="btn-details"
                  >
                    التفاصيل
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedSessions;
