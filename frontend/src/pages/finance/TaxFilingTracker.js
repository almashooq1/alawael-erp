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
  Alert,
} from '@mui/material';
import {
  Receipt,
  Refresh,
  Add,
  Warning,
  CheckCircle,
  Schedule,
  Gavel,
  Error as ErrorIcon,
  CalendarToday,
  Send,
} from '@mui/icons-material';
import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const fmt = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v || 0);

const typeMap = {
  VAT: { label: 'ض.ق.م', color: '#2196F3' },
  Zakat: { label: 'زكاة', color: '#4CAF50' },
  WHT: { label: 'استقطاع', color: '#FF9800' },
  Excise: { label: 'ضريبة انتقائية', color: '#9C27B0' },
  CIT: { label: 'ضريبة دخل', color: '#795548' },
};
const statusMap = {
  upcoming: { label: 'قادم', color: '#2196F3', icon: <CalendarToday fontSize="small" /> },
  draft: { label: 'مسودة', color: '#9E9E9E', icon: <CalendarToday fontSize="small" /> },
  prepared: { label: 'مُعد', color: '#FF9800', icon: <Schedule fontSize="small" /> },
  under_review: { label: 'قيد المراجعة', color: '#9C27B0', icon: <Schedule fontSize="small" /> },
  submitted: { label: 'مقدم', color: '#2196F3', icon: <Send fontSize="small" /> },
  accepted: { label: 'مقبول', color: '#4CAF50', icon: <CheckCircle fontSize="small" /> },
  assessed: { label: 'مُقدّر', color: '#8BC34A', icon: <CheckCircle fontSize="small" /> },
  amended: { label: 'معدل', color: '#FF9800', icon: <Warning fontSize="small" /> },
  overdue: { label: 'متأخر', color: '#F44336', icon: <ErrorIcon fontSize="small" /> },
};
const penaltyStatusMap = {
  assessed: { label: 'مُقدّر', color: '#F44336' },
  contested: { label: 'مُعترض', color: '#FF9800' },
  paid: { label: 'مسدد', color: '#4CAF50' },
  waived: { label: 'معفي', color: '#9E9E9E' },
  partially_paid: { label: 'سداد جزئي', color: '#2196F3' },
};

