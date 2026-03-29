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
  Grid,  Tabs,
  Tab,
} from '@mui/material';
import {
  CompareArrows,
  Refresh,
  Add,  AccountBalance,
  SwapHoriz,} from '@mui/icons-material';
import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const statusMap = {
  draft: { label: 'مسودة', color: '#9E9E9E' },
  in_progress: { label: 'جاري', color: '#2196F3' },
  completed: { label: 'مكتمل', color: '#4CAF50' },
  reviewed: { label: 'مراجع', color: '#9C27B0' },
};
const intercoStatusMap = {
  unmatched: { label: 'غير مطابق', color: '#F44336' },
  matched: { label: 'مطابق', color: '#4CAF50' },
  disputed: { label: 'متنازع', color: '#FF9800' },
  adjusted: { label: 'معدّل', color: '#2196F3' },
};

const fmt = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v || 0);

const AccountReconciliation = () => {
  const [tab, setTab] = useState(0);
  const [recons, setRecons] = useState([]);
  const [interco, setInterco] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [matchDialog, setMatchDialog] = useState(false);
  const [selectedRecon, setSelectedRecon] = useState(null);
  const [matchForm, setMatchForm] = useState({
    debitTransactionId: '',
    creditTransactionId: '',
    amount: '',
  });
  const [form, setForm] = useState({
    accountId: '',
    periodStart: '',
    periodEnd: '',
    openingBalance: 0,
    closingBalance: 0,
  });

  const token = getToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reconRes, intercoRes, sumRes] = await Promise.all([
        fetch(`${API}/finance/enterprise/reconciliation`, { headers }),
        fetch(`${API}/finance/enterprise/reconciliation/intercompany`, { headers }),
        fetch(`${API}/finance/enterprise/reconciliation/summary`, { headers }),
      ]);
      const reconData = await reconRes.json();
      const intercoData = await intercoRes.json();
      const sumData = await sumRes.json();
      if (reconData.success) setRecons(reconData.data);
      if (intercoData.success) setInterco(intercoData.data);
      if (sumData.success) setSummary(sumData.data);
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
      const res = await fetch(`${API}/finance/enterprise/reconciliation`, {
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

  const handleMatch = async () => {
    if (!selectedRecon) return;
    try {
      const res = await fetch(
        `${API}/finance/enterprise/reconciliation/${selectedRecon._id}/match`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...matchForm, amount: parseFloat(matchForm.amount) }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setMatchDialog(false);
        fetchData();
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
          <CompareArrows sx={{ mr: 1, verticalAlign: 'middle' }} />
          تسوية الحسابات العامة
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
            تسوية جديدة
          </Button>
        </Box>
      </Box>

      {/* Summary */}
      {summary && (
        <Grid container spacing={2} mb={3}>
          {[
            { label: 'إجمالي التسويات', value: summary.total, color: '#2196F3' },
            { label: 'مكتملة', value: summary.completed, color: '#4CAF50' },
            { label: 'جارية', value: summary.inProgress, color: '#FF9800' },
            { label: 'مبالغ غير مسواة', value: fmt(summary.totalUnreconciled), color: '#F44336' },
          ].map((s, i) => (
            <Grid item xs={6} md={3} key={i}>
              <Card sx={{ bgcolor: surfaceColors.card, border: `2px solid ${s.color}20` }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
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
        <Tab label="تسوية الحسابات" icon={<AccountBalance />} iconPosition="start" />
        <Tab label="معاملات بين الفروع" icon={<SwapHoriz />} iconPosition="start" />
      </Tabs>

      {tab === 0 && (
        <Card sx={{ bgcolor: surfaceColors.card }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.tableHeader }}>
                  {[
                    'الحساب',
                    'الفترة',
                    'رصيد الافتتاح',
                    'رصيد الإقفال',
                    'مُسوّى',
                    'غير مُسوّى',
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
                {recons.map(r => {
                  const st = statusMap[r.status] || statusMap.draft;
                  return (
                    <TableRow key={r._id} hover>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {r.accountName || r.accountId || '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {r.periodStart ? new Date(r.periodStart).toLocaleDateString('ar-SA') : '-'}{' '}
                        — {r.periodEnd ? new Date(r.periodEnd).toLocaleDateString('ar-SA') : '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{fmt(r.openingBalance)}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{fmt(r.closingBalance)}</TableCell>
                      <TableCell sx={{ textAlign: 'right', color: '#4CAF50', fontWeight: 600 }}>
                        {fmt(r.reconciledBalance)}
                      </TableCell>
                      <TableCell
                        sx={{
                          textAlign: 'right',
                          color: r.unreconciledBalance > 0 ? '#F44336' : '#4CAF50',
                          fontWeight: 600,
                        }}
                      >
                        {fmt(r.unreconciledBalance)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={st.label}
                          size="small"
                          sx={{ bgcolor: `${st.color}20`, color: st.color, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Tooltip title="مطابقة يدوية">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setSelectedRecon(r);
                              setMatchDialog(true);
                            }}
                          >
                            <CompareArrows fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {recons.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد تسويات
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
                  {['المرجع', 'الفرع المصدر', 'الفرع الهدف', 'المبلغ', 'الحالة'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {interco.map(t => {
                  const st = intercoStatusMap[t.status] || intercoStatusMap.unmatched;
                  return (
                    <TableRow key={t._id} hover>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {t.transactionRef}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{t.sourceBranch}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{t.targetBranch}</TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {fmt(t.amount)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={st.label}
                          size="small"
                          sx={{ bgcolor: `${st.color}20`, color: st.color, fontWeight: 600 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {interco.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد معاملات بين فروع
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>تسوية حساب جديد</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="معرف الحساب"
              value={form.accountId}
              onChange={e => setForm({ ...form, accountId: e.target.value })}
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
            <TextField
              label="رصيد الافتتاح"
              type="number"
              value={form.openingBalance}
              onChange={e => setForm({ ...form, openingBalance: e.target.value })}
              fullWidth
            />
            <TextField
              label="رصيد الإقفال"
              type="number"
              value={form.closingBalance}
              onChange={e => setForm({ ...form, closingBalance: e.target.value })}
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

      {/* Match Dialog */}
      <Dialog open={matchDialog} onClose={() => setMatchDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>مطابقة يدوية</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="معرف قيد المدين"
              value={matchForm.debitTransactionId}
              onChange={e => setMatchForm({ ...matchForm, debitTransactionId: e.target.value })}
              fullWidth
            />
            <TextField
              label="معرف قيد الدائن"
              value={matchForm.creditTransactionId}
              onChange={e => setMatchForm({ ...matchForm, creditTransactionId: e.target.value })}
              fullWidth
            />
            <TextField
              label="المبلغ"
              type="number"
              value={matchForm.amount}
              onChange={e => setMatchForm({ ...matchForm, amount: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMatchDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleMatch} sx={{ bgcolor: brandColors.primary }}>
            مطابقة
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AccountReconciliation;
