/**
 * AttendanceTracker.js - Attendance Tracking Component
 * Record and monitor attendance records
 */

import React, { useState, useEffect } from 'react';
import './AttendanceTracker.css';

const AttendanceTracker = ({ beneficiaryId }) => {
  const [records, setRecords] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('semester');
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetchAttendanceData();
  }, [beneficiaryId, selectedPeriod]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/attendance/${beneficiaryId}/report?period=${selectedPeriod}`
      );

      if (!response.ok) throw new Error('Failed to fetch attendance data');

      const data = await response.json();
      setRecords(data.data.records || []);
      setStatistics(data.data);

      // Fetch alerts
      const alertResponse = await fetch(
        `/api/attendance/${beneficiaryId}/threshold-check?period=${selectedPeriod}`
      );
      const alertData = await alertResponse.json();
      setAlerts(alertData.data.alerts || []);

      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordAttendance = async (formData) => {
    try {
      const response = await fetch('/api/attendance/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beneficiaryId,
          ...formData
        })
      });

      if (!response.ok) throw new Error('Failed to record attendance');

      setShowRecordForm(false);
      fetchAttendanceData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExportAttendance = async () => {
    try {
      const response = await fetch(
        `/api/attendance/${beneficiaryId}/export?startDate=2025-01-01&endDate=2025-12-31`
      );

      if (!response.ok) throw new Error('Failed to export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${beneficiaryId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="loading">Loading attendance data...</div>;
  }

  return (
    <div className="attendance-tracker">
      <div className="tracker-header">
        <h2>Attendance Tracking</h2>
        <div className="header-actions">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="period-select"
          >
            <option value="semester">This Semester</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>
          <button
            className="btn-record"
            onClick={() => setShowRecordForm(!showRecordForm)}
          >
            + Record Attendance
          </button>
          <button className="btn-export" onClick={handleExportAttendance}>
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="alerts-section">
          {alerts.map((alert, idx) => (
            <div key={idx} className="alert alert-warning">
              <span className="alert-icon">⚠️</span>
              <p>{alert}</p>
            </div>
          ))}
        </div>
      )}

      {/* Statistics */}
      {statistics && (
        <div className="statistics-grid">
          <div className="stat-box">
            <h4>Total Days</h4>
            <p className="stat-value">{statistics.totalRecords || 0}</p>
          </div>
          <div className="stat-box present">
            <h4>Present</h4>
            <p className="stat-value">{statistics.presentCount || 0}</p>
          </div>
          <div className="stat-box absent">
            <h4>Absent</h4>
            <p className="stat-value">{statistics.absentCount || 0}</p>
          </div>
          <div className="stat-box late">
            <h4>Late</h4>
            <p className="stat-value">{statistics.lateCount || 0}</p>
          </div>
          <div className="stat-box excused">
            <h4>Excused</h4>
            <p className="stat-value">{statistics.excusedCount || 0}</p>
          </div>
          <div className="stat-box rate">
            <h4>Attendance Rate</h4>
            <p className="stat-value">{statistics.attendanceRate?.toFixed(1)}%</p>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${statistics.attendanceRate || 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Record Form */}
      {showRecordForm && (
        <div className="record-form">
          <h3>Record Attendance</h3>
          <AttendanceForm onSubmit={handleRecordAttendance} />
        </div>
      )}

      {/* Records Table */}
      <div className="records-section">
        <h3>Attendance Records</h3>
        {records.length > 0 ? (
          <table className="records-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Course</th>
                <th>Time</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record, idx) => (
                <tr key={idx} className={`status-${record.status}`}>
                  <td>{new Date(record.attendanceDate).toLocaleDateString()}</td>
                  <td><span className={`status-badge status-${record.status}`}>{record.status}</span></td>
                  <td>{record.courseCode} - {record.courseName}</td>
                  <td>{record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : '-'}</td>
                  <td>{record.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-data">No attendance records</p>
        )}
      </div>
    </div>
  );
};

function AttendanceForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    courseId: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ date: new Date().toISOString().split('T')[0], status: 'present', courseId: '', notes: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-group">
        <label>Date</label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({...formData, date: e.target.value})}
          required
        />
      </div>
      <div className="form-group">
        <label>Status</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({...formData, status: e.target.value})}
        >
          <option value="present">Present</option>
          <option value="absent">Absent</option>
          <option value="late">Late</option>
          <option value="excused">Excused</option>
        </select>
      </div>
      <div className="form-group">
        <label>Course</label>
        <input
          type="text"
          placeholder="Course ID"
          value={formData.courseId}
          onChange={(e) => setFormData({...formData, courseId: e.target.value})}
          required
        />
      </div>
      <div className="form-group">
        <label>Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder="Optional notes"
        ></textarea>
      </div>
      <button type="submit" className="btn-submit">Record Attendance</button>
    </form>
  );
}

export default AttendanceTracker;
