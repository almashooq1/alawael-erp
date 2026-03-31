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
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Grid,
  Tabs,
  Tab,
  LinearProgress,
} from '@mui/material';
import {
  AccountBalance,
  Refresh,
  Add,
  Payment,
  TrendingUp,
  Assessment,
  CalendarToday,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const fmt = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v || 0);

const facilityTypeMap = {
  term_loan: { label: 'قرض لأجل', color: '#2196F3' },
  revolving: { label: 'تسهيل متجدد', color: '#4CAF50' },
  murabaha: { label: 'مرابحة', color: '#FF9800' },
  tawarruq: { label: 'تورق', color: '#9C27B0' },
  overdraft: { label: 'سحب على المكشوف', color: '#F44336' },
  bridging: { label: 'قرض جسري', color: '#00BCD4' },
  syndicated: { label: 'قرض مشترك', color: '#795548' },
  government_subsidized: { label: 'قرض حكومي مدعوم', color: '#8BC34A' },
  other: { label: 'أخرى', color: '#607D8B' },
};
const statusMap = {
  proposed: { label: 'مقترح', color: '#9E9E9E' },
  approved: { label: 'معتمد', color: '#2196F3' },
  active: { label: 'نشط', color: '#4CAF50' },
  restructured: { label: 'مُعاد هيكلته', color: '#FF9800' },
  completed: { label: 'مكتمل', color: '#8BC34A' },
  defaulted: { label: 'متعثر', color: '#F44336' },
  cancelled: { label: 'ملغي', color: '#9E9E9E' },
};

