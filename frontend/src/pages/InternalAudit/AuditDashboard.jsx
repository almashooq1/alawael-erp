/**
 * لوحة تحكم التدقيق الداخلي — Internal Audit Dashboard
 */
import { useState, useEffect } from 'react';

import { getDashboard } from '../../services/internalAudit.service';
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

const statusMap = {
  completed: { label: 'مكتمل', color: 'success' },
  in_progress: { label: 'قيد التنفيذ', color: 'warning' },
  planned: { label: 'مخطط', color: 'info' },
  draft: { label: 'مسودة', color: 'default' },
};

export default function AuditDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then((r) => { setData(r.data); setLoading(false); });
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>;
  if (!data) return null;

  const kpis = [
    { label: 'خطط التدقيق', value: data.totalPlans, icon: <PlanIcon />, bg: '#e3f2fd' },
    { label: 'عمليات التدقيق', value: data.totalAudits, icon: <AuditIcon />, bg: '#fff3e0' },
    { label: 'ملاحظات مفتوحة', value: data.openFindings, icon: <FindingIcon />, bg: '#fce4ec' },
    { label: 'ملاحظات مغلقة', value: data.closedFindings, icon: <ClosedIcon />, bg: '#e8f5e9' },
  ];

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        لوحة تحكم التدقيق الداخلي
      </Typography>

      {/* KPIs */}
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
        {/* Pie — by status */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>توزيع حسب الحالة</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {data.byStatus.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Bar — by type */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>عمليات التدقيق حسب النوع</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.byType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1976d2" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Recent */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>أحدث عمليات التدقيق</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>رقم الخطة</TableCell>
                  <TableCell>العنوان</TableCell>
                  <TableCell>السنة</TableCell>
                  <TableCell>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.recentAudits || []).map((a) => (
                  <TableRow key={a._id}>
                    <TableCell>{a.planId}</TableCell>
                    <TableCell>{a.title}</TableCell>
                    <TableCell>{a.year}</TableCell>
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
