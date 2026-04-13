/**
 * لوحة تحكم العقود — Contract Management Dashboard
 */
import { useState, useEffect } from 'react';




import { getDashboard } from '../../services/contractManagement.service';

const typeLabels = {
  SERVICE_AGREEMENT: 'عقد خدمات', SUPPLY_AGREEMENT: 'عقد توريد',
  MAINTENANCE_AGREEMENT: 'عقد صيانة', FRAMEWORK_AGREEMENT: 'عقد إطاري',
  ONE_TIME_PURCHASE: 'شراء لمرة واحدة', DISTRIBUTION_AGREEMENT: 'عقد توزيع',
};
const statusLabels = { ACTIVE: 'نشط', DRAFT: 'مسودة', EXPIRED: 'منتهي', TERMINATED: 'ملغي', SUSPENDED: 'معلق' };
const _statusColors = { ACTIVE: 'success', DRAFT: 'default', EXPIRED: 'error', TERMINATED: 'error', SUSPENDED: 'warning' };
const PIE_COLORS = ['#1976d2', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];

export default function ContractDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then((r) => { setData(r.data); setLoading(false); });
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>;
  if (!data) return null;

  const kpis = [
    { label: 'إجمالي العقود', value: data.total, icon: <ContractIcon />, bg: '#e3f2fd' },
    { label: 'نشطة', value: data.active, icon: <ActiveIcon />, bg: '#e8f5e9' },
    { label: 'تنتهي خلال 30 يوم', value: data.expiringIn30Days || 0, icon: <ExpiringIcon />, bg: '#fff3e0' },
    { label: 'القيمة الإجمالية', value: `${(data.totalValue || 0).toLocaleString()} ر.س`, icon: <ValueIcon />, bg: '#f3e5f5' },
  ];

  const typeData = (data.byType || []).map((t, i) => ({
    name: typeLabels[t.type] || t.type, value: t.count, color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const statusData = (data.byStatus || []).map((s) => ({
    status: statusLabels[s.status] || s.status, count: s.count,
  }));

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>لوحة تحكم العقود</Typography>

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
            <Typography variant="h6" gutterBottom>حسب النوع</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {typeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>حسب الحالة</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1976d2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
