/**
 * Warehouse Dashboard — لوحة تحكم المستودعات
 */
import { useState, useEffect, useCallback } from 'react';
import { useTheme, alpha,
} from '@mui/material';
import { getWarehouseDashboard } from '../../services/warehouse.service';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import Warning from '@mui/icons-material/Warning';
import Refresh from '@mui/icons-material/Refresh';

const CATEGORY_LABELS = {
  equipment: 'معدات', supplies: 'مستلزمات', medical: 'طبية', food: 'غذائية',
  cleaning: 'تنظيف', office: 'مكتبية', educational: 'تعليمية', other: 'أخرى',
};
const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548', '#607D8B'];

const TX_TYPE_LABELS = {
  receive: 'استلام', issue: 'صرف', transfer: 'تحويل', return: 'إرجاع',
  adjustment: 'تسوية', disposal: 'إتلاف', count: 'جرد',
};

export default function WarehouseDashboard() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { setData(await getWarehouseDashboard()); } catch { setError('خطأ في تحميل البيانات'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress size={60} /></Box>;

  const s = data?.summary || {};
  const cats = (data?.categoryBreakdown || []).map((c) => ({ name: CATEGORY_LABELS[c._id] || c._id, value: c.count, cost: c.value }));
  const txs = data?.recentTransactions || [];

  const cards = [
    { label: 'المستودعات النشطة', value: s.totalWarehouses, icon: <WarehouseIcon />, color: '#4CAF50' },
    { label: 'إجمالي الأصناف', value: s.totalItems, icon: <Inventory2 />, color: '#2196F3' },
    { label: 'نقص المخزون', value: s.lowStock, icon: <Warning />, color: '#F44336' },
    { label: 'حركات الشهر', value: s.transactions, icon: <Receipt />, color: '#9C27B0' },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>إدارة المستودعات</Typography>
          <Typography variant="body2" color="text.secondary">نظرة عامة على المخزون والحركات</Typography>
        </Box>
        <Tooltip title="تحديث"><IconButton onClick={fetch} color="primary"><Refresh /></IconButton></Tooltip>
      </Box>

      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {cards.map((c, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, textAlign: 'center' }}>
                <Box sx={{ color: c.color, mb: 1 }}>{c.icon}</Box>
                <Typography variant="h4" fontWeight={700} color={c.color}>{(c.value || 0).toLocaleString('ar-SA')}</Typography>
                <Typography variant="caption" color="text.secondary">{c.label}</Typography>
              </Paper>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Category Pie */}
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>توزيع الأصناف حسب الفئة</Typography>
            {cats.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>لا توجد بيانات</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={cats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                    {cats.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                  </Pie>
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Category Value Bar */}
        <Grid item xs={12} md={7}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>قيمة المخزون حسب الفئة</Typography>
            {cats.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>لا توجد بيانات</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={cats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                  <RTooltip />
                  <Bar dataKey="cost" fill="#2196F3" name="القيمة (ر.س)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Recent Transactions */}
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" fontWeight={600}>آخر الحركات</Typography>
            </Box>
            {txs.length === 0 ? (
              <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>لا توجد حركات حديثة</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                    <TableCell sx={{ fontWeight: 700 }}>رقم الحركة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>القيمة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {txs.map((tx, i) => (
                    <TableRow key={tx._id || i}>
                      <TableCell>{tx.transactionNumber}</TableCell>
                      <TableCell><Chip label={TX_TYPE_LABELS[tx.type] || tx.type} size="small" variant="outlined" /></TableCell>
                      <TableCell><Chip label={tx.status} size="small" color={tx.status === 'completed' ? 'success' : 'warning'} /></TableCell>
                      <TableCell>{(tx.totalValue || 0).toLocaleString('ar-SA')} ر.س</TableCell>
                      <TableCell>{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('ar-SA') : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Total Value Highlight */}
      <Paper
        elevation={0}
        sx={{ mt: 3, p: 3, borderRadius: 3, background: `linear-gradient(135deg, ${alpha('#4CAF50', 0.08)}, ${alpha('#2196F3', 0.08)})`, border: `1px solid ${theme.palette.divider}`, textAlign: 'center' }}
      >
        <Typography variant="body2" color="text.secondary">إجمالي قيمة المخزون</Typography>
        <Typography variant="h3" fontWeight={700} color="primary">
          {(s.totalValue || 0).toLocaleString('ar-SA')} ر.س
        </Typography>
      </Paper>
    </Box>
  );
}
