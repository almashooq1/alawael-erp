/**
 * Supply Chain Dashboard — لوحة تحكم سلسلة الإمداد
 */
import { useState, useEffect } from 'react';

import {
  LocalShipping, Inventory, Store, Assessment
} from '@mui/icons-material';
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

const COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#d32f2f', '#9c27b0', '#00bcd4'];

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

export default function SupplyChainDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/api/supply-chain/analytics');
        setData(res.data.data || res.data);
      } catch {
        setData({
          totalSuppliers: 48, activeOrders: 23, inventoryItems: 1250, shipmentsInTransit: 12,
          ordersByStatus: [
            { name: 'مكتمل', value: 120 }, { name: 'قيد التنفيذ', value: 23 },
            { name: 'معلق', value: 8 }, { name: 'ملغي', value: 3 }
          ],
          inventoryByCategory: [
            { category: 'أجهزة طبية', count: 320 }, { category: 'مستلزمات', count: 450 },
            { category: 'أدوية', count: 280 }, { category: 'مواد غذائية', count: 200 }
          ],
          recentOrders: [
            { _id: '1', orderNumber: 'PO-2026-001', supplier: 'مؤسسة الإمداد', total: 45000, status: 'مكتمل' },
            { _id: '2', orderNumber: 'PO-2026-002', supplier: 'شركة التقنية', total: 78000, status: 'قيد التنفيذ' },
            { _id: '3', orderNumber: 'PO-2026-003', supplier: 'مصنع المعدات', total: 32000, status: 'معلق' }
          ]
        });
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <LinearProgress />;
  if (!data) return null;

  const statusColor = { 'مكتمل': 'success', 'قيد التنفيذ': 'info', 'معلق': 'warning', 'ملغي': 'error' };

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" mb={3}>لوحة تحكم سلسلة الإمداد</Typography>
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={Store} title="الموردين" value={data.totalSuppliers} color="#1976d2" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={LocalShipping} title="الطلبات النشطة" value={data.activeOrders} color="#2e7d32" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={Inventory} title="عناصر المخزون" value={data.inventoryItems?.toLocaleString()} color="#ed6c02" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={Assessment} title="شحنات قيد النقل" value={data.shipmentsInTransit} color="#d32f2f" /></Grid>
      </Grid>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={2}>حالة الطلبات</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart><Pie data={data.ordersByStatus} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name" label>
                {data.ordersByStatus?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip /><Legend /></PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={2}>المخزون حسب الفئة</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.inventoryByCategory}><CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" /><YAxis /><Tooltip />
                <Bar dataKey="count" fill="#1976d2" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>آخر الطلبات</Typography>
        <TableContainer><Table size="small">
          <TableHead><TableRow>
            <TableCell>رقم الطلب</TableCell><TableCell>المورد</TableCell>
            <TableCell>المبلغ</TableCell><TableCell>الحالة</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {data.recentOrders?.map(o => (
              <TableRow key={o._id}>
                <TableCell>{o.orderNumber}</TableCell><TableCell>{o.supplier}</TableCell>
                <TableCell>{o.total?.toLocaleString()} ر.س</TableCell>
                <TableCell><Chip label={o.status} color={statusColor[o.status] || 'default'} size="small" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></TableContainer>
      </Paper>
    </Box>
  );
}
