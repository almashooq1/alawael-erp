/**
 * لوحة تحكم الأصول — Asset Dashboard
 */
import { useState, useEffect } from 'react';





import { getDashboard } from '../../services/assetManagement.service';

const statusMap = {
  active: { label: 'نشط', color: 'success' },
  maintenance: { label: 'صيانة', color: 'warning' },
  disposed: { label: 'مستبعد', color: 'error' },
  inactive: { label: 'غير نشط', color: 'default' },
};

export default function AssetDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then((r) => { setData(r.data); setLoading(false); });
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>;
  if (!data) return null;

  const kpis = [
    { label: 'إجمالي الأصول', value: data.totalAssets, icon: <AssetIcon />, bg: '#e3f2fd' },
    { label: 'أصول نشطة', value: data.activeAssets, icon: <ActiveIcon />, bg: '#e8f5e9' },
    { label: 'قيد الصيانة', value: data.inMaintenance, icon: <MaintIcon />, bg: '#fff3e0' },
    { label: 'مستبعدة', value: data.disposed, icon: <DisposedIcon />, bg: '#fce4ec' },
  ];

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        لوحة تحكم إدارة الأصول
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

      {/* Value summary */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">القيمة الإجمالية</Typography>
            <Typography variant="h5" fontWeight="bold" color="primary">
              {(data.totalValue || 0).toLocaleString()} ر.س
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">القيمة بعد الإهلاك</Typography>
            <Typography variant="h5" fontWeight="bold" color="secondary">
              {(data.depreciatedValue || 0).toLocaleString()} ر.س
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>توزيع حسب الفئة</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {(data.byCategory || []).map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>الأصول حسب الحالة</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.byStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1976d2" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>أحدث الأصول</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الاسم</TableCell>
                  <TableCell>الفئة</TableCell>
                  <TableCell>الموقع</TableCell>
                  <TableCell>القيمة</TableCell>
                  <TableCell>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.recentAssets || []).map((a) => (
                  <TableRow key={a._id}>
                    <TableCell>{a.name}</TableCell>
                    <TableCell>{a.category}</TableCell>
                    <TableCell>{a.location}</TableCell>
                    <TableCell>{(a.value || 0).toLocaleString()} ر.س</TableCell>
                    <TableCell>
                      <Chip size="small" label={statusMap[a.status]?.label || a.status} color={statusMap[a.status]?.color || 'default'} />
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
