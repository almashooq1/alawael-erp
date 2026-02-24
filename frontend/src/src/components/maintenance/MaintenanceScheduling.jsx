import React, { useState } from 'react';

/**
 * =====================================================
 * MAINTENANCE SCHEDULING - جدولة الصيانة الذكية
 * =====================================================
 * 
 * المميزات:
 * ✅ جداول دورية (يومي، أسبوعي، شهري، سنوي)
 * ✅ جداول بناءً على الكيلومترات
 * ✅ جداول ذكية بناءً على الحالة
 * ✅ إدارة المهام والموارد
 * ✅ إشعارات واضحة
 */
const MaintenanceScheduling = ({ vehicles, onVehicleSelect }) => {
  const [formData, setFormData] = useState({
    vehicleId: '',
    maintenanceType: 'زيت',
    scheduleType: 'recurring',
    frequency: { unit: 'month', value: 3 },
    estimatedCost: 500,
    description: '',
    assignedTechnician: '',
    location: '',
  });

  const [schedules, setSchedules] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const maintenanceTypes = [
    'زيت', 'فلاتر', 'إطارات', 'فرامل', 'بطارية',
    'تغييرات السوائل', 'فحص شامل', 'أخرى'
  ];

  const frequencyUnits = ['day', 'week', 'month', 'year'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('frequency')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        frequency: {
          ...formData.frequency,
          [field]: field === 'unit' ? value : parseInt(value)
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/v1/maintenance/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        setSchedules([...schedules, result.data]);
        setFormData({
          vehicleId: '',
          maintenanceType: 'زيت',
          scheduleType: 'recurring',
          frequency: { unit: 'month', value: 3 },
          estimatedCost: 500,
          description: '',
          assignedTechnician: '',
          location: '',
        });
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 3000);
      }
    } catch (error) {
      console.error('خطأ في إنشاء الجدول:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="maintenance-scheduling">
      {/* رسالة النجاح */}
      {submitted && (
        <div className="alert alert-success">
          ✅ تم إنشاء جدول الصيانة بنجاح
        </div>
      )}

      <div className="scheduling-container">
        {/* نموذج الجدولة */}
        <div className="scheduling-form">
          <h3>📅 إنشاء جدول صيانة جديد</h3>
          
          <form onSubmit={handleSubmit}>
            {/* اختيار المركبة */}
            <div className="form-group">
              <label>🚗 المركبة *</label>
              <select
                name="vehicleId"
                value={formData.vehicleId}
                onChange={handleInputChange}
                required
              >
                <option value="">اختر مركبة...</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle._id} value={vehicle._id}>
                    {vehicle.name} - {vehicle.licensePlate}
                  </option>
                ))}
              </select>
            </div>

            {/* نوع الصيانة */}
            <div className="form-group">
              <label>🔧 نوع الصيانة *</label>
              <select
                name="maintenanceType"
                value={formData.maintenanceType}
                onChange={handleInputChange}
              >
                {maintenanceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* نوع الجدول */}
            <div className="form-group">
              <label>📊 نوع الجدول *</label>
              <select
                name="scheduleType"
                value={formData.scheduleType}
                onChange={handleInputChange}
              >
                <option value="recurring">دوري منتظم</option>
                <option value="mileage">بناءً على الكيلومترات</option>
                <option value="condition">بناءً على الحالة</option>
                <option value="custom">مخصص</option>
              </select>
            </div>

            {/* التكرار */}
            {formData.scheduleType === 'recurring' && (
              <div className="form-row">
                <div className="form-group">
                  <label>التكرار *</label>
                  <div className="frequency-input">
                    <input
                      type="number"
                      name="frequency.value"
                      value={formData.frequency.value}
                      onChange={handleInputChange}
                      min="1"
                      max="12"
                    />
                    <select
                      name="frequency.unit"
                      value={formData.frequency.unit}
                      onChange={handleInputChange}
                    >
                      {frequencyUnits.map((unit) => (
                        <option key={unit} value={unit}>
                          {getUnitLabel(unit)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* التكلفة المقدرة */}
            <div className="form-group">
              <label>💰 التكلفة المقدرة (ريال)</label>
              <input
                type="number"
                name="estimatedCost"
                value={formData.estimatedCost}
                onChange={handleInputChange}
                min="0"
              />
            </div>

            {/* الوصف */}
            <div className="form-group">
              <label>📝 الوصف</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                placeholder="أضف ملاحظات إضافية..."
              />
            </div>

            {/* الفني المكلف */}
            <div className="form-group">
              <label>👨‍🔧 الفني المكلف</label>
              <input
                type="text"
                name="assignedTechnician"
                value={formData.assignedTechnician}
                onChange={handleInputChange}
                placeholder="اسم الفني"
              />
            </div>

            {/* الموقع */}
            <div className="form-group">
              <label>📍 موقع الصيانة</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="مركز الصيانة أو الموقع"
              />
            </div>

            {/* الأزرار */}
            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'جاري الحفظ...' : '✅ حفظ الجدول'}
              </button>
              <button type="reset" className="btn btn-secondary">
                🔄 إعادة تعيين
              </button>
            </div>
          </form>
        </div>

        {/* قائمة الجداول */}
        <div className="schedules-list">
          <h3>📋 جداول الصيانة الحالية</h3>
          
          {schedules.length > 0 ? (
            <div className="schedules-container">
              {schedules.map((schedule, index) => (
                <div key={schedule._id || index} className="schedule-card">
                  <div className="schedule-header">
                    <h4>{schedule.maintenanceType}</h4>
                    <span className="schedule-type">{schedule.scheduleType}</span>
                  </div>
                  <div className="schedule-body">
                    <p><strong>المركبة:</strong> {schedule.vehicleId}</p>
                    <p><strong>التكرار:</strong> كل {schedule.frequency.value} {getUnitLabel(schedule.frequency.unit)}</p>
                    <p><strong>التكلفة:</strong> {schedule.estimatedCost} ريال</p>
                    {schedule.assignedTechnician && (
                      <p><strong>الفني:</strong> {schedule.assignedTechnician}</p>
                    )}
                  </div>
                  <div className="schedule-actions">
                    <button className="btn btn-small btn-info">✏️ تعديل</button>
                    <button className="btn btn-small btn-danger">🗑️ حذف</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-message">لم يتم إنشاء أي جداول بعد</p>
          )}
        </div>
      </div>
    </div>
  );
};

// دالة مساعدة
function getUnitLabel(unit) {
  const labels = {
    'day': 'يوم',
    'week': 'أسبوع',
    'month': 'شهر',
    'year': 'سنة'
  };
  return labels[unit] || unit;
}

export default MaintenanceScheduling;
