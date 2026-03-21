/**
 * لوحة تحكم مكتب المساعدة — Help Desk Dashboard
 */
import { useState, useEffect } from 'react';





import { getDashboard } from '../../services/helpdesk.service';

const priorityColors = { low: '#4caf50', medium: '#2196f3', high: '#ff9800', critical: '#f44336' };
const priorityLabels = { low: 'منخفض', medium: 'متوسط', high: 'مرتفع', critical: 'حرج' };
const statusLabels = { open: 'مفتوح', assigned: 'معيّن', in_progress: 'قيد التنفيذ', pending: 'معلق', resolved: 'محلول', closed: 'مغلق' };
const statusColors = { open: 'error', assigned: 'info', in_progress: 'warning', pending: 'default', resolved: 'success', closed: 'success' };
const categoryLabels = { hardware: 'أجهزة', software: 'برمجيات', network: 'شبكة', access: 'صلاحيات', email: 'بريد', printer: 'طابعة', phone: 'هاتف', security: 'أمان', general: 'عام', other: 'أخرى' };

export default function HelpDeskDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then((r) => { setData(r.data); setLoading(false); });
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>;
  if (!data) return null;

  const kpis = [
    { label: 'إجمالي التذاكر', value: data.total, icon: <TicketIcon />, bg: '#e3f2fd' },
    { label: 'مفتوحة', value: data.open, icon: <OpenIcon />, bg: '#fce4ec' },
    { label: 'قيد التنفيذ', value: data.inProgress, icon: <ProgressIcon />, bg: '#fff3e0' },
    { label: 'محلولة', value: data.resolved, icon: <ResolvedIcon />, bg: '#e8f5e9' },
  ];

  const priorityData = (data.byPriority || []).map((p) => ({
    name: priorityLabels[p.priority] || p.priority,
    value: p.count,
    color: priorityColors[p.priority] || '#607d8b',
  }));

  const categoryData = (data.byCategory || []).map((c) => ({
    category: categoryLabels[c.category] || c.category,
    count: c.count,
  }));

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        لوحة تحكم مكتب المساعدة
      </Typography>

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

      {/* SLA + Critical alerts */}
      {(data.critical > 0 || data.slaBreached > 0) && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#fff3e0' }}>
          <Typography variant="subtitle1" fontWeight="bold" color="error">
            تنبيهات: {data.critical} تذاكر حرجة | {data.slaBreached} تجاوزت SLA
          </Typography>
        </Paper>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>حسب الأولوية</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {priorityData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>حسب الفئة</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1976d2" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>أحدث التذاكر</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الرقم</TableCell>
                  <TableCell>العنوان</TableCell>
                  <TableCell>الفئة</TableCell>
                  <TableCell>الأولوية</TableCell>
                  <TableCell>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.recentTickets || []).map((t) => (
                  <TableRow key={t._id}>
                    <TableCell>{t.ticketNumber}</TableCell>
                    <TableCell>{t.titleAr}</TableCell>
                    <TableCell>{categoryLabels[t.category] || t.category}</TableCell>
                    <TableCell>
                      <Chip size="small" label={priorityLabels[t.priority] || t.priority} sx={{ bgcolor: priorityColors[t.priority], color: '#fff' }} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={statusLabels[t.status] || t.status} color={statusColors[t.status] || 'default'} />
                    </TableCell>
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