const TaxFilingTracker = () => {
  const [tab, setTab] = useState(0);
  const [filings, setFilings] = useState([]);
  const [penalties, setPenalties] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusDialog, setStatusDialog] = useState(false);
  const [selectedFiling, setSelectedFiling] = useState(null);
  const [form, setForm] = useState({
    type: 'VAT',
    periodStart: '',
    periodEnd: '',
    dueDate: '',
    frequency: 'monthly',
  });
  const [statusForm, setStatusForm] = useState({ status: '', amount: '', zatcaReference: '' });

  const token = getToken();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [fRes, pRes, dRes] = await Promise.all([
        fetch(`${API}/finance/enterprise/tax-filing`, { headers }),
        fetch(`${API}/finance/enterprise/tax-filing/penalties`, { headers }),
        fetch(`${API}/finance/enterprise/tax-filing/dashboard`, { headers }),
      ]);
      const fData = await fRes.json();
      const pData = await pRes.json();
      const dData = await dRes.json();
      if (fData.success) setFilings(fData.data);
      if (pData.success) setPenalties(pData.data);
      if (dData.success) setDashboard(dData.data);
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
      const res = await fetch(`${API}/finance/enterprise/tax-filing`, {
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

  const handleStatusUpdate = async () => {
    if (!selectedFiling) return;
    try {
      const res = await fetch(`${API}/finance/enterprise/tax-filing/${selectedFiling._id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(statusForm),
      });
      const data = await res.json();
      if (data.success) {
        setStatusDialog(false);
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
          <Receipt sx={{ mr: 1, verticalAlign: 'middle' }} />
          إدارة الإقرارات الضريبية (ZATCA)
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
            إقرار جديد
          </Button>
        </Box>
      </Box>

      {/* Dashboard */}
      {dashboard && (
        <>
          <Grid container spacing={2} mb={3}>
            {[
              {
                label: 'إجمالي الإقرارات',
                value: dashboard.total,
                color: '#2196F3',
                icon: <Receipt />,
              },
              {
                label: 'قادمة',
                value: dashboard.upcoming,
                color: '#FF9800',
                icon: <CalendarToday />,
              },
              { label: 'متأخرة', value: dashboard.overdue, color: '#F44336', icon: <ErrorIcon /> },
              { label: 'مقدمة', value: dashboard.submitted, color: '#2196F3', icon: <Send /> },
              {
                label: 'مقبولة',
                value: dashboard.accepted,
                color: '#4CAF50',
                icon: <CheckCircle />,
              },
              {
                label: 'غرامات غير مسددة',
                value: fmt(dashboard.unpaidPenalties),
                color: '#F44336',
                icon: <Gavel />,
              },
            ].map((s, i) => (
              <Grid item xs={6} md={2} key={i}>
                <Card sx={{ bgcolor: surfaceColors.card, border: `2px solid ${s.color}20` }}>
                  <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
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
          {dashboard.overdue > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <strong>تنبيه:</strong> {dashboard.overdue} إقرار(ات) متأخرة عن موعد التقديم!
            </Alert>
          )}
        </>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="الإقرارات الضريبية" icon={<Receipt />} iconPosition="start" />
        <Tab label="الغرامات والعقوبات" icon={<Gavel />} iconPosition="start" />
      </Tabs>

      {tab === 0 && (
        <Card sx={{ bgcolor: surfaceColors.card }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.tableHeader }}>
                  {[
                    'رقم الإقرار',
                    'النوع',
                    'الفترة',
                    'تاريخ الاستحقاق',
                    'المبلغ المحسوب',
                    'المبلغ المقدم',
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
                {filings.map(f => {
                  const tp = typeMap[f.type] || { label: f.type, color: '#607D8B' };
                  const st = statusMap[f.status] || statusMap.draft;
                  const overdue =
                    f.dueDate &&
                    new Date(f.dueDate) < new Date() &&
                    !['submitted', 'accepted', 'assessed'].includes(f.status);
                  return (
                    <TableRow
                      key={f._id}
                      hover
                      sx={{ bgcolor: overdue ? '#F4433608' : 'transparent' }}
                    >
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {f.filingNumber || '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={tp.label}
                          size="small"
                          sx={{ bgcolor: `${tp.color}20`, color: tp.color, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {f.periodStart ? new Date(f.periodStart).toLocaleDateString('ar-SA') : '-'}{' '}
                        — {f.periodEnd ? new Date(f.periodEnd).toLocaleDateString('ar-SA') : '-'}
                      </TableCell>
                      <TableCell
                        sx={{
                          textAlign: 'right',
                          color: overdue ? '#F44336' : 'inherit',
                          fontWeight: overdue ? 700 : 400,
                        }}
                      >
                        {f.dueDate ? new Date(f.dueDate).toLocaleDateString('ar-SA') : '-'}
                        {overdue && (
                          <Warning
                            fontSize="small"
                            sx={{ color: '#F44336', ml: 0.5, verticalAlign: 'middle' }}
                          />
                        )}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{fmt(f.preparedAmount)}</TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {fmt(f.submittedAmount)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          icon={st.icon}
                          label={st.label}
                          size="small"
                          sx={{ bgcolor: `${st.color}20`, color: st.color, fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Tooltip title="تحديث الحالة">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setSelectedFiling(f);
                              setStatusDialog(true);
                            }}
                          >
                            <Send fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filings.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد إقرارات ضريبية
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
                    'الإقرار المرتبط',
                    'نوع الغرامة',
                    'المبلغ',
                    'الفائدة',
                    'الإجمالي',
                    'المسدد',
                    'الحالة',
                  ].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, textAlign: 'right' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {penalties.map(p => {
                  const st = penaltyStatusMap[p.status] || penaltyStatusMap.assessed;
                  return (
                    <TableRow key={p._id} hover>
                      <TableCell sx={{ textAlign: 'right' }}>{p.filingId || '-'}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{p.type || '-'}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{fmt(p.amount)}</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>{fmt(p.interestAmount)}</TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 700, color: '#F44336' }}>
                        {fmt(p.totalDue)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', color: '#4CAF50' }}>
                        {fmt(p.paidAmount)}
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
                {penalties.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      sx={{ textAlign: 'center', py: 4, color: neutralColors.textSecondary }}
                    >
                      لا توجد غرامات - ممتاز!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Create Filing Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>إنشاء إقرار ضريبي جديد</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="نوع الضريبة"
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
              select
              fullWidth
            >
              {Object.entries(typeMap).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="التكرار"
              value={form.frequency}
              onChange={e => setForm({ ...form, frequency: e.target.value })}
              select
              fullWidth
            >
              <MenuItem value="monthly">شهري</MenuItem>
              <MenuItem value="quarterly">ربع سنوي</MenuItem>
              <MenuItem value="annual">سنوي</MenuItem>
            </TextField>
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
              label="تاريخ الاستحقاق"
              type="date"
              value={form.dueDate}
              onChange={e => setForm({ ...form, dueDate: e.target.value })}
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

      {/* Status Update Dialog */}
      <Dialog open={statusDialog} onClose={() => setStatusDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>تحديث حالة الإقرار</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="الحالة الجديدة"
              value={statusForm.status}
              onChange={e => setStatusForm({ ...statusForm, status: e.target.value })}
              select
              fullWidth
            >
              {Object.entries(statusMap).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="المبلغ"
              type="number"
              value={statusForm.amount}
              onChange={e => setStatusForm({ ...statusForm, amount: e.target.value })}
              fullWidth
            />
            <TextField
              label="رقم مرجع هيئة الزكاة"
              value={statusForm.zatcaReference}
              onChange={e => setStatusForm({ ...statusForm, zatcaReference: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleStatusUpdate}
            sx={{ bgcolor: brandColors.primary }}
          >
            تحديث
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TaxFilingTracker;
