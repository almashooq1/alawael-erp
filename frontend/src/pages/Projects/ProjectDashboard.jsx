/**
 * لوحة تحكم المشاريع — Project Management Dashboard
 */
import { useState, useEffect } from 'react';

import { getDashboard } from '../../services/projectManagement.service';
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
import { ActiveIcon } from 'utils/iconAliases';

const statusLabels = { active: 'نشط', completed: 'مكتمل', on_hold: 'معلق', access_request: 'طلب وصول' };
const statusColors = { active: 'primary', completed: 'success', on_hold: 'warning', access_request: 'info' };
const priorityLabels = { low: 'منخفض', medium: 'متوسط', high: 'مرتفع', critical: 'حرج' };
const priorityColors = { low: '#4caf50', medium: '#2196f3', high: '#ff9800', critical: '#f44336' };

export default function ProjectDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then((r) => { setData(r.data); setLoading(false); });
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>;
  if (!data) return null;

  const kpis = [
    { label: 'إجمالي المشاريع', value: data.total, icon: <ProjectIcon />, bg: '#e3f2fd' },
    { label: 'نشطة', value: data.active, icon: <ActiveIcon />, bg: '#e8f5e9' },
    { label: 'مكتملة', value: data.completed, icon: <CompletedIcon />, bg: '#f3e5f5' },
    { label: 'معلّقة', value: data.onHold, icon: <HoldIcon />, bg: '#fff3e0' },
  ];

  const priorityData = (data.byPriority || []).map((p) => ({
    name: priorityLabels[p.priority] || p.priority,
    value: p.count,
    color: priorityColors[p.priority] || '#607d8b',
  }));

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>لوحة تحكم المشاريع</Typography>

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
            <Typography variant="h6" gutterBottom>أحدث المشاريع</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الاسم</TableCell>
                  <TableCell>الأولوية</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>الميزانية</TableCell>
                  <TableCell>تاريخ البدء</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.recentProjects || []).map((p) => (
                  <TableRow key={p._id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>
                      <Chip size="small" label={priorityLabels[p.priority] || p.priority} sx={{ bgcolor: priorityColors[p.priority], color: '#fff' }} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={statusLabels[p.status] || p.status} color={statusColors[p.status] || 'default'} />
                    </TableCell>
                    <TableCell>{(p.budget || 0).toLocaleString()} ر.س</TableCell>
                    <TableCell>{p.startDate ? new Date(p.startDate).toLocaleDateString('ar-SA') : '—'}</TableCell>
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
