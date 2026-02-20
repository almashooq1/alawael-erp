/**
 * ProgressReport.jsx
 * مكون تقارير التقدم
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertCircle, Award, Target } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ProgressReport() {
  const { token } = useAuth();
  const [report, setReport] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProgress();
    fetchAnalytics();
  }, []);

  const fetchProgress = async () => {
    try {
      const response = await fetch('/api/beneficiary/progress', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setReport(data.data);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('فشل في تحميل التقرير');
      console.error('Error fetching progress:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/beneficiary/progress/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  if (!report) {
    return (
      <div className="empty-state">
        <AlertCircle size={48} />
        <p>لا توجد بيانات تقدم متاحة حالياً</p>
      </div>
    );
  }

  return (
    <div className="progress-container">
      <h2>تقرير التقدم</h2>

      {error && (
        <div className="error-message">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Overall Progress */}
      <div className="progress-section card">
        <h3>التقدم العام</h3>
        <ProgressBar
          value={report.overallProgress || 0}
          label="إجمالي التقدم"
          color="#3498db"
        />
        <p className="progress-status" style={{ color: getStatusColor(report.status) }}>
          الحالة: {getStatusLabel(report.status)}
        </p>
      </div>

      {/* Key Metrics */}
      {analytics && (
        <div className="metrics-grid">
          <MetricCard
            title="الحضور"
            value={`${analytics.metrics.attendance.current}%`}
            target={`${analytics.metrics.attendance.target}%`}
            icon={Target}
            color="#2ecc71"
            trend={analytics.metrics.attendance.trend}
          />

          <MetricCard
            title="الواجبات"
            value={`${analytics.metrics.assignments.completionRate}%`}
            total={analytics.metrics.assignments.total}
            completed={analytics.metrics.assignments.completed}
            icon={Award}
            color="#f39c12"
          />

          <MetricCard
            title="المتوسط"
            value={analytics.metrics.assessments.averageGrade}
            max="100"
            icon={TrendingUp}
            color="#e74c3c"
          />

          <MetricCard
            title="الإنجازات"
            value={analytics.metrics.achievements}
            icon={Award}
            color="#9b59b6"
          />
        </div>
      )}

      {/* Detailed Metrics */}
      <div className="detailed-metrics card">
        <h3>التفاصيل</h3>
        <div className="metrics-list">
          <div className="metric-item">
            <span className="metric-label">معدل الحضور</span>
            <ProgressBar
              value={report.attendanceRate || 0}
              label={`${report.attendanceRate || 0}%`}
              color="#2ecc71"
              compact
            />
          </div>

          <div className="metric-item">
            <span className="metric-label">إتمام الواجبات</span>
            <ProgressBar
              value={report.assignmentCompletion || 0}
              label={`${report.assignmentCompletion || 0}%`}
              color="#f39c12"
              compact
            />
          </div>

          <div className="metric-item">
            <span className="metric-label">درجة التقييم</span>
            <ProgressBar
              value={report.assessmentScore || 0}
              label={`${report.assessmentScore || 0}%`}
              color="#e74c3c"
              compact
            />
          </div>

          <div className="metric-item">
            <span className="metric-label">الجلسات</span>
            <span className="value">
              {report.sessionsAttended}/{report.sessionsTotal}
            </span>
          </div>
        </div>
      </div>

      {/* Achievements */}
      {report.achievements && report.achievements.length > 0 && (
        <div className="achievements-section card">
          <h3>الإنجازات والشهادات</h3>
          <div className="achievements-grid">
            {report.achievements.map((achievement, index) => (
              <AchievementCard key={index} achievement={achievement} />
            ))}
          </div>
        </div>
      )}

      {/* Feedback */}
      {report.instructorFeedback && (
        <div className="feedback-section card">
          <h3>ملاحظات المحاضر</h3>
          
          <div className="feedback-summary">
            <p>{report.instructorFeedback.summary}</p>
          </div>

          {report.instructorFeedback.strengths && report.instructorFeedback.strengths.length > 0 && (
            <div className="feedback-item">
              <h4>نقاط القوة:</h4>
              <ul>
                {report.instructorFeedback.strengths.map((strength, index) => (
                  <li key={index}>{strength}</li>
                ))}
              </ul>
            </div>
          )}

          {report.instructorFeedback.areasForImprovement && report.instructorFeedback.areasForImprovement.length > 0 && (
            <div className="feedback-item">
              <h4>مجالات التحسن:</h4>
              <ul>
                {report.instructorFeedback.areasForImprovement.map((area, index) => (
                  <li key={index}>{area}</li>
                ))}
              </ul>
            </div>
          )}

          {report.instructorFeedback.recommendations && report.instructorFeedback.recommendations.length > 0 && (
            <div className="feedback-item">
              <h4>التوصيات:</h4>
              <ul>
                {report.instructorFeedback.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {report.instructorFeedback.updatedAt && (
            <p className="update-date">
              آخر تحديث: {new Date(report.instructorFeedback.updatedAt).toLocaleDateString('ar-SA')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Progress Bar Component
function ProgressBar({ value, label, color, compact = false }) {
  const percentage = Math.min(value, 100);
  
  return (
    <div className={`progress-bar-container ${compact ? 'compact' : ''}`}>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: color
          }}
        />
      </div>
      <span className="progress-label">{label}</span>
    </div>
  );
}

// Metric Card Component
function MetricCard({ title, value, target, total, completed, icon: Icon, color, trend }) {
  return (
    <div className="metric-card card">
      <div className="metric-icon" style={{ backgroundColor: color }}>
        <Icon size={24} color="white" />
      </div>
      <div className="metric-info">
        <h4>{title}</h4>
        <p className="metric-value">{value}</p>
        {target && <p className="metric-target">الهدف: {target}</p>}
        {total && <p className="metric-detail">{completed}/{total}</p>}
        {trend && (
          <p className="metric-trend" style={{ color: trend === 'up' ? '#2ecc71' : '#e74c3c' }}>
            {trend === 'up' ? '↑' : '↓'} {trend}
          </p>
        )}
      </div>
    </div>
  );
}

// Achievement Card Component
function AchievementCard({ achievement }) {
  return (
    <div className="achievement-card">
      {achievement.badgeUrl && (
        <img src={achievement.badgeUrl} alt={achievement.title} className="badge-image" />
      )}
      <h4>{achievement.title}</h4>
      <p>{achievement.description}</p>
      {achievement.earnedDate && (
        <span className="earned-date">
          {new Date(achievement.earnedDate).toLocaleDateString('ar-SA')}
        </span>
      )}
    </div>
  );
}

// Helper functions
function getStatusColor(status) {
  switch (status) {
    case 'excellent':
      return '#2ecc71';
    case 'on_track':
      return '#3498db';
    case 'at_risk':
      return '#f39c12';
    case 'needs_support':
      return '#e74c3c';
    default:
      return '#95a5a6';
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'excellent':
      return 'متفوق';
    case 'on_track':
      return 'على المسار الصحيح';
    case 'at_risk':
      return 'بحاجة إلى انتباه';
    case 'needs_support':
      return 'بحاجة إلى دعم';
    default:
      return 'غير معروف';
  }
}
