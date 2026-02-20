/**
 * Smart Dashboard Component - React
 * لوحة التحكم الذكية والمتقدمة لتتبع الحافلات
 */

import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import './Dashboard.css';

const SmartFleetDashboard = () => {
  // ====== حالة التطبيق ======
  const [fleet, setFleet] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const socketRef = useRef(null);

  // ====== الاتصال بـ WebSocket ======
  useEffect(() => {
    // الاتصال بالخادم
    socketRef.current = io('http://localhost:5000', {
      auth: {
        token: localStorage.getItem('token'),
        userId: localStorage.getItem('userId'),
        userType: 'manager'
      }
    });

    // الاشتراك في الأحداث
    socketRef.current.on('fleet_statistics', (stats) => {
      setFleet(stats);
    });

    socketRef.current.on('vehicle_location_update', (data) => {
      setVehicles(prev => prev.map(v => 
        v._id === data.vehicleId 
          ? { ...v, ...data.data, lastUpdate: new Date() }
          : v
      ));
    });

    socketRef.current.on('alert_received', (alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 10));
      // تشغيل صوت التنبيه
      playAlertSound();
    });

    // تحميل البيانات الأولية
    fetchInitialData();

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // ====== جلب البيانات الأولية ======
  const fetchInitialData = async () => {
    try {
      const response = await fetch('/api/gps/fleet/snapshot', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setFleet(data.data);
      setVehicles(data.data.vehicles);

      // جلب KPIs
      const kpiResponse = await fetch('/api/gps/fleet/kpis?timeframe=daily', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const kpiData = await kpiResponse.json();
      setKpis(kpiData.kpis);

      setLoading(false);
    } catch (error) {
      console.error('خطأ في تحميل البيانات:', error);
      setLoading(false);
    }
  };

  // ====== تشغيل صوت التنبيه ======
  const playAlertSound = () => {
    const audio = new Audio('/sounds/alert.mp3');
    audio.play().catch(e => console.log('لا يمكن تشغيل الصوت:', e));
  };

  // ====== معالجات الأحداث ======
  const handleVehicleClick = (vehicle) => {
    setSelectedVehicle(vehicle);
  };

  const refreshData = () => {
    setLoading(true);
    fetchInitialData();
  };

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  return (
    <div className="dashboard-container">
      {/* ====== الرأس ====== */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>🚌 لوحة تحكم تتبع الحافلات الذكية</h1>
          <div className="header-controls">
            <button onClick={refreshData} className="btn-refresh">
              🔄 تحديث
            </button>
            <span className="last-update">
              آخر تحديث: {new Date().toLocaleTimeString('ar-SA')}
            </span>
          </div>
        </div>
      </header>

      <div className="dashboard-body">
        {/* ====== الإحصائيات العامة ====== */}
        <section className="statistics-grid">
          <StatCard 
            title="إجمالي المركبات" 
            value={fleet?.fleet.total || 0}
            icon="🚌"
            color="#3498db"
          />
          <StatCard 
            title="المركبات النشطة" 
            value={fleet?.fleet.active || 0}
            icon="✅"
            color="#2ecc71"
          />
          <StatCard 
            title="الرحلات الجارية" 
            value={fleet?.fleet.inTrip || 0}
            icon="📍"
            color="#f39c12"
          />
          <StatCard 
            title="التنبيهات المعلقة" 
            value={alerts.length}
            icon="🚨"
            color={alerts.length > 0 ? "#e74c3c" : "#95a5a6"}
          />
        </section>

        <div className="dashboard-grid">
          {/* ====== خريطة المركبات ====== */}
          <section className="map-section">
            <h2>🗺️ خريطة المركبات الحية</h2>
            <VehicleMap vehicles={vehicles} onVehicleClick={handleVehicleClick} />
          </section>

          {/* ====== قائمة المركبات ====== */}
          <section className="vehicles-list">
            <h2>قائمة المركبات</h2>
            <div className="vehicles-table">
              {vehicles.map(vehicle => (
                <VehicleRow 
                  key={vehicle._id}
                  vehicle={vehicle}
                  isSelected={selectedVehicle?._id === vehicle._id}
                  onSelect={handleVehicleClick}
                />
              ))}
            </div>
          </section>
        </div>

        {/* ====== التحليلات والرسوم البيانية ====== */}
        <section className="analytics-section">
          <h2>📊 التحليلات والإحصائيات</h2>
          
          <div className="charts-grid">
            {/* رسم بياني للمسافة المقطوعة */}
            <div className="chart-container">
              <h3>المسافة المقطوعة (كم)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { name: 'اليوم', value: kpis?.operational.totalDistance || 0 },
                  { name: 'الأسبوع', value: (kpis?.operational.totalDistance || 0) * 7 },
                  { name: 'الشهر', value: (kpis?.operational.totalDistance || 0) * 30 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3498db" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* رسم بياني لحالة المركبات */}
            <div className="chart-container">
              <h3>حالة المركبات</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'نشطة', value: fleet?.fleet.active || 0 },
                      { name: 'في الرحلة', value: fleet?.fleet.inTrip || 0 },
                      { name: 'صيانة', value: fleet?.fleet.maintenance || 0 },
                      { name: 'معطلة', value: fleet?.fleet.breakdown || 0 }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#2ecc71" />
                    <Cell fill="#f39c12" />
                    <Cell fill="#e74c3c" />
                    <Cell fill="#95a5a6" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* رسم بياني استهلاك الوقود */}
            <div className="chart-container">
              <h3>استهلاك الوقود</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={[
                  { hour: '8 ص', consumption: 5.2 },
                  { hour: '10 ص', consumption: 6.1 },
                  { hour: '12 ظ', consumption: 7.3 },
                  { hour: '2 م', consumption: 6.8 },
                  { hour: '4 م', consumption: 7.5 },
                  { hour: '6 م', consumption: 8.2 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="consumption" stroke="#f39c12" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* KPIs الأداء */}
            <div className="kpi-container">
              <h3>🎯 مؤشرات الأداء الرئيسية</h3>
              <KPIBox 
                label="معدل الاستخدام"
                value={Math.round(kpis?.operational.utilizationRate || 0) + '%'}
                color="#3498db"
              />
              <KPIBox 
                label="الالتزام بالمواعيد"
                value={Math.round(kpis?.operational.onTimePercentage || 0) + '%'}
                color="#2ecc71"
              />
              <KPIBox 
                label="تكلفة الكيلومتر"
                value={Math.round((kpis?.financial.costPerKM || 0) * 100) / 100 + ' ر.س'}
                color="#f39c12"
              />
              <KPIBox 
                label="درجة الأمان"
                value={Math.round(kpis?.safety.safetyScore || 0) + '/100'}
                color={kpis?.safety.safetyScore >= 80 ? '#2ecc71' : '#e74c3c'}
              />
            </div>
          </div>
        </section>

        {/* ====== التنبيهات ====== */}
        <section className="alerts-section">
          <h2>🚨 التنبيهات الأخيرة ({alerts.length})</h2>
          <div className="alerts-container">
            {alerts.length === 0 ? (
              <p className="no-alerts">✅ لا توجد تنبيهات حالياً</p>
            ) : (
              alerts.map((alert, idx) => (
                <AlertCard key={idx} alert={alert} />
              ))
            )}
          </div>
        </section>

        {/* ====== تفاصيل المركبة المختارة ====== */}
        {selectedVehicle && (
          <section className="vehicle-details">
            <h2>📋 تفاصيل المركبة</h2>
            <VehicleDetails vehicle={selectedVehicle} />
          </section>
        )}
      </div>
    </div>
  );
};

// ====== مكونات مساعدة ======

const StatCard = ({ title, value, icon, color }) => (
  <div className="stat-card" style={{ borderTopColor: color }}>
    <span className="stat-icon">{icon}</span>
    <div className="stat-content">
      <p className="stat-title">{title}</p>
      <p className="stat-value">{value}</p>
    </div>
  </div>
);

const VehicleRow = ({ vehicle, isSelected, onSelect }) => (
  <div 
    className={`vehicle-row ${isSelected ? 'selected' : ''}`}
    onClick={() => onSelect(vehicle)}
  >
    <div className="vehicle-info">
      <strong>{vehicle.plateNumber}</strong>
      <span className="vehicle-type">{vehicle.type}</span>
    </div>
    <div className="vehicle-status">
      <span className={`status-badge ${vehicle.status}`}>
        {vehicle.status}
      </span>
    </div>
    <div className="vehicle-speed">
      {vehicle.currentSpeed} كم/س
    </div>
    <div className="vehicle-fuel">
      <div className="fuel-bar">
        <div 
          className="fuel-fill"
          style={{ width: vehicle.fuel + '%' }}
        ></div>
      </div>
      <span>{vehicle.fuel}%</span>
    </div>
  </div>
);

const AlertCard = ({ alert }) => (
  <div className={`alert-card alert-${alert.severity}`}>
    <div className="alert-header">
      <strong>{alert.message}</strong>
      <span className="alert-time">
        {new Date(alert.timestamp).toLocaleTimeString('ar-SA')}
      </span>
    </div>
    <p className="alert-recommendation">
      💡 {alert.recommendation}
    </p>
  </div>
);

const KPIBox = ({ label, value, color }) => (
  <div className="kpi-box" style={{ borderLeftColor: color }}>
    <p className="kpi-label">{label}</p>
    <p className="kpi-value" style={{ color }}>{value}</p>
  </div>
);

const VehicleMap = ({ vehicles, onVehicleClick }) => (
  <div className="map-container">
    <div className="map-placeholder">
      <p>🗺️ خريطة تفاعلية (يمكن استخدام Google Maps API)</p>
      <div className="vehicle-pins">
        {vehicles.map(v => (
          <div
            key={v._id}
            className="vehicle-pin"
            onClick={() => onVehicleClick(v)}
            title={`${v.plateNumber}: ${v.currentSpeed} كم/س`}
          >
            🚌
          </div>
        ))}
      </div>
    </div>
  </div>
);

const VehicleDetails = ({ vehicle }) => (
  <div className="details-grid">
    <DetailItem label="رقم اللوحة" value={vehicle.plateNumber} />
    <DetailItem label="النوع" value={vehicle.type} />
    <DetailItem label="السائق" value={vehicle.driver || 'لم يتم تعيينه'} />
    <DetailItem label="الحالة" value={vehicle.status} />
    <DetailItem label="السرعة الحالية" value={`${vehicle.currentSpeed} كم/س`} />
    <DetailItem label="مستوى الوقود" value={`${vehicle.fuel}%`} />
    <DetailItem label="آخر تحديث" value={vehicle.lastUpdate?.toLocaleTimeString('ar-SA') || '-'} />
    <DetailItem label="الموقع" value={`${vehicle.location?.latitude?.toFixed(4)}, ${vehicle.location?.longitude?.toFixed(4)}`} />
  </div>
);

const DetailItem = ({ label, value }) => (
  <div className="detail-item">
    <label>{label}</label>
    <span>{value}</span>
  </div>
);

const renderLabel = (entry) => `${entry.name}: ${entry.value}`;

export default SmartFleetDashboard;
