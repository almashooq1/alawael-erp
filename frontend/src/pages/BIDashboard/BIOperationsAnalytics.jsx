/**
 * BI Operations Analytics — التحليلات التشغيلية
 *
 * Sessions, complaints, maintenance, fleet,
 * operational efficiency, and department comparison.
 */

import { useState, useEffect } from 'react';
import {
  useTheme,
  alpha,
} from '@mui/material';
import {
  EventNote,
  ReportProblem,
  Build,
  DirectionsCar,
} from '@mui/icons-material';

import { getOperationsAnalytics, getTrends } from '../../services/biDashboard.service';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  Icon,
  IconButton,
  Paper,
  Tooltip,
  Typography
} from '@mui/material';
import Refresh from '@mui/icons-material/Refresh';

const STATUS_COLORS = {
  completed: '#4CAF50',
  active: '#2196F3',
  pending: '#FF9800',
  cancelled: '#F44336',
  resolved: '#4CAF50',
  open: '#FF9800',
  closed: '#607D8B',
  in_progress: '#2196F3',
  available: '#4CAF50',
  maintenance: '#FF9800',
  out_of_service: '#F44336',
};

const STATUS_LABELS = {
  completed: 'مكتمل',
  active: 'نشط',
  pending: 'معلق',
  cancelled: 'ملغي',
  resolved: 'محلول',
  open: 'مفتوح',
  closed: 'مغلق',
  in_progress: 'قيد التنفيذ',
  available: 'متاح',
  maintenance: 'صيانة',
  out_of_service: 'خارج الخدمة',
};

// ── Ops Status Card ───────────────────────────────────────────────
function OpsCard({ title, total, breakdown, icon: Icon, color }) {
  const theme = useTheme();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card
        elevation={0}
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          height: '100%',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: alpha(color, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon sx={{ color, fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                {(total || 0).toLocaleString('ar-SA')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {title}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {(breakdown || []).map((item, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  bgcolor: alpha(STATUS_COLORS[item.status] || '#607D8B', 0.08),
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: STATUS_COLORS[item.status] || '#607D8B',
                  }}
                />
                <Typography variant="caption" fontWeight={500}>
                  {STATUS_LABELS[item.status] || item.status}: {item.count}
                </Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function BIOperationsAnalytics() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [ops, setOps] = useState({});
  const [sessionTrend, setSessionTrend] = useState([]);
  const [complaintTrend, setComplaintTrend] = useState([]);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [opsData, sTrend, cTrend] = await Promise.all([
        getOperationsAnalytics(),
        getTrends('sessions', 6),
        getTrends('complaints', 6),
      ]);
      setOps(opsData);
      setSessionTrend(sTrend.points || []);
      setComplaintTrend(cTrend.points || []);
    } catch {
      setError('خطأ في تحميل التحليلات التشغيلية');
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

  const { sessions = {}, complaints = {}, maintenance = {}, fleet = {} } = ops;

  // Pie data for complaints
  const complaintPie = (complaints.breakdown || []).map((c, i) => ({
    name: STATUS_LABELS[c.status] || c.status,
    value: c.count,
    fill: STATUS_COLORS[c.status] || ['#2196F3', '#4CAF50', '#FF9800', '#F44336'][i % 4],
  }));

  // Bar data for fleet
  const fleetBar = (fleet.breakdown || []).map((f) => ({
    name: STATUS_LABELS[f.status] || f.status,
    count: f.count,
    fill: STATUS_COLORS[f.status] || '#607D8B',
  }));

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            التحليلات التشغيلية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            الجلسات، الشكاوى، الصيانة، والأسطول
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

      {/* Status Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <OpsCard
            title="الجلسات هذا الشهر"
            total={sessions.total}
            breakdown={sessions.breakdown}
            icon={EventNote}
            color="#9C27B0"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <OpsCard
            title="الشكاوى هذا الشهر"
            total={complaints.total}
            breakdown={complaints.breakdown}
            icon={ReportProblem}
            color="#F44336"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <OpsCard
            title="طلبات الصيانة"
            total={maintenance.total}
            breakdown={maintenance.breakdown}
            icon={Build}
            color="#FF9800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <OpsCard
            title="المركبات"
            total={fleet.total}
            breakdown={fleet.breakdown}
            icon={DirectionsCar}
            color="#2196F3"
          />
        </Grid>
      </Grid>

      {/* Trend Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Session Trend */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              اتجاه الجلسات (آخر 6 أشهر)
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sessionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartTooltip />
                <Bar dataKey="value" fill="#9C27B0" name="الجلسات" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Complaint Trend */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              اتجاه الشكاوى (آخر 6 أشهر)
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={complaintTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartTooltip />
                <Bar dataKey="value" fill="#F44336" name="الشكاوى" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Detail Charts */}
      <Grid container spacing={3}>
        {/* Complaint Distribution */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              توزيع حالات الشكاوى
            </Typography>
            {complaintPie.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={complaintPie} cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3} dataKey="value" label>
                    {complaintPie.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <Typography color="text.secondary">لا توجد بيانات شكاوى</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Fleet Status */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              حالة الأسطول
            </Typography>
            {fleetBar.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={fleetBar} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                  <RechartTooltip />
                  <Bar dataKey="count" name="عدد المركبات" radius={[0, 6, 6, 0]}>
                    {fleetBar.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <Typography color="text.secondary">لا توجد بيانات أسطول</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
