import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardData {
  systemHealth?: {
    status?: string;
    cpu?: number;
    memory?: number;
    uptime?: number;
  };
  metrics?: {
    requestsPerSecond?: number;
    errorRate?: number;
    avgResponseTime?: number;
    cacheHitRate?: number;
    databaseLatency?: number;
    activeUsers?: number;
  };
  alerts?: Array<{ message?: string; severity?: string; timestamp?: number }>;
  recentErrors?: Array<{ message?: string; severity?: string; timestamp?: number }>;
  services?: Array<{
    name?: string;
    status?: string;
    requestCount?: number;
    errorCount?: number;
    avgLatency?: number;
  }>;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: string;
  L1Size: number;
  L2Size: number;
  L3Size: number;
}

interface QueryStats {
  total: number;
  cacheHitRate: string;
  slowQueriesCount: number;
  avgTime: number;
}

interface RealtimeStats {
  status: string;
  connections?: {
    totalConnections?: number;
    activeConnections?: number;
    totalMessages?: number;
  };
  uptime?: number;
}

export const MonitoringDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [queryStats, setQueryStats] = useState<QueryStats | null>(null);
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStats | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading monitoring data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen" dir="rtl">
      <h1 className="text-3xl font-bold mb-6">لوحة مراقبة النظام المتقدمة</h1>

      {/* System Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="CPU Usage"
          value={`${dashboardData?.systemHealth?.cpu?.toFixed(1) || 0}%`}
          color={dashboardData?.systemHealth?.cpu && dashboardData.systemHealth.cpu > 80 ? 'red' : 'green'}
          icon="💻"
        />
        <StatCard
          title="Memory Usage"
          value={`${dashboardData?.systemHealth?.memory?.toFixed(1) || 0}%`}
          color={dashboardData?.systemHealth?.memory && dashboardData.systemHealth.memory > 80 ? 'red' : 'green'}
          icon="🧠"
        />
        <StatCard
          title="System Status"
          value={dashboardData?.systemHealth?.status || 'unknown'}
          color={dashboardData?.systemHealth?.status === 'healthy' ? 'green' : 'yellow'}
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Requests / sec"
          value={`${dashboardData?.metrics?.requestsPerSecond?.toFixed(2) || 0}`}
          color="blue"
          icon="📊"
        />
        <StatCard
          title="Avg Response Time"
          value={`${dashboardData?.metrics?.avgResponseTime?.toFixed(0) || 0}ms`}
          color={dashboardData?.metrics?.avgResponseTime && dashboardData.metrics.avgResponseTime > 500 ? 'yellow' : 'green'}
          icon="⚡"
        />
        <StatCard
          title="Error Rate"
          value={`${dashboardData?.metrics?.errorRate?.toFixed(2) || 0}%`}
          color={dashboardData?.metrics?.errorRate && dashboardData.metrics.errorRate > 5 ? 'red' : 'green'}
          icon="❗"
        />
        <StatCard
          title="Active Users"
          value={`${dashboardData?.metrics?.activeUsers || 0}`}
          color="blue"
          icon="👥"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Cache Hit Rate"
          value={cacheStats?.hitRate || '0%'}
          color="green"
          icon="🧩"
        />
        <StatCard
          title="DB Latency"
          value={`${dashboardData?.metrics?.databaseLatency?.toFixed(0) || 0}ms`}
          color={dashboardData?.metrics?.databaseLatency && dashboardData.metrics.databaseLatency > 500 ? 'yellow' : 'green'}
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Response Time Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Response Time & RPS (Live)</h2>
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
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Service Requests</h2>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Recent Errors</h2>
          <div className="space-y-3">
            {(dashboardData?.recentErrors || []).length === 0 && (
              <p className="text-gray-500">لا توجد أخطاء حديثة</p>
            )}
            {(dashboardData?.recentErrors || []).slice(0, 6).map((error, index) => (
              <div key={index} className="p-3 rounded border border-gray-100">
                <div className="text-sm font-semibold text-red-600">
                  {error.message || 'Unknown error'}
                </div>
                <div className="text-xs text-gray-500">
                  {error.timestamp ? new Date(error.timestamp).toLocaleString() : ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Cache & Query Summary</h2>
          <div className="grid grid-cols-2 gap-4">
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
interface StatCardProps {
  title: string;
  value: string;
  color: string;
  icon: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, color, icon }) => {
  const colorClasses = {
    red: 'bg-red-100 text-red-800',
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className={`p-4 rounded-lg shadow ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-75">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
};

// Helper Functions
const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export default MonitoringDashboard;
