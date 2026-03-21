/**
 * لوحة تحكم المشتريات — Procurement Dashboard
 */
import { useState, useEffect } from 'react';





import { getDashboard } from '../../services/procurement.service';

const statusLabels = { draft: 'مسودة', submitted: 'مقدّم', approved: 'معتمد', ordered: 'تم الطلب', received: 'مستلم' };
const PIE_COLORS = ['#607d8b', '#2196f3', '#4caf50', '#ff9800', '#1976d2'];

export default function ProcurementDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then((r) => { setData(r.data); setLoading(false); });
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>;
  if (!data) return null;

  const kpis = [
    { label: 'أوامر الشراء', value: data.totalOrders, icon: <OrderIcon />, bg: '#e3f2fd' },
    { label: 'طلبات معلّقة', value: data.pendingRequests, icon: <RequestIcon />, bg: '#fff3e0' },
    { label: 'الموردون', value: data.totalVendors, icon: <VendorIcon />, bg: '#e8f5e9' },
    { label: 'إجمالي الإنفاق', value: `${(data.totalSpend || 0).toLocaleString()} ر.س`, icon: <SpendIcon />, bg: '#f3e5f5' },
  ];

  const statusData = (data.byStatus || []).map((s, i) => ({
    name: statusLabels[s.status] || s.status, value: s.count, color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const vendorData = (data.topVendors || []).map((v) => ({ name: v.name, total: v.total }));

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>لوحة تحكم المشتريات</Typography>

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
            <Typography variant="h6" gutterBottom>حسب الحالة</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>أكبر الموردين</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={vendorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#1976d2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