const CompanyLoans = () => {
  const [tab, setTab] = useState(0);
  const [loans, setLoans] = useState([]);
  const [summary, setSummary] = useState(null);
  const [covenants, setCovenants] = useState([]);
  const [maturityProfile, setMaturityProfile] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawdownDialog, setDrawdownDialog] = useState(false);
  const [repayDialog, setRepayDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    lenderName: '',
    facilityType: 'term_loan',
    principalAmount: '',
    profitRate: '',
    profitRateType: 'fixed',
    repaymentFrequency: 'monthly',
    maturityDate: '',
    currency: 'SAR',
  });
  const [drawdownForm, setDrawdownForm] = useState({ amount: '', purpose: '' });
  const [repayForm, setRepayForm] = useState({
    amount: '',
    principalPortion: '',
    profitPortion: '',
  });

  const token = getToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [lRes, sRes, cRes, mRes] = await Promise.all([
        fetch(`${API}/finance/enterprise/company-loans`, { headers }),
        fetch(`${API}/finance/enterprise/company-loans/summary`, { headers }),
        fetch(`${API}/finance/enterprise/company-loans/covenants/check`, { headers }),
        fetch(`${API}/finance/enterprise/company-loans/maturity-profile`, { headers }),
      ]);
      const lData = await lRes.json();
      const sData = await sRes.json();
      const cData = await cRes.json();
      const mData = await mRes.json();
      if (lData.success) setLoans(lData.data);
      if (sData.success) setSummary(sData.data);
      if (cData.success) setCovenants(cData.data);
      if (mData.success) setMaturityProfile(mData.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API}/finance/enterprise/company-loans`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...form,
          principalAmount: parseFloat(form.principalAmount),
          profitRate: parseFloat(form.profitRate),
        }),
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

  const handleDrawdown = async () => {
    if (!selected) return;
    try {
      const res = await fetch(`${API}/finance/enterprise/company-loans/${selected._id}/drawdown`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount: parseFloat(drawdownForm.amount),
          purpose: drawdownForm.purpose,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDrawdownDialog(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRepayment = async () => {
    if (!selected) return;
    try {
      const res = await fetch(`${API}/finance/enterprise/company-loans/${selected._id}/repayment`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount: parseFloat(repayForm.amount),
          principalPortion: parseFloat(repayForm.principalPortion),
          profitPortion: parseFloat(repayForm.profitPortion),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRepayDialog(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDetail = async id => {
    try {
      const res = await fetch(`${API}/finance/enterprise/company-loans/${id}`, { headers });
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
          <AccountBalance sx={{ mr: 1, verticalAlign: 'middle' }} />
          إدارة القروض والتمويل
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
            قرض جديد
          </Button>
        </Box>
      </Box>

      {/* Summary */}
      {summary && (
        <Grid container spacing={2} mb={3}>
          {[
            {
              label: 'إجمالي القروض',
              value: summary.totalLoans,
              color: '#2196F3',
              icon: <AccountBalance />,
            },
            {
              label: 'قروض نشطة',
              value: summary.activeLoans,
              color: '#4CAF50',
              icon: <TrendingUp />,
            },
            {
              label: 'إجمالي المبلغ',
              value: fmt(summary.totalPrincipal),
              color: '#FF9800',
              icon: <Payment />,
            },
            {
              label: 'الرصيد القائم',
              value: fmt(summary.totalOutstanding),
              color: '#F44336',
              icon: <Assessment />,
            },
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

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="القروض" icon={<AccountBalance />} iconPosition="start" />
        <Tab label="الشروط والتعهدات" icon={<CheckCircle />} iconPosition="start" />
        <Tab label="الاستحقاقات" icon={<CalendarToday />} iconPosition="start" />
      </Tabs>

      {tab === 0 && (
        <Card sx={{ bgcolor: surfaceColors.card }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.tableHeader }}>
                  {[
                    'رقم القرض',
                    'المقرض',
                    'النوع',
                    'المبلغ الأصلي',
                    'المسحوب',
                    'الرصيد القائم',
                    'معدل الربح',
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
                {loans.map(l => {
                  const tp = facilityTypeMap[l.facilityType] || facilityTypeMap.other;
                  const st = statusMap[l.status] || statusMap.proposed;
                  const utilization = l.principalAmount
                    ? Math.round((l.drawnAmount / l.principalAmount) * 100)
                    : 0;
                  return (
                    <TableRow
                      key={l._id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => fetchDetail(l._id)}
                    >
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {l.loanNumber || '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{l.lenderName}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={tp.label}
                          size="small"
                          sx={{ bgcolor: `${tp.color}20`, color: tp.color, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{fmt(l.principalAmount)}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <LinearProgress
                            variant="determinate"
                            value={utilization}
                            sx={{ flex: 1, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption" fontWeight={600}>
                            {utilization}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 700, color: '#F44336' }}>
                        {fmt(l.outstandingBalance)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {l.profitRate ? `${l.profitRate}%` : '-'}
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
                          {l.status === 'active' && (
                            <>
                              <Tooltip title="سحب">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => {
                                    setSelected(l);
                                    setDrawdownDialog(true);
                                  }}
                                >
                                  <Add fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="سداد">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => {
                                    setSelected(l);
                                    setRepayDialog(true);
                                  }}
                                >
                                  <Payment fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {loans.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد قروض
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
                    'رقم القرض',
                    'المقرض',
                    'الشرط',
                    'المقياس',
                    'الحد',
                    'القيمة الحالية',
                    'الالتزام',
                  ].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {covenants.map((c, i) => (
                  <TableRow
                    key={i}
                    hover
                    sx={{ bgcolor: c.compliant === false ? '#F4433608' : 'transparent' }}
                  >
                    <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                      {c.loanNumber}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>{c.lender}</TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>{c.name}</TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>{c.metric}</TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      {c.operator} {c.threshold}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                      {c.currentValue || '-'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      {c.compliant === true ? (
                        <Chip
                          icon={<CheckCircle />}
                          label="ملتزم"
                          size="small"
                          sx={{ bgcolor: '#4CAF5020', color: '#4CAF50' }}
                        />
                      ) : c.compliant === false ? (
                        <Chip
                          icon={<Warning />}
                          label="مخالف"
                          size="small"
                          sx={{ bgcolor: '#F4433620', color: '#F44336' }}
                        />
                      ) : (
                        <Chip label="غير محدد" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {covenants.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد شروط وتعهدات
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {tab === 2 && (
        <Grid container spacing={2}>
          {maturityProfile.map((m, i) => (
            <Grid item xs={6} md={3} key={i}>
              <Card sx={{ bgcolor: surfaceColors.card, border: '2px solid #2196F320' }}>
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={1}>
                    {m.label}
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="#2196F3">
                    {fmt(m.amount)}
                  </Typography>
                  <Typography variant="body2" color={neutralColors.textSecondary}>
                    {m.count} قرض/قروض
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {maturityProfile.length === 0 && (
            <Grid item xs={12}>
              <Card sx={{ bgcolor: surfaceColors.card }}>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color={neutralColors.textSecondary}>
                    لا توجد بيانات استحقاق
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
          {/* Upcoming installments */}
          {summary?.upcoming?.length > 0 && (
            <Grid item xs={12}>
              <Card sx={{ bgcolor: surfaceColors.card }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} mb={2}>
                    الأقساط القادمة
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {['رقم القرض', 'المقرض', 'تاريخ الاستحقاق', 'المبلغ'].map(h => (
                          <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {summary.upcoming.map((u, i) => (
                        <TableRow key={i}>
                          <TableCell sx={{ textAlign: 'right' }}>{u.loanNumber}</TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>{u.lender}</TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>
                            {u.dueDate ? new Date(u.dueDate).toLocaleDateString('ar-SA') : '-'}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right', fontWeight: 700, color: '#F44336' }}>
                            {fmt(u.totalDue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* Create Loan Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>إضافة قرض / تمويل جديد</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="اسم المقرض"
              value={form.lenderName}
              onChange={e => setForm({ ...form, lenderName: e.target.value })}
              fullWidth
            />
            <TextField
              label="نوع التمويل"
              value={form.facilityType}
              onChange={e => setForm({ ...form, facilityType: e.target.value })}
              select
              fullWidth
            >
              {Object.entries(facilityTypeMap).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="المبلغ الأصلي (ر.س)"
              type="number"
              value={form.principalAmount}
              onChange={e => setForm({ ...form, principalAmount: e.target.value })}
              fullWidth
            />
            <TextField
              label="معدل الربح %"
              type="number"
              value={form.profitRate}
              onChange={e => setForm({ ...form, profitRate: e.target.value })}
              fullWidth
            />
            <TextField
              label="نوع معدل الربح"
              value={form.profitRateType}
              onChange={e => setForm({ ...form, profitRateType: e.target.value })}
              select
              fullWidth
            >
              <MenuItem value="fixed">ثابت</MenuItem>
              <MenuItem value="variable">متغير</MenuItem>
              <MenuItem value="sibor_plus">سايبور +</MenuItem>
            </TextField>
            <TextField
              label="تكرار السداد"
              value={form.repaymentFrequency}
              onChange={e => setForm({ ...form, repaymentFrequency: e.target.value })}
              select
              fullWidth
            >
              <MenuItem value="monthly">شهري</MenuItem>
              <MenuItem value="quarterly">ربع سنوي</MenuItem>
              <MenuItem value="semi_annual">نصف سنوي</MenuItem>
              <MenuItem value="annual">سنوي</MenuItem>
              <MenuItem value="bullet">دفعة واحدة نهائية</MenuItem>
            </TextField>
            <TextField
              label="تاريخ الاستحقاق"
              type="date"
              value={form.maturityDate}
              onChange={e => setForm({ ...form, maturityDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate} sx={{ bgcolor: brandColors.primary }}>
            إضافة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Drawdown Dialog */}
      <Dialog
        open={drawdownDialog}
        onClose={() => setDrawdownDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>سحب من القرض</DialogTitle>
        <DialogContent>
          {selected && (
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <Typography>
                <strong>القرض:</strong> {selected.loanNumber}
              </Typography>
              <Typography>
                <strong>المتاح للسحب:</strong>{' '}
                {fmt((selected.principalAmount || 0) - (selected.drawnAmount || 0))}
              </Typography>
              <TextField
                label="مبلغ السحب (ر.س)"
                type="number"
                value={drawdownForm.amount}
                onChange={e => setDrawdownForm({ ...drawdownForm, amount: e.target.value })}
                fullWidth
              />
              <TextField
                label="الغرض"
                value={drawdownForm.purpose}
                onChange={e => setDrawdownForm({ ...drawdownForm, purpose: e.target.value })}
                fullWidth
                multiline
                rows={2}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDrawdownDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleDrawdown}
            sx={{ bgcolor: brandColors.primary }}
          >
            سحب
          </Button>
        </DialogActions>
      </Dialog>

      {/* Repayment Dialog */}
      <Dialog open={repayDialog} onClose={() => setRepayDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>تسجيل سداد</DialogTitle>
        <DialogContent>
          {selected && (
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <Typography>
                <strong>القرض:</strong> {selected.loanNumber}
              </Typography>
              <Typography>
                <strong>الرصيد القائم:</strong> {fmt(selected.outstandingBalance)}
              </Typography>
              <TextField
                label="إجمالي السداد (ر.س)"
                type="number"
                value={repayForm.amount}
                onChange={e => setRepayForm({ ...repayForm, amount: e.target.value })}
                fullWidth
              />
              <TextField
                label="جزء الأصل"
                type="number"
                value={repayForm.principalPortion}
                onChange={e => setRepayForm({ ...repayForm, principalPortion: e.target.value })}
                fullWidth
              />
              <TextField
                label="جزء الربح"
                type="number"
                value={repayForm.profitPortion}
                onChange={e => setRepayForm({ ...repayForm, profitPortion: e.target.value })}
                fullWidth
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRepayDialog(false)}>إلغاء</Button>
          <Button variant="contained" color="success" onClick={handleRepayment}>
            تسجيل السداد
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>تفاصيل القرض - {selected?.loanNumber}</DialogTitle>
        <DialogContent>
          {selected && (
            <Box>
              <Grid container spacing={2} mb={2}>
                <Grid item xs={6}>
                  <Typography>
                    <strong>المقرض:</strong> {selected.lenderName}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <strong>النوع:</strong>{' '}
                    {facilityTypeMap[selected.facilityType]?.label || selected.facilityType}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <strong>المبلغ:</strong> {fmt(selected.principalAmount)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <strong>الرصيد:</strong> {fmt(selected.outstandingBalance)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <strong>معدل الربح:</strong> {selected.profitRate}%
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography>
                    <strong>نوع المعدل:</strong> {selected.profitRateType}
                  </Typography>
                </Grid>
              </Grid>
              {selected.amortizationSchedule?.length > 0 && (
                <>
                  <Typography variant="h6" fontWeight={700} mb={1}>
                    جدول السداد
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {['#', 'تاريخ الاستحقاق', 'الأصل', 'الربح', 'الإجمالي', 'الحالة'].map(h => (
                          <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selected.amortizationSchedule.map((inst, i) => (
                        <TableRow key={i}>
                          <TableCell sx={{ textAlign: 'right' }}>
                            {inst.installmentNumber || i + 1}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>
                            {inst.dueDate
                              ? new Date(inst.dueDate).toLocaleDateString('ar-SA')
                              : '-'}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>
                            {fmt(inst.principalAmount)}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>
                            {fmt(inst.profitAmount)}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                            {fmt(inst.totalDue)}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>
                            <Chip
                              label={inst.status || 'upcoming'}
                              size="small"
                              sx={{
                                bgcolor: inst.status === 'paid' ? '#4CAF5020' : '#FF980020',
                                color: inst.status === 'paid' ? '#4CAF50' : '#FF9800',
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
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

export default CompanyLoans;
