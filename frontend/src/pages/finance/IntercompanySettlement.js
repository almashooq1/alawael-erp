import { useState, useEffect, useCallback } from 'react';
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
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Grid,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import {
  SwapHoriz,
  Refresh,
  Add,
  PlayArrow,
  CheckCircle,
  Receipt,
  AccountBalance,
  CompareArrows,
  Business,
} from '@mui/icons-material';
import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';
const fmt = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v || 0);

const invStatusMap = {
  draft: { label: 'مسودة', color: '#9E9E9E' },
  sent: { label: 'مرسلة', color: '#2196F3' },
  received: { label: 'مستلمة', color: '#FF9800' },
  confirmed: { label: 'مؤكدة', color: '#4CAF50' },
  disputed: { label: 'متنازع عليها', color: '#F44336' },
  settled: { label: 'تمت التسوية', color: '#8BC34A' },
  cancelled: { label: 'ملغية', color: '#795548' },
};
const runStatusMap = {
  draft: { label: 'مسودة', color: '#9E9E9E' },
  in_progress: { label: 'قيد التنفيذ', color: '#2196F3' },
  completed: { label: 'مكتمل', color: '#4CAF50' },
  cancelled: { label: 'ملغي', color: '#F44336' },
};
const pricingMap = {
  CUP: 'السعر المقارن غير المسيطر عليه',
  resale_minus: 'سعر إعادة البيع',
  cost_plus: 'التكلفة مضافاً إليها',
  TNMM: 'طريقة صافي هامش المعاملة',
  profit_split: 'تقسيم الأرباح',
};

