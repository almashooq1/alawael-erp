import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const MonitoringDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [queryStats, setQueryStats] = useState(null);
  const [realtimeStats, setRealtimeStats] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // تحديث كل 5 ثواني

    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const [dashboardRes, cacheRes, queryRes, realtimeRes] = await Promise.all([
        fetch('/api/monitoring/dashboard'),
        fetch('/api/monitoring/cache'),
        fetch('/api/monitoring/queries'),
        fetch('/api/monitoring/realtime'),
      ]);

      const dashboardJson = await dashboardRes.json();
      const cacheJson = await cacheRes.json();
      const queryJson = await queryRes.json();
      const realtimeJson = await realtimeRes.json();

      setDashboardData(dashboardJson?.data || dashboardJson);
      setCacheStats(cacheJson?.data || cacheJson);
      setQueryStats(queryJson?.data || queryJson);
      setRealtimeStats(realtimeJson?.data || realtimeJson);

      const point = {
        time: new Date().toLocaleTimeString(),
        responseTime: dashboardJson?.data?.metrics?.avgResponseTime || 0,
        rps: dashboardJson?.data?.metrics?.requestsPerSecond || 0,
        errorRate: dashboardJson?.data?.metrics?.errorRate || 0,
      };

      setTimeSeriesData(prev => [...prev.slice(-19), point]);

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ fontSize: '20px' }}>Loading monitoring data...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f9fafb', minHeight: '100vh' }} dir="rtl">
      <h1 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '24px' }}>لوحة مراقبة النظام المتقدمة</h1>

      {/* System Health Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard
          title="CPU Usage"
          value={`${dashboardData?.systemHealth?.cpu?.toFixed(1) || 0}%`}
          color="green"
          icon="💻"
        />
        <StatCard
          title="Memory Usage"
          value={`${dashboardData?.systemHealth?.memory?.toFixed(1) || 0}%`}
          color="green"
          icon="🧠"
        />
        <StatCard
          title="System Status"
          value={dashboardData?.systemHealth?.status || 'unknown'}
          color="blue"
          icon="🩺"
        />
        <StatCard
          title="Uptime"
          value={formatUptime(dashboardData?.systemHealth?.uptime || 0)}
          color="blue"
          icon="⏱️"
        />
      </div>

      {/* Request Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard
          title="Requests / sec"
          value={`${dashboardData?.metrics?.requestsPerSecond?.toFixed(2) || 0}`}
          color="blue"
          icon="📊"
        />
        <StatCard
          title="Avg Response Time"
          value={`${dashboardData?.metrics?.avgResponseTime?.toFixed(0) || 0}ms`}
          color="green"
          icon="⚡"
        />
        <StatCard
          title="Error Rate"
          value={`${dashboardData?.metrics?.errorRate?.toFixed(2) || 0}%`}
          color="green"
          icon="❗"
        />
        <StatCard
          title="Active Users"
          value={`${dashboardData?.metrics?.activeUsers || 0}`}
          color="blue"
          icon="👥"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard
          title="Cache Hit Rate"
          value={cacheStats?.hitRate || '0%'}
          color="green"
          icon="🧩"
        />
        <StatCard
          title="DB Latency"
          value={`${dashboardData?.metrics?.databaseLatency?.toFixed(0) || 0}ms`}
          color="green"
          icon="🗄️"
        />
        <StatCard
          title="Query Cache Hit"
          value={queryStats?.cacheHitRate || '0%'}
          color="blue"
          icon="🧠"
        />
        <StatCard
          title="Realtime Connections"
          value={`${realtimeStats?.connections?.activeConnections || 0}`}
          color="blue"
          icon="🛰️"
        />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Response Time Chart */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Response Time & RPS (Live)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="responseTime" stroke="#8884d8" name="Response Time (ms)" />
              <Line type="monotone" dataKey="rps" stroke="#82ca9d" name="Requests/sec" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Endpoints */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Service Requests</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={(dashboardData?.services || []).slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="requestCount" fill="#8884d8" name="Request Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Request Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Recent Errors</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(dashboardData?.recentErrors || []).length === 0 && (
              <p style={{ color: '#9ca3af' }}>لا توجد أخطاء حديثة</p>
            )}
            {(dashboardData?.recentErrors || []).slice(0, 6).map((error, index) => (
              <div key={index} style={{ padding: '12px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626' }}>
                  {error.message || 'Unknown error'}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {error.timestamp ? new Date(error.timestamp).toLocaleString() : ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Cache & Query Summary</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <StatCard title="Cache Hits" value={`${cacheStats?.hits || 0}`} color="green" icon="✅" />
            <StatCard title="Cache Misses" value={`${cacheStats?.misses || 0}`} color="yellow" icon="⚠️" />
            <StatCard title="Slow Queries" value={`${queryStats?.slowQueriesCount || 0}`} color="red" icon="🐢" />
            <StatCard title="Query Avg" value={`${queryStats?.avgTime || 0}ms`} color="blue" icon="📈" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const StatCard = ({ title, value, color, icon }) => {
  const colorClasses = {
    red: { backgroundColor: '#fee2e2', color: '#991b1b' },
    green: { backgroundColor: '#dcfce7', color: '#166534' },
    blue: { backgroundColor: '#dbeafe', color: '#1e40af' },
    yellow: { backgroundColor: '#fef3c7', color: '#92400e' },
  };

  return (
    <div style={{ padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', ...colorClasses[color] }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '14px', opacity: '0.75' }}>{title}</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px' }}>{value}</p>
        </div>
        <div style={{ fontSize: '32px' }}>{icon}</div>
      </div>
    </div>
  );
};

// Helper Functions
const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export default MonitoringDashboard;
