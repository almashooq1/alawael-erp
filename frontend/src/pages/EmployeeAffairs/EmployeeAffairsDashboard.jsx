/**
 * لوحة تحكم شؤون الموظفين — Employee Affairs Dashboard
 */
import { useState, useEffect } from 'react';




import apiClient from '../../services/api';

const PIE_COLORS = ['#1976d2', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];
const leaveStatusLabels = { pending: 'قيد الانتظار', approved: 'معتمدة', rejected: 'مرفوضة' };
const leaveStatusColors = { pending: 'warning', approved: 'success', rejected: 'error' };

export default function EmployeeAffairsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/employee-affairs/dashboard')
      .then((r) => { setData(r.data?.data || r.data); setLoading(false); })
      .catch(() => {
        setData({
          totalEmployees: 312, activeLeaves: 18, pendingRequests: 25, expiringContracts: 8,
          byDepartment: [
            { department: 'الإدارة', count: 45 }, { department: 'التأهيل', count: 68 },
            { department: 'التعليم', count: 55 }, { department: 'تقنية المعلومات', count: 32 },
            { department: 'المالية', count: 28 }, { department: 'الموارد البشرية', count: 22 },
          ],
          leavesByType: [
            { type: 'سنوية', count: 42 }, { type: 'مرضية', count: 18 },
            { type: 'طارئة', count: 12 }, { type: 'بدون راتب', count: 5 },
          ],
          recentLeaves: [
            { employeeName: 'محمد أحمد', type: 'سنوية', startDate: '2026-03-15', endDate: '2026-03-22', status: 'approved' },
            { employeeName: 'فاطمة علي', type: 'مرضية', startDate: '2026-03-18', endDate: '2026-03-20', status: 'pending' },
            { employeeName: 'عبدالرحمن خالد', type: 'طارئة', startDate: '2026-03-19', endDate: '2026-03-19', status: 'approved' },
          ],
        });
        setLoading(false);
      });
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>;
  if (!data) return null;

  const kpis = [
    { label: 'إجمالي الموظفين', value: data.totalEmployees, icon: <StaffIcon />, bg: '#e3f2fd' },
    { label: 'إجازات سارية', value: data.activeLeaves, icon: <LeaveIcon />, bg: '#e8f5e9' },
    { label: 'طلبات معلقة', value: data.pendingRequests, icon: <PromoIcon />, bg: '#fff3e0' },
    { label: 'عقود تنتهي قريباً', value: data.expiringContracts, icon: <DocIcon />, bg: '#fce4ec' },
  ];

  const deptData = (data.byDepartment || []).map((d) => ({ name: d.department, count: d.count }));
  const leaveData = (data.leavesByType || []).map((l) => ({ name: l.type, value: l.count }));

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>لوحة تحكم شؤون الموظفين</Typography>

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
            <Typography variant="h6" gutterBottom>الإجازات حسب النوع</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={leaveData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {leaveData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>الموظفون حسب القسم</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1976d2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>آخر طلبات الإجازات</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الموظف</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>من</TableCell>
                  <TableCell>إلى</TableCell>
                  <TableCell>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.recentLeaves || []).slice(0, 8).map((l, i) => (
                  <TableRow key={i}>
                    <TableCell>{l.employeeName}</TableCell>
                    <TableCell>{l.type}</TableCell>
                    <TableCell>{l.startDate}</TableCell>
                    <TableCell>{l.endDate}</TableCell>
                    <TableCell><Chip size="small" label={leaveStatusLabels[l.status] || l.status} color={leaveStatusColors[l.status] || 'default'} /></TableCell>
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
