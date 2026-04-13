/**
 * Training Dashboard — لوحة التدريب والتطوير
 */
import { useState, useEffect, useCallback } from 'react';
import { useTheme, alpha,
} from '@mui/material';
import { getTrainingDashboard } from '../../services/training.service';

const CAT_LABELS = { technical: 'تقنية', leadership: 'قيادة', soft_skills: 'مهارات ناعمة', compliance: 'امتثال', safety: 'سلامة', professional: 'مهنية', language: 'لغات', other: 'أخرى' };
const COLORS = ['#2196f3', '#4caf50', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4', '#795548', '#607d8b'];

export default function TrainingDashboard() {
  const theme = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { setData(await getTrainingDashboard()); } catch { setError('خطأ في تحميل البيانات'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress size={64} /></Box>;
  if (!data) return <Alert severity="error">لا توجد بيانات</Alert>;

  const { summary, coursesByCategory, upcomingSessions } = data;
  const kpis = [
    { label: 'إجمالي الدورات', value: summary.totalCourses, icon: <School />, color: '#2196f3' },
    { label: 'جلسات نشطة', value: summary.activeSessions, icon: <Groups />, color: '#4caf50' },
    { label: 'جلسات مكتملة', value: summary.completedSessions, icon: <CheckCircle />, color: '#ff9800' },
    { label: 'خطط معتمدة', value: summary.activePlans, icon: <EventNote />, color: '#9c27b0' },
  ];

  const catData = coursesByCategory.map((c) => ({ name: CAT_LABELS[c.category] || c.category, value: c.count }));

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box><Typography variant="h4" fontWeight={700}>لوحة التدريب والتطوير</Typography><Typography variant="body2" color="text.secondary">نظرة شاملة على برامج التدريب</Typography></Box>
        <Tooltip title="تحديث"><IconButton onClick={fetch} color="primary"><Refresh /></IconButton></Tooltip>
      </Box>
      {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((k, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(k.color, 0.1), color: k.color, display: 'flex' }}>{k.icon}</Box>
              <Box><Typography variant="h5" fontWeight={700}>{k.value?.toLocaleString('ar-SA')}</Typography><Typography variant="caption" color="text.secondary">{k.label}</Typography></Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Category Pie */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={600} mb={2}>الدورات حسب الفئة</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart><Pie data={catData} cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><RTooltip /></PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Category Bar */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={600} mb={2}>توزيع الفئات</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={catData} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" />
                <RTooltip /><Bar dataKey="value" fill="#2196f3" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Upcoming Sessions */}
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={600} mb={2}>الجلسات القادمة</Typography>
            {upcomingSessions.length === 0 ? <Typography color="text.secondary">لا توجد جلسات قادمة</Typography> : (
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>الرمز</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الدورة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                </TableRow></TableHead>
                <TableBody>{upcomingSessions.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell>{s.sessionCode}</TableCell>
                    <TableCell>{s.course?.titleAr || '—'}</TableCell>
                    <TableCell>{s.startDate ? new Date(s.startDate).toLocaleDateString('ar-SA') : '—'}</TableCell>
                    <TableCell><Chip label="مجدولة" size="small" color="info" /></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
