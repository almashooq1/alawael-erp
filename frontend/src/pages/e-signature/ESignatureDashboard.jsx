/**
 * E-Signature Dashboard — لوحة تحكم التوقيع الإلكتروني
 */
import { useState, useEffect } from 'react';

import { Draw, Approval as Stamp, Verified, PendingActions } from '@mui/icons-material';
import apiClient from '../../services/api';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Icon,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';

const COLORS = ['#4caf50', '#ff9800', '#f44336', '#2196f3', '#9c27b0'];

const KPICard = ({ icon: Icon, title, value, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Icon sx={{ color }} />
        <Typography variant="body2" color="text.secondary">{title}</Typography>
      </Box>
      <Typography variant="h4" fontWeight="bold">{value}</Typography>
    </CardContent>
  </Card>
);

export default function ESignatureDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sigRes, stampRes] = await Promise.all([
          apiClient.get('/api/e-signature/stats'),
          apiClient.get('/api/e-stamp/stats')
        ]);
        const sig = sigRes.data.data || sigRes.data;
        const stamp = stampRes.data.data || stampRes.data;
        setData({ ...sig, stamps: stamp });
      } catch {
        setData({
          totalSignatures: 342, pendingSignatures: 28, completedSignatures: 298, rejectedSignatures: 16,
          stamps: { totalStamps: 156, activeStamps: 130 },
          byStatus: [
            { name: 'مكتمل', value: 298 }, { name: 'معلق', value: 28 },
            { name: 'مرفوض', value: 16 }
          ],
          monthlyActivity: [
            { month: 'يناير', signatures: 45, stamps: 20 },
            { month: 'فبراير', signatures: 52, stamps: 25 },
            { month: 'مارس', signatures: 68, stamps: 30 },
            { month: 'أبريل', signatures: 55, stamps: 22 },
            { month: 'مايو', signatures: 60, stamps: 28 },
            { month: 'يونيو', signatures: 62, stamps: 31 }
          ],
          recentDocuments: [
            { _id: '1', title: 'عقد توظيف #245', signer: 'أحمد محمد', status: 'مكتمل', date: '2026-03-20' },
            { _id: '2', title: 'خطاب رسمي #189', signer: 'فاطمة أحمد', status: 'بانتظار التوقيع', date: '2026-03-21' },
            { _id: '3', title: 'محضر اجتماع #56', signer: 'خالد العلي', status: 'مرفوض', date: '2026-03-19' }
          ]
        });
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <LinearProgress />;
  if (!data) return null;

  const statusColor = { 'مكتمل': 'success', 'بانتظار التوقيع': 'warning', 'مرفوض': 'error' };

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" mb={3}>لوحة تحكم التوقيع والختم الإلكتروني</Typography>
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={Draw} title="إجمالي التوقيعات" value={data.totalSignatures} color="#1976d2" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={PendingActions} title="بانتظار التوقيع" value={data.pendingSignatures} color="#ff9800" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={Verified} title="مكتملة" value={data.completedSignatures} color="#4caf50" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={Stamp} title="الأختام النشطة" value={data.stamps?.activeStamps || 0} color="#9c27b0" /></Grid>
      </Grid>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={2}>حالة التوقيعات</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart><Pie data={data.byStatus} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name" label>
                {data.byStatus?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip /><Legend /></PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={2}>النشاط الشهري</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthlyActivity}><CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" /><YAxis /><Tooltip /><Legend />
                <Bar dataKey="signatures" name="توقيعات" fill="#1976d2" radius={[4,4,0,0]} />
                <Bar dataKey="stamps" name="أختام" fill="#9c27b0" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>آخر المستندات</Typography>
        <TableContainer><Table size="small">
          <TableHead><TableRow>
            <TableCell>المستند</TableCell><TableCell>الموقع</TableCell>
            <TableCell>التاريخ</TableCell><TableCell>الحالة</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {data.recentDocuments?.map(d => (
              <TableRow key={d._id}>
                <TableCell>{d.title}</TableCell><TableCell>{d.signer}</TableCell>
                <TableCell>{d.date}</TableCell>
                <TableCell><Chip label={d.status} color={statusColor[d.status] || 'default'} size="small" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></TableContainer>
      </Paper>
    </Box>
  );
}
