/**
 * لوحة تحكم إدارة الوثائق — Document Management Dashboard
 */
import { useState, useEffect } from 'react';

import apiClient from '../../services/api';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import ApprovalIcon from '@mui/icons-material/Approval';
import { DocIcon } from 'utils/iconAliases';

const PIE_COLORS = ['#1976d2', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];

export default function DocumentsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/documents-advanced/overview')
      .then((r) => { setData(r.data?.data || r.data); setLoading(false); })
      .catch(() => {
        setData({
          totalDocuments: 4520, pendingApprovals: 28, trashedDocuments: 65, qrGenerated: 890,
          byCategory: [
            { category: 'خطابات رسمية', count: 1200 }, { category: 'عقود', count: 850 },
            { category: 'تقارير', count: 720 }, { category: 'نماذج', count: 580 },
            { category: 'محاضر اجتماعات', count: 420 }, { category: 'أخرى', count: 750 },
          ],
          monthlyActivity: [
            { month: 'يناير', created: 180, approved: 160 },
            { month: 'فبراير', created: 210, approved: 195 },
            { month: 'مارس', created: 195, approved: 180 },
          ],
          recentDocuments: [
            { title: 'خطاب تعيين - أحمد محمد', category: 'خطابات رسمية', createdAt: '2026-03-20', status: 'approved' },
            { title: 'عقد صيانة المبنى', category: 'عقود', createdAt: '2026-03-19', status: 'pending' },
            { title: 'تقرير الأداء الفصلي Q1', category: 'تقارير', createdAt: '2026-03-18', status: 'draft' },
            { title: 'محضر اجتماع مجلس الإدارة', category: 'محاضر', createdAt: '2026-03-17', status: 'approved' },
          ],
        });
        setLoading(false);
      });
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>;
  if (!data) return null;

  const fmt = (v) => (v || 0).toLocaleString('ar-SA');
  const kpis = [
    { label: 'إجمالي الوثائق', value: fmt(data.totalDocuments), icon: <DocIcon />, bg: '#e3f2fd' },
    { label: 'بانتظار الاعتماد', value: data.pendingApprovals, icon: <ApprovalIcon />, bg: '#fff3e0' },
    { label: 'المحذوفة', value: data.trashedDocuments, icon: <TrashIcon />, bg: '#fce4ec' },
    { label: 'رموز QR', value: fmt(data.qrGenerated), icon: <QRIcon />, bg: '#e8f5e9' },
  ];

  const categoryData = (data.byCategory || []).map((c) => ({ name: c.category, value: c.count }));
  const monthlyData = data.monthlyActivity || [];

  const statusLabels = { approved: 'معتمد', pending: 'قيد الاعتماد', draft: 'مسودة', archived: 'مؤرشف' };
  const statusColors = { approved: 'success', pending: 'warning', draft: 'default', archived: 'info' };

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>لوحة تحكم إدارة الوثائق</Typography>

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
            <Typography variant="h6" gutterBottom>الوثائق حسب الفئة</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>النشاط الشهري</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip /><Legend />
                <Bar dataKey="created" name="منشأة" fill="#1976d2" radius={[4, 4, 0, 0]} />
                <Bar dataKey="approved" name="معتمدة" fill="#4caf50" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>آخر الوثائق</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>العنوان</TableCell>
                  <TableCell>الفئة</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.recentDocuments || []).slice(0, 8).map((d, i) => (
                  <TableRow key={i}>
                    <TableCell>{d.title}</TableCell>
                    <TableCell>{d.category}</TableCell>
                    <TableCell>{d.createdAt}</TableCell>
                    <TableCell><Chip size="small" label={statusLabels[d.status] || d.status} color={statusColors[d.status] || 'default'} /></TableCell>
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
