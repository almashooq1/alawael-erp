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
  LinearProgress,
} from '@mui/material';
import {
  Receipt,
  Refresh,
  Add,
  CheckCircle,
  Schedule,
  TrendingUp,
  Assignment,
  PieChart,
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
  active: { label: 'نشط', color: '#4CAF50' },
  modified: { label: 'معدّل', color: '#FF9800' },
  completed: { label: 'مكتمل', color: '#8BC34A' },
  cancelled: { label: 'ملغي', color: '#F44336' },
};
const methodMap = {
  point_in_time: 'عند نقطة زمنية',
  over_time_output: 'بمرور الوقت (مخرجات)',
  over_time_input: 'بمرور الوقت (مدخلات)',
  over_time_milestone: 'بمرور الوقت (مراحل)',
};

const RevenueRecognition = () => {
  const [tab, setTab] = useState(0);
  const [contracts, setContracts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    customerName: '',
    contractDate: '',
    startDate: '',
    endDate: '',
    totalContractValue: '',
  });

  const token = getToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        fetch(`${API}/finance/ultimate/revenue-recognition`, { headers }),
        fetch(`${API}/finance/ultimate/revenue-recognition/summary/dashboard`, { headers }),
      ]);
      const cData = await cRes.json();
      const sData = await sRes.json();
      if (cData.success) setContracts(cData.data);
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
      const res = await fetch(`${API}/finance/ultimate/revenue-recognition`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...form, totalContractValue: parseFloat(form.totalContractValue) }),
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

  const handleAllocate = async id => {
    try {
      await fetch(`${API}/finance/ultimate/revenue-recognition/${id}/allocate`, {
        method: 'POST',
        headers,
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRecognize = async id => {
    try {
      await fetch(`${API}/finance/ultimate/revenue-recognition/${id}/recognize`, {
        method: 'POST',
        headers,
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDetail = async id => {
    try {
      const res = await fetch(`${API}/finance/ultimate/revenue-recognition/${id}`, { headers });
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
          <Receipt sx={{ mr: 1, verticalAlign: 'middle' }} />
          الاعتراف بالإيراد - IFRS 15
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
            عقد جديد
          </Button>
        </Box>
      </Box>

      {summary && (
        <Grid container spacing={2} mb={3}>
          {[
            {
              label: 'إجمالي العقود',
              value: summary.totalContracts,
              color: '#2196F3',
              icon: <Assignment />,
            },
            { label: 'عقود نشطة', value: summary.active, color: '#4CAF50', icon: <CheckCircle /> },
            {
              label: 'إجمالي القيمة',
              value: fmt(summary.totalValue),
              color: '#FF9800',
              icon: <TrendingUp />,
            },
            {
              label: 'إيراد مُعترف به',
              value: fmt(summary.totalRecognized),
              color: '#8BC34A',
              icon: <Receipt />,
            },
            {
              label: 'إيراد مؤجل',
              value: fmt(summary.totalDeferred),
              color: '#F44336',
              icon: <Schedule />,
            },
            {
              label: 'نسبة الاعتراف',
              value: `${summary.recognitionRate}%`,
              color: '#9C27B0',
              icon: <PieChart />,
            },
          ].map((s, i) => (
            <Grid item xs={6} md={2} key={i}>
              <Card sx={{ bgcolor: surfaceColors.card, border: `2px solid ${s.color}20` }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Box sx={{ color: s.color, mb: 0.5 }}>{s.icon}</Box>
                  <Typography variant="h5" fontWeight={700} color={s.color}>
                    {s.value}
                  </Typography>
                  <Typography variant="caption" color={neutralColors.textSecondary}>
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="العقود" icon={<Assignment />} iconPosition="start" />
        <Tab label="التزامات الأداء" icon={<CheckCircle />} iconPosition="start" />
      </Tabs>

      {tab === 0 && (
        <Card sx={{ bgcolor: surfaceColors.card }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.tableHeader }}>
                  {[
                    'رقم العقد',
                    'العميل',
                    'قيمة العقد',
                    'مُعترف به',
                    'مؤجل',
                    'نسبة الاعتراف',
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
                {contracts.map(c => {
                  const st = statusMap[c.status] || statusMap.draft;
                  const pct = c.totalContractValue
                    ? Math.round(((c.totalRecognized || 0) / c.totalContractValue) * 100)
                    : 0;
                  return (
                    <TableRow
                      key={c._id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => fetchDetail(c._id)}
                    >
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {c.contractNumber}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{c.customerName}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{fmt(c.totalContractValue)}</TableCell>
                      <TableCell sx={{ textAlign: 'right', color: '#4CAF50', fontWeight: 600 }}>
                        {fmt(c.totalRecognized)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', color: '#F44336' }}>
                        {fmt(c.totalDeferred)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{ flex: 1, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption" fontWeight={600}>
                            {pct}%
                          </Typography>
                        </Box>
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
                          <Tooltip title="تخصيص الأسعار">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleAllocate(c._id)}
                            >
                              <PieChart fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="اعتراف بالإيراد">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleRecognize(c._id)}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {contracts.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد عقود
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {tab === 1 && selected && (
        <Card sx={{ bgcolor: surfaceColors.card }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={2}>
              التزامات الأداء - {selected.contractNumber}
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {[
                    'الوصف',
                    'النوع',
                    'طريقة الاعتراف',
                    'السعر المستقل',
                    'السعر المخصص',
                    'نسبة الإنجاز',
                    'مُعترف به',
                    'الحالة',
                  ].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {(selected.performanceObligations || []).map((ob, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                      {ob.description}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>{ob.type}</TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      {methodMap[ob.recognitionMethod] || ob.recognitionMethod}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>{fmt(ob.standalonePrice)}</TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>{fmt(ob.allocatedPrice)}</TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      <LinearProgress
                        variant="determinate"
                        value={ob.percentComplete || 0}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                      <Typography variant="caption">{ob.percentComplete || 0}%</Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', color: '#4CAF50', fontWeight: 600 }}>
                      {fmt(ob.recognizedAmount)}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      <Chip
                        label={ob.status}
                        size="small"
                        sx={{
                          bgcolor: ob.status === 'satisfied' ? '#4CAF5020' : '#FF980020',
                          color: ob.status === 'satisfied' ? '#4CAF50' : '#FF9800',
                        }}
                      />
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
        <DialogTitle sx={{ fontWeight: 700 }}>عقد إيراد جديد - IFRS 15</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="اسم العميل"
              value={form.customerName}
              onChange={e => setForm({ ...form, customerName: e.target.value })}
              fullWidth
            />
            <TextField
              label="تاريخ العقد"
              type="date"
              value={form.contractDate}
              onChange={e => setForm({ ...form, contractDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="تاريخ البدء"
              type="date"
              value={form.startDate}
              onChange={e => setForm({ ...form, startDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="تاريخ الانتهاء"
              type="date"
              value={form.endDate}
              onChange={e => setForm({ ...form, endDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="إجمالي قيمة العقد (ر.س)"
              type="number"
              value={form.totalContractValue}
              onChange={e => setForm({ ...form, totalContractValue: e.target.value })}
              fullWidth
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
          تفاصيل العقد - {selected?.contractNumber}
        </DialogTitle>
        <DialogContent>
          {selected && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography>
                  <strong>العميل:</strong> {selected.customerName}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>القيمة:</strong> {fmt(selected.totalContractValue)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>مُعترف به:</strong>{' '}
                  <span style={{ color: '#4CAF50', fontWeight: 700 }}>
                    {fmt(selected.totalRecognized)}
                  </span>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>مؤجل:</strong>{' '}
                  <span style={{ color: '#F44336', fontWeight: 700 }}>
                    {fmt(selected.totalDeferred)}
                  </span>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>التزامات الأداء:</strong> {selected.performanceObligations?.length || 0}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>ضريبة VAT:</strong> {selected.vatRate}%
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RevenueRecognition;
