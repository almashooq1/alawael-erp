/**
 * Schedule.jsx
 * مكون الجدول الزمني
 */

import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Link2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Schedule() {
  const { token } = useAuth();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, upcoming, completed
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/beneficiary/schedule', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setSchedule(data.data.items || []);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('فشل في تحميل الجدول الزمني');
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (scheduleItemId) => {
    try {
      const response = await fetch(`/api/beneficiary/schedule/${scheduleItemId}/attend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setSchedule(schedule.map(item =>
          item._id === scheduleItemId ? { ...item, attended: true, status: 'completed' } : item
        ));
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('فشل في تسجيل الحضور');
      console.error('Error marking attendance:', error);
    }
  };

  const getFilteredSchedule = () => {
    const now = new Date();
    
    switch (filter) {
      case 'upcoming':
        return schedule.filter(item => new Date(item.startDate) > now && item.status === 'scheduled');
      case 'completed':
        return schedule.filter(item => item.status === 'completed');
      default:
        return schedule;
    }
  };

  const filteredSchedule = getFilteredSchedule();

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  return (
    <div className="schedule-container">
      <div className="schedule-header">
        <h2>الجدول الزمني</h2>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            الكل ({schedule.length})
          </button>
          <button
            className={`filter-btn ${filter === 'upcoming' ? 'active' : ''}`}
            onClick={() => setFilter('upcoming')}
          >
            القادمة
          </button>
          <button
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            المكتملة
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {filteredSchedule.length === 0 ? (
        <div className="empty-state">
          <Clock size={48} />
          <p>لا توجد جلسات {filter === 'all' ? '' : 'محددة'}</p>
        </div>
      ) : (
        <div className="schedule-list">
          {filteredSchedule.map(item => (
            <ScheduleCard
              key={item._id}
              item={item}
              onMarkAttendance={() => markAttendance(item._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Schedule Card Component
function ScheduleCard({ item, onMarkAttendance }) {
  const startDate = new Date(item.startDate);
  const endDate = new Date(item.endDate);
  const isUpcoming = startDate > new Date();
  const isCompleted = item.status === 'completed';

  const getStatusColor = () => {
    switch (item.status) {
      case 'completed':
        return '#2ecc71';
      case 'ongoing':
        return '#f39c12';
      case 'cancelled':
        return '#e74c3c';
      default:
        return '#3498db';
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="schedule-card" style={{ borderRightColor: getStatusColor() }}>
      <div className="card-header">
        <h3>{item.title}</h3>
        <span className="status-badge" style={{ backgroundColor: getStatusColor() }}>
          {item.status}
        </span>
      </div>

      <div className="card-body">
        {item.description && (
          <p className="description">{item.description}</p>
        )}

        <div className="card-details">
          <div className="detail-item">
            <Clock size={18} />
            <span>
              {formatTime(startDate)} - {formatTime(endDate)}
            </span>
          </div>

          <div className="detail-item">
            <span className="date">{formatDate(startDate)}</span>
          </div>

          {item.location && (
            <div className="detail-item">
              <MapPin size={18} />
              <span>{item.location}</span>
            </div>
          )}

          {item.isVirtual && item.meetingLink && (
            <div className="detail-item">
              <Link2 size={18} />
              <a href={item.meetingLink} target="_blank" rel="noopener noreferrer">
                الاتصال بالجلسة
              </a>
            </div>
          )}
        </div>

        {item.instructor && (
          <div className="instructor-info">
            <h4>المحاضر: {item.instructor.name}</h4>
            <p>{item.instructor.email}</p>
            <p>{item.instructor.phone}</p>
          </div>
        )}

        {item.attachments && item.attachments.length > 0 && (
          <div className="attachments">
            <h4>المرفقات:</h4>
            <ul>
              {item.attachments.map((attachment, index) => (
                <li key={index}>
                  <a href={attachment} target="_blank" rel="noopener noreferrer">
                    تحميل الملف {index + 1}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="card-footer">
        {isUpcoming && !item.attended && (
          <button className="attend-btn" onClick={onMarkAttendance}>
            تأكيد الحضور
          </button>
        )}

        {item.attended && (
          <div className="attended-info">
            <CheckCircle size={20} color="#2ecc71" />
            <span>تم تسجيل حضورك</span>
          </div>
        )}
      </div>
    </div>
  );
}
