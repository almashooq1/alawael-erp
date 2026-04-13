/* eslint-disable no-console */
import { useState, useEffect, useCallback } from 'react';
import { getToken } from '../../utils/tokenStorage';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,  IconButton,
  Tooltip,
  Grid,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import {
  AccountTree,
  Refresh,
  Add,
  Calculate,
  CheckCircle,
  Publish,
  Business,
  Assessment,
} from '@mui/icons-material';
import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';
const fmt = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v || 0);

const statusMap = {
  draft: { label: 'مسودة', color: '#9E9E9E' },
  in_progress: { label: 'قيد المعالجة', color: '#FF9800' },
  review: { label: 'قيد المراجعة', color: '#2196F3' },
  approved: { label: 'معتمد', color: '#4CAF50' },
  published: { label: 'منشور', color: '#8BC34A' },
};

const FinancialConsolidation = () => {
  const [tab, setTab] = useState(0);
  const [consolidations, setConsolidations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    name: '',
    period: '',
    periodStart: '',
    periodEnd: '',
  });

  const token = getToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        fetch(`${API}/finance/ultimate/consolidation`, { headers }),
        fetch(`${API}/finance/ultimate/consolidation/summary/dashboard`, { headers }),
      ]);
      const cData = await cRes.json();
      const sData = await sRes.json();
      if (cData.success) setConsolidations(cData.data);
      if (sData.success) setSummary(sData.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API}/finance/ultimate/consolidation`, {
        method: 'POST',
        headers,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setDialogOpen(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCalculate = async id => {
    try {
      const res = await fetch(`${API}/finance/ultimate/consolidation/${id}/calculate`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const res = await fetch(`${API}/finance/ultimate/consolidation/${id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDetail = async id => {
    try {
      const res = await fetch(`${API}/finance/ultimate/consolidation/${id}`, { headers });
      const data = await res.json();
      if (data.success) {
        setSelected(data.data);
        setDetailDialog(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading)
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700} color={neutralColors.textPrimary}>
          <AccountTree sx={{ mr: 1, verticalAlign: 'middle' }} />
          التجميع المالي
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchData}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
            sx={{ bgcolor: brandColors.primary, '&:hover': { bgcolor: brandColors.primaryDark } }}
          >
            تجميع جديد
          </Button>
        </Box>
      </Box>

      {summary && (
        <Grid container spacing={2} mb={3}>
          {[
            {
              label: 'إجمالي التجميعات',
              value: summary.total,
              color: '#2196F3',
              icon: <AccountTree />,
            },
            { label: 'منشور', value: summary.published, color: '#4CAF50', icon: <Publish /> },
            {
              label: 'قيد المعالجة',
              value: summary.inProgress,
              color: '#FF9800',
              icon: <Calculate />,
            },
            { label: 'مسودة', value: summary.draft, color: '#9E9E9E', icon: <Assessment /> },
          ].map((s, i) => (
            <Grid item xs={6} md={3} key={i}>
              <Card sx={{ bgcolor: surfaceColors.card, border: `2px solid ${s.color}20` }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Box sx={{ color: s.color, mb: 1 }}>{s.icon}</Box>
                  <Typography variant="h4" fontWeight={700} color={s.color}>
                    {s.value}
                  </Typography>
                  <Typography variant="body2" color={neutralColors.textSecondary}>
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {summary?.latest && (
        <Alert severity="info" sx={{ mb: 2 }}>
          آخر تجميع منشور — الأصول: {fmt(summary.latest.totalAssets)} | الالتزامات:{' '}
          {fmt(summary.latest.totalLiabilities)} | حقوق الملكية: {fmt(summary.latest.totalEquity)} |
          صافي الدخل: {fmt(summary.latest.netIncome)}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="التجميعات" icon={<AccountTree />} iconPosition="start" />
        <Tab label="الكيانات" icon={<Business />} iconPosition="start" />
      </Tabs>

      {tab === 0 && (
        <Card sx={{ bgcolor: surfaceColors.card }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.tableHeader }}>
                  {[
                    'رقم التجميع',
                    'الاسم',
                    'الفترة',
                    'الكيانات',
                    'صافي الدخل الموحد',
                    'الحالة',
                    'إجراءات',
                  ].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {consolidations.map(c => {
                  const st = statusMap[c.status] || statusMap.draft;
                  return (
                    <TableRow
                      key={c._id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => fetchDetail(c._id)}
                    >
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {c.consolidationNumber}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{c.name}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{c.period}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{c.entities?.length || 0}</TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 700, color: '#4CAF50' }}>
                        {fmt(c.consolidated?.netIncome)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={st.label}
                          size="small"
                          sx={{ bgcolor: `${st.color}20`, color: st.color, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <Box display="flex" gap={0.5}>
                          <Tooltip title="حساب التجميع">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleCalculate(c._id)}
                            >
                              <Calculate fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {c.status === 'in_progress' && (
                            <Tooltip title="اعتماد">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleStatusChange(c._id, 'approved')}
                              >
                                <CheckCircle fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {c.status === 'approved' && (
                            <Tooltip title="نشر">
                              <IconButton
                                size="small"
                                color="info"
                                onClick={() => handleStatusChange(c._id, 'published')}
                              >
                                <Publish fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {consolidations.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد تجميعات
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {tab === 1 && selected?.entities?.length > 0 && (
        <Card sx={{ bgcolor: surfaceColors.card }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={2}>
              كيانات التجميع: {selected.name}
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {[
                    'الكيان',
                    'نسبة الملكية',
                    'طريقة التجميع',
                    'الأصول',
                    'الالتزامات',
                    'الإيرادات',
                    'صافي الدخل',
                  ].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {selected.entities.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                      {e.entityName}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>{e.ownershipPct}%</TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>{e.consolidationMethod}</TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>{fmt(e.totalAssets)}</TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>{fmt(e.totalLiabilities)}</TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>{fmt(e.totalRevenue)}</TableCell>
                    <TableCell
                      sx={{
                        textAlign: 'right',
                        fontWeight: 700,
                        color: (e.netIncome || 0) >= 0 ? '#4CAF50' : '#F44336',
                      }}
                    >
                      {fmt(e.netIncome)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>تجميع مالي جديد</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="اسم التجميع"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="الفترة (مثال: 2026-Q1)"
              value={form.period}
              onChange={e => setForm({ ...form, period: e.target.value })}
              fullWidth
            />
            <TextField
              label="بداية الفترة"
              type="date"
              value={form.periodStart}
              onChange={e => setForm({ ...form, periodStart: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="نهاية الفترة"
              type="date"
              value={form.periodEnd}
              onChange={e => setForm({ ...form, periodEnd: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate} sx={{ bgcolor: brandColors.primary }}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          تفاصيل التجميع - {selected?.consolidationNumber}
        </DialogTitle>
        <DialogContent>
          {selected && (
            <Box>
              <Grid container spacing={2} mb={2}>
                <Grid item xs={6}>
                  <Typography>
                    <strong>الاسم:</strong> {selected.name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <strong>الفترة:</strong> {selected.period}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <strong>عدد الكيانات:</strong> {selected.entities?.length || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <strong>الحالة:</strong> {statusMap[selected.status]?.label}
                  </Typography>
                </Grid>
              </Grid>
              {selected.consolidated && (
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Card sx={{ bgcolor: '#2196F310', p: 2, textAlign: 'center' }}>
                      <Typography variant="body2">إجمالي الأصول</Typography>
                      <Typography variant="h6" fontWeight={700} color="#2196F3">
                        {fmt(selected.consolidated.totalAssets)}
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={4}>
                    <Card sx={{ bgcolor: '#F4433610', p: 2, textAlign: 'center' }}>
                      <Typography variant="body2">إجمالي الالتزامات</Typography>
                      <Typography variant="h6" fontWeight={700} color="#F44336">
                        {fmt(selected.consolidated.totalLiabilities)}
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={4}>
                    <Card sx={{ bgcolor: '#4CAF5010', p: 2, textAlign: 'center' }}>
                      <Typography variant="body2">صافي الدخل</Typography>
                      <Typography variant="h6" fontWeight={700} color="#4CAF50">
                        {fmt(selected.consolidated.netIncome)}
                      </Typography>
                    </Card>
                  </Grid>
                </Grid>
              )}
              {selected.eliminationEntries?.length > 0 && (
                <Box mt={2}>
                  <Typography variant="h6" fontWeight={700} mb={1}>
                    قيود الحذف
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {['النوع', 'حساب مدين', 'حساب دائن', 'المبلغ'].map(h => (
                          <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selected.eliminationEntries.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell sx={{ textAlign: 'right' }}>{e.eliminationType}</TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>{e.debitAccount}</TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>{e.creditAccount}</TableCell>
                          <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                            {fmt(e.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FinancialConsolidation;