const IntercompanySettlement = () => {
  const [tab, setTab] = useState(0);
  const [invoices, setInvoices] = useState([]);
  const [runs, setRuns] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invoiceDialog, setInvoiceDialog] = useState(false);
  const [runDialog, setRunDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selected, setSelected] = useState(null);
  const [invForm, setInvForm] = useState({
    fromEntity: '',
    toEntity: '',
    description: '',
    totalAmount: '',
    transferPricingMethod: 'cost_plus',
    armLengthPrice: '',
  });
  const [runForm, setRunForm] = useState({
    settlementPeriod: '',
    nettingType: 'bilateral',
    description: '',
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [iRes, rRes, dRes] = await Promise.all([
        fetch(`${API}/finance/ultimate/intercompany-invoices`, { headers }),
        fetch(`${API}/finance/ultimate/settlement-runs`, { headers }),
        fetch(`${API}/finance/ultimate/intercompany/dashboard`, { headers }),
      ]);
      const iData = await iRes.json();
      const rData = await rRes.json();
      const dData = await dRes.json();
      if (iData.success) setInvoices(iData.data);
      if (rData.success) setRuns(rData.data);
      if (dData.success) setDashboard(dData.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateInvoice = async () => {
    try {
      const payload = {
        ...invForm,
        totalAmount: parseFloat(invForm.totalAmount),
        armLengthPrice: invForm.armLengthPrice ? parseFloat(invForm.armLengthPrice) : undefined,
      };
      const res = await fetch(`${API}/finance/ultimate/intercompany-invoices`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setInvoiceDialog(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateRun = async () => {
    try {
      const res = await fetch(`${API}/finance/ultimate/settlement-runs`, {
        method: 'POST',
        headers,
        body: JSON.stringify(runForm),
      });
      const data = await res.json();
      if (data.success) {
        setRunDialog(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExecuteRun = async id => {
    try {
      await fetch(`${API}/finance/ultimate/settlement-runs/${id}/execute`, {
        method: 'POST',
        headers,
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleInvoiceStatus = async (id, status) => {
    try {
      await fetch(`${API}/finance/ultimate/intercompany-invoices/${id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      });
      fetchData();
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

  const disputed = invoices.filter(i => i.status === 'disputed');

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700} color={neutralColors.textPrimary}>
          <SwapHoriz sx={{ mr: 1, verticalAlign: 'middle' }} />
          التسويات بين الشركات
        </Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchData}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<Add />} onClick={() => setRunDialog(true)}>
            دورة تسوية
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setInvoiceDialog(true)}
            sx={{ bgcolor: brandColors.primary, '&:hover': { bgcolor: brandColors.primaryDark } }}
          >
            فاتورة بين الشركات
          </Button>
        </Box>
      </Box>

      {disputed.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>{disputed.length} فواتير متنازع عليها</strong> — تحتاج مراجعة وحل
        </Alert>
      )}

      {dashboard && (
        <Grid container spacing={2} mb={3}>
          {[
            {
              label: 'إجمالي الفواتير',
              value: dashboard.totalInvoices,
              color: '#2196F3',
              icon: <Receipt />,
            },
            {
              label: 'فواتير معلقة',
              value: dashboard.pendingInvoices,
              color: '#FF9800',
              icon: <SwapHoriz />,
            },
            {
              label: 'إجمالي المبالغ',
              value: fmt(dashboard.totalAmount),
              color: '#4CAF50',
              icon: <AccountBalance />,
            },
            {
              label: 'دورات التسوية',
              value: dashboard.totalRuns,
              color: '#9C27B0',
              icon: <CompareArrows />,
            },
            {
              label: 'تمت تسويتها',
              value: fmt(dashboard.settledAmount),
              color: '#8BC34A',
              icon: <CheckCircle />,
            },
            {
              label: 'كفاءة التقاص',
              value: `${dashboard.nettingEfficiency || 0}%`,
              color: '#FF5722',
              icon: <Business />,
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
        <Tab label="الفواتير بين الشركات" icon={<Receipt />} iconPosition="start" />
        <Tab label="دورات التسوية" icon={<CompareArrows />} iconPosition="start" />
      </Tabs>

      {tab === 0 && (
        <Card sx={{ bgcolor: surfaceColors.card }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.tableHeader }}>
                  {[
                    'رقم الفاتورة',
                    'من',
                    'إلى',
                    'الوصف',
                    'المبلغ',
                    'طريقة التسعير',
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
                {invoices.map(inv => {
                  const st = invStatusMap[inv.status] || invStatusMap.draft;
                  return (
                    <TableRow
                      key={inv._id}
                      hover
                      sx={{ bgcolor: inv.status === 'disputed' ? '#F4433608' : 'inherit' }}
                    >
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {inv.invoiceNumber}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{inv.fromEntity}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{inv.toEntity}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{inv.description}</TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {fmt(inv.totalAmount)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={pricingMap[inv.transferPricingMethod] || inv.transferPricingMethod}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.65rem' }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={st.label}
                          size="small"
                          sx={{ bgcolor: `${st.color}20`, color: st.color, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Box display="flex" gap={0.5}>
                          {inv.status === 'draft' && (
                            <Tooltip title="إرسال">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleInvoiceStatus(inv._id, 'sent')}
                              >
                                <SwapHoriz fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {(inv.status === 'sent' || inv.status === 'received') && (
                            <Tooltip title="تأكيد">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleInvoiceStatus(inv._id, 'confirmed')}
                              >
                                <CheckCircle fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {invoices.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد فواتير
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {tab === 1 && (
        <Card sx={{ bgcolor: surfaceColors.card }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.tableHeader }}>
                  {[
                    'رقم الدورة',
                    'الفترة',
                    'نوع التقاص',
                    'الفواتير',
                    'إجمالي المبالغ',
                    'صافي التسوية',
                    'كفاءة التقاص',
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
                {runs.map(r => {
                  const st = runStatusMap[r.status] || runStatusMap.draft;
                  return (
                    <TableRow key={r._id} hover>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {r.settlementNumber}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{r.settlementPeriod}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {r.nettingType === 'bilateral' ? 'ثنائي' : 'متعدد الأطراف'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{r.invoices?.length || 0}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{fmt(r.totalGrossAmount)}</TableCell>
                      <TableCell sx={{ textAlign: 'right', color: '#4CAF50', fontWeight: 700 }}>
                        {fmt(r.totalNetAmount)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={`${r.nettingEfficiency || 0}%`}
                          size="small"
                          sx={{
                            bgcolor: (r.nettingEfficiency || 0) > 50 ? '#4CAF5020' : '#FF980020',
                            color: (r.nettingEfficiency || 0) > 50 ? '#4CAF50' : '#FF9800',
                            fontWeight: 700,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={st.label}
                          size="small"
                          sx={{ bgcolor: `${st.color}20`, color: st.color, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {r.status === 'draft' && (
                          <Tooltip title="تنفيذ التسوية">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleExecuteRun(r._id)}
                            >
                              <PlayArrow fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {runs.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد دورات تسوية
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Create Invoice Dialog */}
      <Dialog open={invoiceDialog} onClose={() => setInvoiceDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>فاتورة بين الشركات</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="من (الكيان)"
              value={invForm.fromEntity}
              onChange={e => setInvForm({ ...invForm, fromEntity: e.target.value })}
              fullWidth
            />
            <TextField
              label="إلى (الكيان)"
              value={invForm.toEntity}
              onChange={e => setInvForm({ ...invForm, toEntity: e.target.value })}
              fullWidth
            />
            <TextField
              label="الوصف"
              value={invForm.description}
              onChange={e => setInvForm({ ...invForm, description: e.target.value })}
              fullWidth
            />
            <TextField
              label="المبلغ (ر.س)"
              type="number"
              value={invForm.totalAmount}
              onChange={e => setInvForm({ ...invForm, totalAmount: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="طريقة تسعير التحويل"
              value={invForm.transferPricingMethod}
              onChange={e => setInvForm({ ...invForm, transferPricingMethod: e.target.value })}
              fullWidth
            >
              {Object.entries(pricingMap).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="سعر المحايد (Arm's Length)"
              type="number"
              value={invForm.armLengthPrice}
              onChange={e => setInvForm({ ...invForm, armLengthPrice: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoiceDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreateInvoice}
            sx={{ bgcolor: brandColors.primary }}
          >
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Settlement Run Dialog */}
      <Dialog open={runDialog} onClose={() => setRunDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>دورة تسوية جديدة</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="فترة التسوية"
              value={runForm.settlementPeriod}
              onChange={e => setRunForm({ ...runForm, settlementPeriod: e.target.value })}
              fullWidth
              placeholder="مثال: 2026-Q1"
            />
            <TextField
              select
              label="نوع التقاص"
              value={runForm.nettingType}
              onChange={e => setRunForm({ ...runForm, nettingType: e.target.value })}
              fullWidth
            >
              <MenuItem value="bilateral">ثنائي</MenuItem>
              <MenuItem value="multilateral">متعدد الأطراف</MenuItem>
            </TextField>
            <TextField
              label="الوصف"
              value={runForm.description}
              onChange={e => setRunForm({ ...runForm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRunDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreateRun}
            sx={{ bgcolor: brandColors.primary }}
          >
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default IntercompanySettlement;
