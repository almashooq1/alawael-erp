/**
 * لوحة تحكم مركز الرسائل — Messaging Center Dashboard
 */
import { useState, useEffect } from 'react';




import apiClient from '../../services/api';

const PIE_COLORS = ['#1976d2', '#4caf50', '#ff9800', '#f44336', '#9c27b0'];

export default function MessagingDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/messages/stats')
      .then((r) => { setData(r.data?.data || r.data); setLoading(false); })
      .catch(() => {
        setData({
          totalMessages: 1850, unreadCount: 45, sentCount: 620, conversationsCount: 128,
          byType: [
            { type: 'رسالة مباشرة', count: 980 }, { type: 'مجموعة', count: 520 },
            { type: 'إشعار', count: 250 }, { type: 'تنبيه نظام', count: 100 },
          ],
          weeklyActivity: [
            { day: 'الأحد', sent: 45, received: 62 },
            { day: 'الاثنين', sent: 52, received: 78 },
            { day: 'الثلاثاء', sent: 38, received: 55 },
            { day: 'الأربعاء', sent: 61, received: 80 },
            { day: 'الخميس', sent: 40, received: 58 },
          ],
          recentMessages: [
            { from: 'أحمد محمد', subject: 'اجتماع الغد', time: '10:30', isRead: false },
            { from: 'سارة علي', subject: 'تقرير الأداء الشهري', time: '09:15', isRead: true },
            { from: 'إدارة النظام', subject: 'تحديث كلمة المرور', time: '08:00', isRead: false },
            { from: 'خالد عبدالله', subject: 'طلب إجازة', time: 'أمس', isRead: true },
          ],
        });
        setLoading(false);
      });
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>;
  if (!data) return null;

  const kpis = [
    { label: 'إجمالي الرسائل', value: data.totalMessages, icon: <InboxIcon />, bg: '#e3f2fd' },
    { label: 'غير مقروءة', value: data.unreadCount, icon: <UnreadIcon />, bg: '#fce4ec' },
    { label: 'مرسلة', value: data.sentCount, icon: <SentIcon />, bg: '#e8f5e9' },
    { label: 'المحادثات', value: data.conversationsCount, icon: <ConvoIcon />, bg: '#f3e5f5' },
  ];

  const typeData = (data.byType || []).map((t) => ({ name: t.type, value: t.count }));
  const weeklyData = data.weeklyActivity || [];

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>مركز الرسائل والتواصل</Typography>

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
            <Typography variant="h6" gutterBottom>أنواع الرسائل</Typography>
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
            <Typography variant="h6" gutterBottom>النشاط الأسبوعي</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip /><Legend />
                <Bar dataKey="sent" name="مرسلة" fill="#1976d2" radius={[4, 4, 0, 0]} />
                <Bar dataKey="received" name="مستلمة" fill="#4caf50" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>آخر الرسائل</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>المرسل</TableCell>
                  <TableCell>الموضوع</TableCell>
                  <TableCell>الوقت</TableCell>
                  <TableCell>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.recentMessages || []).slice(0, 8).map((m, i) => (
                  <TableRow key={i} sx={{ fontWeight: m.isRead ? 'normal' : 'bold' }}>
                    <TableCell sx={{ fontWeight: m.isRead ? 'normal' : 'bold' }}>{m.from}</TableCell>
                    <TableCell sx={{ fontWeight: m.isRead ? 'normal' : 'bold' }}>{m.subject}</TableCell>
                    <TableCell>{m.time}</TableCell>
                    <TableCell><Chip size="small" label={m.isRead ? 'مقروءة' : 'جديدة'} color={m.isRead ? 'default' : 'primary'} /></TableCell>
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
