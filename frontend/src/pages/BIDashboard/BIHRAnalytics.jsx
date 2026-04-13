/**
 * BI HR Analytics — تحليلات الموارد البشرية
 *
 * Headcount distribution, department breakdown, leave stats,
 * attendance trends, turnover rate, and performance metrics.
 */

import { useState, useEffect } from 'react';
import {
  alpha,
} from '@mui/material';
import {
  People,
  PersonOff,
  EventAvailable,
  Star,
} from '@mui/icons-material';


import { getHRAnalytics, getDepartmentComparison } from '../../services/biDashboard.service';

const COLORS = ['#2196F3', '#4CAF50', '#FF9800', '#F44336', '#9C27B0', '#00BCD4', '#FF5722', '#795548', '#607D8B', '#E91E63'];

// ── HR Metric Card ────────────────────────────────────────────────
function HRMetricCard({ title, value, subtitle, icon: Icon, color, progress }) {
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card
        elevation={0}
        sx={{
          border: '1px solid rgba(0,0,0,0.04)',
          borderRadius: '16px',
          height: '100%',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          transition: 'all 0.3s',
          overflow: 'hidden',
          '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' },
        }}
      >
        <Box sx={{ height: 3, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: alpha(color, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon sx={{ color, fontSize: 24 }} />
            </Box>
          </Box>
          <Typography variant="h4" fontWeight={700}>
            {typeof value === 'number' ? value.toLocaleString('ar-SA') : value}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
          {progress !== undefined && (
            <Box sx={{ mt: 1 }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, parseFloat(progress))}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: alpha(color, 0.1),
                  '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function BIHRAnalytics() {
  const [loading, setLoading] = useState(true);
  const [hrData, setHRData] = useState(null);
  const [deptComparison, setDeptComparison] = useState([]);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [hr, depts] = await Promise.all([getHRAnalytics(), getDepartmentComparison()]);
      setHRData(hr);
      setDeptComparison(depts);
    } catch {
      setError('خطأ في تحميل تحليلات الموارد البشرية');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  const { headcount = {}, departments = [], leaves = {}, attendance = {}, performance = {} } = hrData || {};

  // Department pie data
  const deptPie = departments.slice(0, 8).map((d, i) => ({
    name: d.name,
    value: d.count,
    fill: COLORS[i % COLORS.length],
  }));

  // Leave breakdown
  const leaveData = (leaves.breakdown || []).map((l) => ({
    name: l.status === 'approved' ? 'مقبولة' : l.status === 'pending' ? 'معلقة' : l.status === 'rejected' ? 'مرفوضة' : l.status,
    count: l.count,
    days: l.totalDays,
  }));

  // Attendance monthly
  const attendanceData = (attendance.monthly || []).map((a) => ({
    month: `شهر ${a.month}`,
    rate: parseFloat(a.rate) || 0,
  }));

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            تحليلات الموارد البشرية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            القوى العاملة، الحضور، الإجازات، والأداء
          </Typography>
        </Box>
        <Tooltip title="تحديث">
          <IconButton onClick={fetchData} color="primary">
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <HRMetricCard
            title="إجمالي الموظفين"
            value={headcount.total || 0}
            subtitle={`${headcount.active || 0} نشط`}
            icon={People}
            color="#2196F3"
            progress={headcount.total > 0 ? (headcount.active / headcount.total) * 100 : 0}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <HRMetricCard
            title="معدل الدوران الوظيفي"
            value={`${headcount.turnoverRate || 0}%`}
            subtitle={parseFloat(headcount.turnoverRate) > 15 ? 'مرتفع — يحتاج اهتمام' : 'ضمن النطاق الطبيعي'}
            icon={PersonOff}
            color={parseFloat(headcount.turnoverRate) > 15 ? '#F44336' : '#4CAF50'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <HRMetricCard
            title="متوسط تقييم الأداء"
            value={performance.avgScore || 'N/A'}
            subtitle={`${performance.evaluationsCount || 0} تقييم`}
            icon={Star}
            color="#FF9800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <HRMetricCard
            title="معدل الطلبات"
            value={leaveData.reduce((s, l) => s + l.count, 0)}
            subtitle="إجمالي طلبات الإجازات"
            icon={EventAvailable}
            color="#9C27B0"
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Department Distribution */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)', transition: 'all 0.3s', '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.08)' } }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              توزيع الموظفين حسب القسم
            </Typography>
            {deptPie.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={deptPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {deptPie.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <Typography color="text.secondary">لا توجد بيانات</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Attendance Trend */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)', transition: 'all 0.3s', '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.08)' } }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              اتجاه نسبة الحضور الشهري
            </Typography>
            {attendanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <RechartTooltip formatter={(val) => `${val}%`} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }} />
                  <Line type="monotone" dataKey="rate" stroke="#4CAF50" strokeWidth={3} dot={{ r: 5 }} name="نسبة الحضور" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <Typography color="text.secondary">لا توجد بيانات حضور</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Leave Breakdown + Dept Comparison */}
      <Grid container spacing={3}>
        {/* Leave Breakdown */}
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)', transition: 'all 0.3s', '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.08)' } }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              توزيع الإجازات
            </Typography>
            {leaveData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={leaveData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={60} />
                  <RechartTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }} />
                  <Bar dataKey="count" fill="#9C27B0" name="عدد الطلبات" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography color="text.secondary">لا توجد بيانات</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Department Performance Radar */}
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)', transition: 'all 0.3s', '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.08)' } }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              مقارنة أداء الأقسام
            </Typography>
            {deptComparison.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={deptComparison.slice(0, 6).map((d) => ({
                  department: d.department?.substring(0, 15) || 'غير محدد',
                  headcount: d.headcount || 0,
                  sessions: d.sessions || 0,
                  efficiency: parseFloat(d.efficiency) || 0,
                }))}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="department" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis tick={{ fontSize: 10 }} />
                  <Radar name="الموظفون" dataKey="headcount" stroke="#2196F3" fill="#2196F3" fillOpacity={0.2} />
                  <Radar name="الجلسات" dataKey="sessions" stroke="#4CAF50" fill="#4CAF50" fillOpacity={0.2} />
                  <Legend />
                  <RechartTooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <Typography color="text.secondary">لا توجد بيانات مقارنة</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
