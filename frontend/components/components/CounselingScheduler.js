/**
 * CounselingScheduler.js - Counseling Session Scheduling Component
 * Book, manage, and track counseling sessions
 */

import React, { useState, useEffect } from 'react';
import './CounselingScheduler.css';

const CounselingScheduler = ({ beneficiaryId, isCounselor = false }) => {
  const [sessions, setSessions] = useState([]);
  const [counselors, setCounselors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewType, setViewType] = useState('list');

  useEffect(() => {
    fetchData();
  }, [beneficiaryId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sessionRes, counselorRes] = await Promise.all([
        fetch(`/api/counseling/sessions?beneficiaryId=${beneficiaryId}`),
        fetch('/api/counselors/available'),
      ]);

      if (!sessionRes.ok || !counselorRes.ok) throw new Error('Failed to fetch data');

      const sessionData = await sessionRes.json();
      const counselorData = await counselorRes.json();

      setSessions(sessionData.data.sessions || []);
      setCounselors(counselorData.data.counselors || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSession = async formData => {
    try {
      const response = await fetch('/api/counseling/sessions/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beneficiaryId,
          ...formData,
        }),
      });

      if (!response.ok) throw new Error('Failed to book session');

      setShowBookingForm(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelSession = async sessionId => {
    if (!window.confirm('Are you sure you want to cancel this session?')) return;

    try {
      const response = await fetch(`/api/counseling/sessions/${sessionId}/cancel`, {
        method: 'PUT',
      });

      if (!response.ok) throw new Error('Failed to cancel session');

      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRescheduleSession = async (sessionId, newDate, newTime) => {
    try {
      const response = await fetch(`/api/counseling/sessions/${sessionId}/reschedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionDate: newDate, sessionTime: newTime }),
      });

      if (!response.ok) throw new Error('Failed to reschedule session');

      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCompleteSession = async (sessionId, notes, recommendations) => {
    try {
      const response = await fetch(`/api/counseling/sessions/${sessionId}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionNotes: notes, recommendations }),
      });

      if (!response.ok) throw new Error('Failed to mark session as complete');

      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredSessions = sessions.filter(
    s => filterStatus === 'all' || s.status === filterStatus
  );

  const upcomingSessions = filteredSessions.filter(
    s => new Date(s.sessionDate) > new Date() && s.status !== 'CANCELLED'
  );

  const completedSessions = filteredSessions.filter(s => s.status === 'COMPLETED');
  const cancelledSessions = filteredSessions.filter(s => s.status === 'CANCELLED');

  if (loading) return <div className="loading">Loading counseling sessions...</div>;

  return (
    <div className="counseling-scheduler">
      <div className="scheduler-header">
        <h2>Counseling Sessions</h2>
        <div className="header-controls">
          <div className="view-toggle">
            <button
              className={`view-btn ${viewType === 'list' ? 'active' : ''}`}
              onClick={() => setViewType('list')}
            >
              📋 List
            </button>
            <button
              className={`view-btn ${viewType === 'calendar' ? 'active' : ''}`}
              onClick={() => setViewType('calendar')}
            >
              📅 Calendar
            </button>
          </div>
          <button className="btn-book-session" onClick={() => setShowBookingForm(!showBookingForm)}>
            + Book Session
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showBookingForm && (
        <BookingForm
          counselors={counselors}
          onSubmit={handleBookSession}
          onCancel={() => setShowBookingForm(false)}
        />
      )}

      {/* Filter */}
      <div className="filter-section">
        <label>Filter by Status:</label>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Sessions</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Sessions View */}
      {viewType === 'list' ? (
        <>
          {/* Upcoming Sessions */}
          {upcomingSessions.length > 0 && (
            <div className="sessions-section">
              <h3>📅 Upcoming Sessions</h3>
              <div className="sessions-list">
                {upcomingSessions.map(session => (
                  <div key={session._id} className="session-card upcoming">
                    <div className="session-header">
                      <div className="session-title">
                        <h4>{session.counselorName}</h4>
                        <p className="counselor-specialty">{session.specialization}</p>
                      </div>
                      <span className="session-status">{session.status}</span>
                    </div>

                    <div className="session-details">
                      <div className="detail-row">
                        <span className="label">📅 Date:</span>
                        <span className="value">
                          {new Date(session.sessionDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="label">⏰ Time:</span>
                        <span className="value">{session.sessionTime}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">⏱️ Duration:</span>
                        <span className="value">{session.duration} minutes</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">📍 Location:</span>
                        <span className="value">{session.location || 'Virtual'}</span>
                      </div>
                      {session.topic && (
                        <div className="detail-row">
                          <span className="label">📝 Topic:</span>
                          <span className="value">{session.topic}</span>
                        </div>
                      )}
                    </div>

                    <div className="session-actions">
                      <button
                        className="btn-reschedule"
                        onClick={() => {
                          // Show reschedule form
                          const newDate = prompt(
                            'Enter new date (YYYY-MM-DD):',
                            new Date(session.sessionDate).toISOString().split('T')[0]
                          );
                          if (newDate) {
                            const newTime = prompt('Enter new time (HH:MM):', session.sessionTime);
                            if (newTime) {
                              handleRescheduleSession(session._id, newDate, newTime);
                            }
                          }
                        }}
                      >
                        📅 Reschedule
                      </button>
                      <button
                        className="btn-cancel"
                        onClick={() => handleCancelSession(session._id)}
                      >
                        ✕ Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Sessions */}
          {completedSessions.length > 0 && (
            <div className="sessions-section">
              <h3>✓ Completed Sessions ({completedSessions.length})</h3>
              <div className="sessions-list">
                {completedSessions.map(session => (
                  <div key={session._id} className="session-card completed">
                    <div className="session-header">
                      <div className="session-title">
                        <h4>{session.counselorName}</h4>
                        <p className="session-date">
                          {new Date(session.sessionDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="completion-badge">✓ Completed</span>
                    </div>

                    {session.sessionNotes && (
                      <div className="session-notes">
                        <strong>Notes:</strong>
                        <p>{session.sessionNotes}</p>
                      </div>
                    )}

                    {session.recommendations && session.recommendations.length > 0 && (
                      <div className="recommendations">
                        <strong>Recommendations:</strong>
                        <ul>
                          {session.recommendations.map((rec, idx) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <button
                      className="btn-view-details"
                      onClick={() => setSelectedSession(session)}
                    >
                      View Full Details →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cancelled Sessions */}
          {cancelledSessions.length > 0 && (
            <div className="sessions-section">
              <h3>⊘ Cancelled Sessions ({cancelledSessions.length})</h3>
              <div className="sessions-list">
                {cancelledSessions.map(session => (
                  <div key={session._id} className="session-card cancelled">
                    <div className="session-header">
                      <h4>{session.counselorName}</h4>
                      <span className="cancelled-badge">Cancelled</span>
                    </div>
                    <p className="cancelled-date">
                      Was scheduled for {new Date(session.sessionDate).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredSessions.length === 0 && <p className="no-data">No sessions found</p>}
        </>
      ) : (
        <div className="calendar-view">
          <CalendarView sessions={sessions} />
        </div>
      )}

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="modal-overlay" onClick={() => setSelectedSession(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedSession(null)}>
              ✕
            </button>
            <h2>Session Details</h2>
            <div className="modal-body">
              <p>
                <strong>Counselor:</strong> {selectedSession.counselorName}
              </p>
              <p>
                <strong>Date:</strong> {new Date(selectedSession.sessionDate).toLocaleDateString()}
              </p>
              <p>
                <strong>Time:</strong> {selectedSession.sessionTime}
              </p>
              <p>
                <strong>Duration:</strong> {selectedSession.duration} minutes
              </p>
              <p>
                <strong>Status:</strong> {selectedSession.status}
              </p>
              {selectedSession.sessionNotes && (
                <p>
                  <strong>Notes:</strong> {selectedSession.sessionNotes}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function BookingForm({ counselors, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    counselorId: '',
    sessionDate: '',
    sessionTime: '09:00',
    duration: 30,
    topic: '',
    location: 'VIRTUAL',
  });

  const handleSubmit = e => {
    e.preventDefault();
    if (!formData.counselorId || !formData.sessionDate) {
      alert('Please fill in all required fields');
      return;
    }
    onSubmit(formData);
  };

  const getAvailableSlots = () => {
    const slots = [];
    for (let hour = 9; hour < 17; hour++) {
      for (let min = 0; min < 60; min += 30) {
        slots.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
      }
    }
    return slots;
  };

  return (
    <div className="booking-form">
      <h3>Book a Counseling Session</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Counselor *</label>
          <select
            value={formData.counselorId}
            onChange={e => setFormData({ ...formData, counselorId: e.target.value })}
            required
          >
            <option value="">Select a counselor</option>
            {counselors.map(counselor => (
              <option key={counselor._id} value={counselor._id}>
                {counselor.name} - {counselor.specialization}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Date *</label>
            <input
              type="date"
              value={formData.sessionDate}
              onChange={e => setFormData({ ...formData, sessionDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="form-group">
            <label>Time *</label>
            <select
              value={formData.sessionTime}
              onChange={e => setFormData({ ...formData, sessionTime: e.target.value })}
            >
              {getAvailableSlots().map(slot => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Session Topic</label>
          <input
            type="text"
            placeholder="e.g., Academic Concerns, Career Planning"
            value={formData.topic}
            onChange={e => setFormData({ ...formData, topic: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Session Type</label>
          <select
            value={formData.location}
            onChange={e => setFormData({ ...formData, location: e.target.value })}
          >
            <option value="VIRTUAL">Virtual (Online)</option>
            <option value="ON_CAMPUS">On Campus</option>
            <option value="HYBRID">Hybrid</option>
          </select>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-submit">
            Book Session
          </button>
          <button type="button" onClick={onCancel} className="btn-cancel">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function CalendarView({ sessions }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = date => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = date => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button
          onClick={() =>
            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
          }
        >
          ←
        </button>
        <h3>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
        <button
          onClick={() =>
            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
          }
        >
          →
        </button>
      </div>

      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="calendar-day-header">
            {day}
          </div>
        ))}

        {days.map((day, idx) => {
          const daySessionCount = day
            ? sessions.filter(s => {
                const sDate = new Date(s.sessionDate);
                return (
                  sDate.getDate() === day &&
                  sDate.getMonth() === currentMonth.getMonth() &&
                  sDate.getFullYear() === currentMonth.getFullYear()
                );
              }).length
            : 0;

          return (
            <div
              key={idx}
              className={`calendar-day ${day ? '' : 'empty'} ${daySessionCount > 0 ? 'has-sessions' : ''}`}
            >
              {day && (
                <>
                  <span className="day-number">{day}</span>
                  {daySessionCount > 0 && <span className="session-count">{daySessionCount}</span>}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CounselingScheduler;
