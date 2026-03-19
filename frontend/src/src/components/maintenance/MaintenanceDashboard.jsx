import React, { useState, useEffect } from 'react';
import './MaintenanceDashboard.css';
import MaintenanceCharts from './MaintenanceCharts';
import MaintenancePredictions from './MaintenancePredictions';
import MaintenanceAlerts from './MaintenanceAlerts';
import MaintenanceScheduling from './MaintenanceScheduling';

/**
 * =====================================================
 * MAINTENANCE DASHBOARD - لوحة تحكم الصيانة الذكية
 * =====================================================
 * 
 * المميزات الرئيسية:
 * ✅ عرض KPIs وإحصائيات
 * ✅ روابط سريعة للعمليات
 * ✅ تصفية حسب المركبات
 * ✅ عرض التقارير والرسوم البيانية
 * ✅ التنبيهات والإشعارات
 */
const MaintenanceDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState({
    totalVehicles: 0,
    scheduledMaintenance: 0,
    overdueMaintenance: 0,
    upcomingIssues: 0,
    criticalParts: 0,
    averageCost: 0,
    totalCost: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // جلب البيانات الأولية
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // جلب بيانات المركبات
      const vehiclesResponse = await fetch('/api/vehicles');
      const vehiclesData = await vehiclesResponse.json();
      setVehicles(vehiclesData.data || []);

      // جلب إحصائيات الصيانة
      const statsResponse = await fetch('/api/v1/maintenance/predict/stats');
      const statsData = await statsResponse.json();
      
      setStats({
        totalVehicles: vehiclesData.data?.length || 0,
        scheduledMaintenance: statsData.scheduledCount || 0,
        overdueMaintenance: statsData.overdueCount || 0,
        upcomingIssues: statsData.upcomingIssues || 0,
        criticalParts: statsData.criticalParts || 0,
        averageCost: statsData.averageCost || 0,
        totalCost: statsData.totalCost || 0,
      });

      setError(null);
    } catch (err) {
      console.error('خطأ في جلب البيانات:', err);
      setError('فشل تحميل بيانات الصيانة');
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleSelect = (vehicleId) => {
    setSelectedVehicle(vehicleId);
  };

  const StatCard = ({ label, value, icon, color }) => (
    <div className={`stat-card stat-card-${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="maintenance-dashboard">
      {/* الرأسية */}
      <div className="maintenance-header">
        <div className="header-title">
          <h1>🔧 لوحة تحكم الصيانة الذكية</h1>
          <p>إدارة صيانة المركبات بذكاء وكفاءة</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setActiveTab('scheduling')}>
            📅 جدولة جديدة
          </button>
          <button className="btn btn-secondary" onClick={fetchDashboardData}>
            🔄 تحديث البيانات
          </button>
        </div>
      </div>

      {/* عرض الأخطاء */}
      {error && <div className="alert alert-error">{error}</div>}

      {/* المؤشرات الرئيسية */}
      {!loading && (
        <div className="stats-grid">
          <StatCard
            label="إجمالي المركبات"
            value={stats.totalVehicles}
            icon="🚗"
            color="blue"
          />
          <StatCard
            label="جدولة مجدولة"
            value={stats.scheduledMaintenance}
            icon="📅"
            color="green"
          />
          <StatCard
            label="صيانة متأخرة"
            value={stats.overdueMaintenance}
            icon="⚠️"
            color="orange"
          />
          <StatCard
            label="مشاكل قادمة"
            value={stats.upcomingIssues}
            icon="🔴"
            color="red"
          />
          <StatCard
            label="أجزاء حرجة"
            value={stats.criticalParts}
            icon="⛔"
            color="danger"
          />
          <StatCard
            label="تكلفة إجمالية"
            value={`${stats.totalCost.toFixed(0)} ريال`}
            icon="💰"
            color="purple"
          />
        </div>
      )}

      {/* التبويبات */}
      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 النظرة العامة
        </button>
        <button
          className={`tab-button ${activeTab === 'scheduling' ? 'active' : ''}`}
          onClick={() => setActiveTab('scheduling')}
        >
          📅 الجدولة
        </button>
        <button
          className={`tab-button ${activeTab === 'predictions' ? 'active' : ''}`}
          onClick={() => setActiveTab('predictions')}
        >
          🤖 التنبؤات
        </button>
        <button
          className={`tab-button ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          🔔 التنبيهات
        </button>
      </div>

      {/* محتوى التبويبات */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <MaintenanceCharts selectedVehicle={selectedVehicle} />
          </div>
        )}

        {activeTab === 'scheduling' && (
          <MaintenanceScheduling
            vehicles={vehicles}
            onVehicleSelect={handleVehicleSelect}
          />
        )}

        {activeTab === 'predictions' && (
          <MaintenancePredictions
            selectedVehicle={selectedVehicle}
            vehicles={vehicles}
          />
        )}

        {activeTab === 'alerts' && (
          <MaintenanceAlerts
            selectedVehicle={selectedVehicle}
            vehicles={vehicles}
          />
        )}
      </div>

      {/* قائمة المركبات السريعة */}
      {vehicles.length > 0 && (
        <div className="vehicles-sidebar">
          <h3>المركبات</h3>
          <div className="vehicles-list">
            {vehicles.slice(0, 5).map((vehicle) => (
              <div
                key={vehicle._id}
                className={`vehicle-item ${
                  selectedVehicle === vehicle._id ? 'active' : ''
                }`}
                onClick={() => handleVehicleSelect(vehicle._id)}
              >
                <p className="vehicle-name">{vehicle.name || vehicle.licensePlate}</p>
                <p className="vehicle-type">{vehicle.type}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceDashboard;
