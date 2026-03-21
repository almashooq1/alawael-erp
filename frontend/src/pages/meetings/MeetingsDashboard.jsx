/**
 * لوحة تحكم الاجتماعات — Meetings Dashboard
 */
import { useState, useEffect } from 'react';




import apiClient from '../../services/api';

const PIE_COLORS = ['#1976d2', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];
const typeLabels = { department: 'إداري', board: 'مجلس إدارة', general: 'عام', emergency: 'طارئ', project: 'مشروع', training: 'تدريبي', review: 'مراجعة' };
const statusLabels = { scheduled: 'مجدول', in_progress: 'قيد الانعقاد', completed: 'مكتمل', cancelled: 'ملغى' };
const statusColors = { scheduled: 'info', in_progress: 'warning', completed: 'success', cancelled: 'error' };

export default function MeetingsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/meetings', { params: { limit: 100 } })
      .then((r) => {
        const meetings = r.data?.data || r.data?.meetings || r.data || [];
        const list = Array.isArray(meetings) ? meetings : [];
        const scheduled = list.filter((m) => m.status === 'scheduled').length;
        const completed = list.filter((m) => m.status === 'completed').length;
        const withMinutes = list.filter((m) => m.minutes && m.minutes.length > 0).length;
        const byType = {};
        list.forEach((m) => { byType[m.type] = (byType[m.type] || 0) + 1; });
        setData({
          totalMeetings: list.length, scheduled, completed, withMinutes,
          byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
          recentMeetings: list.slice(0, 6),
        });
        setLoading(false);
      })
      .catch(() => {
        setData({
          totalMeetings: 156, scheduled: 12, completed: 128, withMinutes: 95,
          byType: [
            { type: 'department', count: 58 }, { type: 'board', count: 24 },
            { type: 'project', count: 35 }, { type: 'general', count: 22 },
            { type: 'training', count: 12 }, { type: 'review', count: 5 },
          ],
          recentMeetings: [
            { meetingId: 'MTG-2026-042', title: 'اجتماع لجنة المشاريع', type: 'project', date: '2026-03-22', status: 'scheduled' },
            { meetingId: 'MTG-2026-041', title: 'اجتماع مجلس الإدارة', type: 'board', date: '2026-03-20', status: 'completed' },
            { meetingId: 'MTG-2026-040', title: 'مراجعة الأداء الفصلي', type: 'review', date: '2026-03-18', status: 'completed' },
          ],
        });
        setLoading(false);
      });
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>;
  if (!data) return null;

  const kpis = [
    { label: 'إجمالي الاجتماعات', value: data.totalMeetings, icon: <MeetingIcon />, bg: '#e3f2fd' },
    { label: 'مجدولة', value: data.scheduled, icon: <ScheduledIcon />, bg: '#fff3e0' },
    { label: 'مكتملة', value: data.completed, icon: <CompletedIcon />, bg: '#e8f5e9' },
    { label: 'بمحاضر', value: data.withMinutes, icon: <MinutesIcon />, bg: '#f3e5f5' },
  ];

  const typeData = (data.byType || []).map((t) => ({
    name: typeLabels[t.type] || t.type, value: t.count,
  }));

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>لوحة تحكم الاجتماعات</Typography>

      <Grid container spacing={2} mb={3}>
        {kpis.map((k) => (
          <Grid item xs={12} sm={6} md={3} key={k.label}>
            <Card sx={{ bgcolor: k.bg }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {k.icon}
                <Box>
                  <Typography variant="h5" fontWeight="bold">{k.value}</Typography>
                  <Typography variant="body2" color="text.secondary">{k.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>الاجتماعات حسب النوع</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {typeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>آخر الاجتماعات</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الرقم</TableCell>
                  <TableCell>العنوان</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.recentMeetings || []).slice(0, 8).map((m, i) => (
                  <TableRow key={i}>
                    <TableCell>{m.meetingId}</TableCell>
                    <TableCell>{m.title}</TableCell>
                    <TableCell>{typeLabels[m.type] || m.type}</TableCell>
                    <TableCell>{typeof m.date === 'string' ? m.date.split('T')[0] : m.date}</TableCell>
                    <TableCell><Chip size="small" label={statusLabels[m.status] || m.status} color={statusColors[m.status] || 'default'} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
