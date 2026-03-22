/**
 * E-Signature Dashboard — لوحة تحكم التوقيع الإلكتروني
 * Enhanced with proper API data mapping & rich analytics
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, LinearProgress,
  Button, Stack, Divider, IconButton, Tooltip,
} from '@mui/material';
import {
  Draw, Approval as Stamp, Verified, PendingActions,
  TrendingUp, Speed, Description, Refresh, ArrowForward,
  Cancel as CancelIcon, HourglassBottom, Assessment,
} from '@mui/icons-material';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import eSignatureService from '../../services/eSignature.service';
import eStampService from '../../services/eStamp.service';

const COLORS = ['#4caf50', '#ff9800', '#f44336', '#2196f3', '#9c27b0', '#607d8b'];
const MONTH_NAMES = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

const statusAr = {
  pending: 'معلق', in_progress: 'قيد التنفيذ', completed: 'مكتمل',
  rejected: 'مرفوض', expired: 'منتهي', cancelled: 'ملغي', draft: 'مسودة',
};
const statusChipColor = {
  pending: 'warning', in_progress: 'info', completed: 'success',
  rejected: 'error', expired: 'default', cancelled: 'default', draft: 'default',
};

const KPICard = ({ icon: Icon, title, value, color, subtitle }) => (
  <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
    <CardContent>
      <Box display="flex" alignItems="center" gap={1.5} mb={1}>
        <Box sx={{ bgcolor: `${color}15`, p: 1, borderRadius: 2, display: 'flex' }}>
          <Icon sx={{ color, fontSize: 28 }} />
        </Box>
        <Box flex={1}>
          <Typography variant="body2" color="text.secondary">{title}</Typography>
          <Typography variant="h4" fontWeight="bold">{value}</Typography>
        </Box>
      </Box>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
      )}
    </CardContent>
  </Card>
);

export default function ESignatureDashboard() {
  const navigate = useNavigate();
  const [sigData, setSigData] = useState(null);
  const [stampData, setStampData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sigRes, stampRes] = await Promise.all([
        eSignatureService.getStats(),
        eStampService.getStats(),
      ]);
      setSigData(sigRes.data?.data || sigRes.data);
      setStampData(stampRes.data?.data || stampRes.data);
    } catch {
      // Graceful — leave nulls, UI shows zeros
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <LinearProgress />;

  /* ─── Derive display data from API response ─────────────────────────── */
  const counts = sigData?.counts || {};
  const totalSigs = counts.total || 0;
  const pendingSigs = (counts.pending || 0) + (counts.inProgress || 0);
  const completedSigs = counts.completed || 0;
  const rejectedSigs = counts.rejected || 0;
  const activeStamps = stampData?.active || 0;
  const completionRate = sigData?.completionRate || 0;
  const avgHours = sigData?.avgCompletionHours || 0;

  // Pie chart — status distribution
  const byStatusPie = [
    completedSigs > 0 && { name: 'مكتمل', value: completedSigs },
    pendingSigs > 0 && { name: 'معلق', value: pendingSigs },
    rejectedSigs > 0 && { name: 'مرفوض', value: rejectedSigs },
    (counts.expired || 0) > 0 && { name: 'منتهي', value: counts.expired },
    (counts.cancelled || 0) > 0 && { name: 'ملغي', value: counts.cancelled },
  ].filter(Boolean);

  // Bar chart — monthly trend
  const monthlyActivity = (sigData?.monthlyTrend || []).map(t => ({
    month: MONTH_NAMES[t._id?.month] || `${t._id?.month}`,
    signatures: t.count || 0,
    completed: t.completed || 0,
  }));

  // Merge stamp monthly trend if available
  const stampMonthly = (stampData?.monthlyTrend || []).reduce((acc, t) => {
    const key = `${t._id?.year}-${t._id?.month}`;
    acc[key] = t.count || 0;
    return acc;
  }, {});

  monthlyActivity.forEach(m => {
    const entry = (sigData?.monthlyTrend || []).find(
      t => MONTH_NAMES[t._id?.month] === m.month
    );
    if (entry) {
      const key = `${entry._id?.year}-${entry._id?.month}`;
      m.stamps = stampMonthly[key] || 0;
    }
  });

  // Recent documents from API
  const recentDocs = (sigData?.recent || []).map(d => ({
    _id: d._id,
    title: d.documentTitle || d.requestId,
    creator: d.createdByName || '-',
    status: d.status,
    date: d.updatedAt ? new Date(d.updatedAt).toLocaleDateString('ar-SA') : '-',
    priority: d.priority,
  }));

  return (
    <Box p={3} dir="rtl">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          لوحة تحكم التوقيع والختم الإلكتروني
        </Typography>
        <Tooltip title="تحديث">
          <IconButton onClick={fetchData}><Refresh /></IconButton>
        </Tooltip>
      </Box>

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard icon={Draw} title="إجمالي التوقيعات" value={totalSigs} color="#1976d2"
            subtitle={`هذا الشهر: ${sigData?.thisMonth || 0}`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard icon={PendingActions} title="بانتظار التوقيع" value={pendingSigs} color="#ff9800"
            subtitle={rejectedSigs > 0 ? `${rejectedSigs} مرفوض` : undefined} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard icon={Verified} title="مكتملة" value={completedSigs} color="#4caf50"
            subtitle={`نسبة الإكمال: ${completionRate}%`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard icon={Stamp} title="الأختام النشطة" value={activeStamps} color="#9c27b0"
            subtitle={`الإجمالي: ${stampData?.total || 0}`} />
        </Grid>
      </Grid>

      {/* ── Extra KPIs ─────────────────────────────────────────────── */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={4}>
          <KPICard icon={Speed} title="متوسط وقت الإكمال" value={`${avgHours} ساعة`} color="#00897b" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KPICard icon={Description} title="القوالب النشطة" value={sigData?.templates || 0} color="#5c6bc0" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KPICard icon={TrendingUp} title="استخدامات الأختام" value={stampData?.totalUsage || 0} color="#e65100" />
        </Grid>
      </Grid>

      {/* ── Charts ─────────────────────────────────────────────────── */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="h6" mb={2} fontWeight="bold">حالة التوقيعات</Typography>
            {byStatusPie.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={byStatusPie} cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="value" nameKey="name" label>
                    {byStatusPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <ChartTooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">لا توجد بيانات بعد</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="h6" mb={2} fontWeight="bold">النشاط الشهري</Typography>
            {monthlyActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip />
                  <Legend />
                  <Bar dataKey="signatures" name="توقيعات" fill="#1976d2" radius={[4,4,0,0]} />
                  <Bar dataKey="stamps" name="أختام" fill="#9c27b0" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">لا توجد بيانات شهرية بعد</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* ── Recent Documents ───────────────────────────────────────── */}
      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight="bold">آخر المستندات</Typography>
          <Button size="small" endIcon={<ArrowForward />} onClick={() => navigate('/e-signature')}>
            عرض الكل
          </Button>
        </Box>
        {recentDocs.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>المستند</TableCell>
                  <TableCell>المُنشئ</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentDocs.map(d => (
                  <TableRow
                    key={d._id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/e-signature/sign/${d._id}`)}
                  >
                    <TableCell>{d.title}</TableCell>
                    <TableCell>{d.creator}</TableCell>
                    <TableCell>{d.date}</TableCell>
                    <TableCell>
                      <Chip
                        label={statusAr[d.status] || d.status}
                        color={statusChipColor[d.status] || 'default'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="text.secondary" textAlign="center" py={3}>
            لا توجد مستندات حديثة
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
