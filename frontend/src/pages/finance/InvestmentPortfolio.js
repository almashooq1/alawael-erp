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
  ShowChart,
  Refresh,
  Add,
  TrendingUp,
  TrendingDown,
  AccountBalance,
  PieChart,
  ShoppingCart,
  MonetizationOn,
} from '@mui/icons-material';
import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';
const fmt = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v || 0);
const pct = v => `${(v || 0).toFixed(2)}%`;

const typeMap = {
  equity: 'أسهم',
  sukuk: 'صكوك',
  mudarabah: 'مضاربة',
  musharakah: 'مشاركة',
  real_estate: 'عقارات',
  mutual_fund: 'صناديق استثمار',
  fixed_deposit: 'ودائع ثابتة',
  government_bond: 'سندات حكومية',
  etf: 'صناديق متداولة',
};
const statusMap = {
  active: { label: 'نشط', color: '#4CAF50' },
  matured: { label: 'مستحق', color: '#2196F3' },
  sold: { label: 'مباع', color: '#FF9800' },
  defaulted: { label: 'متعثر', color: '#F44336' },
  draft: { label: 'مسودة', color: '#9E9E9E' },
};

const InvestmentPortfolio = () => {
  const [tab, setTab] = useState(0);
  const [investments, setInvestments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [txDialog, setTxDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    investmentName: '',
    investmentType: 'equity',
    quantity: '',
    purchasePrice: '',
    currentMarketPrice: '',
    shariaCompliant: true,
  });
  const [txForm, setTxForm] = useState({
    type: 'buy',
    quantity: '',
    pricePerUnit: '',
    date: '',
  });

  const token = getToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [iRes, sRes] = await Promise.all([
        fetch(`${API}/finance/ultimate/investments`, { headers }),
        fetch(`${API}/finance/ultimate/investments/portfolio/summary`, { headers }),
      ]);
      const iData = await iRes.json();
      const sData = await sRes.json();
      if (iData.success) setInvestments(iData.data);
      if (sData.success) setSummary(sData.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    try {
      const payload = {
        ...form,
        quantity: parseInt(form.quantity),
        purchasePrice: parseFloat(form.purchasePrice),
        currentMarketPrice: parseFloat(form.currentMarketPrice),
      };
      const res = await fetch(`${API}/finance/ultimate/investments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
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

  const handleTransaction = async () => {
    if (!selected) return;
    try {
      const payload = {
        ...txForm,
        quantity: parseInt(txForm.quantity),
        pricePerUnit: parseFloat(txForm.pricePerUnit),
      };
      const res = await fetch(`${API}/finance/ultimate/investments/${selected._id}/transaction`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setTxDialog(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleValuate = async id => {
    try {
      await fetch(`${API}/finance/ultimate/investments/${id}/valuate`, { method: 'POST', headers });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDetail = async id => {
    try {
      const res = await fetch(`${API}/finance/ultimate/investments/${id}`, { headers });
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
          <ShowChart sx={{ mr: 1, verticalAlign: 'middle' }} />
          المحفظة الاستثمارية
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
            استثمار جديد
          </Button>
        </Box>
      </Box>

      {summary && (
        <>
          <Grid container spacing={2} mb={2}>
            {[
              {
                label: 'إجمالي الاستثمارات',
                value: summary.totalInvestments,
                color: '#2196F3',
                icon: <ShowChart />,
              },
              {
                label: 'استثمارات نشطة',
                value: summary.active,
                color: '#4CAF50',
                icon: <AccountBalance />,
              },
              {
                label: 'إجمالي التكلفة',
                value: fmt(summary.totalCost),
                color: '#FF9800',
                icon: <ShoppingCart />,
              },
              {
                label: 'القيمة السوقية',
                value: fmt(summary.totalMarketValue),
                color: '#2196F3',
                icon: <MonetizationOn />,
              },
              {
                label: 'الربح/الخسارة غير المحققة',
                value: fmt(summary.totalUnrealizedGain),
                color: summary.totalUnrealizedGain >= 0 ? '#4CAF50' : '#F44336',
                icon: summary.totalUnrealizedGain >= 0 ? <TrendingUp /> : <TrendingDown />,
              },
              {
                label: 'العائد الإجمالي',
                value: pct(summary.overallReturn),
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

          {summary.allocationByType && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>توزيع المحفظة: </strong>
              {Object.entries(summary.allocationByType)
                .map(([k, v]) => `${typeMap[k] || k}: ${pct(v)}`)
                .join(' | ')}
            </Alert>
          )}
        </>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="الاستثمارات" icon={<ShowChart />} iconPosition="start" />
        <Tab label="سجل المعاملات" icon={<MonetizationOn />} iconPosition="start" />
      </Tabs>

      {tab === 0 && (
        <Card sx={{ bgcolor: surfaceColors.card }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.tableHeader }}>
                  {[
                    'رقم الاستثمار',
                    'الاسم',
                    'النوع',
                    'الكمية',
                    'سعر الشراء',
                    'السعر الحالي',
                    'القيمة السوقية',
                    'الربح/الخسارة',
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
                {investments.map(inv => {
                  const st = statusMap[inv.status] || statusMap.draft;
                  const gain = inv.unrealizedGainLoss || 0;
                  const mkt = (inv.quantity || 0) * (inv.currentMarketPrice || 0);
                  return (
                    <TableRow
                      key={inv._id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => fetchDetail(inv._id)}
                    >
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {inv.investmentNumber}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {inv.investmentName}
                        {inv.shariaCompliant && (
                          <Chip
                            label="متوافق شرعياً"
                            size="small"
                            sx={{
                              ml: 1,
                              bgcolor: '#4CAF5015',
                              color: '#4CAF50',
                              fontSize: '0.65rem',
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {typeMap[inv.investmentType] || inv.investmentType}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {inv.quantity?.toLocaleString('ar-SA')}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{fmt(inv.purchasePrice)}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {fmt(inv.currentMarketPrice)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>{fmt(mkt)}</TableCell>
                      <TableCell
                        sx={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: gain >= 0 ? '#4CAF50' : '#F44336',
                        }}
                      >
                        {gain >= 0 ? '+' : ''}
                        {fmt(gain)}
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
                          <Tooltip title="تقييم">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleValuate(inv._id)}
                            >
                              <TrendingUp fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="معاملة جديدة">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => {
                                setSelected(inv);
                                setTxDialog(true);
                              }}
                            >
                              <ShoppingCart fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {investments.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد استثمارات
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
              سجل المعاملات - {selected.investmentNumber}
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['التاريخ', 'النوع', 'الكمية', 'السعر', 'الإجمالي', 'الرسوم'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {(selected.transactions || []).map((tx, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ textAlign: 'right' }}>
                      {tx.date ? new Date(tx.date).toLocaleDateString('ar-SA') : '-'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      <Chip
                        label={
                          tx.type === 'buy'
                            ? 'شراء'
                            : tx.type === 'sell'
                              ? 'بيع'
                              : tx.type === 'dividend'
                                ? 'توزيعات'
                                : tx.type
                        }
                        size="small"
                        sx={{
                          bgcolor:
                            tx.type === 'buy'
                              ? '#4CAF5020'
                              : tx.type === 'sell'
                                ? '#F4433620'
                                : '#FF980020',
                          color:
                            tx.type === 'buy'
                              ? '#4CAF50'
                              : tx.type === 'sell'
                                ? '#F44336'
                                : '#FF9800',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      {tx.quantity?.toLocaleString('ar-SA')}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>{fmt(tx.pricePerUnit)}</TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                      {fmt(tx.totalAmount)}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>{fmt(tx.fees)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Investment Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>استثمار جديد</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="اسم الاستثمار"
              value={form.investmentName}
              onChange={e => setForm({ ...form, investmentName: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="نوع الاستثمار"
              value={form.investmentType}
              onChange={e => setForm({ ...form, investmentType: e.target.value })}
              fullWidth
            >
              {Object.entries(typeMap).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="الكمية"
              type="number"
              value={form.quantity}
              onChange={e => setForm({ ...form, quantity: e.target.value })}
              fullWidth
            />
            <TextField
              label="سعر الشراء (ر.س)"
              type="number"
              value={form.purchasePrice}
              onChange={e => setForm({ ...form, purchasePrice: e.target.value })}
              fullWidth
            />
            <TextField
              label="السعر السوقي الحالي (ر.س)"
              type="number"
              value={form.currentMarketPrice}
              onChange={e => setForm({ ...form, currentMarketPrice: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="متوافق شرعياً"
              value={form.shariaCompliant ? 'yes' : 'no'}
              onChange={e => setForm({ ...form, shariaCompliant: e.target.value === 'yes' })}
              fullWidth
            >
              <MenuItem value="yes">نعم</MenuItem>
              <MenuItem value="no">لا</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate} sx={{ bgcolor: brandColors.primary }}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog open={txDialog} onClose={() => setTxDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          معاملة جديدة - {selected?.investmentName}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              select
              label="نوع المعاملة"
              value={txForm.type}
              onChange={e => setTxForm({ ...txForm, type: e.target.value })}
              fullWidth
            >
              <MenuItem value="buy">شراء</MenuItem>
              <MenuItem value="sell">بيع</MenuItem>
              <MenuItem value="dividend">توزيعات أرباح</MenuItem>
              <MenuItem value="coupon">كوبون</MenuItem>
            </TextField>
            <TextField
              label="الكمية"
              type="number"
              value={txForm.quantity}
              onChange={e => setTxForm({ ...txForm, quantity: e.target.value })}
              fullWidth
            />
            <TextField
              label="السعر لكل وحدة (ر.س)"
              type="number"
              value={txForm.pricePerUnit}
              onChange={e => setTxForm({ ...txForm, pricePerUnit: e.target.value })}
              fullWidth
            />
            <TextField
              label="التاريخ"
              type="date"
              value={txForm.date}
              onChange={e => setTxForm({ ...txForm, date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTxDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleTransaction}
            sx={{ bgcolor: brandColors.primary }}
          >
            تنفيذ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          تفاصيل الاستثمار - {selected?.investmentNumber}
        </DialogTitle>
        <DialogContent>
          {selected && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography>
                  <strong>الاسم:</strong> {selected.investmentName}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>النوع:</strong> {typeMap[selected.investmentType]}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>الكمية:</strong> {selected.quantity?.toLocaleString('ar-SA')}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>سعر الشراء:</strong> {fmt(selected.purchasePrice)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>السعر الحالي:</strong> {fmt(selected.currentMarketPrice)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>الربح/الخسارة:</strong>{' '}
                  <span
                    style={{
                      color: (selected.unrealizedGainLoss || 0) >= 0 ? '#4CAF50' : '#F44336',
                      fontWeight: 700,
                    }}
                  >
                    {fmt(selected.unrealizedGainLoss)}
                  </span>
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>التصنيف (IFRS):</strong> {selected.ifrsClassification}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>متوافق شرعياً:</strong> {selected.shariaCompliant ? 'نعم ✓' : 'لا'}
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

export default InvestmentPortfolio;
