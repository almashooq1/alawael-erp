/**
 * مكون نظام الحضور والانصراف الذكي - React
 * واجهة احترافية متقدمة
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './AttendanceSystem.css';

// ============================================================================
// المكون الرئيسي
// ============================================================================

const AttendanceSystem = () => {
  const [activeTab, setActiveTab] = useState('check-in');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [dailyStatus, setDailyStatus] = useState(null);
  const [location, setLocation] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // الحصول على موقع الموظف
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          console.log('خطأ في الحصول على الموقع:', error);
        }
      );
    }
  }, []);

  // الحصول على حالة الحضور اليومية
  useEffect(() => {
    fetchDailyStatus();
    const interval = setInterval(fetchDailyStatus, 60000); // تحديث كل دقيقة
    return () => clearInterval(interval);
  }, []);

  // ============================================================================
  // دوال الحضور والانصراف
  // ============================================================================

  const fetchDailyStatus = async () => {
    try {
      const employeeId = localStorage.getItem('employeeId');
      if (!employeeId) return;

      const response = await axios.get(
        `/api/attendance/daily-status/${employeeId}`
      );

      if (response.data.success) {
        setDailyStatus(response.data.data);
      }
    } catch (error) {
      console.log('خطأ في جلب الحالة:', error);
    }
  };

  const handleCheckIn = async () => {
    if (!location) {
      setMessage('يرجى تفعيل خدمة الموقع');
      return;
    }

    setLoading(true);
    try {
      const employeeId = localStorage.getItem('employeeId');
      const photo = await capturePhoto();

      const response = await axios.post('/api/attendance/check-in', {
        employeeId,
        location,
        photo,
        verificationMethod: 'تطبيق الجوال',
        deviceId: getDeviceId()
      });

      if (response.data.success) {
        setMessage('✓ تم تسجيل الحضور بنجاح');
        if (response.data.isLate) {
          setMessage('⚠ تم تسجيل الحضور - لاحظ: أنت متأخر');
        }
        fetchDailyStatus();
      }
    } catch (error) {
      setMessage('✗ ' + (error.response?.data?.message || 'خطأ في التسجيل'));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!location) {
      setMessage('يرجى تفعيل خدمة الموقع');
      return;
    }

    setLoading(true);
    try {
      const employeeId = localStorage.getItem('employeeId');
      const photo = await capturePhoto();

      const response = await axios.post('/api/attendance/check-out', {
        employeeId,
        location,
        photo
      });

      if (response.data.success) {
        setMessage('✓ تم تسجيل الانصراف بنجاح');
        setMessage(`مدة العمل: ${response.data.workDuration} ساعة`);
        if (response.data.overtime > 0) {
          setMessage(`+ إضافي: ${response.data.overtime / 60} ساعة`);
        }
        fetchDailyStatus();
      }
    } catch (error) {
      setMessage('✗ ' + (error.response?.data?.message || 'خطأ في التسجيل'));
    } finally {
      setLoading(false);
    }
  };

  const capturePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;

      return new Promise((resolve) => {
        setTimeout(() => {
          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');
          context.drawImage(videoRef.current, 0, 0);
          const photo = canvas.toDataURL('image/jpeg');
          
          stream.getTracks().forEach(track => track.stop());
          resolve(photo);
        }, 500);
      });
    } catch (error) {
      console.log('خطأ في التقاط الصورة:', error);
      return null;
    }
  };

  const getDeviceId = () => {
    return localStorage.getItem('deviceId') || 'WEB_' + Date.now();
  };

  // ============================================================================
  // واجهة المستخدم
  // ============================================================================

  return (
    <div className="attendance-system">
      <div className="container">
        {/* الرأس */}
        <div className="header">
          <h1>🕐 نظام الحضور والانصراف الذكي</h1>
          <p className="subtitle">إدارة الحضور والانصراف بكل سهولة</p>
        </div>

        {/* التبويبات */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'check-in' ? 'active' : ''}`}
            onClick={() => setActiveTab('check-in')}
          >
            📥 الحضور
          </button>
          <button
            className={`tab ${activeTab === 'check-out' ? 'active' : ''}`}
            onClick={() => setActiveTab('check-out')}
          >
            📤 الانصراف
          </button>
          <button
            className={`tab ${activeTab === 'records' ? 'active' : ''}`}
            onClick={() => setActiveTab('records')}
          >
            📊 السجلات
          </button>
          <button
            className={`tab ${activeTab === 'leave' ? 'active' : ''}`}
            onClick={() => setActiveTab('leave')}
          >
            🏖️ الإجازات
          </button>
          <button
            className={`tab ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            📈 التقارير
          </button>
        </div>

        {/* الرسالة */}
        {message && (
          <div className={`message ${message.includes('✗') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        {/* محتوى التبويبات */}
        <div className="content">
          {/* تبويب الحضور */}
          {activeTab === 'check-in' && (
            <CheckInTab
              dailyStatus={dailyStatus}
              loading={loading}
              onCheckIn={handleCheckIn}
              location={location}
            />
          )}

          {/* تبويب الانصراف */}
          {activeTab === 'check-out' && (
            <CheckOutTab
              dailyStatus={dailyStatus}
              loading={loading}
              onCheckOut={handleCheckOut}
              location={location}
            />
          )}

          {/* تبويب السجلات */}
          {activeTab === 'records' && <RecordsTab />}

          {/* تبويب الإجازات */}
          {activeTab === 'leave' && <LeaveTab />}

          {/* تبويب التقارير */}
          {activeTab === 'reports' && <ReportsTab />}
        </div>

        {/* كاميرا مخفية */}
        <video ref={videoRef} style={{ display: 'none' }} width="320" height="240" />
        <canvas ref={canvasRef} style={{ display: 'none' }} width="320" height="240" />
      </div>
    </div>
  );
};

// ============================================================================
// مكون تبويب الحضور
// ============================================================================

const CheckInTab = ({ dailyStatus, loading, onCheckIn, location }) => {
  return (
    <div className="tab-content check-in-tab">
      <div className="status-card">
        <div className="status-header">
          <h2>🕐 تسجيل الحضور</h2>
        </div>

        <div className="status-info">
          {dailyStatus?.checkedIn ? (
            <div className="checked-in">
              <div className="icon">✓</div>
              <div className="text">
                <p className="label">تم تسجيل الحضور</p>
                <p className="time">
                  {new Date(dailyStatus.checkInTime).toLocaleTimeString('ar-SA')}
                </p>
                {dailyStatus.isLate && (
                  <p className="late-warning">
                    ⚠️ متأخر بـ {dailyStatus.latenessMinutes} دقيقة
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="not-checked-in">
              <div className="icon">⏱️</div>
              <p className="label">لم يتم تسجيل الحضور بعد</p>
            </div>
          )}
        </div>

        <div className="location-info">
          <p>📍 الموقع الحالي:</p>
          {location ? (
            <p className="coordinates">
              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </p>
          ) : (
            <p className="no-location">جاري الحصول على الموقع...</p>
          )}
        </div>

        <button
          className={`btn btn-primary btn-large ${loading ? 'loading' : ''}`}
          onClick={onCheckIn}
          disabled={loading || dailyStatus?.checkedIn}
        >
          {loading ? '⏳ جاري المعالجة...' : '📥 تسجيل الحضور'}
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// مكون تبويب الانصراف
// ============================================================================

const CheckOutTab = ({ dailyStatus, loading, onCheckOut, location }) => {
  return (
    <div className="tab-content check-out-tab">
      <div className="status-card">
        <div className="status-header">
          <h2>🕐 تسجيل الانصراف</h2>
        </div>

        <div className="status-info">
          {dailyStatus?.checkedOut ? (
            <div className="checked-out">
              <div className="icon">✓</div>
              <div className="text">
                <p className="label">تم تسجيل الانصراف</p>
                <p className="time">
                  {new Date(dailyStatus.checkOutTime).toLocaleTimeString('ar-SA')}
                </p>
              </div>
            </div>
          ) : (
            <div className="not-checked-out">
              <div className="icon">🔔</div>
              <p className="label">
                {dailyStatus?.checkedIn ? 'جاهز للانصراف' : 'تسجيل الحضور أولاً'}
              </p>
            </div>
          )}
        </div>

        <div className="location-info">
          <p>📍 الموقع الحالي:</p>
          {location ? (
            <p className="coordinates">
              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </p>
          ) : (
            <p className="no-location">جاري الحصول على الموقع...</p>
          )}
        </div>

        <button
          className={`btn btn-primary btn-large ${loading ? 'loading' : ''}`}
          onClick={onCheckOut}
          disabled={loading || !dailyStatus?.checkedIn || dailyStatus?.checkedOut}
        >
          {loading ? '⏳ جاري المعالجة...' : '📤 تسجيل الانصراف'}
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// مكون تبويب السجلات
// ============================================================================

const RecordsTab = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const employeeId = localStorage.getItem('employeeId');
      const response = await axios.get(
        `/api/attendance/records/${employeeId}`,
        {
          params: {
            startDate: dateRange.start,
            endDate: dateRange.end
          }
        }
      );

      if (response.data.success) {
        setRecords(response.data.data);
      }
    } catch (error) {
      console.log('خطأ في جلب السجلات:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return (
    <div className="tab-content records-tab">
      <div className="filters">
        <input
          type="date"
          value={dateRange.start}
          onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
        />
        <span>إلى</span>
        <input
          type="date"
          value={dateRange.end}
          onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
        />
      </div>

      {loading ? (
        <div className="loading">⏳ جاري التحميل...</div>
      ) : (
        <div className="records-list">
          {records.map((record) => (
            <div key={record._id} className="record-item">
              <div className="record-header">
                <span className="date">
                  📅 {new Date(record.date).toLocaleDateString('ar-SA')}
                </span>
                <span className={`status ${record.status}`}>
                  {record.status}
                </span>
              </div>

              <div className="record-details">
                <div className="detail">
                  <span className="label">الحضور:</span>
                  <span className="value">
                    {new Date(record.checkInTime).toLocaleTimeString('ar-SA')}
                  </span>
                </div>

                {record.checkOutTime && (
                  <div className="detail">
                    <span className="label">الانصراف:</span>
                    <span className="value">
                      {new Date(record.checkOutTime).toLocaleTimeString('ar-SA')}
                    </span>
                  </div>
                )}

                {record.workDuration && (
                  <div className="detail">
                    <span className="label">ساعات العمل:</span>
                    <span className="value">{record.workDuration} ساعة</span>
                  </div>
                )}

                {record.latenessMinutes > 0 && (
                  <div className="detail warning">
                    <span className="label">التأخير:</span>
                    <span className="value">{record.latenessMinutes} دقيقة</span>
                  </div>
                )}

                {record.overtimeMinutes > 0 && (
                  <div className="detail success">
                    <span className="label">إضافي:</span>
                    <span className="value">{(record.overtimeMinutes / 60).toFixed(2)} ساعة</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {records.length === 0 && (
            <div className="empty-state">
              <p>📭 لا توجد سجلات في هذه الفترة</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// مكون تبويب الإجازات
// ============================================================================

const LeaveTab = () => {
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: 'إجازة سنوية',
    startDate: '',
    endDate: '',
    reason: ''
  });

  useEffect(() => {
    fetchLeaveBalance();
  }, []);

  const fetchLeaveBalance = async () => {
    try {
      const employeeId = localStorage.getItem('employeeId');
      const response = await axios.get(`/api/leave/balance/${employeeId}`);
      setLeaveBalance(response.data.data);
    } catch (error) {
      console.log('خطأ في جلب الرصيد:', error);
    }
  };

  const handleRequestLeave = async () => {
    try {
      const employeeId = localStorage.getItem('employeeId');
      const response = await axios.post('/api/leave/request', {
        employeeId,
        ...formData
      });

      if (response.data.success) {
        alert('✓ تم إرسال طلب الإجازة بنجاح');
        setShowRequestForm(false);
        setFormData({
          leaveType: 'إجازة سنوية',
          startDate: '',
          endDate: '',
          reason: ''
        });
      }
    } catch (error) {
      alert('✗ ' + (error.response?.data?.message || 'خطأ في إرسال الطلب'));
    }
  };

  return (
    <div className="tab-content leave-tab">
      {/* رصيد الإجازات */}
      <div className="leave-balance">
        <h3>رصيد الإجازات</h3>
        <div className="balance-cards">
          <div className="balance-card">
            <div className="leave-type">🏖️ إجازة سنوية</div>
            <div className="balance-info">
              <p className="remaining">
                {leaveBalance?.annualLeaveRemaining || 0} أيام متبقية
              </p>
              <p className="used">
                ({leaveBalance?.annualLeaveUsed || 0} مستخدمة)
              </p>
            </div>
          </div>

          <div className="balance-card">
            <div className="leave-type">🤒 إجازة مرضية</div>
            <div className="balance-info">
              <p className="remaining">
                {leaveBalance?.sickLeaveRemaining || 0} أيام متبقية
              </p>
              <p className="used">
                ({leaveBalance?.sickLeaveUsed || 0} مستخدمة)
              </p>
            </div>
          </div>

          <div className="balance-card">
            <div className="leave-type">📌 إجازة استثنائية</div>
            <div className="balance-info">
              <p className="remaining">
                {leaveBalance?.exceptionalLeaveRemaining || 0} أيام متبقية
              </p>
              <p className="used">
                ({leaveBalance?.exceptionalLeaveUsed || 0} مستخدمة)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* نموذج طلب إجازة */}
      {showRequestForm && (
        <div className="leave-form">
          <h3>طلب إجازة جديدة</h3>
          <div className="form-group">
            <label>نوع الإجازة</label>
            <select
              value={formData.leaveType}
              onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
            >
              <option>إجازة سنوية</option>
              <option>إجازة مرضية</option>
              <option>إجازة استثنائية</option>
            </select>
          </div>

          <div className="form-group">
            <label>من تاريخ</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>إلى تاريخ</label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>السبب</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="اكتب سبب الإجازة..."
            />
          </div>

          <div className="form-buttons">
            <button className="btn btn-primary" onClick={handleRequestLeave}>
              ✓ إرسال الطلب
            </button>
            <button className="btn btn-secondary" onClick={() => setShowRequestForm(false)}>
              ✕ إلغاء
            </button>
          </div>
        </div>
      )}

      {!showRequestForm && (
        <button className="btn btn-primary" onClick={() => setShowRequestForm(true)}>
          + طلب إجازة جديدة
        </button>
      )}
    </div>
  );
};

// ============================================================================
// مكون تبويب التقارير
// ============================================================================

const ReportsTab = () => {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [months, setMonths] = useState(3);

  const fetchStatistics = useCallback(async () => {
    setLoading(true);
    try {
      const employeeId = localStorage.getItem('employeeId');
      const response = await axios.get(
        `/api/attendance/statistics/${employeeId}`,
        { params: { months } }
      );
      setStatistics(response.data.data);
    } catch (error) {
      console.log('خطأ في جلب الإحصائيات:', error);
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return (
    <div className="tab-content reports-tab">
      <div className="report-header">
        <h3>📈 إحصائيات الحضور</h3>
        <div className="month-selector">
          <button onClick={() => setMonths(1)}>شهر واحد</button>
          <button className={months === 3 ? 'active' : ''} onClick={() => setMonths(3)}>
            3 أشهر
          </button>
          <button onClick={() => setMonths(6)}>6 أشهر</button>
          <button onClick={() => setMonths(12)}>سنة كاملة</button>
        </div>
      </div>

      {loading ? (
        <div className="loading">⏳ جاري تحميل التقرير...</div>
      ) : statistics ? (
        <div className="report-content">
          {/* ملخص الحضور */}
          <div className="section">
            <h4>📊 ملخص الحضور</h4>
            <div className="stats-grid">
              <div className="stat-item success">
                <div className="icon">✓</div>
                <div className="info">
                  <p className="label">حاضر</p>
                  <p className="value">{statistics.attendance.present}</p>
                </div>
              </div>

              <div className="stat-item danger">
                <div className="icon">✕</div>
                <div className="info">
                  <p className="label">غياب</p>
                  <p className="value">{statistics.attendance.absent}</p>
                </div>
              </div>

              <div className="stat-item warning">
                <div className="icon">⚠️</div>
                <div className="info">
                  <p className="label">متأخر</p>
                  <p className="value">{statistics.attendance.late}</p>
                </div>
              </div>

              <div className="stat-item info">
                <div className="icon">📅</div>
                <div className="info">
                  <p className="label">إجازة</p>
                  <p className="value">{statistics.attendance.onLeave}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ملخص الوقت */}
          <div className="section">
            <h4>⏱️ ملخص الوقت</h4>
            <div className="stats-grid">
              <div className="stat-card">
                <p className="label">إجمالي ساعات العمل</p>
                <p className="value">{statistics.time.totalWorkHours.toFixed(2)}</p>
              </div>

              <div className="stat-card">
                <p className="label">إجمالي الإضافي</p>
                <p className="value">{statistics.time.totalOvertimeHours.toFixed(2)}</p>
              </div>

              <div className="stat-card">
                <p className="label">متوسط ساعات اليوم</p>
                <p className="value">{statistics.time.averageDailyHours.toFixed(2)}</p>
              </div>

              <div className="stat-card">
                <p className="label">متوسط التأخير</p>
                <p className="value">{statistics.time.averageLatenessMinutes.toFixed(0)} دقيقة</p>
              </div>
            </div>
          </div>

          {/* مؤشرات الجودة */}
          <div className="section">
            <h4>📈 مؤشرات الجودة</h4>
            <div className="progress-bars">
              <div className="progress-item">
                <p className="label">معدل الحضور</p>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${statistics.quality.attendanceRate}%` }}
                  />
                </div>
                <p className="percentage">{statistics.quality.attendanceRate}%</p>
              </div>

              <div className="progress-item">
                <p className="label">معدل الالتزام بالموعد</p>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${statistics.quality.punctualityRate}%` }}
                  />
                </div>
                <p className="percentage">{statistics.quality.punctualityRate}%</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <p>📭 لا توجد بيانات متاحة</p>
        </div>
      )}
    </div>
  );
};

export default AttendanceSystem;
