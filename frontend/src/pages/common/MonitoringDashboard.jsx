import { useState, useEffect, useCallback, useRef } from 'react';




import apiClient from '../../services/api.client';
import { gradients, statusColors, surfaceColors, chartColors } from '../../theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

/* ───────── formatUptime ───────── */
const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days} يوم ${hours} ساعة`;
  if (hours > 0) return `${hours} ساعة ${minutes} دقيقة`;
  return `${minutes} دقيقة`;
};

/* ───────── StatCard ───────── */
const STATUS_PALETTE = {
  green:  { bg: surfaceColors.greenSurface, fg: statusColors.greenDark },
  blue:   { bg: surfaceColors.blueSurface, fg: statusColors.blueDark },
  red:    { bg: surfaceColors.redSurface, fg: statusColors.redDark },
  yellow: { bg: surfaceColors.yellowSurface, fg: statusColors.yellowDark },
};

const StatCard = ({ title, value, color = 'blue', icon }) => {
  const pal = STATUS_PALETTE[color] || STATUS_PALETTE.blue;
  return (
    <Card
      elevation={0}
      sx={{
        bgcolor: pal.bg,
        color: pal.fg,
        borderRadius: 3,
        height: '100%',
      }}
    >
      <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2.5 }}>
        <Box>
          <Typography variant="body2" sx={{ opacity: 0.8, mb: 0.5 }}>{title}</Typography>
          <Typography variant="h5" fontWeight={700}>{value}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', opacity: 0.85 }}>
          {icon}
        </Box>
      </CardContent>
    </Card>
  );
};

/* ───────── Main Component ───────── */
const MonitoringDashboard = () => {
  const showSnackbar = useSnackbar();
  const [dashboardData, setDashboardData] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [queryStats, setQueryStats] = useState(null);
  const [realtimeStats, setRealtimeStats] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const demoNotifiedRef = useRef(false);

  const fetchStats = useCallback(async () => {
    try {
      const [dashboardJson, cacheJson, queryJson, realtimeJson] = await Promise.all([
        apiClient.get('/monitoring/dashboard'),
        apiClient.get('/monitoring/cache'),
        apiClient.get('/monitoring/queries'),
        apiClient.get('/monitoring/realtime'),
      ]);

      setDashboardData(dashboardJson?.data || dashboardJson);
      setCacheStats(cacheJson?.data || cacheJson);
      setQueryStats(queryJson?.data || queryJson);
      setRealtimeStats(realtimeJson?.data || realtimeJson);
      setIsDemo(false);

      const point = {
        time: new Date().toLocaleTimeString(),
        responseTime: dashboardJson?.data?.metrics?.avgResponseTime || 0,
        rps: dashboardJson?.data?.metrics?.requestsPerSecond || 0,
        errorRate: dashboardJson?.data?.metrics?.errorRate || 0,
      };
      setTimeSeriesData(prev => [...prev.slice(-19), point]);
    } catch {
      if (!demoNotifiedRef.current) {
        showSnackbar('تعذر الاتصال بخادم المراقبة، يتم عرض بيانات تجريبية', 'error');
        demoNotifiedRef.current = true;
      }
      setIsDemo(true);
      const now = Date.now();
      const cpu = 25 + Math.random() * 40;
      const mem = 40 + Math.random() * 30;
      setDashboardData({
        systemHealth: { cpu, memory: mem, status: 'healthy', uptime: Math.floor((now - (now - 86400000 * 3)) / 1000) },
        metrics: {
          requestsPerSecond: 12 + Math.random() * 20,
          avgResponseTime: 45 + Math.random() * 80,
          errorRate: Math.random() * 2,
          activeUsers: Math.floor(5 + Math.random() * 25),
          databaseLatency: 3 + Math.random() * 12,
        },
        services: [
          { name: '/api/auth', requestCount: Math.floor(200 + Math.random() * 100) },
          { name: '/api/users', requestCount: Math.floor(150 + Math.random() * 80) },
          { name: '/api/reports', requestCount: Math.floor(80 + Math.random() * 60) },
          { name: '/api/messages', requestCount: Math.floor(60 + Math.random() * 50) },
          { name: '/api/modules', requestCount: Math.floor(40 + Math.random() * 30) },
        ],
        recentErrors: [],
      });
      setCacheStats({ hitRate: `${(85 + Math.random() * 10).toFixed(1)}%`, hits: Math.floor(1200 + Math.random() * 500), misses: Math.floor(50 + Math.random() * 30) });
      setQueryStats({ cacheHitRate: `${(78 + Math.random() * 15).toFixed(1)}%`, slowQueriesCount: Math.floor(Math.random() * 3), avgTime: Math.floor(8 + Math.random() * 15) });
      setRealtimeStats({ connections: { activeConnections: Math.floor(3 + Math.random() * 10) } });

      const point = {
        time: new Date().toLocaleTimeString(),
        responseTime: 45 + Math.random() * 80,
        rps: 12 + Math.random() * 20,
        errorRate: Math.random() * 2,
      };
      setTimeSeriesData(prev => [...prev.slice(-19), point]);
    } finally {
      setIsLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  /* ─── Loading ─── */
  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Skeleton variant="text" width={320} height={48} sx={{ mb: 3 }} />
        <Grid container spacing={2}>
          {[...Array(8)].map((_, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={100} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  const statusLabel = { healthy: 'سليم', degraded: 'متدهور', down: 'متوقف' };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      {/* Header */}
      <Box sx={{ background: gradients.info, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <HealthIcon sx={{ fontSize: 40 }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>لوحة المراقبة</Typography>
            <Typography variant="body2">مراقبة أداء النظام والخوادم</Typography>
          </Box>
          <Chip
            label={isDemo ? 'بيانات تجريبية' : 'مباشر'}
            color={isDemo ? 'warning' : 'success'}
            variant="filled"
            size="small"
          />
        </Box>
      </Box>

      {isDemo && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          API المراقبة غير متاح حالياً — يتم عرض بيانات تجريبية. سيتم إعادة المحاولة كل ٥ ثوانٍ.
        </Alert>
      )}

      {/* ─── System Health ─── */}
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>صحة النظام</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="استخدام المعالج" value={`${dashboardData?.systemHealth?.cpu?.toFixed(1) || 0}%`} color="green" icon={<CpuIcon fontSize="large" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="استخدام الذاكرة" value={`${dashboardData?.systemHealth?.memory?.toFixed(1) || 0}%`} color="green" icon={<MemoryIcon fontSize="large" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="حالة النظام" value={statusLabel[dashboardData?.systemHealth?.status] || dashboardData?.systemHealth?.status || 'غير معروف'} color="blue" icon={<HealthIcon fontSize="large" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="وقت التشغيل" value={formatUptime(dashboardData?.systemHealth?.uptime || 0)} color="blue" icon={<UptimeIcon fontSize="large" />} />
        </Grid>
      </Grid>

      {/* ─── Request Statistics ─── */}
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>إحصائيات الطلبات</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="الطلبات / ثانية" value={`${dashboardData?.metrics?.requestsPerSecond?.toFixed(2) || 0}`} color="blue" icon={<RpsIcon fontSize="large" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="متوسط وقت الاستجابة" value={`${dashboardData?.metrics?.avgResponseTime?.toFixed(0) || 0}ms`} color="green" icon={<LatencyIcon fontSize="large" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="معدل الأخطاء" value={`${dashboardData?.metrics?.errorRate?.toFixed(2) || 0}%`} color="green" icon={<ErrorIcon fontSize="large" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="المستخدمون النشطون" value={`${dashboardData?.metrics?.activeUsers || 0}`} color="blue" icon={<UsersIcon fontSize="large" />} />
        </Grid>
      </Grid>

      {/* ─── Cache & DB ─── */}
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>الذاكرة المؤقتة وقاعدة البيانات</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="معدل إصابة الذاكرة المؤقتة" value={cacheStats?.hitRate || '0%'} color="green" icon={<CacheIcon fontSize="large" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="زمن استجابة قاعدة البيانات" value={`${dashboardData?.metrics?.databaseLatency?.toFixed(0) || 0}ms`} color="green" icon={<DbIcon fontSize="large" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="إصابة ذاكرة الاستعلامات" value={queryStats?.cacheHitRate || '0%'} color="blue" icon={<QueryIcon fontSize="large" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="الاتصالات المباشرة" value={`${realtimeStats?.connections?.activeConnections || 0}`} color="blue" icon={<RealtimeIcon fontSize="large" />} />
        </Grid>
      </Grid>

      {/* ─── Charts ─── */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>وقت الاستجابة والطلبات (مباشر)</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="responseTime" stroke={chartColors.violet} name="وقت الاستجابة (ms)" />
                <Line type="monotone" dataKey="rps" stroke={chartColors.emerald} name="الطلبات/ثانية" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>طلبات الخدمات</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={(dashboardData?.services || []).slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="requestCount" fill={chartColors.violet} name="عدد الطلبات" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* ─── Errors + Cache Summary ─── */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>الأخطاء الأخيرة</Typography>
            {(dashboardData?.recentErrors || []).length === 0 ? (
              <Typography variant="body2" color="text.secondary">لا توجد أخطاء حديثة ✓</Typography>
            ) : (
              <List disablePadding>
                {(dashboardData?.recentErrors || []).slice(0, 6).map((error, index) => (
                  <Box key={index}>
                    <ListItem disableGutters>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <ErrorIcon color="error" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={error.message || 'خطأ غير معروف'}
                        secondary={error.timestamp ? new Date(error.timestamp).toLocaleString() : ''}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600, color: 'error.main' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                    {index < (dashboardData.recentErrors.length - 1) && <Divider />}
                  </Box>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>ملخص الذاكرة المؤقتة والاستعلامات</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <StatCard title="إصابات الذاكرة" value={`${cacheStats?.hits || 0}`} color="green" icon={<HitIcon />} />
              </Grid>
              <Grid item xs={6}>
                <StatCard title="إخفاقات الذاكرة" value={`${cacheStats?.misses || 0}`} color="yellow" icon={<MissIcon />} />
              </Grid>
              <Grid item xs={6}>
                <StatCard title="استعلامات بطيئة" value={`${queryStats?.slowQueriesCount || 0}`} color="red" icon={<SlowIcon />} />
              </Grid>
              <Grid item xs={6}>
                <StatCard title="متوسط الاستعلام" value={`${queryStats?.avgTime || 0}ms`} color="blue" icon={<AvgIcon />} />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default MonitoringDashboard;
